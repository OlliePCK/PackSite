# The Pack Website

Frontend website for The Pack Discord music bot.

## Features

- dYZæ Now Playing - Real-time music player with controls
- dY"S Dashboard - Server statistics and management
- dY"< Queue Management - Drag-and-drop queue reordering
- dY?+ Leaderboard - Gaming playtime tracking
- dY"o History - Listening history and stats
- dY"§ YouTube - Channel notifications management
- dY"" Monitors - Web page monitoring (Shopify, Ticketmaster, etc.)
- dY"ñ PWA Support - Install as app on iOS/Android with lock screen controls

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

Deployment is automated via GitHub Actions using a self-hosted runner on your Unraid server. Any push to `main` or `master` will:
1. Run the deploy job on the Unraid runner.
2. `rsync` the static site files into the nginx html root.

### Runner Setup (Unraid)
1. Install a GitHub Actions runner container on Unraid pointing at this PackSite repo.
2. Give it labels: `self-hosted,unraid,site`.
3. Add a volume mapping so the runner can write to nginx:
   - Host: `/mnt/user/appdata/binhex-nginx/nginx/html/the-pack/`
   - Container: `/mnt/user/appdata/binhex-nginx/nginx/html/the-pack/`
   (or mount `/mnt/user/appdata` to the same path inside the runner).
4. Start the runner and confirm it shows “Idle” in GitHub → Settings → Actions → Runners.

### GitHub Secrets
No secrets are required for deployment when using a local runner.

## License

MIT
