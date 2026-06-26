require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  FASE 1: FIX CM CODES');
  console.log('═══════════════════════════════════════════\n');

  // ── Step 1: Update old cm_codes ──
  const renames = [
    { email: 'citra@hdago.com', oldCode: 'AZWA', newCode: 'CITRA', name: 'Citra CM' },
    { email: 'novel@hdago.com', oldCode: 'PUTRI', newCode: 'NOVEL', name: 'Novel CM' },
    { email: 'naufal@hdago.com', oldCode: 'ATAR', newCode: 'NAUFAL', name: 'Naufal CM' },
  ];

  console.log('── Step 1: Updating old cm_codes ──');
  for (const r of renames) {
    const user = await prisma.user.findUnique({ where: { email: r.email } });
    if (!user) {
      console.log(`  ❌ User not found: ${r.email}`);
      continue;
    }
    await prisma.user.update({
      where: { email: r.email },
      data: { cm_code: r.newCode },
    });
    console.log(`  ✅ ${r.name}: cm_code "${r.oldCode}" → "${r.newCode}"`);
  }

  // ── Step 2: Set cm_codes for new CMs ──
  const newCodes = [
    { email: 'yusuf@hdago.com', code: 'YUSUF', name: 'Yusuf CM' },
    { email: 'tiara@hdago.com', code: 'TIARA', name: 'Tiara CM' },
    { email: 'gadis@hdago.com', code: 'GADIS', name: 'Gadis CM' },
    { email: 'okta@hdago.com', code: 'OKTA', name: 'Okta CM' },
  ];

  console.log('\n── Step 2: Setting new cm_codes ──');
  for (const n of newCodes) {
    const user = await prisma.user.findUnique({ where: { email: n.email } });
    if (!user) {
      console.log(`  ❌ User not found: ${n.email}`);
      continue;
    }
    await prisma.user.update({
      where: { email: n.email },
      data: { cm_code: n.code },
    });
    console.log(`  ✅ ${n.name}: cm_code NULL → "${n.code}"`);
  }

  // ══════════════════════════════════════════
  // RECHECK 1: Verify all 13 CMs have correct cm_code
  // ══════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════');
  console.log('  RECHECK 1: Verifikasi cm_code semua CM');
  console.log('═══════════════════════════════════════════\n');

  const allCMs = await prisma.user.findMany({
    where: { role: 'CM' },
    select: { id: true, name: true, email: true, cm_code: true },
    orderBy: { name: 'asc' },
  });

  let recheck1Pass = true;
  const expectedCodes = {
    'citra@hdago.com': 'CITRA',
    'rayhaan@hdago.com': 'RAYHAAN',
    'umar@hdago.com': 'UMAR',
    'raysa@hdago.com': 'RAYSA',
    'novel@hdago.com': 'NOVEL',
    'naufal@hdago.com': 'NAUFAL',
    'yusuf@hdago.com': 'YUSUF',
    'amanda@hdago.com': 'AMANDA',
    'tiara@hdago.com': 'TIARA',
    'diya@hdago.com': 'DIYA',
    'gadis@hdago.com': 'GADIS',
    'arinda@hdago.com': 'ARINDA',
    'okta@hdago.com': 'OKTA',
  };

  for (const cm of allCMs) {
    const expected = expectedCodes[cm.email];
    const actual = cm.cm_code;
    const match = actual === expected;
    const icon = match ? '✅' : '❌';
    console.log(`  ${icon} ${cm.name} | ${cm.email} | cm_code: ${actual} ${match ? '' : `(expected: ${expected})`}`);
    if (!match) recheck1Pass = false;
  }

  console.log(`\n  Recheck 1 Result: ${recheck1Pass ? '✅ PASS — All 13 CM codes correct!' : '❌ FAIL — Some CM codes are incorrect!'}`);

  // ══════════════════════════════════════════
  // RECHECK 2: Test matching CM names in Sheet vs cm_code in DB
  // ══════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════');
  console.log('  RECHECK 2: Test matching Sheet CM → DB CM');
  console.log('═══════════════════════════════════════════\n');

  // CM name aliases (as seen in the Google Sheet)
  const sheetCMNames = [
    { sheetName: 'Citra', dbEmail: 'citra@hdago.com' },
    { sheetName: 'Azwa', dbEmail: 'citra@hdago.com' },  // Old alias
    { sheetName: 'Rayhaan', dbEmail: 'rayhaan@hdago.com' },
    { sheetName: 'Raykhaan', dbEmail: 'rayhaan@hdago.com' },  // Alias
    { sheetName: 'Umar', dbEmail: 'umar@hdago.com' },
    { sheetName: 'Raysa', dbEmail: 'raysa@hdago.com' },
    { sheetName: 'Novel', dbEmail: 'novel@hdago.com' },
    { sheetName: 'Putri', dbEmail: 'novel@hdago.com' },  // Old alias
    { sheetName: 'Naufal', dbEmail: 'naufal@hdago.com' },
    { sheetName: 'Atar', dbEmail: 'naufal@hdago.com' },  // Old alias
    { sheetName: 'Yusuf', dbEmail: 'yusuf@hdago.com' },
    { sheetName: 'Amanda', dbEmail: 'amanda@hdago.com' },
    { sheetName: 'Tiara', dbEmail: 'tiara@hdago.com' },
    { sheetName: 'Diya', dbEmail: 'diya@hdago.com' },
    { sheetName: 'Gadis', dbEmail: 'gadis@hdago.com' },
    { sheetName: 'Arinda', dbEmail: 'arinda@hdago.com' },
    { sheetName: 'Arin', dbEmail: 'arinda@hdago.com' },  // Alias
    { sheetName: 'Octa', dbEmail: 'okta@hdago.com' },  // Sheet uses "Octa", DB is "Okta"
  ];

  let recheck2Pass = true;
  const cmMap = new Map(allCMs.map(cm => [cm.email, cm]));

  for (const test of sheetCMNames) {
    const dbCM = cmMap.get(test.dbEmail);
    if (!dbCM) {
      console.log(`  ❌ Sheet CM "${test.sheetName}" → DB email ${test.dbEmail} NOT FOUND`);
      recheck2Pass = false;
      continue;
    }

    // The sync service matches by cm_code OR name, case-insensitive
    const matchByCode = dbCM.cm_code && dbCM.cm_code.toLowerCase() === test.sheetName.toLowerCase();
    const matchByName = dbCM.name.toLowerCase().includes(test.sheetName.toLowerCase());
    const matched = matchByCode || matchByName;

    const icon = matched ? '✅' : '⚠';
    const method = matchByCode ? 'cm_code' : (matchByName ? 'name' : 'NO MATCH');
    console.log(`  ${icon} Sheet "${test.sheetName}" → ${dbCM.name} (${dbCM.cm_code}) [matched by: ${method}]`);
    
    if (!matched) recheck2Pass = false;
  }

  console.log(`\n  Recheck 2 Result: ${recheck2Pass ? '✅ PASS — All Sheet CM names can be matched!' : '⚠ PARTIAL — Some names only match by fallback'}`);

  console.log('\n═══════════════════════════════════════════');
  console.log('  FASE 1 COMPLETE');
  console.log('═══════════════════════════════════════════');

  await prisma.$disconnect();
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
