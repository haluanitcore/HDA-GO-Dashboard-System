import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../notifications/events.gateway';
import { LevelsService } from '../levels/levels.service';
import * as fs from 'fs';

// ══════════════════════════════════════════════════════════════
// BD GMV IMPORT SERVICE
//
// Extracted from bd.service.ts — handles bulk GMV and orders
// import from Excel files and Google Sheets sync.
//
// Sheet Columns (Creator HDA-GO):
// A: Fenoy (Tanggal Awal Kontrak)
// B: Tanggal Expired (Akhir Kontrak)
// C: Creator ID (Primary Key bisnis)
// D: Nama (Nama Asli)
// E: Creator Username (Nama Panggung TikTok)
// F: CM (Creator Manager)
// G: Link Profile (URL TikTok)
// H: Followers
// I: Category Proper (Niche)
// J: Sales Level (1-4)
// K: GMV (Per Minggu, nama kolom berubah: "GMV Jun", "GMV Jul", dll)
// L: Order (Per Minggu)
// ══════════════════════════════════════════════════════════════

export interface LeveledUpCreator {
  id: string;
  name: string;
  username: string | null;
  oldLevel: number;
  newLevel: number;
  levelName: string;
}

export interface UpdatedCreator {
  id: string;
  name: string;
  username: string | null;
  gmvAdded: number;
  ordersAdded: number;
  fieldsChanged: string[];
}

export interface SkippedRow {
  row: number;
  username: string;
  reason: string;
}

