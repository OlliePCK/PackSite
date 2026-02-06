let currentGuildId = null;
let monitors = [];
let availableChannels = [];
let availableRoles = [];
let editingMonitorId = null;
let activeDiffMonitorId = null;
let guildsData = null;
let isCurrentGuildAdmin = false;
let favoriteGuildId = null;

document.addEventListener('DOMContentLoaded', async () => {
    initTabs();
    bindGlobalControls();
    bindMonitorControls();
    bindYouTubeControls();
    bindShopifyControls();
    await waitForAuth();
});

function initTabs() {
    const tabs = Array.from(document.querySelectorAll('.utility-tab'));
    const sections = Array.from(document.querySelectorAll('.utility-section'));

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            sections.forEach(section => {
                section.classList.toggle('active', section.id === `utility-${target}`);
            });
        });
    });
}

async function waitForAuth() {
    await new Promise(resolve => setTimeout(resolve, 100));

    const me = await packBotAPI.getMe();
    if (me && me.authenticated) {
        document.getElementById('not-logged-in').classList.add('hidden');
        document.getElementById('utilities-content').classList.remove('hidden');
        loadGuilds();
        loadImaxStatus();
    }
}

function bindGlobalControls() {
    const favoriteBtn = document.getElementById('set-favorite-btn');
    if (favoriteBtn) {
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
                        if (opt.value) {
                            const guild = guildsData.guilds.find(g => g.id === opt.value);
                            opt.textContent = formatGuildLabel(guild, opt.value === favoriteGuildId);
                        }
                    });
                    favoriteBtn.textContent = 'Saved';
                    setTimeout(() => {
                        favoriteBtn.textContent = 'Set Favorite';
                        favoriteBtn.disabled = false;
                    }, 1500);
                }
            } catch (error) {
                console.error('Failed to set favorite:', error);
                favoriteBtn.textContent = 'Failed';
                setTimeout(() => {
                    favoriteBtn.textContent = 'Set Favorite';
                    favoriteBtn.disabled = false;
                }, 1500);
            }
        });
    }
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

        if (favoriteGuildId && data.guilds.find(g => g.id === favoriteGuildId)) {
            select.value = favoriteGuildId;
            select.dispatchEvent(new Event('change'));
        }
    } catch (error) {
        console.error('Failed to load guilds:', error);
    }
}

function formatGuildLabel(guild, isFavorite) {
    if (!guild) return '';
    const favoritePrefix = isFavorite ? '* ' : '';
    const adminSuffix = guild.isAdmin ? ' (admin)' : '';
    return `${favoritePrefix}${guild.name}${adminSuffix}`;
}

function handleGuildChange(guildId) {
    if (guildId) {
        currentGuildId = guildId;
        const selectedGuild = guildsData.guilds.find(g => g.id === currentGuildId);
        isCurrentGuildAdmin = selectedGuild?.isAdmin || guildsData.isSuperAdmin || false;
        updateGuildHint(selectedGuild);
        loadMonitors();
        updateYouTubeVisibility();
        loadChannels();
    } else {
        currentGuildId = null;
        isCurrentGuildAdmin = false;
        updateGuildHint(null);
        clearMonitorsView();
        updateYouTubeVisibility();
    }
}

function updateGuildHint(selectedGuild) {
    const hint = document.getElementById('guild-admin-hint');
    if (!selectedGuild) {
        hint.textContent = 'Select a server to load monitors and YouTube.';
        return;
    }
    hint.textContent = isCurrentGuildAdmin
        ? 'Admin access enabled for this server.'
        : 'View-only access. Admin permission is required to add or edit utilities.';
}

function clearMonitorsView() {
    document.getElementById('add-form-container').style.display = 'none';
    document.getElementById('show-add-btn-container').style.display = 'none';
    document.getElementById('monitors-list').innerHTML = '';
    document.getElementById('monitors-loading').style.display = 'none';
}

function updateYouTubeVisibility() {
    const addSection = document.getElementById('youtube-add-section');
    const channelsSection = document.getElementById('youtube-channels-section');

    if (!currentGuildId) {
        addSection.style.display = 'none';
        channelsSection.style.display = 'none';
        return;
    }

    addSection.style.display = isCurrentGuildAdmin ? 'block' : 'none';
    channelsSection.style.display = 'block';
}

