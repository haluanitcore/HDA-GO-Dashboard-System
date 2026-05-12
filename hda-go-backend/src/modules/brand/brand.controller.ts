import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../common/roles.enum';
import { BrandService } from './brand.service';

@Controller('brand')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Get('dashboard')
  @Roles(Role.BRAND)
  getDashboard(@Req() req: any) {
    return this.brandService.getDashboard(req.user.userId);
  }

  @Get('analytics')
  @Roles(Role.BRAND)
  getAnalytics(@Req() req: any) {
    return this.brandService.getAnalytics(req.user.userId);
  }
}
