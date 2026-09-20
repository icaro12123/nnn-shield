// ==========================================================================
// NNN SHIELD - MAIN APPLICATION CONTROLLER
// ==========================================================================

import { TimeVault } from './modules/vault/vault.js';
import { PiHoleService } from './modules/pihole/pihole.js';
import { AndroidSetupGuide } from './modules/android/setup.js';
import { ChallengeTracker } from './modules/tracker/tracker.js';
import { PanicService } from './modules/panic/panic.js';
import { BlockerTester } from './modules/tester/tester.js';
import { EncryptedJournal } from './modules/journal/journal.js';
import { IntegrityMonitor } from './modules/integrity/integrity.js';
import { PIHOLE_NSFW_ADLISTS, SAFESEARCH_CNAME_REWRITES } from './data/blocklists.js';

// Global state & intervals
let vaultInterval = null;
let breathingInterval = null;
let showerTimerInterval = null;
let showerSecondsLeft = 120;
let pushupCount = 0;
let currentMood = 3;

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initTrackerTab();
  initVaultTab();
  initPiHoleTab();
  initAndroidSetupTab();
  initTesterTab();
  initJournalTab();
  initPanicModal();
  updateGlobalHeaderStatus();

  // Run initial background integrity check if challenge active
  setTimeout(() => {
    IntegrityMonitor.verifySystemIntegrity().catch(() => {});
  }, 2000);
});

// --------------------------------------------------------------------------
// Navigation & Global Header
// --------------------------------------------------------------------------
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item[data-tab]');
  const tabViews = document.querySelectorAll('.tab-view');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTabId = item.getAttribute('data-tab');

      navItems.forEach(n => n.classList.remove('active'));
      tabViews.forEach(v => v.classList.remove('active'));

      item.classList.add('active');
      const activeTab = document.getElementById(targetTabId);
      if (activeTab) activeTab.classList.add('active');

      // Refresh specific tab state on switch
      if (targetTabId === 'tab-tracker') updateTrackerUI();
      if (targetTabId === 'tab-vault') updateVaultUI();
    });
  });
}

function updateGlobalHeaderStatus() {
  const dot = document.getElementById('header-status-dot');
  const text = document.getElementById('header-status-text');
  const progress = ChallengeTracker.getProgress();
  const isVaultLocked = TimeVault.isLocked();

  if (progress.isActive) {
    dot.className = 'status-dot active';
    text.textContent = `Giorno ${progress.currentDay}/${progress.totalDays}`;
  } else if (isVaultLocked) {
    dot.className = 'status-dot active';
    text.textContent = 'Vault Attivo';
  } else {
    dot.className = 'status-dot';
    text.textContent = 'Pronto';
  }
}

// --------------------------------------------------------------------------
// Tab 1: Tracker & Streak
// --------------------------------------------------------------------------
function initTrackerTab() {
  const btnStart = document.getElementById('btn-start-challenge');
  const btnCheckin = document.getElementById('btn-checkin');

  btnStart.addEventListener('click', () => {
    if (confirm('Confermi l\'avvio della sfida No Nut November? Questo attiverà il tracker e le penalità anti-cheat.')) {
      ChallengeTracker.startChallenge(30);
      PanicService.playTone(520, 0.4);
      updateTrackerUI();
      updateGlobalHeaderStatus();
    }
  });

  btnCheckin.addEventListener('click', () => {
    const success = ChallengeTracker.checkInToday();
    if (success) {
      PanicService.playTone(660, 0.5);
      PanicService.vibrate([100, 50, 150]);
      alert('Check-in registrato per oggi! Continua a dominare la tua mente.');
      updateTrackerUI();
    } else {
      alert('Hai già effettuato il check-in per la giornata odierna!');
    }
  });

  updateTrackerUI();
}