function bindMonitorControls() {
    document.getElementById('show-add-btn').addEventListener('click', () => {
        document.getElementById('add-form-container').style.display = 'block';
        document.getElementById('show-add-btn-container').style.display = 'none';
    });

    document.getElementById('cancel-add-btn').addEventListener('click', () => {
        document.getElementById('add-form-container').style.display = 'none';
        document.getElementById('show-add-btn-container').style.display = 'block';
        clearAddForm();
    });

    document.getElementById('add-monitor-btn').addEventListener('click', addMonitor);

    document.getElementById('edit-cancel-btn').addEventListener('click', closeEditModal);
    document.getElementById('edit-save-btn').addEventListener('click', saveMonitorEdits);
    document.getElementById('edit-modal').addEventListener('click', (e) => {
        if (e.target.id === 'edit-modal') {
            closeEditModal();
        }
    });

    document.getElementById('diff-run-btn').addEventListener('click', runDiff);
    document.getElementById('diff-close-btn').addEventListener('click', closeDiffModal);
    document.getElementById('diff-modal').addEventListener('click', (e) => {
        if (e.target.id === 'diff-modal') {
            closeDiffModal();
        }
    });

    document.getElementById('ignore-block-add-btn').addEventListener('click', async () => {
        const input = document.getElementById('ignore-block-input');
        const value = input.value.trim();
        if (!value) return;
        await addIgnoreBlock(value);
        input.value = '';
    });

    document.getElementById('ignore-pattern-add-btn').addEventListener('click', async () => {
        const input = document.getElementById('ignore-pattern-input');
        const value = input.value.trim();
        if (!value) return;
        await addIgnorePattern(value);
        input.value = '';
    });
}

async function loadMonitors() {
    if (!currentGuildId) return;

    const list = document.getElementById('monitors-list');
    const loading = document.getElementById('monitors-loading');
    const showAddBtn = document.getElementById('show-add-btn-container');
    const addForm = document.getElementById('add-form-container');

    list.innerHTML = '';
    addForm.style.display = 'none';
    showAddBtn.style.display = 'none';
    loading.style.display = 'block';

    try {
        const response = await fetch(`/api/monitors/${currentGuildId}`, { credentials: 'include' });
        const data = await response.json();

        monitors = data.monitors || [];
        availableChannels = data.availableChannels || [];
        availableRoles = data.availableRoles || [];

        populateDropdowns();

        loading.style.display = 'none';

        if (isCurrentGuildAdmin) {
            showAddBtn.style.display = 'block';
        }

        if (monitors.length === 0) {
            const emptyMsg = isCurrentGuildAdmin
                ? '<p>Add a page monitor to start tracking website changes</p>'
                : '<p>No page monitors are configured for this server</p>';
            list.innerHTML = `
                <div class="empty-monitors">
                    <div class="empty-monitors-icon">MON</div>
                    <h3>No Monitors Yet</h3>
                    ${emptyMsg}
                </div>
            `;
            return;
        }

        monitors.forEach(monitor => {
            list.appendChild(createMonitorCard(monitor));
        });
    } catch (error) {
        console.error('Failed to load monitors:', error);
        loading.style.display = 'none';
        list.innerHTML = '<div class="error-info">Failed to load monitors</div>';
    }
}

function populateDropdowns() {
    const addChannel = document.getElementById('add-channel');
    const addRole = document.getElementById('add-role');

    addChannel.innerHTML = '<option value="">Select a channel...</option>';
    availableChannels.forEach(ch => {
        addChannel.innerHTML += `<option value="${ch.id}">#${ch.name}</option>`;
    });

    addRole.innerHTML = '<option value="">No ping</option>';
    availableRoles.forEach(r => {
        addRole.innerHTML += `<option value="${r.id}">@${r.name}</option>`;
    });
}

function resolveMonitorType(monitor) {
    const type = monitor.monitorType || 'auto';
    if (type === 'auto' && monitor.detectedType) {
        return { label: formatType(monitor.detectedType), suffix: ' (auto)' };
    }
    return { label: formatType(type), suffix: '' };
}

