// ═══════════════════════════════════════════════════════
// HDA GO — Comprehensive Integration Test Script
// Tests all new features from Sheet integration
// ═══════════════════════════════════════════════════════

const BASE = 'http://localhost:4000/api';

async function login(email: string): Promise<string> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'HdaGo123!' }),
  });
  const data = await res.json();
  return data.accessToken;
}

async function api(method: string, path: string, token: string, body?: any) {
  const opts: any = {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text) }; } 
  catch { return { status: res.status, data: text }; }
}

// Test utilities
let passed = 0, failed = 0;
function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  🧪 HDA GO Integration Test Suite');
  console.log('═══════════════════════════════════════════════');
  console.log('');

  // ─────────────────────────────────
  // TEST 1: Login & Auth
  // ─────────────────────────────────
  console.log('📋 TEST 1: Authentication');
  const bdToken = await login('rina@hdago.com');
  assert('BD login success', !!bdToken);

  const cmToken = await login('azwa@hdago.com');
  assert('CM login success', !!cmToken);

  const creatorToken = await login('ulanberkelana@creator.com');
  assert('Creator login success', !!creatorToken);

  const adminToken = await login('admin@hdago.com');
  assert('Admin login success', !!adminToken);

  // ─────────────────────────────────
  // TEST 2: Creator Data — Verify New Fields
  // ─────────────────────────────────
  console.log('');
  console.log('📋 TEST 2: Creator Data — New Fields (creator_code, sheet_registered, end_date)');
  const cmCreators = await api('GET', '/cm/creators', cmToken);
  assert('CM can fetch creators', cmCreators.status === 200);
  
  if (cmCreators.status === 200) {
    const creators = cmCreators.data.creators || [];
    assert('Creators list not empty', creators.length > 0, `Found ${creators.length} creators`);
    
    if (creators.length > 0) {
      const first = creators[0];
      assert('Creator has creator_code field', first.creator_code !== undefined, `creator_code: ${first.creator_code}`);
      assert('Creator has sheet_registered field', first.sheet_registered !== undefined, `sheet_registered: ${first.sheet_registered}`);
      assert('Creator has end_date field', first.end_date !== undefined, `end_date: ${first.end_date}`);
      assert('Creator level >= 1', (first.creator_level || 0) >= 1, `Level: ${first.creator_level}`);
    }
  }

  // ─────────────────────────────────
  // TEST 3: Level System — 4 Levels
  // ─────────────────────────────────
  console.log('');
  console.log('📋 TEST 3: Level System — 4 Levels (1-4)');
  const thresholds = await api('GET', '/levels/thresholds', bdToken);
  assert('Level thresholds endpoint works', thresholds.status === 200);
  
  if (thresholds.status === 200) {
    const levels = thresholds.data;
    assert('Has exactly 4 levels', Array.isArray(levels) && levels.length === 4, `Count: ${levels?.length}`);
    
    if (Array.isArray(levels) && levels.length === 4) {
      assert('Level 1 is Bronze', levels[0].name === 'Bronze' && levels[0].level === 1);
      assert('Level 2 is Silver', levels[1].name === 'Silver' && levels[1].level === 2);
      assert('Level 3 is Gold', levels[2].name === 'Gold' && levels[2].level === 3);
      assert('Level 4 is Platinum', levels[3].name === 'Platinum' && levels[3].level === 4);
      assert('Bronze minGMV is 0', levels[0].minGMV === 0);
      assert('Silver minGMV is 5M', levels[1].minGMV === 5000000);
      assert('Gold minGMV is 25M', levels[2].minGMV === 25000000);
      assert('Platinum minGMV is 100M', levels[3].minGMV === 100000000);
    }
  }

  // ─────────────────────────────────
  // TEST 4: Google Sheet Sync — 12 Columns
  // ─────────────────────────────────
  console.log('');
  console.log('📋 TEST 4: Google Sheet Sync — 12 Column Integration');
  const syncResult = await api('POST', '/bd/creators/sync-spreadsheet', bdToken);
  assert('Sync endpoint responds', syncResult.status === 200 || syncResult.status === 201);
  
  if (syncResult.status === 200 || syncResult.status === 201) {
    const sr = syncResult.data;
    assert('Response has success flag', sr.success === true);
    assert('Response has sync_info', !!sr.sync_info, JSON.stringify(sr.sync_info));
    assert('sync_info has week_label', !!sr.sync_info?.week_label, `week: ${sr.sync_info?.week_label}`);
    assert('sync_info has gmv_column_name', !!sr.sync_info?.gmv_column_name, `column: ${sr.sync_info?.gmv_column_name}`);
    assert('sync_info has synced_at', !!sr.sync_info?.synced_at);
    assert('Response has summary', !!sr.summary);
    assert('Summary has total_rows_processed', typeof sr.summary?.total_rows_processed === 'number', `rows: ${sr.summary?.total_rows_processed}`);
    assert('Summary has total_updated_creators', typeof sr.summary?.total_updated_creators === 'number', `updated: ${sr.summary?.total_updated_creators}`);
    assert('Response has updated_creators array', Array.isArray(sr.updated_creators));
    assert('Response has skipped_rows array', Array.isArray(sr.skipped_rows));
    
    // Check fieldsChanged per creator
    if (sr.updated_creators && sr.updated_creators.length > 0) {
      const first = sr.updated_creators[0];
      assert('Updated creator has fieldsChanged', Array.isArray(first.fieldsChanged), `fields: ${first.fieldsChanged?.join(', ')}`);
      assert('Updated creator has gmvAdded', typeof first.gmvAdded === 'number');
      assert('Updated creator has ordersAdded', typeof first.ordersAdded === 'number');
    }
    
    console.log(`  📊 Sync Summary: ${sr.summary?.total_updated_creators} updated, ${sr.skipped_rows?.length} skipped`);
  }

  // ─────────────────────────────────
  // TEST 5: Weekly Stats Endpoint
  // ─────────────────────────────────
  console.log('');
  console.log('📋 TEST 5: Weekly Stats Endpoint');
  const weeklyStats = await api('GET', '/bd/creators/weekly-stats', bdToken);
  assert('Weekly stats endpoint works', weeklyStats.status === 200);
  
  if (weeklyStats.status === 200) {
    assert('Response has stats array', Array.isArray(weeklyStats.data.stats));
    assert('Response has available_weeks', Array.isArray(weeklyStats.data.available_weeks));
    
    if (weeklyStats.data.stats.length > 0) {
      const stat = weeklyStats.data.stats[0];
      assert('Stat has week_label', !!stat.week_label);
      assert('Stat has gmv', typeof stat.gmv === 'number');
      assert('Stat has orders', typeof stat.orders === 'number');
      assert('Stat has creator relation', !!stat.creator);
      console.log(`  📊 First stat: ${stat.week_label}, GMV: ${stat.gmv}, Creator: ${stat.creator?.user?.name}`);
    }
  }

  // ─────────────────────────────────
  // TEST 6: Unregistered Creators
  // ─────────────────────────────────
  console.log('');
  console.log('📋 TEST 6: Unregistered Creators Endpoint');
  const unreg = await api('GET', '/bd/creators/unregistered', bdToken);
  assert('Unregistered creators endpoint works', unreg.status === 200);
  
  if (unreg.status === 200) {
    assert('Response has total count', typeof unreg.data.total === 'number', `total: ${unreg.data.total}`);
    assert('Response has creators array', Array.isArray(unreg.data.creators));
    console.log(`  📊 Unregistered creators: ${unreg.data.total}`);
  }

  // ─────────────────────────────────
  // TEST 7: Weekly Sync Reminder
  // ─────────────────────────────────
  console.log('');
  console.log('📋 TEST 7: Weekly Sync Reminder (Admin only)');
  const reminder = await api('POST', '/bd/creators/send-sync-reminder', adminToken);
  assert('Sync reminder endpoint works', reminder.status === 200 || reminder.status === 201);
  
  if (reminder.status === 200 || reminder.status === 201) {
    assert('Reminder sent successfully', reminder.data.success === true);
    assert('Notified BD users', typeof reminder.data.notified === 'number', `notified: ${reminder.data.notified}`);
    assert('Has week label', !!reminder.data.week);
  }

  // ─────────────────────────────────
  // TEST 8: Creator Overview — Level Display
  // ─────────────────────────────────
  console.log('');
  console.log('📋 TEST 8: Creator Dashboard — Level & Progress');
  const overview = await api('GET', '/creators/dashboard', creatorToken);
  assert('Creator dashboard endpoint works', overview.status === 200);
  
  if (overview.status === 200) {
    const dash = overview.data;
    assert('Dashboard has profile', !!dash.profile);
    assert('Profile level >= 1', (dash.profile?.creator_level || 0) >= 1, `Level: ${dash.profile?.creator_level}`);
    assert('Dashboard has levelProgress', !!dash.levelProgress);
  }

  // ─────────────────────────────────
  // TEST 9: CM Onboard with creator_code
  // ─────────────────────────────────
  console.log('');
  console.log('📋 TEST 9: CM Onboard Creator with Creator ID');
  const onboardResult = await api('POST', '/cm/creators/onboard', cmToken, {
    name: 'Test Creator Baru',
    email: `testcreator_${Date.now()}@test.com`,
    phone_number: '08123456789',
    gender: 'FEMALE',
    domicile: 'Bandung',
    creator_code: `${Date.now()}`,
    tiktok_username: `testcreator_${Date.now()}`,
    tiktok_url: 'https://www.tiktok.com/@testcreator_baru',
    tiktok_followers: 500,
    avg_views: 200,
    niche: ['FNB', 'BEAUTY'],
    affiliate_exp: 'BARU',
    sow_per_month: 4,
    gmv_target_monthly: 2000000,
    start_date: '2026-06-01',
    end_date: '2026-12-31',
  });
  assert('Onboard with creator_code works', onboardResult.status === 200 || onboardResult.status === 201, `Status: ${onboardResult.status}, Body: ${JSON.stringify(onboardResult.data).substring(0, 200)}`);

  if (onboardResult.status === 200 || onboardResult.status === 201) {
    // Verify the created creator has creator_code
    const allCreators = await api('GET', '/cm/creators', cmToken);
    if (allCreators.status === 200) {
      const newCreator = (allCreators.data.creators || []).find((c: any) => c.user?.name === 'Test Creator Baru');
      assert('New creator found', !!newCreator, newCreator ? `Found: ${newCreator.user?.name}` : 'Not found');
      assert('New creator has creator_code set', !!newCreator?.creator_code);
      assert('New creator is sheet_registered', newCreator?.sheet_registered === true);
      assert('New creator default level is 1', newCreator?.creator_level === 1, `Level: ${newCreator?.creator_level}`);
    }
  }

  // ─────────────────────────────────
  // TEST 10: CM Onboard WITHOUT creator_code (optional)
  // ─────────────────────────────────
  console.log('');
  console.log('📋 TEST 10: CM Onboard Creator WITHOUT Creator ID (Optional)');
  const ts2 = Date.now();
  const onboardNoCode = await api('POST', '/cm/creators/onboard', cmToken, {
    name: 'Creator Tanpa ID',
    email: `notanpaid_${ts2}@test.com`,
    phone_number: '08999888777',
    gender: 'MALE',
    domicile: 'Jakarta',
    tiktok_username: `tanpaid_${ts2}`,
    tiktok_followers: 100,
    niche: ['TRAVEL'],
    affiliate_exp: 'BARU',
    sow_per_month: 2,
    gmv_target_monthly: 1000000,
  });
  assert('Onboard without creator_code works', onboardNoCode.status === 200 || onboardNoCode.status === 201, `Status: ${onboardNoCode.status}, Body: ${JSON.stringify(onboardNoCode.data).substring(0, 200)}`);

  if (onboardNoCode.status === 200 || onboardNoCode.status === 201) {
    const allCreators = await api('GET', '/cm/creators', cmToken);
    if (allCreators.status === 200) {
      const noCodeCreator = (allCreators.data.creators || []).find((c: any) => c.tiktok_username === 'tanpaid_creator');
      assert('Creator without code exists', !!noCodeCreator);
      assert('Creator without code has null creator_code', noCodeCreator?.creator_code === null);
      assert('Creator without code sheet_registered=false', noCodeCreator?.sheet_registered === false);
    }
  }

  // ─────────────────────────────────
  // RESULTS
  // ─────────────────────────────────
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log(`  📊 RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('═══════════════════════════════════════════════');
  
  if (failed > 0) {
    console.log('  ⚠️  Some tests failed. Review output above.');
  } else {
    console.log('  🎉 ALL TESTS PASSED!');
  }
  console.log('');
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
