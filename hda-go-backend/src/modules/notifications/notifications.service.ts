import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // SEND NOTIFICATION (System/Campaign/Reward)
  // ──────────────────────────────────────────────
  async send(userId: string, title: string, message: string, type: string) {
    return this.prisma.notification.create({
      data: { user_id: userId, title, message, type, read_status: false },
    });
  }

  // ──────────────────────────────────────────────
  // BULK SEND (for campaign pushes to all participants)
  // ──────────────────────────────────────────────
  async sendBulk(
    userIds: string[],
    title: string,
    message: string,
    type: string,
  ) {
    return this.prisma.notification.createMany({
      data: userIds.map((uid) => ({
        user_id: uid,
        title,
        message,
        type,
        read_status: false,
      })),
    });
  }

  // ──────────────────────────────────────────────
  // GET USER NOTIFICATIONS
  // ──────────────────────────────────────────────
  async findByUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { id: 'desc' },
      take: 50,
    });
  }

  // ──────────────────────────────────────────────
  // MARK AS READ (ownership enforced)
  // ──────────────────────────────────────────────
  async markAsRead(notificationId: string, userId: string) {
    const notif = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: { user_id: true },
    });
    if (!notif || notif.user_id !== userId) {
      throw new ForbiddenException('Notification not found or access denied');
    }
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { read_status: true },
    });
  }

  // ──────────────────────────────────────────────
  // MARK ALL AS READ
  // ──────────────────────────────────────────────
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { user_id: userId, read_status: false },
      data: { read_status: true },
    });
  }

  // ──────────────────────────────────────────────
  // UNREAD COUNT
  // ──────────────────────────────────────────────
  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { user_id: userId, read_status: false },
    });
  }
}
