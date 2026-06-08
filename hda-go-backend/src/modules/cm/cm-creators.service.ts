import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

@Injectable()
export class CmCreatorsService {
  constructor(private prisma: PrismaService) {}

  // ── ONBOARD CREATOR (CM Manual Input) ──
  async onboardCreator(cmId: string, dto: any) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing)
      throw new BadRequestException('Email sudah terdaftar di sistem.');

    const randomDigit = Math.floor(1000 + Math.random() * 9000);
    const tempPassword = `HDA-${randomDigit}`;
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    const userId = randomUUID();

    await this.prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: userId,
          name: dto.name,
          email: dto.email,
          password: hashedPassword,
          role: 'CREATOR',
        },
      });
      await tx.creator.create({
        data: {
          user_id: userId,
          cm_id: cmId,
          phone_number: dto.phone_number,
          gender: dto.gender,
          birth_date: dto.birth_date ? new Date(dto.birth_date) : null,
          domicile: dto.domicile,
          tiktok_username: dto.tiktok_username,
          tiktok_url: dto.tiktok_url,
          tiktok_followers: dto.tiktok_followers || 0,
          avg_views: dto.avg_views || 0,
          niche: Array.isArray(dto.niche) ? JSON.stringify(dto.niche) : '[]',
          affiliate_exp: dto.affiliate_exp,
          sow_per_month: dto.sow_per_month || 0,
          gmv_target_monthly: dto.gmv_target_monthly || 0,
          start_date: dto.start_date ? new Date(dto.start_date) : new Date(),
          end_date: dto.end_date ? new Date(dto.end_date) : null,
          cm_notes: dto.cm_notes,
          onboarding_status: 'ACTIVE',
          onboarded_at: new Date(),
        },
      });
      await tx.creatorProgress.create({
        data: { creator_id: userId, current_level: 0, target_level: 1 },
      });
    });

    // Send welcome notification to the new Creator
    const cmUser = await this.prisma.user.findUnique({
      where: { id: cmId },
      select: { name: true },
    });

    await this.prisma.notification.create({
      data: {
        user_id: userId,
        title: '👋 Selamat Datang di HDA GO!',
        message: `Anda telah ditugaskan ke Campaign Manager: ${cmUser?.name || 'CM'}. Upload konten campaign dari menu Submissions!`,
        type: 'SYSTEM',
        read_status: false,
      },
    });

    return {
      success: true,
      creator_id: userId,
      credentials: { username: dto.email, tempPassword },
    };
  }

  // ── GET ALL CREATORS HANDLED BY THIS CM ──
  async getMyCreators(cmId: string) {
    const creators = await this.prisma.creator.findMany({
      where: { cm_id: cmId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { onboarded_at: 'desc' },
    });
    return { total: creators.length, creators };
  }

  // ── GET CREATOR DETAIL ──
  async getCreatorDetail(creatorId: string) {
    const creator = await this.prisma.creator.findUnique({
      where: { user_id: creatorId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        submissions: {
          include: {
            campaign: { select: { title: true, category: true } },
          },
          orderBy: { submitted_at: 'desc' },
        },
      },
    });
    if (!creator) throw new NotFoundException('Creator not found');
    return creator;
  }

  // ── UPDATE CREATOR BIODATA ──
  async updateCreator(creatorId: string, dto: any) {
    const creator = await this.prisma.creator.findUnique({
      where: { user_id: creatorId },
    });
    if (!creator) throw new NotFoundException('Creator not found');
    const updates: any = {};
    const fields = [
      'phone_number',
      'gender',
      'birth_date',
      'domicile',
      'tiktok_username',
      'tiktok_url',
      'tiktok_followers',
      'avg_views',
      'affiliate_exp',
      'sow_per_month',
      'gmv_target_monthly',
      'end_date',
      'cm_notes',
    ];
    for (const f of fields) {
      if (dto[f] !== undefined) updates[f] = dto[f];
    }
    if (dto.birth_date) updates.birth_date = new Date(dto.birth_date);
    if (dto.end_date) updates.end_date = new Date(dto.end_date);
    if (dto.niche)
      updates.niche = Array.isArray(dto.niche)
        ? JSON.stringify(dto.niche)
        : dto.niche;
    const updated = await this.prisma.creator.update({
      where: { user_id: creatorId },
      data: updates,
    });
    if (dto.name)
      await this.prisma.user.update({
        where: { id: creatorId },
        data: { name: dto.name },
      });
    return { success: true, updated };
  }

  // ── TRANSFER CREATOR TO ANOTHER CM ──
  async transferCreator(
    creatorId: string,
    fromCmId: string,
    toCmId: string,
    reason: string,
  ) {
    const creator = await this.prisma.creator.findUnique({
      where: { user_id: creatorId },
    });
    if (!creator) throw new NotFoundException('Creator not found');
    const targetCm = await this.prisma.user.findFirst({
      where: { id: toCmId, role: 'CM' },
    });
    if (!targetCm) throw new BadRequestException('Target CM tidak ditemukan');

    await this.prisma.$transaction(async (tx) => {
      await tx.creatorAssignmentLog.create({
        data: {
          creator_id: creatorId,
          from_cm_id: creator.cm_id,
          to_cm_id: toCmId,
          reason,
          transferred_by: fromCmId,
        },
      });
      await tx.creator.update({
        where: { user_id: creatorId },
        data: { cm_id: toCmId },
      });
      await tx.notification.create({
        data: {
          user_id: toCmId,
          title: '🔄 Creator Ditransfer',
          message: `Creator telah ditransfer kepada Anda oleh CM lain.`,
          type: 'SYSTEM',
        },
      });
    });
    return { success: true };
  }

  // ── LIST ALL CMs (for dropdown) ──
  async getCMList() {
    const cms = await this.prisma.user.findMany({
      where: { role: 'CM' },
      select: { id: true, name: true, email: true, created_at: true },
    });
    return Promise.all(
      cms.map(async (cm) => ({
        ...cm,
        creatorCount: await this.prisma.creator.count({
          where: { cm_id: cm.id },
        }),
      })),
    );
  }
}
