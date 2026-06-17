import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { BadRequestException } from '@nestjs/common';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({})),
}));

const mockService = {
  createWithUpload: jest.fn(),
  review: jest.fn(),
  bulkReview: jest.fn(),
  markAsPosted: jest.fn(),
  markAsCompleted: jest.fn(),
  findByCreator: jest.fn(),
  findPendingQC: jest.fn(),
  getQcStats: jest.fn(),
  getSowProgress: jest.fn(),
  findByCampaign: jest.fn(),
  submitVtLink: jest.fn(),
};

describe('SubmissionsController', () => {
  let controller: SubmissionsController;
  const mockReq = { user: { userId: 'creator-1' } };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubmissionsController],
      providers: [{ provide: SubmissionsService, useValue: mockService }],
    }).compile();
    controller = module.get<SubmissionsController>(SubmissionsController);
  });

  it('uploadSubmission throws when no file', () => {
    expect(() =>
      controller.uploadSubmission(mockReq, undefined as any, {} as any),
    ).toThrow(BadRequestException);
  });

  it('uploadSubmission delegates to service with file', async () => {
    const file = {
      path: '/tmp/video.mp4',
      mimetype: 'video/mp4',
      size: 1000,
    } as Express.Multer.File;
    const dto = { campaign_id: 'c1' } as any;
    mockService.createWithUpload.mockResolvedValue({ id: 's1' });

    // Mock validateFileSize (it's imported from config)
    await controller.uploadSubmission(mockReq, file, dto);
    expect(mockService.createWithUpload).toHaveBeenCalledWith(
      'creator-1',
      file,
      dto,
    );
  });

  it('review delegates to service', async () => {
    const dto = { status: 'APPROVED', quality_score: 85 } as any;
    mockService.review.mockResolvedValue({ success: true });
    await controller.review(mockReq, 's1', dto);
    expect(mockService.review).toHaveBeenCalledWith('s1', dto, mockReq.user.userId);
  });

  it('bulkReview delegates to service', async () => {
    const dto = { submission_ids: ['s1', 's2'], status: 'APPROVED' } as any;
    mockService.bulkReview.mockResolvedValue({ processed: 2 });
    await controller.bulkReview(mockReq, dto);
    expect(mockService.bulkReview).toHaveBeenCalledWith(dto, mockReq.user.userId);
  });

  it('markPosted delegates by ID', async () => {
    mockService.markAsPosted.mockResolvedValue({ success: true });
    await controller.markPosted('s1');
    expect(mockService.markAsPosted).toHaveBeenCalledWith('s1');
  });

  it('markCompleted delegates by ID', async () => {
    mockService.markAsCompleted.mockResolvedValue({ success: true });
    await controller.markCompleted('s1');
    expect(mockService.markAsCompleted).toHaveBeenCalledWith('s1');
  });

  it('findMine uses userId from request', async () => {
    mockService.findByCreator.mockResolvedValue([]);
    await controller.findMine(mockReq);
    expect(mockService.findByCreator).toHaveBeenCalledWith('creator-1', 0, 50);
  });

  it('findPendingQC delegates to service', async () => {
    mockService.findPendingQC.mockResolvedValue([]);
    await controller.findPendingQC();
    expect(mockService.findPendingQC).toHaveBeenCalled();
  });

  it('getQcStats delegates to service', async () => {
    mockService.getQcStats.mockResolvedValue({});
    await controller.getQcStats();
    expect(mockService.getQcStats).toHaveBeenCalled();
  });

  it('getSowProgress delegates by campaign ID', async () => {
    mockService.getSowProgress.mockResolvedValue({});
    await controller.getSowProgress('c1');
    expect(mockService.getSowProgress).toHaveBeenCalledWith('c1');
  });

  it('findByCampaign delegates by ID', async () => {
    mockService.findByCampaign.mockResolvedValue([]);
    await controller.findByCampaign('c1');
    expect(mockService.findByCampaign).toHaveBeenCalledWith('c1', 0, 50);
  });

  it('submitVtLink delegates with userId and link', async () => {
    mockService.submitVtLink.mockResolvedValue({ success: true });
    await controller.submitVtLink(mockReq, 's1', {
      tiktok_vt_link: 'https://vt.tiktok.com/abc',
    });
    expect(mockService.submitVtLink).toHaveBeenCalledWith(
      's1',
      'creator-1',
      'https://vt.tiktok.com/abc',
    );
  });
});
