const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { resolve } = require('path');
const bcrypt = require('bcryptjs');

const dbPath = resolve(__dirname, 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await bcrypt.hash('HdaGo123!', 12);
  console.log('🌱 Registering "Andreas" accounts for all roles...');

  // 1. Andreas 1 - Admin
  await upsertUser({
    id: 'andreas-admin-uuid',
    name: 'Andreas 1 - Admin',
    email: 'andreas.admin@hdago.com',
    password,
    role: 'ADMIN'
  });

  // 2. Andreas 2 - Executive
  await upsertUser({
    id: 'andreas-exec-uuid',
    name: 'Andreas 2 - Executive',
    email: 'andreas.exec@hdago.com',
    password,
    role: 'EXECUTIVE'
  });

  // 3. Andreas 3 - BD
  await upsertUser({
    id: 'andreas-bd-uuid',
    name: 'Andreas 3 - BD',
    email: 'andreas.bd@hdago.com',
    password,
    role: 'BD'
  });

  // 4. Andreas 4 - CM
  const cmUser = await upsertUser({
    id: 'andreas-cm-uuid',
    name: 'Andreas 4 - CM',
    email: 'andreas.cm@hdago.com',
    password,
    role: 'CM'
  });

  // 5. Andreas 5 - Brand
  await upsertUser({
    id: 'andreas-brand-uuid',
    name: 'Andreas 5 - Brand',
    email: 'andreas.brand@brand.com',
    password,
    role: 'BRAND'
  });

  // 6. Andreas 6 - Creator
  const creatorUser = await upsertUser({
    id: 'andreas-creator-uuid',
    name: 'Andreas 6 - Creator',
    email: 'andreas.creator@creator.com',
    password,
    role: 'CREATOR'
  });

  if (creatorUser) {
    // Find a CM to guide him
    const cm = await prisma.user.findFirst({ where: { role: 'CM' } });
    const cmId = cm ? cm.id : cmUser.id;

    // Create Creator biodata record
    const creatorRecord = await prisma.creator.upsert({
      where: { user_id: creatorUser.id },
      update: {
        cm_id: cmId,
      },
      create: {
        user_id: creatorUser.id,
        creator_level: 1, // Start at level 1 (Silver) for testing ease
        gmv_total: 2500000,
        gmv_monthly: 2500000,
        total_orders: 22,
        cm_id: cmId,
        phone_number: '+628999999999',
        gender: 'MALE',
        birth_date: new Date('2000-01-01'),
        domicile: 'Jakarta',
        tiktok_username: 'andreas_creator',
        tiktok_followers: 12500,
        niche: '["FNB","TECH"]',
        affiliate_exp: 'AKTIF',
        sow_per_month: 4,
        gmv_target_monthly: 10000000,
        onboarding_status: 'ACTIVE'
      }
    });

    // Create CreatorProgress record
    await prisma.creatorProgress.upsert({
      where: { creator_id: creatorUser.id },
      update: {},
      create: {
        creator_id: creatorUser.id,
        current_level: 1,
        target_level: 2,
        progress_percentage: 33.3,
        gmv_progress: 2500000,
        campaign_progress: 2,
        order_progress: 22
      }
    });

    console.log('   ✅ Creator biodata and progress entries configured successfully.');
  }

  // 7. Andreas 7 - QC
  await upsertUser({
    id: 'andreas-qc-uuid',
    name: 'Andreas 7 - QC',
    email: 'andreas.qc@hdago.com',
    password,
    role: 'QC'
  });

  console.log('🎉 All "Andreas" accounts created successfully!');
  await prisma.$disconnect();
}

async function upsertUser(data) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email }
  });

  if (existing) {
    console.log(`   - Account ${data.name} (${data.email}) already exists.`);
    return existing;
  } else {
    const user = await prisma.user.create({ data });
    console.log(`   - Successfully created account ${data.name} (${data.email}) [Role: ${data.role}]`);
    return user;
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
