import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SettingsService } from './settings.service';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../common/roles.enum';

@Controller('settings')
@UseGuards(AuthGuard('jwt'))
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('profile')
  getProfile(@Request() req) {
    return this.settingsService.getProfile(req.user.userId);
  }

  @Patch('profile')
  updateProfile(@Request() req, @Body() data: any) {
    return this.settingsService.updateProfile(req.user.userId, data);
  }

  @Patch('password')
  updatePassword(@Request() req, @Body() data: any) {
    return this.settingsService.updatePassword(req.user.userId, data);
  }

  @Patch('notifications')
  updateNotifications(@Request() req, @Body() data: any) {
    // Notifications preferences are stored in localStorage on the frontend
    // This endpoint is a no-op stub kept for future server-side preference storage
    return { message: 'ok', data };
  }

  @Get('global')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  getGlobalSettings() {
    return this.settingsService.getGlobalSettings();
  }

  @Patch('global')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  updateGlobalSettings(@Body() data: any) {
    return this.settingsService.updateGlobalSettings(data);
  }
}