function createMonitorCard(monitor) {
    const card = document.createElement('div');
    card.className = 'monitor-card';

    let statusClass = 'active';
    let statusText = 'Active';
    if (!monitor.isActive) {
        statusClass = 'paused';
        statusText = 'Paused';
    } else if (monitor.errorCount > 0) {
        statusClass = 'error';
        statusText = `Errors: ${monitor.errorCount}`;
    }

    const typeInfo = resolveMonitorType(monitor);

    card.innerHTML = `
        <div class="monitor-header">
            <div class="monitor-name">${escapeHtml(monitor.name)}</div>
            <span class="monitor-status ${statusClass}">${statusText}</span>
        </div>
        <div class="monitor-url">
            <a href="${escapeHtml(monitor.url)}" target="_blank" rel="noopener">${escapeHtml(monitor.url)}</a>
        </div>
        ${monitor.lastError ? `<div class="error-info">Last error: ${escapeHtml(monitor.lastError)}</div>` : ''}
        ${monitor.keywords ? `
            <div class="monitor-keywords">
                ${monitor.keywords.split(',').map(k => `<span class="keyword-tag">${escapeHtml(k.trim())}</span>`).join('')}
            </div>
        ` : ''}
        <div class="monitor-meta">
            <div class="monitor-meta-item">
                <span class="monitor-meta-label">Type</span>
                <span>${typeInfo.label}${typeInfo.suffix}</span>
            </div>
            <div class="monitor-meta-item">
                <span class="monitor-meta-label">Channel</span>
                <span>#${escapeHtml(monitor.channelName)}</span>
            </div>
            <div class="monitor-meta-item">
                <span class="monitor-meta-label">Interval</span>
                <span>${formatInterval(monitor.checkInterval)}</span>
            </div>
            <div class="monitor-meta-item">
                <span class="monitor-meta-label">Last Checked</span>
                <span>${formatDate(monitor.lastChecked)}</span>
            </div>
            <div class="monitor-meta-item">
                <span class="monitor-meta-label">Last Changed</span>
                <span>${formatDate(monitor.lastChanged)}</span>
            </div>
            ${monitor.roleName ? `
                <div class="monitor-meta-item">
                    <span class="monitor-meta-label">Ping Role</span>
                    <span>@${escapeHtml(monitor.roleName)}</span>
                </div>
            ` : ''}
        </div>
        ${isCurrentGuildAdmin ? `
        <div class="monitor-actions">
            <button class="btn btn-secondary" onclick="testMonitor(${monitor.id})">Test</button>
            <button class="btn btn-secondary" onclick="openDiffModal(${monitor.id})">Diff</button>
            <button class="btn btn-secondary" onclick="editMonitor(${monitor.id})">Edit</button>
            ${monitor.isActive
                ? `<button class="btn btn-warning" onclick="toggleMonitor(${monitor.id}, false)">Pause</button>`
                : `<button class="btn btn-success" onclick="toggleMonitor(${monitor.id}, true)">Resume</button>`
            }
            <button class="btn btn-danger" onclick="deleteMonitor(${monitor.id})">Delete</button>
        </div>
        ` : ''}
        <div id="test-result-${monitor.id}" class="test-result" style="display: none;"></div>
    `;

    return card;
}

function clearAddForm() {
    document.getElementById('add-name').value = '';
    document.getElementById('add-url').value = '';
    document.getElementById('add-channel').value = '';
    document.getElementById('add-interval').value = '60';
    document.getElementById('add-keywords').value = '';
    document.getElementById('add-type').value = 'auto';
    document.getElementById('add-role').value = '';
}

