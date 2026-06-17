import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RewardsService {
  constructor(private prisma: PrismaService) {}

  // TODO: Implement actual reward claiming, tracking, and database integration.
  // Rewards are tied to Level Engine progression and campaign completion.
  // Currently returning a placeholder response as the system is "coming soon".
  
  getAvailableRewards(creatorLevel: number) {
    // In production, this queries a rewards table filtered by min_level
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
      // Reward Level 5 removed since max level is Platinum (4).
    ];

    return rewardCatalog.filter((r) => r.min_level <= creatorLevel);
  }

  async getCreatorRewards(creatorId: string) {
    // Force return placeholder response for Opsi A
    return { 
      message: 'Reward system coming soon', 
      rewards: [], 
      available: false 
    };
  }
}
