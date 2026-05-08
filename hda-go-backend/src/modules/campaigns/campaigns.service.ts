import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCampaignDto, JoinCampaignDto } from './dto/campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  // ══════════════════════════════════════════════
  // 15. CAMPAIGN CREATION FLOW
  // Brand/Staff → Create Campaign → Input (Category, Min Level, SOW, Reward, Deadline, Slot)
  // ══════════════════════════════════════════════
  async create(dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: {
        title: dto.title,
        category: dto.category,
        min_level: dto.min_level,
        brand_id: dto.brand_id,
        sow_total: dto.sow_total,
        reward_type: dto.reward_type,
        deadline: new Date(dto.deadline),
        slot: dto.slot,
        status: dto.status || 'DRAFT',
      },
    });
  }

  // ══════════════════════════════════════════════
  // 16. CAMPAIGN PUBLISH FLOW
  // Campaign Saved → Publish → Notification Broadcast → Visible in Campaign Hub
  // ══════════════════════════════════════════════
  async publish(campaignId: string) {
    const campaign = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'ACTIVE' },
    });

    // Broadcast notification to ALL eligible creators
    const eligibleCreators = await this.prisma.creator.findMany({
      where: { creator_level: { gte: campaign.min_level } },
      select: { user_id: true },
    });

    if (eligibleCreators.length > 0) {
      await this.prisma.notification.createMany({
        data: eligibleCreators.map((c) => ({
          user_id: c.user_id,
          title: '📢 Campaign Baru Tersedia!',
          message: `Campaign "${campaign.title}" (${campaign.category}) sudah terbuka. Deadline: ${campaign.deadline.toLocaleDateString('id-ID')}. Slot terbatas!`,
          type: 'CAMPAIGN',
          read_status: false,
        })),
      });
    }

    return {
      campaign,
      notified: eligibleCreators.length,
    };
  }

  // ══════════════════════════════════════════════
  // 17. CAMPAIGN FILTER / ELIGIBILITY FLOW
  // Fetch Campaign → Check Creator Level → IF Eligible: Show Apply | ELSE: Show Locked
  // ══════════════════════════════════════════════
  async findForCreator(creatorId: string, category?: string) {
    const creator = await this.prisma.creator.findUnique({
      where: { user_id: creatorId },
    });

    if (!creator) throw new NotFoundException('Creator not found');

    const whereClause: any = { status: 'ACTIVE' };
    if (category) whereClause.category = category;

    const campaigns = await this.prisma.campaign.findMany({
      where: whereClause,
      include: {
        _count: { select: { participants: true, submissions: true } },
      },
      orderBy: { deadline: 'asc' },
    });

    // Check if creator already joined each campaign
    const joined = await this.prisma.campaignParticipant.findMany({
      where: { creator_id: creatorId },
      select: { campaign_id: true },
    });
    const joinedIds = new Set(joined.map((j) => j.campaign_id));

    return campaigns.map((c) => ({
      ...c,
      eligible: creator.creator_level >= c.min_level,
      locked: creator.creator_level < c.min_level,
      levelRequired: c.min_level,
      creatorLevel: creator.creator_level,
      alreadyJoined: joinedIds.has(c.id),
      slotRemaining: c.slot - c._count.participants,
      slotFull: c._count.participants >= c.slot && c.slot > 0,
    }));
  }

  // ══════════════════════════════════════════════
  // 18. CAMPAIGN JOIN FLOW
  // Creator Click Apply → Participant Created → Counters Updated → Dashboards Updated
  // ══════════════════════════════════════════════
  async joinCampaign(creatorId: string, dto: JoinCampaignDto) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: dto.campaign_id },
      include: { _count: { select: { participants: true } } },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== 'ACTIVE') throw new BadRequestException('Campaign is not active');

    // Check slot availability
    if (campaign.slot > 0 && campaign._count.participants >= campaign.slot) {
      throw new BadRequestException('Campaign slots are full');
    }

    // Check creator level requirement
    const creator = await this.prisma.creator.findUnique({
      where: { user_id: creatorId },
      include: { user: { select: { name: true } } },
    });

    if (!creator) throw new NotFoundException('Creator profile not found');
    if (creator.creator_level < campaign.min_level) {
      throw new BadRequestException(
        `Level kamu (${creator.creator_level}) belum memenuhi syarat minimum (Level ${campaign.min_level})`,
      );
    }

    // Check if already joined
    const existing = await this.prisma.campaignParticipant.findUnique({
      where: {
        campaign_id_creator_id: {
          campaign_id: dto.campaign_id,
          creator_id: creatorId,
        },
      },
    });
    if (existing) throw new BadRequestException('Kamu sudah bergabung di campaign ini');

    // ── Join campaign ──
    const participant = await this.prisma.campaignParticipant.create({
      data: {
        campaign_id: dto.campaign_id,
        creator_id: creatorId,
        status: 'JOINED',
      },
    });

    // Update creator total_campaigns
    await this.prisma.creator.update({
      where: { user_id: creatorId },
      data: { total_campaigns: { increment: 1 } },
    });

    // Notify CM about new join
    if (creator.cm_id) {
      await this.prisma.notification.create({
        data: {
          user_id: creator.cm_id,
          title: '👤 Creator Joined Campaign',
          message: `${creator.user.name} bergabung di campaign "${campaign.title}".`,
          type: 'CAMPAIGN',
          read_status: false,
        },
      });
    }

    return {
      participant,
      slotRemaining: campaign.slot - campaign._count.participants - 1,
    };
  }

  // ══════════════════════════════════════════════
  // 19. CAMPAIGN CATEGORY FILTER
  // Frontend fetches by: category, min_level, status, deadline
  // Categories: HOTEL, FNB, TTD, LIVE, BEAUTY, TECH
  // ══════════════════════════════════════════════
  async findAll(filters?: { status?: string; category?: string }) {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.category) where.category = filters.category;

    return this.prisma.campaign.findMany({
      where,
      include: {
        _count: { select: { participants: true, submissions: true } },
      },
      orderBy: { deadline: 'asc' },
    });
  }

  // ── Get campaign detail ──
  async findOne(id: string) {
    return this.prisma.campaign.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            creator: {
              include: { user: { select: { name: true, email: true } } },
            },
          },
        },
        submissions: { include: { deliverable: true } },
        _count: { select: { participants: true, submissions: true, orders: true } },
      },
    });
  }

  // ── Get categories list ──
  getCategories() {
    return ['HOTEL', 'FNB', 'TTD', 'LIVE', 'BEAUTY', 'TECH'];
  }
}
