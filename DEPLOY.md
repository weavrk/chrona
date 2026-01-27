# Deployment Process for Chrona

## When you say "deploy", this means:

### 1. Run Extensive Tests
- **Local Tests**: Verify all functionality works in development
- **Build Tests**: Ensure production build completes without errors
- **Data Tests**: Validate JSON files and data structure
- **API Tests**: Check all PHP endpoints are accessible
- **Console Checks**: Verify no errors in browser console

Run the test suite:
```bash
npm run build
node scripts/test-full.js
```

### 2. Test Core Functionality
Verify these operations work correctly:
- ✅ **Reading** records from JSON
- ✅ **Writing** new records to JSON
- ✅ **Editing** existing records
- ✅ **Deleting** records

Test on:
- **Local** (dev server)
- **Production** (https://weavrk.com/hrefs/chrona/)

### 3. Push to Git (Backup Save Point)
```bash
git add -A
git commit -m "Descriptive commit message"
git push
```

Every commit is a restore point you can revert to if needed.

### 4. Deploy to GoDaddy Production
```bash
node scripts/deploy.js
```

This will:
- Build production bundle
- Create local archive backup
- Upload via FTP to GoDaddy
- Deploy all files (dist/, api/, data/)

## Quick Deploy Command
```bash
npm run build && node scripts/test-full.js && git add -A && git commit -m "Deploy: [description]" && git push && node scripts/deploy.js
```

## Production URL
https://weavrk.com/hrefs/chrona/

## Archive Location
Local backups stored in: `x.archive/deploys/YYYY-MM-DD_HHMM/`

## Notes
- Always test before deploying
- Git commits are your save points - commit often
- Check console for errors after deployment
- Verify data reads/writes on production after deploy

