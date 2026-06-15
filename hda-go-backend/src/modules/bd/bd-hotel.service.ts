import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';

// ══════════════════════════════════════════════════════════════
// BD HOTEL SERVICE
//
// Extracted from bd.service.ts — handles all hotel partner
// operations: Excel upload, CRUD, hotel visits scheduling.
// ══════════════════════════════════════════════════════════════

export interface HotelCreateDto {
  name: string;
  location: string;
  city?: string;
  category?: string;
  facilities?: string[] | string;
  contact?: string;
  province?: string;
  quota?: number;
  pic_name?: string;
  pic_phone?: string;
}

export interface HotelVisitCreateDto {
  campaign_id: string;
  creator_id: string;
  hotel_id: string;
  visit_type: string;
  visit_date: string;
  visit_time?: string;
  visit_location?: string;
  notes?: string;
}

@Injectable()
export class BdHotelService {
  constructor(private prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // HOTEL EXCEL UPLOAD
  // ──────────────────────────────────────────────
  async uploadHotelExcel(file: Express.Multer.File) {
    const filePath = file.path;

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content
        .split('\n')
        .filter((line: string) => line.trim().length > 0);

      if (lines.length < 2) {
        throw new BadRequestException(
          'File harus memiliki header dan minimal 1 baris data',
        );
      }

      const header = lines[0];
      const separator = header.includes('\t') ? '\t' : ',';
      const headers = header.split(separator).map((h: string) =>
        h
          .trim()
          .toLowerCase()
          .replace(/[^a-z_]/g, ''),
      );

      const results: Array<Record<string, unknown>> = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(separator).map((c: string) => c.trim());
        const nameIdx =
          headers.indexOf('name') !== -1
            ? headers.indexOf('name')
            : headers.indexOf('nama') !== -1
              ? headers.indexOf('nama')
              : 0;
        const locationIdx =
          headers.indexOf('location') !== -1
            ? headers.indexOf('location')
            : headers.indexOf('lokasi') !== -1
              ? headers.indexOf('lokasi')
              : 1;
        const cityIdx =
          headers.indexOf('city') !== -1
            ? headers.indexOf('city')
            : headers.indexOf('kota') !== -1
              ? headers.indexOf('kota')
              : 2;
        const categoryIdx =
          headers.indexOf('category') !== -1
            ? headers.indexOf('category')
            : headers.indexOf('kategori') !== -1
              ? headers.indexOf('kategori')
              : 3;
        const facilitiesIdx =
          headers.indexOf('facilities') !== -1
            ? headers.indexOf('facilities')
            : headers.indexOf('fasilitas') !== -1
              ? headers.indexOf('fasilitas')
              : 4;
        const contactIdx =
          headers.indexOf('contact') !== -1
            ? headers.indexOf('contact')
            : headers.indexOf('kontak') !== -1
              ? headers.indexOf('kontak')
              : 5;

        const provinceIdx =
          headers.indexOf('province') !== -1
            ? headers.indexOf('province')
            : headers.indexOf('provinsi') !== -1
              ? headers.indexOf('provinsi')
              : -1;
        const quotaIdx =
          headers.indexOf('quota') !== -1
            ? headers.indexOf('quota')
            : headers.indexOf('kuota') !== -1
              ? headers.indexOf('kuota')
              : -1;
        const picNameIdx =
          headers.indexOf('pic_name') !== -1
            ? headers.indexOf('pic_name')
            : headers.indexOf('nama_pic') !== -1
              ? headers.indexOf('nama_pic')
              : headers.indexOf('pic') !== -1
                ? headers.indexOf('pic')
                : -1;
        const picPhoneIdx =
          headers.indexOf('pic_phone') !== -1
            ? headers.indexOf('pic_phone')
            : headers.indexOf('no_wa') !== -1
              ? headers.indexOf('no_wa')
              : headers.indexOf('whatsapp') !== -1
                ? headers.indexOf('whatsapp')
                : -1;

        if (!cols[nameIdx] || !cols[locationIdx]) continue;

        const hotel = await this.prisma.hotelPartner.create({
          data: {
            name: cols[nameIdx] || '',
            location: cols[locationIdx] || '',
            city: cols[cityIdx] || null,
            category: cols[categoryIdx] || 'HOTEL',
            facilities: cols[facilitiesIdx] || null,
            contact: cols[contactIdx] || null,
            province:
              provinceIdx !== -1 && cols[provinceIdx]
                ? cols[provinceIdx]
                : null,
            quota:
              quotaIdx !== -1 && cols[quotaIdx] ? Number(cols[quotaIdx]) : 1,
            pic_name:
              picNameIdx !== -1 && cols[picNameIdx] ? cols[picNameIdx] : null,
            pic_phone:
              picPhoneIdx !== -1 && cols[picPhoneIdx]
                ? cols[picPhoneIdx]
                : null,
          },
        });
        results.push(hotel);
      }

      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      return { success: true, imported: results.length, hotels: results };
    } catch (err) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      throw err;
    }
  }

  // ──────────────────────────────────────────────
  // HOTEL CRUD
  // ──────────────────────────────────────────────
  async getHotels() {
    const hotels = await this.prisma.hotelPartner.findMany({
      where: { is_active: true },
      orderBy: { created_at: 'desc' },
    });
    return { total: hotels.length, hotels };
  }

  async createHotel(dto: HotelCreateDto) {
    const hotel = await this.prisma.hotelPartner.create({
      data: {
        name: dto.name,
        location: dto.location,
        city: dto.city || null,
        category: dto.category || 'HOTEL',
        facilities: dto.facilities ? JSON.stringify(dto.facilities) : null,
        contact: dto.contact || null,
        province: dto.province || null,
        quota: dto.quota !== undefined ? Number(dto.quota) : 1,
        pic_name: dto.pic_name || null,
        pic_phone: dto.pic_phone || null,
      },
    });
    return { success: true, hotel };
  }

  // ──────────────────────────────────────────────
  // HOTEL VISIT WORKFLOW
  // ──────────────────────────────────────────────
  async createHotelVisit(dto: HotelVisitCreateDto) {
    const visit = await this.prisma.hotelVisit.create({
      data: {
        campaign_id: dto.campaign_id,
        creator_id: dto.creator_id,
        hotel_id: dto.hotel_id,
        visit_type: dto.visit_type,
        visit_date: new Date(dto.visit_date),
        visit_time: dto.visit_time || '10:00',
        visit_location: dto.visit_location || null,
        status: 'PENDING',
        notes: dto.notes || null,
      },
    });
    return { success: true, visit };
  }

  async updateHotelVisitStatus(
    visitId: string,
    status: string,
    notes?: string,
  ) {
    const visit = await this.prisma.hotelVisit.findUnique({
      where: { id: visitId },
    });
    if (!visit) throw new NotFoundException('Hotel visit not found');

    const updated = await this.prisma.hotelVisit.update({
      where: { id: visitId },
      data: { status, notes: notes || visit.notes },
    });
    return { success: true, visit: updated };
  }

  async getHotelVisits(campaignId?: string) {
    const where: Record<string, unknown> = {};
    if (campaignId) where.campaign_id = campaignId;

    const visits = await this.prisma.hotelVisit.findMany({
      where,
      include: {
        hotel: true,
        creator: { include: { user: { select: { name: true } } } },
        campaign: { select: { title: true, category: true } },
      },
      orderBy: { visit_date: 'desc' },
    });

    return { total: visits.length, visits };
  }
}