async function addMonitor() {
    if (!isCurrentGuildAdmin) {
        alert('Admin permission required');
        return;
    }

    const name = document.getElementById('add-name').value.trim();
    const url = document.getElementById('add-url').value.trim();
    const channelId = document.getElementById('add-channel').value;
    const checkInterval = document.getElementById('add-interval').value;
    const keywords = document.getElementById('add-keywords').value.trim();
    const monitorType = document.getElementById('add-type').value;
    const roleToMention = document.getElementById('add-role').value;

    if (!name || !url || !channelId) {
        alert('Please fill in name, URL, and channel');
        return;
    }

    const btn = document.getElementById('add-monitor-btn');
    btn.disabled = true;
    btn.textContent = 'Adding...';

    try {
        const response = await fetch(`/api/monitors/${currentGuildId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                name,
                url,
                channelId,
                checkInterval: parseInt(checkInterval, 10),
                keywords: keywords || null,
                monitorType,
                roleToMention: roleToMention || null,
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to add monitor');
        }

        clearAddForm();
        document.getElementById('add-form-container').style.display = 'none';
        document.getElementById('show-add-btn-container').style.display = 'block';
        loadMonitors();
    } catch (error) {
        alert(error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Add Monitor';
    }
}

async function testMonitor(monitorId) {
    if (!isCurrentGuildAdmin) {
        alert('Admin permission required');
        return;
    }

    const resultEl = document.getElementById(`test-result-${monitorId}`);
    resultEl.style.display = 'block';
    resultEl.className = 'test-result';
    resultEl.textContent = 'Testing...';

    try {
        const response = await fetch(`/api/monitors/${currentGuildId}/${monitorId}/test`, {
            method: 'POST',
            credentials: 'include',
        });

        const data = await response.json();

        if (data.success) {
            let msg = `Page fetched successfully (${data.contentLength} bytes)`;
            if (data.pageTitle) msg += `\nTitle: ${data.pageTitle}`;
            if (data.keywordsFound?.length) msg += `\nKeywords found: ${data.keywordsFound.join(', ')}`;
            resultEl.className = 'test-result success';
            resultEl.textContent = msg;
        } else {
            resultEl.className = 'test-result error';
            resultEl.textContent = data.error || `HTTP ${data.status}: ${data.statusText}`;
        }
    } catch (error) {
        resultEl.className = 'test-result error';
        resultEl.textContent = error.message;
    }

    setTimeout(() => {
        resultEl.style.display = 'none';
    }, 10000);
}

function getMonitorById(monitorId) {
    return monitors.find(m => m.id === monitorId);
}

function parseAlertSettings(monitor) {
    if (!monitor || monitor.alertSettings == null) return {};
    if (typeof monitor.alertSettings === 'object') {
        return { ...monitor.alertSettings };
    }
    try {
        return JSON.parse(monitor.alertSettings);
    } catch {
        return {};
    }
}

function normalizeBlockPrefix(value) {
    return (value || '')
        .toLowerCase()
        .replace(/[^a-f0-9]/g, '')
        .slice(0, 40);
}

function setDiffStatus(message, kind) {
    const statusEl = document.getElementById('diff-status');
    if (!message) {
        statusEl.style.display = 'none';
        return;
    }
    statusEl.style.display = 'block';
    statusEl.className = 'test-result' + (kind ? ` ${kind}` : '');
    statusEl.textContent = message;
}

function renderIgnoreLists(monitor) {
    const settings = parseAlertSettings(monitor);
    const blockPrefixes = Array.isArray(settings.ignoreBlockHashPrefixes) ? settings.ignoreBlockHashPrefixes : [];
    const patterns = Array.isArray(settings.ignorePatterns) ? settings.ignorePatterns : [];

    const blockList = document.getElementById('ignore-block-list');
    const patternList = document.getElementById('ignore-pattern-list');
    blockList.innerHTML = '';
    patternList.innerHTML = '';

    if (blockPrefixes.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'keyword-tag';
        empty.textContent = 'None';
        blockList.appendChild(empty);
    } else {
        blockPrefixes.forEach(prefix => {
            const tag = document.createElement('div');
            tag.className = 'ignore-tag';
            const code = document.createElement('code');
            code.textContent = prefix;
            const btn = document.createElement('button');
            btn.className = 'ignore-remove';
            btn.textContent = 'Remove';
            btn.addEventListener('click', () => removeIgnoreBlock(prefix));
            tag.appendChild(code);
            tag.appendChild(btn);
            blockList.appendChild(tag);
        });
    }

    if (patterns.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'keyword-tag';
        empty.textContent = 'None';
        patternList.appendChild(empty);
    } else {
        patterns.forEach(pattern => {
            const tag = document.createElement('div');
            tag.className = 'ignore-tag';
            const code = document.createElement('code');
            code.textContent = pattern;
            const btn = document.createElement('button');
            btn.className = 'ignore-remove';
            btn.textContent = 'Remove';
            btn.addEventListener('click', () => removeIgnorePattern(pattern));
            tag.appendChild(code);
            tag.appendChild(btn);
            patternList.appendChild(tag);
        });
    }
}

async function saveAlertSettings(monitorId, settings) {
    const response = await fetch(`/api/monitors/${currentGuildId}/${monitorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ alertSettings: settings }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Failed to update ignore rules');
    }

    const monitor = getMonitorById(monitorId);
    if (monitor) {
        monitor.alertSettings = settings;
    }
}

async function addIgnoreBlock(prefix) {
    if (!activeDiffMonitorId) return;
    const monitor = getMonitorById(activeDiffMonitorId);
    if (!monitor) return;

    const normalized = normalizeBlockPrefix(prefix);
    if (!normalized || normalized.length < 6) {
        alert('Block prefix must be at least 6 hex characters.');
        return;
    }

    const settings = parseAlertSettings(monitor);
    const existing = Array.isArray(settings.ignoreBlockHashPrefixes) ? settings.ignoreBlockHashPrefixes : [];
    const next = Array.from(new Set([...existing, normalized]));
    settings.ignoreBlockHashPrefixes = next;

    await saveAlertSettings(activeDiffMonitorId, settings);
    renderIgnoreLists(monitor);
}

async function addIgnorePattern(pattern) {
    if (!activeDiffMonitorId) return;
    const monitor = getMonitorById(activeDiffMonitorId);
    if (!monitor) return;

    const value = (pattern || '').trim();
    if (!value) return;
    try {
        new RegExp(value, 'i');
    } catch {
        alert('Invalid regex pattern.');
        return;
    }

    const settings = parseAlertSettings(monitor);
    const existing = Array.isArray(settings.ignorePatterns) ? settings.ignorePatterns : [];
    const next = Array.from(new Set([...existing, value]));
    settings.ignorePatterns = next;

    await saveAlertSettings(activeDiffMonitorId, settings);
    renderIgnoreLists(monitor);
}

async function removeIgnoreBlock(prefix) {
    if (!activeDiffMonitorId) return;
    const monitor = getMonitorById(activeDiffMonitorId);
    if (!monitor) return;

    const settings = parseAlertSettings(monitor);
    const existing = Array.isArray(settings.ignoreBlockHashPrefixes) ? settings.ignoreBlockHashPrefixes : [];
    settings.ignoreBlockHashPrefixes = existing.filter(p => p !== prefix);

    await saveAlertSettings(activeDiffMonitorId, settings);
    renderIgnoreLists(monitor);
}

async function removeIgnorePattern(pattern) {
    if (!activeDiffMonitorId) return;
    const monitor = getMonitorById(activeDiffMonitorId);
    if (!monitor) return;

    const settings = parseAlertSettings(monitor);
    const existing = Array.isArray(settings.ignorePatterns) ? settings.ignorePatterns : [];
    settings.ignorePatterns = existing.filter(p => p !== pattern);

    await saveAlertSettings(activeDiffMonitorId, settings);
    renderIgnoreLists(monitor);
}

function renderDiffResults(changes) {
    const resultsEl = document.getElementById('diff-results');
    resultsEl.innerHTML = '';

    if (!changes || changes.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'error-info';
        empty.textContent = 'No changes detected.';
        resultsEl.appendChild(empty);
        return;
    }

    changes.forEach(change => {
        const item = document.createElement('div');
        item.className = 'diff-item';
        if (change.type === 'content_added') item.classList.add('added');
        if (change.type === 'content_removed') item.classList.add('removed');

        const meta = document.createElement('div');
        meta.className = 'diff-meta';
        const hashLabel = change.blockHash ? ` | ${change.blockHash.slice(0, 8)}` : '';
        meta.textContent = `${change.type || 'change'}${hashLabel}`;

        const text = document.createElement('div');
        text.textContent = change.message || 'Change detected';

        item.appendChild(meta);
        item.appendChild(text);

        if (change.snippet && change.snippet !== change.message) {
            const snippet = document.createElement('div');
            snippet.className = 'diff-meta';
            snippet.textContent = change.snippet;
            item.appendChild(snippet);
        }

        if (change.blockHash) {
            const actions = document.createElement('div');
            actions.className = 'diff-actions';
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary btn-small';
            btn.textContent = 'Ignore';
            btn.addEventListener('click', () => addIgnoreBlock(change.blockHash.slice(0, 8)));
            actions.appendChild(btn);
            item.appendChild(actions);
        }

        resultsEl.appendChild(item);
    });
}

async function runDiff() {
    if (!isCurrentGuildAdmin) {
        alert('Admin permission required');
        return;
    }
    if (!activeDiffMonitorId) return;

    setDiffStatus('Running diff...');
    document.getElementById('diff-results').innerHTML = '';

    try {
        const response = await fetch(`/api/monitors/${currentGuildId}/${activeDiffMonitorId}/diff`, {
            method: 'POST',
            credentials: 'include',
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to compute diff');
        }

        renderDiffResults(data.changes || []);
        setDiffStatus(data.hasChanges ? 'Changes detected.' : 'No changes detected.', 'success');
    } catch (error) {
        setDiffStatus(`Error: ${error.message}`, 'error');
    }
}

function openDiffModal(monitorId) {
    if (!isCurrentGuildAdmin) {
        alert('Admin permission required');
        return;
    }

    const monitor = getMonitorById(monitorId);
    if (!monitor) return;

    activeDiffMonitorId = monitorId;
    document.getElementById('diff-monitor-name').textContent = `${monitor.name} (ID: ${monitor.id})`;
    document.getElementById('diff-modal').classList.add('active');
    document.getElementById('diff-results').innerHTML = '';
    document.getElementById('ignore-block-input').value = '';
    document.getElementById('ignore-pattern-input').value = '';
    setDiffStatus('');
    renderIgnoreLists(monitor);
}

function closeDiffModal() {
    document.getElementById('diff-modal').classList.remove('active');
    activeDiffMonitorId = null;
}

async function toggleMonitor(monitorId, isActive) {
    if (!isCurrentGuildAdmin) {
        alert('Admin permission required');
        return;
    }

    try {
        const response = await fetch(`/api/monitors/${currentGuildId}/${monitorId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ isActive }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to update monitor');
        }

        loadMonitors();
    } catch (error) {
        alert(error.message);
    }
}

async function deleteMonitor(monitorId) {
    if (!isCurrentGuildAdmin) {
        alert('Admin permission required');
        return;
    }

    if (!confirm('Are you sure you want to delete this monitor?')) return;

    try {
        const response = await fetch(`/api/monitors/${currentGuildId}/${monitorId}`, {
            method: 'DELETE',
            credentials: 'include',
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to delete monitor');
        }

        loadMonitors();
    } catch (error) {
        alert(error.message);
    }
}

function editMonitor(monitorId) {
    if (!isCurrentGuildAdmin) {
        alert('Admin permission required');
        return;
    }

    const monitor = monitors.find(m => m.id === monitorId);
    if (!monitor) return;

    editingMonitorId = monitorId;
    document.getElementById('edit-name').value = monitor.name;
    document.getElementById('edit-url').value = monitor.url;
    document.getElementById('edit-interval').value = monitor.checkInterval;
    document.getElementById('edit-keywords').value = monitor.keywords || '';
    document.getElementById('edit-type').value = monitor.monitorType || 'auto';

    const editChannel = document.getElementById('edit-channel');
    editChannel.innerHTML = '';
    availableChannels.forEach(ch => {
        editChannel.innerHTML += `<option value="${ch.id}" ${ch.id === monitor.channelId ? 'selected' : ''}>#${ch.name}</option>`;
    });

    const editRole = document.getElementById('edit-role');
    editRole.innerHTML = '<option value="">No ping</option>';
    availableRoles.forEach(r => {
        editRole.innerHTML += `<option value="${r.id}" ${r.id === monitor.roleToMention ? 'selected' : ''}>@${r.name}</option>`;
    });

    document.getElementById('edit-modal').classList.add('active');
}

function closeEditModal() {
    document.getElementById('edit-modal').classList.remove('active');
    editingMonitorId = null;
}

async function saveMonitorEdits() {
    if (!editingMonitorId) return;

    const btn = document.getElementById('edit-save-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const response = await fetch(`/api/monitors/${currentGuildId}/${editingMonitorId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                name: document.getElementById('edit-name').value.trim(),
                url: document.getElementById('edit-url').value.trim(),
                channelId: document.getElementById('edit-channel').value,
                checkInterval: parseInt(document.getElementById('edit-interval').value, 10),
                keywords: document.getElementById('edit-keywords').value.trim() || null,
                monitorType: document.getElementById('edit-type').value,
                roleToMention: document.getElementById('edit-role').value || null,
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to update monitor');
        }

        closeEditModal();
        loadMonitors();
    } catch (error) {
        alert(error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Changes';
    }
}

function bindYouTubeControls() {
    const addForm = document.getElementById('youtube-add-form');
    if (addForm) {
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
                loadChannels();
            } catch (error) {
                errorEl.textContent = error.message;
                errorEl.classList.add('show');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Add Channel';
            }
        });
    }
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
                noChannels.innerHTML = `
                    <div class="empty-state-icon">YT</div>
                    <h3>No Channels Tracked</h3>
                    <p>No YouTube channels are being tracked for this server</p>
                `;
            }
            return;
        }

        data.channels.forEach(channel => {
            const card = document.createElement('div');
            card.className = 'channel-card';

            const deleteBtn = isCurrentGuildAdmin ? `
                <button class="btn-icon" onclick="removeChannel('${escapeHtml(channel.handle)}')" title="Remove">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
            ` : '';

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
        console.error('Failed to load channels:', error);
        loading.style.display = 'none';
        grid.innerHTML = '<div class="error-info">Failed to load channels</div>';
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

        loadChannels();
    } catch (error) {
        alert(error.message);
    }
}

