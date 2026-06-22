import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class UserActivityService {
  private readonly logger = new Logger(UserActivityService.name);

  constructor(private prisma: PrismaService) {}

  private getLocalDateString(d: Date): string {
    const tzOffset = 7 * 60 * 60 * 1000; // GMT+7
    const localTime = new Date(d.getTime() + tzOffset);
    return localTime.toISOString().substring(0, 10);
  }

  // 1. LOGIN EVENT
  async recordLogin(userId: string) {
    try {
      const now = new Date();
      const dateStr = this.getLocalDateString(now);

      // Update User last_login_at
      await this.prisma.user.update({
        where: { id: userId },
        data: { last_login_at: now },
      });

      // Create new activity log session
      await this.prisma.userActivityLog.create({
        data: {
          user_id: userId,
          login_at: now,
          last_seen_at: now,
          is_active: true,
        },
      });

      // Upsert Daily Stat
      await this.prisma.userDailyStat.upsert({
        where: {
          user_id_date: {
            user_id: userId,
            date: dateStr,
          },
        },
        create: {
          user_id: userId,
          date: dateStr,
          session_count: 1,
          first_login_at: now,
          last_login_at: now,
        },
        update: {
          session_count: { increment: 1 },
          last_login_at: now,
        },
      });
    } catch (err) {
      this.logger.error(`Error recording login for user ${userId}: ${err.message}`);
    }
  }

  // 2. HEARTBEAT EVENT
  async recordHeartbeat(userId: string, ipAddress?: string, userAgent?: string) {
    const now = new Date();
    
    // Find active log for user
    let activeLog = await this.prisma.userActivityLog.findFirst({
      where: {
        user_id: userId,
        is_active: true,
      },
      orderBy: { login_at: 'desc' },
    });

    if (!activeLog) {
      // Recovery session: if user session was closed or server restarted but client is still running
      activeLog = await this.prisma.userActivityLog.create({
        data: {
          user_id: userId,
          login_at: now,
          last_seen_at: now,
          is_active: true,
          ip_address: ipAddress,
          user_agent: userAgent,
        },
      });
    } else {
      // Update heartbeat time
      await this.prisma.userActivityLog.update({
        where: { id: activeLog.id },
        data: {
          last_seen_at: now,
          ip_address: ipAddress,
          user_agent: userAgent,
        },
      });
    }
    
    // Update daily stat's last_login_at to show they were recently online
    const dateStr = this.getLocalDateString(now);
    await this.prisma.userDailyStat.updateMany({
      where: {
        user_id: userId,
        date: dateStr,
      },
      data: {
        last_login_at: now,
      },
    });

    return { success: true };
  }

  // 3. LOGOUT EVENT
  async recordLogout(userId: string) {
    try {
      const now = new Date();
      // Find all active logs for user
      const activeLogs = await this.prisma.userActivityLog.findMany({
        where: {
          user_id: userId,
          is_active: true,
        },
      });

      for (const log of activeLogs) {
        const durationMs = now.getTime() - log.login_at.getTime();
        const durationMin = Math.max(1, Math.round(durationMs / 60000));

        // Update log
        await this.prisma.userActivityLog.update({
          where: { id: log.id },
          data: {
            logout_at: now,
            duration_min: durationMin,
            is_active: false,
            last_seen_at: now,
          },
        });

        // Update Daily Stat
        const dateStr = this.getLocalDateString(log.login_at);
        const stat = await this.prisma.userDailyStat.findUnique({
          where: {
            user_id_date: {
              user_id: userId,
              date: dateStr,
            },
          },
        });

        if (stat) {
          const newTotalMin = stat.total_minutes + durationMin;
          const metDailyGoal = newTotalMin >= 240; // 240 mins (4 hours)
          await this.prisma.userDailyStat.update({
            where: { id: stat.id },
            data: {
              total_minutes: newTotalMin,
              met_daily_goal: metDailyGoal,
            },
          });
        }
      }
    } catch (err) {
      this.logger.error(`Error recording logout for user ${userId}: ${err.message}`);
    }
  }

  // 4. TIMEOUT / CLEANUP LOGS (Runs periodically to close inactive sessions)
  // Run every 2 minutes. Timeout threshold: 90 seconds (1.5 minutes) since last heartbeat
  @Cron('0 */2 * * * *')
  async closeAllTimedOutSessions() {
    const timeoutThreshold = new Date(Date.now() - 90 * 1000);
    
    const timedOutLogs = await this.prisma.userActivityLog.findMany({
      where: {
        is_active: true,
        last_seen_at: { lt: timeoutThreshold },
      },
    });

    if (timedOutLogs.length === 0) return;

    this.logger.log(`Closing ${timedOutLogs.length} timed out sessions.`);

    for (const log of timedOutLogs) {
      const durationMs = log.last_seen_at.getTime() - log.login_at.getTime();
      const durationMin = Math.max(1, Math.round(durationMs / 60000));

      await this.prisma.userActivityLog.update({
        where: { id: log.id },
        data: {
          logout_at: log.last_seen_at,
          duration_min: durationMin,
          is_active: false,
        },
      });

      const dateStr = this.getLocalDateString(log.login_at);
      const stat = await this.prisma.userDailyStat.findUnique({
        where: {
          user_id_date: {
            user_id: log.user_id,
            date: dateStr,
          },
        },
      });

      if (stat) {
        const newTotalMin = stat.total_minutes + durationMin;
        const metDailyGoal = newTotalMin >= 240;
        await this.prisma.userDailyStat.update({
          where: { id: stat.id },
          data: {
            total_minutes: newTotalMin,
            met_daily_goal: metDailyGoal,
          },
        });
      }
    }
  }

  // 5. RETENTION CLEANUP
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldLogs() {
    const retentionThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const deleteCount = await this.prisma.userActivityLog.deleteMany({
      where: {
        login_at: { lt: retentionThreshold },
      },
    });
    this.logger.log(`Purged ${deleteCount.count} activity log entries older than 30 days.`);
  }

  // 6. ADMIN DASHBOARD STATS
  async getStatsSummary() {
    const now = new Date();
    const dateStr = this.getLocalDateString(now);

    const onlineThreshold = new Date(Date.now() - 90 * 1000);
    const rolesToTrack = ['CM', 'BD', 'BRAND', 'CREATOR'];
    const onlineUsers = await this.prisma.user.findMany({
      where: {
        role: { in: rolesToTrack },
        activity_logs: {
          some: {
            is_active: true,
            last_seen_at: { gte: onlineThreshold },
          },
        },
      },
      select: {
        id: true,
        name: true,
        role: true,
        email: true,
      },
    });

    const totalOnlineCount = onlineUsers.length;

    const dailyStatsToday = await this.prisma.userDailyStat.findMany({
      where: { date: dateStr },
      include: {
        user: {
          select: { role: true },
        },
      },
    });

    const durationByRole: Record<string, { totalMin: number; count: number }> = {};

    for (const role of rolesToTrack) {
      durationByRole[role] = { totalMin: 0, count: 0 };
    }

    for (const stat of dailyStatsToday) {
      const role = stat.user?.role?.toUpperCase();
      if (role && durationByRole[role]) {
        durationByRole[role].totalMin += stat.total_minutes;
        durationByRole[role].count += 1;
      }
    }

    const averageDurationByRole = Object.keys(durationByRole).reduce((acc, role) => {
      const data = durationByRole[role];
      acc[role] = data.count > 0 ? Math.round(data.totalMin / data.count) : 0;
      return acc;
    }, {} as Record<string, number>);

    const activeTrackedUsers = await this.prisma.user.findMany({
      where: {
        role: { in: rolesToTrack },
      },
      select: {
        id: true,
        name: true,
        role: true,
        email: true,
        daily_stats: {
          where: { date: dateStr },
        },
      },
    });

    const inactiveAlerts = activeTrackedUsers.map((u) => {
      const todayStat = u.daily_stats[0];
      const minutes = todayStat ? todayStat.total_minutes : 0;
      return {
        id: u.id,
        name: u.name,
        role: u.role,
        email: u.email,
        minutes_today: minutes,
        met_goal: minutes >= 240,
      };
    }).filter(u => !u.met_goal);

    return {
      totalOnline: totalOnlineCount,
      onlineUsers,
      averageDurationByRole,
      inactiveAlertsCount: inactiveAlerts.length,
      inactiveAlerts,
    };
  }

  // 7. GET USERS FOR TRACKER LIST
  async getUsersActivity(query: {
    role?: string;
    search?: string;
    date?: string;
  }) {
    const dateStr = query.date || this.getLocalDateString(new Date());
    const rolesToTrack = query.role ? [query.role.toUpperCase()] : ['CM', 'BD', 'BRAND', 'CREATOR'];

    const users = await this.prisma.user.findMany({
      where: {
        role: { in: rolesToTrack },
        name: query.search ? { contains: query.search, mode: 'insensitive' } : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar_url: true,
        last_login_at: true,
        daily_stats: {
          where: { date: dateStr },
        },
        activity_logs: {
          orderBy: { login_at: 'desc' },
          take: 1,
        },
      },
    });

    const onlineThreshold = new Date(Date.now() - 90 * 1000);

    const mapped = users.map((u) => {
      const todayStat = u.daily_stats[0];
      const lastSession = u.activity_logs[0];
      
      const isOnline = lastSession 
        ? lastSession.is_active && lastSession.last_seen_at >= onlineThreshold 
        : false;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        avatar_url: u.avatar_url,
        last_login_at: u.last_login_at,
        is_online: isOnline,
        total_minutes_today: todayStat ? todayStat.total_minutes : 0,
        met_daily_goal: todayStat ? todayStat.met_daily_goal : false,
        ip_address: lastSession ? lastSession.ip_address : null,
        user_agent: lastSession ? lastSession.user_agent : null,
      };
    });

    return mapped.sort((a, b) => {
      if (a.is_online && !b.is_online) return -1;
      if (!a.is_online && b.is_online) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  // 8. GET DETAIL REPORT CSV DATA
  async generateActivityReportCsv(role?: string) {
    const rolesToTrack = role ? [role.toUpperCase()] : ['CM', 'BD', 'BRAND', 'CREATOR'];
    const now = new Date();
    
    const past30Days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - i);
      return this.getLocalDateString(d);
    });

    const stats = await this.prisma.userDailyStat.findMany({
      where: {
        date: { in: past30Days },
        user: {
          role: { in: rolesToTrack },
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: [
        { date: 'desc' },
        { user: { name: 'asc' } },
      ],
    });

    let csv = '\uFEFF'; // UTF-8 BOM
    csv += 'Tanggal,Nama,Email,Role,Total Menit Aktif,Memenuhi Target (4 Jam),Waktu Login Pertama,Waktu Login Terakhir\n';
    
    for (const stat of stats) {
      const metGoalStr = stat.met_daily_goal ? 'YA' : 'TIDAK';
      const firstLogin = stat.first_login_at ? stat.first_login_at.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-';
      const lastLogin = stat.last_login_at ? stat.last_login_at.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-';
      
      csv += `"${stat.date}","${stat.user.name}","${stat.user.email}","${stat.user.role}",${stat.total_minutes},"${metGoalStr}","${firstLogin}","${lastLogin}"\n`;
    }

    return csv;
  }

  // 9. GET USER DETAIL ACTIVITY (For Modal)
  async getUserDetailActivity(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar_url: true,
        created_at: true,
        last_login_at: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const now = new Date();
    const past30Days: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      past30Days.push(this.getLocalDateString(d));
    }

    const stats = await this.prisma.userDailyStat.findMany({
      where: {
        user_id: userId,
        date: { in: past30Days },
      },
    });

    const statMap = new Map(stats.map(s => [s.date, s]));
    const dailyChart = past30Days.map(date => {
      const s = statMap.get(date);
      return {
        date,
        totalMinutes: s ? s.total_minutes : 0,
        metGoal: s ? s.met_daily_goal : false,
      };
    });

    let totalMinutes30d = 0;
    let activeDays = 0;
    let targetMetDays = 0;

    for (const item of dailyChart) {
      if (item.totalMinutes > 0) {
        activeDays++;
        totalMinutes30d += item.totalMinutes;
      }
      if (item.metGoal) {
        targetMetDays++;
      }
    }

    const avgMinutesPerDay = activeDays > 0 ? Math.round(totalMinutes30d / activeDays) : 0;

    const startThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sessions = await this.prisma.userActivityLog.findMany({
      where: {
        user_id: userId,
        login_at: { gte: startThreshold },
      },
      orderBy: { login_at: 'desc' },
    });

    const onlineThreshold = new Date(Date.now() - 90 * 1000);
    const latestSession = await this.prisma.userActivityLog.findFirst({
      where: { user_id: userId },
      orderBy: { login_at: 'desc' },
    });
    
    const isOnline = latestSession
      ? latestSession.is_active && latestSession.last_seen_at >= onlineThreshold
      : false;

    return {
      user: {
        ...user,
        is_online: isOnline,
      },
      metrics: {
        activeDays,
        targetMetDays,
        avgMinutesPerDay,
        totalMinutes30d,
      },
      dailyChart,
      sessions: sessions.map(s => ({
        id: s.id,
        login_at: s.login_at,
        logout_at: s.logout_at,
        duration_min: s.duration_min,
        ip_address: s.ip_address,
        user_agent: s.user_agent,
        is_active: s.is_active,
      })),
    };
  }
}
