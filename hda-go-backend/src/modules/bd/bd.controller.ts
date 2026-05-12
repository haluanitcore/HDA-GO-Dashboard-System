import { Controller, Get, Patch, Post, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../common/roles.enum';
import { BdService } from './bd.service';
import { BDReviewDto, BDEditCampaignDto, BDAssignBrandDto } from './dto/bd-review.dto';

// ══════════════════════════════════════════════════
// BD (Business Development) CONTROLLER
// All endpoints require BD or ADMIN role
// ══════════════════════════════════════════════════

@Controller('bd')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class BdController {
  constructor(private readonly bdService: BdService) {}

  // GET /bd/dashboard — Full BD dashboard aggregation
  @Get('dashboard')
  @Roles(Role.BD, Role.ADMIN)
  getDashboard(@Req() req: any) {
    return this.bdService.getDashboard(req.user.userId);
  }

  // GET /bd/campaigns/pending — List pending review
  @Get('campaigns/pending')
  @Roles(Role.BD, Role.ADMIN)
  getPending(@Req() req: any) {
    return this.bdService.getCampaignsByStatus(req.user.userId, 'PENDING_BD');
  }

  // GET /bd/campaigns/approved — List approved
  @Get('campaigns/approved')
  @Roles(Role.BD, Role.ADMIN)
  getApproved(@Req() req: any) {
    return this.bdService.getCampaignsByStatus(req.user.userId, 'BD_APPROVED');
  }

  // GET /bd/campaigns/revision — List revision requests
  @Get('campaigns/revision')
  @Roles(Role.BD, Role.ADMIN)
  getRevision(@Req() req: any) {
    return this.bdService.getCampaignsByStatus(req.user.userId, 'BD_REVISION');
  }

  // GET /bd/campaigns/history — Review history
  @Get('campaigns/history')
  @Roles(Role.BD, Role.ADMIN)
  getHistory(@Req() req: any) {
    return this.bdService.getReviewHistory(req.user.userId);
  }

  // GET /bd/campaigns/:id — Campaign detail with edit log
  @Get('campaigns/:id')
  @Roles(Role.BD, Role.ADMIN)
  getCampaignDetail(@Param('id') id: string) {
    return this.bdService.getCampaignDetail(id);
  }

  // PATCH /bd/campaigns/:id/approve — Approve campaign
  @Patch('campaigns/:id/approve')
  @Roles(Role.BD, Role.ADMIN)
  approveCampaign(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: BDReviewDto,
  ) {
    return this.bdService.approveCampaign(id, req.user.userId, dto.notes);
  }

  // PATCH /bd/campaigns/:id/revision — Request revision
  @Patch('campaigns/:id/revision')
  @Roles(Role.BD, Role.ADMIN)
  requestRevision(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: BDReviewDto,
  ) {
    return this.bdService.requestRevision(id, req.user.userId, dto.notes || '');
  }

  // PATCH /bd/campaigns/:id/edit — Edit campaign details
  @Patch('campaigns/:id/edit')
  @Roles(Role.BD, Role.ADMIN)
  editCampaign(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: BDEditCampaignDto,
  ) {
    return this.bdService.editCampaign(id, req.user.userId, dto);
  }

  // GET /bd/analytics — BD analytics
  @Get('analytics')
  @Roles(Role.BD, Role.ADMIN)
  getAnalytics(@Req() req: any) {
    return this.bdService.getAnalytics(req.user.userId);
  }

  // GET /bd/assignments — Get BD brand assignments
  @Get('assignments')
  @Roles(Role.BD, Role.ADMIN)
  getAssignments(@Req() req: any) {
    return this.bdService.getAssignments(req.user.userId);
  }

  // POST /bd/assignments — Assign brand to BD
  @Post('assignments')
  @Roles(Role.ADMIN)
  assignBrand(@Body() dto: BDAssignBrandDto) {
    return this.bdService.assignBrand(dto.bd_user_id, dto.brand_user_id);
  }
}
