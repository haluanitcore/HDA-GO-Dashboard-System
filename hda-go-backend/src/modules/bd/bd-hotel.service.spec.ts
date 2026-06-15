import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BdHotelService } from './bd-hotel.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';

// Mock Prisma module to prevent native better-sqlite3 loading
jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({})),
}));

// Mock fs module
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  unlinkSync: jest.fn(),
}));

const mockPrisma = {
  hotelPartner: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  hotelVisit: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('BdHotelService', () => {
  let service: BdHotelService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BdHotelService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<BdHotelService>(BdHotelService);
  });

  // ══════════════════════════════════════════════════
  // uploadHotelExcel
  // ══════════════════════════════════════════════════
  describe('uploadHotelExcel', () => {
    const mockFile: Express.Multer.File = {
      path: '/tmp/hotels.csv',
      filename: 'hotels.csv',
      originalname: 'hotels.csv',
      size: 512,
      mimetype: 'text/csv',
    } as Express.Multer.File;

    it('imports hotels from CSV file with comma separator', async () => {
      const csvContent =
        'name,location,city,category,facilities,contact\nHotel Bali,Kuta,Badung,RESORT,Pool,+62812\nHotel Jakarta,Sudirman,Jakarta,HOTEL,Gym,+62813';
      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      mockPrisma.hotelPartner.create
        .mockResolvedValueOnce({ id: 'h1', name: 'Hotel Bali' })
        .mockResolvedValueOnce({ id: 'h2', name: 'Hotel Jakarta' });

      const result = await service.uploadHotelExcel(mockFile);

      expect(result.success).toBe(true);
      expect(result.imported).toBe(2);
      expect(result.hotels).toHaveLength(2);
      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('imports hotels from TSV file with tab separator', async () => {
      const tsvContent = 'name\tlocation\tcity\nHotel A\tBali\tDenpasar';
      (fs.readFileSync as jest.Mock).mockReturnValue(tsvContent);

      mockPrisma.hotelPartner.create.mockResolvedValue({ id: 'h1' });

      const result = await service.uploadHotelExcel(mockFile);

      expect(result.imported).toBe(1);
    });

    it('handles Indonesian column names (nama, lokasi, kota)', async () => {
      const csvContent =
        'nama,lokasi,kota,kategori,fasilitas,kontak,provinsi,kuota,nama_pic,no_wa\nHotel X,Jl. Raya,Bali,HOTEL,Pool,+62811,Bali,5,John,+62899';
      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);

      mockPrisma.hotelPartner.create.mockResolvedValue({ id: 'h1' });

      const result = await service.uploadHotelExcel(mockFile);

      expect(result.imported).toBe(1);
      expect(mockPrisma.hotelPartner.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            province: 'Bali',
            quota: 5,
            pic_name: 'John',
            pic_phone: '+62899',
          }),
        }),
      );
    });

    it('skips rows with missing name or location', async () => {
      const csvContent = 'name,location\n,Kuta\nHotel B,';
      (fs.readFileSync as jest.Mock).mockReturnValue(csvContent);

      const result = await service.uploadHotelExcel(mockFile);

      expect(result.imported).toBe(0);
    });

    it('throws BadRequestException when file has only header', async () => {
      (fs.readFileSync as jest.Mock).mockReturnValue('name,location');

      await expect(service.uploadHotelExcel(mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('cleans up temp file even on error', async () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Read error');
      });

      await expect(service.uploadHotelExcel(mockFile)).rejects.toThrow();
      expect(fs.unlinkSync).toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════
  // getHotels
  // ══════════════════════════════════════════════════
  describe('getHotels', () => {
    it('returns all active hotels with count', async () => {
      const hotels = [
        { id: 'h1', name: 'Hotel A', is_active: true },
        { id: 'h2', name: 'Hotel B', is_active: true },
      ];
      mockPrisma.hotelPartner.findMany.mockResolvedValue(hotels);

      const result = await service.getHotels();

      expect(result.total).toBe(2);
      expect(result.hotels).toEqual(hotels);
      expect(mockPrisma.hotelPartner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { is_active: true } }),
      );
    });
  });

  // ══════════════════════════════════════════════════
  // createHotel
  // ══════════════════════════════════════════════════
  describe('createHotel', () => {
    it('creates hotel with all fields', async () => {
      const mockHotel = { id: 'h1', name: 'New Hotel' };
      mockPrisma.hotelPartner.create.mockResolvedValue(mockHotel);

      const result = await service.createHotel({
        name: 'New Hotel',
        location: 'Jakarta',
        city: 'Jakarta Selatan',
        category: 'RESORT',
        contact: '+62812345',
        province: 'DKI Jakarta',
        quota: 5,
        pic_name: 'John',
        pic_phone: '+62899',
      });

      expect(result.success).toBe(true);
      expect(result.hotel).toEqual(mockHotel);
    });

    it('creates hotel with minimal fields and defaults', async () => {
      mockPrisma.hotelPartner.create.mockResolvedValue({ id: 'h2' });

      const result = await service.createHotel({
        name: 'Basic Hotel',
        location: 'Bali',
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.hotelPartner.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            category: 'HOTEL',
            quota: 1,
          }),
        }),
      );
    });
  });

  // ══════════════════════════════════════════════════
  // createHotelVisit
  // ══════════════════════════════════════════════════
  describe('createHotelVisit', () => {
    it('creates a hotel visit with PENDING status', async () => {
      const mockVisit = { id: 'v1', status: 'PENDING' };
      mockPrisma.hotelVisit.create.mockResolvedValue(mockVisit);

      const result = await service.createHotelVisit({
        campaign_id: 'c1',
        creator_id: 'cr1',
        hotel_id: 'h1',
        visit_type: 'REVIEW',
        visit_date: '2026-07-01',
        visit_time: '14:00',
        notes: 'First visit',
      });

      expect(result.success).toBe(true);
      expect(result.visit.status).toBe('PENDING');
    });

    it('uses default visit_time when not provided', async () => {
      mockPrisma.hotelVisit.create.mockResolvedValue({ id: 'v2' });

      await service.createHotelVisit({
        campaign_id: 'c1',
        creator_id: 'cr1',
        hotel_id: 'h1',
        visit_type: 'REVIEW',
        visit_date: '2026-07-01',
      });

      expect(mockPrisma.hotelVisit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ visit_time: '10:00' }),
        }),
      );
    });
  });

  // ══════════════════════════════════════════════════
  // updateHotelVisitStatus
  // ══════════════════════════════════════════════════
  describe('updateHotelVisitStatus', () => {
    it('updates visit status', async () => {
      mockPrisma.hotelVisit.findUnique.mockResolvedValue({
        id: 'v1',
        status: 'PENDING',
        notes: 'original',
      });
      mockPrisma.hotelVisit.update.mockResolvedValue({
        id: 'v1',
        status: 'COMPLETED',
      });

      const result = await service.updateHotelVisitStatus(
        'v1',
        'COMPLETED',
        'Done',
      );

      expect(result.success).toBe(true);
      expect(result.visit.status).toBe('COMPLETED');
    });

    it('throws NotFoundException when visit not found', async () => {
      mockPrisma.hotelVisit.findUnique.mockResolvedValue(null);

      await expect(
        service.updateHotelVisitStatus('nonexistent', 'COMPLETED'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ══════════════════════════════════════════════════
  // getHotelVisits
  // ══════════════════════════════════════════════════
  describe('getHotelVisits', () => {
    it('returns all visits when no campaignId filter', async () => {
      mockPrisma.hotelVisit.findMany.mockResolvedValue([
        { id: 'v1' },
        { id: 'v2' },
      ]);

      const result = await service.getHotelVisits();

      expect(result.total).toBe(2);
    });

    it('filters visits by campaignId when provided', async () => {
      mockPrisma.hotelVisit.findMany.mockResolvedValue([{ id: 'v1' }]);

      await service.getHotelVisits('campaign-1');

      expect(mockPrisma.hotelVisit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ campaign_id: 'campaign-1' }),
        }),
      );
    });
  });
});