function updateTrackerUI() {
  const progress = ChallengeTracker.getProgress();
  const circle = document.getElementById('tracker-progress-circle');
  const dayDisplay = document.getElementById('tracker-day-display');
  const statusHeadline = document.getElementById('tracker-status-headline');
  const subtext = document.getElementById('tracker-subtext');
  const btnStart = document.getElementById('btn-start-challenge');
  const btnCheckin = document.getElementById('btn-checkin');
  const penaltyCard = document.getElementById('penalty-card');
  const penaltyDesc = document.getElementById('penalty-desc');

  if (progress.isActive) {
    dayDisplay.textContent = progress.currentDay;
    const offset = 264 - (264 * progress.percentage) / 100;
    circle.style.strokeDashoffset = offset;

    statusHeadline.textContent = `Giorno ${progress.currentDay} di ${progress.totalDays}`;
    subtext.textContent = `Progresso completato: ${progress.percentage}%. Mancano ${progress.daysRemaining} giorni al traguardo.`;

    btnStart.style.display = 'none';
    btnCheckin.style.display = 'inline-flex';

    if (progress.isCheckedInToday) {
      btnCheckin.classList.remove('md-btn-primary');
      btnCheckin.classList.add('md-btn-tonal');
      btnCheckin.innerHTML = '<span class="material-symbols-rounded">check</span> Check-in Eseguito';
    } else {
      btnCheckin.classList.remove('md-btn-tonal');
      btnCheckin.classList.add('md-btn-primary');
      btnCheckin.innerHTML = '<span class="material-symbols-rounded">check_circle</span> Check-in Oggi';
    }

    if (progress.strikes > 0) {
      penaltyCard.style.display = 'block';
      penaltyDesc.textContent = `Rilevati ${progress.strikes} tentativi di aggiramento DNS. Sono state aggiunte ore di punizione alla cassaforte.`;
    } else {
      penaltyCard.style.display = 'none';
    }
  } else {
    circle.style.strokeDashoffset = 264;
    dayDisplay.textContent = '0';
    statusHeadline.textContent = 'Nessuna Sfida Attiva';
    subtext.textContent = 'Inizia la sfida per attivare il monitoraggio e la cassaforte inviolabile.';
    btnStart.style.display = 'inline-flex';
    btnCheckin.style.display = 'none';
    penaltyCard.style.display = 'none';
  }

  // Render Milestones
  const milestonesContainer = document.getElementById('milestones-container');
  const milestones = ChallengeTracker.getMilestones();
  milestonesContainer.innerHTML = '';

  milestones.forEach(m => {
    const card = document.createElement('div');
    card.className = `glass-panel ${m.unlocked ? 'glow-primary' : ''}`;
    card.style.padding = '12px 8px';
    card.style.borderRadius = '14px';
    card.style.textAlign = 'center';
    card.style.opacity = m.unlocked ? '1' : '0.45';

    card.innerHTML = `
      <span class="material-symbols-rounded" style="color: ${m.unlocked ? '#c084fc' : '#888'}; font-size: 28px; margin-bottom: 4px;">
        ${m.icon}
      </span>
      <span class="label-large" style="display: block; font-size: 11px;">Giorno ${m.day}</span>
      <span class="body-small" style="font-size: 10px; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">
        ${m.title}
      </span>
    `;
    milestonesContainer.appendChild(card);
  });
}

