import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsCronService } from './analytics-cron.service';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({})),
}));

const mockAnalyticsService = {
  getPlatformKPI: jest.fn(),
  getMetricsHistory: jest.fn(),
  getCampaignAnalytics: jest.fn(),
  getCreatorPerformance: jest.fn(),
  getCreatorHistory: jest.fn(),
};

const mockCronService = {
  runDailyAggregation: jest.fn(),
};

describe('AnalyticsController', () => {
  let controller: AnalyticsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        { provide: AnalyticsService, useValue: mockAnalyticsService },
        { provide: AnalyticsCronService, useValue: mockCronService },
      ],
    }).compile();
    controller = module.get<AnalyticsController>(AnalyticsController);
  });

  it('getKPI delegates to service', async () => {
    mockAnalyticsService.getPlatformKPI.mockResolvedValue({ totalGMV: 100 });
    const result = await controller.getKPI();
    expect(result).toEqual({ totalGMV: 100 });
  });

  it('getMetricsHistory uses default 30 days', async () => {
    mockAnalyticsService.getMetricsHistory.mockResolvedValue([]);
    await controller.getMetricsHistory();
    expect(mockAnalyticsService.getMetricsHistory).toHaveBeenCalledWith(30);
  });

  it('getMetricsHistory parses days param', async () => {
    mockAnalyticsService.getMetricsHistory.mockResolvedValue([]);
    await controller.getMetricsHistory('7');
    expect(mockAnalyticsService.getMetricsHistory).toHaveBeenCalledWith(7);
  });

  it('getCampaignAnalytics delegates to service', async () => {
    mockAnalyticsService.getCampaignAnalytics.mockResolvedValue([]);
    await controller.getCampaignAnalytics();
    expect(mockAnalyticsService.getCampaignAnalytics).toHaveBeenCalled();
  });

  it('getCreatorPerformance uses safe limit parsing', async () => {
    mockAnalyticsService.getCreatorPerformance.mockResolvedValue([]);
    await controller.getCreatorPerformance('10');
    expect(mockAnalyticsService.getCreatorPerformance).toHaveBeenCalledWith(10);
  });

  it('getCreatorPerformance defaults to 20 for invalid input', async () => {
    mockAnalyticsService.getCreatorPerformance.mockResolvedValue([]);
    await controller.getCreatorPerformance('abc');
    expect(mockAnalyticsService.getCreatorPerformance).toHaveBeenCalledWith(20);
  });

  it('getCreatorPerformance caps at 50', async () => {
    mockAnalyticsService.getCreatorPerformance.mockResolvedValue([]);
    await controller.getCreatorPerformance('999');
    expect(mockAnalyticsService.getCreatorPerformance).toHaveBeenCalledWith(50);
  });

  it('getCreatorHistory delegates by ID', async () => {
    mockAnalyticsService.getCreatorHistory.mockResolvedValue([]);
    const adminReq = { user: { userId: 'admin-1', role: 'ADMIN' } };
    await controller.getCreatorHistory('c1', adminReq);
    expect(mockAnalyticsService.getCreatorHistory).toHaveBeenCalledWith('c1', null);
  });

  it('runAggregation delegates to cron service', async () => {
    mockCronService.runDailyAggregation.mockResolvedValue(undefined);
    await controller.runAggregation();
    expect(mockCronService.runDailyAggregation).toHaveBeenCalled();
  });
});
