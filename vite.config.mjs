import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Nginx serves this site from the domain root (see nginx `root .../the-pack`).
export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        history: resolve(__dirname, 'history.html'),
        leaderboard: resolve(__dirname, 'leaderboard.html'),
        monitors: resolve(__dirname, 'monitors.html'),
        nowplaying: resolve(__dirname, 'nowplaying.html'),
        profile: resolve(__dirname, 'profile.html'),
        settings: resolve(__dirname, 'settings.html'),
        shopify: resolve(__dirname, 'shopify.html'),
        youtube: resolve(__dirname, 'youtube.html'),
      },
    },
  },
});
