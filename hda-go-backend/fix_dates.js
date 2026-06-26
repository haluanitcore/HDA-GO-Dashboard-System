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

// Indonesian month parser
const BULAN_MAP = {
  'januari': 0, 'februari': 1, 'maret': 2, 'april': 3,
  'mei': 4, 'juni': 5, 'juli': 6, 'agustus': 7,
  'september': 8, 'oktober': 9, 'november': 10, 'desember': 11,
};

function parseIndonesianDate(raw) {
  if (!raw || raw.trim() === '' || raw.trim() === '-') return null;
  const cleaned = raw.trim();
  
  // "10 Juli 2026" or "30 Oktober 2026"
  const match = cleaned.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/);
  if (match) {
    const day = parseInt(match[1]);
    const monthName = match[2].toLowerCase();
    const year = parseInt(match[3]);
    const month = BULAN_MAP[monthName];
    if (month !== undefined) {
      return new Date(year, month, day);
    }
  }
  
  // DD/MM/YYYY
  const ddmmyyyy = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    return new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
  }
  
  // Try native
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d;
  return null;
}

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

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  FIX DATES: Update Start Date & Expired Date');
  console.log('═══════════════════════════════════════════════════\n');

  // Download sheet
  const url = `${SHEET_URL}/export?format=csv&gid=${SHEET_GID}`;
  const response = await fetch(url);
  const csvContent = await response.text();
  const rows = parseCSV(csvContent);
  const headers = rows[0];
  const headerLower = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  console.log('Headers:', headers.slice(0, 13).join(' | '));

  // Find expired date column
  const expiredIdx = headerLower.findIndex(h => h.includes('expired'));
  const usernameIdx = headerLower.findIndex(h => h.includes('creatorusername') || h.includes('username'));
  const creatorIdIdx = headerLower.findIndex(h => h.includes('creatorid'));
  
  console.log(`Expired idx: ${expiredIdx}, Username idx: ${usernameIdx}, CreatorID idx: ${creatorIdIdx}`);

  // Build map: username/creatorCode → expired date
  const expiredMap = new Map(); // tiktok_username (lowercase) → Date
  const expiredByCode = new Map(); // creator_code → Date
  
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    const username = usernameIdx !== -1 ? (cols[usernameIdx] || '').trim().replace(/^@/, '').toLowerCase() : '';
    const creatorCode = creatorIdIdx !== -1 ? (cols[creatorIdIdx] || '').trim() : '';
    const expiredRaw = expiredIdx !== -1 ? (cols[expiredIdx] || '').trim() : '';
    
    const expDate = parseIndonesianDate(expiredRaw);
    
    if (expDate) {
      if (username) expiredMap.set(username, expDate);
      if (creatorCode) expiredByCode.set(creatorCode, expDate);
    }
  }
  
  console.log(`\nExpired dates parsed: ${expiredMap.size} by username, ${expiredByCode.size} by code\n`);

  // Get all creators
  const creators = await prisma.creator.findMany({
    select: {
      user_id: true,
      tiktok_username: true,
      creator_code: true,
      start_date: true,
      end_date: true,
    },
  });

  let updatedStartDate = 0;
  let updatedEndDate = 0;
  const defaultStartDate = new Date(2026, 0, 1); // 1 Jan 2026

  for (const creator of creators) {
    const updates = {};
    
    // Fix Start Date: if null, set to 1 Jan 2026
    if (!creator.start_date) {
      updates.start_date = defaultStartDate;
      updatedStartDate++;
    }
    
    // Fix End Date: if null, try to get from sheet
    if (!creator.end_date) {
      let expDate = null;
      if (creator.tiktok_username) {
        expDate = expiredMap.get(creator.tiktok_username.toLowerCase());
      }
      if (!expDate && creator.creator_code) {
        expDate = expiredByCode.get(creator.creator_code);
      }
      if (expDate) {
        updates.end_date = expDate;
        updatedEndDate++;
      } else {
        // Default: 31 Dec 2026
        updates.end_date = new Date(2026, 11, 31);
        updatedEndDate++;
      }
    }
    
    if (Object.keys(updates).length > 0) {
      await prisma.creator.update({
        where: { user_id: creator.user_id },
        data: updates,
      });
    }
  }

  console.log(`✅ Updated Start Date: ${updatedStartDate} creators (set to 1 Jan 2026)`);
  console.log(`✅ Updated End Date: ${updatedEndDate} creators (from sheet or default 31 Dec 2026)\n`);

  // Now re-parse existing end_dates that were NULL, using the Indonesian format
  // Also fix any existing creators whose end_date is set but expired date in sheet is different
  const creatorsWithEndDate = await prisma.creator.findMany({
    select: { user_id: true, tiktok_username: true, creator_code: true, end_date: true },
  });
  
  let fixedExpired = 0;
  for (const creator of creatorsWithEndDate) {
    let sheetExpDate = null;
    if (creator.tiktok_username) {
      sheetExpDate = expiredMap.get(creator.tiktok_username.toLowerCase());
    }
    if (!sheetExpDate && creator.creator_code) {
      sheetExpDate = expiredByCode.get(creator.creator_code);
    }
    
    if (sheetExpDate && creator.end_date) {
      const dbDate = new Date(creator.end_date);
      // If dates differ significantly (more than 1 day), update from sheet
      if (Math.abs(dbDate.getTime() - sheetExpDate.getTime()) > 86400000) {
        await prisma.creator.update({
          where: { user_id: creator.user_id },
          data: { end_date: sheetExpDate },
        });
        fixedExpired++;
      }
    }
  }
  console.log(`✅ Corrected End Date from sheet: ${fixedExpired} creators\n`);

  // ── VERIFY ──
  console.log('═══════════════════════════════════════════════════');
  console.log('  VERIFICATION');
  console.log('═══════════════════════════════════════════════════\n');
  
  const total = await prisma.creator.count();
  const withStart = await prisma.creator.count({ where: { start_date: { not: null } } });
  const withEnd = await prisma.creator.count({ where: { end_date: { not: null } } });
  
  console.log(`  Total creators: ${total}`);
  console.log(`  With Start Date: ${withStart}/${total}`);
  console.log(`  With End Date: ${withEnd}/${total}`);
  console.log(`  Result: ${withStart === total && withEnd === total ? '✅ ALL DATES FILLED' : '⚠ Some dates still missing'}`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