function bindShopifyControls() {
    const lookupForm = document.getElementById('shopify-lookup-form');
    if (lookupForm) {
        lookupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const url = document.getElementById('shopify-product-url').value.trim();
            const btn = document.getElementById('shopify-lookup-btn');
            const errorEl = document.getElementById('shopify-error-message');
            const loadingEl = document.getElementById('shopify-loading-card');
            const resultEl = document.getElementById('shopify-product-result');

            if (!url) return;

            btn.disabled = true;
            btn.textContent = 'Loading...';
            errorEl.classList.remove('show');
            resultEl.classList.remove('show');
            loadingEl.style.display = 'block';

            try {
                const response = await fetch('/api/shopify/lookup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ url }),
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Failed to lookup product');
                }

                displayProduct(data);
            } catch (error) {
                errorEl.textContent = error.message;
                errorEl.classList.add('show');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Lookup';
                loadingEl.style.display = 'none';
            }
        });
    }
}

function displayProduct(product) {
    const result = document.getElementById('shopify-product-result');

    const imgEl = document.getElementById('shopify-product-image');
    if (product.image) {
        imgEl.src = product.image;
        imgEl.style.display = 'block';
    } else {
        imgEl.style.display = 'none';
    }

    document.getElementById('shopify-product-title').textContent = product.title;
    document.getElementById('shopify-product-vendor').textContent = product.vendor || 'Unknown Vendor';
    document.getElementById('shopify-product-type').textContent = product.productType || 'Product';

    const grid = document.getElementById('shopify-variants-grid');
    grid.innerHTML = '';

    (product.variants || []).forEach(variant => {
        const stockClass = variant.stock <= 0 ? 'oos' : variant.stock < 10 ? 'low' : '';
        const stockText = variant.stock === null ? 'N/A' : variant.stock;

        const card = document.createElement('div');
        card.className = 'variant-card';
        card.innerHTML = `
            <div class="variant-title">${escapeHtml(variant.title)}</div>
            <div class="variant-badges">
                <span class="badge badge-price">$${variant.price}</span>
                ${variant.compareAtPrice ? `<span class="badge" style="text-decoration: line-through; opacity: 0.5;">$${variant.compareAtPrice}</span>` : ''}
                <span class="badge badge-stock ${stockClass}">Stock: ${stockText}</span>
            </div>
            <div class="variant-actions">
                <a href="${variant.addToCart}" target="_blank" class="variant-btn primary">Add to Cart</a>
                <button class="variant-btn secondary copy-btn" data-url="${variant.addToCart}">Copy Link</button>
            </div>
        `;
        grid.appendChild(card);
    });

    grid.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            navigator.clipboard.writeText(btn.dataset.url);
            btn.textContent = 'Copied!';
            setTimeout(() => {
                btn.textContent = 'Copy Link';
            }, 1500);
        });
    });

    result.classList.add('show');
}

async function readJsonResponse(response, options = {}) {
    const text = await response.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        const status = `${response.status} ${response.statusText}`.trim();
        if (options.longRunning) {
            throw new Error(`Request failed (${status}). The scan may still be running; try again in a minute.`);
        }
        throw new Error(`Request failed (${status}).`);
    }
}

function setStatusMessage(element, message, kind) {
    if (!element) return;
    if (!message) {
        element.classList.remove('show', 'success', 'error');
        element.textContent = '';
        return;
    }
    element.textContent = message;
    element.classList.add('show');
    element.classList.remove('success', 'error');
    if (kind) {
        element.classList.add(kind);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleString();
}

function formatShortDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
    });
}

function formatInterval(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
}

function formatType(type) {
    const types = {
        auto: 'Auto',
        shopify: 'Shopify',
        ticketmaster: 'Ticketmaster',
        ticketek: 'Ticketek',
        axs: 'AXS',
        eventbrite: 'Eventbrite',
        generic: 'Generic',
    };

    if (!type) return types.auto;
    return types[type] || `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
}
