import { Test, TestingModule } from '@nestjs/testing';
import { GmvController } from './gmv.controller';
import { GmvService } from './gmv.service';
import { BadRequestException } from '@nestjs/common';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({})),
}));

const mockService = {
  parseScreenshot: jest.fn(),
  submitSelfReport: jest.fn(),
  verifyGmv: jest.fn(),
  recordOrder: jest.fn(),
  getPendingGmv: jest.fn(),
  getCreatorGMV: jest.fn(),
  getPlatformGMV: jest.fn(),
};

describe('GmvController', () => {
  let controller: GmvController;
  const mockReq = { user: { userId: 'user-1', role: 'CM' } };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GmvController],
      providers: [{ provide: GmvService, useValue: mockService }],
    }).compile();
    controller = module.get<GmvController>(GmvController);
  });

  it('parseScreenshot throws when no file', async () => {
    await expect(controller.parseScreenshot(undefined as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('parseScreenshot delegates buffer to service', async () => {
    const file = { buffer: Buffer.from('test') } as Express.Multer.File;
    mockService.parseScreenshot.mockResolvedValue({ gmv: 1000 });
    await controller.parseScreenshot(file);
    expect(mockService.parseScreenshot).toHaveBeenCalledWith(file.buffer);
  });

  it('submitSelfReport delegates userId and body', async () => {
    const body = { gmvAmount: 500000, orderCount: 5, periodDate: '2023-01-01' };
    mockService.submitSelfReport.mockResolvedValue({ id: 'r1' });
    await controller.submitSelfReport(mockReq, body);
    expect(mockService.submitSelfReport).toHaveBeenCalledWith('user-1', body);
  });

  it('verifyGmv delegates id, userId, body', async () => {
    mockService.verifyGmv.mockResolvedValue({ success: true });
    const dto = { action: 'APPROVE' };
    await controller.verifyGmv('r1', mockReq, dto as any);
    expect(mockService.verifyGmv).toHaveBeenCalledWith('r1', 'user-1', 'CM', dto);
  });

  it('recordOrder delegates body fields', async () => {
    mockService.recordOrder.mockResolvedValue({ id: 'o1' });
    await controller.recordOrder({
      creator_id: 'c1',
      campaign_id: 'camp1',
      order_count: 5,
      gmv_amount: 100000,
    });
    expect(mockService.recordOrder).toHaveBeenCalledWith(
      'c1',
      'camp1',
      5,
      100000,
    );
  });

  it('getPendingGmv delegates to service', async () => {
    mockService.getPendingGmv.mockResolvedValue({ data: [], total: 0 });
    await controller.getPendingGmv(1, 50);
    expect(mockService.getPendingGmv).toHaveBeenCalledWith(1, 50);
  });

  it('getMyGMV uses userId', async () => {
    mockService.getCreatorGMV.mockResolvedValue({});
    await controller.getMyGMV(mockReq);
    expect(mockService.getCreatorGMV).toHaveBeenCalledWith('user-1');
  });

  it('getPlatformGMV delegates to service', async () => {
    mockService.getPlatformGMV.mockResolvedValue({});
    await controller.getPlatformGMV();
    expect(mockService.getPlatformGMV).toHaveBeenCalled();
  });
});
