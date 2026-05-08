import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsCronService } from './analytics-cron.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsCronService],
  exports: [AnalyticsService, AnalyticsCronService],
})
export class AnalyticsModule {}
