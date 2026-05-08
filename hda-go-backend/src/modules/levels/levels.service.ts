import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ══════════════════════════════════════════════════════════════
// LEVEL ENGINE — Creator Progression System
// Calculates: GMV + Order + Campaign + Posting Consistency + LIVE
// ══════════════════════════════════════════════════════════════

export interface LevelThreshold {
  level: number;
  name: string;
  minGMV: number;
  minCampaigns: number;
  minOrders: number;
  minConsistency: number;   // % posting consistency
  minLive: number;          // LIVE participation count
}

const LEVEL_THRESHOLDS: LevelThreshold[] = [
  { level: 0, name: 'Newcomer', minGMV: 0,         minCampaigns: 0,   minOrders: 0,    minConsistency: 0,  minLive: 0 },
  { level: 1, name: 'Starter',  minGMV: 1000000,   minCampaigns: 2,   minOrders: 10,   minConsistency: 20, minLive: 0 },
  { level: 2, name: 'Rising',   minGMV: 5000000,   minCampaigns: 5,   minOrders: 50,   minConsistency: 40, minLive: 2 },
  { level: 3, name: 'Pro',      minGMV: 15000000,  minCampaigns: 10,  minOrders: 150,  minConsistency: 55, minLive: 5 },
  { level: 4, name: 'Expert',   minGMV: 50000000,  minCampaigns: 25,  minOrders: 500,  minConsistency: 70, minLive: 10 },
  { level: 5, name: 'Master',   minGMV: 100000000, minCampaigns: 50,  minOrders: 1000, minConsistency: 80, minLive: 20 },
  { level: 6, name: 'Legend',   minGMV: 250000000, minCampaigns: 100, minOrders: 2500, minConsistency: 90, minLive: 50 },
];

