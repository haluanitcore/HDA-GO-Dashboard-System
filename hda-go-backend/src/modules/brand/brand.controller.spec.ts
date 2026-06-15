import { Test, TestingModule } from '@nestjs/testing';
import { BrandController } from './brand.controller';
import { BrandService } from './brand.service';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({})),
}));

const mockService = {
  getDashboard: jest.fn(),
  getAnalytics: jest.fn(),
};

describe('BrandController', () => {
  let controller: BrandController;
  const mockReq = { user: { userId: 'brand-1' } };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BrandController],
      providers: [{ provide: BrandService, useValue: mockService }],
    }).compile();
    controller = module.get<BrandController>(BrandController);
  });

  it('getDashboard delegates userId', async () => {
    mockService.getDashboard.mockResolvedValue({ campaigns: [] });
    const result = await controller.getDashboard(mockReq);
    expect(mockService.getDashboard).toHaveBeenCalledWith('brand-1');
    expect(result).toEqual({ campaigns: [] });
  });

  it('getAnalytics delegates userId', async () => {
    mockService.getAnalytics.mockResolvedValue({ stats: {} });
    await controller.getAnalytics(mockReq);
    expect(mockService.getAnalytics).toHaveBeenCalledWith('brand-1');
  });
});
