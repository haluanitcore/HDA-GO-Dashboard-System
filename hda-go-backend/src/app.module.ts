import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// ─── Infrastructure ──────────────────────────
import { PrismaModule } from './prisma/prisma.module';

// ─── Feature Modules ─────────────────────────
import { AuthModule } from './modules/auth/auth.module';
import { CreatorsModule } from './modules/creators/creators.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { GmvModule } from './modules/gmv/gmv.module';
import { LevelsModule } from './modules/levels/levels.module';
import { CmModule } from './modules/cm/cm.module';
import { BdModule } from './modules/bd/bd.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { RewardsModule } from './modules/rewards/rewards.module';
import { BrandModule } from './modules/brand/brand.module';

@Module({
  imports: [
    // Global config (reads .env)
    ConfigModule.forRoot({ isGlobal: true }),

    // Cron scheduler for analytics aggregation
    ScheduleModule.forRoot(),

    // Database
    PrismaModule,

    // Core Business Modules
    AuthModule,
    CreatorsModule,
    CampaignsModule,
    SubmissionsModule,
    GmvModule,
    LevelsModule,
    CmModule,
    BdModule,
    NotificationsModule,
    LeaderboardModule,
    AnalyticsModule,
    RewardsModule,
    BrandModule,
  ],
})
export class AppModule {}
