# The Pack Website

Frontend website for The Pack Discord music bot.

## Features

- 🎵 Now Playing - Real-time music player with controls
- 📊 Dashboard - Server statistics and management
- 📋 Queue Management - Drag-and-drop queue reordering
- 🏆 Leaderboard - Gaming playtime tracking
- 📜 History - Listening history and stats
- 📺 YouTube - Channel notifications management
- 🔔 Monitors - Web page monitoring (Shopify, Ticketmaster, etc.)
- 📱 PWA Support - Install as app on iOS/Android with lock screen controls

## Tech Stack

- Vanilla JavaScript (no framework)
- Socket.IO for real-time updates
- Media Session API for native OS controls
- Service Worker for offline support

## Development

```bash
# Serve locally (any static server works)
npx serve .
```

## Deployment

Deployment is automated via GitHub Actions. Any push to `main` or `master` will:
1. Copy updated files to the nginx server via SSH
2. Changes are live immediately (no build step needed)

### Required Secrets

Set these in GitHub repo Settings → Secrets → Actions:

- `SERVER_HOST` - Your server IP (e.g., `192.168.1.16`)
- `SERVER_USER` - SSH username (e.g., `root`)
- `SSH_PRIVATE_KEY` - Private SSH key for authentication
- `SERVER_PORT` - SSH port (optional, defaults to 22)

### Generate SSH Key (if needed)

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy"
# Add public key to server's ~/.ssh/authorized_keys
# Add private key to GitHub secrets as SSH_PRIVATE_KEY
```

## License

MIT
