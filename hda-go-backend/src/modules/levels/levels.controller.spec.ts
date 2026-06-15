import { Test, TestingModule } from '@nestjs/testing';
import { LevelsController } from './levels.controller';
import { LevelsService } from './levels.service';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({})),
}));

const mockService = {
  evaluateLevel: jest.fn(),
  getProgress: jest.fn(),
  getThresholds: jest.fn(),
};

describe('LevelsController', () => {
  let controller: LevelsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LevelsController],
      providers: [{ provide: LevelsService, useValue: mockService }],
    }).compile();
    controller = module.get<LevelsController>(LevelsController);
  });

  it('evaluateLevel delegates creatorId', async () => {
    mockService.evaluateLevel.mockResolvedValue({ level: 3 });
    await controller.evaluateLevel('c1');
    expect(mockService.evaluateLevel).toHaveBeenCalledWith('c1');
  });

  it('getMyProgress uses userId from request', async () => {
    mockService.getProgress.mockResolvedValue({ progress: 75 });
    await controller.getMyProgress({ user: { userId: 'c1' } });
    expect(mockService.getProgress).toHaveBeenCalledWith('c1');
  });

  it('getThresholds returns thresholds', () => {
    const thresholds = [{ level: 1, min_gmv: 0 }];
    mockService.getThresholds.mockReturnValue(thresholds);
    const result = controller.getThresholds();
    expect(result).toEqual(thresholds);
  });
});
