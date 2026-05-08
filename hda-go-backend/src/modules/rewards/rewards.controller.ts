import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../common/roles.enum';
import { RewardsService } from './rewards.service';

@Controller('rewards')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  // GET /rewards/my — Creator's available rewards
  @Get('my')
  @Roles(Role.CREATOR)
  getMyRewards(@Req() req: any) {
    return this.rewardsService.getCreatorRewards(req.user.userId);
  }
}
