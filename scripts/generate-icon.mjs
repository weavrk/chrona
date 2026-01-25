#!/usr/bin/env node
/**
 * Generate apple-touch-icon.png from SVG
 * Uses canvas API (built into Node.js 18+)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const svgPath = path.join(ROOT_DIR, 'public', 'apple-touch-icon.svg');
const pngPath = path.join(ROOT_DIR, 'public', 'apple-touch-icon.png');

try {
  // Try to use canvas if available
  let canvas;
  try {
    const { createCanvas, loadImage } = await import('canvas');
    const svgBuffer = fs.readFileSync(svgPath);
    const img = await loadImage(svgBuffer);
    canvas = createCanvas(180, 180);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(pngPath, buffer);
    console.log('✅ Generated apple-touch-icon.png successfully!');
  } catch (canvasError) {
    console.log('⚠️  Canvas not available. Using fallback method...');
    console.log('💡 To generate the PNG, you can:');
    console.log('   1. Open public/apple-touch-icon.svg in a browser');
    console.log('   2. Right-click and save as PNG (180x180)');
    console.log('   3. Or use an online SVG to PNG converter');
    console.log('   4. Save as public/apple-touch-icon.png');
    process.exit(0);
  }
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