// --------------------------------------------------------------------------
// Tab 2: Vault (Cassaforte Temporale)
// --------------------------------------------------------------------------
function initVaultTab() {
  const btnLockCustom = document.getElementById('btn-lock-custom');
  const btnGenPihole = document.getElementById('btn-generate-pihole-lock');
  const btnUnlock = document.getElementById('btn-unlock-vault');
  const inputSecret = document.getElementById('vault-input-secret');
  const selectDuration = document.getElementById('vault-select-duration');

  btnLockCustom.addEventListener('click', async () => {
    const val = inputSecret.value.trim();
    if (!val) {
      alert('Inserisci una password o PIN da proteggere.');
      return;
    }
    const days = parseInt(selectDuration.value, 10);
    const targetMs = Date.now() + (days * 24 * 60 * 60 * 1000);

    const confirmed = confirm(
      `ATTENZIONE: Stai per sigillare questa password per ${days} giorni.\n` +
      `Non ci sarà ALCUN modo di recuperarla prima dello scadere del tempo.\n` +
      `Se disinstalli l'app, la password sarà PERDUTA PER SEMPRE.\n\nConfermi?`
    );

    if (confirmed) {
      try {
        await TimeVault.lockSecret(val, targetMs, 'Password Personale');
        inputSecret.value = '';
        updateVaultUI();
        updateGlobalHeaderStatus();
        alert('Password sigillata con successo nella cassaforte AES-GCM!');
      } catch (err) {
        alert('Errore nel sigillare la cassaforte: ' + err.message);
      }
    }
  });

  btnGenPihole.addEventListener('click', async () => {
    const days = parseInt(selectDuration.value, 10);
    const targetMs = Date.now() + (days * 24 * 60 * 60 * 1000);
    const randomPass = TimeVault.generateRandomPassword();

    const confirmed = confirm(
      `Generazione Password Pi-hole Casuale a 32 caratteri:\n\n` +
      `Verrà generata una password inviolabile e sigillata per ${days} giorni.\n` +
      `Confermi l'avvio del blocco irreversibile?`
    );

    if (confirmed) {
      try {
        await TimeVault.lockSecret(randomPass, targetMs, 'Password Casuale Pi-hole v6');
        updateVaultUI();
        updateGlobalHeaderStatus();
        alert('Nuova password generata e sigillata nella cassaforte!');
      } catch (err) {
        alert('Errore: ' + err.message);
      }
    }
  });

  btnUnlock.addEventListener('click', async () => {
    try {
      const secret = await TimeVault.unlockSecret();
      const secretBox = document.getElementById('decrypted-secret-box');
      secretBox.style.display = 'block';
      secretBox.innerHTML = `<strong>Password Decifrata:</strong><br><span style="color: #34d399;">${escapeHtml(secret)}</span>`;
      alert('Cassaforte sbloccata con successo!');
    } catch (err) {
      alert(err.message);
    }
  });

  updateVaultUI();
}

function updateVaultUI() {
  const isLocked = TimeVault.isLocked();
  const lockedView = document.getElementById('vault-locked-view');
  const setupView = document.getElementById('vault-setup-view');
  const countdownEl = document.getElementById('vault-countdown');
  const penaltyNotice = document.getElementById('vault-penalties-notice');
  const btnUnlock = document.getElementById('btn-unlock-vault');

  if (vaultInterval) clearInterval(vaultInterval);

  if (isLocked) {
    lockedView.style.display = 'block';
    setupView.style.display = 'none';

    const tick = () => {
      const remaining = TimeVault.getTimeRemaining();
      const pad = (n) => String(n).padStart(2, '0');
      countdownEl.textContent = `${remaining.days}d ${pad(remaining.hours)}h ${pad(remaining.minutes)}m ${pad(remaining.seconds)}s`;

      const state = TimeVault.getVaultState();
      if (state && state.penaltyHoursAdded > 0) {
        penaltyNotice.style.display = 'block';
        penaltyNotice.textContent = `+${state.penaltyHoursAdded}h di penalità aggiunte per cheat DNS`;
      } else {
        penaltyNotice.style.display = 'none';
      }

      if (TimeVault.isUnlockable()) {
        btnUnlock.disabled = false;
        btnUnlock.classList.remove('md-btn-tonal');
        btnUnlock.classList.add('md-btn-primary');
      } else {
        btnUnlock.disabled = true;
      }
    };

    tick();
    vaultInterval = setInterval(tick, 1000);
  } else {
    lockedView.style.display = 'none';
    setupView.style.display = 'block';
  }
}

