require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ══════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════
const CREATORS_PER_CM = 20;
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1Alp1XHgQtK8CnIW3fFD7p-8HXGDsA5IbYM4Da97btGc';
const SHEET_GID = '1505444998';

// CM alias map: sheet name (lowercase) → DB cm_code
const CM_ALIAS_MAP = {
  'azwa': 'CITRA',
  'putri': 'NOVEL',
  'atar': 'NAUFAL',
  'octa': 'OKTA',
  'raykhaan': 'RAYHAAN',
  'arin': 'ARINDA',
};

// Active CM codes
const ACTIVE_CM_CODES = [
  'CITRA', 'RAYHAAN', 'UMAR', 'RAYSA', 'NOVEL', 'NAUFAL',
  'YUSUF', 'AMANDA', 'TIARA', 'DIYA', 'GADIS', 'ARINDA', 'OKTA'
];

// ══════════════════════════════════════════
// CSV PARSER
// ══════════════════════════════════════════
function parseCSV(csv) {
  const rows = [];
  let currentRow = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (ch === '"') {
      if (inQuotes && csv[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      currentRow.push(current);
      current = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      currentRow.push(current);
      current = '';
      if (currentRow.some(c => c.trim())) rows.push(currentRow);
      currentRow = [];
      if (ch === '\r' && csv[i + 1] === '\n') i++;
    } else {
      current += ch;
    }
  }
  if (current || currentRow.length > 0) {
    currentRow.push(current);
    if (currentRow.some(c => c.trim())) rows.push(currentRow);
  }
  return rows;
}

// ══════════════════════════════════════════
// DATE PARSER
// ══════════════════════════════════════════
function parseDate(raw) {
  if (!raw || raw.trim() === '' || raw.trim() === '-') return null;
  const cleaned = raw.trim();
  
  // Try DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const d = new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
    if (!isNaN(d.getTime())) return d;
  }
  
  // Try YYYY-MM-DD
  const yyyymmdd = cleaned.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (yyyymmdd) {
    const d = new Date(parseInt(yyyymmdd[1]), parseInt(yyyymmdd[2]) - 1, parseInt(yyyymmdd[3]));
    if (!isNaN(d.getTime())) return d;
  }

  // Try native Date parse
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d;
  
  return null;
}

// ══════════════════════════════════════════
// GMV PARSER
// ══════════════════════════════════════════
function parseGmv(raw) {
  if (!raw) return 0;
  const cleaned = raw.toString().replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

// ══════════════════════════════════════════
// FOLLOWERS PARSER
// ══════════════════════════════════════════
function parseFollowers(raw) {
  if (!raw) return 0;
  const cleaned = raw.toString().trim();
  // Handle "67.1K" format
  const kMatch = cleaned.match(/^([\d.,]+)\s*[kK]$/);
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1].replace(',', '.')) * 1000);
  }
  // Handle "1.163" (European format with dots as thousand separators)
  const numStr = cleaned.replace(/[^\d]/g, '');
  return parseInt(numStr, 10) || 0;
}

// ══════════════════════════════════════════
// NICHE PARSER
// ══════════════════════════════════════════
function parseNiche(raw) {
  if (!raw) return null;
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  return JSON.stringify(parts);
}

// ══════════════════════════════════════════
// LEVEL PARSER
// ══════════════════════════════════════════
function parseLevel(raw) {
  if (!raw) return 1;
  const num = parseInt(raw.toString().replace(/[^\d]/g, ''), 10);
  if (num >= 0 && num <= 4) return num;
  return 1;
}

