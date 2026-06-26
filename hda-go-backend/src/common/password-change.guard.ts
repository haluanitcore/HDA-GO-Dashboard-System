import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Request } from 'express';

// Endpoints accessible even when must_change_password is true
const ALLOWED_ROUTES = new Set([
  'POST:/api/auth/login',
  'POST:/api/auth/register',
  'POST:/api/auth/logout',
  'POST:/api/auth/refresh',
  'GET:/api/auth/me',
  'GET:/api/auth/cms',
  'PATCH:/api/settings/password',
]);

function extractUserId(req: Request): string | null {
  const token =
    req.cookies?.accessToken ??
    (req.headers?.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);

  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const raw = Buffer.from(parts[1], 'base64url').toString('utf-8');
    const payload = JSON.parse(raw) as { sub?: string };
    return payload?.sub ?? null;
  } catch {
    return null;
  }
}

@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const userId = extractUserId(req);

    if (!userId) return true;

    const key = `${req.method}:${req.path}`;
    if (ALLOWED_ROUTES.has(key)) return true;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { must_change_password: true },
    });

    if (user?.must_change_password) {
      throw new ForbiddenException({
        error: 'PASSWORD_CHANGE_REQUIRED',
        redirectUrl: '/settings?forceChangePassword=true',
      });
    }

    return true;
  }
}
