import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { resolve } from 'path';
import * as bcrypt from 'bcryptjs';

const dbPath = resolve(process.cwd(), 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding HDA Go database (EMPTY STATE)...');
  console.log(`   Database: ${dbPath}`);

  // ── CLEAR ALL EXISTING DATA ──
  await prisma.campaignEditLog.deleteMany();
  await prisma.brandBDAssignment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.creatorMonthlyStats.deleteMany();
  await prisma.campaignAnalytics.deleteMany();
  await prisma.platformMetrics.deleteMany();
  await prisma.submissionDeliverable.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.creatorOrder.deleteMany();
  await prisma.campaignParticipant.deleteMany();
  await prisma.creatorProgress.deleteMany();
  await prisma.creator.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.user.deleteMany();

  console.log('   ✅ All tables cleared.');

  const password = await bcrypt.hash('password123', 12);

  // ══════════════════════════════════════
  // USERS — One per role, zero data
  // ══════════════════════════════════════
  await prisma.user.create({
    data: { name: 'Admin HDA', email: 'admin@hdago.com', password, role: 'ADMIN' },
  });

  await prisma.user.create({
    data: { name: 'CEO HDA Go', email: 'exec@hdago.com', password, role: 'EXECUTIVE' },
  });

  await prisma.user.create({
    data: { name: 'Sarah CM', email: 'cm1@hdago.com', password: await bcrypt.hash('hdago123', 12), role: 'CM' },
  });

  await prisma.user.create({
    data: { name: 'Budi CM', email: 'cm2@hdago.com', password: await bcrypt.hash('hdago123', 12), role: 'CM' },
  });

  await prisma.user.create({
    data: { name: 'Rina BD', email: 'rina@hdago.com', password, role: 'BD' },
  });

  const brandUser = await prisma.user.create({
    data: { name: 'Brand User', email: 'brand@hdago.com', password, role: 'BRAND' },
  });

  const creatorUser = await prisma.user.create({
    data: { name: 'Creator User', email: 'creator@hdago.com', password, role: 'CREATOR' },
  });

  // ── Creator Profile (empty stats) ──
  await prisma.creator.create({
    data: {
      user_id: creatorUser.id,
      creator_level: 0,
      gmv_total: 0,
      gmv_monthly: 0,
      total_orders: 0,
      total_campaigns: 0,
      total_posts: 0,
      streak_days: 0,
      live_participation: 0,
      posting_consistency: 0,
      cm_id: null,
    },
  });

  // ── Creator Progress (starts at level 0) ──
  await prisma.creatorProgress.create({
    data: {
      creator_id: creatorUser.id,
      current_level: 0,
      target_level: 1,
      progress_percentage: 0,
      gmv_progress: 0,
      campaign_progress: 0,
      order_progress: 0,
    },
  });

  console.log('');
  console.log('✅ Empty seed completed!');
  console.log('');
  console.log('📧 Login credentials (password: password123):');
  console.log('   Creator:   creator@hdago.com');
  console.log('   CM:        sarah@hdago.com');
  console.log('   BD:        rina@hdago.com');
  console.log('   Brand:     brand@hdago.com');
  console.log('   Admin:     admin@hdago.com');
  console.log('   Executive: exec@hdago.com');
  console.log('');
  console.log('⚠️  All campaign, submission, GMV, and notification data is EMPTY.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