// ══════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  FASE 2: POPULATE 260 CREATOR FROM GOOGLE SHEET');
  console.log('═══════════════════════════════════════════════════\n');

  // ── Step 1: Download Google Sheet ──
  console.log('── Step 1: Downloading Google Sheet CSV ──');
  const url = `${SHEET_URL}/export?format=csv&gid=${SHEET_GID}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Sheet download failed: ${response.status}`);
  const csvContent = await response.text();
  const rows = parseCSV(csvContent);
  console.log(`  ✅ Downloaded ${rows.length - 1} data rows\n`);

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

  const fenoyIdx = findIdx(['fenoy']);
  const expiredIdx = findIdx(['tanggalexpired', 'expired']);
  const creatorIdIdx = findIdx(['creatorid']);
  const namaIdx = findIdx(['nama']);
  const usernameIdx = findIdx(['creatorusername', 'username']);
  const cmIdx = findIdx(['cm']);
  const linkIdx = findIdx(['linkprofile', 'linkprofil']);
  const followersIdx = findIdx(['followers', 'follower']);
  const categoryIdx = findIdx(['categoryproper', 'category']);
  const levelIdx = findIdx(['saleslevel', 'level']);
  const gmvIdx = headerLower.findIndex(h => h.startsWith('gmv'));
  const ordersIdx = findIdx(['order', 'orders']);
  const gmvColName = gmvIdx !== -1 ? headers[gmvIdx] : 'GMV';

  console.log(`  GMV Column: "${gmvColName}" (idx: ${gmvIdx})`);

  // ── Step 3: Get all CMs from DB ──
  console.log('\n── Step 2: Loading CMs from database ──');
  const allCMs = await prisma.user.findMany({
    where: { role: 'CM' },
    select: { id: true, name: true, email: true, cm_code: true },
  });
  const cmByCode = new Map(allCMs.map(cm => [cm.cm_code, cm]));
  console.log(`  ✅ Loaded ${allCMs.length} CMs\n`);

  // ── Step 4: Get existing creators ──
  console.log('── Step 3: Loading existing creators ──');
  const existingCreators = await prisma.creator.findMany({
    include: { user: { select: { name: true, email: true } } },
  });
  const existingUsernames = new Set(existingCreators.map(c => (c.tiktok_username || '').toLowerCase()));
  const existingCreatorCodes = new Set(existingCreators.map(c => c.creator_code).filter(Boolean));
  const existingEmails = new Set((await prisma.user.findMany({ select: { email: true } })).map(u => u.email.toLowerCase()));
  console.log(`  ✅ ${existingCreators.length} creators already exist\n`);

  // ── Step 5: Group sheet data by CM ──
  console.log('── Step 4: Grouping sheet data by CM ──');
  const cmCreatorData = {}; // cm_code → [creator data]
  
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    const cmName = cmIdx !== -1 ? (cols[cmIdx] || '').trim() : '';
    if (!cmName) continue;

    // Resolve CM code
    const resolvedCode = CM_ALIAS_MAP[cmName.toLowerCase()] || cmName.toUpperCase();
    if (!ACTIVE_CM_CODES.includes(resolvedCode)) continue;

    const username = usernameIdx !== -1 ? (cols[usernameIdx] || '').trim().replace(/^@/, '') : '';
    const nama = namaIdx !== -1 ? (cols[namaIdx] || '').trim() : '';
    const creatorCode = creatorIdIdx !== -1 ? (cols[creatorIdIdx] || '').trim() : '';
    const fenoy = fenoyIdx !== -1 ? (cols[fenoyIdx] || '').trim() : '';
    const expired = expiredIdx !== -1 ? (cols[expiredIdx] || '').trim() : '';
    const link = linkIdx !== -1 ? (cols[linkIdx] || '').trim() : '';
    const followersRaw = followersIdx !== -1 ? (cols[followersIdx] || '0').trim() : '0';
    const category = categoryIdx !== -1 ? (cols[categoryIdx] || '').trim() : '';
    const levelRaw = levelIdx !== -1 ? (cols[levelIdx] || '').trim() : '';
    const gmvRaw = gmvIdx !== -1 ? (cols[gmvIdx] || '0').trim() : '0';
    const ordersRaw = ordersIdx !== -1 ? (cols[ordersIdx] || '0').trim() : '0';

    // Must have at minimum: username AND creatorCode AND nama
    if (!username || !creatorCode || !nama) continue;

    // Skip if already exists
    if (existingUsernames.has(username.toLowerCase())) continue;
    if (existingCreatorCodes.has(creatorCode)) continue;

    const email = `${username.toLowerCase().replace(/[^a-z0-9._-]/g, '')}@creator.com`;
    if (existingEmails.has(email.toLowerCase())) continue;

    if (!cmCreatorData[resolvedCode]) cmCreatorData[resolvedCode] = [];
    cmCreatorData[resolvedCode].push({
      row: i + 1,
      nama, username, creatorCode, email,
      fenoy, expired, link,
      followers: parseFollowers(followersRaw),
      niche: parseNiche(category),
      level: parseLevel(levelRaw),
      gmv: parseGmv(gmvRaw),
      orders: parseInt((ordersRaw || '0').replace(/[^\d]/g, ''), 10) || 0,
    });
  }

  // Show counts
  let totalAvailable = 0;
  for (const code of ACTIVE_CM_CODES) {
    const count = (cmCreatorData[code] || []).length;
    totalAvailable += count;
    console.log(`  ${code}: ${count} new creators available`);
  }
  console.log(`  Total available: ${totalAvailable}\n`);

  // ── Step 6: Create creators (20 per CM) ──
  console.log('── Step 5: Creating 260 Creator accounts ──\n');
  
  let globalCounter = 0; // For HDA-XXXX password
  let totalCreated = 0;
  const createdAccounts = []; // For reporting

  for (const cmCode of ACTIVE_CM_CODES) {
    const cmUser = cmByCode.get(cmCode);
    if (!cmUser) {
      console.log(`  ❌ CM ${cmCode} not found in DB, skipping`);
      continue;
    }

    const available = cmCreatorData[cmCode] || [];
    const toCreate = available.slice(0, CREATORS_PER_CM);
    
    // Count existing creators for this CM
    const existingForCM = existingCreators.filter(c => c.cm_id === cmUser.id).length;
    const needed = CREATORS_PER_CM - existingForCM;
    const actualToCreate = toCreate.slice(0, Math.max(needed, 0));

    console.log(`  📋 ${cmUser.name} (${cmCode}): existing=${existingForCM}, creating=${actualToCreate.length}/${needed} needed`);

    for (const creator of actualToCreate) {
      globalCounter++;
      const passwordPlain = `HDA-${String(globalCounter).padStart(4, '0')}`;
      const passwordHash = await bcrypt.hash(passwordPlain, 12);

      try {
        // Check email doesn't exist (double check)
        const emailExists = await prisma.user.findUnique({ where: { email: creator.email } });
        if (emailExists) {
          console.log(`    ⚠ Email ${creator.email} already exists, skipping`);
          continue;
        }

        // Check creator_code doesn't exist
        if (creator.creatorCode) {
          const codeExists = await prisma.creator.findUnique({ where: { creator_code: creator.creatorCode } });
          if (codeExists) {
            console.log(`    ⚠ Creator code ${creator.creatorCode} already exists, skipping`);
            continue;
          }
        }

        // Create User
        const newUser = await prisma.user.create({
          data: {
            name: creator.nama,
            email: creator.email,
            password: passwordHash,
            role: 'CREATOR',
          },
        });

        // Create Creator profile
        await prisma.creator.create({
          data: {
            user_id: newUser.id,
            creator_code: creator.creatorCode || null,
            creator_level: creator.level,
            gmv_total: creator.gmv,
            cm_id: cmUser.id,
            sheet_registered: true,
            tiktok_username: creator.username,
            tiktok_url: creator.link || `https://www.tiktok.com/@${creator.username}`,
            tiktok_followers: creator.followers,
            niche: creator.niche,
            start_date: parseDate(creator.fenoy),
            end_date: parseDate(creator.expired),
            onboarding_status: 'ACTIVE',
            onboarded_at: new Date(),
          },
        });

        // Create CreatorProgress
        await prisma.creatorProgress.create({
          data: {
            creator_id: newUser.id,
            current_level: creator.level,
            target_level: Math.min(creator.level + 1, 4),
            gmv_progress: creator.gmv,
          },
        });

        totalCreated++;
        createdAccounts.push({
          no: globalCounter,
          nama: creator.nama,
          username: creator.username,
          email: creator.email,
          password: passwordPlain,
          cm: cmUser.name,
          cmCode: cmCode,
          level: creator.level,
          followers: creator.followers,
          niche: creator.niche,
          gmv: creator.gmv,
        });

        if (totalCreated % 10 === 0) {
          console.log(`    ✅ Progress: ${totalCreated} creators created...`);
        }

      } catch (err) {
        console.log(`    ❌ Error creating ${creator.username}: ${err.message}`);
      }
    }
  }

  console.log(`\n  ✅ Total created: ${totalCreated} new creators\n`);

  // ── Save accounts list to JSON for later use ──
  const fs = require('fs');
  fs.writeFileSync(
    'created_accounts.json',
    JSON.stringify(createdAccounts, null, 2),
    'utf8'
  );
  console.log('  ✅ Account list saved to created_accounts.json\n');

  // ══════════════════════════════════════════
  // RECHECK 1: Count creators per CM
  // ══════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════');
  console.log('  RECHECK 1: Creator count per CM');
  console.log('═══════════════════════════════════════════════════\n');

  let recheck1Pass = true;
  let totalInDB = 0;
  for (const cmCode of ACTIVE_CM_CODES) {
    const cmUser = cmByCode.get(cmCode);
    if (!cmUser) continue;
    const count = await prisma.creator.count({ where: { cm_id: cmUser.id } });
    totalInDB += count;
    const icon = count >= CREATORS_PER_CM ? '✅' : '⚠';
    console.log(`  ${icon} ${cmUser.name} (${cmCode}): ${count} creators ${count >= CREATORS_PER_CM ? '' : `(target: ${CREATORS_PER_CM})`}`);
    if (count < CREATORS_PER_CM) recheck1Pass = false;
  }
  const unassigned = await prisma.creator.count({ where: { cm_id: null } });
  totalInDB += unassigned;
  if (unassigned > 0) console.log(`  ⚠ [Unassigned]: ${unassigned} creators`);
  
  console.log(`\n  Total creators in DB: ${totalInDB}`);
  console.log(`  Recheck 1 Result: ${recheck1Pass ? '✅ PASS — All CMs have ≥20 creators' : '⚠ PARTIAL — Some CMs have fewer than 20'}\n`);

  // ══════════════════════════════════════════
  // RECHECK 2: Data completeness check
  // ══════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════');
  console.log('  RECHECK 2: Data completeness');
  console.log('═══════════════════════════════════════════════════\n');

  const allCreators = await prisma.creator.count();
  const withCreatorCode = await prisma.creator.count({ where: { creator_code: { not: null } } });
  const withTiktokUsername = await prisma.creator.count({ where: { tiktok_username: { not: null } } });
  const withFollowers = await prisma.creator.count({ where: { tiktok_followers: { gt: 0 } } });
  const withNiche = await prisma.creator.count({ where: { niche: { not: null } } });
  const withStartDate = await prisma.creator.count({ where: { start_date: { not: null } } });
  const withEndDate = await prisma.creator.count({ where: { end_date: { not: null } } });
  const sheetRegistered = await prisma.creator.count({ where: { sheet_registered: true } });

  console.log(`  Total creators: ${allCreators}`);
  console.log(`  With Creator Code: ${withCreatorCode}/${allCreators}`);
  console.log(`  With TikTok Username: ${withTiktokUsername}/${allCreators}`);
  console.log(`  With Followers > 0: ${withFollowers}/${allCreators}`);
  console.log(`  With Niche: ${withNiche}/${allCreators}`);
  console.log(`  With Start Date: ${withStartDate}/${allCreators}`);
  console.log(`  With End Date: ${withEndDate}/${allCreators}`);
  console.log(`  Sheet Registered: ${sheetRegistered}/${allCreators}`);

  const completeness = (withCreatorCode + withTiktokUsername + withFollowers + withNiche) / (allCreators * 4) * 100;
  console.log(`\n  Data completeness: ${completeness.toFixed(1)}%`);
  console.log(`  Recheck 2 Result: ${completeness > 90 ? '✅ PASS — Data completeness > 90%' : '⚠ PARTIAL — Some data incomplete'}\n`);

  console.log('═══════════════════════════════════════════════════');
  console.log('  FASE 2 COMPLETE');
  console.log('═══════════════════════════════════════════════════');

  await prisma.$disconnect();
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