// --------------------------------------------------------------------------
// Tab 3: Pi-hole v6
// --------------------------------------------------------------------------
function initPiHoleTab() {
  const modeApiBtn = document.getElementById('pihole-mode-api-btn');
  const modeManualBtn = document.getElementById('pihole-mode-manual-btn');
  const apiSection = document.getElementById('pihole-api-section');
  const manualSection = document.getElementById('pihole-manual-section');

  modeApiBtn.addEventListener('click', () => {
    modeApiBtn.className = 'md-btn md-btn-primary';
    modeManualBtn.className = 'md-btn md-btn-tonal';
    apiSection.style.display = 'block';
    manualSection.style.display = 'none';
  });

  modeManualBtn.addEventListener('click', () => {
    modeManualBtn.className = 'md-btn md-btn-primary';
    modeApiBtn.className = 'md-btn md-btn-tonal';
    manualSection.style.display = 'block';
    apiSection.style.display = 'none';
  });

  // API Connection
  const btnConnect = document.getElementById('btn-pihole-connect');
  const btnInject = document.getElementById('btn-pihole-inject-adlists');
  const statusBox = document.getElementById('pihole-api-status');

  btnConnect.addEventListener('click', async () => {
    const ip = document.getElementById('pihole-ip-input').value.trim();
    const port = parseInt(document.getElementById('pihole-port-input').value.trim(), 10) || 80;
    const pass = document.getElementById('pihole-pass-input').value;

    btnConnect.disabled = true;
    btnConnect.textContent = 'Connessione in corso...';
    statusBox.style.display = 'block';
    statusBox.textContent = 'Tentativo di autenticazione su Pi-hole v6 API...';

    const res = await PiHoleService.authenticate(ip, port, pass);
    btnConnect.disabled = false;
    btnConnect.innerHTML = '<span class="material-symbols-rounded">sync</span> Connetti a Pi-hole v6';

    if (res.success) {
      statusBox.innerHTML = `<span style="color: #34d399;">✓ Connesso a Pi-hole v6 (${ip})! Sessione valida.</span>`;
      btnInject.disabled = false;
    } else {
      statusBox.innerHTML = `<span style="color: #f87171;">✗ Connessione fallita: ${escapeHtml(res.error)}</span>`;
      btnInject.disabled = true;
    }
  });

  btnInject.addEventListener('click', async () => {
    btnInject.disabled = true;
    statusBox.textContent = 'Iniezione adlists NSFW in Pi-hole v6...';
    try {
      const results = await PiHoleService.injectNsfwAdlists();
      statusBox.innerHTML = `<span style="color: #34d399;">✓ Liste aggiunte al database Gravity di Pi-hole v6!</span>`;
    } catch (e) {
      statusBox.innerHTML = `<span style="color: #f87171;">✗ Errore iniezione: ${escapeHtml(e.message)}</span>`;
    }
    btnInject.disabled = false;
  });

  // Render Manual Lists
  const adlistsContainer = document.getElementById('manual-adlists-list');
  adlistsContainer.innerHTML = '';
  PIHOLE_NSFW_ADLISTS.forEach(item => {
    const card = document.createElement('div');
    card.className = 'glass-panel';
    card.style.padding = '12px';
    card.style.borderRadius = '12px';
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
        <span class="label-large" style="color: #c084fc;">${item.name}</span>
        <span class="body-small" style="font-size: 10px; opacity: 0.8;">${item.count}</span>
      </div>
      <p class="body-small" style="margin-bottom: 8px;">${item.description}</p>
      <div style="display: flex; gap: 8px;">
        <input type="text" readonly value="${item.url}" class="md-input" style="padding: 6px 10px; font-size: 11px; flex: 1;" />
        <button class="md-btn md-btn-tonal btn-copy-url" data-url="${item.url}" style="padding: 6px 12px; font-size: 11px;">
          Copia
        </button>
      </div>
    `;
    adlistsContainer.appendChild(card);
  });

  // Render SafeSearch CNAME
  const safesearchContainer = document.getElementById('manual-safesearch-list');
  safesearchContainer.innerHTML = '';
  SAFESEARCH_CNAME_REWRITES.forEach(item => {
    const card = document.createElement('div');
    card.className = 'glass-panel';
    card.style.padding = '10px 12px';
    card.style.borderRadius = '10px';
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span class="label-large" style="font-size: 12px;">${item.service}</span>
          <p class="body-small" style="font-size: 11px; margin-top: 2px;">
            <code>${item.domain}</code> ➔ <code style="color: #34d399;">${item.target}</code>
          </p>
        </div>
        <button class="md-btn md-btn-tonal btn-copy-url" data-url="${item.target}" style="padding: 4px 10px; font-size: 11px;">
          Copia
        </button>
      </div>
    `;
    safesearchContainer.appendChild(card);
  });

  // Setup click-to-copy handlers
  document.querySelectorAll('.btn-copy-url').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.getAttribute('data-url');
      navigator.clipboard.writeText(url).then(() => {
        const prevText = btn.textContent;
        btn.textContent = 'Copiato!';
        setTimeout(() => btn.textContent = prevText, 1500);
      });
    });
  });
}

