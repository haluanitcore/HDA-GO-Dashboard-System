import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../common/roles.enum';
import { GmvService } from './gmv.service';

@Controller('gmv')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class GmvController {
  constructor(private readonly gmvService: GmvService) {}

  // POST /gmv/record — Record new order (CM/Admin)
  @Post('record')
  @Roles(Role.CM, Role.ADMIN)
  recordOrder(@Body() body: { creator_id: string; campaign_id: string; order_count: number; gmv_amount: number }) {
    return this.gmvService.recordOrder(body.creator_id, body.campaign_id, body.order_count, body.gmv_amount);
  }

  // GET /gmv/my — Creator's own GMV
  @Get('my')
  @Roles(Role.CREATOR)
  getMyGMV(@Req() req: any) {
    return this.gmvService.getCreatorGMV(req.user.userId);
  }

  // GET /gmv/platform — Platform-wide GMV (Executive)
  @Get('platform')
  @Roles(Role.ADMIN, Role.EXECUTIVE)
  getPlatformGMV() {
    return this.gmvService.getPlatformGMV();
  }
}
