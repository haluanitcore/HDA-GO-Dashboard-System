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

  // ── BD Users ──
  const bd1 = await prisma.user.create({
    data: { name: 'Rina BD', email: 'rina@hdago.com', password, role: 'BD' },
  });
  const bd2 = await prisma.user.create({
    data: { name: 'Arief BD', email: 'arief@hdago.com', password, role: 'BD' },
  });

  // ── Brand Users ──
  const brand1 = await prisma.user.create({
    data: { name: 'Dominos Pizza', email: 'dominos@brand.com', password, role: 'BRAND' },
  });
  const brand2 = await prisma.user.create({
    data: { name: 'Hotel Paradise', email: 'hotelparadise@brand.com', password, role: 'BRAND' },
  });
  const brand3 = await prisma.user.create({
    data: { name: 'GlowUp Beauty', email: 'glowup@brand.com', password, role: 'BRAND' },
  });

  // ── BD-Brand Assignments (BD assigned per brand) ──
  await prisma.brandBDAssignment.create({
    data: { bd_user_id: bd1.id, brand_user_id: brand1.id },
  });
  await prisma.brandBDAssignment.create({
    data: { bd_user_id: bd1.id, brand_user_id: brand2.id },
  });
  await prisma.brandBDAssignment.create({
    data: { bd_user_id: bd2.id, brand_user_id: brand3.id },
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
  // CAMPAIGNS — With BD Workflow statuses
  // ══════════════════════════════════════
  const campaigns: any[] = [];
  const campaignData = [
    // ACTIVE — fully through BD pipeline
    { title: 'Summer Sale Mega Promo', category: 'FNB', min_level: 0, sow_total: 4, reward_type: 'COMMISSION', deadline: '2026-06-15', status: 'ACTIVE', slot: 20, budget: 15000000, brand: brand1.id, bd_reviewer_id: bd1.id, bd_approved_at: new Date() },
    { title: 'Hotel Paradise Bali Review', category: 'HOTEL', min_level: 2, sow_total: 3, reward_type: 'FIXED', deadline: '2026-06-01', status: 'ACTIVE', slot: 10, budget: 25000000, brand: brand2.id, bd_reviewer_id: bd1.id, bd_approved_at: new Date() },
    // BD_APPROVED — approved, waiting CM to publish
    { title: 'Dominos Pizza New Menu', category: 'FNB', min_level: 1, sow_total: 4, reward_type: 'COMMISSION', deadline: '2026-05-30', status: 'BD_APPROVED', slot: 15, budget: 10000000, brand: brand1.id, bd_reviewer_id: bd1.id, bd_approved_at: new Date() },
    // PENDING_BD — waiting for BD review
    { title: 'TikTok LIVE Shopping Ramadan', category: 'LIVE', min_level: 3, sow_total: 2, reward_type: 'COMMISSION', deadline: '2026-06-10', status: 'PENDING_BD', slot: 5, budget: 30000000, brand: brand1.id },
    { title: 'Beauty Glow Up Challenge', category: 'BEAUTY', min_level: 0, sow_total: 3, reward_type: 'FIXED', deadline: '2026-07-01', status: 'PENDING_BD', slot: 30, budget: 8000000, brand: brand3.id },
    { title: 'Smart Gadget Review 2026', category: 'TECH', min_level: 4, sow_total: 2, reward_type: 'FIXED', deadline: '2026-06-20', status: 'PENDING_BD', slot: 5, budget: 20000000, brand: brand2.id },
    // BD_REVISION — needs revision from brand
    { title: 'Hidden Gems Bandung', category: 'TTD', min_level: 1, sow_total: 5, reward_type: 'COMMISSION', deadline: '2026-06-25', status: 'BD_REVISION', slot: 12, budget: 5000000, brand: brand2.id, bd_reviewer_id: bd1.id, bd_notes: 'Budget terlalu rendah untuk 5 SOW. Tolong naikkan budget minimal Rp 12 juta.' },
  ];

  for (const cd of campaignData) {
    campaigns.push(await prisma.campaign.create({
      data: {
        title: cd.title, category: cd.category, min_level: cd.min_level, sow_total: cd.sow_total,
        reward_type: cd.reward_type, deadline: new Date(cd.deadline), status: cd.status, slot: cd.slot,
        budget: cd.budget, brand_id: cd.brand,
        bd_reviewer_id: cd.bd_reviewer_id || null,
        bd_approved_at: cd.bd_approved_at || null,
        bd_notes: cd.bd_notes || null,
        bd_reviewed_at: cd.bd_reviewer_id ? new Date() : null,
      },
    }));
  }

  // ── Campaign Edit Logs (audit trail demo data) ──
  await prisma.campaignEditLog.create({
    data: {
      campaign_id: campaigns[0].id, editor_id: brand1.id, editor_role: 'BRAND',
      field_name: 'campaign', old_value: null, new_value: campaigns[0].title,
      action: 'CREATE', notes: 'Campaign submitted by Brand',
    },
  });
  await prisma.campaignEditLog.create({
    data: {
      campaign_id: campaigns[0].id, editor_id: bd1.id, editor_role: 'BD',
      field_name: 'budget', old_value: '12000000', new_value: '15000000',
      action: 'EDIT', notes: 'Budget adjusted to meet SOW requirements',
    },
  });
  await prisma.campaignEditLog.create({
    data: {
      campaign_id: campaigns[0].id, editor_id: bd1.id, editor_role: 'BD',
      field_name: 'status', old_value: 'PENDING_BD', new_value: 'BD_APPROVED',
      action: 'APPROVE', notes: 'Approved — good fit for our creator pool',
    },
  });

  // ── Campaign Participants (only for ACTIVE / BD_APPROVED campaigns) ──
  const activeOrApproved = campaigns.filter(c => ['ACTIVE', 'BD_APPROVED'].includes(c.status));
  for (const [ci, cai] of [[0,0],[0,1],[1,0],[1,1],[2,0],[3,0]]) {
    if (activeOrApproved[cai]) {
      try {
        await prisma.campaignParticipant.create({ data: { campaign_id: activeOrApproved[cai].id, creator_id: creatorUsers[ci].id, status: 'JOINED' } });
      } catch { /* skip duplicates */ }
    }
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
    { user_id: cm1.id, title: '📋 Campaign Baru dari BD', message: 'Campaign "Dominos Pizza New Menu" telah di-approve oleh Rina BD.', type: 'CAMPAIGN', read_status: false },
    { user_id: bd1.id, title: '📥 Campaign Baru Masuk', message: 'Dominos Pizza mengirimkan "TikTok LIVE Shopping Ramadan". Silakan review.', type: 'CAMPAIGN', read_status: false },
    { user_id: bd1.id, title: '📥 Campaign Baru Masuk', message: 'Hotel Paradise mengirimkan "Smart Gadget Review 2026". Silakan review.', type: 'CAMPAIGN', read_status: false },
    { user_id: brand2.id, title: '🔄 Revisi Diperlukan', message: 'Campaign "Hidden Gems Bandung" memerlukan revisi: Budget terlalu rendah.', type: 'CAMPAIGN', read_status: false },
  ]) {
    await prisma.notification.create({ data: n });
  }

  console.log('');
  console.log('✅ Seed completed!');
  console.log('');
  console.log('📧 Login credentials (password: password123):');
  console.log('   Creator: alex@creator.com');
  console.log('   CM:      sarah@hdago.com');
  console.log('   BD:      rina@hdago.com / arief@hdago.com');
  console.log('   Brand:   dominos@brand.com / hotelparadise@brand.com / glowup@brand.com');
  console.log('   Admin:   admin@hdago.com');
  console.log('   Exec:    exec@hdago.com');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
