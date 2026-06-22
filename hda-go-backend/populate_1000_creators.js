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

// CM Codes ordered alphabetically for stable target assignment
const ACTIVE_CM_CODES = [
  'AMANDA', 'ARINDA', 'CITRA', 'DIYA', 'GADIS', 'NAUFAL',
  'NOVEL', 'OKTA', 'RAYHAAN', 'RAYSA', 'TIARA', 'UMAR', 'YUSUF'
];

// Target allocation: 12 CMs with 77, 1 CM with 76
const CM_TARGETS = {
  'AMANDA': 77, 'ARINDA': 77, 'CITRA': 77, 'DIYA': 77, 'GADIS': 77, 'NAUFAL': 77,
  'NOVEL': 77, 'OKTA': 77, 'RAYHAAN': 77, 'RAYSA': 77, 'TIARA': 77, 'UMAR': 77,
  'YUSUF': 76
};

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

function parseDate(raw) {
  if (!raw || raw.trim() === '' || raw.trim() === '-') return null;
  const cleaned = raw.trim();
  
  const ddmmyyyy = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const d = new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
    if (!isNaN(d.getTime())) return d;
  }
  
  const yyyymmdd = cleaned.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (yyyymmdd) {
    const d = new Date(parseInt(yyyymmdd[1]), parseInt(yyyymmdd[2]) - 1, parseInt(yyyymmdd[3]));
    if (!isNaN(d.getTime())) return d;
  }

  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d;
  return null;
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
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1].replace(',', '.')) * 1000);
  }
  const numStr = cleaned.replace(/[^\d]/g, '');
  return parseInt(numStr, 10) || 0;
}

function parseNiche(raw) {
  if (!raw) return null;
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  return JSON.stringify(parts);
}

