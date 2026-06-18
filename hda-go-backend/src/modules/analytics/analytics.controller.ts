import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../common/roles.enum';
import { AnalyticsService } from './analytics.service';
import { AnalyticsCronService } from './analytics-cron.service';

@Controller('analytics')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly analyticsCronService: AnalyticsCronService,
  ) {}

  // GET /analytics/kpi — Platform KPI
  @Get('kpi')
  @Roles(Role.ADMIN, Role.EXECUTIVE)
  getKPI() {
    return this.analyticsService.getPlatformKPI();
  }

  // GET /analytics/metrics-history?days=30 — Trend chart
  @Get('metrics-history')
  @Roles(Role.ADMIN, Role.EXECUTIVE)
  getMetricsHistory(@Query('days') days?: string) {
    return this.analyticsService.getMetricsHistory(days ? parseInt(days) : 30);
  }

  // GET /analytics/campaigns — Campaign analytics
  @Get('campaigns')
  @Roles(Role.ADMIN, Role.EXECUTIVE, Role.CM)
  getCampaignAnalytics(@Query('skip') skip?: string, @Query('take') take?: string) {
    return this.analyticsService.getCampaignAnalytics(
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 50
    );
  }

  // GET /analytics/creators?limit=20 — Creator performance (current month)
  @Get('creators')
  @Roles(Role.ADMIN, Role.EXECUTIVE, Role.CM)
  getCreatorPerformance(@Query('limit') limit?: string) {
    const n = parseInt(limit ?? '', 10);
    const take = isNaN(n) || n < 1 ? 20 : Math.min(n, 50);
    return this.analyticsService.getCreatorPerformance(take);
  }

  // GET /analytics/creator/:id/history — Creator monthly stats history
  @Get('creator/:id/history')
  @Roles(Role.ADMIN, Role.EXECUTIVE, Role.CM)
  getCreatorHistory(@Param('id') id: string) {
    return this.analyticsService.getCreatorHistory(id);
  }

  // GET /analytics/run-aggregation — Manual trigger
  @Get('run-aggregation')
  @Roles(Role.ADMIN, Role.EXECUTIVE)
  async runAggregation() {
    await this.analyticsCronService.runDailyAggregation();
    return { success: true };
  }
}
