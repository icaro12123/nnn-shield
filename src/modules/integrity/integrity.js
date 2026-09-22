// ==========================================================================
// INTEGRITY & ANTI-CHEAT MONITOR
// ==========================================================================

import { BlockerTester } from '../tester/tester.js';
import { TimeVault } from '../vault/vault.js';
import { ChallengeTracker } from '../tracker/tracker.js';

const LAST_INTEGRITY_CHECK_KEY = 'nnn_last_integrity_check';
const LAST_CANARY_PENALTY_DATE_KEY = 'nnn_last_canary_penalty_date';
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 ore = 4 controlli automatici al giorno
const GRACE_PERIOD_MS = 2 * 60 * 60 * 1000; // 2 ore di periodo di grazia iniziale per propagazione DNS e cache OS

export class IntegrityMonitor {
  static getLastCheckTime() {
    return parseInt(localStorage.getItem(LAST_INTEGRITY_CHECK_KEY) || '0', 10);
  }

  static recordSuccessfulCheck(timestamp = Date.now()) {
    localStorage.setItem(LAST_INTEGRITY_CHECK_KEY, timestamp.toString());
  }

  static initializeMonitoring() {
    this.recordSuccessfulCheck();
  }

  /**
   * Calcola se l'utente si trova nel periodo di grazia iniziale (prime 2 ore dall'avvio della sfida).
   * Durante questo periodo, né i controlli automatici né i test manuali applicano penalità,
   * permettendo all'aggiornamento di Gravity su Pi-hole e alla cache DNS locale del dispositivo
   * di propagarsi e scadere naturalmente.
   */
  static getGracePeriodInfo() {
    const tracker = ChallengeTracker.getTrackerData();
    if (!tracker.isActive || !tracker.startDate) {
      return { inGracePeriod: false, minutesLeft: 0 };
    }

    const startMs = new Date(tracker.startDate).getTime();
    if (isNaN(startMs)) {
      return { inGracePeriod: false, minutesLeft: 0 };
    }

    const elapsed = Date.now() - startMs;
    const inGracePeriod = elapsed >= 0 && elapsed < GRACE_PERIOD_MS;
    const minutesLeft = inGracePeriod ? Math.ceil((GRACE_PERIOD_MS - elapsed) / (60 * 1000)) : 0;

    return { inGracePeriod, minutesLeft };
  }

  /**
   * Riconciliazione retroattiva: se in un precedente avvio è stata applicata erroneamente una
   * penalità da fuga DNS entro i primi 10 minuti dall'inizio della sfida (a causa della mancata propagazione),
   * la rimuove automaticamente ripristinando la cassaforte.
   */
  static healStartupFalsePositives() {
    const tracker = ChallengeTracker.getTrackerData();
    if (!tracker.isActive || !tracker.startDate) return false;

    const startMs = new Date(tracker.startDate).getTime();
    if (isNaN(startMs)) return false;

    const penaltyLogs = JSON.parse(localStorage.getItem('nnn_penalty_logs') || '[]');
    // Cerca log di fuga DNS avvenuti entro 10 minuti dallo start
    const falsePositiveLog = penaltyLogs.find(log => {
      const isDnsLeak = log.reason && log.reason.includes('Fuga DNS');
      const isImmediatelyAfterStart = log.timestamp >= startMs && (log.timestamp - startMs) < (10 * 60 * 1000);
      return isDnsLeak && isImmediatelyAfterStart;
    });

    if (falsePositiveLog) {
      console.log('NNN Shield: Risolto falso positivo di propagazione iniziale DNS. Ripristino ore cassaforte.');
      TimeVault.revertPenalty(falsePositiveLog.hoursAdded || 24, 'Fuga DNS');
      ChallengeTracker.removeStrike();
      localStorage.removeItem(LAST_CANARY_PENALTY_DATE_KEY);
      return true;
    }

    return false;
  }

