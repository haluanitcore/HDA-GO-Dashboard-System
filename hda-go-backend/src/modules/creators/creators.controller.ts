import { Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../common/roles.enum';
import { CreatorsService } from './creators.service';

@Controller('creators')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CreatorsController {
  constructor(private readonly creatorsService: CreatorsService) {}

  // GET /creators/profile — Creator's own profile
  @Get('profile')
  @Roles(Role.CREATOR)
  getProfile(@Req() req: any) {
    return this.creatorsService.getProfile(req.user.userId);
  }

  // GET /creators/dashboard — Aggregated dashboard data
  @Get('dashboard')
  @Roles(Role.CREATOR)
  getDashboard(@Req() req: any) {
    return this.creatorsService.getDashboardData(req.user.userId);
  }

  // PATCH /creators/streak — Increment streak
  @Patch('streak')
  @Roles(Role.CREATOR)
  updateStreak(@Req() req: any) {
    return this.creatorsService.updateStreak(req.user.userId);
  }

  // GET /creators — All creators (for CM/Admin views)
  @Get()
  @Roles(Role.CM, Role.ADMIN, Role.EXECUTIVE)
  findAll() {
    return this.creatorsService.findAll();
  }
}
