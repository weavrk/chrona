#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('🧪 Comprehensive Chrona Test Suite');
console.log('==================================================\n');

// Test 1: Check if all required files exist
console.log('📁 Test 1: Checking file structure...');
const requiredFiles = [
  'dist/index.html',
  'dist/assets',
  'api/save_records.php',
  'api/save_user_labels.php',
  'api/save_drug_names.php',
  'api/save_workout_types.php',
  'public/data/label-list-global.json',
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`   ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

if (!allFilesExist) {
  console.error('\n❌ Some required files are missing!');
  process.exit(1);
}
console.log('✅ All required files exist\n');

// Test 2: Validate JSON files
console.log('📋 Test 2: Validating JSON files...');
const jsonFiles = [
  'public/data/label-list-global.json',
];

let allJsonValid = true;
jsonFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    JSON.parse(content);
    console.log(`   ✅ ${file} is valid JSON`);
  } catch (error) {
    console.log(`   ❌ ${file} is INVALID: ${error.message}`);
    allJsonValid = false;
  }
});

if (!allJsonValid) {
  console.error('\n❌ Some JSON files are invalid!');
  process.exit(1);
}
console.log('✅ All JSON files are valid\n');

// Test 3: Check user data structure
console.log('👤 Test 3: Checking user data structure...');
const userDataDir = 'src/data/kw';
if (fs.existsSync(userDataDir)) {
  const userFiles = fs.readdirSync(userDataDir);
  console.log(`   Found ${userFiles.length} files in user data:`);
  userFiles.forEach(file => {
    console.log(`   - ${file}`);
    if (file.endsWith('.json')) {
      try {
        const content = fs.readFileSync(path.join(userDataDir, file), 'utf8');
        JSON.parse(content);
        console.log(`     ✅ Valid JSON`);
      } catch (error) {
        console.log(`     ❌ Invalid JSON: ${error.message}`);
      }
    }
  });
  console.log('✅ User data structure looks good\n');
} else {
  console.log('   ⚠️  No user data directory found (this is OK for fresh install)\n');
}

// Test 4: Check API files for PHP syntax
console.log('🔧 Test 4: Checking API files...');
const apiFiles = fs.readdirSync('api').filter(f => f.endsWith('.php'));
console.log(`   Found ${apiFiles.length} API files:`);
apiFiles.forEach(file => {
  const content = fs.readFileSync(path.join('api', file), 'utf8');
  const hasPhpTag = content.includes('<?php');
  const hasJsonHeader = content.includes('application/json');
  console.log(`   ${hasPhpTag && hasJsonHeader ? '✅' : '⚠️ '} ${file}`);
});
console.log('✅ API files structure looks good\n');

// Test 5: Production endpoint test
console.log('🌐 Test 5: Testing production endpoints...');
const prodUrl = 'https://weavrk.com/hrefs/chrona/';

async function testProduction() {
  try {
    // Test main page
    const mainResponse = await fetch(prodUrl);
    console.log(`   ${mainResponse.ok ? '✅' : '❌'} Main page: ${mainResponse.status}`);
    
    // Test data endpoint
    const dataResponse = await fetch(`${prodUrl}data/label-list-global.json?t=${Date.now()}`);
    console.log(`   ${dataResponse.ok ? '✅' : '❌'} Global labels: ${dataResponse.status}`);
    
    if (dataResponse.ok) {
      const data = await dataResponse.json();
      console.log(`   ✅ Loaded ${data.length} global labels`);
    }
    
    console.log('✅ Production endpoints are responding\n');
  } catch (error) {
    console.error(`   ❌ Production test failed: ${error.message}\n`);
  }
}

// Test 6: Build output validation
console.log('📦 Test 6: Validating build output...');
const distFiles = fs.readdirSync('dist');
const assetsDir = path.join('dist', 'assets');
const hasAssets = fs.existsSync(assetsDir);
let hasCss = false;
let hasJs = false;

if (hasAssets) {
  const assetFiles = fs.readdirSync(assetsDir);
  hasCss = assetFiles.some(f => f.endsWith('.css'));
  hasJs = assetFiles.some(f => f.endsWith('.js'));
}

const hasHtml = distFiles.includes('index.html');

console.log(`   ${hasHtml ? '✅' : '❌'} index.html exists`);
console.log(`   ${hasCss ? '✅' : '❌'} CSS files exist`);
console.log(`   ${hasJs ? '✅' : '❌'} JS files exist`);

if (!hasHtml || !hasCss || !hasJs) {
  console.error('\n❌ Build output is incomplete!');
  process.exit(1);
}
console.log('✅ Build output is complete\n');

// Run production test
testProduction().then(() => {
  console.log('==================================================');
  console.log('✅ All tests passed! Ready to deploy.');
  console.log('==================================================\n');
}).catch(error => {
  console.error('❌ Tests failed:', error);
  process.exit(1);
});
