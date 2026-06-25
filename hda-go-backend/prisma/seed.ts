import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding HDA Go Database (10 Real Creators & Core Users)...');
  console.log('   Database: PostgreSQL');

  // ── CLEAR EXISTING DATA ──
  await prisma.creatorMilestoneClaim.deleteMany();
  await prisma.milestoneReward.deleteMany();
  await prisma.campaignEditLog.deleteMany();
  await prisma.brandBDAssignment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.creatorWeeklyStats.deleteMany();
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
  await prisma.systemSetting.deleteMany();

  console.log('   ✅ All tables cleared.');

  // Default seed password — set SEED_DEFAULT_PASSWORD env var before running
  const seedPassword = process.env.SEED_DEFAULT_PASSWORD;
  if (!seedPassword || seedPassword.length < 12) {
    throw new Error('SEED_DEFAULT_PASSWORD env var is required (min 12 chars). Never use a hardcoded default.');
  }
  const password = await bcrypt.hash(seedPassword, 12);

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

  // QC Officer — reviews video submissions from creators in campaigns
  await prisma.user.create({
    data: { name: 'QC Officer', email: 'qc@hdago.com', password, role: 'QC' },
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
      data: { name: `${cm.name} CM`, email: cm.email, password, role: 'CM', cm_code: cm.name.toUpperCase() }
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
      gmv: 6000000,
      orders: 12,
      campaigns: 3,
      live: 5,
      consistency: 80,
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
        creator_code: c.id, // Creator ID from Sheet
        sheet_registered: true,
        creator_level: c.level,
        gmv_total: c.gmv,
        gmv_monthly: c.gmv,
        total_orders: c.orders,
        total_campaigns: (c as any).campaigns ?? 2,
        total_posts: 5,
        streak_days: 3,
        live_participation: (c as any).live ?? 1,
        posting_consistency: (c as any).consistency ?? 80,
        cm_id: cmId,
        tiktok_username: c.username,
        tiktok_url: c.profileUrl,
        tiktok_followers: c.followers,
        niche: c.niche,
        affiliate_exp: 'AKTIF',
        sow_per_month: 4,
        gmv_target_monthly: c.level === 1 ? 1500000 : 7500000,
        start_date: new Date('2026-01-01'),
        end_date: new Date('2026-12-31'),
        onboarding_status: 'ACTIVE',
        onboarded_at: new Date()
      }
    });

    // 3. Create Creator Progress
    const targetLvl = Math.min(c.level + 1, 4);
    const targetGmvThresholds: Record<number, number> = { 1: 5000000, 2: 25000000, 3: 100000000, 4: 100000000 };
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

  // ══════════════════════════════════════
  // SYSTEM SETTINGS
  // ══════════════════════════════════════
  await prisma.systemSetting.createMany({
    data: [
      { key: 'google_sheets_url', value: 'https://docs.google.com/spreadsheets/d/1Alp1XHgQtK8CnIW3fFD7p-8HXGDsA5IbYM4Da97btGc' },
      { key: 'google_sheets_gid', value: '1505444998' },
    ],
  });
  console.log('   ✅ System settings seeded.');

  console.log('');
  console.log('🎉 HDA-GO DATABASE SEED COMPLETE (10 REAL CREATORS + CMs)!');
  console.log('========================================================');
  console.log('📧 Login Credentials (password = value of SEED_DEFAULT_PASSWORD env var):');
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
  
  // ── SEED MILESTONE REWARDS ──
  console.log('   🌱 Seeding Milestone Rewards...');
  const milestoneRewards = [
    // GMV Track
    { track: 'GMV', stage: 1, target_value: 1000000.0, reward_name: 'Voucher Shopee 25K', reward_type: 'VOUCHER', reward_value: 25000.0, description: 'Mencapai total GMV Rp 1.000.000' },
    { track: 'GMV', stage: 2, target_value: 5000000.0, reward_name: 'Voucher Shopee 100K', reward_type: 'VOUCHER', reward_value: 100000.0, description: 'Mencapai total GMV Rp 5.000.000' },
    { track: 'GMV', stage: 3, target_value: 25000000.0, reward_name: 'Cash Reward Rp 500K', reward_type: 'CASH', reward_value: 500000.0, description: 'Mencapai total GMV Rp 25.000.000' },
    { track: 'GMV', stage: 4, target_value: 100000000.0, reward_name: 'Eksklusif Partnership HDA', reward_type: 'PERK', reward_value: 0.0, description: 'Mencapai total GMV Rp 100.000.000' },
    
    // ORDERS Track
    { track: 'ORDERS', stage: 1, target_value: 5.0, reward_name: 'Voucher GoPay 50K', reward_type: 'VOUCHER', reward_value: 50000.0, description: 'Mencapai 5 Pesanan Produk' },
    { track: 'ORDERS', stage: 2, target_value: 10.0, reward_name: 'Voucher GoPay 150K', reward_type: 'VOUCHER', reward_value: 150000.0, description: 'Mencapai 10 Pesanan Produk' },
    { track: 'ORDERS', stage: 3, target_value: 25.0, reward_name: 'Cash Reward Rp 300K', reward_type: 'CASH', reward_value: 300000.0, description: 'Mencapai 25 Pesanan Produk' },
    { track: 'ORDERS', stage: 4, target_value: 50.0, reward_name: 'Merchandise Eksklusif HDA GO', reward_type: 'PERK', reward_value: 0.0, description: 'Mencapai 50 Pesanan Produk' },

    // CAMPAIGNS Track
    { track: 'CAMPAIGNS', stage: 1, target_value: 1.0, reward_name: 'Badge Rising Creator', reward_type: 'PERK', reward_value: 0.0, description: 'Mengikuti 1 Kampanye' },
    { track: 'CAMPAIGNS', stage: 2, target_value: 5.0, reward_name: 'Prioritas Kampanye Barter', reward_type: 'PERK', reward_value: 0.0, description: 'Mengikuti 5 Kampanye' },
    { track: 'CAMPAIGNS', stage: 3, target_value: 15.0, reward_name: 'Undangan Creator Gathering', reward_type: 'PERK', reward_value: 0.0, description: 'Mengikuti 15 Kampanye' },
    { track: 'CAMPAIGNS', stage: 4, target_value: 30.0, reward_name: 'Akses Kampanye Retainer', reward_type: 'PERK', reward_value: 0.0, description: 'Mengikuti 30 Kampanye' },

    // CONSISTENCY Track
    { track: 'CONSISTENCY', stage: 1, target_value: 30.0, reward_name: 'Tips Konten Kretif HDA', reward_type: 'PERK', reward_value: 0.0, description: 'Mencapai konsistensi posting 30%' },
    { track: 'CONSISTENCY', stage: 2, target_value: 50.0, reward_name: 'Support Promosi Akun', reward_type: 'PERK', reward_value: 0.0, description: 'Mencapai konsistensi posting 50%' },
    { track: 'CONSISTENCY', stage: 3, target_value: 75.0, reward_name: '1-on-1 Mentoring CM', reward_type: 'PERK', reward_value: 0.0, description: 'Mencapai konsistensi posting 75%' },
    { track: 'CONSISTENCY', stage: 4, target_value: 90.0, reward_name: 'Spotlight Creator of Month', reward_type: 'PERK', reward_value: 0.0, description: 'Mencapai konsistensi posting 90%' },

    // LIVE Track
    { track: 'LIVE', stage: 1, target_value: 1.0, reward_name: 'Live Tools Starter Kit', reward_type: 'PERK', reward_value: 0.0, description: 'Berpartisipasi 1 Sesi LIVE' },
    { track: 'LIVE', stage: 2, target_value: 5.0, reward_name: 'Voucher Giveaway Live 100K', reward_type: 'VOUCHER', reward_value: 100000.0, description: 'Berpartisipasi 5 Sesi LIVE' },
    { track: 'LIVE', stage: 3, target_value: 15.0, reward_name: 'Kolaborasi Live Official HDA', reward_type: 'PERK', reward_value: 0.0, description: 'Berpartisipasi 15 Sesi LIVE' },
    { track: 'LIVE', stage: 4, target_value: 30.0, reward_name: 'Co-Hosting Brand Campaign Live', reward_type: 'PERK', reward_value: 0.0, description: 'Berpartisipasi 30 Sesi LIVE' }
  ];

  const rewardRecords: Record<string, string> = {};
  for (const reward of milestoneRewards) {
    const created = await prisma.milestoneReward.create({
      data: reward
    });
    rewardRecords[`${reward.track}:${reward.stage}`] = created.id;
  }
  console.log('   ✅ Milestone Rewards catalog created.');

  // ── SEED INITIAL CLAIMS FOR ULAN ──
  console.log('   🌱 Seeding Initial Milestone Claims for Ulan...');
  const ulanId = '7145781983607374874';
  
  // Claim GMV Stage 1 (COMPLETED)
  const gmvStage1Id = rewardRecords['GMV:1'];
  if (gmvStage1Id) {
    await prisma.creatorMilestoneClaim.create({
      data: {
        creator_id: ulanId,
        reward_id: gmvStage1Id,
        status: 'COMPLETED',
        claimed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      }
    });
  }

  // Claim CONSISTENCY Stage 1 (COMPLETED)
  const consStage1Id = rewardRecords['CONSISTENCY:1'];
  if (consStage1Id) {
    await prisma.creatorMilestoneClaim.create({
      data: {
        creator_id: ulanId,
        reward_id: consStage1Id,
        status: 'COMPLETED',
        claimed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    });
  }

  // Claim CONSISTENCY Stage 2 (COMPLETED)
  const consStage2Id = rewardRecords['CONSISTENCY:2'];
  if (consStage2Id) {
    await prisma.creatorMilestoneClaim.create({
      data: {
        creator_id: ulanId,
        reward_id: consStage2Id,
        status: 'COMPLETED',
        claimed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    });
  }
  console.log('   ✅ Initial claims for Ulan seeded.');
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
