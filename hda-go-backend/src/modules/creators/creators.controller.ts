import { Controller, Get, Patch, Req, UseGuards, Body, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../common/roles.enum';
import { CreatorsService } from './creators.service';
import { CompleteOnboardingDto } from './dto/onboarding.dto';

@Controller('creators')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CreatorsController {
  constructor(private readonly creatorsService: CreatorsService) {}

  // GET /creators/cm-list — Get list of CMs for onboarding dropdown
  @Get('cm-list')
  @Roles(Role.CREATOR)
  getCMList() {
    return this.creatorsService.getCMList();
  }

  // GET /creators/profile — Creator's own profile
  @Get('profile')
  @Roles(Role.CREATOR)
  getProfile(@Req() req: any) {
    return this.creatorsService.getProfile(req.user.userId);
  }

  // PATCH /creators/profile — Update profile & complete onboarding
  @Patch('profile')
  @Roles(Role.CREATOR)
  updateProfile(@Req() req: any, @Body() data: CompleteOnboardingDto) {
    return this.creatorsService.completeOnboarding(req.user.userId, data);
  }

  // GET /creators/my-cm — Get assigned CM info for Creator
  @Get('my-cm')
  @Roles(Role.CREATOR)
  getMyCM(@Req() req: any) {
    return this.creatorsService.getMyCM(req.user.userId);
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
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.creatorsService.findAll(page, limit);
  }
}
