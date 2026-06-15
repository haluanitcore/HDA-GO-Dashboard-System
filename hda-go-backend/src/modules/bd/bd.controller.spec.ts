import { Test, TestingModule } from '@nestjs/testing';
import { BdController } from './bd.controller';
import { BdService } from './bd.service';
import { BadRequestException } from '@nestjs/common';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({})),
}));

const mockBdService = {
  getDashboard: jest.fn(),
  getCampaignsByStatus: jest.fn(),
  getReviewHistory: jest.fn(),
  getCampaignDetail: jest.fn(),
  approveCampaign: jest.fn(),
  requestRevision: jest.fn(),
  editCampaign: jest.fn(),
  getAnalytics: jest.fn(),
  getAssignments: jest.fn(),
  assignBrand: jest.fn(),
  submitNewDeal: jest.fn(),
  uploadHotelExcel: jest.fn(),
  uploadCreatorGmvExcel: jest.fn(),
  syncGoogleSpreadsheet: jest.fn(),
  getHotels: jest.fn(),
  createHotel: jest.fn(),
  createHotelVisit: jest.fn(),
  updateHotelVisitStatus: jest.fn(),
  getHotelVisits: jest.fn(),
};

describe('BdController', () => {
  let controller: BdController;
  const mockReq = { user: { userId: 'bd-user-1' } };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BdController],
      providers: [{ provide: BdService, useValue: mockBdService }],
    }).compile();
    controller = module.get<BdController>(BdController);
  });

  it('getDashboard delegates to service', async () => {
    mockBdService.getDashboard.mockResolvedValue({ total: 5 });
    const result = await controller.getDashboard(mockReq);
    expect(mockBdService.getDashboard).toHaveBeenCalledWith('bd-user-1');
    expect(result).toEqual({ total: 5 });
  });

  it('getPending fetches PENDING_BD campaigns', async () => {
    mockBdService.getCampaignsByStatus.mockResolvedValue([]);
    await controller.getPending(mockReq);
    expect(mockBdService.getCampaignsByStatus).toHaveBeenCalledWith(
      'bd-user-1',
      'PENDING_BD',
    );
  });

  it('getApproved fetches BD_APPROVED campaigns', async () => {
    mockBdService.getCampaignsByStatus.mockResolvedValue([]);
    await controller.getApproved(mockReq);
    expect(mockBdService.getCampaignsByStatus).toHaveBeenCalledWith(
      'bd-user-1',
      'BD_APPROVED',
    );
  });

  it('getRevision fetches BD_REVISION campaigns', async () => {
    mockBdService.getCampaignsByStatus.mockResolvedValue([]);
    await controller.getRevision(mockReq);
    expect(mockBdService.getCampaignsByStatus).toHaveBeenCalledWith(
      'bd-user-1',
      'BD_REVISION',
    );
  });

  it('getHistory fetches review history', async () => {
    mockBdService.getReviewHistory.mockResolvedValue([]);
    await controller.getHistory(mockReq);
    expect(mockBdService.getReviewHistory).toHaveBeenCalledWith('bd-user-1');
  });

  it('getCampaignDetail fetches by ID', async () => {
    mockBdService.getCampaignDetail.mockResolvedValue({ id: 'c1' });
    const result = await controller.getCampaignDetail('c1');
    expect(result).toEqual({ id: 'c1' });
  });

  it('approveCampaign delegates with notes', async () => {
    mockBdService.approveCampaign.mockResolvedValue({ success: true });
    await controller.approveCampaign(mockReq, 'c1', { notes: 'OK' });
    expect(mockBdService.approveCampaign).toHaveBeenCalledWith(
      'c1',
      'bd-user-1',
      'OK',
    );
  });

  it('requestRevision delegates with notes', async () => {
    mockBdService.requestRevision.mockResolvedValue({ success: true });
    await controller.requestRevision(mockReq, 'c1', { notes: 'Fix budget' });
    expect(mockBdService.requestRevision).toHaveBeenCalledWith(
      'c1',
      'bd-user-1',
      'Fix budget',
    );
  });

  it('editCampaign delegates DTO', async () => {
    const dto = { title: 'Updated' };
    mockBdService.editCampaign.mockResolvedValue({ success: true });
    await controller.editCampaign(mockReq, 'c1', dto);
    expect(mockBdService.editCampaign).toHaveBeenCalledWith(
      'c1',
      'bd-user-1',
      dto,
    );
  });

  it('getAnalytics delegates to service', async () => {
    mockBdService.getAnalytics.mockResolvedValue({});
    await controller.getAnalytics(mockReq);
    expect(mockBdService.getAnalytics).toHaveBeenCalledWith('bd-user-1');
  });

  it('getAssignments delegates to service', async () => {
    mockBdService.getAssignments.mockResolvedValue([]);
    await controller.getAssignments(mockReq);
    expect(mockBdService.getAssignments).toHaveBeenCalledWith('bd-user-1');
  });

  it('assignBrand delegates DTO', async () => {
    mockBdService.assignBrand.mockResolvedValue({ success: true });
    await controller.assignBrand({ bd_user_id: 'bd1', brand_user_id: 'br1' });
    expect(mockBdService.assignBrand).toHaveBeenCalledWith('bd1', 'br1');
  });

  it('submitDeal delegates to service', async () => {
    const dto = { title: 'New Deal' };
    mockBdService.submitNewDeal.mockResolvedValue({ success: true });
    await controller.submitDeal(mockReq, dto as any);
    expect(mockBdService.submitNewDeal).toHaveBeenCalledWith('bd-user-1', dto);
  });

  it('uploadHotelExcel throws when no file', () => {
    expect(() => controller.uploadHotelExcel(undefined as any)).toThrow(
      BadRequestException,
    );
  });

  it('uploadHotelExcel delegates with file', async () => {
    const file = { path: '/tmp/hotels.csv' } as Express.Multer.File;
    mockBdService.uploadHotelExcel.mockResolvedValue({ imported: 5 });
    await controller.uploadHotelExcel(file);
    expect(mockBdService.uploadHotelExcel).toHaveBeenCalledWith(file);
  });

  it('uploadCreatorGmvExcel throws when no file', () => {
    expect(() => controller.uploadCreatorGmvExcel(undefined as any)).toThrow(
      BadRequestException,
    );
  });

  it('syncGoogleSpreadsheet delegates to service', async () => {
    mockBdService.syncGoogleSpreadsheet.mockResolvedValue({ synced: 10 });
    await controller.syncGoogleSpreadsheet();
    expect(mockBdService.syncGoogleSpreadsheet).toHaveBeenCalled();
  });

  it('getHotels delegates to service', async () => {
    mockBdService.getHotels.mockResolvedValue({ hotels: [] });
    await controller.getHotels();
    expect(mockBdService.getHotels).toHaveBeenCalled();
  });

  it('createHotel delegates body', async () => {
    const body = { name: 'Hotel X' };
    mockBdService.createHotel.mockResolvedValue({ success: true });
    await controller.createHotel(body);
    expect(mockBdService.createHotel).toHaveBeenCalledWith(body);
  });

  it('createHotelVisit delegates body', async () => {
    const body = { hotel_id: 'h1', visit_type: 'REVIEW' };
    mockBdService.createHotelVisit.mockResolvedValue({ success: true });
    await controller.createHotelVisit(body);
    expect(mockBdService.createHotelVisit).toHaveBeenCalledWith(body);
  });

  it('updateHotelVisit delegates status and notes', async () => {
    mockBdService.updateHotelVisitStatus.mockResolvedValue({ success: true });
    await controller.updateHotelVisit('v1', {
      status: 'COMPLETED',
      notes: 'Done',
    });
    expect(mockBdService.updateHotelVisitStatus).toHaveBeenCalledWith(
      'v1',
      'COMPLETED',
      'Done',
    );
  });

  it('getHotelVisits delegates optional campaignId', async () => {
    mockBdService.getHotelVisits.mockResolvedValue({ visits: [] });
    await controller.getHotelVisits('c1');
    expect(mockBdService.getHotelVisits).toHaveBeenCalledWith('c1');
  });
});
