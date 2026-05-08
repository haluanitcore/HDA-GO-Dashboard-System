import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

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

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private userSocketMap = new Map<string, string[]>(); // userId -> socketId[]

  // ── Client connects & registers their userId ──
  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      const existing = this.userSocketMap.get(userId) || [];
      existing.push(client.id);
      this.userSocketMap.set(userId, existing);
      client.join(`user:${userId}`);
      this.logger.log(`📡 Client connected: ${client.id} (user: ${userId})`);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      const sockets = this.userSocketMap.get(userId) || [];
      this.userSocketMap.set(userId, sockets.filter((s) => s !== client.id));
      if (this.userSocketMap.get(userId)?.length === 0) {
        this.userSocketMap.delete(userId);
      }
    }
    this.logger.log(`📡 Client disconnected: ${client.id}`);
  }

  // ══════════════════════════════════════════════
  // EMIT METHODS — Called by services
  // ══════════════════════════════════════════════

  // Submission approved by QC
  emitSubmissionApproved(userId: string, data: { campaignTitle: string; qcNotes?: string }) {
    this.server.to(`user:${userId}`).emit('submission:approved', {
      type: 'submission:approved',
      title: '✅ Submission Approved!',
      message: `VT untuk "${data.campaignTitle}" telah disetujui.`,
      ...data,
      timestamp: new Date(),
    });
  }

  // New campaign published
  emitNewCampaign(userIds: string[], data: { campaignId: string; title: string; category: string }) {
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
  emitCampaignPush(userId: string, data: { campaignId: string; campaignTitle: string }) {
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
  emitNotification(userId: string, notification: { title: string; message: string; type: string }) {
    this.server.to(`user:${userId}`).emit('notification', {
      ...notification,
      timestamp: new Date(),
    });
  }
}
