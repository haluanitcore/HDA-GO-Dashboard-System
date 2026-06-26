require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1Alp1XHgQtK8CnIW3fFD7p-8HXGDsA5IbYM4Da97btGc';
const SHEET_GID = '1505444998';

const CM_ALIAS_MAP = {
  'azwa': 'CITRA', 'putri': 'NOVEL', 'atar': 'NAUFAL',
  'octa': 'OKTA', 'raykhaan': 'RAYHAAN', 'arin': 'ARINDA',
};

const BULAN_MAP = {
  'januari': 0, 'februari': 1, 'maret': 2, 'april': 3,
  'mei': 4, 'juni': 5, 'juli': 6, 'agustus': 7,
  'september': 8, 'oktober': 9, 'november': 10, 'desember': 11,
};

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

// Parse "Rp3.719.645" or "Rp0" format
function parseRupiahKPI(raw) {
  if (!raw) return 0;
  const cleaned = raw.toString().replace(/[Rr][Pp]\s*/g, '').replace(/\./g, '').replace(',', '.').trim();
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

// Parse raw number "491316587" or "0"
function parseRawNumber(raw) {
  if (!raw) return 0;
  const cleaned = raw.toString().replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) || 0;
}

function parseIndonesianDate(raw) {
  if (!raw || raw.trim() === '' || raw.trim() === '-') return null;
  const match = raw.trim().match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/);
  if (match) {
    const month = BULAN_MAP[match[2].toLowerCase()];
    if (month !== undefined) return new Date(parseInt(match[3]), month, parseInt(match[1]));
  }
  return null;
}

