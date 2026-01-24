# Chrona - Deployment Credentials

## FTP (GoDaddy)

**Connection Details:**
- **Host:** `ftp.weavrk.com`
- **Username:** `weavrk`
- **Password:** `Oneplus1=2`
- **Remote Path:** `/public_html/hrefs/chrona/`

**Usage:**
These credentials are stored in `.env` file for the deploy script.

```bash
FTP_HOST=ftp.weavrk.com
FTP_USER=weavrk
FTP_PASS=Oneplus1=2
FTP_REMOTE_PATH=/public_html/hrefs/chrona/
```

---

## GitHub

**Repository:** https://github.com/weavrk/chrona.git

**Credentials:**
- **Username:** `weavrk`
- **Password:** `Oneplus1#2`

**Note:** GitHub requires SSH keys or Personal Access Tokens for authentication. Password authentication is deprecated. The repository uses SSH authentication with git@github.com:weavrk/chrona.git

---

## Live Site URL

**Production:** https://weavrk.com/hrefs/chrona/

**GitHub Repository:** https://github.com/weavrk/chrona

---

## Deployment Commands

**Build & Deploy to GoDaddy:**
```bash
npm run build
npm run deploy
```

**Deploy without rebuilding:**
```bash
npm run deploy -- --skip-build
```

**Push to GitHub:**
```bash
git add -A
git commit -m "Your commit message"
git push origin main
```

---

## Mobile Access

For testing on mobile devices (same WiFi network):

1. Find your computer's IP: `ipconfig getifaddr en0`
2. Access locally: `http://[YOUR-IP]:8002/`
3. Access production: https://weavrk.com/hrefs/chrona/

---

## Project Notes

- **Main Project:** `/Users/katherineweaver/Dropbox/Files/Work/06_Programming/x.Side Projects/chrona/`
- **Reference:** The `watchbox` folder is included for reference but excluded from deployment
- **FTP Path:** Deploys to `/public_html/hrefs/chrona/` (NOT `/hrefs/watchbox/`)

---

**Last Updated:** January 24, 2026

