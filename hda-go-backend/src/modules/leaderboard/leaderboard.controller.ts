import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../common/roles.enum';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  // GET /leaderboard/gmv?limit=20
  @Get('gmv')
  getTopGMV(@Query('limit') limit?: string) {
    return this.leaderboardService.getTopByGMV(limit ? parseInt(limit) : 20);
  }

  // GET /leaderboard/orders
  @Get('orders')
  getTopOrders(@Query('limit') limit?: string) {
    return this.leaderboardService.getTopByOrders(limit ? parseInt(limit) : 20);
  }

  // GET /leaderboard/streak
  @Get('streak')
  getTopStreak(@Query('limit') limit?: string) {
    return this.leaderboardService.getTopByStreak(limit ? parseInt(limit) : 20);
  }

  // GET /leaderboard/my-rank — Creator's own rank
  @Get('my-rank')
  @Roles(Role.CREATOR)
  getMyRank(@Req() req: any) {
    return this.leaderboardService.getCreatorRank(req.user.userId);
  }
}
