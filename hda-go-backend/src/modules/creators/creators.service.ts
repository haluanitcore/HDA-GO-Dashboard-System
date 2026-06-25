import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { google } from 'googleapis';

@Injectable()
export class CreatorsService {
  private readonly logger = new Logger(CreatorsService.name);

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
  async getDashboardData(userId: string, skip: number = 0, take: number = 10) {
    const [creator, campaigns, submissions, orderStats, monthlyStats, progress] =
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
          skip,
          take,
        }),

        // Pending Submissions + SOW Progress
        this.prisma.submission.findMany({
          where: { creator_id: userId },
          include: {
            campaign: { select: { title: true, category: true } },
            deliverable: true,
          },
          orderBy: { submitted_at: 'desc' },
          skip,
          take,
        }),

        // GMV & Orders
        this.prisma.creatorOrder.aggregate({
          where: { creator_id: userId },
          _sum: { gmv_amount: true, order_count: true },
          _count: true
        }),

        // Monthly Stats (Aggregate)
        this.prisma.creatorOrder.aggregate({
          where: {
            creator_id: userId,
            recorded_at: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
          },
          _sum: { gmv_amount: true }
        }),

        // Level Progress
        this.prisma.creatorProgress.findUnique({
          where: { creator_id: userId },
        }),
      ]);

    // Calculate aggregated GMV
    const totalGMV = orderStats._sum.gmv_amount || 0;
    const totalOrders = orderStats._sum.order_count || 0;

    return {
      profile: creator,
      gmv: {
        total: totalGMV,
        monthly: monthlyStats?._sum?.gmv_amount || creator?.gmv_monthly || 0,
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
  // cmId is provided when the caller is a CM — restricts results to that CM's roster only.
  // Admin/Executive pass cmId=undefined to see all creators (CWE-639 horizontal access fix).
  async findAll(page: number = 1, limit: number = 50, cmId?: string) {
    const where = cmId ? { cm_id: cmId } : {};
    const [data, total] = await Promise.all([
      this.prisma.creator.findMany({
        where,
        take: Math.min(limit, 100),
        skip: (page - 1) * limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          progress: true,
        },
        orderBy: { gmv_total: 'desc' },
      }),
      this.prisma.creator.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
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
  // UPDATE PROFILE / ONBOARDING
  // ──────────────────────────────────────────────
  async completeOnboarding(
    userId: string,
    data: any, // data is now UpdateCreatorProfileDto from controller
  ) {
    const existingCreator = await this.prisma.creator.findUnique({
      where: { user_id: userId },
    });

    const isFirstTimeOnboarding = existingCreator?.onboarding_status !== 'ACTIVE';

    if (isFirstTimeOnboarding) {
      if (!data.cm_id) {
        throw new BadRequestException('Campaign Manager (CM) wajib dipilih saat onboarding.');
      }
      
      const cleanCode = data.tiktok_username?.trim().replace(/^@/, '').trim();
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
          niche: data.niche ? JSON.stringify(data.niche) : '[]',
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
    } else {
      // REGULAR PROFILE UPDATE (Prevent Mass Assignment via UpdateCreatorProfileDto)
      // Only fields explicitly provided in the DTO will be updated
      const updateData: any = {};
      if (data.tiktok_url !== undefined) updateData.tiktok_url = data.tiktok_url;
      if (data.niche !== undefined) updateData.niche = JSON.stringify(data.niche);
      if (data.domicile !== undefined) updateData.domicile = data.domicile;
      if (data.gender !== undefined) updateData.gender = data.gender;
      if (data.bio !== undefined) updateData.bio = data.bio;

      await this.prisma.creator.update({
        where: { user_id: userId },
        data: updateData,
      });

      return {
        success: true,
        message: 'Profile updated successfully',
      };
    }
  }

  // ──────────────────────────────────────────────
  // APPEND CREATOR TO GOOGLE SHEET
  // ──────────────────────────────────────────────
  private async appendCreatorToGoogleSheets(creator: any, cmName: string) {
    try {
      const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      if (!keyJson) {
        this.logger.warn('GOOGLE_SERVICE_ACCOUNT_KEY not set — skipping Google Sheet sync');
        return false;
      }

      const dbUrlSetting = await this.prisma.systemSetting.findUnique({
        where: { key: 'google_sheets_url' },
      });
      if (!dbUrlSetting?.value) {
        this.logger.warn('google_sheets_url not set in database — skipping Google Sheet sync');
        return false;
      }

      const match = dbUrlSetting.value.match(/\/d\/([a-zA-Z0-9-_]+)/);
      const spreadsheetId = match ? match[1] : null;
      if (!spreadsheetId) {
        this.logger.warn('Invalid google_sheets_url format — skipping Google Sheet sync');
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

      this.logger.log(`✅ Successfully appended creator ${creator.tiktok_username} to Google Sheet.`);
      return true;
    } catch (error) {
      this.logger.error('❌ Failed to append creator to Google Sheet:', error.stack);
      return false;
    }
  }
}
