// AdminSyncService — query SyncLog history untuk Admin dashboard
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminSyncService {
  constructor(private readonly prisma: PrismaService) {}

  async getSyncHistory(limit = 30) {
    return this.prisma.syncLog.findMany({
      orderBy: { started_at: 'desc' },
      take: limit,
    });
  }

  async createSyncLog(triggeredBy: string, totalRows: number) {
    return this.prisma.syncLog.create({
      data: { triggered_by: triggeredBy, total_rows: totalRows, status: 'RUNNING' },
    });
  }

  async completeSyncLog(
    id: string,
    data: { updated: number; skipped: number; leveledUp: number; gmvAdded: number; ordersAdded: number },
  ) {
    return this.prisma.syncLog.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completed_at: new Date(),
        updated: data.updated,
        skipped: data.skipped,
        leveled_up: data.leveledUp,
        gmv_added: data.gmvAdded,
        orders_added: data.ordersAdded,
      },
    });
  }

  async failSyncLog(id: string, errorMsg: string) {
    return this.prisma.syncLog.update({
      where: { id },
      data: { status: 'FAILED', completed_at: new Date(), error_msg: errorMsg },
    });
  }
}