function parseLevel(raw) {
  if (!raw) return 1;
  const num = parseInt(raw.toString().replace(/[^\d]/g, ''), 10);
  if (num >= 0 && num <= 4) return num;
  return 1;
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  SCALING DATABASE TO 1,000 CREATORS');
  console.log('═══════════════════════════════════════════════════\n');

  // --- Step 1: Parse creator_accounts_260.md and clean up extra accounts ---
  const emailsToKeep = new Set();
  const passwordMap = new Map();
  const mdPath = path.join(__dirname, 'creator_accounts_260.md');
  if (fs.existsSync(mdPath)) {
    const mdLines = fs.readFileSync(mdPath, 'utf8').split('\n');
    for (const line of mdLines) {
      if (line.includes('@') && line.includes('|')) {
        const parts = line.split('|').map(s => s.trim());
        if (parts.length > 5) {
          const email = parts[4].toLowerCase().trim();
          const pwd = parts[5].trim();
          if (email.includes('@') && pwd && !pwd.includes('Password')) {
            emailsToKeep.add(email);
            passwordMap.set(email, pwd);
          }
        }
      }
    }
  }
  console.log(`Loaded ${emailsToKeep.size} original emails to keep from creator_accounts_260.md.`);

  const allDbCreatorsBefore = await prisma.creator.findMany({
    include: { user: { select: { email: true } } }
  });

  let deletedCount = 0;
  for (const c of allDbCreatorsBefore) {
    const email = c.user.email.toLowerCase().trim();
    if (!emailsToKeep.has(email)) {
      // Delete child relations first
      await prisma.creatorProgress.deleteMany({ where: { creator_id: c.user_id } });
      await prisma.campaignParticipant.deleteMany({ where: { creator_id: c.user_id } });
      await prisma.submission.deleteMany({ where: { creator_id: c.user_id } });
      await prisma.creatorOrder.deleteMany({ where: { creator_id: c.user_id } });
      await prisma.creatorReward.deleteMany({ where: { creator_id: c.user_id } });
      await prisma.creatorMilestoneClaim.deleteMany({ where: { creator_id: c.user_id } });
      await prisma.creatorMonthlyStats.deleteMany({ where: { creator_id: c.user_id } });
      await prisma.creatorWeeklyStats.deleteMany({ where: { creator_id: c.user_id } });
      await prisma.hotelVisit.deleteMany({ where: { creator_id: c.user_id } });
      await prisma.notification.deleteMany({ where: { user_id: c.user_id } });
      await prisma.userPreferences.deleteMany({ where: { user_id: c.user_id } });
      await prisma.refreshToken.deleteMany({ where: { user_id: c.user_id } });
      await prisma.userActivityLog.deleteMany({ where: { user_id: c.user_id } });
      await prisma.userDailyStat.deleteMany({ where: { user_id: c.user_id } });
      
      // Delete main rows
      await prisma.creator.deleteMany({ where: { user_id: c.user_id } });
      await prisma.user.delete({ where: { id: c.user_id } });
      deletedCount++;
    }
  }
  console.log(`Cleaned up ${deletedCount} temporary creator accounts from previous failed run.\n`);

  // 1. Preload existing CMs
  const cms = await prisma.user.findMany({ where: { role: 'CM' } });
  const cmByCode = new Map(cms.map(cm => [cm.cm_code, cm]));
  const cmById = new Map(cms.map(cm => [cm.id, cm]));
  console.log(`Loaded ${cms.length} CMs from DB.`);

  // 2. Preload existing creators
  const existingCreators = await prisma.creator.findMany({
    include: { user: { select: { name: true, email: true, password: true } } }
  });
  console.log(`Loaded ${existingCreators.length} existing creators from DB.`);

  // Set existing usernames and creator codes
  const existingUsernames = new Set(existingCreators.map(c => (c.tiktok_username || '').toLowerCase()).filter(Boolean));
  const existingCreatorCodes = new Set(existingCreators.map(c => c.creator_code).filter(Boolean));

  // 3. Clean up unassigned creators
  const unassigned = existingCreators.filter(c => !c.cm_id);
  console.log(`Found ${unassigned.length} unassigned creators in DB.`);
  
  const cmCounts = {};
  for (const code of ACTIVE_CM_CODES) {
    const cmUser = cmByCode.get(code);
    if (cmUser) {
      cmCounts[cmUser.id] = existingCreators.filter(c => c.cm_id === cmUser.id).length;
    }
  }

  for (const creator of unassigned) {
    let lowestCmId = null;
    let lowestCount = Infinity;
    for (const code of ACTIVE_CM_CODES) {
      const cmUser = cmByCode.get(code);
      if (cmUser && cmCounts[cmUser.id] < lowestCount) {
        lowestCount = cmCounts[cmUser.id];
        lowestCmId = cmUser.id;
      }
    }
    
    if (lowestCmId) {
      await prisma.creator.update({
        where: { user_id: creator.user_id },
        data: { cm_id: lowestCmId }
      });
      creator.cm_id = lowestCmId;
      cmCounts[lowestCmId]++;
      console.log(`Assigned unassigned creator ${creator.user.email} to CM ${cmById.get(lowestCmId).name}`);
    }
  }

  // 4. Calculate current counts and targets
  const currentTotal = existingCreators.length;
  const targetTotal = 1000;
  const needed = targetTotal - currentTotal;
  console.log(`\nCurrent total creators: ${currentTotal}`);
  console.log(`Target total creators : ${targetTotal}`);
  console.log(`New creators needed   : ${needed}`);

  if (needed <= 0) {
    console.log('Database already has 1,000 or more creators. No action needed.');
    process.exit(0);
  }

  // 5. Download Google Sheet
  console.log('\nDownloading Google Sheet CSV...');
  const url = `${SHEET_URL}/export?format=csv&gid=${SHEET_GID}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  const csvContent = await response.text();
  const rows = parseCSV(csvContent);
  console.log(`Downloaded ${rows.length - 1} rows from sheet.`);

  // Parse headers
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
  const linkIdx = findIdx(['linkprofile', 'linkprofil']);
  const followersIdx = findIdx(['followers', 'follower']);
  const categoryIdx = findIdx(['categoryproper', 'category']);
  const levelIdx = findIdx(['saleslevel', 'level']);
  const gmvIdx = headerLower.findIndex(h => h.startsWith('gmv'));
  const ordersIdx = findIdx(['order', 'orders']);

  // 6. Filter and parse candidates
  const candidates = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
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

    if (!username || !creatorCode || !nama) continue;
    if (existingUsernames.has(username.toLowerCase())) continue;
    if (existingCreatorCodes.has(creatorCode)) continue;

    candidates.push({
      nama,
      username,
      creatorCode,
      fenoy,
      expired,
      link,
      followers: parseFollowers(followersRaw),
      niche: parseNiche(category),
      level: parseLevel(levelRaw),
      gmv: parseGmv(gmvRaw),
      orders: parseInt((ordersRaw || '0').replace(/[^\d]/g, ''), 10) || 0,
      email: `${username.toLowerCase().replace(/[^a-z0-9._-]/g, '')}@creator.com`
    });
  }

  console.log(`Found ${candidates.length} potential new creator candidates.`);

  // 7. Sort candidates: GMV Descending, Orders Descending, Followers Descending
  candidates.sort((a, b) => {
    if (b.gmv !== a.gmv) return b.gmv - a.gmv;
    if (b.orders !== a.orders) return b.orders - a.orders;
    return b.followers - a.followers;
  });

  // 8. Create new accounts and assign to CMs
  let globalCounter = await prisma.user.count({ where: { role: 'CREATOR' } });
  let createdCount = 0;
  const newCreatedAccounts = [];
  
  let candidateIndex = 0;
  while (createdCount < needed && candidateIndex < candidates.length) {
    const creator = candidates[candidateIndex];
    candidateIndex++;

    // Double check email uniqueness
    const existingUser = await prisma.user.findUnique({ where: { email: creator.email } });
    if (existingUser) continue;
    
    // Double check creator_code uniqueness
    if (creator.creatorCode) {
      const existingCode = await prisma.creator.findUnique({ where: { creator_code: creator.creatorCode } });
      if (existingCode) continue;
    }

    globalCounter++;
    const passwordPlain = `HDA-${String(globalCounter).padStart(4, '0')}`;
    const passwordHash = await bcrypt.hash(passwordPlain, 12);

    let selectedCmId = null;
    let maxCapacity = -Infinity;
    
    for (const code of ACTIVE_CM_CODES) {
      const cmUser = cmByCode.get(code);
      if (cmUser) {
        const target = CM_TARGETS[code];
        const current = cmCounts[cmUser.id] || 0;
        const capacity = target - current;
        if (capacity > maxCapacity) {
          maxCapacity = capacity;
          selectedCmId = cmUser.id;
        }
      }
    }

    if (!selectedCmId) {
      console.error('Error: Could not find eligible CM for assignment.');
      break;
    }

    const selectedCm = cmById.get(selectedCmId);

    try {
      // Create User
      const newUser = await prisma.user.create({
        data: {
          name: creator.nama,
          email: creator.email,
          password: passwordHash,
          role: 'CREATOR'
        }
      });

      // Create Creator profile
      await prisma.creator.create({
        data: {
          user_id: newUser.id,
          creator_code: creator.creatorCode || null,
          creator_level: creator.level,
          gmv_total: creator.gmv,
          total_orders: creator.orders,
          cm_id: selectedCmId,
          sheet_registered: true,
          tiktok_username: creator.username,
          tiktok_url: creator.link || `https://www.tiktok.com/@${creator.username}`,
          tiktok_followers: creator.followers,
          niche: creator.niche,
          start_date: parseDate(creator.fenoy),
          end_date: parseDate(creator.expired),
          onboarding_status: 'ACTIVE',
          onboarded_at: new Date()
        }
      });

      // Create CreatorProgress
      await prisma.creatorProgress.create({
        data: {
          creator_id: newUser.id,
          current_level: creator.level,
          target_level: Math.min(creator.level + 1, 4),
          gmv_progress: creator.gmv
        }
      });

      cmCounts[selectedCmId]++;
      createdCount++;

      newCreatedAccounts.push({
        no: globalCounter,
        nama: creator.nama,
        username: creator.username,
        email: creator.email,
        password: passwordPlain,
        cm: selectedCm.name,
        cmCode: selectedCm.cm_code,
        level: creator.level,
        followers: creator.followers,
        niche: creator.niche ? JSON.parse(creator.niche).join(', ') : '',
        gmv: creator.gmv
      });

      if (createdCount % 50 === 0) {
        console.log(`Created ${createdCount}/${needed} creators...`);
      }
    } catch (err) {
      console.error(`Failed to create ${creator.email}:`, err.message);
      globalCounter--;
    }
  }

  console.log(`\nSuccessfully created ${createdCount} new creator accounts in DB.`);

  // 9. Generate the complete list of 1,000 accounts (existing + new)
  const allUpdatedCreators = await prisma.creator.findMany({
    where: {
      user: {
        email: {
          endsWith: '@creator.com'
        }
      }
    },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { user_id: 'asc' }
  });

  const fullAccountsList = [];
  let noCounter = 0;

  for (const c of allUpdatedCreators) {
    noCounter++;
    const cmUser = cmById.get(c.cm_id);
    const email = c.user.email.toLowerCase().trim();
    
    let plainPassword = passwordMap.get(email) || 'HdaGo123!';
    const newAcc = newCreatedAccounts.find(na => na.email.toLowerCase().trim() === email);
    if (newAcc) {
      plainPassword = newAcc.password;
    }

    fullAccountsList.push({
      no: noCounter,
      nama: c.user.name,
      username: c.tiktok_username || '',
      email: c.user.email,
      password: plainPassword,
      cm: cmUser ? cmUser.name : 'No CM assigned',
      cmCode: cmUser ? cmUser.cm_code : 'NULL',
      level: c.creator_level,
      followers: c.tiktok_followers || 0,
      niche: c.niche ? (c.niche.startsWith('[') ? JSON.parse(c.niche).join(', ') : c.niche) : '',
      gmv: c.gmv_total
    });
  }

  // Save the full list as JSON
  fs.writeFileSync(
    'created_accounts_1000.json',
    JSON.stringify(fullAccountsList, null, 2),
    'utf8'
  );
  console.log(`Saved 1000 accounts list to created_accounts_1000.json`);

  // Generate markdown report file creator_accounts_1000.md
  let mdContent = `# Laporan Pembaharuan Database — 1.000 Creator HDA GO\n\n`;
  mdContent += `**Tanggal Generate**: ${new Date().toLocaleDateString('id-ID')}\n\n`;
  mdContent += `## Ringkasan Alokasi CM\n\n`;
  mdContent += `| # | Nama CM | CM Code | Jumlah Creator | Target |\n`;
  mdContent += `|---|---------|---------|----------------|--------|\n`;
  
  let i = 0;
  for (const code of ACTIVE_CM_CODES) {
    i++;
    const cmUser = cmByCode.get(code);
    const count = cmCounts[cmUser.id] || 0;
    mdContent += `| ${i} | ${cmUser.name} | ${code} | ${count} | ${CM_TARGETS[code]} |\n`;
  }
  
  mdContent += `\n---\n\n`;

  // Group by CM in the markdown
  for (const code of ACTIVE_CM_CODES) {
    const cmUser = cmByCode.get(code);
    const cmCreators = fullAccountsList.filter(a => a.cmCode === code);
    
    mdContent += `## ${cmUser.name} (${code}) — ${cmCreators.length} Creator\n\n`;
    mdContent += `| # | Nama | Username TikTok | Email Login | Password | Level | Followers | Niche | GMV |\n`;
    mdContent += `|---|------|----------------|-------------|----------|-------|-----------|-------|-----|\n`;
    
    cmCreators.forEach(c => {
      const lvlStr = c.level === 0 ? 'Lv.0' : c.level === 1 ? 'Lv.1 Bronze' : c.level === 2 ? 'Lv.2 Silver' : c.level === 3 ? 'Lv.3 Gold' : 'Lv.4 Platinum';
      mdContent += `| ${c.no} | ${c.nama} | @${c.username} | ${c.email} | ${c.password} | ${lvlStr} | ${c.followers.toLocaleString('id-ID')} | ${c.niche} | Rp ${c.gmv.toLocaleString('id-ID')} |\n`;
    });
    
    mdContent += `\n---\n\n`;
  }

  fs.writeFileSync('creator_accounts_1000.md', mdContent, 'utf8');
  console.log(`Generated creator_accounts_1000.md successfully.`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
