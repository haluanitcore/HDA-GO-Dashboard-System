import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RewardsService {
  constructor(private prisma: PrismaService) {}

  getAvailableRewards(creatorLevel: number) {
    const rewardCatalog = [
      { id: 'r1', name: 'Voucher Shopee 50K', min_level: 1, type: 'VOUCHER' },
      {
        id: 'r2',
        name: 'Bonus Commission +2%',
        min_level: 2,
        type: 'COMMISSION',
      },
      { id: 'r3', name: 'Voucher GoPay 100K', min_level: 3, type: 'VOUCHER' },
      {
        id: 'r4',
        name: 'Priority Campaign Access',
        min_level: 4,
        type: 'PERK',
      },
    ];

    return rewardCatalog.filter((r) => r.min_level <= creatorLevel);
  }

  // Deprecated, replaced by getCreatorMilestones
  async getCreatorRewards(creatorId: string) {
    const creator = await this.prisma.creator.findUnique({
      where: { user_id: creatorId },
    });
    const level = creator?.creator_level ?? 0;
    return this.getAvailableRewards(level);
  }

  // ─── NEW MILESTONE REWARD HUB LOGIC ───

  async getCreatorMilestones(creatorId: string) {
    const creator = await this.prisma.creator.findUnique({
      where: { user_id: creatorId },
    });

    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    const rewards = await this.prisma.milestoneReward.findMany({
      orderBy: [
        { track: 'asc' },
        { stage: 'asc' }
      ]
    });

    const claims = await this.prisma.creatorMilestoneClaim.findMany({
      where: { creator_id: creatorId }
    });

    const claimsMap = new Map(claims.map(c => [c.reward_id, c.status]));

    const getMetricValue = (track: string) => {
      switch (track) {
        case 'GMV':
          return creator.gmv_total;
        case 'ORDERS':
          return creator.total_orders;
        case 'CAMPAIGNS':
          return creator.total_campaigns;
        case 'CONSISTENCY':
          return creator.posting_consistency;
        case 'LIVE':
          return creator.live_participation;
        default:
          return 0;
      }
    };

    const formattedTracks = rewards.reduce((acc, r) => {
      const metricValue = getMetricValue(r.track);
      const claimStatus = claimsMap.get(r.id);

      let status: 'LOCKED' | 'CLAIMABLE' | 'PENDING' | 'CLAIMED' = 'LOCKED';
      if (claimStatus === 'COMPLETED' || claimStatus === 'APPROVED') {
        status = 'CLAIMED';
      } else if (claimStatus === 'PENDING') {
        status = 'PENDING';
      } else if (metricValue >= r.target_value) {
        status = 'CLAIMABLE';
      }

      if (!acc[r.track]) {
        acc[r.track] = {
          track: r.track,
          current_value: metricValue,
          milestones: []
        };
      }

      acc[r.track].milestones.push({
        id: r.id,
        stage: r.stage,
        target_value: r.target_value,
        reward_name: r.reward_name,
        reward_type: r.reward_type,
        reward_value: r.reward_value,
        description: r.description,
        status
      });

      return acc;
    }, {} as Record<string, any>);

    return {
      current_metrics: {
        GMV: creator.gmv_total,
        ORDERS: creator.total_orders,
        CAMPAIGNS: creator.total_campaigns,
        CONSISTENCY: creator.posting_consistency,
        LIVE: creator.live_participation
      },
      tracks: Object.values(formattedTracks)
    };
  }

  async claimReward(creatorId: string, rewardId: string) {
    const creator = await this.prisma.creator.findUnique({
      where: { user_id: creatorId },
      include: { user: { select: { name: true } } }
    });

    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    const reward = await this.prisma.milestoneReward.findUnique({
      where: { id: rewardId }
    });

    if (!reward) {
      throw new NotFoundException('Reward not found');
    }

    const existingClaim = await this.prisma.creatorMilestoneClaim.findUnique({
      where: {
        creator_id_reward_id: {
          creator_id: creatorId,
          reward_id: rewardId
        }
      }
    });

    if (existingClaim) {
      throw new BadRequestException('Reward has already been claimed or is pending approval');
    }

    const getMetricValue = (track: string) => {
      switch (track) {
        case 'GMV':
          return creator.gmv_total;
        case 'ORDERS':
          return creator.total_orders;
        case 'CAMPAIGNS':
          return creator.total_campaigns;
        case 'CONSISTENCY':
          return creator.posting_consistency;
        case 'LIVE':
          return creator.live_participation;
        default:
          return 0;
      }
    };

    const metricValue = getMetricValue(reward.track);
    if (metricValue < reward.target_value) {
      throw new BadRequestException(
        `You have not reached the target for this milestone yet. Required: ${reward.target_value}, Current: ${metricValue}`
      );
    }

    const claim = await this.prisma.creatorMilestoneClaim.create({
      data: {
        creator_id: creatorId,
        reward_id: rewardId,
        status: 'PENDING'
      },
      include: {
        reward: true
      }
    });

    await this.prisma.notification.create({
      data: {
        user_id: creatorId,
        title: '[REWARD] Klaim Reward Diajukan',
        message: `Klaim reward ${reward.reward_name} (Stage ${reward.stage}) telah diajukan dan sedang menunggu verifikasi oleh CM pendamping.`,
        type: 'REWARD',
        read_status: false
      }
    });

    if (creator.cm_id) {
      await this.prisma.notification.create({
        data: {
          user_id: creator.cm_id,
          title: '[REWARD] Pengajuan Klaim Baru',
          message: `${creator.user.name} mengajukan klaim reward ${reward.reward_name} (Stage ${reward.stage}).`,
          type: 'SYSTEM',
          read_status: false
        }
      });
    }

    return claim;
  }

  async getPendingClaimsForCM(cmId: string) {
    return this.prisma.creatorMilestoneClaim.findMany({
      where: {
        status: 'PENDING',
        creator: {
          cm_id: cmId
        }
      },
      include: {
        creator: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        reward: true
      },
      orderBy: {
        claimed_at: 'desc'
      }
    });
  }

  async approveClaim(cmId: string, claimId: string) {
    const claim = await this.prisma.creatorMilestoneClaim.findUnique({
      where: { id: claimId },
      include: {
        creator: {
          include: {
            user: {
              select: {
                name: true
              }
            }
          }
        },
        reward: true
      }
    });

    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    if (claim.creator.cm_id !== cmId) {
      throw new UnauthorizedException('Unauthorized: This creator is not managed by you');
    }

    if (claim.status !== 'PENDING') {
      throw new BadRequestException(`Claim is already processed. Current status: ${claim.status}`);
    }

    const updatedClaim = await this.prisma.creatorMilestoneClaim.update({
      where: { id: claimId },
      data: {
        status: 'COMPLETED'
      }
    });

    await this.prisma.notification.create({
      data: {
        user_id: claim.creator_id,
        title: '[REWARD] Klaim Reward Disetujui!',
        message: `Klaim reward ${claim.reward.reward_name} telah disetujui dan didistribusikan oleh CM.`,
        type: 'REWARD',
        read_status: false
      }
    });

    return updatedClaim;
  }
}
