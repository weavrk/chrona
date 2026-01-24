# Chrona Design System

A standalone design system reference page built with Vite + React + TypeScript.

## 🌐 Live Site

**Production:** https://weavrk.com/hrefs/chrona/

## Features

- **Blank Canvas**: Clean page with `background-body` color (#141414)
- **Toggle Button**: Small circle stroke in bottom right corner
- **Design System Drawer**: Slides up with full system reference
  - Primitive Colors (grays + CMYK)
  - Semantic Colors (all mapped tokens)
  - Button Components (with examples)
- **Mobile Optimized**: Responsive layout for all screen sizes
- **PWA Support**: Can be added to homescreen with proper meta tags

## Development

### Prerequisites

- Node.js 18+
- npm

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

The app will be available at http://localhost:8002

### Build for Production

```bash
npm run build
```

### Deploy to GoDaddy

```bash
npm run deploy
```

## Mobile Access & Pin to Homescreen

### On iPhone/iPad (Safari):

1. Open Safari and navigate to https://weavrk.com/hrefs/chrona/
2. Tap the Share button (square with arrow pointing up)
3. Scroll down and tap "Add to Home Screen"
4. Name it "Design System" and tap "Add"
5. The icon will appear on your homescreen

### On Android (Chrome):

1. Open Chrome and navigate to https://weavrk.com/hrefs/chrona/
2. Tap the three dots menu (⋮)
3. Tap "Add to Home screen"
4. Name it "Design System" and tap "Add"
5. The icon will appear on your homescreen

## Project Structure

```
chrona/
├── src/
│   ├── components/
│   │   └── DesignSystemDemoPage.tsx
│   ├── contexts/
│   │   └── DesignSystemContext.tsx
│   ├── styles/
│   │   ├── index.css
│   │   └── design-system.css
│   └── main.tsx
├── public/
│   ├── design-tokens.json
│   ├── favicon.svg
│   └── apple-touch-icon-v2.png
├── scripts/
│   └── deploy.js
└── watchbox/ (reference only, not deployed)
```

## Deployment

The project uses FTP deployment to GoDaddy:
- Host: ftp.weavrk.com
- Path: /public_html/hrefs/chrona/

Credentials are stored in `.env` file (not committed to git).

## GitHub Repository

- Repository: https://github.com/weavrk/chrona.git
- Branch: main

## Notes

- The `watchbox` folder is included as a reference but is excluded from deployment via `.gitignore`
- Design tokens are synced from `public/design-tokens.json`
- Mobile PWA support enabled with proper meta tags and icons

