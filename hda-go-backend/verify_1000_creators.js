require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ACTIVE_CM_CODES = [
  'AMANDA', 'ARINDA', 'CITRA', 'DIYA', 'GADIS', 'NAUFAL',
  'NOVEL', 'OKTA', 'RAYHAAN', 'RAYSA', 'TIARA', 'UMAR', 'YUSUF'
];

const EXPECTED_CM_TARGETS = {
  'AMANDA': 77, 'ARINDA': 77, 'CITRA': 77, 'DIYA': 77, 'GADIS': 77, 'NAUFAL': 77,
  'NOVEL': 77, 'OKTA': 77, 'RAYHAAN': 77, 'RAYSA': 77, 'TIARA': 77, 'UMAR': 77,
  'YUSUF': 76
};

async function main() {
  console.log('=== VERIFYING 1,000 CREATORS DATABASE INTEGRITY ===\n');

  let hasErrors = false;

  // 1. Check total creators count in DB (only @creator.com)
  const dbCreatorCount = await prisma.creator.count({
    where: {
      user: {
        email: {
          endsWith: '@creator.com'
        }
      }
    }
  });
  console.log(`1. Total @creator.com creators in database: ${dbCreatorCount}`);
  if (dbCreatorCount !== 1000) {
    console.error(`   ❌ FAIL: Expected exactly 1,000 @creator.com creators in database, found ${dbCreatorCount}`);
    hasErrors = true;
  } else {
    console.log(`   ✅ PASS: Exactly 1,000 @creator.com creators in database.`);
  }

  // 2. Check CM distribution (only @creator.com)
  console.log('\n2. Verifying CM distribution (only @creator.com):');
  const cms = await prisma.user.findMany({ where: { role: 'CM' } });
  const cmByCode = new Map(cms.map(cm => [cm.cm_code, cm]));
  
  let distributionOk = true;
  for (const code of ACTIVE_CM_CODES) {
    const cm = cmByCode.get(code);
    if (!cm) {
      console.error(`   ❌ FAIL: CM ${code} not found in database.`);
      hasErrors = true;
      distributionOk = false;
      continue;
    }
    const count = await prisma.creator.count({
      where: {
        cm_id: cm.id,
        user: {
          email: {
            endsWith: '@creator.com'
          }
        }
      }
    });
    const expected = EXPECTED_CM_TARGETS[code];
    if (count !== expected) {
      console.error(`   ❌ FAIL: CM ${cm.name} (${code}) has ${count} creators, expected ${expected}`);
      hasErrors = true;
      distributionOk = false;
    } else {
      console.log(`   ✅ PASS: CM ${cm.name} (${code}) has ${count}/${expected} creators.`);
    }
  }
  
    const unassigned = await prisma.creator.count({
      where: {
        cm_id: null,
        user: {
          email: {
            endsWith: '@creator.com'
          }
        }
      }
    });
    if (unassigned > 0) {
      console.error(`   ❌ FAIL: Found ${unassigned} @creator.com creators with no CM assigned.`);
      hasErrors = true;
      distributionOk = false;
    }

  if (distributionOk) {
    console.log(`   ✅ PASS: All creators are assigned and distributed exactly as expected (12x77, 1x76).`);
  }

  // 3. Verify created_accounts_1000.json
  console.log('\n3. Verifying created_accounts_1000.json file:');
  const jsonPath = path.join(__dirname, 'created_accounts_1000.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`   ❌ FAIL: created_accounts_1000.json not found.`);
    hasErrors = true;
  } else {
    const accounts = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`   JSON has ${accounts.length} accounts.`);
    if (accounts.length !== 1000) {
      console.error(`   ❌ FAIL: Expected exactly 1,000 accounts in JSON, found ${accounts.length}`);
      hasErrors = true;
    } else {
      console.log(`   ✅ PASS: JSON has exactly 1,000 accounts.`);
      
      // 4. Verify password authentication for all 1,000 accounts
      console.log('\n4. Verifying credentials authentication (bcrypt matches):');
      let passAuthCount = 0;
      let failAuthCount = 0;
      
      for (const acc of accounts) {
        const user = await prisma.user.findUnique({ where: { email: acc.email.toLowerCase().trim() } });
        if (!user) {
          failAuthCount++;
          continue;
        }
        const match = await bcrypt.compare(acc.password.trim(), user.password);
        if (match) {
          passAuthCount++;
        } else {
          failAuthCount++;
        }
      }
      
      console.log(`   Authenticated PASS : ${passAuthCount}/1000`);
      if (failAuthCount > 0) {
        console.error(`   ❌ FAIL: ${failAuthCount} accounts failed authentication check.`);
        hasErrors = true;
      } else {
        console.log(`   ✅ PASS: All 1,000 creator accounts authenticated successfully!`);
      }
    }
  }

  // 5. Final verdict
  console.log('\n' + '='.repeat(50));
  if (hasErrors) {
    console.error('❌ VERIFICATION COMPLETED WITH ERRORS!');
    process.exit(1);
  } else {
    console.log('🎉 VERIFICATION COMPLETED SUCCESSFULLY! ALL 1,000 CREATORS ARE INTEGRAL!');
    process.exit(0);
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
