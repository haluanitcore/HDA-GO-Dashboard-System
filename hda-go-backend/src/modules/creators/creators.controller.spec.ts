import { Test, TestingModule } from '@nestjs/testing';
import { CreatorsController } from './creators.controller';
import { CreatorsService } from './creators.service';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({})),
}));

const mockService = {
  getProfile: jest.fn(),
  getMyCM: jest.fn(),
  getDashboardData: jest.fn(),
  updateStreak: jest.fn(),
  findAll: jest.fn(),
};

describe('CreatorsController', () => {
  let controller: CreatorsController;
  const mockReq = { user: { userId: 'creator-1' } };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CreatorsController],
      providers: [{ provide: CreatorsService, useValue: mockService }],
    }).compile();
    controller = module.get<CreatorsController>(CreatorsController);
  });

  it('getProfile uses userId from request', async () => {
    mockService.getProfile.mockResolvedValue({ name: 'Alice' });
    const result = await controller.getProfile(mockReq);
    expect(mockService.getProfile).toHaveBeenCalledWith('creator-1');
    expect(result).toEqual({ name: 'Alice' });
  });

  it('findAll delegates to service', async () => {
    mockService.findAll.mockResolvedValue({ data: [], total: 0 });
    await controller.findAll(1, 50);
    expect(mockService.findAll).toHaveBeenCalledWith(1, 50);
  });

  it('getMyCM delegates userId', async () => {
    mockService.getMyCM.mockResolvedValue({ cmName: 'CM John' });
    await controller.getMyCM(mockReq);
    expect(mockService.getMyCM).toHaveBeenCalledWith('creator-1');
  });

  it('getDashboard delegates userId', async () => {
    mockService.getDashboardData.mockResolvedValue({});
    await controller.getDashboard(mockReq);
    expect(mockService.getDashboardData).toHaveBeenCalledWith('creator-1');
  });

  it('updateStreak delegates userId', async () => {
    mockService.updateStreak.mockResolvedValue({ streak: 5 });
    await controller.updateStreak(mockReq);
    expect(mockService.updateStreak).toHaveBeenCalledWith('creator-1');
  });

});
