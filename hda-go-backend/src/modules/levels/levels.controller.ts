import { Controller, Get, Post, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../common/roles.enum';
import { LevelsService } from './levels.service';

@Controller('levels')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LevelsController {
  constructor(private readonly levelsService: LevelsService) {}

  // POST /levels/evaluate/:creatorId — Trigger level evaluation (CM/Admin)
  @Post('evaluate/:creatorId')
  @Roles(Role.CM, Role.ADMIN)
  evaluateLevel(@Param('creatorId') creatorId: string) {
    return this.levelsService.evaluateLevel(creatorId);
  }

  // GET /levels/progress — Creator's own progress
  @Get('progress')
  @Roles(Role.CREATOR)
  getMyProgress(@Req() req: any) {
    return this.levelsService.getProgress(req.user.userId);
  }

  // GET /levels/thresholds — Public level info
  @Get('thresholds')
  getThresholds() {
    return this.levelsService.getThresholds();
  }
}
