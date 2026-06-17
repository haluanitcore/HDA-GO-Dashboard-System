import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  notification: {
    create: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<NotificationsService>(NotificationsService);
  });

  // ── SEND ──────────────────────────────────────────────────────────────────

  describe('send', () => {
    it('creates a notification with read_status false', async () => {
      const notif = { id: 'n1', user_id: 'u1', read_status: false };
      mockPrisma.notification.create.mockResolvedValue(notif);

      const result = await service.send('u1', 'Title', 'Message', 'SYSTEM');

      expect(result).toEqual(notif);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          user_id: 'u1',
          title: 'Title',
          message: 'Message',
          type: 'SYSTEM',
          read_status: false,
        },
      });
    });
  });

  // ── SEND BULK ─────────────────────────────────────────────────────────────

  describe('sendBulk', () => {
    it('creates multiple notifications at once', async () => {
      mockPrisma.notification.createMany.mockResolvedValue({ count: 3 });

      const result = await service.sendBulk(
        ['u1', 'u2', 'u3'],
        'Bulk Title',
        'Bulk Msg',
        'CAMPAIGN',
      );

      expect(result.count).toBe(3);
      expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ user_id: 'u1' }),
          expect.objectContaining({ user_id: 'u2' }),
          expect.objectContaining({ user_id: 'u3' }),
        ]),
      });
    });
  });

  // ── FIND BY USER ──────────────────────────────────────────────────────────

  describe('findByUser', () => {
    it('returns notifications ordered by id desc, limited to 50', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([{ id: 'n1' }]);

      const result = await service.findByUser('u1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { user_id: 'u1' },
        orderBy: { id: 'desc' },
        take: 50,
      });
    });
  });

  // ── MARK AS READ ──────────────────────────────────────────────────────────

  describe('markAsRead', () => {
    it('updates notification read_status when user owns it', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'n1',
        user_id: 'user-1',
      });
      mockPrisma.notification.update.mockResolvedValue({
        id: 'n1',
        read_status: true,
      });

      const result = await service.markAsRead('n1', 'user-1');

      expect(result.read_status).toBe(true);
      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'n1' },
        data: { read_status: true },
      });
    });

    it('throws ForbiddenException when user does not own notification', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'n1',
        user_id: 'other-user',
      });

      await expect(service.markAsRead('n1', 'user-1')).rejects.toThrow();
    });

    it('throws ForbiddenException when notification does not exist', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);

      await expect(service.markAsRead('n1', 'user-1')).rejects.toThrow();
    });
  });

  // ── MARK ALL AS READ ──────────────────────────────────────────────────────

  describe('markAllAsRead', () => {
    it('updates all unread notifications for user', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead('u1');

      expect(result.count).toBe(5);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { user_id: 'u1', read_status: false },
        data: { read_status: true },
      });
    });
  });

  // ── UNREAD COUNT ──────────────────────────────────────────────────────────

  describe('getUnreadCount', () => {
    it('returns count of unread notifications', async () => {
      mockPrisma.notification.count.mockResolvedValue(3);

      const result = await service.getUnreadCount('u1');

      expect(result).toBe(3);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { user_id: 'u1', read_status: false },
      });
    });
  });
});
