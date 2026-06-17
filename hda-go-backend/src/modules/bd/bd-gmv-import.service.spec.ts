import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BdGmvImportService } from './bd-gmv-import.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../notifications/events.gateway';
import { LevelsService } from '../levels/levels.service';

// Mock Prisma module to prevent native better-sqlite3 loading
jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({})),
}));

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  unlinkSync: jest.fn(),
  readFileSync: jest.fn(),
}));

// Mock xlsx
jest.mock('xlsx', () => ({
  readFile: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
  },
}));

const mockPrisma = {
  campaign: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  creator: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  creatorOrder: {
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  creatorMonthlyStats: {
    upsert: jest.fn(),
  },
  creatorWeeklyStats: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  systemSetting: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn((cb: any) => {
    if (typeof cb === 'function') return cb(mockPrisma);
    return Promise.all(cb);
  }),
};

const mockEventsGateway = {
  emitLevelUp: jest.fn(),
};

const mockLevelsService = {
  evaluateLevel: jest.fn(),
};

describe('BdGmvImportService', () => {
  let service: BdGmvImportService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BdGmvImportService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventsGateway, useValue: mockEventsGateway },
        { provide: LevelsService, useValue: mockLevelsService },
      ],
    }).compile();
    service = module.get<BdGmvImportService>(BdGmvImportService);
  });

  // ══════════════════════════════════════════════════
  // parseGmv — GMV string parser (public utility)
  // ══════════════════════════════════════════════════
  describe('parseGmv', () => {
    it('parses plain number', () => {
      expect(service.parseGmv('1000000')).toBe(1000000);
    });

    it('parses number with dots as thousand separator', () => {
      expect(service.parseGmv('1.000.000')).toBe(1000000);
    });

    it('parses number with commas as thousand separator', () => {
      expect(service.parseGmv('1,000,000')).toBe(1000000);
    });

    it('parses number with dot as decimal (European format 1.000,50)', () => {
      expect(service.parseGmv('1.000,50')).toBe(1000.5);
    });

    it('parses number with comma as decimal (US format 1,000.50)', () => {
      expect(service.parseGmv('1,000.50')).toBe(1000.5);
    });

    it('strips Rp prefix and spaces', () => {
      expect(service.parseGmv('Rp 500.000')).toBe(500000);
    });

    it('strips currency symbols', () => {
      expect(service.parseGmv('Rp1,500,000')).toBe(1500000);
    });

    it('returns 0 for empty/invalid input', () => {
      expect(service.parseGmv('')).toBe(0);
      expect(service.parseGmv('abc')).toBe(0);
    });

    it('parses comma as decimal for 2-digit suffix (e.g., 500,50)', () => {
      expect(service.parseGmv('500,50')).toBe(500.5);
    });
  });

  // ══════════════════════════════════════════════════
  // uploadCreatorGmvExcel
  // ══════════════════════════════════════════════════
  describe('uploadCreatorGmvExcel', () => {
    const mockFile: Express.Multer.File = {
      path: '/tmp/gmv.xlsx',
      filename: 'gmv.xlsx',
      originalname: 'gmv.xlsx',
      size: 1024,
      mimetype:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    } as Express.Multer.File;

    it('processes Excel with valid data and updates creators', async () => {
      const fs = require('fs');
      const XLSX = require('xlsx');

      fs.existsSync.mockReturnValue(true);
      XLSX.readFile.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      });
      XLSX.utils.sheet_to_json.mockReturnValue([
        { Username: '@creator1', GMV: '1000000', Orders: '10' },
        { Username: 'creator2', GMV: '500000', Orders: '5' },
      ]);

      mockPrisma.campaign.findFirst.mockResolvedValue({
        id: 'camp-1',
        status: 'ACTIVE',
      });

      mockPrisma.creator.findFirst
        .mockResolvedValueOnce({
          user_id: 'u1',
          tiktok_username: 'creator1',
          user: { name: 'Creator 1' },
        })
        .mockResolvedValueOnce({
          user_id: 'u2',
          tiktok_username: 'creator2',
          user: { name: 'Creator 2' },
        });

      mockPrisma.creatorOrder.create.mockResolvedValue({});
      mockPrisma.creatorMonthlyStats.upsert.mockResolvedValue({});
      mockPrisma.creator.update.mockResolvedValue({});
      mockLevelsService.evaluateLevel.mockResolvedValue({ leveledUp: false });

      const result = await service.uploadCreatorGmvExcel(mockFile);

      expect(result.success).toBe(true);
      expect(result.summary.total_updated_creators).toBe(2);
      expect(result.summary.total_gmv_added).toBe(1500000);
      expect(result.summary.total_orders_added).toBe(15);
      expect(result.skipped_rows).toHaveLength(0);
    });

    it('skips rows with unknown usernames', async () => {
      const fs = require('fs');
      const XLSX = require('xlsx');

      fs.existsSync.mockReturnValue(true);
      XLSX.readFile.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      });
      XLSX.utils.sheet_to_json.mockReturnValue([
        { Username: 'unknown_user', GMV: '100000' },
      ]);

      mockPrisma.campaign.findFirst.mockResolvedValue({ id: 'camp-1' });
      mockPrisma.creator.findFirst.mockResolvedValue(null);
      mockLevelsService.evaluateLevel.mockResolvedValue({ leveledUp: false });

      const result = await service.uploadCreatorGmvExcel(mockFile);

      expect(result.summary.total_updated_creators).toBe(0);
      expect(result.skipped_rows).toHaveLength(1);
      expect(result.skipped_rows[0].reason).toContain('tidak terdaftar');
    });

    it('handles level up events during import', async () => {
      const fs = require('fs');
      const XLSX = require('xlsx');

      fs.existsSync.mockReturnValue(true);
      XLSX.readFile.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      });
      XLSX.utils.sheet_to_json.mockReturnValue([
        { Username: 'creator1', GMV: '5000000' },
      ]);

      mockPrisma.campaign.findFirst.mockResolvedValue({ id: 'camp-1' });
      mockPrisma.creator.findFirst.mockResolvedValue({
        user_id: 'u1',
        tiktok_username: 'creator1',
        user: { name: 'Creator 1' },
      });
      mockPrisma.creatorOrder.create.mockResolvedValue({});
      mockPrisma.creatorMonthlyStats.upsert.mockResolvedValue({});
      mockPrisma.creator.update.mockResolvedValue({});
      mockLevelsService.evaluateLevel.mockResolvedValue({
        leveledUp: true,
        previousLevel: 2,
        newLevel: 3,
        levelName: 'Gold',
      });

      const result = await service.uploadCreatorGmvExcel(mockFile);

      expect(result.leveled_up_creators).toHaveLength(1);
      expect(result.leveled_up_creators[0].newLevel).toBe(3);
      expect(mockEventsGateway.emitLevelUp).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ newLevel: 3 }),
      );
    });

    it('throws BadRequestException when file not found', async () => {
      const fs = require('fs');
      fs.existsSync.mockReturnValue(false);

      await expect(service.uploadCreatorGmvExcel(mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when no username/GMV columns found', async () => {
      const fs = require('fs');
      const XLSX = require('xlsx');

      fs.existsSync.mockReturnValue(true);
      XLSX.readFile.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      });
      XLSX.utils.sheet_to_json.mockReturnValue([
        { 'Random Column': 'value', 'Another Column': '123' },
      ]);

      await expect(service.uploadCreatorGmvExcel(mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when no campaign exists', async () => {
      const fs = require('fs');
      const XLSX = require('xlsx');

      fs.existsSync.mockReturnValue(true);
      XLSX.readFile.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      });
      XLSX.utils.sheet_to_json.mockReturnValue([
        { Username: 'creator1', GMV: '100' },
      ]);

      mockPrisma.campaign.findFirst
        .mockResolvedValueOnce(null) // no ACTIVE
        .mockResolvedValueOnce(null); // no any

      await expect(service.uploadCreatorGmvExcel(mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('skips rows with empty username', async () => {
      const fs = require('fs');
      const XLSX = require('xlsx');

      fs.existsSync.mockReturnValue(true);
      XLSX.readFile.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: { Sheet1: {} },
      });
      XLSX.utils.sheet_to_json.mockReturnValue([
        { Username: '', GMV: '100000' },
        { Username: '   ', GMV: '200000' },
      ]);

      mockPrisma.campaign.findFirst.mockResolvedValue({ id: 'camp-1' });

      const result = await service.uploadCreatorGmvExcel(mockFile);

      expect(result.skipped_rows).toHaveLength(2);
    });
  });

  // ══════════════════════════════════════════════════
  // syncGoogleSpreadsheet — network fetch test
  // ══════════════════════════════════════════════════
  describe('syncGoogleSpreadsheet', () => {
    it('throws BadRequestException when Google Sheets returns error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
      });

      await expect(service.syncGoogleSpreadsheet()).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when CSV content is empty', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      });

      await expect(service.syncGoogleSpreadsheet()).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when username column not found in CSV', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('RandomCol,AnotherCol\nval1,val2'),
      });

      await expect(service.syncGoogleSpreadsheet()).rejects.toThrow(
        BadRequestException,
      );
    });

    it('processes valid CSV with username and GMV columns', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: jest
          .fn()
          .mockResolvedValue(
            'Username,GMV,Orders\ncreator1,1000000,10\ncreator2,500000,5',
          ),
      });

      mockPrisma.campaign.findFirst.mockResolvedValue({ id: 'camp-1' });
      mockPrisma.creator.findMany.mockResolvedValue([
        {
          user_id: 'u1',
          tiktok_username: 'creator1',
          creator_code: null,
          user: { name: 'Creator 1' },
        },
      ]);
      mockPrisma.creatorOrder.create.mockResolvedValue({});
      mockPrisma.creatorMonthlyStats.upsert.mockResolvedValue({});
      mockPrisma.creator.update.mockResolvedValue({});
      mockLevelsService.evaluateLevel.mockResolvedValue({ leveledUp: false });

      const result = await service.syncGoogleSpreadsheet();

      expect(result.success).toBe(true);
      expect(result.summary.total_rows_processed).toBe(2);
    });
  });
});
