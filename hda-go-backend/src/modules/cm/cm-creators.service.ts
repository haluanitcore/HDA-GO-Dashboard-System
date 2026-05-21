import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

@Injectable()
export class CmCreatorsService {
  constructor(private prisma: PrismaService) {}

  // ── ONBOARD CREATOR (Manual Input CM) ──
  async onboardCreator(cmId: string, dto: any) {
    // Check if email exists
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new BadRequestException('Email sudah terdaftar di sistem.');
    }

    // Generate random 4-digit password (e.g. HDA-8492)
    const randomDigit = Math.floor(1000 + Math.random() * 9000);
    const tempPassword = `HDA-${randomDigit}`;
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const userId = randomUUID();

    // Create User, Creator, and Progress in transaction
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          id: userId,
          name: dto.name,
          email: dto.email,
          password: hashedPassword,
          role: 'CREATOR',
        },
      });

      const nicheJson = Array.isArray(dto.niche) ? JSON.stringify(dto.niche) : '[]';

      await tx.creator.create({
        data: {
          user_id: userId,
          cm_id: cmId,
          // Section 1
          phone_number: dto.phone_number,
          gender: dto.gender,
          birth_date: dto.birth_date ? new Date(dto.birth_date) : null,
          domicile: dto.domicile,
          // Section 2
          tiktok_username: dto.tiktok_username,
          tiktok_url: dto.tiktok_url,
          tiktok_followers: dto.tiktok_followers || 0,
          avg_views: dto.avg_views || 0,
          niche: nicheJson,
          affiliate_exp: dto.affiliate_exp,
          // Section 3
          sow_per_month: dto.sow_per_month || 0,
          gmv_target_monthly: dto.gmv_target_monthly || 0,
          start_date: dto.start_date ? new Date(dto.start_date) : new Date(),
          cm_notes: dto.cm_notes,
          
          onboarding_status: 'ACTIVE',
          onboarded_at: new Date(),
        },
      });

      await tx.creatorProgress.create({
        data: {
          creator_id: userId,
          current_level: 0,
          target_level: 1,
        },
      });

      return newUser;
    });

    return {
      success: true,
      creator_id: user.id,
      credentials: {
        username: dto.email,
        tempPassword: tempPassword,
      },
    };
  }

  // ── GET CREATORS BY CM ──
  async getMyCreators(cmId: string) {
    const creators = await this.prisma.creator.findMany({
      where: { cm_id: cmId },
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

  // ── GET CREATOR DETAIL ──
  async getCreatorDetail(creatorId: string, cmId: string) {
    const creator = await this.prisma.creator.findUnique({
      where: { user_id: creatorId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!creator) throw new NotFoundException('Creator not found');

    return creator;
  }

  // ── EDIT CREATOR BIODATA ──
  async updateCreator(creatorId: string, cmId: string, dto: any) {
    // Only CM who owns, or Admin can edit (handled via route guards or logic)
    const creator = await this.prisma.creator.findUnique({ where: { user_id: creatorId } });
    if (!creator) throw new NotFoundException('Creator not found');
    
    // Construct updates
    const updates: any = {};
    if (dto.phone_number !== undefined) updates.phone_number = dto.phone_number;
    if (dto.gender !== undefined) updates.gender = dto.gender;
    if (dto.birth_date !== undefined) updates.birth_date = new Date(dto.birth_date);
    if (dto.domicile !== undefined) updates.domicile = dto.domicile;
    if (dto.tiktok_username !== undefined) updates.tiktok_username = dto.tiktok_username;
    if (dto.tiktok_url !== undefined) updates.tiktok_url = dto.tiktok_url;
    if (dto.tiktok_followers !== undefined) updates.tiktok_followers = dto.tiktok_followers;
    if (dto.avg_views !== undefined) updates.avg_views = dto.avg_views;
    if (dto.niche !== undefined) updates.niche = Array.isArray(dto.niche) ? JSON.stringify(dto.niche) : dto.niche;
    if (dto.affiliate_exp !== undefined) updates.affiliate_exp = dto.affiliate_exp;
    if (dto.sow_per_month !== undefined) updates.sow_per_month = dto.sow_per_month;
    if (dto.gmv_target_monthly !== undefined) updates.gmv_target_monthly = dto.gmv_target_monthly;
    if (dto.cm_notes !== undefined) updates.cm_notes = dto.cm_notes;

    const updated = await this.prisma.creator.update({
      where: { user_id: creatorId },
      data: updates,
    });

    // Optionally update user name if provided
    if (dto.name) {
      await this.prisma.user.update({
        where: { id: creatorId },
        data: { name: dto.name },
      });
    }

    return { success: true, updated };
  }

  // ── TRANSFER CREATOR TO ANOTHER CM ──
  async transferCreator(creatorId: string, fromCmId: string, toCmId: string, reason: string) {
    const creator = await this.prisma.creator.findUnique({ where: { user_id: creatorId } });
    if (!creator) throw new NotFoundException('Creator not found');

    // Make sure target CM exists
    const targetCm = await this.prisma.user.findFirst({
      where: { id: toCmId, role: 'CM' }
    });
    if (!targetCm) throw new BadRequestException('Target CM not found or invalid');

    await this.prisma.$transaction(async (tx) => {
      // Log assignment
      await tx.creatorAssignmentLog.create({
        data: {
          creator_id: creatorId,
          from_cm_id: creator.cm_id,
          to_cm_id: toCmId,
          reason: reason,
          transferred_by: fromCmId,
        }
      });

      // Update creator's CM
      await tx.creator.update({
        where: { user_id: creatorId },
        data: { cm_id: toCmId }
      });
      
      // Send notification to target CM
      await tx.notification.create({
        data: {
          user_id: toCmId,
          title: '🔄 Transfer Creator',
          message: `Creator ditransfer kepada Anda. Silakan review biodatanya.`,
          type: 'SYSTEM'
        }
      });
    });

    return { success: true };
  }

  // ── GET ALL CMs FOR DROPDOWN AND ADMIN LIST ──
  async getCMList() {
    const cms = await this.prisma.user.findMany({
      where: { role: 'CM' },
      select: {
        id: true,
        name: true,
        email: true,
        created_at: true,
      }
    });

    // Get count for each CM
    const withCounts = await Promise.all(
      cms.map(async (cm) => {
        const count = await this.prisma.creator.count({ where: { cm_id: cm.id } });
        return {
          ...cm,
          creatorCount: count
        };
      })
    );

    return withCounts;
  }
}