  // Setup lifecycle and visibility listener (app resume, focus, interval)
  static initLifecycleWatcher(onViolationCallback = null) {
    // 0. Auto-healing per eventuali falsi positivi pregressi
    this.healStartupFalsePositives();

    const handleResume = async () => {
      const now = Date.now();
      const lastCheck = this.getLastCheckTime();
      if (now - lastCheck >= CHECK_INTERVAL_MS) {
        const res = await this.verifySystemIntegrity().catch(() => null);
        if (res && res.cheatingDetected && onViolationCallback) {
          onViolationCallback(res);
        }
      }
    };

    // 1. Initial check on startup (eseguito solo se il periodo di grazia è superato)
    setTimeout(async () => {
      const { inGracePeriod } = this.getGracePeriodInfo();
      if (!inGracePeriod) {
        await handleResume();
      }
    }, 2000);

    // 2. Check every time app becomes visible / focused (user unlocks phone or switches back)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleResume();
      }
    });

    window.addEventListener('focus', handleResume);

    // 3. Periodic timer while app is running (checks every 15 mins if 6h elapsed)
    setInterval(handleResume, 15 * 60 * 1000);
  }

  // Run automatic integrity scan (up to 4 times per day)
  static async verifySystemIntegrity(force = false) {
    const lastCheck = this.getLastCheckTime();
    const now = Date.now();

    // Check if challenge is active
    const tracker = ChallengeTracker.getTrackerData();
    if (!tracker.isActive) {
      return { skipped: true, reason: 'Nessuna sfida attiva al momento.' };
    }

    const { inGracePeriod, minutesLeft } = this.getGracePeriodInfo();

    // In periodo di grazia iniziale: NESSUN controllo automatico per evitare falsi positivi
    if (!force && inGracePeriod) {
      return {
        skipped: true,
        inGracePeriod: true,
        minutesLeft,
        reason: `Periodo di assestamento e propagazione DNS attivo (${minutesLeft}m rimanenti). Nessun controllo automatico.`
      };
    }

    // Se non forzato e non sono ancora trascorse le 6 ore
    if (!force && (now - lastCheck < CHECK_INTERVAL_MS)) {
      const hoursLeft = Math.ceil((CHECK_INTERVAL_MS - (now - lastCheck)) / (1000 * 60 * 60));
      return { skipped: true, reason: `Controllo già eseguito di recente. Prossimo test tra circa ${hoursLeft}h.` };
    }

    // Run canary test on domains
    const diagnostic = await BlockerTester.runFullDiagnostic();
    this.recordSuccessfulCheck(now);

    if (!diagnostic.isSecure) {
      // Se rilevata fuga durante il periodo di grazia (es. test manuale da diagnostica):
      // NON applicare penalità!
      if (inGracePeriod) {
        return {
          passed: false,
          cheatingDetected: false,
          inGracePeriod: true,
          graceMinutesLeft: minutesLeft,
          strikes: tracker.strikes || 0,
          penaltyApplied: false,
          penaltyHours: 0,
          diagnostic
        };
      }

      // Fuga rilevata fuori dal periodo di grazia (Tentativo reale di manomissione o spegnimento DNS)
      const todayStr = new Date().toDateString();
      const lastPenaltyDate = localStorage.getItem(LAST_CANARY_PENALTY_DATE_KEY);
      const isAlreadyPenalizedToday = (lastPenaltyDate === todayStr);

      let strikes = tracker.strikes || 0;
      let penaltyApplied = false;

      // Applica la penalità al Vault al massimo UNA volta al giorno
      if (!isAlreadyPenalizedToday) {
        strikes = ChallengeTracker.addStrike();
        TimeVault.addPenalty(24, `Fuga DNS rilevata dalla sentinella (${diagnostic.totalBlocked}/${diagnostic.totalTested} protetti).`);
        localStorage.setItem(LAST_CANARY_PENALTY_DATE_KEY, todayStr);
        penaltyApplied = true;
      }

      return {
        passed: false,
        cheatingDetected: true,
        inGracePeriod: false,
        strikes,
        penaltyApplied,
        penaltyHours: penaltyApplied ? 24 : 0,
        alreadyPenalizedToday: isAlreadyPenalizedToday,
        diagnostic
      };
    }

    return {
      passed: true,
      cheatingDetected: false,
      inGracePeriod,
      diagnostic
    };
  }
}
