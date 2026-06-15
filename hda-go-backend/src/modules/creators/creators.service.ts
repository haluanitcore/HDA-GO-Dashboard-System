import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { google } from 'googleapis';

@Injectable()
export class CreatorsService {
  constructor(private prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // GET CREATOR PROFILE + STATS
  // ──────────────────────────────────────────────
  async getProfile(userId: string) {
    return this.prisma.creator.findUnique({
      where: { user_id: userId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        progress: true,
      },
    });
  }

  // ──────────────────────────────────────────────
  // GET MY CM — Get assigned Campaign Manager info
  // ──────────────────────────────────────────────
  async getMyCM(userId: string) {
    const creator = await this.prisma.creator.findUnique({
      where: { user_id: userId },
      select: {
        cm_id: true,
        cm_user: {
          select: {
            id: true,
            name: true,
            email: true,
            gdrive_url: true,
            gdrive_folder_id: true,
          },
        },
      },
    });

    if (!creator?.cm_user) {
      return { cm_id: null, cm_name: null, cm_email: null, gdrive_url: null };
    }

    return {
      cm_id: creator.cm_user.id,
      cm_name: creator.cm_user.name,
      cm_email: creator.cm_user.email,
      gdrive_url: creator.cm_user.gdrive_url,
    };
  }

  // ──────────────────────────────────────────────
  // CREATOR DASHBOARD AGGREGATION
  // Frontend Request Dashboard API → Backend Aggregate → Return all data
  // ──────────────────────────────────────────────
  async getDashboardData(userId: string) {
    const [creator, campaigns, submissions, orders, progress] =
      await Promise.all([
        // Creator Profile + Stats
        this.prisma.creator.findUnique({
          where: { user_id: userId },
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        }),

        // Campaign Joined
        this.prisma.campaignParticipant.findMany({
          where: { creator_id: userId },
          include: {
            campaign: true,
          },
          orderBy: { joined_at: 'desc' },
          take: 10,
        }),

        // Pending Submissions + SOW Progress
        this.prisma.submission.findMany({
          where: { creator_id: userId },
          include: {
            campaign: { select: { title: true, category: true } },
            deliverable: true,
          },
          orderBy: { submitted_at: 'desc' },
          take: 10,
        }),

        // GMV & Orders
        this.prisma.creatorOrder.findMany({
          where: { creator_id: userId },
          include: {
            campaign: { select: { title: true } },
          },
        }),

        // Level Progress
        this.prisma.creatorProgress.findUnique({
          where: { creator_id: userId },
        }),
      ]);

    // Calculate aggregated GMV
    const totalGMV = orders.reduce((sum, o) => sum + o.gmv_amount, 0);
    const totalOrders = orders.reduce((sum, o) => sum + o.order_count, 0);

    return {
      profile: creator,
      gmv: {
        total: totalGMV,
        monthly: creator?.gmv_monthly || 0,
        totalOrders,
      },
      campaigns: {
        joined: campaigns.length,
        list: campaigns,
      },
      submissions: {
        pending: submissions.filter((s) =>
          ['DRAFT', 'QC_REVIEW', 'REVISION'].includes(s.status),
        ).length,
        approved: submissions.filter((s) => s.status === 'APPROVED').length,
        list: submissions,
      },
      sowProgress: submissions.map((s) => ({
        campaign: s.campaign.title,
        total: s.deliverable?.total_sow || 0,
        completed: s.deliverable?.completed_sow || 0,
        remaining: s.deliverable?.remaining_sow || 0,
      })),
      levelProgress: progress,
      streak: creator?.streak_days || 0,
    };
  }

  // ──────────────────────────────────────────────
  // UPDATE STREAK
  // ──────────────────────────────────────────────
  async updateStreak(userId: string) {
    return this.prisma.creator.update({
      where: { user_id: userId },
      data: {
        streak_days: { increment: 1 },
      },
    });
  }

  // ──────────────────────────────────────────────
  // GET ALL CREATORS (for CM/Admin)
  // ──────────────────────────────────────────────
  async findAll() {
    return this.prisma.creator.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        progress: true,
      },
      orderBy: { gmv_total: 'desc' },
    });
  }

  // ──────────────────────────────────────────────
  // GET CM LIST FOR DROPDOWN
  // ──────────────────────────────────────────────
  async getCMList() {
    return this.prisma.user.findMany({
      where: { role: 'CM' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  // ──────────────────────────────────────────────
  // COMPLETE ONBOARDING
  // ──────────────────────────────────────────────
  async completeOnboarding(
    userId: string,
    data: {
      name: string;
      phone_number: string;
      gender: string;
      birth_date: string;
      domicile: string;
      tiktok_username: string;
      tiktok_url?: string;
      tiktok_followers: number;
      avg_views: number;
      niche: string[];
      affiliate_exp: string;
      cm_id: string;
    },
  ) {
    if (!data.cm_id) {
      throw new BadRequestException('Campaign Manager (CM) wajib dipilih.');
    }

    const cleanCode = data.tiktok_username.trim().replace(/^@/, '').trim();
    if (cleanCode) {
      const existing = await this.prisma.creator.findFirst({
        where: {
          creator_code: cleanCode,
          NOT: { user_id: userId },
        },
      });
      if (existing) {
        throw new BadRequestException('Username TikTok / Creator ID ini sudah terdaftar di sistem.');
      }
    }

    // 1. Update User name
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name: data.name },
    });

    // 2. Update Creator fields & set ACTIVE
    const updatedCreator = await this.prisma.creator.update({
      where: { user_id: userId },
      data: {
        creator_code: cleanCode || null,
        phone_number: data.phone_number || null,
        gender: data.gender || null,
        birth_date: data.birth_date ? new Date(data.birth_date) : null,
        domicile: data.domicile || null,
        tiktok_username: data.tiktok_username || null,
        tiktok_url: data.tiktok_url || (cleanCode ? `https://tiktok.com/@${cleanCode}` : null),
        tiktok_followers: Number(data.tiktok_followers) || 0,
        avg_views: Number(data.avg_views) || 0,
        niche: JSON.stringify(data.niche),
        affiliate_exp: data.affiliate_exp || null,
        cm_id: data.cm_id,
        onboarding_status: 'ACTIVE',
        onboarded_at: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // 3. Trigger Google Sheet Sync
    const cmUser = await this.prisma.user.findUnique({
      where: { id: data.cm_id },
    });
    const cmName = cmUser ? cmUser.name : '';

    const sheetSynced = await this.appendCreatorToGoogleSheets(
      {
        creator_code: cleanCode,
        tiktok_username: data.tiktok_username,
        tiktok_url: data.tiktok_url || `https://tiktok.com/@${cleanCode}`,
        tiktok_followers: Number(data.tiktok_followers) || 0,
        niche: JSON.stringify(data.niche),
        user: { name: data.name },
      },
      cmName,
    );

    if (sheetSynced) {
      await this.prisma.creator.update({
        where: { user_id: userId },
        data: { sheet_registered: true },
      });
    }

    return {
      success: true,
      message: 'Onboarding completed successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        onboarding_status: 'ACTIVE',
      },
    };
  }

  // ──────────────────────────────────────────────
  // APPEND CREATOR TO GOOGLE SHEET
  // ──────────────────────────────────────────────
  private async appendCreatorToGoogleSheets(creator: any, cmName: string) {
    try {
      const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      if (!keyJson) {
        console.warn('GOOGLE_SERVICE_ACCOUNT_KEY not set — skipping Google Sheet sync');
        return false;
      }

      const dbUrlSetting = await this.prisma.systemSetting.findUnique({
        where: { key: 'google_sheets_url' },
      });
      if (!dbUrlSetting?.value) {
        console.warn('google_sheets_url not set in database — skipping Google Sheet sync');
        return false;
      }

      const match = dbUrlSetting.value.match(/\/d\/([a-zA-Z0-9-_]+)/);
      const spreadsheetId = match ? match[1] : null;
      if (!spreadsheetId) {
        console.warn('Invalid google_sheets_url format — skipping Google Sheet sync');
        return false;
      }

      const credentials = JSON.parse(keyJson);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth });

      const nicheList = creator.niche ? JSON.parse(creator.niche).join(', ') : '';

      const values = [
        [
          creator.creator_code || '', // Creator ID
          creator.tiktok_username ? `@${creator.tiktok_username.replace(/^@/, '')}` : '', // Creator Username
          creator.user?.name || '', // Nama
          cmName || '', // CM
          creator.tiktok_url || '', // Link Profile
          creator.tiktok_followers || 0, // Followers
          nicheList, // Category (Niche)
          'Level 1', // Sales Level (Bronze)
          0, // GMV
          0, // Orders
          'Baru', // Fenoy
          '', // Expired
        ],
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'A:L',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });

      console.log(`✅ Successfully appended creator ${creator.tiktok_username} to Google Sheet.`);
      return true;
    } catch (error) {
      console.error('❌ Failed to append creator to Google Sheet:', error);
      return false;
    }
  }
}
