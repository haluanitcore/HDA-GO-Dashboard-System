import { Test, TestingModule } from '@nestjs/testing';
import { RewardsController } from './rewards.controller';
import { RewardsService } from './rewards.service';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({})),
}));

const mockService = {
  getCreatorRewards: jest.fn(),
};

describe('RewardsController', () => {
  let controller: RewardsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RewardsController],
      providers: [{ provide: RewardsService, useValue: mockService }],
    }).compile();
    controller = module.get<RewardsController>(RewardsController);
  });

  it('getMyRewards uses userId from request', async () => {
    const rewards = [{ id: 'r1', name: 'Voucher' }];
    mockService.getCreatorRewards.mockResolvedValue(rewards);
    const result = await controller.getMyRewards({ user: { userId: 'c1' } });
    expect(mockService.getCreatorRewards).toHaveBeenCalledWith('c1');
    expect(result).toEqual(rewards);
  });
});
