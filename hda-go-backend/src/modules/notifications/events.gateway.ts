import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// ══════════════════════════════════════════════════════════════
// 29. NOTIFICATION FLOW — Real-time WebSocket Gateway
// Backend Trigger → Save Notification → Socket.io Emit
// → Frontend Receive Real-time Event → Show Popup
//
// 35. REALTIME CONNECTION EVENTS
// | Event               | Trigger       |
// | submission:approved | QC            |
// | campaign:new        | Publish       |
// | creator:levelup     | Threshold     |
// | campaign:push       | CM            |
// | reward:claim        | Reward Engine |
// ══════════════════════════════════════════════════════════════

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .replace(/"/g, '')
  .replace(/'/g, '')
  .split(',')
  .map((o) => o.trim());

@Injectable()
@WebSocketGateway({
  cors: {
    origin: corsOrigins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private userSocketMap = new Map<string, string[]>(); // userId -> socketId[]

  constructor(private readonly jwtService: JwtService) {}

  // ── Client connects — JWT verified before joining any room ──
  async handleConnection(client: Socket) {
    const token =
      (client.handshake.auth?.token as string | undefined) ||
      (client.handshake.headers?.authorization as string | undefined)
        ?.split(' ')
        ?.at(1);

    if (!token) {
      this.logger.warn(`📡 Connection rejected (no token): ${client.id}`);
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<{ sub: string; role: string }>(
        token,
        { secret: process.env.JWT_SECRET },
      );
      const userId = payload.sub;

      const existing = this.userSocketMap.get(userId) || [];
      existing.push(client.id);
      this.userSocketMap.set(userId, existing);
      await client.join(`user:${userId}`);
      this.logger.log(`📡 Client connected: ${client.id} (user: ${userId})`);
    } catch {
      this.logger.warn(`📡 Connection rejected (invalid token): ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Remove socket from all user rooms it may have joined
    for (const [userId, sockets] of this.userSocketMap.entries()) {
      const updated = sockets.filter((s) => s !== client.id);
      if (updated.length !== sockets.length) {
        if (updated.length === 0) {
          this.userSocketMap.delete(userId);
        } else {
          this.userSocketMap.set(userId, updated);
        }
      }
    }
    this.logger.log(`📡 Client disconnected: ${client.id}`);
  }

  // ══════════════════════════════════════════════
  // EMIT METHODS — Called by services
  // ══════════════════════════════════════════════

  // Submission approved by QC
  emitSubmissionApproved(
    userId: string,
    data: { campaignTitle: string; qcNotes?: string },
  ) {
    this.server.to(`user:${userId}`).emit('submission:approved', {
      type: 'submission:approved',
      title: '✅ Submission Approved!',
      message: `VT untuk "${data.campaignTitle}" telah disetujui.`,
      ...data,
      timestamp: new Date(),
    });
  }

  // New campaign published
  emitNewCampaign(
    userIds: string[],
    data: { campaignId: string; title: string; category: string },
  ) {
    userIds.forEach((uid) => {
      this.server.to(`user:${uid}`).emit('campaign:new', {
        type: 'campaign:new',
        notifTitle: '📢 Campaign Baru!',
        message: `"${data.title}" (${data.category}) telah tersedia.`,
        campaignId: data.campaignId,
        campaignTitle: data.title,
        category: data.category,
        timestamp: new Date(),
      });
    });
  }

  // Creator level up
  emitLevelUp(userId: string, data: { newLevel: number; levelName: string }) {
    this.server.to(`user:${userId}`).emit('creator:levelup', {
      type: 'creator:levelup',
      title: '🎉 Level Up!',
      message: `Selamat! Kamu naik ke Level ${data.newLevel} (${data.levelName}).`,
      ...data,
      timestamp: new Date(),
    });
  }

  // CM pushes campaign recommendation
  emitCampaignPush(
    userId: string,
    data: { campaignId: string; campaignTitle: string },
  ) {
    this.server.to(`user:${userId}`).emit('campaign:push', {
      type: 'campaign:push',
      title: '💡 Rekomendasi Campaign',
      message: `CM merekomendasikan campaign "${data.campaignTitle}" untukmu.`,
      ...data,
      timestamp: new Date(),
    });
  }

  // Reward claimed
  emitRewardClaim(userId: string, data: { rewardName: string }) {
    this.server.to(`user:${userId}`).emit('reward:claim', {
      type: 'reward:claim',
      title: '🎁 Reward Claimed!',
      message: `Kamu berhasil claim "${data.rewardName}".`,
      ...data,
      timestamp: new Date(),
    });
  }

  // Generic notification push
  emitNotification(
    userId: string,
    notification: { title: string; message: string; type: string },
  ) {
    this.server.to(`user:${userId}`).emit('notification', {
      ...notification,
      timestamp: new Date(),
    });
  }

  // ══════════════════════════════════════════════
  // BD WORKFLOW EVENTS
  // ══════════════════════════════════════════════

  // Brand submits new campaign → Notify assigned BD users
  emitBDNewCampaign(
    bdUserIds: string[],
    data: { campaignId: string; title: string; brandName: string },
  ) {
    bdUserIds.forEach((uid) => {
      this.server.to(`user:${uid}`).emit('bd:new-campaign', {
        type: 'bd:new-campaign',
        ...data,
        title: '📥 Campaign Baru Masuk',
        message: `${data.brandName} mengirimkan campaign "${data.title}". Silakan review.`,
        timestamp: new Date(),
      });
    });
  }

  // BD approves campaign → Notify CM users
  emitBDApproved(
    cmUserIds: string[],
    data: { campaignId: string; title: string; bdName: string },
  ) {
    cmUserIds.forEach((uid) => {
      this.server.to(`user:${uid}`).emit('bd:campaign-approved', {
        type: 'bd:campaign-approved',
        ...data,
        title: '📋 Campaign Approved by BD',
        message: `Campaign "${data.title}" telah di-approve oleh ${data.bdName}. Siap dikelola.`,
        timestamp: new Date(),
      });
    });
  }
}
