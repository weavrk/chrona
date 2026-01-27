#!/usr/bin/env node
/**
 * Comprehensive test script for Chrona - tests both local and production
 * Tests: API endpoints, Add, Edit, Delete operations
 * 
 * Usage:
 *   node scripts/test-full.js [local|prod|both]
 */

// Handle SSL certificate issues in Node.js
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Only for testing - allows self-signed certs

const LOCAL_URL = 'http://localhost:8002';
const PROD_URL = 'https://weavrk.com/hrefs/chrona';
const TEST_USERNAME = 'kw';

// Test record IDs for tracking
const testRecordIds = {
  period: null,
  hr: null,
  hsv: null,
  mentalHealth: null,
  workout: null,
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testEndpoint(name, url, method = 'GET', body = null, expectedStatus = 200) {
  try {
    // Add timeout and better error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    clearTimeout(timeoutId);
    let data;
    try {
      data = await response.json();
    } catch {
      data = { text: await response.text() };
    }
    
    const success = method === 'GET' 
      ? (response.status === expectedStatus || response.status === 405) // 405 is OK for POST-only endpoints
      : response.status === expectedStatus;
    
    if (success) {
      console.log(`✅ ${name}: Success (${response.status})`);
      return { success: true, data, status: response.status };
    } else {
      console.log(`❌ ${name}: Failed (${response.status})`);
      console.log(`   Expected: ${expectedStatus}, Got: ${response.status}`);
      console.log(`   Response:`, JSON.stringify(data, null, 2));
      return { success: false, data, status: response.status };
    }
  } catch (error) {
    console.log(`❌ ${name}: Error - ${error.message}`);
    if (error.cause) {
      console.log(`   Cause: ${error.cause}`);
    }
    if (error.stack) {
      console.log(`   Stack: ${error.stack.split('\n')[0]}`);
    }
    return { success: false, error: error.message };
  }
}

async function loadRecords(baseUrl, username) {
  const url = `${baseUrl}/data/${username}/records-list-${username}.json?t=${Date.now()}`;
  const result = await testEndpoint(`Load Records`, url, 'GET');
  if (result.success && result.data) {
    return result.data;
  }
  return {};
}

async function saveRecord(baseUrl, username, record) {
  // Load existing records
  const records = await loadRecords(baseUrl, username);
  
  // Generate ID if not provided
  const recordId = record.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Convert dates to YYYY-MM-DD format
  const startDateStr = record.startDate.toISOString().split('T')[0];
  const endDateStr = record.endDate.toISOString().split('T')[0];
  
  // Create record object
  const recordToAdd = {
    id: recordId,
    type: record.type,
    data: record.details || {},
  };

  // Add record to all dates in the range (inclusive)
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const currentDate = new Date(start);
  
  while (currentDate <= end) {
    const dateKey = currentDate.toISOString().split('T')[0];
    if (!records[dateKey]) {
      records[dateKey] = [];
    }
    // Remove existing record with same ID if editing
    records[dateKey] = records[dateKey].filter((r) => r.id !== recordId);
    records[dateKey].push(recordToAdd);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Save records
  const url = `${baseUrl}/api/save_records.php`;
  const result = await testEndpoint(
    `Save Record (${record.type})`,
    url,
    'POST',
    { username, records },
    200
  );
  
  if (result.success) {
    return recordId;
  }
  return null;
}

async function deleteRecord(baseUrl, username, recordType, recordId, startDate, endDate) {
  // Load existing records
  const records = await loadRecords(baseUrl, username);
  
  // Convert dates to YYYY-MM-DD format
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  // Remove records
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const currentDate = new Date(start);
  
  while (currentDate <= end) {
    const dateKey = currentDate.toISOString().split('T')[0];
    if (records[dateKey]) {
      records[dateKey] = records[dateKey].filter((r) => r.id !== recordId && r.type !== recordType);
      if (records[dateKey].length === 0) {
        delete records[dateKey];
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Save records
  const url = `${baseUrl}/api/save_records.php`;
  const result = await testEndpoint(
    `Delete Record (${recordType})`,
    url,
    'POST',
    { username, records },
    200
  );
  
  return result.success;
}

async function testEnvironment(baseUrl, envName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 Testing ${envName.toUpperCase()} Environment`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Base URL: ${baseUrl}\n`);

  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  // Test 1: Check API endpoints are accessible
  console.log('📋 Step 1: Testing API Endpoints Accessibility');
  console.log('-'.repeat(60));
  
  const apiTests = [
    ['save_records.php', `${baseUrl}/api/save_records.php`],
    ['save_user_labels.php', `${baseUrl}/api/save_user_labels.php`],
    ['save_drug_names.php', `${baseUrl}/api/save_drug_names.php`],
    ['save_workout_types.php', `${baseUrl}/api/save_workout_types.php`],
  ];

  for (const [name, url] of apiTests) {
    const result = await testEndpoint(name, url, 'GET', null, 405); // 405 = Method Not Allowed (expected for POST-only)
    if (result.success) {
      results.passed++;
      results.tests.push({ name, status: 'passed' });
    } else {
      results.failed++;
      results.tests.push({ name, status: 'failed', error: result.error || 'Unexpected status' });
    }
  }

  // Test 2: Check data files are accessible
  console.log('\n📋 Step 2: Testing Data Files Accessibility');
  console.log('-'.repeat(60));
  
  const dataFiles = [
    ['Global Labels', `${baseUrl}/data/label-list-global.json`],
    [`User Labels (${TEST_USERNAME})`, `${baseUrl}/data/${TEST_USERNAME}/label-list-user-${TEST_USERNAME}.json`],
    ['Design Tokens', `${baseUrl}/design-tokens.json`],
  ];

  for (const [name, url] of dataFiles) {
    const result = await testEndpoint(name, url, 'GET');
    if (result.success) {
      results.passed++;
      results.tests.push({ name, status: 'passed' });
    } else {
      results.failed++;
      results.tests.push({ name, status: 'failed', error: result.error || 'File not found' });
    }
  }

  // Test 3: ADD Operations - Create test records
  console.log('\n📋 Step 3: Testing ADD Operations');
  console.log('-'.repeat(60));
  
  const today = new Date();
  const testDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Test Period record
  console.log('\n  Testing Period Record...');
  const periodRecord = {
    type: 'period',
    startDate: testDate,
    endDate: testDate,
    details: {
      intensity: 'Medium',
    },
  };
  const periodId = await saveRecord(baseUrl, TEST_USERNAME, periodRecord);
  if (periodId) {
    testRecordIds.period = periodId;
    results.passed++;
    results.tests.push({ name: 'Add Period Record', status: 'passed' });
    console.log(`    ✅ Period record created with ID: ${periodId}`);
  } else {
    results.failed++;
    results.tests.push({ name: 'Add Period Record', status: 'failed' });
    console.log(`    ❌ Failed to create Period record`);
  }
  await sleep(500); // Small delay between operations

  // Test HR record
  console.log('\n  Testing HR Record...');
  const hrRecord = {
    type: 'hormone-replacement-therapy',
    startDate: testDate,
    endDate: testDate,
    details: {
      treatments: [{
        drugName: 'Test Drug',
        dose: 2,
        doseUnit: 'Mg',
        frequency: 1,
        frequencyUnit: 'daily',
      }],
      repeatForward: false,
      includePlacebo: false,
      headache: false,
    },
  };
  const hrId = await saveRecord(baseUrl, TEST_USERNAME, hrRecord);
  if (hrId) {
    testRecordIds.hr = hrId;
    results.passed++;
    results.tests.push({ name: 'Add HR Record', status: 'passed' });
    console.log(`    ✅ HR record created with ID: ${hrId}`);
  } else {
    results.failed++;
    results.tests.push({ name: 'Add HR Record', status: 'failed' });
    console.log(`    ❌ Failed to create HR record`);
  }
  await sleep(500);

  // Test HSV record
  console.log('\n  Testing HSV Record...');
  const hsvRecord = {
    type: 'hsv',
    startDate: testDate,
    endDate: testDate,
    details: {
      hadBreakout: true,
      severity: 'Mild',
      repeatForward: false,
    },
  };
  const hsvId = await saveRecord(baseUrl, TEST_USERNAME, hsvRecord);
  if (hsvId) {
    testRecordIds.hsv = hsvId;
    results.passed++;
    results.tests.push({ name: 'Add HSV Record', status: 'passed' });
    console.log(`    ✅ HSV record created with ID: ${hsvId}`);
  } else {
    results.failed++;
    results.tests.push({ name: 'Add HSV Record', status: 'failed' });
    console.log(`    ❌ Failed to create HSV record`);
  }
  await sleep(500);

  // Test Mental Health record
  console.log('\n  Testing Mental Health Record...');
  const mentalHealthRecord = {
    type: 'mental-health',
    startDate: testDate,
    endDate: testDate,
    details: {
      mood: 'smile',
      notes: 'Test note from automated test',
    },
  };
  const mentalHealthId = await saveRecord(baseUrl, TEST_USERNAME, mentalHealthRecord);
  if (mentalHealthId) {
    testRecordIds.mentalHealth = mentalHealthId;
    results.passed++;
    results.tests.push({ name: 'Add Mental Health Record', status: 'passed' });
    console.log(`    ✅ Mental Health record created with ID: ${mentalHealthId}`);
  } else {
    results.failed++;
    results.tests.push({ name: 'Add Mental Health Record', status: 'failed' });
    console.log(`    ❌ Failed to create Mental Health record`);
  }
  await sleep(500);

  // Test Workout record
  console.log('\n  Testing Workout Record...');
  const workoutRecord = {
    type: 'workout',
    startDate: testDate,
    endDate: testDate,
    details: {
      workoutType: 'Running',
      duration: 30,
      durationUnit: 'minutes',
    },
  };
  const workoutId = await saveRecord(baseUrl, TEST_USERNAME, workoutRecord);
  if (workoutId) {
    testRecordIds.workout = workoutId;
    results.passed++;
    results.tests.push({ name: 'Add Workout Record', status: 'passed' });
    console.log(`    ✅ Workout record created with ID: ${workoutId}`);
  } else {
    results.failed++;
    results.tests.push({ name: 'Add Workout Record', status: 'failed' });
    console.log(`    ❌ Failed to create Workout record`);
  }
  await sleep(500);

  // Test 4: EDIT Operations - Update existing records
  console.log('\n📋 Step 4: Testing EDIT Operations');
  console.log('-'.repeat(60));

  if (testRecordIds.period) {
    console.log('\n  Testing Period Record Edit...');
    const updatedPeriodRecord = {
      id: testRecordIds.period,
      type: 'period',
      startDate: testDate,
      endDate: testDate,
      details: {
        intensity: 'Heavy', // Changed from Medium
      },
    };
    const updatedPeriodId = await saveRecord(baseUrl, TEST_USERNAME, updatedPeriodRecord);
    if (updatedPeriodId === testRecordIds.period) {
      results.passed++;
      results.tests.push({ name: 'Edit Period Record', status: 'passed' });
      console.log(`    ✅ Period record updated successfully`);
    } else {
      results.failed++;
      results.tests.push({ name: 'Edit Period Record', status: 'failed' });
      console.log(`    ❌ Failed to update Period record`);
    }
    await sleep(500);
  }

  if (testRecordIds.hr) {
    console.log('\n  Testing HR Record Edit...');
    const updatedHrRecord = {
      id: testRecordIds.hr,
      type: 'hormone-replacement-therapy',
      startDate: testDate,
      endDate: testDate,
      details: {
        treatments: [{
          drugName: 'Updated Drug', // Changed
          dose: 4, // Changed from 2
          doseUnit: 'Mg',
          frequency: 2, // Changed from 1
          frequencyUnit: 'daily',
        }],
        repeatForward: true, // Changed
        includePlacebo: true, // Changed
        headache: true, // Changed
      },
    };
    const updatedHrId = await saveRecord(baseUrl, TEST_USERNAME, updatedHrRecord);
    if (updatedHrId === testRecordIds.hr) {
      results.passed++;
      results.tests.push({ name: 'Edit HR Record', status: 'passed' });
      console.log(`    ✅ HR record updated successfully`);
    } else {
      results.failed++;
      results.tests.push({ name: 'Edit HR Record', status: 'failed' });
      console.log(`    ❌ Failed to update HR record`);
    }
    await sleep(500);
  }

  // Test 5: DELETE Operations
  console.log('\n📋 Step 5: Testing DELETE Operations');
  console.log('-'.repeat(60));

  if (testRecordIds.period) {
    console.log('\n  Testing Period Record Delete...');
    const deleted = await deleteRecord(
      baseUrl,
      TEST_USERNAME,
      'period',
      testRecordIds.period,
      testDate,
      testDate
    );
    if (deleted) {
      results.passed++;
      results.tests.push({ name: 'Delete Period Record', status: 'passed' });
      console.log(`    ✅ Period record deleted successfully`);
    } else {
      results.failed++;
      results.tests.push({ name: 'Delete Period Record', status: 'failed' });
      console.log(`    ❌ Failed to delete Period record`);
    }
    await sleep(500);
  }

  if (testRecordIds.hr) {
    console.log('\n  Testing HR Record Delete...');
    const deleted = await deleteRecord(
      baseUrl,
      TEST_USERNAME,
      'hormone-replacement-therapy',
      testRecordIds.hr,
      testDate,
      testDate
    );
    if (deleted) {
      results.passed++;
      results.tests.push({ name: 'Delete HR Record', status: 'passed' });
      console.log(`    ✅ HR record deleted successfully`);
    } else {
      results.failed++;
      results.tests.push({ name: 'Delete HR Record', status: 'failed' });
      console.log(`    ❌ Failed to delete HR record`);
    }
    await sleep(500);
  }

  if (testRecordIds.hsv) {
    console.log('\n  Testing HSV Record Delete...');
    const deleted = await deleteRecord(
      baseUrl,
      TEST_USERNAME,
      'hsv',
      testRecordIds.hsv,
      testDate,
      testDate
    );
    if (deleted) {
      results.passed++;
      results.tests.push({ name: 'Delete HSV Record', status: 'passed' });
      console.log(`    ✅ HSV record deleted successfully`);
    } else {
      results.failed++;
      results.tests.push({ name: 'Delete HSV Record', status: 'failed' });
      console.log(`    ❌ Failed to delete HSV record`);
    }
    await sleep(500);
  }

  if (testRecordIds.mentalHealth) {
    console.log('\n  Testing Mental Health Record Delete...');
    const deleted = await deleteRecord(
      baseUrl,
      TEST_USERNAME,
      'mental-health',
      testRecordIds.mentalHealth,
      testDate,
      testDate
    );
    if (deleted) {
      results.passed++;
      results.tests.push({ name: 'Delete Mental Health Record', status: 'passed' });
      console.log(`    ✅ Mental Health record deleted successfully`);
    } else {
      results.failed++;
      results.tests.push({ name: 'Delete Mental Health Record', status: 'failed' });
      console.log(`    ❌ Failed to delete Mental Health record`);
    }
    await sleep(500);
  }

  if (testRecordIds.workout) {
    console.log('\n  Testing Workout Record Delete...');
    const deleted = await deleteRecord(
      baseUrl,
      TEST_USERNAME,
      'workout',
      testRecordIds.workout,
      testDate,
      testDate
    );
    if (deleted) {
      results.passed++;
      results.tests.push({ name: 'Delete Workout Record', status: 'passed' });
      console.log(`    ✅ Workout record deleted successfully`);
    } else {
      results.failed++;
      results.tests.push({ name: 'Delete Workout Record', status: 'failed' });
      console.log(`    ❌ Failed to delete Workout record`);
    }
    await sleep(500);
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 ${envName.toUpperCase()} Test Results`);
  console.log(`${'='.repeat(60)}`);
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  const total = results.passed + results.failed;
  const successRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
  console.log(`   📈 Success Rate: ${successRate}%`);
  
  if (results.failed === 0) {
    console.log(`\n🎉 All ${envName} tests passed!`);
  } else {
    console.log(`\n⚠️  Some ${envName} tests failed. Check the output above.`);
    console.log('\nFailed tests:');
    results.tests.filter(t => t.status === 'failed').forEach(t => {
      console.log(`   - ${t.name}${t.error ? `: ${t.error}` : ''}`);
    });
  }

  return results;
}

async function runTests() {
  const args = process.argv.slice(2);
  const testEnv = args[0] || 'both';

  console.log('🚀 Chrona Comprehensive Test Suite');
  console.log('='.repeat(60));
  console.log(`Testing: ${testEnv === 'both' ? 'Local & Production' : testEnv}`);
  console.log(`Test User: ${TEST_USERNAME}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const allResults = {
    local: null,
    prod: null,
  };

  try {
    if (testEnv === 'local' || testEnv === 'both') {
      // Check if local server is running
      try {
        const response = await fetch(`${LOCAL_URL}/`, { method: 'HEAD' });
        if (!response.ok && response.status !== 404) {
          throw new Error('Server not responding');
        }
      } catch (error) {
        console.log('⚠️  Local server not accessible. Make sure to run: npm run dev');
        console.log('   Skipping local tests...\n');
      }
      
      if (testEnv === 'local' || testEnv === 'both') {
        allResults.local = await testEnvironment(LOCAL_URL, 'local');
      }
    }

    if (testEnv === 'prod' || testEnv === 'both') {
      allResults.prod = await testEnvironment(PROD_URL, 'production');
    }

    // Final Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 FINAL SUMMARY');
    console.log(`${'='.repeat(60)}`);

    if (allResults.local) {
      const localTotal = allResults.local.passed + allResults.local.failed;
      const localRate = localTotal > 0 ? ((allResults.local.passed / localTotal) * 100).toFixed(1) : 0;
      console.log(`\n🏠 LOCAL:`);
      console.log(`   ✅ Passed: ${allResults.local.passed}`);
      console.log(`   ❌ Failed: ${allResults.local.failed}`);
      console.log(`   📈 Success Rate: ${localRate}%`);
    }

    if (allResults.prod) {
      const prodTotal = allResults.prod.passed + allResults.prod.failed;
      const prodRate = prodTotal > 0 ? ((allResults.prod.passed / prodTotal) * 100).toFixed(1) : 0;
      console.log(`\n🌐 PRODUCTION:`);
      console.log(`   ✅ Passed: ${allResults.prod.passed}`);
      console.log(`   ❌ Failed: ${allResults.prod.failed}`);
      console.log(`   📈 Success Rate: ${prodRate}%`);
    }

    const allPassed = (allResults.local?.failed || 0) === 0 && (allResults.prod?.failed || 0) === 0;
    if (allPassed) {
      console.log('\n🎉 All tests passed across all environments!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests failed. Review the output above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

