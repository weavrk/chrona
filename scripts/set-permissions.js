#!/usr/bin/env node
/**
 * Set file permissions on production server via FTP
 * 
 * Usage:
 *   node scripts/set-permissions.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Load environment variables from .env file
function loadEnv() {
  const envPath = path.join(ROOT_DIR, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found. Please create one with FTP credentials.');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      env[key.trim()] = valueParts.join('=').trim();
    }
  });
  return env;
}

async function setPermissions() {
  console.log('🔧 Setting File Permissions on Production');
  console.log('='.repeat(50));
  
  const env = loadEnv();
  
  try {
    const { Client } = await import('basic-ftp');
    const client = new Client();
    client.ftp.verbose = false;
    
    await client.access({
      host: env.FTP_HOST,
      user: env.FTP_USER,
      password: env.FTP_PASS,
      secure: false
    });
    
    console.log('   Connected to FTP server');
    
    const basePath = env.FTP_REMOTE_PATH;
    
    // Set permissions for data directory
    const dataDir = basePath + '/data';
    console.log(`\n📁 Setting permissions for: ${dataDir}`);
    
    try {
      // Try to set directory permissions (755 = rwxr-xr-x)
      // Note: Some FTP servers don't support CHMOD, but we'll try
      await client.send('SITE CHMOD 755 ' + dataDir);
      console.log('   ✅ Set data/ directory to 755');
    } catch (error) {
      console.log('   ⚠️  Could not set permissions via FTP (may need to set manually via cPanel)');
      console.log('   💡 Required permissions:');
      console.log('      - /public_html/hrefs/chrona/public/data/ → 755 or 775');
      console.log('      - All subdirectories → 755 or 775');
      console.log('      - All JSON files → 644');
    }
    
    // List existing user directories and set their permissions
    try {
      const files = await client.list(dataDir);
      const userDirs = files.filter(file => file.isDirectory && file.name !== '.' && file.name !== '..');
      
      if (userDirs.length > 0) {
        console.log(`\n📁 Found ${userDirs.length} user directory(ies):`);
        for (const dir of userDirs) {
          const userDirPath = dataDir + '/' + dir.name;
          try {
            await client.send('SITE CHMOD 755 ' + userDirPath);
            console.log(`   ✅ Set ${dir.name}/ to 755`);
            
            // Try to set permissions on files in user directory
            const userFiles = await client.list(userDirPath);
            for (const file of userFiles) {
              if (!file.isDirectory) {
                const filePath = userDirPath + '/' + file.name;
                try {
                  await client.send('SITE CHMOD 644 ' + filePath);
                  console.log(`      ✅ Set ${file.name} to 644`);
                } catch (e) {
                  // Ignore individual file permission errors
                }
              }
            }
          } catch (error) {
            console.log(`   ⚠️  Could not set permissions for ${dir.name}/`);
          }
        }
      }
      
      // Set permissions on files in data directory (like events files)
      const dataFiles = files.filter(file => !file.isDirectory && file.name.endsWith('.json'));
      if (dataFiles.length > 0) {
        console.log(`\n📄 Found ${dataFiles.length} JSON file(s) in data/:`);
        for (const file of dataFiles) {
          const filePath = dataDir + '/' + file.name;
          try {
            await client.send('SITE CHMOD 644 ' + filePath);
            console.log(`   ✅ Set ${file.name} to 644`);
          } catch (e) {
            console.log(`   ⚠️  Could not set permissions for ${file.name}`);
          }
        }
      }
    } catch (error) {
      console.log('   ⚠️  Could not list directory contents');
    }
    
    client.close();
    console.log('\n✅ Permission setting complete');
    console.log('\n💡 Note: If FTP CHMOD doesn\'t work, set permissions manually via cPanel:');
    console.log('   1. Navigate to /public_html/hrefs/chrona/public/data/');
    console.log('   2. Set directory permissions to 755 (or 775 if needed)');
    console.log('   3. Set file permissions to 644');
    console.log('   4. Apply recursively to subdirectories');
    
  } catch (error) {
    console.error('❌ Failed to set permissions:', error.message);
    console.log('\n💡 You may need to set permissions manually via cPanel File Manager');
    process.exit(1);
  }
}

// Run
setPermissions().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

