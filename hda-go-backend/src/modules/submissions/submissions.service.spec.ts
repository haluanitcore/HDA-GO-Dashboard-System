import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GDriveService } from '../gdrive/gdrive.service';

const mockPrisma = {
  submission: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  submissionDeliverable: {
    upsert: jest.fn(),
  },
  campaign: {
    findUnique: jest.fn(),
  },
  campaignParticipant: {
    findUnique: jest.fn(),
  },
  creator: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
  $transaction: jest.fn((ops: any) => {
    if (typeof ops === 'function') return ops(mockPrisma);
    return Promise.all(ops);
  }),
};

const mockGDriveService = {
  isAvailable: jest.fn(),
  uploadFile: jest.fn(),
};

describe('SubmissionsService', () => {
  let service: SubmissionsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GDriveService, useValue: mockGDriveService },
      ],
    }).compile();
    service = module.get<SubmissionsService>(SubmissionsService);
  });

  // ══════════════════════════════════════════════════
  // createWithUpload
  // ══════════════════════════════════════════════════
  describe('createWithUpload', () => {
    const mockFile: Express.Multer.File = {
      path: '/tmp/test.mp4',
      filename: 'test-123.mp4',
      originalname: 'my-video.mp4',
      size: 1024000,
      mimetype: 'video/mp4',
    } as Express.Multer.File;

    const dto = {
      campaign_id: 'camp-1',
      total_sow: '3',
    };

    it('creates submission with QC_REVIEW status and notifies CM', async () => {
      mockPrisma.campaignParticipant.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrisma.submission.create.mockResolvedValue({
        id: 'sub-1',
        status: 'QC_REVIEW',
        campaign_id: 'camp-1',
        creator_id: 'creator-1',
      });
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-1',
        sow_total: 3,
      });
      mockPrisma.submission.findMany.mockResolvedValue([]);
      mockPrisma.creator.findUnique.mockResolvedValue({
        user_id: 'creator-1',
        cm_id: 'cm-1',
        user: { name: 'Test Creator' },
      });
      mockPrisma.creator.update.mockResolvedValue({});
      mockPrisma.submissionDeliverable.upsert.mockResolvedValue({});
      mockPrisma.notification.create.mockResolvedValue({});

      const result = await service.createWithUpload('creator-1', mockFile, dto);

      expect(result.id).toBe('sub-1');
      expect(result.message).toContain('berhasil diupload');
      expect(mockPrisma.creator.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { total_posts: { increment: 1 } },
        }),
      );
    });

    it('throws BadRequestException when creator is not participant', async () => {
      mockPrisma.campaignParticipant.findUnique.mockResolvedValue(null);

      await expect(
        service.createWithUpload('creator-1', mockFile, dto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ══════════════════════════════════════════════════
  // review
  // ══════════════════════════════════════════════════
  describe('review', () => {
    const submission = {
      id: 'sub-1',
      creator_id: 'creator-1',
      campaign_id: 'camp-1',
      status: 'QC_REVIEW',
      tiktok_url: '/api/uploads/test.mp4',
      creator: { user: { name: 'Creator' } },
    };

    it('approves submission and creates notification', async () => {
      mockPrisma.submission.findUnique.mockResolvedValue(submission);
      mockPrisma.submission.update.mockResolvedValue({
        ...submission,
        status: 'APPROVED',
      });
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-1',
        sow_total: 3,
      });
      mockPrisma.submission.findMany.mockResolvedValue([
        { id: 'sub-1', status: 'APPROVED' },
      ]);
      mockPrisma.submissionDeliverable.upsert.mockResolvedValue({});
      mockPrisma.notification.create.mockResolvedValue({});
      // GDrive not available — keeps local URL
      mockGDriveService.isAvailable.mockReturnValue(false);

      const result = await service.review('sub-1', {
        status: 'APPROVED',
        qc_notes: 'Looks great!',
      }, 'cm-1');

      expect(result.status).toBe('APPROVED');
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: '✅ Submission Approved!',
          }),
        }),
      );
    });

    it('sets revision with deadline and increments revision count', async () => {
      mockPrisma.submission.findUnique.mockResolvedValue(submission);
      mockPrisma.submission.update.mockResolvedValue({
        ...submission,
        status: 'REVISION',
      });
      mockPrisma.campaign.findUnique.mockResolvedValue({ sow_total: 1 });
      mockPrisma.submission.findMany.mockResolvedValue([]);
      mockPrisma.submissionDeliverable.upsert.mockResolvedValue({});
      mockPrisma.notification.create.mockResolvedValue({});

      await service.review('sub-1', {
        status: 'REVISION',
        qc_notes: 'Please fix audio',
      }, 'cm-1');

      expect(mockPrisma.submission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'REVISION',
            revision_count: { increment: 1 },
          }),
        }),
      );
    });

    it('rejects and creates notification', async () => {
      mockPrisma.submission.findUnique.mockResolvedValue(submission);
      mockPrisma.submission.update.mockResolvedValue({
        ...submission,
        status: 'REJECTED',
      });
      mockPrisma.campaign.findUnique.mockResolvedValue({ sow_total: 1 });
      mockPrisma.submission.findMany.mockResolvedValue([]);
      mockPrisma.submissionDeliverable.upsert.mockResolvedValue({});
      mockPrisma.notification.create.mockResolvedValue({});

      await service.review('sub-1', {
        status: 'REJECTED',
        qc_notes: 'Off-topic',
      }, 'cm-1');

      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: '❌ Submission Ditolak',
          }),
        }),
      );
    });

    it('throws NotFoundException when submission not found', async () => {
      mockPrisma.submission.findUnique.mockResolvedValue(null);

      await expect(
        service.review('nonexistent', { status: 'APPROVED' }, 'cm-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ══════════════════════════════════════════════════
  // bulkReview
  // ══════════════════════════════════════════════════
  describe('bulkReview', () => {
    it('processes multiple submissions', async () => {
      // Mock each review call
      const submission = {
        id: 'sub-1',
        creator_id: 'c1',
        campaign_id: 'camp-1',
        status: 'QC_REVIEW',
        tiktok_url: '/api/uploads/test.mp4',
        creator: { user: { name: 'C' } },
      };
      mockPrisma.submission.findUnique.mockResolvedValue(submission);
      mockPrisma.submission.update.mockResolvedValue({
        ...submission,
        status: 'APPROVED',
      });
      mockPrisma.campaign.findUnique.mockResolvedValue({ sow_total: 1 });
      mockPrisma.submission.findMany.mockResolvedValue([]);
      mockPrisma.submissionDeliverable.upsert.mockResolvedValue({});
      mockPrisma.notification.create.mockResolvedValue({});
      mockGDriveService.isAvailable.mockReturnValue(false);

      const result = await service.bulkReview({
        submissionIds: ['sub-1', 'sub-2'],
        status: 'APPROVED',
      }, 'cm-1');

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
    });
  });

  // ══════════════════════════════════════════════════
  // markAsPosted / markAsCompleted
  // ══════════════════════════════════════════════════
  describe('markAsPosted', () => {
    it('updates status to POSTED with timestamp', async () => {
      mockPrisma.submission.update.mockResolvedValue({
        id: 'sub-1',
        status: 'POSTED',
        creator_id: 'c1',
        campaign_id: 'camp-1',
      });
      mockPrisma.campaign.findUnique.mockResolvedValue({ sow_total: 1 });
      mockPrisma.submission.findMany.mockResolvedValue([]);
      mockPrisma.submissionDeliverable.upsert.mockResolvedValue({});

      const result = await service.markAsPosted('sub-1');

      expect(result.status).toBe('POSTED');
    });
  });

  describe('markAsCompleted', () => {
    it('updates status to COMPLETED with timestamp', async () => {
      mockPrisma.submission.update.mockResolvedValue({
        id: 'sub-1',
        status: 'COMPLETED',
        creator_id: 'c1',
        campaign_id: 'camp-1',
      });
      mockPrisma.campaign.findUnique.mockResolvedValue({ sow_total: 1 });
      mockPrisma.submission.findMany.mockResolvedValue([]);
      mockPrisma.submissionDeliverable.upsert.mockResolvedValue({});

      const result = await service.markAsCompleted('sub-1');

      expect(result.status).toBe('COMPLETED');
    });
  });

  // ══════════════════════════════════════════════════
  // findByCreator / findByCampaign
  // ══════════════════════════════════════════════════
  describe('findByCreator', () => {
    it('returns submissions ordered by submitted_at desc', async () => {
      mockPrisma.submission.findMany.mockResolvedValue([
        { id: 'sub-2' },
        { id: 'sub-1' },
      ]);
      mockPrisma.submission.count.mockResolvedValue(2);

      const result = await service.findByCreator('creator-1');

      expect(result.data).toHaveLength(2);
      expect(mockPrisma.submission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { creator_id: 'creator-1' },
          orderBy: { submitted_at: 'desc' },
        }),
      );
    });
  });

  describe('findByCampaign', () => {
    it('returns submissions for campaign with creator info', async () => {
      mockPrisma.submission.findMany.mockResolvedValue([{ id: 'sub-1' }]);

      const result = await service.findByCampaign('camp-1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.submission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { campaign_id: 'camp-1' },
        }),
      );
    });
  });

  // ══════════════════════════════════════════════════
  // getQcStats
  // ══════════════════════════════════════════════════
  describe('getQcStats', () => {
    it('calculates QC performance metrics', async () => {
      mockPrisma.submission.count
        .mockResolvedValueOnce(5) // reviewedToday
        .mockResolvedValueOnce(20) // totalReviewed
        .mockResolvedValueOnce(15) // approvedCount
        .mockResolvedValueOnce(3) // revisionCount
        .mockResolvedValueOnce(2) // rejectedCount
        .mockResolvedValueOnce(8); // pendingCount

      const result = await service.getQcStats();

      expect(result.reviewedToday).toBe(5);
      expect(result.approvalRate).toBe(75); // 15/20 * 100
      expect(result.revisionRate).toBe(15); // 3/20 * 100
      expect(result.rejectionRate).toBe(10); // 2/20 * 100
      expect(result.pendingCount).toBe(8);
      expect(result.dailyTarget).toBe(60);
    });

    it('returns 0 rates when no submissions reviewed', async () => {
      mockPrisma.submission.count
        .mockResolvedValueOnce(0) // reviewedToday
        .mockResolvedValueOnce(0) // totalReviewed
        .mockResolvedValueOnce(3); // pendingCount

      const result = await service.getQcStats();

      expect(result.approvalRate).toBe(0);
      expect(result.revisionRate).toBe(0);
      expect(result.rejectionRate).toBe(0);
    });
  });

  // ══════════════════════════════════════════════════
  // submitVtLink
  // ══════════════════════════════════════════════════
  describe('submitVtLink', () => {
    it('saves VT link on approved submission', async () => {
      mockPrisma.submission.findUnique.mockResolvedValue({
        id: 'sub-1',
        creator_id: 'creator-1',
        status: 'APPROVED',
      });
      mockPrisma.submission.update.mockResolvedValue({
        id: 'sub-1',
        tiktok_vt_link: 'https://vt.tiktok.com/xxx',
      });

      const result = await service.submitVtLink(
        'sub-1',
        'creator-1',
        'https://vt.tiktok.com/xxx',
      );

      expect(result.success).toBe(true);
    });

    it('throws NotFoundException when submission not found', async () => {
      mockPrisma.submission.findUnique.mockResolvedValue(null);

      await expect(
        service.submitVtLink('nonexistent', 'c1', 'url'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when creator does not own submission', async () => {
      mockPrisma.submission.findUnique.mockResolvedValue({
        id: 'sub-1',
        creator_id: 'other-creator',
        status: 'APPROVED',
      });

      await expect(
        service.submitVtLink('sub-1', 'creator-1', 'url'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for non-approved submission', async () => {
      mockPrisma.submission.findUnique.mockResolvedValue({
        id: 'sub-1',
        creator_id: 'creator-1',
        status: 'QC_REVIEW',
      });

      await expect(
        service.submitVtLink('sub-1', 'creator-1', 'url'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ══════════════════════════════════════════════════
  // getSowProgress
  // ══════════════════════════════════════════════════
  describe('getSowProgress', () => {
    it('returns SOW progress per creator', async () => {
      mockPrisma.submission.findMany.mockResolvedValue([
        {
          id: 'sub-1',
          status: 'APPROVED',
          file_name: 'video.mp4',
          file_type: 'video/mp4',
          creator: { user: { name: 'Alice' } },
          deliverable: { total_sow: 3, completed_sow: 1, remaining_sow: 2 },
        },
      ]);
      mockPrisma.campaign.findUnique.mockResolvedValue({
        title: 'Campaign X',
        sow_total: 3,
      });

      const result = await service.getSowProgress('camp-1');

      expect(result.campaignTitle).toBe('Campaign X');
      expect(result.totalSOW).toBe(3);
      expect(result.creators[0].name).toBe('Alice');
      expect(result.creators[0].progressLabel).toBe('1/3 Posted');
    });
  });
});
