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
            const { tokens, renames } = JSON.parse(body);
            const tokensPath = path.join(__dirname, 'public', 'design-tokens.json');
            
            // Save to file
            fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2) + '\n', 'utf-8');
            
            // Handle find/replace for renames
            if (renames && Array.isArray(renames) && renames.length > 0) {
              const srcDir = path.join(__dirname, 'src');
              const filesToUpdate = [
                'components/AddRecordSheet.tsx',
                'components/AddLabelModal.tsx',
                'components/EditLabelsModal.tsx',
                'components/ChipBar.tsx',
                'components/DesignSystemPanel.tsx',
                'contexts/DesignSystemContext.tsx'
              ];
              
              renames.forEach(({ oldName, newName }: { oldName: string, newName: string }) => {
                filesToUpdate.forEach(relativePath => {
                  const filePath = path.join(srcDir, relativePath);
                  if (fs.existsSync(filePath)) {
                    let content = fs.readFileSync(filePath, 'utf-8');
                    // Replace color name references in:
                    // 1. Object keys: 'oldName': or "oldName": or oldName:
                    // 2. Variable references: getLabelColor('oldName') or color: 'oldName'
                    // 3. String literals: 'oldName' or "oldName"
                    // 4. Property access: tokens.oldName or tokens['oldName']
                    const patterns = [
                      new RegExp(`(['"]?)${oldName}\\1\\s*:`, 'g'), // Object keys
                      new RegExp(`(['"])${oldName}\\1`, 'g'), // String literals
                      new RegExp(`\\.${oldName}\\b`, 'g'), // Property access
                      new RegExp(`\\b${oldName}\\b`, 'g'), // Word boundaries
                    ];
                    
                    patterns.forEach((regex, index) => {
                      if (index === 0) {
                        // Object keys: replace with same quote style
                        content = content.replace(regex, (match, quote) => `${quote || ''}${newName}${quote || ''}:`);
                      } else if (index === 1) {
                        // String literals: replace with same quote style
                        content = content.replace(regex, (match, quote) => `${quote}${newName}${quote}`);
                      } else if (index === 2) {
                        // Property access
                        content = content.replace(regex, `.${newName}`);
                      } else {
                        // Word boundaries (fallback)
                        content = content.replace(regex, newName);
                      }
                    });
                    
                    fs.writeFileSync(filePath, content, 'utf-8');
                  }
                });
              });
            }
            
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
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.end(JSON.stringify({ 
              success: false, 
              error: errorMessage 
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

      // API endpoint to save chip labels
      server.middlewares.use('/api/save_chip_labels.php', async (req, res, next) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { labels } = JSON.parse(body);
            const srcLabelsPath = path.join(__dirname, 'src', 'data', 'chip-labels.json');
            const publicLabelsPath = path.join(__dirname, 'public', 'data', 'chip-labels.json');
            
            const labelsJson = JSON.stringify(labels, null, 2) + '\n';
            
            // Save to both src/data (for development) and public/data (for production access)
            fs.writeFileSync(srcLabelsPath, labelsJson, 'utf-8');
            fs.writeFileSync(publicLabelsPath, labelsJson, 'utf-8');
            
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.statusCode = 200;
            res.end(JSON.stringify({ 
              success: true, 
              message: 'Chip labels saved successfully' 
            }));
          } catch (error) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.end(JSON.stringify({ 
              success: false, 
              error: errorMessage 
            }));
          }
        });
      });

      // Handle CORS preflight for chip labels
      server.middlewares.use('/api/save_chip_labels.php', (req, res, next) => {
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

      // API endpoint to save user labels
      server.middlewares.use('/api/save_user_labels.php', async (req, res, next) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { username, labels } = JSON.parse(body);
            const srcDataDir = path.join(__dirname, 'src', 'data');
            const publicDataDir = path.join(__dirname, 'public', 'data');
            
            // Ensure directories exist
            if (!fs.existsSync(srcDataDir)) {
              fs.mkdirSync(srcDataDir, { recursive: true });
            }
            if (!fs.existsSync(publicDataDir)) {
              fs.mkdirSync(publicDataDir, { recursive: true });
            }
            
            const srcLabelsPath = path.join(srcDataDir, `label-list-user-${username}.json`);
            const publicLabelsPath = path.join(publicDataDir, `label-list-user-${username}.json`);
            
            const labelsJson = JSON.stringify(labels, null, 2) + '\n';
            
            fs.writeFileSync(srcLabelsPath, labelsJson, 'utf-8');
            fs.writeFileSync(publicLabelsPath, labelsJson, 'utf-8');
            
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.statusCode = 200;
            res.end(JSON.stringify({ 
              success: true, 
              message: 'User labels saved successfully' 
            }));
          } catch (error) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.end(JSON.stringify({ 
              success: false, 
              error: errorMessage 
            }));
          }
        });
      });

      // API endpoint to save drug names
      server.middlewares.use('/api/save_drug_names.php', async (req, res, next) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { username, type, drugNames } = JSON.parse(body);
            if (!username) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'username is required' }));
              return;
            }
            if (!['hr', 'hs'].includes(type)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid type' }));
              return;
            }
            
            const srcDataDir = path.join(__dirname, 'src', 'data');
            const publicDataDir = path.join(__dirname, 'public', 'data');
            
            // Ensure directories exist
            if (!fs.existsSync(srcDataDir)) {
              fs.mkdirSync(srcDataDir, { recursive: true });
            }
            if (!fs.existsSync(publicDataDir)) {
              fs.mkdirSync(publicDataDir, { recursive: true });
            }
            
            const srcDrugsPath = path.join(srcDataDir, `drug-names-${type}-${username}.json`);
            const publicDrugsPath = path.join(publicDataDir, `drug-names-${type}-${username}.json`);
            
            const drugsJson = JSON.stringify(drugNames, null, 2) + '\n';
            
            fs.writeFileSync(srcDrugsPath, drugsJson, 'utf-8');
            fs.writeFileSync(publicDrugsPath, drugsJson, 'utf-8');
            
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.statusCode = 200;
            res.end(JSON.stringify({ 
              success: true, 
              message: 'Drug names saved successfully' 
            }));
          } catch (error) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.end(JSON.stringify({ 
              success: false, 
              error: errorMessage 
            }));
          }
        });
      });

      // API endpoint to save events
      server.middlewares.use('/api/save_events.php', async (req, res, next) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { username, events } = JSON.parse(body);
            const srcEventsPath = path.join(__dirname, 'src', 'data', `events-${username}.json`);
            const publicEventsPath = path.join(__dirname, 'public', 'data', `events-${username}.json`);
            
            const eventsJson = JSON.stringify(events, null, 2) + '\n';
            
            fs.writeFileSync(srcEventsPath, eventsJson, 'utf-8');
            fs.writeFileSync(publicEventsPath, eventsJson, 'utf-8');
            
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.statusCode = 200;
            res.end(JSON.stringify({ 
              success: true, 
              message: 'Events saved successfully' 
            }));
          } catch (error) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.end(JSON.stringify({ 
              success: false, 
              error: errorMessage 
            }));
          }
        });
      });

      // API endpoint to save global labels
      server.middlewares.use('/api/save_global_labels.php', async (req, res, next) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { labels } = JSON.parse(body);
            const srcLabelsPath = path.join(__dirname, 'src', 'data', 'label-list-global.json');
            const publicLabelsPath = path.join(__dirname, 'public', 'data', 'label-list-global.json');
            
            const labelsJson = JSON.stringify(labels, null, 2) + '\n';
            
            fs.writeFileSync(srcLabelsPath, labelsJson, 'utf-8');
            fs.writeFileSync(publicLabelsPath, labelsJson, 'utf-8');
            
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.statusCode = 200;
            res.end(JSON.stringify({ 
              success: true, 
              message: 'Global labels saved successfully' 
            }));
          } catch (error) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.end(JSON.stringify({ 
              success: false, 
              error: errorMessage 
            }));
          }
        });
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