@Injectable()
export class LevelsService {
  constructor(private prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // FULL LEVEL EVALUATION
  // Called after: Submission Approved → Order Recorded → GMV Updated
  // Calculates: GMV + Order + Campaign + Posting Consistency + LIVE
  // ──────────────────────────────────────────────
  async evaluateLevel(creatorId: string) {
    const creator = await this.prisma.creator.findUnique({
      where: { user_id: creatorId },
      include: { user: { select: { name: true } } },
    });

    if (!creator) return null;

    const previousLevel = creator.creator_level;

    // ── Calculate new level based on ALL factors ──
    let newLevel = 0;
    for (const threshold of LEVEL_THRESHOLDS) {
      if (
        creator.gmv_total >= threshold.minGMV &&
        creator.total_campaigns >= threshold.minCampaigns &&
        creator.total_orders >= threshold.minOrders &&
        creator.posting_consistency >= threshold.minConsistency &&
        creator.live_participation >= threshold.minLive
      ) {
        newLevel = threshold.level;
      }
    }

    // ── Calculate progress % toward next level ──
    const nextThreshold = LEVEL_THRESHOLDS[newLevel + 1] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
    const factors = [
      nextThreshold.minGMV > 0 ? (creator.gmv_total / nextThreshold.minGMV) * 100 : 100,
      nextThreshold.minCampaigns > 0 ? (creator.total_campaigns / nextThreshold.minCampaigns) * 100 : 100,
      nextThreshold.minOrders > 0 ? (creator.total_orders / nextThreshold.minOrders) * 100 : 100,
      nextThreshold.minConsistency > 0 ? (creator.posting_consistency / nextThreshold.minConsistency) * 100 : 100,
      nextThreshold.minLive > 0 ? (creator.live_participation / nextThreshold.minLive) * 100 : 100,
    ];
    const progressPercentage = Math.min(
      factors.reduce((sum, f) => sum + Math.min(f, 100), 0) / factors.length,
      100,
    );

    // ── Update creator level ──
    await this.prisma.creator.update({
      where: { user_id: creatorId },
      data: { creator_level: newLevel },
    });

    // ── Update progress tracker ──
    await this.prisma.creatorProgress.upsert({
      where: { creator_id: creatorId },
      update: {
        current_level: newLevel,
        target_level: nextThreshold.level,
        progress_percentage: progressPercentage,
        gmv_progress: creator.gmv_total,
        campaign_progress: creator.total_campaigns,
        order_progress: creator.total_orders,
      },
      create: {
        creator_id: creatorId,
        current_level: newLevel,
        target_level: nextThreshold.level,
        progress_percentage: progressPercentage,
        gmv_progress: creator.gmv_total,
        campaign_progress: creator.total_campaigns,
        order_progress: creator.total_orders,
      },
    });

    // ══════════════════════════════════════════════
    // IF CREATOR LEVELED UP:
    // 1. Push Notification
    // 2. Unlock New Campaigns (visible via eligibility check)
    // 3. CM Dashboard auto-updated (via query)
    // ══════════════════════════════════════════════
    const leveledUp = newLevel > previousLevel;

    if (leveledUp) {
      // Push level-up notification to creator
      await this.prisma.notification.create({
        data: {
          user_id: creatorId,
          title: '🎉 Level Up!',
          message: `Selamat ${creator.user.name}! Kamu naik ke Level ${newLevel} (${LEVEL_THRESHOLDS[newLevel].name}). Campaign baru telah terbuka untukmu!`,
          type: 'LEVEL_UP',
          read_status: false,
        },
      });

      // Notify the CM about level up
      if (creator.cm_id) {
        await this.prisma.notification.create({
          data: {
            user_id: creator.cm_id,
            title: '📈 Creator Level Up',
            message: `${creator.user.name} naik ke Level ${newLevel} (${LEVEL_THRESHOLDS[newLevel].name}).`,
            type: 'SYSTEM',
            read_status: false,
          },
        });
      }
    }

    return {
      creatorId,
      creatorName: creator.user.name,
      previousLevel,
      newLevel,
      levelName: LEVEL_THRESHOLDS[newLevel].name,
      nextLevelName: nextThreshold.name,
      progressPercentage: Math.round(progressPercentage * 100) / 100,
      leveledUp,
      factors: {
        gmv: { current: creator.gmv_total, required: nextThreshold.minGMV },
        campaigns: { current: creator.total_campaigns, required: nextThreshold.minCampaigns },
        orders: { current: creator.total_orders, required: nextThreshold.minOrders },
        consistency: { current: creator.posting_consistency, required: nextThreshold.minConsistency },
        live: { current: creator.live_participation, required: nextThreshold.minLive },
      },
    };
  }

  // ──────────────────────────────────────────────
  // GET LEVEL THRESHOLDS (Public info)
  // ──────────────────────────────────────────────
  getThresholds() {
    return LEVEL_THRESHOLDS;
  }

  // ──────────────────────────────────────────────
  // GET CREATOR PROGRESS
  // ──────────────────────────────────────────────
  async getProgress(creatorId: string) {
    const progress = await this.prisma.creatorProgress.findUnique({
      where: { creator_id: creatorId },
    });

    const creator = await this.prisma.creator.findUnique({
      where: { user_id: creatorId },
    });

    if (!progress || !creator) return null;

    const currentThreshold = LEVEL_THRESHOLDS[progress.current_level];
    const nextThreshold = LEVEL_THRESHOLDS[progress.target_level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];

    return {
      ...progress,
      currentLevelName: currentThreshold?.name,
      nextLevelName: nextThreshold?.name,
      factors: {
        gmv: { current: creator.gmv_total, required: nextThreshold.minGMV },
        campaigns: { current: creator.total_campaigns, required: nextThreshold.minCampaigns },
        orders: { current: creator.total_orders, required: nextThreshold.minOrders },
        consistency: { current: creator.posting_consistency, required: nextThreshold.minConsistency },
        live: { current: creator.live_participation, required: nextThreshold.minLive },
      },
    };
  }
}
