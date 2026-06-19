import {
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
  Query,
  Res,
  Param,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../common/roles.enum';
import { UserActivityService } from './user-activity.service';
import * as express from 'express';

@Controller('activity')
export class UserActivityController {
  constructor(private readonly userActivityService: UserActivityService) {}

  // 1. HEARTBEAT API
  @Post('heartbeat')
  @UseGuards(AuthGuard('jwt'))
  async heartbeat(@Request() req: any) {
    const userId = req.user.userId;
    
    // Extract real IP
    const ipAddress =
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.headers['x-real-ip'] ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    const userAgent = req.headers['user-agent'] || 'Unknown';

    return this.userActivityService.recordHeartbeat(userId, ipAddress, userAgent);
  }

  // 2. LOGOUT / CLOSE SESSION API
  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(@Request() req: any) {
    const userId = req.user.userId;
    await this.userActivityService.recordLogout(userId);
    return { success: true };
  }

  // 3. ADMIN STATS SUMMARY
  @Get('admin/stats')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.EXECUTIVE)
  async getAdminStats() {
    return this.userActivityService.getStatsSummary();
  }

  // 4. ADMIN USER TRACKING LIST
  @Get('admin/users')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.EXECUTIVE)
  async getAdminUsers(
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('date') date?: string,
  ) {
    return this.userActivityService.getUsersActivity({ role, search, date });
  }

  // 5. ADMIN EXPORT DATA CSV
  @Get('admin/export')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.EXECUTIVE)
  async exportCsv(
    @Res() res: express.Response,
    @Query('role') role?: string,
  ) {
    const csvContent = await this.userActivityService.generateActivityReportCsv(role);
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=user_activity_report_${new Date().toISOString().substring(0, 10)}.csv`,
    );
    
    return res.status(200).send(csvContent);
  }

  // 6. ADMIN USER DETAIL ACTIVITY
  @Get('admin/users/:id/detail')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.EXECUTIVE)
  async getUserDetail(@Param('id') id: string) {
    return this.userActivityService.getUserDetailActivity(id);
  }
}
