import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TokenBlacklistService {
  private readonly revoked = new Map<string, Date>(); // jti → expiry

  revoke(jti: string, expiresAt: Date): void {
    this.revoked.set(jti, expiresAt);
  }

  isRevoked(jti: string): boolean {
    const expiry = this.revoked.get(jti);
    if (!expiry) return false;
    if (new Date() > expiry) {
      this.revoked.delete(jti);
      return false;
    }
    return true;
  }

  // Purge expired entries every 15 minutes to prevent memory growth
  @Cron(CronExpression.EVERY_15_MINUTES)
  cleanup(): void {
    const now = new Date();
    for (const [jti, expiry] of this.revoked.entries()) {
      if (now > expiry) this.revoked.delete(jti);
    }
  }
}
