import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { resolve } from 'path';
import * as bcrypt from 'bcryptjs';

const dbPath = resolve(process.cwd(), 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding HDA Go Database (10 Real Creators & Core Users)...');
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

  console.log('   ✅ All tables cleared.');

  // Default hashed password for everyone to keep onboarding uniform
  const password = await bcrypt.hash('HdaGo123!', 12);

  // ══════════════════════════════════════
  // CORE ADMINISTRATORS & BUSINESS DEVELOPMENT
  // ══════════════════════════════════════
  await prisma.user.create({
    data: { name: 'Admin HDA', email: 'admin@hdago.com', password, role: 'ADMIN' },
  });

  await prisma.user.create({
    data: { name: 'CEO HDA Go', email: 'exec@hdago.com', password, role: 'EXECUTIVE' },
  });

  // BD Users (Command Center Managers)
  const bd1 = await prisma.user.create({
    data: { name: 'Rina BD', email: 'rina@hdago.com', password, role: 'BD' },
  });
  const bd2 = await prisma.user.create({
    data: { name: 'Arief BD', email: 'arief@hdago.com', password, role: 'BD' },
  });

  // ══════════════════════════════════════
  // CREATOR MANAGERS (CM)
  // ══════════════════════════════════════
  const cmsMap: Record<string, string> = {};
  const cmList = [
    { name: 'Rayhaan', email: 'rayhaan@hdago.com' },
    { name: 'Azwa', email: 'azwa@hdago.com' },
    { name: 'Arinda', email: 'arinda@hdago.com' },
    { name: 'Amanda', email: 'amanda@hdago.com' },
    { name: 'Umar', email: 'umar@hdago.com' },
    { name: 'Diya', email: 'diya@hdago.com' },
    { name: 'Raysa', email: 'raysa@hdago.com' },
    { name: 'Putri', email: 'putri@hdago.com' },
    { name: 'Atar', email: 'atar@hdago.com' },
  ];

  for (const cm of cmList) {
    const createdCm = await prisma.user.create({
      data: { name: `${cm.name} CM`, email: cm.email, password, role: 'CM' }
    });
    cmsMap[cm.name.toLowerCase()] = createdCm.id;
  }
  console.log('   ✅ Creator Managers created.');

  // ══════════════════════════════════════
  // BRAND PARTNERS
  // ══════════════════════════════════════
  const brand1 = await prisma.user.create({
    data: { name: 'Dominos Pizza', email: 'dominos@brand.com', password, role: 'BRAND' },
  });
  const brand2 = await prisma.user.create({
    data: { name: 'Hotel Paradise Resort', email: 'hotelparadise@brand.com', password, role: 'BRAND' },
  });
  const brand3 = await prisma.user.create({
    data: { name: 'GlowUp Beauty Cosmetics', email: 'glowup@brand.com', password, role: 'BRAND' },
  });

  // BD-Brand Assignments
  await prisma.brandBDAssignment.create({
    data: { bd_user_id: bd1.id, brand_user_id: brand1.id },
  });
  await prisma.brandBDAssignment.create({
    data: { bd_user_id: bd1.id, brand_user_id: brand2.id },
  });
  await prisma.brandBDAssignment.create({
    data: { bd_user_id: bd2.id, brand_user_id: brand3.id },
  });

  // ══════════════════════════════════════
  // 10 REAL CREATORS FROM THE GOOGLE SHEET
  // ══════════════════════════════════════
  const realCreators = [
    {
      id: '7145781983607374874',
      name: 'Ulan',
      username: 'ulanberkelana',
      email: 'ulanberkelana@creator.com',
      cmName: 'rayhaan',
      followers: 1163,
      niche: '["Attraction", "F&B", "Hotel"]',
      level: 1,
      gmv: 0,
      orders: 0,
      profileUrl: 'https://www.tiktok.com/@ulanberkelana'
    },
    {
      id: '6828042033229104130',
      name: 'safira nur hidayah',
      username: 'jadikieu',
      email: 'jadikieu@creator.com',
      cmName: 'azwa',
      followers: 1373,
      niche: '["F&B", "Hotel"]',
      level: 1,
      gmv: 0,
      orders: 0,
      profileUrl: 'https://www.tiktok.com/@jadikieu'
    },
    {
      id: '6919469607650100229',
      name: 'Mami LuLu',
      username: 'sebutsajabestliee',
      email: 'sebutsajabestliee@creator.com',
      cmName: 'arinda',
      followers: 96900,
      niche: '["Attraction", "F&B", "Hotel"]',
      level: 1,
      gmv: 0,
      orders: 0,
      profileUrl: 'https://www.tiktok.com/@sebutsajabestliee'
    },
    {
      id: '6891600494168785921',
      name: 'Insan',
      username: 'intravelstaycation',
      email: 'intravelstaycation@creator.com',
      cmName: 'amanda',
      followers: 16600,
      niche: '["F&B", "Hotel"]',
      level: 2,
      gmv: 0,
      orders: 0,
      profileUrl: 'https://www.tiktok.com/@intravelstaycation'
    },
    {
      id: '7168736363256497158',
      name: 'Devi Amaliyah',
      username: 'deviamlyhh',
      email: 'deviamlyhh@creator.com',
      cmName: 'azwa',
      followers: 7089,
      niche: '["F&B", "Hotel"]',
      level: 2,
      gmv: 0,
      orders: 0,
      profileUrl: 'https://www.tiktok.com/@deviamlyhh'
    },
    {
      id: '6842866535804863490',
      name: 'foodbali',
      username: 'foodbali',
      email: 'foodbali@creator.com',
      cmName: 'umar',
      followers: 82100,
      niche: '["Attraction", "F&B", "Hotel"]',
      level: 1,
      gmv: 0,
      orders: 0,
      profileUrl: 'https://www.tiktok.com/@foodbali'
    },
    {
      id: '6808825776345383938',
      name: 'agis',
      username: 'agisrutt',
      email: 'agisrutt@creator.com',
      cmName: 'diya',
      followers: 2259,
      niche: '["Attraction", "F&B"]',
      level: 1,
      gmv: 0,
      orders: 0,
      profileUrl: 'https://www.tiktok.com/@agisrutt'
    },
    {
      id: '6780654205277310674',
      name: 'Kadek Desi Bala Dewi',
      username: 'desibaladewi',
      email: 'desibaladewi@creator.com',
      cmName: 'azwa',
      followers: 1516,
      niche: '["Attraction", "F&B", "Hotel"]',
      level: 1,
      gmv: 0,
      orders: 0,
      profileUrl: 'https://www.tiktok.com/@desibaladewi'
    },
    {
      id: '6792498152568308737',
      name: 'Aulia Putri',
      username: 'balispot',
      email: 'balispot@creator.com',
      cmName: 'diya',
      followers: 37432,
      niche: '["Attraction", "F&B", "Hotel"]',
      level: 1,
      gmv: 0,
      orders: 0,
      profileUrl: 'https://www.tiktok.com/@balispot'
    },
    {
      id: '671720132242166786',
      name: 'debiila anggita rani',
      username: 'debillaar_',
      email: 'debillaar_@creator.com',
      cmName: 'raysa',
      followers: 37400,
      niche: '["Attraction", "F&B", "Hotel"]',
      level: 1,
      gmv: 0,
      orders: 0,
      profileUrl: 'https://www.tiktok.com/@debillaar_'
    }
  ];

  for (const c of realCreators) {
    // 1. Create User
    const user = await prisma.user.create({
      data: {
        id: c.id,
        name: c.name,
        email: c.email,
        password,
        role: 'CREATOR'
      }
    });

    // Determine CM Id
    const cmId = cmsMap[c.cmName] || cmsMap['rayhaan'];

    // 2. Create Creator Profile
    await prisma.creator.create({
      data: {
        user_id: user.id,
        creator_level: c.level,
        gmv_total: c.gmv,
        gmv_monthly: c.gmv,
        total_orders: c.orders,
        total_campaigns: 2,
        total_posts: 5,
        streak_days: 3,
        live_participation: 1,
        posting_consistency: 80,
        cm_id: cmId,
        tiktok_username: c.username,
        tiktok_url: c.profileUrl,
        tiktok_followers: c.followers,
        niche: c.niche,
        affiliate_exp: 'AKTIF',
        sow_per_month: 4,
        gmv_target_monthly: c.level === 1 ? 1500000 : 7500000,
        start_date: new Date(),
        onboarding_status: 'ACTIVE',
        onboarded_at: new Date()
      }
    });

    // 3. Create Creator Progress
    const targetLvl = Math.min(c.level + 1, 5);
    const targetGmvThresholds = [1500000, 7500000, 18000000, 50000000, 150000000];
    const progressPct = c.gmv > 0 ? Math.min((c.gmv / targetGmvThresholds[c.level]) * 100, 99) : 0;

    await prisma.creatorProgress.create({
      data: {
        creator_id: user.id,
        current_level: c.level,
        target_level: targetLvl,
        progress_percentage: progressPct,
        gmv_progress: c.gmv,
        order_progress: c.orders,
        campaign_progress: 2
      }
    });

    // 4. Create dummy order transaction for May period to bootstrap time series
    if (c.gmv > 0) {
      await prisma.creatorMonthlyStats.create({
        data: {
          creator_id: user.id,
          month: '2026-05',
          gmv: c.gmv,
          orders: c.orders,
          campaigns_joined: 2,
          campaigns_completed: 1,
          posts_count: 5,
          completion_rate: 100
        }
      });
    }
  }
  console.log('   ✅ 10 Real Creators created.');

  // ══════════════════════════════════════
  // ACTIVE CAMPAIGNS FOR REAL WORKING SCENARIOS
  // ══════════════════════════════════════
  const campData = [
    { title: 'Summer Staycation Paradise Review', category: 'HOTEL', min_level: 1, sow_total: 2, reward_type: 'FIXED', deadline: '2026-06-30', status: 'ACTIVE', slot: 10, budget: 15000000, brand_id: brand2.id, bd_reviewer_id: bd1.id, bd_approved_at: new Date() },
    { title: 'Dominos Pizza Double Deal Review', category: 'FNB', min_level: 0, sow_total: 3, reward_type: 'COMMISSION', deadline: '2026-06-25', status: 'ACTIVE', slot: 15, budget: 8000000, brand_id: brand1.id, bd_reviewer_id: bd1.id, bd_approved_at: new Date() },
    { title: 'Ramadan Culinary Hunting', category: 'FNB', min_level: 1, sow_total: 4, reward_type: 'COMMISSION', deadline: '2026-07-05', status: 'PENDING_BD', slot: 20, budget: 12000000, brand_id: brand1.id }
  ];

  for (const c of campData) {
    await prisma.campaign.create({
      data: {
        title: c.title,
        category: c.category,
        min_level: c.min_level,
        sow_total: c.sow_total,
        reward_type: c.reward_type,
        deadline: new Date(c.deadline),
        status: c.status,
        slot: c.slot,
        budget: c.budget,
        brand_id: c.brand_id,
        bd_reviewer_id: c.bd_reviewer_id || null,
        bd_approved_at: c.bd_approved_at || null,
        bd_reviewed_at: c.bd_reviewer_id ? new Date() : null,
      }
    });
  }
  console.log('   ✅ Setup active working campaigns.');

  console.log('');
  console.log('🎉 HDA-GO DATABASE SEED COMPLETE (10 REAL CREATORS + CMs)!');
  console.log('========================================================');
  console.log('📧 Login Credentials (ALL PASSWORDS ARE: HdaGo123!):');
  console.log('--------------------------------------------------------');
  console.log('   Admin:      admin@hdago.com');
  console.log('   Executive:  exec@hdago.com');
  console.log('   BD User:    rina@hdago.com / arief@hdago.com');
  console.log('   Brands:     dominos@brand.com / hotelparadise@brand.com');
  console.log('--------------------------------------------------------');
  console.log('   Real Creator Accounts (10 Creators):');
  for (const c of realCreators) {
    console.log(`     - Name: ${c.name.padEnd(25)} Email: ${c.email.padEnd(30)} Username: @${c.username}`);
  }
  console.log('--------------------------------------------------------');
  console.log('   Creator Manager (CM) Accounts:');
  for (const cm of cmList) {
    console.log(`     - Name: ${cm.name.padEnd(15)} Email: ${cm.email}`);
  }
  console.log('========================================================');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
