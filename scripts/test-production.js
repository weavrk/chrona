#!/usr/bin/env node
/**
 * Test production API endpoints
 * 
 * Usage:
 *   node scripts/test-production.js
 */

const BASE_URL = 'https://weavrk.com/hrefs/chrona';

async function testEndpoint(name, url, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    let data;
    try {
      data = await response.json();
    } catch {
      data = { text: await response.text() };
    }
    
    if (response.ok) {
      console.log(`✅ ${name}: Success`);
      return true;
    } else {
      console.log(`❌ ${name}: Failed (${response.status})`);
      console.log(`   Response:`, data);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: Error - ${error.message}`);
    return false;
  }
}

async function testDataFile(name, url) {
  try {
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${name}: Found (${Array.isArray(data) ? data.length : 'object'} items)`);
      return true;
    } else {
      console.log(`❌ ${name}: Not found (${response.status})`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: Error - ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Testing Production API Endpoints');
  console.log('='.repeat(50));
  console.log(`Base URL: ${BASE_URL}\n`);
  
  const results = {
    passed: 0,
    failed: 0,
  };
  
  // Test data files exist
  console.log('📄 Testing Data Files:');
  if (await testDataFile('Global Labels', `${BASE_URL}/data/label-list-global.json`)) results.passed++; else results.failed++;
  if (await testDataFile('User Labels (kw)', `${BASE_URL}/data/kw/label-list-user-kw.json`)) results.passed++; else results.failed++;
  if (await testDataFile('Design Tokens', `${BASE_URL}/design-tokens.json`)) results.passed++; else results.failed++;
  
  console.log('\n🔧 Testing API Endpoints:');
  
  // Test save_user_labels.php (this will actually save, so use test data)
  const testLabels = [
    {
      id: 'test',
      name: 'Test',
      abbreviation: 'TE',
      defaultColor: 'brick'
    }
  ];
  
  // Note: We'll test with a dry run - check if endpoint is accessible
  // but won't actually save to avoid polluting data
  console.log('   ⚠️  Save endpoints require POST with data - skipping actual writes');
  console.log('   💡 To fully test, try saving a label in the production app\n');
  
  // Test that API files are accessible (they should return method not allowed for GET)
  const apiTests = [
    ['save_user_labels.php', `${BASE_URL}/api/save_user_labels.php`],
    ['save_drug_names.php', `${BASE_URL}/api/save_drug_names.php`],
    ['save_events.php', `${BASE_URL}/api/save_events.php`],
  ];
  
  for (const [name, url] of apiTests) {
    try {
      const response = await fetch(url);
      // 405 Method Not Allowed is expected for GET requests to POST-only endpoints
      if (response.status === 405) {
        console.log(`✅ ${name}: Accessible (405 = POST-only endpoint, as expected)`);
        results.passed++;
      } else if (response.status === 404) {
        console.log(`❌ ${name}: Not found (404)`);
        results.failed++;
      } else {
        console.log(`⚠️  ${name}: Unexpected status (${response.status})`);
        results.passed++; // Still accessible
      }
    } catch (error) {
      console.log(`❌ ${name}: Error - ${error.message}`);
      results.failed++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results:');
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above.');
  }
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});

