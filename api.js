/**
 * PackBot API Client
 * Handles communication with the PackBot Web API
 */

// API Configuration
// When hosted on thepck.com with nginx proxy, use relative /api path
// Nginx will proxy /api/* to the PackBot container
const API_BASE = '/api';

// For local development, you can override:
// const API_BASE = 'http://localhost:3001/api';

// Default guild IDs for The Pack servers
const DEFAULT_GUILDS = {
    chargedCops: '773732791585865769',
    thePack: '255258298230636545'
};

class PackBotAPI {
    constructor(baseUrl = API_BASE) {
        this.baseUrl = baseUrl;
        this.user = null;
    }

    async fetch(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                credentials: 'include',
                ...options
            });
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            return null;
        }
    }

    // Stats
    async getStats() {
        return this.fetch('/stats');
    }

    async getStatus() {
        return this.fetch('/status');
    }

    // Now Playing
    async getNowPlaying(guildId) {
        return this.fetch(`/nowplaying/${guildId}`);
    }

    async getQueue(guildId, page = 1, limit = 25) {
        return this.fetch(`/queue/${guildId}?page=${page}&limit=${limit}`);
    }

    // Leaderboard
    async getLeaderboard(guildId, game = null, limit = 25) {
        const params = new URLSearchParams({ limit });
        if (game) params.append('game', game);
        return this.fetch(`/leaderboard/${guildId}?${params}`);
    }

    async getUserStats(guildId, odUserId) {
        return this.fetch(`/leaderboard/${guildId}/user/${odUserId}`);
    }

    // Auth
    login() {
        window.location.href = `${this.baseUrl}/auth/discord`;
    }

    async getMe() {
        const result = await this.fetch('/auth/me');
        // Update mobile nav if function exists
        if (window.updateMobileNav) {
            if (result && result.authenticated) {
                window.updateMobileNav(true, result);
            } else {
                window.updateMobileNav(false, null);
            }
        }
        return result;
    }

    async logout() {
        // Update mobile nav before reload
        if (window.updateMobileNav) {
            window.updateMobileNav(false, null);
        }
        await this.fetch('/auth/logout', { method: 'POST' });
        this.user = null;
        window.location.reload();
    }

    // User preferences
    async getPreferences() {
        return this.fetch('/user/preferences');
    }

    async setFavoriteGuild(guildId) {
        return this.fetch('/user/preferences', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ favoriteGuildId: guildId })
        });
    }

    // User data
    async getPlaylists() {
        return this.fetch('/user/playlists');
    }

    async createPlaylist(guildId, name, url) {
        return this.fetch('/user/playlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guildId, name, url })
        });
    }

    async deletePlaylist(id) {
        return this.fetch(`/user/playlists/${id}`, { method: 'DELETE' });
    }

    // Listening History
    async getHistory(guildId, page = 1, limit = 50, userId = null) {
        let url = `/history/${guildId}?page=${page}&limit=${limit}`;
        if (userId) url += `&userId=${userId}`;
        return this.fetch(url);
    }

    async getHistoryStats(guildId) {
        return this.fetch(`/history/${guildId}/stats`);
    }

    // User Profiles
    async getProfile(userId, guildId = null) {
        let url = `/profile/${userId}`;
        if (guildId) url += `?guildId=${guildId}`;
        return this.fetch(url);
    }

    // Queue Management
    async addToQueue(guildId, query) {
        return this.fetch(`/queue/${guildId}/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
    }

    async removeFromQueue(guildId, position) {
        return this.fetch(`/queue/${guildId}/${position}`, { method: 'DELETE' });
    }

    async moveInQueue(guildId, from, to) {
        return this.fetch(`/queue/${guildId}/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from, to })
        });
    }

    async shuffleQueue(guildId) {
        return this.fetch(`/queue/${guildId}/shuffle`, { method: 'POST' });
    }

    async clearQueue(guildId) {
        return this.fetch(`/queue/${guildId}/clear`, { method: 'POST' });
    }

    // Playback Controls
    async togglePause(guildId) {
        return this.fetch(`/player/${guildId}/pause`, { method: 'POST' });
    }

    async skip(guildId) {
        return this.fetch(`/player/${guildId}/skip`, { method: 'POST' });
    }

    async previous(guildId) {
        return this.fetch(`/player/${guildId}/previous`, { method: 'POST' });
    }

    async seek(guildId, time) {
        return this.fetch(`/player/${guildId}/seek`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ time })
        });
    }

    async stop(guildId) {
        return this.fetch(`/player/${guildId}/stop`, { method: 'POST' });
    }

    async getPlayerStatus(guildId) {
        return this.fetch(`/player/${guildId}/status`);
    }
}

// Create global API instance
window.packBotAPI = new PackBotAPI();

// Socket.IO client for real-time updates
let socket = null;

function connectWebSocket() {
    if (typeof io === 'undefined') {
        console.warn('Socket.IO not loaded');
        return;
    }

    // WebSocket connects to thepck.com - nginx proxies to PackBot
    const wsUrl = window.location.origin;

    socket = io(wsUrl, {
        path: '/socket.io',
        transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
        console.log('WebSocket connected');
    });

    socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
    });

    window.packBotSocket = socket;
}

// Helper functions
function formatDuration(seconds) {
    if (!seconds) return '0:00';
    // Round to nearest second to avoid decimal display
    const totalSecs = Math.floor(seconds);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const me = await packBotAPI.getMe();
    if (me && me.authenticated) {
        packBotAPI.user = me;
        updateUserUI(me);
    }

    // Setup login button
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            packBotAPI.login();
        });
    }

    // Load stats on home page
    if (document.getElementById('stat-guilds')) {
        loadStats();
    }
});

function updateUserUI(user) {
    const loginBtn = document.getElementById('login-btn');
    const userInfo = document.getElementById('user-info');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');

    if (user && user.authenticated) {
        if (loginBtn) loginBtn.classList.add('hidden');
        if (userInfo) {
            userInfo.classList.remove('hidden');
            if (userAvatar) userAvatar.src = user.avatar || '/img/default-avatar.png';
            if (userName) userName.textContent = user.username;
        }
    }
}

async function loadStats() {
    const stats = await packBotAPI.getStats();
    if (!stats) {
        document.getElementById('status-text').textContent = 'Offline';
        document.getElementById('status-dot').classList.add('offline');
        return;
    }

    document.getElementById('stat-guilds').textContent = formatNumber(stats.guilds);
    document.getElementById('stat-users').textContent = formatNumber(stats.users);
    document.getElementById('stat-voice').textContent = stats.activeVoice;
    document.getElementById('stat-uptime').textContent = stats.uptimeFormatted;
    
    document.getElementById('status-text').textContent = 'Online';
    document.getElementById('status-dot').classList.add('online');
}

// Export for use in other scripts
window.formatDuration = formatDuration;
window.formatNumber = formatNumber;
window.DEFAULT_GUILDS = DEFAULT_GUILDS;
