import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({})),
}));

const mockService = {
  send: jest.fn(),
  sendBulk: jest.fn(),
  findByUser: jest.fn(),
  getUnreadCount: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
};

describe('NotificationsController', () => {
  let controller: NotificationsController;
  const mockReq = { user: { userId: 'user-1' } };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: mockService }],
    }).compile();
    controller = module.get<NotificationsController>(NotificationsController);
  });

  it('send delegates to service', async () => {
    mockService.send.mockResolvedValue({ id: 'n1' });
    await controller.send({
      user_id: 'u1',
      title: 'Hi',
      message: 'Test',
      type: 'SYSTEM',
    });
    expect(mockService.send).toHaveBeenCalledWith('u1', 'Hi', 'Test', 'SYSTEM');
  });

  it('sendBulk delegates to service', async () => {
    mockService.sendBulk.mockResolvedValue({ count: 2 });
    await controller.sendBulk({
      user_ids: ['u1', 'u2'],
      title: 'Hi',
      message: 'Test',
      type: 'CAMPAIGN',
    });
    expect(mockService.sendBulk).toHaveBeenCalledWith(
      ['u1', 'u2'],
      'Hi',
      'Test',
      'CAMPAIGN',
    );
  });

  it('findMine uses userId from request', async () => {
    mockService.findByUser.mockResolvedValue([]);
    await controller.findMine(mockReq);
    expect(mockService.findByUser).toHaveBeenCalledWith('user-1');
  });

  it('unreadCount returns count for user', async () => {
    mockService.getUnreadCount.mockResolvedValue(5);
    const result = await controller.unreadCount(mockReq);
    expect(result).toBe(5);
  });

  it('markAsRead delegates by id and userId', async () => {
    mockService.markAsRead.mockResolvedValue({ read_status: true });
    await controller.markAsRead('n1', mockReq);
    expect(mockService.markAsRead).toHaveBeenCalledWith('n1', 'user-1');
  });

  it('markAllAsRead uses userId', async () => {
    mockService.markAllAsRead.mockResolvedValue({ count: 3 });
    await controller.markAllAsRead(mockReq);
    expect(mockService.markAllAsRead).toHaveBeenCalledWith('user-1');
  });
});
