// ==========================================================================
// NNN SHIELD v2.0 - MAIN CONTROLLER & TWO-PHASE LIFECYCLE
// ==========================================================================

import { OnboardingWizard } from './modules/wizard/onboarding.js';
import { ChallengeTracker } from './modules/tracker/tracker.js';
import { TimeVault } from './modules/vault/vault.js';
import { PanicService } from './modules/panic/panic.js';
import { BlockerTester } from './modules/tester/tester.js';
import { EncryptedJournal } from './modules/journal/journal.js';
import { IntegrityMonitor } from './modules/integrity/integrity.js';
import { AndroidSetupGuide } from './modules/android/setup.js';
import { ModalDialog } from './modules/ui/dialog.js';
import { NotificationService } from './modules/notifications/notifications.js';

// Global timers & state
let vaultInterval = null;
let breathingInterval = null;
let showerTimerInterval = null;
let showerSecondsLeft = 120;
let pushupCount = 0;
let currentMood = 3;

document.addEventListener('DOMContentLoaded', () => {
  initAppLifecycle();
  initPanicModal();
});

// --------------------------------------------------------------------------
// 1. Two-Phase App Lifecycle (Wizard vs Dashboard)
// --------------------------------------------------------------------------
function initAppLifecycle() {
  const onboardingContainer = document.getElementById('onboarding-container');
  const dashboardContainer = document.getElementById('dashboard-container');
  const bottomNav = document.getElementById('dashboard-bottom-nav');

  const progress = ChallengeTracker.getProgress();

  if (!progress.isActive && !TimeVault.isLocked()) {
    // Show Phase 1: Onboarding Setup Wizard
    document.body.classList.add('is-onboarding');
    onboardingContainer.style.display = 'block';
    dashboardContainer.style.display = 'none';
    bottomNav.style.display = 'none';
    updateHeaderStatus('Setup Iniziale');

    const mountEl = document.getElementById('onboarding-wizard-mount');
    new OnboardingWizard(mountEl, () => {
      // Transition to Phase 2: Dashboard
      document.body.classList.remove('is-onboarding');
      onboardingContainer.style.display = 'none';
      startDashboard();
    });
  } else {
    // Show Phase 2: Main Challenge Dashboard
    document.body.classList.remove('is-onboarding');
    onboardingContainer.style.display = 'none';
    startDashboard();
  }
}

function checkMissedCheckIns() {
  const missed = ChallengeTracker.evaluateMissedCheckIns(TimeVault);
  if (missed && missed.missedCount > 0) {
    updateDashboardUI();
    ModalDialog.showNotice({
      title: 'Penalità: Check-in Mancato!',
      message: `Hai saltato il check-in per ${missed.missedCount} ${missed.missedCount === 1 ? 'giorno' : 'giorni'}.\n\nPenalità applicata: +${missed.missedCount * 24} ore alla cassaforte temporale e ${missed.missedCount} strike.`,
      type: 'error',
      icon: 'gavel'
    });
  }
}

function startDashboard() {
  const dashboardContainer = document.getElementById('dashboard-container');
  const bottomNav = document.getElementById('dashboard-bottom-nav');

  dashboardContainer.style.display = 'block';
  bottomNav.style.display = 'flex';

  initDashboardNavigation();
  initDashboardTracker();
  initDashboardJournal();
  initDashboardTools();
  updateDashboardUI();

  // Controllo automatico di eventuali check-in saltati
  checkMissedCheckIns();

  // Programmazione promemoria notifiche locali
  NotificationService.scheduleDailyReminders();

  // Initialize periodic & lifecycle anti-tampering sentinels (4 times per day / 6 hours)
  IntegrityMonitor.initLifecycleWatcher((result) => {
    checkMissedCheckIns();
    if (result && result.cheatingDetected) {
      updateDashboardUI();
      ModalDialog.showNotice({
        title: 'Sentinella Anti-Cheat',
        message: result.penaltyApplied
          ? 'Rilevata fuga DNS! Alcuni domini vietati risultano raggiungibili.\n\nPenalità: +24 ore aggiunte alla cassaforte temporale.'
          : 'Rilevata fuga DNS! Alcuni domini vietati risultano raggiungibili.\n\nNota: La penalità massima di +24h per la giornata odierna è già stata applicata.',
        type: 'error',
        icon: 'gavel'
      });
    }
  });
}

