import { Test, TestingModule } from '@nestjs/testing';
import { CmController } from './cm.controller';
import { CmService } from './cm.service';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({})),
}));

const mockService = {
  getDashboard: jest.fn(),
  getCmList: jest.fn(),
  getCreatorsByStatus: jest.fn(),
  pushCampaignRecommendation: jest.fn(),
  generateSmartRecommendations: jest.fn(),
  getGMVMonitoring: jest.fn(),
  getLevelMonitoring: jest.fn(),
  assignCreator: jest.fn(),
};

describe('CmController', () => {
  let controller: CmController;
  const mockReq = { user: { userId: 'cm-1' } };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CmController],
      providers: [{ provide: CmService, useValue: mockService }],
    }).compile();
    controller = module.get<CmController>(CmController);
  });

  it('getDashboard delegates userId', async () => {
    mockService.getDashboard.mockResolvedValue({});
    await controller.getDashboard(mockReq);
    expect(mockService.getDashboard).toHaveBeenCalledWith('cm-1');
  });

  it('getCmList returns list', async () => {
    mockService.getCmList.mockResolvedValue([]);
    await controller.getCmList();
    expect(mockService.getCmList).toHaveBeenCalled();
  });

  it('getPipeline with status filters by status', async () => {
    mockService.getCreatorsByStatus.mockResolvedValue([]);
    await controller.getPipeline(mockReq, 'DORMANT');
    expect(mockService.getCreatorsByStatus).toHaveBeenCalledWith(
      'cm-1',
      'DORMANT',
    );
  });

  it('getPipeline without status returns dashboard', async () => {
    mockService.getDashboard.mockResolvedValue({});
    await controller.getPipeline(mockReq, undefined);
    expect(mockService.getDashboard).toHaveBeenCalledWith('cm-1');
  });

  it('pushRecommendation delegates all params', async () => {
    mockService.pushCampaignRecommendation.mockResolvedValue({ success: true });
    await controller.pushRecommendation(mockReq, {
      creator_id: 'c1',
      campaign_id: 'camp1',
    });
    expect(mockService.pushCampaignRecommendation).toHaveBeenCalledWith(
      'cm-1',
      'c1',
      'camp1',
    );
  });

  it('getSmartRecommendations delegates userId', async () => {
    mockService.generateSmartRecommendations.mockResolvedValue([]);
    await controller.getSmartRecommendations(mockReq);
    expect(mockService.generateSmartRecommendations).toHaveBeenCalledWith(
      'cm-1',
    );
  });

  it('getGMVMonitoring delegates userId', async () => {
    mockService.getGMVMonitoring.mockResolvedValue({});
    await controller.getGMVMonitoring(mockReq);
    expect(mockService.getGMVMonitoring).toHaveBeenCalledWith('cm-1');
  });

  it('getLevelMonitoring delegates userId', async () => {
    mockService.getLevelMonitoring.mockResolvedValue({});
    await controller.getLevelMonitoring(mockReq);
    expect(mockService.getLevelMonitoring).toHaveBeenCalledWith('cm-1');
  });

  it('assignCreator delegates params', async () => {
    mockService.assignCreator.mockResolvedValue({ success: true });
    await controller.assignCreator({ creator_id: 'c1', cm_id: 'cm-2' });
    expect(mockService.assignCreator).toHaveBeenCalledWith('c1', 'cm-2');
  });
});
