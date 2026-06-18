// ══════════════════════════════════════════════════════════════
// ADMIN RESET SERVICE
//
// Mengelola reset data GMV & Orders untuk seluruh creator.
// Dua mode:
//   1. MANUAL  — dipanggil oleh Admin via API endpoint
//   2. AUTO    — dipanggil oleh Cron job setiap tanggal 1 pukul 00:01 WIB
//
// Yang di-reset (sesuai konfirmasi):
//   - creator.gmv_monthly     → 0
//   - creator.total_orders    → 0
//   - CreatorWeeklyStats      → DELETE all
//   - CreatorMonthlyStats     → DELETE all
//   - CreatorOrder (SHEET)    → DELETE all
//   - CreatorProgress         → gmv_progress, order_progress, progress_percentage → 0
//
// Yang TIDAK di-reset:
//   - creator.gmv_total       (kumulatif semua waktu)
//   - creator.creator_level   (level tidak berubah)
//   - creator.streak_days, posting_consistency, dll
// ══════════════════════════════════════════════════════════════

import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../notifications/events.gateway';

export type ResetScope = 'ALL' | 'GMV_ONLY' | 'ORDERS_ONLY' | 'STATS_ONLY';

@Injectable()
export class AdminResetService {
  private readonly logger = new Logger(AdminResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  // ──────────────────────────────────────────────
  // CRON: Auto Monthly Reset — setiap tanggal 1, 00:01 WIB
  // ──────────────────────────────────────────────
  @Cron('1 0 1 * *', {
    name: 'monthly-data-reset',
    timeZone: 'Asia/Jakarta',
  })
  async handleMonthlyReset() {
    const enabled = await this.getSettingBool('auto_reset_enabled', false);
    if (!enabled) {
      this.logger.log('⏭ Auto Monthly Reset dilewati (disabled di SystemSetting)');
      return;
    }
    this.logger.log('🔄 Auto Monthly Reset dimulai...');
    await this.executeReset('ALL', 'AUTO_MONTHLY', null, 'Auto reset awal bulan');
    this.logger.log('✅ Auto Monthly Reset selesai');
  }

  // ──────────────────────────────────────────────
  // MANUAL RESET — hanya dipanggil oleh Admin
  // ──────────────────────────────────────────────
  async resetManual(
    scope: ResetScope,
    adminId: string,
    adminName: string,
    notes: string,
  ) {
    this.logger.log(`🔄 Manual Reset dimulai oleh Admin: ${adminName} (scope: ${scope})`);
    const result = await this.executeReset(scope, 'MANUAL', adminId, notes, adminName);
    this.logger.log(`✅ Manual Reset selesai: ${JSON.stringify(result)}`);
    return result;
  }

  // ──────────────────────────────────────────────
  // CORE: Eksekusi reset berdasarkan scope
  // ──────────────────────────────────────────────
  private async executeReset(
    scope: ResetScope,
    triggerType: 'MANUAL' | 'AUTO_MONTHLY',
    adminId: string | null,
    notes: string,
    adminName?: string,
  ) {
    // 1. Snapshot sebelum reset (untuk audit log)
    const [gmvAgg, ordersAgg, totalCreators] = await Promise.all([
      this.prisma.creator.aggregate({ _sum: { gmv_monthly: true } }),
      this.prisma.creator.aggregate({ _sum: { total_orders: true } }),
      this.prisma.creator.count(),
    ]);
    const snapshotGmv = Number(gmvAgg._sum.gmv_monthly || 0);
    const snapshotOrders = Number(ordersAgg._sum.total_orders || 0);

    // 2. Jalankan reset sesuai scope dalam satu transaksi
    await this.prisma.$transaction(async (tx) => {
      if (scope === 'ALL' || scope === 'STATS_ONLY') {
        await tx.creatorOrder.deleteMany({ where: { source: 'SHEET_SYNC' } });
        await tx.creatorWeeklyStats.deleteMany({});
        await tx.creatorMonthlyStats.deleteMany({});
        await tx.creatorProgress.updateMany({
          data: { gmv_progress: 0, order_progress: 0, campaign_progress: 0, progress_percentage: 0 },
        });
      }
      if (scope === 'ALL' || scope === 'GMV_ONLY') {
        await tx.creator.updateMany({
          data: { gmv_monthly: 0 },
        });
      }
      if (scope === 'ALL' || scope === 'ORDERS_ONLY') {
        await tx.creator.updateMany({
          data: { total_orders: 0 },
        });
      }
      // Stats_only juga reset gmv_monthly dan total_orders
      if (scope === 'STATS_ONLY') {
        await tx.creator.updateMany({
          data: { gmv_monthly: 0, total_orders: 0 },
        });
      }
    });

    // 3. Simpan audit log
    await this.prisma.resetLog.create({
      data: {
        triggered_by: adminId || 'AUTO_MONTHLY',
        trigger_type: triggerType,
        scope,
        notes,
        snapshot_gmv: snapshotGmv,
        snapshot_orders: snapshotOrders,
        snapshot_creators: totalCreators,
      },
    });

    // 4. Emit realtime event ke admin room
    this.eventsGateway.emitResetCompleted({
      scope,
      triggerType,
      triggeredByName: adminName || 'System (Auto)',
      snapshotGmv,
      snapshotOrders,
    });

    return {
      success: true,
      scope,
      trigger_type: triggerType,
      snapshot: {
        gmv_before: snapshotGmv,
        orders_before: snapshotOrders,
        total_creators: totalCreators,
      },
    };
  }

  // ──────────────────────────────────────────────
  // CONFIG: Auto Reset ON/OFF
  // ──────────────────────────────────────────────
  async getResetConfig() {
    const enabled = await this.getSettingBool('auto_reset_enabled', false);
    const cron = await this.getSettingStr('auto_reset_cron', '1 0 1 * *');
    const nextReset = this.getNextResetDate();
    return { enabled, cron, next_reset: nextReset };
  }

  async setResetConfig(enabled: boolean) {
    await this.upsertSetting('auto_reset_enabled', String(enabled));
    return { success: true, enabled };
  }

  // ──────────────────────────────────────────────
  // HISTORY: Riwayat reset
  // ──────────────────────────────────────────────
  async getResetHistory(limit = 20) {
    const logs = await this.prisma.resetLog.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
    });
    return logs;
  }

  // ──────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────
  private async getSettingBool(key: string, defaultVal: boolean): Promise<boolean> {
    const s = await this.prisma.systemSetting.findUnique({ where: { key } });
    if (!s) return defaultVal;
    return s.value === 'true';
  }

  private async getSettingStr(key: string, defaultVal: string): Promise<string> {
    const s = await this.prisma.systemSetting.findUnique({ where: { key } });
    return s?.value ?? defaultVal;
  }

  private async upsertSetting(key: string, value: string) {
    await this.prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  private getNextResetDate(): string {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 1, 0);
    return next.toISOString();
  }
}
