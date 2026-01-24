#!/usr/bin/env node
/**
 * Save Design Tokens Script
 * Saves design tokens to public/design-tokens.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

export function saveDesignTokens(tokens) {
  const tokensPath = path.join(ROOT_DIR, 'public', 'design-tokens.json');
  
  try {
    // Write to file with pretty formatting
    fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2) + '\n', 'utf-8');
    console.log('✅ Design tokens saved to public/design-tokens.json');
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to save design tokens:', error);
    return { success: false, error: error.message };
  }
}

// If called directly from command line
if (import.meta.url === `file://${process.argv[1]}`) {
  // Read tokens from stdin or file
  let input = '';
  process.stdin.on('data', chunk => {
    input += chunk;
  });
  
  process.stdin.on('end', () => {
    try {
      const tokens = JSON.parse(input);
      const result = saveDesignTokens(tokens);
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('❌ Invalid JSON input:', error.message);
      process.exit(1);
    }
  });
}

