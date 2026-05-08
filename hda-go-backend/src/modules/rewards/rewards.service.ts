import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RewardsService {
  constructor(private prisma: PrismaService) {}

  // Reward logic will be expanded — for now, placeholder endpoints
  // Rewards are tied to Level Engine progression and campaign completion

  async getAvailableRewards(creatorLevel: number) {
    // In production, this queries a rewards table filtered by min_level
    const rewardCatalog = [
      { id: 'r1', name: 'Voucher Shopee 50K', min_level: 1, type: 'VOUCHER' },
      { id: 'r2', name: 'Bonus Commission +2%', min_level: 2, type: 'COMMISSION' },
      { id: 'r3', name: 'Voucher GoPay 100K', min_level: 3, type: 'VOUCHER' },
      { id: 'r4', name: 'Priority Campaign Access', min_level: 4, type: 'PERK' },
      { id: 'r5', name: 'Exclusive Brand Deal', min_level: 5, type: 'DEAL' },
    ];

    return rewardCatalog.filter((r) => r.min_level <= creatorLevel);
  }

  async getCreatorRewards(creatorId: string) {
    const creator = await this.prisma.creator.findUnique({
      where: { user_id: creatorId },
    });
    if (!creator) return [];
    return this.getAvailableRewards(creator.creator_level);
  }
}
