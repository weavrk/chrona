#!/usr/bin/env node
/**
 * Generate apple-touch-icon.png from SVG
 * Requires: npm install sharp
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const svgPath = path.join(ROOT_DIR, 'public', 'apple-touch-icon.svg');
const pngPath = path.join(ROOT_DIR, 'public', 'apple-touch-icon.png');

try {
  const svgBuffer = fs.readFileSync(svgPath);
  
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(pngPath);
  
  console.log('✅ Generated apple-touch-icon.png successfully!');
} catch (error) {
  console.error('❌ Error generating icon:', error.message);
  console.error('💡 Install sharp: npm install sharp');
  process.exit(1);
}

