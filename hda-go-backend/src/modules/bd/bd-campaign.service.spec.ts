import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BdCampaignService } from './bd-campaign.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../notifications/events.gateway';

// ── Mock factories ──
const mockPrisma = {
  campaign: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  campaignEditLog: {
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
  brandBDAssignment: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockEventsGateway = {
  emitNotification: jest.fn(),
};

describe('BdCampaignService', () => {
  let service: BdCampaignService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BdCampaignService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventsGateway, useValue: mockEventsGateway },
      ],
    }).compile();
    service = module.get<BdCampaignService>(BdCampaignService);
  });

  // ══════════════════════════════════════════════════
  // getAssignedBrandIds
  // ══════════════════════════════════════════════════
  describe('getAssignedBrandIds', () => {
    it('returns empty array for ADMIN users (sees all)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' });

      const result = await service.getAssignedBrandIds('admin-1');
      expect(result).toEqual([]);
    });

    it('returns assigned brand IDs for BD users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ role: 'BD' });
      mockPrisma.brandBDAssignment.findMany.mockResolvedValue([
        { brand_user_id: 'brand-1' },
        { brand_user_id: 'brand-2' },
      ]);

      const result = await service.getAssignedBrandIds('bd-1');
      expect(result).toEqual(['brand-1', 'brand-2']);
    });
  });

  // ══════════════════════════════════════════════════
  // getDashboard
  // ══════════════════════════════════════════════════
  describe('getDashboard', () => {
    it('returns aggregated dashboard with correct counts', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
      mockPrisma.campaign.findMany.mockResolvedValue([
        {
          id: 'c1',
          status: 'PENDING_BD',
          brand_id: 'b1',
          budget: 1000000,
          category: 'HOTEL',
        },
        {
          id: 'c2',
          status: 'BD_APPROVED',
          brand_id: 'b1',
          budget: 2000000,
          category: 'FNB',
        },
        {
          id: 'c3',
          status: 'ACTIVE',
          brand_id: 'b2',
          budget: 3000000,
          category: 'HOTEL',
        },
        {
          id: 'c4',
          status: 'BD_REVISION',
          brand_id: 'b1',
          budget: 500000,
          category: 'HOTEL',
        },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'b1', name: 'Brand A', email: 'a@test.com' },
      ]);
      mockPrisma.campaignEditLog.findMany.mockResolvedValue([]);

      const result = await service.getDashboard('admin-1');

      expect(result.summary.pendingCount).toBe(1);
      expect(result.summary.approvedCount).toBe(1);
      expect(result.summary.revisionCount).toBe(1);
      expect(result.summary.activeCount).toBe(1);
      expect(result.summary.totalCampaigns).toBe(4);
      expect(result.summary.totalBudget).toBe(5000000); // BD_APPROVED + ACTIVE
      expect(result.recentPending).toHaveLength(1);
    });
  });

  // ══════════════════════════════════════════════════
  // getCampaignsByStatus
  // ══════════════════════════════════════════════════
  describe('getCampaignsByStatus', () => {
    it('returns campaigns filtered by status with brand info', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
      mockPrisma.campaign.findMany.mockResolvedValue([
        {
          id: 'c1',
          brand_id: 'b1',
          status: 'PENDING_BD',
          _count: { participants: 3, submissions: 1 },
        },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'b1', name: 'Brand X', email: 'x@test.com' },
      ]);

      const result = await service.getCampaignsByStatus(
        'admin-1',
        'PENDING_BD',
      );

      expect(result).toHaveLength(1);
      expect(result[0].brand).toEqual({
        id: 'b1',
        name: 'Brand X',
        email: 'x@test.com',
      });
    });
  });

  // ══════════════════════════════════════════════════
  // getCampaignDetail
  // ══════════════════════════════════════════════════
  describe('getCampaignDetail', () => {
    it('returns enriched campaign detail', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'c1',
        brand_id: 'b1',
        bd_reviewer_id: 'bd-1',
        editLogs: [{ editor_id: 'bd-1', field_name: 'status' }],
        _count: { participants: 5, submissions: 2 },
      });
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'b1', name: 'Brand', email: 'b@t.com' }) // brand
        .mockResolvedValueOnce({
          id: 'bd-1',
          name: 'BD User',
          email: 'bd@t.com',
        }); // reviewer
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'bd-1', name: 'BD User' },
      ]);

      const result = await service.getCampaignDetail('c1');

      expect(result.brand).toBeDefined();
      expect(result.bdReviewer).toBeDefined();
      expect(result.editLogs[0].editor_name).toBe('BD User');
    });

    it('throws NotFoundException when campaign not found', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);

      await expect(service.getCampaignDetail('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ══════════════════════════════════════════════════
  // approveCampaign
  // ══════════════════════════════════════════════════
  describe('approveCampaign', () => {
    const pendingCampaign = {
      id: 'c1',
      title: 'Test Campaign',
      status: 'PENDING_BD',
      brand_id: 'brand-1',
      budget: 5000000,
    };

    it('approves PENDING_BD campaign and notifies CMs + Brand', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(pendingCampaign);
      mockPrisma.campaign.update.mockResolvedValue({
        ...pendingCampaign,
        status: 'BD_APPROVED',
      });
      mockPrisma.campaignEditLog.create.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'BD Person' });
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'cm-1' },
        { id: 'cm-2' },
      ]);
      mockPrisma.notification.create.mockResolvedValue({});

      const result = await service.approveCampaign('c1', 'bd-1', 'Good to go');

      expect(result.campaign.status).toBe('BD_APPROVED');
      expect(result.notifiedCMs).toBe(2);
      // 2 CM notifications + 1 Brand notification = 3 total
      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(3);
      expect(mockEventsGateway.emitNotification).toHaveBeenCalledTimes(3);
    });

    it('approves BD_REVISION campaign', async () => {
      const revisionCampaign = { ...pendingCampaign, status: 'BD_REVISION' };
      mockPrisma.campaign.findUnique.mockResolvedValue(revisionCampaign);
      mockPrisma.campaign.update.mockResolvedValue({
        ...revisionCampaign,
        status: 'BD_APPROVED',
      });
      mockPrisma.campaignEditLog.create.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'BD' });
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.notification.create.mockResolvedValue({});

      const result = await service.approveCampaign('c1', 'bd-1');
      expect(result.campaign.status).toBe('BD_APPROVED');
    });

    it('throws NotFoundException when campaign not found', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);

      await expect(
        service.approveCampaign('nonexistent', 'bd-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for invalid status transition', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue({
        ...pendingCampaign,
        status: 'ACTIVE',
      });

      await expect(service.approveCampaign('c1', 'bd-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ══════════════════════════════════════════════════
  // requestRevision
  // ══════════════════════════════════════════════════
  describe('requestRevision', () => {
    const pendingCampaign = {
      id: 'c1',
      title: 'Test Campaign',
      status: 'PENDING_BD',
      brand_id: 'brand-1',
    };

    it('sets campaign to BD_REVISION and notifies brand', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(pendingCampaign);
      mockPrisma.campaign.update.mockResolvedValue({
        ...pendingCampaign,
        status: 'BD_REVISION',
      });
      mockPrisma.campaignEditLog.create.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'BD User' });
      mockPrisma.notification.create.mockResolvedValue({});

      const result = await service.requestRevision('c1', 'bd-1', 'Fix budget');

      expect(result.campaign.status).toBe('BD_REVISION');
      expect(result.notified).toBe(true);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ user_id: 'brand-1' }),
        }),
      );
    });

    it('throws BadRequestException when notes are empty', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(pendingCampaign);

      await expect(service.requestRevision('c1', 'bd-1', '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException for non-PENDING_BD status', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue({
        ...pendingCampaign,
        status: 'BD_APPROVED',
      });

      await expect(
        service.requestRevision('c1', 'bd-1', 'notes'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ══════════════════════════════════════════════════
  // editCampaign
  // ══════════════════════════════════════════════════
  describe('editCampaign', () => {
    it('creates edit logs for changed fields', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'c1',
        title: 'Old Title',
        budget: 1000000,
        category: 'HOTEL',
      });
      mockPrisma.campaign.update.mockResolvedValue({
        id: 'c1',
        title: 'New Title',
        budget: 2000000,
      });
      mockPrisma.campaignEditLog.createMany.mockResolvedValue({ count: 2 });

      const result = await service.editCampaign('c1', 'bd-1', {
        title: 'New Title',
        budget: 2000000,
      });

      expect(result.fieldsChanged).toBe(2);
      expect(result.changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'title',
            from: 'Old Title',
            to: 'New Title',
          }),
        ]),
      );
    });

    it('returns no changes message when nothing changed', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'c1',
        title: 'Same',
      });

      const result = await service.editCampaign('c1', 'bd-1', {
        title: 'Same',
      });

      expect(result.message).toBe('No changes detected');
    });

    it('throws NotFoundException when campaign not found', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);

      await expect(
        service.editCampaign('nonexistent', 'bd-1', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ══════════════════════════════════════════════════
  // submitNewDeal
  // ══════════════════════════════════════════════════
  describe('submitNewDeal', () => {
    it('creates a new campaign with PENDING_BD status', async () => {
      const mockCampaign = {
        id: 'new-c1',
        title: 'New Deal',
        status: 'PENDING_BD',
      };
      mockPrisma.campaign.create.mockResolvedValue(mockCampaign);
      mockPrisma.campaignEditLog.create.mockResolvedValue({});

      const result = await service.submitNewDeal('bd-1', {
        title: 'New Deal',
        category: 'HOTEL',
        budget: 5000000,
      });

      expect(result.success).toBe(true);
      expect(result.campaign.status).toBe('PENDING_BD');
      expect(mockPrisma.campaignEditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CREATE',
            editor_role: 'BD',
          }),
        }),
      );
    });
  });

  // ══════════════════════════════════════════════════
  // assignBrand
  // ══════════════════════════════════════════════════
  describe('assignBrand', () => {
    it('creates new assignment when none exists', async () => {
      mockPrisma.brandBDAssignment.findUnique.mockResolvedValue(null);
      mockPrisma.brandBDAssignment.create.mockResolvedValue({
        id: 'a1',
        bd_user_id: 'bd-1',
        brand_user_id: 'brand-1',
        is_active: true,
      });

      const result = await service.assignBrand('bd-1', 'brand-1');
      expect(result.is_active).toBe(true);
    });

    it('reactivates inactive assignment', async () => {
      mockPrisma.brandBDAssignment.findUnique.mockResolvedValue({
        id: 'a1',
        is_active: false,
      });
      mockPrisma.brandBDAssignment.update.mockResolvedValue({
        id: 'a1',
        is_active: true,
      });

      const result = await service.assignBrand('bd-1', 'brand-1');
      expect(result.is_active).toBe(true);
    });

    it('returns existing active assignment', async () => {
      const existing = { id: 'a1', is_active: true };
      mockPrisma.brandBDAssignment.findUnique.mockResolvedValue(existing);

      const result = await service.assignBrand('bd-1', 'brand-1');
      expect(result).toEqual(existing);
    });
  });

  // ══════════════════════════════════════════════════
  // getReviewHistory
  // ══════════════════════════════════════════════════
  describe('getReviewHistory', () => {
    it('returns review history enriched with user names', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
      mockPrisma.campaign.findMany.mockResolvedValue([
        {
          id: 'c1',
          brand_id: 'b1',
          bd_reviewer_id: 'bd-1',
          status: 'BD_APPROVED',
        },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'b1', name: 'Brand A' },
        { id: 'bd-1', name: 'BD User' },
      ]);

      const result = await service.getReviewHistory('admin-1');

      expect(result[0].brand_name).toBe('Brand A');
      expect(result[0].bd_reviewer_name).toBe('BD User');
    });
  });
});
