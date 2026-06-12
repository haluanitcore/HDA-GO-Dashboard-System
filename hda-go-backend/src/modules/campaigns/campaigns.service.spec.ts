import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../notifications/events.gateway';

const mockPrisma = {
  campaign: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  campaignEditLog: { create: jest.fn() },
  campaignParticipant: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  creator: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  user: { findUnique: jest.fn() },
  notification: { create: jest.fn(), createMany: jest.fn() },
  brandBDAssignment: { findMany: jest.fn() },
};

const mockEventsGateway = {
  emitBDNewCampaign: jest.fn(),
};

describe('CampaignsService', () => {
  let service: CampaignsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventsGateway, useValue: mockEventsGateway },
      ],
    }).compile();
    service = module.get<CampaignsService>(CampaignsService);
  });

  // ── CREATE ────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = {
      title: 'Summer Campaign',
      category: 'FNB',
      min_level: 1,
      brand_id: 'brand-1',
      sow_total: 3,
      reward_type: 'COMMISSION',
      deadline: '2026-12-31',
      slot: 10,
      budget: 5000000,
    };

    it('creates a campaign with audit log', async () => {
      const campaign = { id: 'c1', ...dto, status: 'PENDING_BD' };
      mockPrisma.campaign.create.mockResolvedValue(campaign);
      mockPrisma.campaignEditLog.create.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Brand X' });
      mockPrisma.brandBDAssignment.findMany.mockResolvedValue([
        { bd_user_id: 'bd-1' },
      ]);
      mockPrisma.notification.create.mockResolvedValue({});

      const result = await service.create(dto);

      expect(result.id).toBe('c1');
      expect(mockPrisma.campaignEditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'CREATE' }),
        }),
      );
    });

    it('notifies BD users when status is PENDING_BD', async () => {
      const campaign = { id: 'c1', ...dto, status: 'PENDING_BD' };
      mockPrisma.campaign.create.mockResolvedValue(campaign);
      mockPrisma.campaignEditLog.create.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Brand X' });
      mockPrisma.brandBDAssignment.findMany.mockResolvedValue([
        { bd_user_id: 'bd-1' },
        { bd_user_id: 'bd-2' },
      ]);
      mockPrisma.notification.create.mockResolvedValue({});

      await service.create(dto);

      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(2);
      expect(mockEventsGateway.emitBDNewCampaign).toHaveBeenCalledWith(
        ['bd-1', 'bd-2'],
        expect.objectContaining({ campaignId: 'c1' }),
      );
    });

    it('uses default deadline if not provided', async () => {
      const noDeadlineDto = { ...dto, deadline: undefined };
      mockPrisma.campaign.create.mockResolvedValue({
        id: 'c2',
        status: 'DRAFT',
      });
      mockPrisma.campaignEditLog.create.mockResolvedValue({});

      await service.create(noDeadlineDto);

      expect(mockPrisma.campaign.create).toHaveBeenCalled();
    });
  });

  // ── PUBLISH ───────────────────────────────────────────────────────────────

  describe('publish', () => {
    it('publishes a BD_APPROVED campaign and notifies eligible creators', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'c1',
        status: 'BD_APPROVED',
        min_level: 2,
      });
      const updated = {
        id: 'c1',
        status: 'ACTIVE',
        min_level: 2,
        title: 'Test',
        category: 'FNB',
        deadline: new Date(),
      };
      mockPrisma.campaign.update.mockResolvedValue(updated);
      mockPrisma.creator.findMany.mockResolvedValue([
        { user_id: 'u1' },
        { user_id: 'u2' },
      ]);
      mockPrisma.notification.createMany.mockResolvedValue({ count: 2 });

      const result = await service.publish('c1');

      expect(result.notified).toBe(2);
      expect(mockPrisma.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'ACTIVE' } }),
      );
    });

    it('throws NotFoundException for non-existent campaign', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);
      await expect(service.publish('nope')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if not BD_APPROVED', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'c1',
        status: 'DRAFT',
      });
      await expect(service.publish('c1')).rejects.toThrow(BadRequestException);
    });
  });

  // ── FIND FOR CREATOR ──────────────────────────────────────────────────────

  describe('findForCreator', () => {
    it('returns campaigns with eligibility info', async () => {
      mockPrisma.creator.findUnique.mockResolvedValue({
        user_id: 'u1',
        creator_level: 2,
      });
      mockPrisma.campaign.findMany.mockResolvedValue([
        {
          id: 'c1',
          min_level: 1,
          slot: 5,
          _count: { participants: 2, submissions: 0 },
        },
        {
          id: 'c2',
          min_level: 3,
          slot: 5,
          _count: { participants: 0, submissions: 0 },
        },
      ]);
      mockPrisma.campaignParticipant.findMany.mockResolvedValue([
        { campaign_id: 'c1' },
      ]);

      const result = await service.findForCreator('u1');

      expect(result[0].eligible).toBe(true);
      expect(result[0].alreadyJoined).toBe(true);
      expect(result[1].eligible).toBe(false);
      expect(result[1].locked).toBe(true);
    });

    it('throws NotFoundException when creator not found', async () => {
      mockPrisma.creator.findUnique.mockResolvedValue(null);
      await expect(service.findForCreator('ghost')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── JOIN CAMPAIGN ─────────────────────────────────────────────────────────

  describe('joinCampaign', () => {
    const mockCampaign = {
      id: 'c1',
      title: 'Test',
      status: 'ACTIVE',
      min_level: 1,
      slot: 10,
      _count: { participants: 3 },
    };

    it('allows eligible creator to join', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrisma.creator.findUnique.mockResolvedValue({
        user_id: 'u1',
        creator_level: 2,
        cm_id: 'cm-1',
        user: { name: 'Alice' },
      });
      mockPrisma.campaignParticipant.findUnique.mockResolvedValue(null);
      mockPrisma.campaignParticipant.create.mockResolvedValue({
        campaign_id: 'c1',
        creator_id: 'u1',
        status: 'JOINED',
      });
      mockPrisma.creator.update.mockResolvedValue({});
      mockPrisma.notification.create.mockResolvedValue({});

      const result = await service.joinCampaign('u1', {
        campaign_id: 'c1',
      });

      expect(result.participant.status).toBe('JOINED');
      expect(result.slotRemaining).toBe(6);
    });

    it('rejects when slots are full', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue({
        ...mockCampaign,
        slot: 3,
        _count: { participants: 3 },
      });

      await expect(
        service.joinCampaign('u1', { campaign_id: 'c1' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when level is too low', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrisma.creator.findUnique.mockResolvedValue({
        user_id: 'u1',
        creator_level: 0,
        user: { name: 'Bob' },
      });

      await expect(
        service.joinCampaign('u1', { campaign_id: 'c1' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects duplicate join', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrisma.creator.findUnique.mockResolvedValue({
        user_id: 'u1',
        creator_level: 2,
        user: { name: 'Alice' },
      });
      mockPrisma.campaignParticipant.findUnique.mockResolvedValue({
        campaign_id: 'c1',
        creator_id: 'u1',
      });

      await expect(
        service.joinCampaign('u1', { campaign_id: 'c1' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── FIND ALL ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns campaigns with filters', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([{ id: 'c1' }]);

      const result = await service.findAll({
        status: 'ACTIVE',
        category: 'HOTEL',
      });

      expect(result).toHaveLength(1);
    });

    it('filters by brand_id for BRAND role', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([]);

      await service.findAll({}, { role: 'BRAND', userId: 'b1', id: 'b1' });

      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ brand_id: 'b1' }),
        }),
      );
    });
  });

  // ── FIND ONE ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns campaign detail', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'c1',
        title: 'T',
      });
      const result = await service.findOne('c1');
      expect(result?.id).toBe('c1');
    });
  });

  // ── GET CATEGORIES ────────────────────────────────────────────────────────

  describe('getCategories', () => {
    it('returns fixed category array', () => {
      const result = service.getCategories();
      expect(result).toEqual(['HOTEL', 'FNB', 'TTD', 'LIVE', 'BEAUTY', 'TECH']);
    });
  });
});
