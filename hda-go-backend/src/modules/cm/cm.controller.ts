import { Controller, Get, Post, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../common/roles.enum';
import { CmService } from './cm.service';

@Controller('cm')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CmController {
  constructor(private readonly cmService: CmService) {}

  // GET /cm/dashboard — Full CM dashboard aggregation
  @Get('dashboard')
  @Roles(Role.CM, Role.ADMIN)
  getDashboard(@Req() req: any) {
    return this.cmService.getDashboard(req.user.userId);
  }

  // GET /cm/pipeline?status=DORMANT — Creators by status
  @Get('pipeline')
  @Roles(Role.CM, Role.ADMIN)
  getPipeline(@Req() req: any, @Query('status') status?: string) {
    if (status) {
      return this.cmService.getCreatorsByStatus(req.user.userId, status as any);
    }
    return this.cmService.getDashboard(req.user.userId);
  }

  // POST /cm/push-recommendation — Push campaign to creator (real-time)
  @Post('push-recommendation')
  @Roles(Role.CM, Role.ADMIN)
  pushRecommendation(
    @Req() req: any,
    @Body() body: { creator_id: string; campaign_id: string },
  ) {
    return this.cmService.pushCampaignRecommendation(req.user.userId, body.creator_id, body.campaign_id);
  }

  // GET /cm/smart-recommendations — Auto-generate recommendations
  @Get('smart-recommendations')
  @Roles(Role.CM, Role.ADMIN)
  getSmartRecommendations(@Req() req: any) {
    return this.cmService.generateSmartRecommendations(req.user.userId);
  }

  // GET /cm/gmv-monitoring — GMV dashboard
  @Get('gmv-monitoring')
  @Roles(Role.CM, Role.ADMIN)
  getGMVMonitoring(@Req() req: any) {
    return this.cmService.getGMVMonitoring(req.user.userId);
  }

  // GET /cm/level-monitoring — Level monitoring
  @Get('level-monitoring')
  @Roles(Role.CM, Role.ADMIN)
  getLevelMonitoring(@Req() req: any) {
    return this.cmService.getLevelMonitoring(req.user.userId);
  }

  // POST /cm/assign — Assign creator to CM
  @Post('assign')
  @Roles(Role.ADMIN)
  assignCreator(@Body() body: { creator_id: string; cm_id: string }) {
    return this.cmService.assignCreator(body.creator_id, body.cm_id);
  }
}
