import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // ──────────────────────────────────────────────
  // REGISTER — Creator Onboarding Flow
  // Register → Save User → Auto Level 0 → Auto Assign CM → Dashboard Active
  // ──────────────────────────────────────────────
  async register(dto: RegisterDto) {
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        role: dto.role,
      },
    });

    // If role is CREATOR, auto-create Creator profile + progress
    if (dto.role === 'CREATOR') {
      await this.prisma.creator.create({
        data: {
          user_id: user.id,
          creator_level: 0,
          gmv_total: 0,
          gmv_monthly: 0,
          total_orders: 0,
          total_campaigns: 0,
          total_posts: 0,
          streak_days: 0,
          cm_id: null, // Auto-assign CM can be handled by CM module
        },
      });

      await this.prisma.creatorProgress.create({
        data: {
          creator_id: user.id,
          current_level: 0,
          target_level: 1,
          progress_percentage: 0,
          gmv_progress: 0,
          campaign_progress: 0,
          order_progress: 0,
        },
      });
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.role);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      ...tokens,
      redirectUrl: this.getRedirectUrl(user.role),
    };
  }

  // ──────────────────────────────────────────────
  // LOGIN FLOW
  // Validate Credential → Generate JWT + Refresh → Role Detection → Redirect
  // ──────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.role);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      ...tokens,
      redirectUrl: this.getRedirectUrl(user.role),
    };
  }

  // ──────────────────────────────────────────────
  // REFRESH TOKEN
  // ──────────────────────────────────────────────
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'hda-go-refresh-secret',
      });

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.generateTokens(user.id, user.role);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ──────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────
  private async generateTokens(userId: string, role: string) {
    const payload = { sub: userId, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET || 'hda-go-secret',
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'hda-go-refresh-secret',
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private getRedirectUrl(role: string): string {
    const routes: Record<string, string> = {
      CREATOR: '/creator/overview',
      CM: '/cm',
      BRAND: '/brand',
      ADMIN: '/admin',
      EXECUTIVE: '/executive',
    };
    return routes[role] || '/';
  }
}
