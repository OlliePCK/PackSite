let currentGuildId = null;
let guildsData = null;
let isCurrentGuildAdmin = false;
let favoriteGuildId = null;

document.addEventListener('DOMContentLoaded', async () => {
    bindGlobalControls();
    bindYouTubeControls();
    await waitForAuth();
});

async function waitForAuth() {
    await new Promise(resolve => setTimeout(resolve, 100));

    const me = await packBotAPI.getMe();
    if (!me || !me.authenticated) return;

    document.getElementById('not-logged-in').classList.add('hidden');
    document.getElementById('utilities-content').classList.remove('hidden');
    await loadGuilds();
}

function bindGlobalControls() {
    const favoriteBtn = document.getElementById('set-favorite-btn');
    if (!favoriteBtn) return;

    favoriteBtn.addEventListener('click', async () => {
        if (!currentGuildId) {
            alert('Please select a server first');
            return;
        }

        favoriteBtn.disabled = true;
        favoriteBtn.textContent = 'Setting...';

        try {
            const result = await packBotAPI.setFavoriteGuild(currentGuildId);
            if (result?.success) {
                favoriteGuildId = currentGuildId;
                const select = document.getElementById('guild-select');
                Array.from(select.options).forEach(opt => {
                    if (!opt.value) return;
                    const guild = guildsData.guilds.find(g => g.id === opt.value);
                    opt.textContent = formatGuildLabel(guild, opt.value === favoriteGuildId);
                });
            }
            favoriteBtn.textContent = 'Saved';
        } catch (error) {
            console.error('Failed to set favorite guild', error);
            favoriteBtn.textContent = 'Failed';
        } finally {
            setTimeout(() => {
                favoriteBtn.textContent = 'Set Favorite';
                favoriteBtn.disabled = false;
            }, 1500);
        }
    });
}

async function loadGuilds() {
    try {
        const [guildsRes, prefsRes] = await Promise.all([
            fetch('/api/guilds', { credentials: 'include' }),
            packBotAPI.getPreferences(),
        ]);

        const data = await guildsRes.json();
        guildsData = data;
        favoriteGuildId = prefsRes?.favoriteGuildId || null;

        const select = document.getElementById('guild-select');
        if (!data.guilds || data.guilds.length === 0) {
            select.innerHTML = '<option value="">No servers available</option>';
            updateGuildHint(null);
            updateYouTubeVisibility();
            return;
        }

        select.innerHTML = '<option value="">Select a server...</option>';
        data.guilds.forEach(guild => {
            const option = document.createElement('option');
            option.value = guild.id;
            option.textContent = formatGuildLabel(guild, guild.id === favoriteGuildId);
            select.appendChild(option);
        });

        select.addEventListener('change', () => {
            handleGuildChange(select.value);
        });

        if (favoriteGuildId && data.guilds.some(g => g.id === favoriteGuildId)) {
            select.value = favoriteGuildId;
            select.dispatchEvent(new Event('change'));
        }
    } catch (error) {
        console.error('Failed to load guilds', error);
    }
}

function formatGuildLabel(guild, isFavorite) {
    if (!guild) return '';
    const favoritePrefix = isFavorite ? '* ' : '';
    const adminSuffix = guild.isAdmin ? ' (admin)' : '';
    return `${favoritePrefix}${guild.name}${adminSuffix}`;
}

function handleGuildChange(guildId) {
    if (!guildId) {
        currentGuildId = null;
        isCurrentGuildAdmin = false;
        updateGuildHint(null);
        updateYouTubeVisibility();
        return;
    }

    currentGuildId = guildId;
    const selectedGuild = guildsData.guilds.find(g => g.id === currentGuildId);
    isCurrentGuildAdmin = selectedGuild?.isAdmin || guildsData.isSuperAdmin || false;

    updateGuildHint(selectedGuild);
    updateYouTubeVisibility();
    loadChannels();
}

function updateGuildHint(selectedGuild) {
    const hint = document.getElementById('guild-admin-hint');
    if (!selectedGuild) {
        hint.textContent = 'Select a server to load YouTube channels.';
        return;
    }

    hint.textContent = isCurrentGuildAdmin
        ? 'Admin access enabled for this server.'
        : 'View-only access. Admin permission is required to add or remove channels.';
}

