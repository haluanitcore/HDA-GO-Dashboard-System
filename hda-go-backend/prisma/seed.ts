import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { resolve } from 'path';
import * as bcrypt from 'bcryptjs';

const dbPath = resolve(process.cwd(), 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding HDA Go database...');
  console.log(`   Database: ${dbPath}`);

  // ── CLEAR EXISTING DATA ──
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

  const password = await bcrypt.hash('password123', 12);

  // ══════════════════════════════════════
  // USERS — Multi-role
  // ══════════════════════════════════════
  const admin = await prisma.user.create({
    data: { name: 'Admin HDA', email: 'admin@hdago.com', password, role: 'ADMIN' },
  });
  const executive = await prisma.user.create({
    data: { name: 'CEO HDA Go', email: 'exec@hdago.com', password, role: 'EXECUTIVE' },
  });
  const cm1 = await prisma.user.create({
    data: { name: 'Sarah CM', email: 'sarah@hdago.com', password, role: 'CM' },
  });
  const cm2 = await prisma.user.create({
    data: { name: 'Budi CM', email: 'budi@hdago.com', password, role: 'CM' },
  });
  const brand1 = await prisma.user.create({
    data: { name: 'Dominos Pizza', email: 'dominos@brand.com', password, role: 'BRAND' },
  });

  const creatorUsers: any[] = [];
  for (const c of [
    { name: 'Alex Creator', email: 'alex@creator.com' },
    { name: 'Maya Influencer', email: 'maya@creator.com' },
    { name: 'Rizki Foodie', email: 'rizki@creator.com' },
    { name: 'Dina Traveler', email: 'dina@creator.com' },
    { name: 'Farel Gamer', email: 'farel@creator.com' },
  ]) {
    creatorUsers.push(await prisma.user.create({ data: { ...c, password, role: 'CREATOR' } }));
  }

  // ══════════════════════════════════════
  // CREATOR PROFILES + PROGRESS
  // ══════════════════════════════════════
  const cData = [
    { level: 4, gmvTotal: 52000000, gmvMonthly: 12450000, orders: 520, campaigns: 28, posts: 85, streak: 14, live: 12, consistency: 72, cm: cm1.id },
    { level: 3, gmvTotal: 18000000, gmvMonthly: 5200000, orders: 180, campaigns: 12, posts: 45, streak: 7, live: 6, consistency: 55, cm: cm1.id },
    { level: 2, gmvTotal: 7500000, gmvMonthly: 2100000, orders: 75, campaigns: 6, posts: 22, streak: 3, live: 3, consistency: 40, cm: cm2.id },
    { level: 1, gmvTotal: 1500000, gmvMonthly: 800000, orders: 15, campaigns: 3, posts: 8, streak: 0, live: 0, consistency: 20, cm: cm2.id },
    { level: 0, gmvTotal: 0, gmvMonthly: 0, orders: 0, campaigns: 0, posts: 0, streak: 0, live: 0, consistency: 0, cm: cm1.id },
  ];

  for (let i = 0; i < creatorUsers.length; i++) {
    const u = creatorUsers[i], d = cData[i];
    await prisma.creator.create({ data: { user_id: u.id, creator_level: d.level, gmv_total: d.gmvTotal, gmv_monthly: d.gmvMonthly, total_orders: d.orders, total_campaigns: d.campaigns, total_posts: d.posts, streak_days: d.streak, live_participation: d.live, posting_consistency: d.consistency, cm_id: d.cm } });
    await prisma.creatorProgress.create({ data: { creator_id: u.id, current_level: d.level, target_level: Math.min(d.level + 1, 6), progress_percentage: [0, 30, 45, 65, 84.5, 95, 100][d.level], gmv_progress: d.gmvTotal, campaign_progress: d.campaigns, order_progress: d.orders } });
  }

  // ══════════════════════════════════════
  // CAMPAIGNS
  // ══════════════════════════════════════
  const campaigns: any[] = [];
  for (const cd of [
    { title: 'Summer Sale Mega Promo', category: 'FNB', min_level: 0, sow_total: 4, reward_type: 'COMMISSION', deadline: '2026-06-15', status: 'ACTIVE', slot: 20 },
    { title: 'Hotel Paradise Bali Review', category: 'HOTEL', min_level: 2, sow_total: 3, reward_type: 'FIXED', deadline: '2026-06-01', status: 'ACTIVE', slot: 10 },
    { title: 'Dominos Pizza New Menu', category: 'FNB', min_level: 1, sow_total: 4, reward_type: 'COMMISSION', deadline: '2026-05-30', status: 'ACTIVE', slot: 15 },
    { title: 'TikTok LIVE Shopping', category: 'LIVE', min_level: 3, sow_total: 2, reward_type: 'COMMISSION', deadline: '2026-06-10', status: 'ACTIVE', slot: 5 },
    { title: 'Beauty Glow Up Challenge', category: 'BEAUTY', min_level: 0, sow_total: 3, reward_type: 'FIXED', deadline: '2026-07-01', status: 'ACTIVE', slot: 30 },
    { title: 'Smart Gadget Review 2026', category: 'TECH', min_level: 4, sow_total: 2, reward_type: 'FIXED', deadline: '2026-06-20', status: 'ACTIVE', slot: 5 },
    { title: 'Hidden Gems Bandung', category: 'TTD', min_level: 1, sow_total: 5, reward_type: 'COMMISSION', deadline: '2026-06-25', status: 'DRAFT', slot: 12 },
  ]) {
    campaigns.push(await prisma.campaign.create({ data: { ...cd, brand_id: brand1.id, deadline: new Date(cd.deadline) } }));
  }

  for (const [ci, cai] of [[0,0],[0,1],[0,2],[0,4],[1,0],[1,2],[1,4],[2,0],[2,4],[3,0]]) {
    await prisma.campaignParticipant.create({ data: { campaign_id: campaigns[cai].id, creator_id: creatorUsers[ci].id, status: 'JOINED' } });
  }

  // ── Submissions ──
  const sub1 = await prisma.submission.create({ data: { campaign_id: campaigns[0].id, creator_id: creatorUsers[0].id, tiktok_url: 'https://tiktok.com/@alex/video/123', status: 'APPROVED', reviewed_at: new Date() } });
  await prisma.submissionDeliverable.create({ data: { submission_id: sub1.id, total_sow: 4, completed_sow: 2, remaining_sow: 2 } });

  const sub2 = await prisma.submission.create({ data: { campaign_id: campaigns[2].id, creator_id: creatorUsers[0].id, tiktok_url: 'https://tiktok.com/@alex/video/456', status: 'QC_REVIEW' } });
  await prisma.submissionDeliverable.create({ data: { submission_id: sub2.id, total_sow: 4, completed_sow: 0, remaining_sow: 4 } });

  const sub3 = await prisma.submission.create({ data: { campaign_id: campaigns[0].id, creator_id: creatorUsers[1].id, tiktok_url: 'https://tiktok.com/@maya/video/789', status: 'POSTED', reviewed_at: new Date(), posted_at: new Date() } });
  await prisma.submissionDeliverable.create({ data: { submission_id: sub3.id, total_sow: 4, completed_sow: 3, remaining_sow: 1 } });

  // ── Orders ──
  await prisma.creatorOrder.create({ data: { creator_id: creatorUsers[0].id, campaign_id: campaigns[0].id, order_count: 85, gmv_amount: 4250000 } });
  await prisma.creatorOrder.create({ data: { creator_id: creatorUsers[0].id, campaign_id: campaigns[2].id, order_count: 120, gmv_amount: 6000000 } });
  await prisma.creatorOrder.create({ data: { creator_id: creatorUsers[1].id, campaign_id: campaigns[0].id, order_count: 60, gmv_amount: 3000000 } });

  // ── Notifications ──
  for (const n of [
    { user_id: creatorUsers[0].id, title: '📢 Campaign Baru!', message: 'Beauty Glow Up Challenge tersedia.', type: 'CAMPAIGN', read_status: false },
    { user_id: creatorUsers[0].id, title: '✅ VT Approved!', message: 'VT Summer Sale disetujui.', type: 'QC', read_status: true },
    { user_id: creatorUsers[0].id, title: '💰 GMV Recorded!', message: '85 order. GMV +Rp 4.250.000.', type: 'SYSTEM', read_status: false },
    { user_id: cm1.id, title: '⚠️ Dormant Alert', message: 'Farel Gamer belum aktif.', type: 'SYSTEM', read_status: false },
  ]) {
    await prisma.notification.create({ data: n });
  }

  console.log('');
  console.log('✅ Seed completed!');
  console.log('');
  console.log('📧 Login credentials (password: password123):');
  console.log('   Creator: alex@creator.com');
  console.log('   CM:      sarah@hdago.com');
  console.log('   Brand:   dominos@brand.com');
  console.log('   Admin:   admin@hdago.com');
  console.log('   Exec:    exec@hdago.com');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
