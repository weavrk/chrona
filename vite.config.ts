import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Simple API plugin to handle design token saves
function apiPlugin() {
  return {
    name: 'api',
    configureServer(server) {
      server.middlewares.use('/api/save_design_tokens.php', async (req, res, next) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { tokens } = JSON.parse(body);
            const tokensPath = path.join(__dirname, 'public', 'design-tokens.json');
            
            // Save to file
            fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2) + '\n', 'utf-8');
            
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.statusCode = 200;
            res.end(JSON.stringify({ 
              success: true, 
              message: 'Design tokens saved successfully' 
            }));
          } catch (error) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ 
              success: false, 
              error: error.message 
            }));
          }
        });
      });

      // Handle CORS preflight
      server.middlewares.use('/api/save_design_tokens.php', (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.statusCode = 200;
          res.end();
          return;
        }
        next();
      });
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), apiPlugin()],
  base: mode === 'production' ? '/hrefs/chrona/' : '/',
  server: {
    port: 8002,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
}))