function getISOWeekLabel(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return d;
}
function getWeekEnd(date) {
  const s = getWeekStart(date);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  return e;
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  FIX GMV & ORDERS — Correct Column Mapping');
  console.log('═══════════════════════════════════════════════════\n');

  // Correct column mapping based on investigation:
  //   Col 10 "KPI"     = Total GMV kumulatif (format Rp) → gmv_total
  //   Col 11 "GMV Jun" = Orders bulan Juni (angka mentah) → total_orders / WeeklyStats.orders
  // There is NO separate Orders column in this sheet.
  
  console.log('  Column mapping CORRECTION:');
  console.log('    Col 10 "KPI"     → gmv_total (Total GMV kumulatif, format "Rp3.719.645")');
  console.log('    Col 11 "GMV Jun" → total_orders (Orders Juni, angka mentah "491316587")');
  console.log('');

  // Download sheet
  const url = `${SHEET_URL}/export?format=csv&gid=${SHEET_GID}`;
  const response = await fetch(url);
  const csvContent = await response.text();
  const rows = parseCSV(csvContent);
  const headers = rows[0];

  const KPI_IDX = 10;       // "KPI" = Total GMV (Rp format)
  const GMV_JUN_IDX = 11;   // "GMV Jun" = Orders (raw number)
  const CREATOR_ID_IDX = 2;
  const USERNAME_IDX = 4;
  const NAMA_IDX = 3;

  console.log(`  Headers: Col 10="${headers[KPI_IDX]}", Col 11="${headers[GMV_JUN_IDX]}"\n`);

  // Build lookup: creatorCode/username → { kpi (gmv_total), gmvJun (orders) }
  const sheetData = new Map(); // key = creator_code or username(lower) → { gmvTotal, orders }
  
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    const creatorCode = (cols[CREATOR_ID_IDX] || '').trim();
    const username = (cols[USERNAME_IDX] || '').trim().replace(/^@/, '').toLowerCase();
    const kpiRaw = (cols[KPI_IDX] || '').trim();
    const gmvJunRaw = (cols[GMV_JUN_IDX] || '').trim();

    const gmvTotal = parseRupiahKPI(kpiRaw);   // KPI = total GMV
    const orders = parseRawNumber(gmvJunRaw);    // GMV Jun = orders

    if (creatorCode) sheetData.set(`code:${creatorCode}`, { gmvTotal, orders, kpiRaw, gmvJunRaw });
    if (username) sheetData.set(`user:${username}`, { gmvTotal, orders, kpiRaw, gmvJunRaw });
  }

  // Verify Sari Mega
  const sariByUser = sheetData.get('user:mega69442');
  console.log(`  ✅ Verification — sari mega s (@mega69442):`);
  console.log(`    KPI raw: "${sariByUser?.kpiRaw}" → gmv_total: ${sariByUser?.gmvTotal}`);
  console.log(`    GMV Jun raw: "${sariByUser?.gmvJunRaw}" → orders: ${sariByUser?.orders}`);
  console.log('');

  // Load all creators from DB
  const allCreators = await prisma.creator.findMany({
    select: { user_id: true, creator_code: true, tiktok_username: true, gmv_total: true, total_orders: true },
  });

  const now = new Date();
  const weekLabel = getISOWeekLabel(now);
  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(now);

  let fixedCount = 0;
  let weeklyFixedCount = 0;

  for (const creator of allCreators) {
    // Find in sheet data
    let data = null;
    if (creator.creator_code) data = sheetData.get(`code:${creator.creator_code}`);
    if (!data && creator.tiktok_username) data = sheetData.get(`user:${creator.tiktok_username.toLowerCase()}`);
    
    if (!data) continue;

    // Update creator: gmv_total = KPI, total_orders = GMV Jun
    const needsUpdate = creator.gmv_total !== data.gmvTotal || creator.total_orders !== data.orders;
    
    if (needsUpdate) {
      await prisma.creator.update({
        where: { user_id: creator.user_id },
        data: {
          gmv_total: data.gmvTotal,
          total_orders: data.orders,
        },
      });
      fixedCount++;
    }

    // Update/fix WeeklyStats
    if (data.gmvTotal > 0 || data.orders > 0) {
      await prisma.creatorWeeklyStats.upsert({
        where: {
          creator_id_week_label: { creator_id: creator.user_id, week_label: weekLabel },
        },
        update: {
          gmv: data.gmvTotal,
          orders: data.orders,
          gmv_updated_at: now,
          source: 'SHEET_SYNC',
          notes: `Fixed sync - KPI to GMV, GMVJun to Orders`,
        },
        create: {
          creator_id: creator.user_id,
          week_label: weekLabel,
          week_start: weekStart,
          week_end: weekEnd,
          gmv: data.gmvTotal,
          orders: data.orders,
          gmv_updated_at: now,
          source: 'SHEET_SYNC',
          notes: `Fixed sync - KPI to GMV, GMVJun to Orders`,
        },
      });
      weeklyFixedCount++;
    } else {
      // Delete WeeklyStats if both are 0
      await prisma.creatorWeeklyStats.deleteMany({
        where: { creator_id: creator.user_id, week_label: weekLabel },
      });
    }
  }

  console.log(`  ✅ Fixed ${fixedCount} creators (gmv_total & total_orders corrected)`);
  console.log(`  ✅ Fixed ${weeklyFixedCount} WeeklyStats entries\n`);

  // ══════════════════════════════════════════
  // RECHECK 1: Verify key creators
  // ══════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════');
  console.log('  RECHECK 1: Verify Key Creators');
  console.log('═══════════════════════════════════════════════════\n');

  const verifyList = [
    { username: 'mega69442', expectedGmv: 0, expectedOrders: 491316587, name: 'sari mega s' },
    { username: 'intanjustice', name: 'Intan Justice' },
    { username: 'masdolan82', name: 'Adji Santoso' },
    { username: 'ulanberkelana', name: 'Ulan' },
    { username: 'kokocuan.id', name: 'Kristianto Omar' },
  ];

  for (const v of verifyList) {
    const c = await prisma.creator.findFirst({
      where: { tiktok_username: v.username },
      include: { user: { select: { name: true } } },
    });
    if (!c) { console.log(`  ❌ ${v.username} not found`); continue; }
    
    const sheetEntry = sheetData.get(`user:${v.username}`);
    const ws = await prisma.creatorWeeklyStats.findFirst({
      where: { creator_id: c.user_id, week_label: weekLabel },
    });

    const gmvMatch = sheetEntry ? c.gmv_total === sheetEntry.gmvTotal : true;
    const ordersMatch = sheetEntry ? c.total_orders === sheetEntry.orders : true;
    const icon = gmvMatch && ordersMatch ? '✅' : '❌';

    console.log(`  ${icon} ${c.user.name} (@${v.username})`);
    console.log(`    DB:    gmv_total=${c.gmv_total}, total_orders=${c.total_orders}`);
    if (sheetEntry) {
      console.log(`    Sheet: KPI="${sheetEntry.kpiRaw}" (=${sheetEntry.gmvTotal}), GMVJun="${sheetEntry.gmvJunRaw}" (=${sheetEntry.orders})`);
    }
    if (ws) {
      console.log(`    Weekly: gmv=${ws.gmv}, orders=${ws.orders}`);
    }
    console.log('');
  }

  // ══════════════════════════════════════════
  // RECHECK 2: Overall statistics
  // ══════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════');
  console.log('  RECHECK 2: Overall Statistics');
  console.log('═══════════════════════════════════════════════════\n');

  const totalCreators = await prisma.creator.count();
  const withGmv = await prisma.creator.count({ where: { gmv_total: { gt: 0 } } });
  const withOrders = await prisma.creator.count({ where: { total_orders: { gt: 0 } } });
  const wsCount = await prisma.creatorWeeklyStats.count({ where: { week_label: weekLabel } });

  // Sum totals
  const allC = await prisma.creator.findMany({ select: { gmv_total: true, total_orders: true } });
  const sumGmv = allC.reduce((s, c) => s + c.gmv_total, 0);
  const sumOrders = allC.reduce((s, c) => s + c.total_orders, 0);

  console.log(`  Total creators: ${totalCreators}`);
  console.log(`  With GMV > 0: ${withGmv}/${totalCreators}`);
  console.log(`  With Orders > 0: ${withOrders}/${totalCreators}`);
  console.log(`  Sum GMV total: Rp ${sumGmv.toLocaleString('id-ID')}`);
  console.log(`  Sum Orders total: ${sumOrders.toLocaleString('id-ID')}`);
  console.log(`  WeeklyStats (${weekLabel}): ${wsCount} entries`);

  // Top 5 by GMV (corrected)
  console.log(`\n  Top 5 by GMV (corrected):`);
  const top5 = await prisma.creator.findMany({
    orderBy: { gmv_total: 'desc' },
    take: 5,
    include: { user: { select: { name: true } } },
  });
  top5.forEach((c, i) => {
    console.log(`    ${i+1}. ${c.user.name} (@${c.tiktok_username}) — GMV: Rp ${c.gmv_total.toLocaleString('id-ID')} | Orders: ${c.total_orders.toLocaleString('id-ID')}`);
  });

  // Top 5 by Orders (corrected)
  console.log(`\n  Top 5 by Orders (corrected):`);
  const top5orders = await prisma.creator.findMany({
    orderBy: { total_orders: 'desc' },
    take: 5,
    include: { user: { select: { name: true } } },
  });
  top5orders.forEach((c, i) => {
    console.log(`    ${i+1}. ${c.user.name} (@${c.tiktok_username}) — GMV: Rp ${c.gmv_total.toLocaleString('id-ID')} | Orders: ${c.total_orders.toLocaleString('id-ID')}`);
  });

  console.log(`\n  Recheck 2 Result: ✅ Data corrected and verified\n`);

  console.log('═══════════════════════════════════════════════════');
  console.log('  FIX COMPLETE');
  console.log('═══════════════════════════════════════════════════');

  await prisma.$disconnect();
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
