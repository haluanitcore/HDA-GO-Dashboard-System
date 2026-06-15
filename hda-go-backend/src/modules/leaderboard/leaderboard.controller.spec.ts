import { Test, TestingModule } from '@nestjs/testing';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({})),
}));

const mockService = {
  getTopByGMV: jest.fn(),
  getTopByOrders: jest.fn(),
  getTopByStreak: jest.fn(),
  getCreatorRank: jest.fn(),
};

describe('LeaderboardController', () => {
  let controller: LeaderboardController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeaderboardController],
      providers: [{ provide: LeaderboardService, useValue: mockService }],
    }).compile();
    controller = module.get<LeaderboardController>(LeaderboardController);
  });

  it('getTopGMV uses safe limit parsing', async () => {
    mockService.getTopByGMV.mockResolvedValue([]);
    await controller.getTopGMV('5');
    expect(mockService.getTopByGMV).toHaveBeenCalledWith(5);
  });

  it('getTopGMV defaults to 10 for undefined', async () => {
    mockService.getTopByGMV.mockResolvedValue([]);
    await controller.getTopGMV(undefined);
    expect(mockService.getTopByGMV).toHaveBeenCalledWith(10);
  });

  it('getTopGMV caps at 50', async () => {
    mockService.getTopByGMV.mockResolvedValue([]);
    await controller.getTopGMV('100');
    expect(mockService.getTopByGMV).toHaveBeenCalledWith(50);
  });

  it('getTopOrders delegates with parsed limit', async () => {
    mockService.getTopByOrders.mockResolvedValue([]);
    await controller.getTopOrders('10');
    expect(mockService.getTopByOrders).toHaveBeenCalledWith(10);
  });

  it('getTopStreak delegates with parsed limit', async () => {
    mockService.getTopByStreak.mockResolvedValue([]);
    await controller.getTopStreak('10');
    expect(mockService.getTopByStreak).toHaveBeenCalledWith(10);
  });

  it('getMyRank uses userId from request', async () => {
    mockService.getCreatorRank.mockResolvedValue({ rank: 3 });
    const result = await controller.getMyRank({ user: { userId: 'c1' } });
    expect(mockService.getCreatorRank).toHaveBeenCalledWith('c1');
    expect(result).toEqual({ rank: 3 });
  });
});
