import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { BCRYPT_ROUNDS } from '../../common/constants';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar_url: true,
        bio: true,
        phone: true,
        gdrive_url: true,
        created_at: true,
        creator: {
          select: {
            tiktok_url: true,
            tiktok_username: true,
            niche: true,
            domicile: true,
            gender: true,
            start_date: true,
            end_date: true,
            sow_per_month: true,
            gmv_target_monthly: true,
            cm_notes: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(
    userId: string,
    data: {
      name?: string;
      bio?: string;
      phone?: string;
      avatar_url?: string;
      gdrive_url?: string;
    },
  ) {
    // Build update object — only include fields that were sent
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.bio !== undefined) updateData.bio = data.bio || null;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.avatar_url !== undefined)
      updateData.avatar_url = data.avatar_url || null;
    if (data.gdrive_url !== undefined)
      updateData.gdrive_url = data.gdrive_url || null;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar_url: true,
        bio: true,
        phone: true,
        gdrive_url: true,
      },
    });

    return updated;
  }

  async updatePassword(
    userId: string,
    data: { oldPassword?: string; newPassword?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (!data.oldPassword || !data.newPassword) {
      throw new BadRequestException('Old and new passwords are required');
    }

    const isValid = await bcrypt.compare(data.oldPassword, user.password);
    if (!isValid) {
      throw new BadRequestException('Old password is incorrect');
    }

    if (data.oldPassword === data.newPassword) {
      throw new BadRequestException(
        'New password must be different from old password',
      );
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password updated successfully' };
  }
}
