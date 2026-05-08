import { Controller, Get, Post, Patch, Param, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../common/roles.enum';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // POST /notifications/send — Send single notification (CM/Admin)
  @Post('send')
  @Roles(Role.CM, Role.ADMIN)
  send(@Body() body: { user_id: string; title: string; message: string; type: string }) {
    return this.notificationsService.send(body.user_id, body.title, body.message, body.type);
  }

  // POST /notifications/bulk — Bulk send (CM/Admin)
  @Post('bulk')
  @Roles(Role.CM, Role.ADMIN)
  sendBulk(@Body() body: { user_ids: string[]; title: string; message: string; type: string }) {
    return this.notificationsService.sendBulk(body.user_ids, body.title, body.message, body.type);
  }

  // GET /notifications — My notifications
  @Get()
  findMine(@Req() req: any) {
    return this.notificationsService.findByUser(req.user.userId);
  }

  // GET /notifications/unread-count — Unread count
  @Get('unread-count')
  unreadCount(@Req() req: any) {
    return this.notificationsService.getUnreadCount(req.user.userId);
  }

  // PATCH /notifications/:id/read — Mark as read
  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  // PATCH /notifications/read-all — Mark all as read
  @Patch('read-all')
  markAllAsRead(@Req() req: any) {
    return this.notificationsService.markAllAsRead(req.user.userId);
  }
}