// --------------------------------------------------------------------------
// Tab 4: Android Setup & Anti-Bypass
// --------------------------------------------------------------------------
function initAndroidSetupTab() {
  const selectProvider = document.getElementById('android-dns-provider-select');
  const previewHost = document.getElementById('android-host-preview');
  const btnCopyHost = document.getElementById('btn-copy-dns-host');
  const btnOpenSettings = document.getElementById('btn-open-android-settings');

  selectProvider.addEventListener('change', () => {
    previewHost.textContent = selectProvider.value;
  });

  btnCopyHost.addEventListener('click', () => {
    navigator.clipboard.writeText(previewHost.textContent).then(() => {
      btnCopyHost.textContent = 'Copiato!';
      setTimeout(() => btnCopyHost.innerHTML = '<span class="material-symbols-rounded" style="font-size: 16px;">content_copy</span> Copia', 1500);
    });
  });

  btnOpenSettings.addEventListener('click', () => {
    AndroidSetupGuide.openAndroidNetworkSettings();
  });

  // Render Anti-Bypass Strategies
  const container = document.getElementById('antibypass-strategies-container');
  container.innerHTML = '';
  AndroidSetupGuide.getAntiBypassStrategies().forEach(strat => {
    const card = document.createElement('div');
    card.className = 'glass-panel';
    card.style.padding = '14px';
    card.style.borderRadius = '14px';
    card.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="material-symbols-rounded" style="color: #c084fc; font-size: 20px;">${strat.icon}</span>
          <span class="title-medium" style="font-size: 14px;">${strat.title}</span>
        </div>
        <span class="md-chip md-chip-warning" style="font-size: 10px; padding: 2px 8px;">${strat.badge}</span>
      </div>
      <p class="body-small">${strat.desc}</p>
    `;
    container.appendChild(card);
  });
}

// --------------------------------------------------------------------------
// Tab 5: Tester & Diagnostica
// --------------------------------------------------------------------------
function initTesterTab() {
  const btnRun = document.getElementById('btn-run-diagnostic');
  const loading = document.getElementById('diagnostic-loading');
  const resultsCard = document.getElementById('diagnostic-results-card');
  const scoreBadge = document.getElementById('diagnostic-score-badge');
  const itemsList = document.getElementById('diagnostic-items-list');

  btnRun.addEventListener('click', async () => {
    btnRun.disabled = true;
    loading.style.display = 'block';
    resultsCard.style.display = 'none';
    itemsList.innerHTML = '';

    const results = await BlockerTester.runFullDiagnostic();
    loading.style.display = 'none';
    resultsCard.style.display = 'block';
    btnRun.disabled = false;

    scoreBadge.textContent = `${results.protectionRate}% Protetto`;
    scoreBadge.className = `md-chip ${results.isSecure ? 'md-chip-success' : 'md-chip-error'}`;

    results.details.forEach(item => {
      const row = document.createElement('div');
      row.className = 'glass-panel';
      row.style.padding = '10px 12px';
      row.style.borderRadius = '10px';
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.justifyContent = 'space-between';

      const isBlocked = item.blocked;
      row.innerHTML = `
        <span style="font-family: var(--md-sys-font-mono); font-size: 13px;">${item.domain}</span>
        <span class="md-chip ${isBlocked ? 'md-chip-success' : 'md-chip-error'}" style="font-size: 11px; padding: 3px 8px;">
          ${isBlocked ? 'BLOCCATO ✓' : 'ACCESSIBILE ✗ (FUGA)'}
        </span>
      `;
      itemsList.appendChild(row);
    });

    if (!results.isSecure) {
      // Trigger penalty if in challenge
      await IntegrityMonitor.verifySystemIntegrity(true);
      updateTrackerUI();
      updateVaultUI();
    }
  });
}

// --------------------------------------------------------------------------
// Tab 6: Diario Cifrato
// --------------------------------------------------------------------------
function initJournalTab() {
  const moodBtns = document.querySelectorAll('.mood-btn');
  const inputText = document.getElementById('journal-input-text');
  const btnSave = document.getElementById('btn-save-journal-entry');
  const entriesList = document.getElementById('journal-entries-list');

  moodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      moodBtns.forEach(b => b.classList.remove('active', 'md-btn-primary'));
      btn.classList.add('active', 'md-btn-primary');
      currentMood = parseInt(btn.getAttribute('data-val'), 10);
    });
  });

  btnSave.addEventListener('click', async () => {
    const text = inputText.value.trim();
    if (!text) {
      alert('Inserisci una nota o riflessione per la giornata.');
      return;
    }

    btnSave.disabled = true;
    btnSave.textContent = 'Cifratura in corso...';

    await EncryptedJournal.saveEntry(text, currentMood);
    inputText.value = '';
    btnSave.disabled = false;
    btnSave.innerHTML = '<span class="material-symbols-rounded">enhanced_encryption</span> Cifra & Salva nel Diario';

    renderJournalEntries();
  });

  renderJournalEntries();
}

async function renderJournalEntries() {
  const entriesList = document.getElementById('journal-entries-list');
  const entries = EncryptedJournal.getRawEntries();
  entriesList.innerHTML = '';

  if (entries.length === 0) {
    entriesList.innerHTML = '<p class="body-small" style="text-align: center; opacity: 0.6;">Nessuna voce salvata nel diario.</p>';
    return;
  }

  for (const entry of entries) {
    const card = document.createElement('div');
    card.className = 'glass-panel';
    card.style.padding = '12px';
    card.style.borderRadius = '12px';

    const moodEmoji = ['🌧️', '⛅', '☀️', '⚡', '🔥'][entry.mood - 1] || '☀️';

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span>${moodEmoji}</span>
          <span class="body-small" style="font-weight: 600;">${entry.dateStr}</span>
        </div>
        <button class="md-btn md-btn-tonal btn-decrypt-entry" style="padding: 4px 10px; font-size: 11px;">
          Decifra
        </button>
      </div>
      <div class="entry-content-box" style="font-size: 13px; color: #a19bb5; font-style: italic;">
        [Contenuto cifrato con AES-GCM 256-bit]
      </div>
    `;

    const decryptBtn = card.querySelector('.btn-decrypt-entry');
    const contentBox = card.querySelector('.entry-content-box');

    decryptBtn.addEventListener('click', async () => {
      const decrypted = await EncryptedJournal.decryptEntry(entry);
      contentBox.textContent = decrypted;
      contentBox.style.color = '#ffffff';
      contentBox.style.fontStyle = 'normal';
      decryptBtn.style.display = 'none';
    });

    entriesList.appendChild(card);
  }
}

// --------------------------------------------------------------------------
// Panic SOS Modal (Pulsante Antipanico a 3 Vie)
// --------------------------------------------------------------------------
function initPanicModal() {
  const modal = document.getElementById('panic-modal');
  const btnOpen = document.getElementById('btn-panic-nav');
  const btnClose = document.getElementById('btn-close-panic');

  // Subtabs
  const btnSubBreathe = document.getElementById('panic-subtab-breathe-btn');
  const btnSubPhysical = document.getElementById('panic-subtab-physical-btn');
  const btnSubMind = document.getElementById('panic-subtab-mind-btn');

  const viewBreathe = document.getElementById('panic-view-breathe');
  const viewPhysical = document.getElementById('panic-view-physical');
  const viewMind = document.getElementById('panic-view-mind');

  btnOpen.addEventListener('click', () => {
    modal.classList.add('active');
    startBreathingEngine();
    PanicService.vibrate([200, 100, 200]);
  });

  btnClose.addEventListener('click', () => {
    modal.classList.remove('active');
    stopBreathingEngine();
  });

  btnSubBreathe.addEventListener('click', () => {
    btnSubBreathe.className = 'md-btn md-btn-primary';
    btnSubPhysical.className = 'md-btn md-btn-tonal';
    btnSubMind.className = 'md-btn md-btn-tonal';
    viewBreathe.style.display = 'block';
    viewPhysical.style.display = 'none';
    viewMind.style.display = 'none';
    startBreathingEngine();
  });

  btnSubPhysical.addEventListener('click', () => {
    btnSubPhysical.className = 'md-btn md-btn-primary';
    btnSubBreathe.className = 'md-btn md-btn-tonal';
    btnSubMind.className = 'md-btn md-btn-tonal';
    viewPhysical.style.display = 'block';
    viewBreathe.style.display = 'none';
    viewMind.style.display = 'none';
    stopBreathingEngine();
  });

  btnSubMind.addEventListener('click', () => {
    btnSubMind.className = 'md-btn md-btn-primary';
    btnSubBreathe.className = 'md-btn md-btn-tonal';
    btnSubPhysical.className = 'md-btn md-btn-tonal';
    viewMind.style.display = 'block';
    viewBreathe.style.display = 'none';
    viewPhysical.style.display = 'none';
    stopBreathingEngine();
    loadRandomPanicQuote();
  });

  // Physical Reset Handlers
  const pushupDisplay = document.getElementById('pushups-counter-display');
  const btnPushup = document.getElementById('btn-count-pushup');
  btnPushup.addEventListener('click', () => {
    pushupCount++;
    pushupDisplay.textContent = `${pushupCount} / 25`;
    PanicService.playTone(400 + pushupCount * 15, 0.15);
    PanicService.vibrate(50);
    if (pushupCount >= 25) {
      pushupDisplay.style.color = '#34d399';
    }
  });

  const showerDisplay = document.getElementById('cold-shower-timer-display');
  const btnShower = document.getElementById('btn-start-cold-shower');
  btnShower.addEventListener('click', () => {
    if (showerTimerInterval) {
      clearInterval(showerTimerInterval);
      showerTimerInterval = null;
      btnShower.textContent = 'Riprendi Doccia';
      return;
    }
    btnShower.textContent = 'Pausa';
    showerTimerInterval = setInterval(() => {
      showerSecondsLeft--;
      const m = Math.floor(showerSecondsLeft / 60);
      const s = showerSecondsLeft % 60;
      showerDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

      if (showerSecondsLeft <= 0) {
        clearInterval(showerTimerInterval);
        showerTimerInterval = null;
        PanicService.playTone(880, 0.8);
        alert('Doccia fredda completata! Sistema nervoso resettato con successo.');
      }
    }, 1000);
  });

  // Quote Cycler
  const btnNextQuote = document.getElementById('btn-next-quote');
  btnNextQuote.addEventListener('click', () => {
    loadRandomPanicQuote();
  });
}

function loadRandomPanicQuote() {
  const quote = PanicService.getRandomQuote();
  document.getElementById('panic-quote-text').textContent = `"${quote.text}"`;
  document.getElementById('panic-quote-author').textContent = quote.author;
  document.getElementById('panic-quote-category').textContent = quote.category;
}

function startBreathingEngine() {
  const circle = document.getElementById('breathe-circle');
  const instruction = document.getElementById('breathe-instruction');
  const timer = document.getElementById('breathe-timer');

  const phases = [
    { name: 'ISPIRA', duration: 4, scale: 1.25, tone: 440 },
    { name: 'TRATTIENI', duration: 4, scale: 1.25, tone: 520 },
    { name: 'ESPIRA', duration: 4, scale: 0.85, tone: 330 },
    { name: 'VUOTO', duration: 4, scale: 0.85, tone: 280 }
  ];

  let currentPhaseIndex = 0;
  let secLeft = phases[0].duration;

  stopBreathingEngine();

  const applyPhase = () => {
    const p = phases[currentPhaseIndex];
    instruction.textContent = p.name;
    timer.textContent = secLeft;
    circle.style.transform = `scale(${p.scale})`;
  };

  applyPhase();
  PanicService.playTone(phases[0].tone, 0.3);

  breathingInterval = setInterval(() => {
    secLeft--;
    if (secLeft <= 0) {
      currentPhaseIndex = (currentPhaseIndex + 1) % phases.length;
      secLeft = phases[currentPhaseIndex].duration;
      PanicService.playTone(phases[currentPhaseIndex].tone, 0.25);
      PanicService.vibrate(60);
    }
    applyPhase();
  }, 1000);
}

function stopBreathingEngine() {
  if (breathingInterval) {
    clearInterval(breathingInterval);
    breathingInterval = null;
  }
}

// Helper: Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}