function updateYouTubeVisibility() {
    const addSection = document.getElementById('youtube-add-section');
    const channelsSection = document.getElementById('youtube-channels-section');
    const loading = document.getElementById('youtube-channels-loading');
    const grid = document.getElementById('youtube-channels-grid');
    const noChannels = document.getElementById('youtube-no-channels');

    if (!currentGuildId) {
        addSection.style.display = 'none';
        channelsSection.style.display = 'none';
        loading.style.display = 'none';
        grid.innerHTML = '';
        noChannels.style.display = 'none';
        return;
    }

    addSection.style.display = isCurrentGuildAdmin ? 'block' : 'none';
    channelsSection.style.display = 'block';
}

function bindYouTubeControls() {
    const addForm = document.getElementById('youtube-add-form');
    if (!addForm) return;

    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!isCurrentGuildAdmin) {
            alert('Admin permission required');
            return;
        }

        const input = document.getElementById('youtube-channel-handle');
        const btn = document.getElementById('youtube-add-btn');
        const errorEl = document.getElementById('youtube-error-message');
        const successEl = document.getElementById('youtube-success-message');

        let handle = input.value.trim();
        if (handle.includes('youtube.com')) {
            const match = handle.match(/@([^/?]+)/);
            if (match) handle = match[1];
        }
        handle = handle.replace(/^@/, '');

        if (!handle) {
            errorEl.textContent = 'Please enter a valid channel handle';
            errorEl.classList.add('show');
            successEl.classList.remove('show');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Adding...';
        errorEl.classList.remove('show');
        successEl.classList.remove('show');

        try {
            const response = await fetch(`/api/youtube/${currentGuildId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ handle }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to add channel');
            }

            successEl.textContent = `Successfully added @${handle}`;
            successEl.classList.add('show');
            input.value = '';
            await loadChannels();
        } catch (error) {
            errorEl.textContent = error.message;
            errorEl.classList.add('show');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Add Channel';
        }
    });
}

async function loadChannels() {
    if (!currentGuildId) return;

    const loading = document.getElementById('youtube-channels-loading');
    const grid = document.getElementById('youtube-channels-grid');
    const noChannels = document.getElementById('youtube-no-channels');

    loading.style.display = 'block';
    grid.innerHTML = '';
    noChannels.style.display = 'none';

    try {
        const response = await fetch(`/api/youtube/${currentGuildId}`, { credentials: 'include' });
        const data = await response.json();

        loading.style.display = 'none';

        if (!data.channels || data.channels.length === 0) {
            noChannels.style.display = 'block';
            if (!isCurrentGuildAdmin) {
                noChannels.innerHTML = [
                    '<div class="empty-state-icon">YT</div>',
                    '<h3>No Channels Tracked</h3>',
                    '<p>No YouTube channels are being tracked for this server.</p>'
                ].join('');
            }
            return;
        }

        data.channels.forEach(channel => {
            const card = document.createElement('div');
            card.className = 'channel-card';

            const deleteBtn = isCurrentGuildAdmin
                ? `<button class="btn-icon" onclick="removeChannel('${escapeHtml(channel.handle)}')" title="Remove"><svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>`
                : '';

            const subscriberCount = window.formatNumber ? window.formatNumber(channel.subscriberCount) : channel.subscriberCount;
            const videoCount = window.formatNumber ? window.formatNumber(channel.videoCount) : channel.videoCount;

            card.innerHTML = `
                <img class="channel-avatar" src="${channel.thumbnail || '/img/default-avatar.png'}" alt="${escapeHtml(channel.title || channel.handle)}">
                <div class="channel-info">
                    <div class="channel-name">${escapeHtml(channel.title || channel.handle)}</div>
                    <div class="channel-handle">@${escapeHtml(channel.handle)}</div>
                    ${channel.subscriberCount ? `
                    <div class="channel-stats">
                        <span>${subscriberCount} subscribers</span>
                        <span>${videoCount} videos</span>
                    </div>
                    ` : ''}
                </div>
                <div class="channel-actions">
                    <a href="https://youtube.com/@${encodeURIComponent(channel.handle)}" target="_blank" class="btn-icon primary" title="View Channel">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                    </a>
                    ${deleteBtn}
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (error) {
        console.error('Failed to load YouTube channels', error);
        loading.style.display = 'none';
        grid.innerHTML = '<div class="error-message show">Failed to load channels</div>';
    }
}

async function removeChannel(handle) {
    if (!isCurrentGuildAdmin) {
        alert('Admin permission required');
        return;
    }

    if (!confirm(`Remove @${handle} from tracked channels?`)) return;

    try {
        const response = await fetch(`/api/youtube/${currentGuildId}/${encodeURIComponent(handle)}`, {
            method: 'DELETE',
            credentials: 'include',
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to remove channel');
        }

        await loadChannels();
    } catch (error) {
        alert(error.message);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