@Injectable()
export class BdGmvImportService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
    private levelsService: LevelsService,
  ) {}

  // ══════════════════════════════════════════════════
  // BULK EXCEL CREATOR GMV & ORDERS IMPORTER
  // ══════════════════════════════════════════════════
  async uploadCreatorGmvExcel(file: Express.Multer.File) {
    const filePath = file.path;

    try {
      if (!fs.existsSync(filePath)) {
        throw new BadRequestException('Berkas Excel tidak ditemukan');
      }

      const XLSX = require('xlsx') as typeof import('xlsx');
      const workbook = XLSX.readFile(filePath);

      // Dynamic header mapping helpers
      const findKey = (row: Record<string, unknown>, patterns: string[]) => {
        const keys = Object.keys(row);
        for (const pattern of patterns) {
          const matchedKey = keys.find((k) =>
            k
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '')
              .includes(pattern),
          );
          if (matchedKey) return matchedKey;
        }
        return null;
      };

      let rows: Array<Record<string, unknown>> = [];
      let usernameKey: string | null = null;
      let gmvKey: string | null = null;
      let ordersKey: string | null = null;
      let periodKey: string | null = null;

      for (const name of workbook.SheetNames) {
        const ws = workbook.Sheets[name];
        const tempRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: '',
        });
        if (tempRows.length > 0) {
          const sampleRow = tempRows[0];
          const uKey = findKey(sampleRow, [
            'username',
            'creator',
            'kreator',
            'nama',
          ]);
          const gKey = findKey(sampleRow, [
            'gmv',
            'omset',
            'penjualan',
            'salesamount',
            'salesvalue',
          ]);

          if (uKey && gKey) {
            rows = tempRows;
            usernameKey = uKey;
            gmvKey = gKey;
            ordersKey = findKey(sampleRow, [
              'order',
              'pesanan',
              'sales',
              'ordercount',
            ]);
            periodKey = findKey(sampleRow, [
              'periode',
              'bulan',
              'month',
              'date',
              'tanggal',
            ]);
            break;
          }
        }
      }

      if (rows.length === 0) {
        // Fallback to first sheet
        const firstSheetName = workbook.SheetNames[0];
        const ws = workbook.Sheets[firstSheetName];
        rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: '',
        });

        if (rows.length === 0) {
          throw new BadRequestException(
            'Excel tidak mengandung data atau kosong',
          );
        }

        const sampleRow = rows[0];
        usernameKey = findKey(sampleRow, [
          'username',
          'creator',
          'kreator',
          'nama',
        ]);
        gmvKey = findKey(sampleRow, [
          'gmv',
          'omset',
          'penjualan',
          'salesamount',
          'salesvalue',
        ]);
        ordersKey = findKey(sampleRow, [
          'order',
          'pesanan',
          'sales',
          'ordercount',
        ]);
        periodKey = findKey(sampleRow, [
          'periode',
          'bulan',
          'month',
          'date',
          'tanggal',
        ]);
      }

      if (!usernameKey) {
        throw new BadRequestException(
          'Kolom Username TikTok tidak ditemukan di Excel. Pastikan ada kolom "Username", "Creator", atau "Nama".',
        );
      }

      if (!gmvKey) {
        throw new BadRequestException(
          'Kolom GMV tidak ditemukan di Excel. Pastikan ada kolom "GMV", "Omset", atau "Penjualan".',
        );
      }

      const campaignId = await this.getOrCreateDefaultCampaign(
        'Excel Import Campaign Tracking',
      );

      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const result = await this.processCreatorRows(
        rows,
        usernameKey,
        gmvKey,
        ordersKey,
        periodKey,
        campaignId,
        currentPeriod,
        'EXCEL_UPLOAD_BD',
        'Bulk GMV Excel upload by BD',
      );

      // Clean up uploaded temp file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return {
        success: true,
        message: `Berhasil memproses Excel GMV & Orders`,
        ...result,
      };
    } catch (err) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw err;
    }
  }

  // ══════════════════════════════════════════════════
  // DIRECT LIVE GOOGLE SHEETS SYNC (ALL 12 COLUMNS)
  // ══════════════════════════════════════════════════
  async syncGoogleSpreadsheet() {
    // Retrieve URL and GID dynamically from database
    const dbUrlSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'google_sheets_url' },
    });
    const dbGidSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'google_sheets_gid' },
    });

    const spreadsheetUrl = dbUrlSetting?.value || 'https://docs.google.com/spreadsheets/d/1Alp1XHgQtK8CnIW3fFD7p-8HXGDsA5IbYM4Da97btGc';
    const spreadsheetGid = dbGidSetting?.value || '1505444998';

    // Format clean export CSV link
    const cleanBaseUrl = spreadsheetUrl.replace(/\/edit(\?.*)?$/, '').replace(/\/$/, '');
    const url = `${cleanBaseUrl}/export?format=csv&gid=${spreadsheetGid}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new BadRequestException(
        'Gagal mengunduh data dari Google Sheets. Pastikan Spreadsheet dibagikan secara publik (Anyone with the link can view).',
      );
    }

    const csvContent = await response.text();
    if (!csvContent || csvContent.trim().length === 0) {
      throw new BadRequestException('Data dari Google Sheets kosong');
    }

    const parsedRows = this.parseCSV(csvContent);
    if (parsedRows.length < 2) {
      throw new BadRequestException(
        'Format Google Sheets tidak valid. Harus memiliki minimal 1 baris tajuk dan 1 baris data.',
      );
    }

    const headers = parsedRows[0].map((h) =>
      h.toLowerCase().replace(/[^a-z0-9]/g, ''),
    );

    // ── Column Index Detection ──
    const findIndex = (patterns: string[]) => {
      for (const pattern of patterns) {
        const idx = headers.findIndex((h) => h.includes(pattern));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    // Match GMV column with prefix (handles "GMV Jun", "GMV Jul", etc.)
    const findGmvIndex = () => {
      const idx = headers.findIndex((h) => h.startsWith('gmv'));
      if (idx !== -1) return idx;
      return findIndex(['omset', 'penjualan', 'salesamount', 'salesvalue']);
    };

    const creatorIdIdx = findIndex(['creatorid']);
    const fenoyIdx = findIndex(['fenoy']);
    const expiredIdx = findIndex(['tanggalexpired', 'expired']);
    const namaIdx = findIndex(['nama']);
    const usernameIdx = findIndex(['creatorusername', 'username', 'creator']);
    const cmIdx = findIndex(['cm']);
    const linkProfileIdx = findIndex(['linkprofile', 'linkprofil', 'profil']);
    const followersIdx = findIndex(['followers', 'follower']);
    const categoryIdx = findIndex(['categoryproper', 'category', 'niche', 'kategori']);
    const salesLevelIdx = findIndex(['saleslevel', 'level']);
    const gmvIdx = findGmvIndex();
    const ordersIdx = findIndex(['order', 'orders', 'pesanan']);

    // Determine the GMV column name for response (e.g., "GMV Jun")
    const gmvColumnName = gmvIdx !== -1 ? parsedRows[0][gmvIdx] : 'GMV';

    // At minimum we need either creatorId or username, plus GMV
    if (usernameIdx === -1 && creatorIdIdx === -1) {
      throw new BadRequestException(
        'Kolom Creator Username atau Creator ID tidak ditemukan pada Google Sheets.',
      );
    }

    const campaignId = await this.getOrCreateDefaultCampaign(
      'Google Sheet Sync Campaign Tracking',
    );

    const now = new Date();
    const weekLabel = this.getISOWeekLabel(now);
    const weekStart = this.getWeekStart(now);
    const weekEnd = this.getWeekEnd(now);

    let totalUpdated = 0;
    let totalGmvAdded = 0;
    let totalOrdersAdded = 0;
    const leveledUpCreators: LeveledUpCreator[] = [];
    const skippedRows: SkippedRow[] = [];
    const updatedCreators: UpdatedCreator[] = [];

    for (let i = 1; i < parsedRows.length; i++) {
      const cols = parsedRows[i];

      // Extract values from each column
      const creatorCode = creatorIdIdx !== -1 ? (cols[creatorIdIdx] || '').trim() : '';
      let username = usernameIdx !== -1 ? (cols[usernameIdx] || '').trim() : '';
      if (username.startsWith('@')) username = username.substring(1).trim();

      const nama = namaIdx !== -1 ? (cols[namaIdx] || '').trim() : '';
      const cmName = cmIdx !== -1 ? (cols[cmIdx] || '').trim() : '';
      const linkProfile = linkProfileIdx !== -1 ? (cols[linkProfileIdx] || '').trim() : '';
      const followersRaw = followersIdx !== -1 ? (cols[followersIdx] || '0').trim() : '0';
      const categoryRaw = categoryIdx !== -1 ? (cols[categoryIdx] || '').trim() : '';
      const salesLevelRaw = salesLevelIdx !== -1 ? (cols[salesLevelIdx] || '').trim() : '';
      const fenoyRaw = fenoyIdx !== -1 ? (cols[fenoyIdx] || '').trim() : '';
      const expiredRaw = expiredIdx !== -1 ? (cols[expiredIdx] || '').trim() : '';
      const rawGmv = gmvIdx !== -1 ? (cols[gmvIdx] || '0').trim() : '0';
      const rawOrders = ordersIdx !== -1 ? (cols[ordersIdx] || '0').trim() : '0';

      // Skip empty rows
      if (!creatorCode && !username) {
        skippedRows.push({
          row: i + 1,
          username: '',
          reason: 'Creator ID dan Username kosong',
        });
        continue;
      }

      // ── Find creator in database ──
      // Priority 1: Match by creator_code
      // Priority 2: Match by tiktok_username
      let creator: any = null;

      if (creatorCode) {
        creator = await this.prisma.creator.findFirst({
          where: { creator_code: creatorCode },
          include: { user: true },
        });
      }

      if (!creator && username) {
        creator = await this.prisma.creator.findFirst({
          where: {
            OR: [
              { tiktok_username: username },
              { tiktok_username: username.toLowerCase() },
              { tiktok_username: username.toUpperCase() },
            ],
          },
          include: { user: true },
        });
      }

      if (!creator) {
        skippedRows.push({
          row: i + 1,
          username: username || creatorCode,
          reason: `Creator "${username || creatorCode}" tidak terdaftar di sistem HDA-GO`,
        });
        continue;
      }

      // ── Track field changes ──
      const fieldsChanged: string[] = [];

      // ── Update creator_code if not set but Sheet has it ──
      if (creatorCode && !creator.creator_code) {
        await this.prisma.creator.update({
          where: { user_id: creator.user_id },
          data: { creator_code: creatorCode, sheet_registered: true },
        });
        fieldsChanged.push('creator_code');
      }

      // ── Update Nama (User.name) ──
      if (nama && nama !== creator.user.name) {
        await this.prisma.user.update({
          where: { id: creator.user_id },
          data: { name: nama },
        });
        fieldsChanged.push('nama');
      }

      // ── Update TikTok Username ──
      if (username && username !== creator.tiktok_username) {
        await this.prisma.creator.update({
          where: { user_id: creator.user_id },
          data: { tiktok_username: username },
        });
        fieldsChanged.push('tiktok_username');
      }

      // ── Update Link Profile (TikTok URL) ──
      if (linkProfile && linkProfile !== creator.tiktok_url) {
        await this.prisma.creator.update({
          where: { user_id: creator.user_id },
          data: { tiktok_url: linkProfile },
        });
        fieldsChanged.push('link_profile');
      }

      // ── Update Followers ──
      const followers = parseInt(followersRaw.replace(/[^\d]/g, ''), 10) || 0;
      if (followers > 0 && followers !== creator.tiktok_followers) {
        await this.prisma.creator.update({
          where: { user_id: creator.user_id },
          data: { tiktok_followers: followers },
        });
        fieldsChanged.push('followers');
      }

      // ── Update Category Proper (Niche) ──
      if (categoryRaw) {
        const newNiche = JSON.stringify([categoryRaw.toUpperCase()]);
        if (newNiche !== creator.niche) {
          await this.prisma.creator.update({
            where: { user_id: creator.user_id },
            data: { niche: newNiche },
          });
          fieldsChanged.push('niche');
        }
      }

      // ── Update Sales Level ──
      const salesLevel = parseInt(salesLevelRaw.replace(/[^\d]/g, ''), 10);
      if (salesLevel && salesLevel >= 1 && salesLevel <= 4 && salesLevel !== creator.creator_level) {
        await this.prisma.creator.update({
          where: { user_id: creator.user_id },
          data: { creator_level: salesLevel },
        });
        // Also update progress
        await this.prisma.creatorProgress.upsert({
          where: { creator_id: creator.user_id },
          update: { current_level: salesLevel, target_level: Math.min(salesLevel + 1, 4) },
          create: { creator_id: creator.user_id, current_level: salesLevel, target_level: Math.min(salesLevel + 1, 4) },
        });
        fieldsChanged.push('sales_level');
      }

      // ── Update Kontrak Dates ──
      if (fenoyRaw) {
        const fenoyDate = this.parseDate(fenoyRaw);
        if (fenoyDate) {
          await this.prisma.creator.update({
            where: { user_id: creator.user_id },
            data: { start_date: fenoyDate },
          });
          fieldsChanged.push('start_date');
        }
      }
      if (expiredRaw) {
        const expiredDate = this.parseDate(expiredRaw);
        if (expiredDate) {
          await this.prisma.creator.update({
            where: { user_id: creator.user_id },
            data: { end_date: expiredDate },
          });
          fieldsChanged.push('end_date');
        }
      }

      // ── Update CM Assignment ──
      if (cmName) {
        // Try matching CM by cm_code first, then by name
        let cmUser = await this.prisma.user.findFirst({
          where: { cm_code: cmName, role: 'CM' },
        });
        if (!cmUser) {
          cmUser = await this.prisma.user.findFirst({
            where: {
              name: { contains: cmName },
              role: 'CM',
            },
          });
        }
        if (cmUser && cmUser.id !== creator.cm_id) {
          await this.prisma.creator.update({
            where: { user_id: creator.user_id },
            data: { cm_id: cmUser.id },
          });
          fieldsChanged.push('cm');
        }
      }

      // ── Process GMV & Orders ──
      const parsedGmv = this.parseGmv(rawGmv);
      let parsedOrders = parseInt(rawOrders.replace(/[^\d]/g, ''), 10) || 0;
      if (parsedOrders === 0 && parsedGmv > 0) {
        parsedOrders = Math.floor(parsedGmv / 100000) || 1;
      }

      // Mark sheet_registered
      if (!creator.sheet_registered) {
        await this.prisma.creator.update({
          where: { user_id: creator.user_id },
          data: { sheet_registered: true },
        });
      }

      if (parsedGmv > 0 || parsedOrders > 0) {
        // ── Get existing weekly stats to calculate differences and prevent double counting ──
        const existingWeekly = await this.prisma.creatorWeeklyStats.findUnique({
          where: {
            creator_id_week_label: {
              creator_id: creator.user_id,
              week_label: weekLabel,
            },
          },
        });

        const oldGmv = existingWeekly ? existingWeekly.gmv : 0;
        const oldOrders = existingWeekly ? existingWeekly.orders : 0;
        const diffGmv = parsedGmv - oldGmv;
        const diffOrders = parsedOrders - oldOrders;

        // ── Weekly Stats (Upsert) ──
        await this.prisma.creatorWeeklyStats.upsert({
          where: {
            creator_id_week_label: {
              creator_id: creator.user_id,
              week_label: weekLabel,
            },
          },
          update: {
            gmv: parsedGmv,
            orders: parsedOrders,
            gmv_updated_at: now,
            source: 'SHEET_SYNC',
            notes: `Sync dari kolom "${gmvColumnName}" - Sheet row ${i + 1}`,
          },
          create: {
            creator_id: creator.user_id,
            week_label: weekLabel,
            week_start: weekStart,
            week_end: weekEnd,
            gmv: parsedGmv,
            orders: parsedOrders,
            gmv_updated_at: now,
            source: 'SHEET_SYNC',
            notes: `Sync dari kolom "${gmvColumnName}" - Sheet row ${i + 1}`,
          },
        });

        // ── Clean up existing SHEET_SYNC creator order for this week to avoid duplication ──
        await this.prisma.creatorOrder.deleteMany({
          where: {
            creator_id: creator.user_id,
            source: 'SHEET_SYNC',
            notes: {
              startsWith: `Sheet Sync (${weekLabel})`,
            },
          },
        });

        // ── Create CreatorOrder record ──
        const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        await this.prisma.creatorOrder.create({
          data: {
            creator_id: creator.user_id,
            campaign_id: campaignId,
            order_count: parsedOrders,
            gmv_amount: parsedGmv,
            source: 'SHEET_SYNC',
            status: 'VERIFIED',
            period_date: new Date(),
            notes: `Sheet Sync (${weekLabel}) for ${gmvColumnName}. Row ${i + 1}`,
          },
        });

        // ── Update Monthly Stats using Difference ──
        await this.prisma.creatorMonthlyStats.upsert({
          where: {
            creator_id_month: {
              creator_id: creator.user_id,
              month: currentPeriod,
            },
          },
          update: {
            gmv: { increment: diffGmv },
            orders: { increment: diffOrders },
          },
          create: {
            creator_id: creator.user_id,
            month: currentPeriod,
            gmv: parsedGmv,
            orders: parsedOrders,
          },
        });

        // ── Update Creator Aggregates using Difference ──
        await this.prisma.creator.update({
          where: { user_id: creator.user_id },
          data: {
            gmv_total: { increment: diffGmv },
            gmv_monthly: { increment: diffGmv },
            total_orders: { increment: diffOrders },
          },
        });

        fieldsChanged.push('gmv', 'orders');

        // ── Level Evaluation ──
        const evalResult = await this.levelsService.evaluateLevel(creator.user_id);
        if (evalResult && evalResult.leveledUp) {
          leveledUpCreators.push({
            id: creator.user_id,
            name: creator.user.name,
            username: creator.tiktok_username,
            oldLevel: evalResult.previousLevel,
            newLevel: evalResult.newLevel,
            levelName: evalResult.levelName,
          });

          this.eventsGateway.emitLevelUp(creator.user_id, {
            newLevel: evalResult.newLevel,
            levelName: evalResult.levelName,
          });
        }

        totalGmvAdded += Math.max(0, diffGmv);
        totalOrdersAdded += Math.max(0, diffOrders);
      }

      updatedCreators.push({
        id: creator.user_id,
        name: nama || creator.user.name,
        username: creator.tiktok_username,
        gmvAdded: parsedGmv,
        ordersAdded: parsedOrders,
        fieldsChanged,
      });

      totalUpdated++;
    }

    return {
      success: true,
      message: `Berhasil menyinkronkan data dengan Google Sheets!`,
      sync_info: {
        week_label: weekLabel,
        week_start: weekStart.toISOString(),
        week_end: weekEnd.toISOString(),
        gmv_column_name: gmvColumnName,
        synced_at: now.toISOString(),
      },
      summary: {
        total_rows_processed: parsedRows.length - 1,
        total_updated_creators: totalUpdated,
        total_gmv_added: totalGmvAdded,
        total_orders_added: totalOrdersAdded,
      },
      updated_creators: updatedCreators,
      leveled_up_creators: leveledUpCreators,
      skipped_rows: skippedRows,
    };
  }

  // ══════════════════════════════════════════════════
  // GET WEEKLY STATS
  // ══════════════════════════════════════════════════
  async getWeeklyStats(week?: string) {
    const where = week ? { week_label: week } : {};
    const stats = await this.prisma.creatorWeeklyStats.findMany({
      where,
      include: {
        creator: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ week_label: 'desc' }, { gmv: 'desc' }],
      take: 200,
    });

    // Get distinct week labels for filter dropdown
    const weekLabels = await this.prisma.creatorWeeklyStats.findMany({
      select: { week_label: true },
      distinct: ['week_label'],
      orderBy: { week_label: 'desc' },
      take: 12,
    });

    return {
      stats,
      available_weeks: weekLabels.map((w) => w.week_label),
    };
  }

  // ══════════════════════════════════════════════════
  // GET UNREGISTERED CREATORS (no creator_code)
  // ══════════════════════════════════════════════════
  async getUnregisteredCreators() {
    const creators = await this.prisma.creator.findMany({
      where: {
        OR: [
          { creator_code: null },
          { sheet_registered: false },
        ],
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { onboarded_at: 'desc' },
    });

    return {
      total: creators.length,
      creators,
    };
  }

  // ══════════════════════════════════════════════════
  // SEND WEEKLY SYNC REMINDER TO BD USERS
  // ══════════════════════════════════════════════════
  async sendWeeklySyncReminder() {
    const bdUsers = await this.prisma.user.findMany({
      where: { role: 'BD' },
      select: { id: true },
    });

    const weekLabel = this.getISOWeekLabel(new Date());

    for (const bd of bdUsers) {
      await this.prisma.notification.create({
        data: {
          user_id: bd.id,
          title: '📊 Reminder Sinkronisasi Mingguan',
          message: `Minggu ${weekLabel}: Silakan lakukan sinkronisasi Google Sheet untuk memperbarui data GMV & Orders kreator minggu ini.`,
          type: 'SYSTEM',
          read_status: false,
        },
      });
    }

    return { success: true, notified: bdUsers.length, week: weekLabel };
  }

  // ──────────────────────────────────────────────
  // SHARED HELPERS
  // ──────────────────────────────────────────────

  private parseCSV(content: string): string[][] {
    const result: string[][] = [];
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      const row: string[] = [];
      let inQuotes = false;
      let currentField = '';
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          row.push(currentField.trim());
          currentField = '';
        } else {
          currentField += char;
        }
      }
      row.push(currentField.trim());
      result.push(row.map((r) => r.replace(/^"|"$/g, '').trim()));
    }
    return result;
  }

  parseGmv(rawValue: string): number {
    let cleanedGmvStr = rawValue.replace(/[^\d.,]/g, '');

    if (cleanedGmvStr.includes(',') && cleanedGmvStr.includes('.')) {
      if (cleanedGmvStr.indexOf(',') > cleanedGmvStr.indexOf('.')) {
        cleanedGmvStr = cleanedGmvStr.replace(/\./g, '').replace(/,/g, '.');
      } else {
        cleanedGmvStr = cleanedGmvStr.replace(/,/g, '');
      }
    } else if (cleanedGmvStr.includes(',')) {
      const parts = cleanedGmvStr.split(',');
      if (parts[parts.length - 1].length === 3) {
        cleanedGmvStr = cleanedGmvStr.replace(/,/g, '');
      } else {
        cleanedGmvStr = cleanedGmvStr.replace(/,/g, '.');
      }
    } else if (cleanedGmvStr.includes('.')) {
      const parts = cleanedGmvStr.split('.');
      if (parts[parts.length - 1].length === 3) {
        cleanedGmvStr = cleanedGmvStr.replace(/\./g, '');
      }
    }
    return parseFloat(cleanedGmvStr) || 0;
  }

  private parseDate(raw: string): Date | null {
    if (!raw) return null;
    // Try various date formats
    // Format: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD Month YYYY
    const trimmed = raw.trim();

    // ISO format: YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const d = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
      if (!isNaN(d.getTime())) return d;
    }

    // DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmyMatch) {
      const d = new Date(parseInt(dmyMatch[3]), parseInt(dmyMatch[2]) - 1, parseInt(dmyMatch[1]));
      if (!isNaN(d.getTime())) return d;
    }

    // Try native Date parser as fallback
    const fallback = new Date(trimmed);
    if (!isNaN(fallback.getTime())) return fallback;

    return null;
  }

  private getISOWeekLabel(date: Date): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private getWeekEnd(date: Date): Date {
    const start = this.getWeekStart(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  private async getOrCreateDefaultCampaign(title: string): Promise<string> {
    let campaign = await this.prisma.campaign.findFirst({
      where: { status: 'ACTIVE' },
    });
    if (!campaign) {
      campaign = await this.prisma.campaign.findFirst();
    }
    if (!campaign) {
      campaign = await this.prisma.campaign.create({
        data: {
          title,
          category: 'HOTEL',
          sow_total: 1,
          reward_type: 'COMMISSION',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'ACTIVE',
          brand_id: 'default-brand-id',
        },
      });
    }
    return campaign.id;
  }

  // Legacy shared processor for Excel uploads (kept for backward compat)
  private async processCreatorRows(
    rows: Array<Record<string, unknown>>,
    usernameKey: string,
    gmvKey: string,
    ordersKey: string | null,
    periodKey: string | null,
    campaignId: string,
    currentPeriod: string,
    source: string,
    notesPrefix: string,
  ) {
    let totalUpdated = 0;
    let totalGmvAdded = 0;
    let totalOrdersAdded = 0;
    const leveledUpCreators: LeveledUpCreator[] = [];
    const skippedRows: SkippedRow[] = [];
    const updatedCreators: UpdatedCreator[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let username = String(row[usernameKey] || '').trim();

      if (username.startsWith('@')) {
        username = username.substring(1).trim();
      }

      if (!username) {
        skippedRows.push({
          row: i + 2,
          username: '',
          reason: 'Username kosong',
        });
        continue;
      }

      const rawGmv = String(row[gmvKey] || '0').trim();
      const parsedGmv = this.parseGmv(rawGmv);

      let parsedOrders = 0;
      if (ordersKey && row[ordersKey] !== undefined && row[ordersKey] !== '') {
        const rawOrders = String(row[ordersKey]).replace(/[^\d]/g, '');
        parsedOrders = parseInt(rawOrders, 10) || 0;
      } else {
        parsedOrders = Math.floor(parsedGmv / 100000) || 1;
      }

      let parsedPeriod = currentPeriod;
      if (periodKey && row[periodKey]) {
        const rawPeriod = String(row[periodKey]).trim();
        const match = rawPeriod.match(/(\d{4})[-/](\d{2})/);
        if (match) {
          parsedPeriod = `${match[1]}-${match[2]}`;
        }
      }

      // Try matching by creator_code first, then tiktok_username
      let creator = await this.prisma.creator.findFirst({
        where: { tiktok_username: username },
        include: { user: true },
      });

      if (!creator) {
        creator = await this.prisma.creator.findFirst({
          where: {
            OR: [
              { tiktok_username: username.toLowerCase() },
              { tiktok_username: username.toUpperCase() },
            ],
          },
          include: { user: true },
        });
      }

      if (!creator) {
        skippedRows.push({
          row: i + 2,
          username: username,
          reason: `Username TikTok "${username}" tidak terdaftar di sistem HDA-GO`,
        });
        continue;
      }

      await this.prisma.creatorOrder.create({
        data: {
          creator_id: creator.user_id,
          campaign_id: campaignId,
          order_count: parsedOrders,
          gmv_amount: parsedGmv,
          source,
          status: 'VERIFIED',
          period_date: new Date(),
          notes: `${notesPrefix} for period ${parsedPeriod}. Row ${i + 2}`,
        },
      });

      await this.prisma.creatorMonthlyStats.upsert({
        where: {
          creator_id_month: {
            creator_id: creator.user_id,
            month: parsedPeriod,
          },
        },
        update: {
          gmv: { increment: parsedGmv },
          orders: { increment: parsedOrders },
        },
        create: {
          creator_id: creator.user_id,
          month: parsedPeriod,
          gmv: parsedGmv,
          orders: parsedOrders,
        },
      });

      await this.prisma.creator.update({
        where: { user_id: creator.user_id },
        data: {
          gmv_total: { increment: parsedGmv },
          gmv_monthly: { increment: parsedGmv },
          total_orders: { increment: parsedOrders },
        },
      });

      const evalResult = await this.levelsService.evaluateLevel(
        creator.user_id,
      );
      if (evalResult && evalResult.leveledUp) {
        leveledUpCreators.push({
          id: creator.user_id,
          name: creator.user.name,
          username: creator.tiktok_username,
          oldLevel: evalResult.previousLevel,
          newLevel: evalResult.newLevel,
          levelName: evalResult.levelName,
        });

        this.eventsGateway.emitLevelUp(creator.user_id, {
          newLevel: evalResult.newLevel,
          levelName: evalResult.levelName,
        });
      }

      updatedCreators.push({
        id: creator.user_id,
        name: creator.user.name,
        username: creator.tiktok_username,
        gmvAdded: parsedGmv,
        ordersAdded: parsedOrders,
        fieldsChanged: ['gmv', 'orders'],
      });

      totalUpdated++;
      totalGmvAdded += parsedGmv;
      totalOrdersAdded += parsedOrders;
    }

    return {
      summary: {
        total_rows_processed: rows.length,
        total_updated_creators: totalUpdated,
        total_gmv_added: totalGmvAdded,
        total_orders_added: totalOrdersAdded,
      },
      updated_creators: updatedCreators,
      leveled_up_creators: leveledUpCreators,
      skipped_rows: skippedRows,
    };
  }
}