function updateHeaderStatus(customText = null) {
  const dot = document.getElementById('header-status-dot');
  const text = document.getElementById('header-status-text');
  const progress = ChallengeTracker.getProgress();

  if (customText) {
    dot.className = 'status-dot';
    text.textContent = customText;
    return;
  }

  if (progress.isActive) {
    dot.className = 'status-dot active';
    text.textContent = `Giorno ${progress.currentDay}/${progress.totalDays}`;
  } else {
    dot.className = 'status-dot';
    text.textContent = 'Pronto';
  }
}

// --------------------------------------------------------------------------
// 2. Dashboard Navigation
// --------------------------------------------------------------------------
function initDashboardNavigation() {
  const navItems = document.querySelectorAll('.nav-item[data-dash-tab]');
  const tabViews = document.querySelectorAll('#dashboard-container .tab-view');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTabId = item.getAttribute('data-dash-tab');

      navItems.forEach(n => n.classList.remove('active'));
      tabViews.forEach(v => v.classList.remove('active'));

      item.classList.add('active');
      const activeTab = document.getElementById(targetTabId);
      if (activeTab) activeTab.classList.add('active');

      if (targetTabId === 'dash-tab-tracker') updateDashboardUI();
    });
  });
}

// --------------------------------------------------------------------------
// 3. Dashboard Tracker, Streak & Cassaforte Quick View
// --------------------------------------------------------------------------
function initDashboardTracker() {
  const btnCheckin = document.getElementById('dash-btn-checkin');
  const btnUnlock = document.getElementById('dash-btn-unlock-vault');

  btnCheckin.addEventListener('click', async () => {
    const progress = ChallengeTracker.getProgress();
    if (progress.isCheckedInToday) {
      await ModalDialog.showNotice({
        title: 'Già Registrato',
        message: 'Hai già completato il check-in per la giornata odierna!',
        type: 'info',
        icon: 'event_available'
      });
      return;
    }

    // 1. Verifica preventiva dell'integrità del blocco DNS
    btnCheckin.disabled = true;
    btnCheckin.innerHTML = '<span class="material-symbols-rounded">sync</span> Verifica integrità DNS...';

    let isSafe = false;
    try {
      const probe = await BlockerTester.probeDomain('pornhub.com');
      isSafe = probe.blocked;
    } catch {
      isSafe = true; // In caso di errore rete estremo, consentiamo il check
    }

    if (!isSafe) {
      btnCheckin.disabled = false;
      updateDashboardUI();
      await ModalDialog.showNotice({
        title: 'Protezioni DNS Disattivate!',
        message: 'Impossibile convalidare il check-in: il filtro DNS risulta disattivato o aggirato!\n\nRiattiva il DNS privato nelle impostazioni Android e riprova.',
        type: 'error',
        icon: 'shield_with_heart'
      });
      return;
    }

    // 2. Convalida del check-in
    const success = ChallengeTracker.checkInToday();
    if (success) {
      PanicService.vibrate([100, 50, 150]);
      await NotificationService.onCheckInCompleted();
      await ModalDialog.showNotice({
        title: 'Check-in Convalidato',
        message: 'Scudo integro e giornata registrata con successo!',
        type: 'success',
        icon: 'check_circle'
      });
      updateDashboardUI();
    } else {
      updateDashboardUI();
    }
  });

  btnUnlock.addEventListener('click', async () => {
    try {
      const secret = await TimeVault.unlockSecret();
      const box = document.getElementById('dash-decrypted-secret-box');
      box.style.display = 'block';
      box.innerHTML = `<strong>Password Decifrata dal Vault:</strong><br><span style="color: #34d399; font-size: 15px;">${escapeHtml(secret)}</span>`;
      await ModalDialog.showNotice({
        title: 'Sfida Completata!',
        message: 'Complimenti! Hai completato la sfida e sbloccato la cassaforte.',
        type: 'success',
        icon: 'lock_open'
      });
    } catch (err) {
      await ModalDialog.showNotice({
        title: 'Cassaforte Bloccata',
        message: err.message,
        type: 'warning',
        icon: 'lock_clock'
      });
    }
  });
}

