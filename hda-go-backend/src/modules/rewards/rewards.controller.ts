import { Controller, Get, Post, Patch, Req, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../common/roles.enum';
import { RewardsService } from './rewards.service';

@Controller('rewards')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  // Keep old endpoint for backwards compatibility during transition if needed
  @Get('my')
  @Roles(Role.CREATOR)
  getMyRewards(@Req() req: any) {
    return this.rewardsService.getCreatorRewards(req.user.userId);
  }

  // ─── NEW MILESTONE REWARDS ENDPOINTS ───

  // GET /rewards/milestones — Get milestone tracks & creator progress
  @Get('milestones')
  @Roles(Role.CREATOR)
  getMilestones(@Req() req: any) {
    return this.rewardsService.getCreatorMilestones(req.user.userId);
  }

  // POST /rewards/claim — Claim an eligible milestone reward
  @Post('claim')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.CREATOR)
  claimReward(@Req() req: any, @Body('rewardId') rewardId: string) {
    return this.rewardsService.claimReward(req.user.userId, rewardId);
  }

  // GET /rewards/cm/pending — Get all pending milestone claims for CM's creators
  @Get('cm/pending')
  @Roles(Role.CM)
  getCmPendingClaims(@Req() req: any) {
    return this.rewardsService.getPendingClaimsForCM(req.user.userId);
  }

  // PATCH /rewards/cm/claims/:id/approve — CM approves/completes a claim
  @Patch('cm/claims/:id/approve')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.CM)
  approveClaim(@Req() req: any, @Param('id') claimId: string) {
    return this.rewardsService.approveClaim(req.user.userId, claimId);
  }
}
