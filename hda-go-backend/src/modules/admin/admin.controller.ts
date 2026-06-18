import {
  Controller, Get, Post, Body, UseGuards, Request, Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../common/roles.enum';
import { AdminService } from './admin.service';
import { AdminResetService, ResetScope } from './admin-reset.service';
import { AdminSyncService } from './admin-sync.service';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adminResetService: AdminResetService,
    private readonly adminSyncService: AdminSyncService,
  ) {}

  // ── Dashboard ──
  @Get('dashboard')
  @Roles(Role.ADMIN, Role.EXECUTIVE)
  getDashboardData() {
    return this.adminService.getDashboardData();
  }

  // ══════════════════════════════════════════════
  // RESET ENDPOINTS — Admin only
  // ══════════════════════════════════════════════

  // Manual reset data GMV/Orders
  @Post('reset/manual')
  @Roles(Role.ADMIN)
  async resetManual(
    @Body() body: { scope: ResetScope; notes: string },
    @Request() req: any,
  ) {
    const adminId = req.user.userId || req.user.sub;
    const adminName = req.user.name || 'Admin';
    return this.adminResetService.resetManual(
      body.scope || 'ALL',
      adminId,
      adminName,
      body.notes || '',
    );
  }

  // Get / Set auto reset config
  @Get('reset/config')
  @Roles(Role.ADMIN, Role.EXECUTIVE)
  getResetConfig() {
    return this.adminResetService.getResetConfig();
  }

  @Post('reset/config')
  @Roles(Role.ADMIN)
  async setResetConfig(@Body() body: { enabled: boolean }) {
    return this.adminResetService.setResetConfig(body.enabled);
  }

  // Reset history
  @Get('reset/history')
  @Roles(Role.ADMIN, Role.EXECUTIVE)
  getResetHistory(@Query('limit') limit?: string) {
    return this.adminResetService.getResetHistory(limit ? parseInt(limit) : 20);
  }

  // ══════════════════════════════════════════════
  // SYNC HISTORY ENDPOINT
  // ══════════════════════════════════════════════

  @Get('sync/history')
  @Roles(Role.ADMIN, Role.EXECUTIVE)
  getSyncHistory(@Query('limit') limit?: string) {
    return this.adminSyncService.getSyncHistory(limit ? parseInt(limit) : 30);
  }
}
