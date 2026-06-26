require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1Alp1XHgQtK8CnIW3fFD7p-8HXGDsA5IbYM4Da97btGc';
const SHEET_GID = '1505444998';

function parseCSV(csv) {
  const rows = [];
  let currentRow = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (ch === '"') {
      if (inQuotes && csv[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      currentRow.push(current); current = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      currentRow.push(current); current = '';
      if (currentRow.some(c => c.trim())) rows.push(currentRow);
      currentRow = [];
      if (ch === '\r' && csv[i + 1] === '\n') i++;
    } else { current += ch; }
  }
  if (current || currentRow.length > 0) {
    currentRow.push(current);
    if (currentRow.some(c => c.trim())) rows.push(currentRow);
  }
  return rows;
}

function parseRupiahKPI(raw) {
  if (!raw) return 0;
  const cleaned = raw.toString().replace(/[Rr][Pp]\s*/g, '').replace(/\./g, '').replace(',', '.').trim();
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

function parseRawNumber(raw) {
  if (!raw) return 0;
  const cleaned = raw.toString().replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) || 0;
}

async function main() {
  console.log('============================================');
  console.log('  FIX gmv_monthly — Reset to correct values');
  console.log('============================================\n');

  // Download sheet
  const url = `${SHEET_URL}/export?format=csv&gid=${SHEET_GID}`;
  const response = await fetch(url);
  const csvContent = await response.text();
  const rows = parseCSV(csvContent);

  // Col K (10) = KPI = GMV Juni (Rp format) -> gmv_monthly should use this
  // Col L (11) = GMV Jun = Total Orders (raw number)
  const KPI_IDX = 10;
  const GMV_JUN_IDX = 11;
  const CREATOR_ID_IDX = 2;
  const USERNAME_IDX = 4;

  // Build lookup
  const sheetData = new Map();
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    const creatorCode = (cols[CREATOR_ID_IDX] || '').trim();
    const username = (cols[USERNAME_IDX] || '').trim().replace(/^@/, '').toLowerCase();
    const kpiRaw = (cols[KPI_IDX] || '').trim();
    const gmvJunRaw = (cols[GMV_JUN_IDX] || '').trim();

    const gmvJuni = parseRupiahKPI(kpiRaw);     // KPI = GMV Juni
    const totalOrders = parseRawNumber(gmvJunRaw); // GMV Jun = Total Orders

    if (creatorCode) sheetData.set(`code:${creatorCode}`, { gmvJuni, totalOrders, kpiRaw, gmvJunRaw });
    if (username) sheetData.set(`user:${username}`, { gmvJuni, totalOrders, kpiRaw, gmvJunRaw });
  }

  // Load all creators
  const allCreators = await prisma.creator.findMany({
    include: { user: { select: { name: true } } },
  });

  let fixedCount = 0;
  let negativeFixed = 0;

  for (const creator of allCreators) {
    let data = null;
    if (creator.creator_code) data = sheetData.get(`code:${creator.creator_code}`);
    if (!data && creator.tiktok_username) data = sheetData.get(`user:${creator.tiktok_username.toLowerCase()}`);

    // gmv_monthly should be = GMV Juni from KPI column
    // This is the MONTHLY GMV that the dashboard shows
    const correctGmvMonthly = data ? data.gmvJuni : 0;
    const correctTotalOrders = data ? data.totalOrders : 0;

    const wasNegative = creator.gmv_monthly < 0;
    const needsUpdate = creator.gmv_monthly !== correctGmvMonthly ||
                        creator.gmv_total !== correctGmvMonthly ||
                        creator.total_orders !== correctTotalOrders;

    if (needsUpdate) {
      await prisma.creator.update({
        where: { user_id: creator.user_id },
        data: {
          gmv_monthly: correctGmvMonthly,  // Fix: set to KPI value (not increment)
          gmv_total: correctGmvMonthly,     // Also ensure gmv_total matches
          total_orders: correctTotalOrders,  // Also ensure total_orders matches
        },
      });
      fixedCount++;
      if (wasNegative) {
        negativeFixed++;
        console.log(`  Fixed NEGATIVE: ${creator.user.name} (@${creator.tiktok_username}) was ${creator.gmv_monthly} -> now ${correctGmvMonthly}`);
      }
    }
  }

  console.log(`\n  Total fixed: ${fixedCount}`);
  console.log(`  Negative values fixed: ${negativeFixed}\n`);

  // ── VERIFY ──
  console.log('=== VERIFICATION ===\n');

  const negativeCheck = await prisma.creator.count({ where: { gmv_monthly: { lt: 0 } } });
  console.log(`  Creators with negative gmv_monthly: ${negativeCheck} ${negativeCheck === 0 ? '(PASS)' : '(FAIL)'}`);

  // Check specific creators from screenshot
  const verify = ['ulanberkelana', 'mega69442', 'intanjustice', 'masdolan82'];
  for (const uname of verify) {
    const c = await prisma.creator.findFirst({
      where: { tiktok_username: uname },
      include: { user: { select: { name: true } } },
    });
    if (c) {
      const s = sheetData.get(`user:${uname}`);
      console.log(`  ${c.user.name} (@${uname}): gmv_monthly=${c.gmv_monthly}, gmv_total=${c.gmv_total}, orders=${c.total_orders} | Sheet KPI=${s?.kpiRaw || 'N/A'}`);
    }
  }

  // Check Rayhaan CM total (from screenshot)
  const rayhaanCM = await prisma.user.findFirst({ where: { cm_code: 'RAYHAAN' } });
  if (rayhaanCM) {
    const rayCreators = await prisma.creator.findMany({ where: { cm_id: rayhaanCM.id } });
    const totalGmv = rayCreators.reduce((s, c) => s + c.gmv_monthly, 0);
    console.log(`\n  Rayhaan CM total gmv_monthly: Rp ${totalGmv.toLocaleString('id-ID')} (should be positive)`);
    console.log(`  Rayhaan CM creators: ${rayCreators.length}`);
  }

  console.log('\n============================================');
  console.log('  FIX COMPLETE');
  console.log('============================================');

  await prisma.$disconnect();
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
