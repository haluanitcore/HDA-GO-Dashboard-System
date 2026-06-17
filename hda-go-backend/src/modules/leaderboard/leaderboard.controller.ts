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

  // GET /leaderboard/gmv?limit=10
  @Get('gmv')
  @Roles(Role.CREATOR, Role.CM, Role.BD, Role.ADMIN, Role.EXECUTIVE)
  getTopGMV(@Query('limit') limit?: string) {
    const n = parseInt(limit ?? '', 10);
    const take = isNaN(n) || n < 1 ? 10 : Math.min(n, 50);
    return this.leaderboardService.getTopByGMV(take);
  }

  // GET /leaderboard/orders
  @Get('orders')
  @Roles(Role.CREATOR, Role.CM, Role.BD, Role.ADMIN, Role.EXECUTIVE)
  getTopOrders(@Query('limit') limit?: string) {
    const n = parseInt(limit ?? '', 10);
    const take = isNaN(n) || n < 1 ? 10 : Math.min(n, 50);
    return this.leaderboardService.getTopByOrders(take);
  }

  // GET /leaderboard/streak
  @Get('streak')
  @Roles(Role.CREATOR, Role.CM, Role.BD, Role.ADMIN, Role.EXECUTIVE)
  getTopStreak(@Query('limit') limit?: string) {
    const n = parseInt(limit ?? '', 10);
    const take = isNaN(n) || n < 1 ? 10 : Math.min(n, 50);
    return this.leaderboardService.getTopByStreak(take);
  }

  // GET /leaderboard/my-rank — Creator's own rank
  @Get('my-rank')
  @Roles(Role.CREATOR)
  getMyRank(@Req() req: any) {
    return this.leaderboardService.getCreatorRank(req.user.userId);
  }
}
