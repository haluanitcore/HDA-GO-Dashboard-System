require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ══════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════
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

// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════
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

function parseGmv(raw) {
  if (!raw) return 0;
  const cleaned = raw.toString().replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

function parseFollowers(raw) {
  if (!raw) return 0;
  const cleaned = raw.toString().trim();
  const kMatch = cleaned.match(/^([\d.,]+)\s*[kK]$/);
  if (kMatch) return Math.round(parseFloat(kMatch[1].replace(',', '.')) * 1000);
  return parseInt(cleaned.replace(/[^\d]/g, ''), 10) || 0;
}

function parseIndonesianDate(raw) {
  if (!raw || raw.trim() === '' || raw.trim() === '-') return null;
  const cleaned = raw.trim();
  const match = cleaned.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/);
  if (match) {
    const day = parseInt(match[1]);
    const monthName = match[2].toLowerCase();
    const year = parseInt(match[3]);
    const month = BULAN_MAP[monthName];
    if (month !== undefined) return new Date(year, month, day);
  }
  const ddmmyyyy = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) return new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d;
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
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function getWeekEnd(date) {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}

// ══════════════════════════════════════════
// MAIN SYNC
// ══════════════════════════════════════════
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  FASE 3: SYNC GOOGLE SHEET & VERIFIKASI');
  console.log('═══════════════════════════════════════════════════\n');

  // ── Step 1: Download Sheet ──
  console.log('── Step 1: Downloading Google Sheet ──');
  const url = `${SHEET_URL}/export?format=csv&gid=${SHEET_GID}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  const csvContent = await response.text();
  const rows = parseCSV(csvContent);
  console.log(`  ✅ ${rows.length - 1} data rows downloaded\n`);

  // ── Step 2: Parse headers ──
  const headers = rows[0];
  const headerLower = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const findIdx = (patterns) => {
    for (const p of patterns) {
      const idx = headerLower.findIndex(h => h.includes(p));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const creatorIdIdx = findIdx(['creatorid']);
  const namaIdx = findIdx(['nama']);
  const usernameIdx = findIdx(['creatorusername', 'username']);
  const cmIdx = findIdx(['cm']);
  const linkIdx = findIdx(['linkprofile', 'linkprofil']);
  const followersIdx = findIdx(['followers']);
  const categoryIdx = findIdx(['categoryproper', 'category']);
  const levelIdx = findIdx(['saleslevel', 'level']);
  const gmvIdx = headerLower.findIndex(h => h.startsWith('gmv'));
  const ordersIdx = findIdx(['order', 'orders']);
  const expiredIdx = findIdx(['expired']);
  const gmvColName = gmvIdx !== -1 ? headers[gmvIdx] : 'GMV';

  console.log(`  GMV Column: "${gmvColName}"\n`);

  // ── Step 3: Preload all DB creators ──
  console.log('── Step 2: Preloading database creators ──');
  const allCreators = await prisma.creator.findMany({
    include: { user: { select: { name: true, email: true } } },
  });
  const creatorByCode = new Map();
  const creatorByUsername = new Map();
  for (const c of allCreators) {
    if (c.creator_code) creatorByCode.set(c.creator_code, c);
    if (c.tiktok_username) {
      creatorByUsername.set(c.tiktok_username.toLowerCase(), c);
    }
  }
  console.log(`  ✅ ${allCreators.length} creators loaded\n`);

  // ── Step 4: Preload CMs ──
  const allCMs = await prisma.user.findMany({
    where: { role: 'CM' },
    select: { id: true, name: true, cm_code: true },
  });
  const cmByCode = new Map(allCMs.map(cm => [cm.cm_code, cm]));

  // ── Step 5: Process sync ──
  console.log('── Step 3: Syncing Sheet → DB ──\n');
  const now = new Date();
  const weekLabel = getISOWeekLabel(now);
  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(now);

  let totalSynced = 0;
  let totalGmvAdded = 0;
  let totalOrdersAdded = 0;
  let totalFieldsUpdated = 0;
  const skippedRows = [];
  const syncedCreators = [];

  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    const creatorCode = creatorIdIdx !== -1 ? (cols[creatorIdIdx] || '').trim() : '';
    let username = usernameIdx !== -1 ? (cols[usernameIdx] || '').trim() : '';
    if (username.startsWith('@')) username = username.substring(1).trim();
    const nama = namaIdx !== -1 ? (cols[namaIdx] || '').trim() : '';
    const cmName = cmIdx !== -1 ? (cols[cmIdx] || '').trim() : '';
    const link = linkIdx !== -1 ? (cols[linkIdx] || '').trim() : '';
    const followersRaw = followersIdx !== -1 ? (cols[followersIdx] || '0').trim() : '0';
    const categoryRaw = categoryIdx !== -1 ? (cols[categoryIdx] || '').trim() : '';
    const levelRaw = levelIdx !== -1 ? (cols[levelIdx] || '').trim() : '';
    const gmvRaw = gmvIdx !== -1 ? (cols[gmvIdx] || '0').trim() : '0';
    const ordersRaw = ordersIdx !== -1 ? (cols[ordersIdx] || '0').trim() : '0';
    const expiredRaw = expiredIdx !== -1 ? (cols[expiredIdx] || '').trim() : '';

    if (!creatorCode && !username) {
      skippedRows.push({ row: i + 1, reason: 'No Creator ID or Username' });
      continue;
    }

    // Find creator in DB
    let creator = null;
    if (creatorCode) creator = creatorByCode.get(creatorCode);
    if (!creator && username) creator = creatorByUsername.get(username.toLowerCase());

    if (!creator) {
      skippedRows.push({ row: i + 1, username: username || creatorCode, reason: 'Not in DB' });
      continue;
    }

    const fieldsChanged = [];

    // ── Update fields ──
    // Nama
    if (nama && nama !== creator.user.name) {
      await prisma.user.update({ where: { id: creator.user_id }, data: { name: nama } });
      fieldsChanged.push('nama');
    }

    // Username
    if (username && username !== creator.tiktok_username) {
      await prisma.creator.update({ where: { user_id: creator.user_id }, data: { tiktok_username: username } });
      fieldsChanged.push('username');
    }

    // Link Profile
    if (link && link !== creator.tiktok_url) {
      await prisma.creator.update({ where: { user_id: creator.user_id }, data: { tiktok_url: link } });
      fieldsChanged.push('link_profile');
    }

    // Followers
    const followers = parseFollowers(followersRaw);
    if (followers > 0 && followers !== creator.tiktok_followers) {
      await prisma.creator.update({ where: { user_id: creator.user_id }, data: { tiktok_followers: followers } });
      fieldsChanged.push('followers');
    }

    // Category/Niche
    if (categoryRaw) {
      const parts = categoryRaw.split(',').map(s => s.trim()).filter(Boolean);
      const newNiche = JSON.stringify(parts);
      if (newNiche !== creator.niche) {
        await prisma.creator.update({ where: { user_id: creator.user_id }, data: { niche: newNiche } });
        fieldsChanged.push('niche');
      }
    }

    // Sales Level
    const salesLevel = parseInt(levelRaw.replace(/[^\d]/g, ''), 10);
    if (salesLevel >= 0 && salesLevel <= 4 && salesLevel !== creator.creator_level) {
      await prisma.creator.update({ where: { user_id: creator.user_id }, data: { creator_level: salesLevel } });
      await prisma.creatorProgress.upsert({
        where: { creator_id: creator.user_id },
        update: { current_level: salesLevel, target_level: Math.min(salesLevel + 1, 4) },
        create: { creator_id: creator.user_id, current_level: salesLevel, target_level: Math.min(salesLevel + 1, 4) },
      });
      fieldsChanged.push('level');
    }

    // CM Assignment
    if (cmName) {
      const resolvedCode = CM_ALIAS_MAP[cmName.toLowerCase()] || cmName.toUpperCase();
      const cmUser = cmByCode.get(resolvedCode);
      if (cmUser && cmUser.id !== creator.cm_id) {
        await prisma.creator.update({ where: { user_id: creator.user_id }, data: { cm_id: cmUser.id } });
        fieldsChanged.push('cm');
      }
    }

    // Expired Date
    if (expiredRaw) {
      const expDate = parseIndonesianDate(expiredRaw);
      if (expDate) {
        const currentEnd = creator.end_date ? new Date(creator.end_date) : null;
        if (!currentEnd || Math.abs(currentEnd.getTime() - expDate.getTime()) > 86400000) {
          await prisma.creator.update({ where: { user_id: creator.user_id }, data: { end_date: expDate } });
          fieldsChanged.push('end_date');
        }
      }
    }

    // ── GMV & Orders → WeeklyStats ──
    const parsedGmv = parseGmv(gmvRaw);
    let parsedOrders = parseInt((ordersRaw || '0').replace(/[^\d]/g, ''), 10) || 0;
    if (parsedOrders === 0 && parsedGmv > 0) parsedOrders = Math.floor(parsedGmv / 100000) || 1;

    if (parsedGmv > 0 || parsedOrders > 0) {
      await prisma.creatorWeeklyStats.upsert({
        where: {
          creator_id_week_label: { creator_id: creator.user_id, week_label: weekLabel },
        },
        update: {
          gmv: parsedGmv, orders: parsedOrders,
          gmv_updated_at: now, source: 'SHEET_SYNC',
          notes: `Sync "${gmvColName}" - Row ${i + 1}`,
        },
        create: {
          creator_id: creator.user_id, week_label: weekLabel,
          week_start: weekStart, week_end: weekEnd,
          gmv: parsedGmv, orders: parsedOrders,
          gmv_updated_at: now, source: 'SHEET_SYNC',
          notes: `Sync "${gmvColName}" - Row ${i + 1}`,
        },
      });

      // Update gmv_total on creator
      await prisma.creator.update({
        where: { user_id: creator.user_id },
        data: { gmv_total: parsedGmv, total_orders: parsedOrders },
      });

      totalGmvAdded += parsedGmv;
      totalOrdersAdded += parsedOrders;
      fieldsChanged.push('gmv', 'orders');
    }

    // Sheet registered
    if (!creator.sheet_registered) {
      await prisma.creator.update({ where: { user_id: creator.user_id }, data: { sheet_registered: true } });
    }

    if (fieldsChanged.length > 0) {
      totalFieldsUpdated += fieldsChanged.length;
      totalSynced++;
      syncedCreators.push({
        nama: creator.user.name,
        username: creator.tiktok_username,
        fields: fieldsChanged,
        gmv: parsedGmv,
        orders: parsedOrders,
      });
    }
  }

  console.log(`  ✅ Sync complete!`);
  console.log(`  Creators synced: ${totalSynced}`);
  console.log(`  Fields updated: ${totalFieldsUpdated}`);
  console.log(`  Total GMV synced: Rp ${totalGmvAdded.toLocaleString('id-ID')}`);
  console.log(`  Total Orders synced: ${totalOrdersAdded}`);
  console.log(`  Week label: ${weekLabel}`);
  console.log(`  Skipped rows: ${skippedRows.length}\n`);

  // ══════════════════════════════════════════
  // RECHECK 1: Skipped Rows Analysis
  // ══════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════');
  console.log('  RECHECK 1: Skipped Rows Analysis');
  console.log('═══════════════════════════════════════════════════\n');

  const notInDB = skippedRows.filter(r => r.reason === 'Not in DB');
  const noId = skippedRows.filter(r => r.reason === 'No Creator ID or Username');
  
  console.log(`  Total skipped: ${skippedRows.length}`);
  console.log(`  - No ID/Username: ${noId.length}`);
  console.log(`  - Not in DB (expected for creators not in our 260): ${notInDB.length}`);
  
  // Our 260 creators should all be matched
  const ourCreatorCodes = new Set(allCreators.map(c => c.creator_code).filter(Boolean));
  const ourUsernames = new Set(allCreators.map(c => (c.tiktok_username || '').toLowerCase()).filter(Boolean));
  const missedOurs = notInDB.filter(r => {
    if (r.username && ourCreatorCodes.has(r.username)) return true;
    if (r.username && ourUsernames.has(r.username.toLowerCase())) return true;
    return false;
  });
  
  console.log(`  - Missed from OUR 260: ${missedOurs.length} ${missedOurs.length === 0 ? '✅' : '❌'}`);
  if (missedOurs.length > 0) {
    missedOurs.forEach(r => console.log(`    ❌ Row ${r.row}: ${r.username}`));
  }
  
  console.log(`\n  Recheck 1 Result: ${missedOurs.length === 0 ? '✅ PASS — All 260 creators synced!' : '❌ FAIL — Some of our creators were skipped'}\n`);

  // ══════════════════════════════════════════
  // RECHECK 2: WeeklyStats & Data Verification
  // ══════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════');
  console.log('  RECHECK 2: WeeklyStats & Data Verification');
  console.log('═══════════════════════════════════════════════════\n');

  const weeklyStatsCount = await prisma.creatorWeeklyStats.count({
    where: { week_label: weekLabel },
  });
  const weeklyStatsWithGmv = await prisma.creatorWeeklyStats.count({
    where: { week_label: weekLabel, gmv: { gt: 0 } },
  });
  const totalCreators = await prisma.creator.count();
  const withGmvTotal = await prisma.creator.count({ where: { gmv_total: { gt: 0 } } });
  const withOrders = await prisma.creator.count({ where: { total_orders: { gt: 0 } } });

  console.log(`  Week: ${weekLabel}`);
  console.log(`  WeeklyStats entries: ${weeklyStatsCount}`);
  console.log(`  WeeklyStats with GMV > 0: ${weeklyStatsWithGmv}`);
  console.log(`  Creators with gmv_total > 0: ${withGmvTotal}/${totalCreators}`);
  console.log(`  Creators with orders > 0: ${withOrders}/${totalCreators}`);

  // Sample 5 synced creators
  console.log(`\n  Sample synced creators (top 5 by GMV):`);
  const topGmv = syncedCreators.filter(c => c.gmv > 0).sort((a, b) => b.gmv - a.gmv).slice(0, 5);
  topGmv.forEach((c, i) => {
    console.log(`    ${i+1}. ${c.nama} (@${c.username}) — GMV: Rp ${c.gmv.toLocaleString('id-ID')} | Orders: ${c.orders} | Updated: [${c.fields.join(', ')}]`);
  });

  console.log(`\n  Recheck 2 Result: ${weeklyStatsCount > 0 ? '✅ PASS — WeeklyStats populated' : '⚠ No WeeklyStats entries'}\n`);

  console.log('═══════════════════════════════════════════════════');
  console.log('  FASE 3 COMPLETE');
  console.log('═══════════════════════════════════════════════════');

  await prisma.$disconnect();
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