function updateDashboardUI() {
  const progress = ChallengeTracker.getProgress();
  const circle = document.getElementById('dash-progress-circle');
  const dayDisplay = document.getElementById('dash-day-display');
  const statusHeadline = document.getElementById('dash-status-headline');
  const subtext = document.getElementById('dash-subtext');
  const btnCheckin = document.getElementById('dash-btn-checkin');
  const penaltyCard = document.getElementById('dash-penalty-card');
  const penaltyDesc = document.getElementById('dash-penalty-desc');
  const countdownEl = document.getElementById('dash-vault-countdown');
  const btnUnlock = document.getElementById('dash-btn-unlock-vault');
  const pendingBanner = document.getElementById('dash-checkin-pending-banner');

  updateHeaderStatus();

  // Banner Check-in Odierno Pendente
  if (pendingBanner) {
    pendingBanner.style.display = (progress.isActive && !progress.isCheckedInToday) ? 'flex' : 'none';
  }

  dayDisplay.textContent = progress.currentDay;
  const offset = 264 - (264 * progress.percentage) / 100;
  circle.style.strokeDashoffset = offset;

  statusHeadline.textContent = `Giorno ${progress.currentDay} di ${progress.totalDays}`;
  subtext.textContent = `Progresso completato: ${progress.percentage}%. Mancano ${progress.daysRemaining} giorni alla vittoria.`;

  if (progress.isCheckedInToday) {
    btnCheckin.disabled = false;
    btnCheckin.classList.remove('md-btn-primary');
    btnCheckin.classList.add('md-btn-tonal');
    btnCheckin.innerHTML = '<span class="material-symbols-rounded">check</span> Check-in Eseguito Oggi';
  } else {
    btnCheckin.disabled = false;
    btnCheckin.classList.remove('md-btn-tonal');
    btnCheckin.classList.add('md-btn-primary');
    btnCheckin.innerHTML = '<span class="material-symbols-rounded">check_circle</span> Check-in Giornaliero';
  }

  if (progress.strikes > 0) {
    penaltyCard.style.display = 'block';
    if (penaltyDesc) {
      const parts = [];
      if (progress.missedCount > 0) {
        parts.push(`${progress.missedCount} check-in saltati`);
      }
      const leakStrikes = progress.strikes - (progress.missedCount || 0);
      if (leakStrikes > 0) {
        parts.push(`${leakStrikes} tentativi di aggiramento DNS`);
      }
      penaltyDesc.textContent = `Penalità attive (${parts.join(', ') || progress.strikes + ' infrazioni'}). +${progress.strikes * 24}h aggiunte al Vault.`;
    }
  } else {
    penaltyCard.style.display = 'none';
  }

  // Live Vault countdown
  if (vaultInterval) clearInterval(vaultInterval);
  const tickVault = () => {
    const rem = TimeVault.getTimeRemaining();
    const pad = (n) => String(n).padStart(2, '0');
    countdownEl.textContent = `${rem.days}d ${pad(rem.hours)}h ${pad(rem.minutes)}m ${pad(rem.seconds)}s`;

    if (TimeVault.isUnlockable()) {
      btnUnlock.disabled = false;
      btnUnlock.classList.remove('md-btn-tonal');
      btnUnlock.classList.add('md-btn-primary');
    } else {
      btnUnlock.disabled = true;
    }
  };
  tickVault();
  vaultInterval = setInterval(tickVault, 1000);

  // Render Milestones
  const milestonesContainer = document.getElementById('dash-milestones-container');
  milestonesContainer.innerHTML = '';
  ChallengeTracker.getMilestones().forEach(m => {
    const card = document.createElement('div');
    card.className = `glass-panel ${m.unlocked ? 'glow-primary' : ''}`;
    card.style.padding = '12px 8px';
    card.style.borderRadius = '14px';
    card.style.textAlign = 'center';
    card.style.opacity = m.unlocked ? '1' : '0.45';

    card.innerHTML = `
      <span class="material-symbols-rounded" style="color: ${m.unlocked ? '#c084fc' : '#888'}; font-size: 26px; margin-bottom: 4px;">
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
// 4. Dashboard Diario Cifrato
// --------------------------------------------------------------------------
function initDashboardJournal() {
  const moodBtns = document.querySelectorAll('.dash-mood-btn');
  const input = document.getElementById('dash-journal-input');
  const btnSave = document.getElementById('dash-btn-save-journal');

  moodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      moodBtns.forEach(b => b.classList.remove('active', 'md-btn-primary'));
      btn.classList.add('active', 'md-btn-primary');
      currentMood = parseInt(btn.getAttribute('data-val'), 10);
    });
  });

  btnSave.addEventListener('click', async () => {
    const text = input.value.trim();
    if (!text) {
      await ModalDialog.showNotice({
        title: 'Nota Vuota',
        message: 'Scrivi una nota per la giornata prima di salvare.',
        type: 'warning',
        icon: 'edit_note'
      });
      return;
    }

    btnSave.disabled = true;
    btnSave.textContent = 'Cifratura AES-GCM in corso...';

    await EncryptedJournal.saveEntry(text, currentMood);
    input.value = '';
    btnSave.disabled = false;
    btnSave.innerHTML = '<span class="material-symbols-rounded">enhanced_encryption</span> Cifra & Salva nel Diario';

    renderDashboardJournalEntries();
  });

  renderDashboardJournalEntries();
}

async function renderDashboardJournalEntries() {
  const container = document.getElementById('dash-journal-entries-list');
  const entries = EncryptedJournal.getRawEntries();
  container.innerHTML = '';

  if (entries.length === 0) {
    container.innerHTML = '<p class="body-small" style="text-align: center; opacity: 0.6;">Nessuna voce cifrata salvata.</p>';
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
        <button class="md-btn md-btn-tonal btn-dash-decrypt" style="padding: 4px 10px; font-size: 11px;">
          Decifra
        </button>
      </div>
      <div class="dash-entry-box" style="font-size: 13px; color: #a19bb5; font-style: italic;">
        [Contenuto cifrato con AES-GCM 256-bit]
      </div>
    `;

    const decryptBtn = card.querySelector('.btn-dash-decrypt');
    const box = card.querySelector('.dash-entry-box');

    decryptBtn.addEventListener('click', async () => {
      const dec = await EncryptedJournal.decryptEntry(entry);
      box.textContent = dec;
      box.style.color = '#ffffff';
      box.style.fontStyle = 'normal';
      decryptBtn.style.display = 'none';
    });

    container.appendChild(card);
  }
}

// --------------------------------------------------------------------------
// 5. Dashboard Tools & Test Canarino
// --------------------------------------------------------------------------
function initDashboardTools() {
  const btnRun = document.getElementById('dash-btn-run-diagnostic');
  const loading = document.getElementById('dash-diag-loading');
  const resBox = document.getElementById('dash-diag-results');
  const badge = document.getElementById('dash-diag-badge');
  const list = document.getElementById('dash-diag-list');
  const btnSettings = document.getElementById('dash-btn-open-settings');

  btnRun.addEventListener('click', async () => {
    btnRun.disabled = true;
    loading.style.display = 'block';
    resBox.style.display = 'none';
    list.innerHTML = '';

    const results = await BlockerTester.runFullDiagnostic();
    loading.style.display = 'none';
    resBox.style.display = 'block';
    btnRun.disabled = false;

    badge.textContent = `${results.protectionRate}% Protetto`;
    badge.className = `md-chip ${results.isSecure ? 'md-chip-success' : 'md-chip-error'}`;

    results.details.forEach(item => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.fontSize = '12px';
      row.innerHTML = `
        <span style="font-family: var(--md-sys-font-mono);">${item.domain}</span>
        <span style="color: ${item.blocked ? '#34d399' : '#f87171'}; font-weight: 600;">
          ${item.blocked ? 'BLOCCATO ✓' : 'FUGA ✗'}
        </span>
      `;
      list.appendChild(row);
    });

    if (!results.isSecure) {
      const res = await IntegrityMonitor.verifySystemIntegrity(true);
      updateDashboardUI();
      if (res && res.cheatingDetected) {
        ModalDialog.showNotice({
          title: 'Fuga DNS Rilevata',
          message: res.penaltyApplied
            ? 'Rilevata fuga DNS! Alcuni domini vietati risultano raggiungibili.\n\nPenalità: +24 ore aggiunte alla cassaforte temporale.'
            : 'Rilevata fuga DNS! Alcuni domini vietati risultano raggiungibili.\n\nNota: La penalità massima di +24h per la giornata odierna è già stata applicata.',
          type: 'error',
          icon: 'gavel'
        });
      }
    }
  });

  btnSettings.addEventListener('click', async () => {
    await AndroidSetupGuide.openAndroidNetworkSettings();
  });

  // Notifiche & Modalità Stealth UI Binding
  const btnToggleNotifs = document.getElementById('dash-btn-toggle-notifs');
  const btnToggleStealth = document.getElementById('dash-btn-toggle-stealth');

  const updateNotifUI = async () => {
    const settings = NotificationService.getSettings();
    const isGranted = await NotificationService.isPermissionGranted();

    if (btnToggleNotifs) {
      if (settings.enabled && isGranted) {
        btnToggleNotifs.textContent = 'Attive ✓';
        btnToggleNotifs.className = 'md-btn md-btn-tonal';
        btnToggleNotifs.style.color = '#34d399';
      } else {
        btnToggleNotifs.textContent = 'Abilita';
        btnToggleNotifs.className = 'md-btn md-btn-primary';
        btnToggleNotifs.style.color = '';
      }
    }

    if (btnToggleStealth) {
      if (settings.stealthMode) {
        btnToggleStealth.textContent = 'Stealth ✓';
        btnToggleStealth.className = 'md-btn md-btn-primary';
        btnToggleStealth.style.color = '#ffffff';
      } else {
        btnToggleStealth.textContent = 'Normale';
        btnToggleStealth.className = 'md-btn md-btn-tonal';
        btnToggleStealth.style.color = '';
      }
    }
  };

  updateNotifUI();

  if (btnToggleNotifs) {
    btnToggleNotifs.addEventListener('click', async () => {
      const settings = NotificationService.getSettings();
      const isGranted = await NotificationService.isPermissionGranted();

      if (!settings.enabled || !isGranted) {
        const granted = await NotificationService.requestPermissions();
        if (granted) {
          await ModalDialog.showNotice({
            title: 'Notifiche Attivate',
            message: 'I promemoria giornalieri (ore 20:30 e 23:00) sono attivi per proteggere la tua cassaforte.',
            type: 'success',
            icon: 'notifications_active'
          });
        } else {
          await ModalDialog.showNotice({
            title: 'Permesso Negato',
            message: 'Non è stato possibile attivare le notifiche. Verifica i permessi dell\'app nelle impostazioni di Android.',
            type: 'warning',
            icon: 'notifications_off'
          });
        }
      } else {
        settings.enabled = false;
        NotificationService.saveSettings(settings);
        await ModalDialog.showNotice({
          title: 'Notifiche Disattivate',
          message: 'I promemoria automatici sono stati disattivati.',
          type: 'info',
          icon: 'notifications_off'
        });
      }
      updateNotifUI();
    });
  }

  if (btnToggleStealth) {
    btnToggleStealth.addEventListener('click', async () => {
      const current = NotificationService.isStealthMode();
      await NotificationService.setStealthMode(!current);
      await ModalDialog.showNotice({
        title: !current ? 'Modalità Stealth Attiva' : 'Modalità Standard Attiva',
        message: !current
          ? 'Privacy massima: le notifiche compariranno come "Promemoria Sincronizzazione" e "Verifica di Sistema" per non rivelare il contesto a chi guarda lo schermo.'
          : 'Le notifiche mostreranno il titolo e la descrizione di NNN Shield.',
        type: 'info',
        icon: !current ? 'visibility_off' : 'visibility'
      });
      updateNotifUI();
    });
  }
}

// --------------------------------------------------------------------------
// 6. SOS Urge Panic Modal
// --------------------------------------------------------------------------
function initPanicModal() {
  const modal = document.getElementById('panic-modal');
  const btnOpen = document.getElementById('btn-panic-trigger');
  const btnClose = document.getElementById('btn-close-panic');

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

  // Physical Pushup Counter
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

  // Cold Shower Timer
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
    showerTimerInterval = setInterval(async () => {
      showerSecondsLeft--;
      const m = Math.floor(showerSecondsLeft / 60);
      const s = showerSecondsLeft % 60;
      showerDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

      if (showerSecondsLeft <= 0) {
        clearInterval(showerTimerInterval);
        showerTimerInterval = null;
        PanicService.vibrate([150, 100, 200]);
        await ModalDialog.showNotice({
          title: 'Doccia Completata',
          message: 'Doccia fredda completata! Sistema nervoso resettato.',
          type: 'success',
          icon: 'shower'
        });
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
