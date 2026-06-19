import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { BCRYPT_ROUNDS } from '../../common/constants';

import { UserActivityService } from '../user-activity/user-activity.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private userActivityService: UserActivityService,
  ) {}

  // ──────────────────────────────────────────────
  // REGISTER — Creator Onboarding Flow
  // Register → Save User → Auto Level 0 → Auto Assign CM → Dashboard Active
  // ──────────────────────────────────────────────
  async register(dto: RegisterDto) {
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          password: hashedPassword,
          role: 'CREATOR',
        },
      });

      // Auto-create Creator profile + progress
      await tx.creator.create({
        data: {
          user_id: createdUser.id,
          creator_level: 1, // Default level 1 (Bronze)
          creator_code: null, // Creator ID (opsional, akan diisi CM)
          sheet_registered: false, // Belum terdaftar di Sheet
          gmv_total: 0,
          gmv_monthly: 0,
          total_orders: 0,
          total_campaigns: 0,
          total_posts: 0,
          streak_days: 0,
          cm_id: dto.cm_id || null, // CM assignment from self-registration dropdown
          onboarding_status: 'PENDING',
        },
      });

      await tx.creatorProgress.create({
        data: {
          creator_id: createdUser.id,
          current_level: 1,
          target_level: 2,
          progress_percentage: 0,
          gmv_progress: 0,
          campaign_progress: 0,
          order_progress: 0,
        },
      });

      return createdUser;
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.role);

    // Record login for activity tracking
    await this.userActivityService.recordLogin(user.id);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        onboarding_status: 'PENDING',
      },
      ...tokens,
      // Creator baru selalu PENDING → langsung ke halaman onboarding
      redirectUrl: '/creator/onboarding',
    };
  }

  // ──────────────────────────────────────────────
  // LOGIN FLOW
  // Validate Credential → Generate JWT + Refresh → Role Detection → Redirect
  // ──────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.role);

    let onboardingStatus = 'ACTIVE';
    if (user.role === 'CREATOR') {
      const creator = await this.prisma.creator.findUnique({
        where: { user_id: user.id },
        select: { onboarding_status: true },
      });
      onboardingStatus = creator?.onboarding_status || 'ACTIVE';
    }

    // Record login for activity tracking
    await this.userActivityService.recordLogin(user.id);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        onboarding_status: onboardingStatus,
      },
      ...tokens,
      redirectUrl: this.getRedirectUrl(user.role),
    };
  }

  // ──────────────────────────────────────────────
  // REFRESH TOKEN — validates DB entry, rotates token
  // ──────────────────────────────────────────────
  async refreshToken(oldRefreshToken: string) {
    try {
      const payload = this.jwtService.verify(oldRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const tokenHash = crypto
        .createHash('sha256')
        .update(oldRefreshToken)
        .digest('hex');

      const stored = await this.prisma.refreshToken.findUnique({
        where: { token_hash: tokenHash },
      });

      if (!stored || stored.revoked || stored.expires_at < new Date()) {
        throw new UnauthorizedException('Refresh token invalid or revoked');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user) throw new UnauthorizedException('User not found');

      // Revoke old token (rotation)
      await this.prisma.refreshToken.update({
        where: { token_hash: tokenHash },
        data: { revoked: true },
      });

      return await this.generateTokens(user.id, user.role);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ──────────────────────────────────────────────
  // REVOKE REFRESH TOKEN — called on logout
  // ──────────────────────────────────────────────
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    try {
      const tokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      const stored = await this.prisma.refreshToken.findUnique({
        where: { token_hash: tokenHash },
        select: { user_id: true },
      });

      if (stored) {
        await this.userActivityService.recordLogout(stored.user_id);
      }

      await this.prisma.refreshToken.updateMany({
        where: { token_hash: tokenHash, revoked: false },
        data: { revoked: true },
      });
    } catch {
      // Logout must always succeed regardless of token state
    }
  }

  // ──────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────
  private async generateTokens(userId: string, role: string) {
    const payload = { sub: userId, role };
    const jti = crypto.randomUUID(); // ensures unique hash even within same second

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync({ ...payload, jti }, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d',
      }),
    ]);

    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: { token_hash: tokenHash, user_id: userId, expires_at: expiresAt },
    });

    return { accessToken, refreshToken };
  }

  private getRedirectUrl(role: string): string {
    const routes: Record<string, string> = {
      CREATOR: '/creator/overview',
      CM: '/cm',
      BRAND: '/brand',
      BD: '/bd',
      QC: '/qc',
      ADMIN: '/admin',
      EXECUTIVE: '/executive',
    };
    return routes[role] || '/';
  }

  // ──────────────────────────────────────────────
  // PUBLIC CM LIST — For Creator self-registration dropdown
  // ──────────────────────────────────────────────
  async getCMListPublic() {
    return this.prisma.user.findMany({
      where: { role: 'CM' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }
}
