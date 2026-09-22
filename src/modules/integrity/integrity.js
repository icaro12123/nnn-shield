// ==========================================================================
// INTEGRITY & ANTI-CHEAT MONITOR
// ==========================================================================

import { BlockerTester } from '../tester/tester.js';
import { TimeVault } from '../vault/vault.js';
import { ChallengeTracker } from '../tracker/tracker.js';

const LAST_INTEGRITY_CHECK_KEY = 'nnn_last_integrity_check';
const LAST_CANARY_PENALTY_DATE_KEY = 'nnn_last_canary_penalty_date';
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 ore = 4 controlli automatici al giorno

export class IntegrityMonitor {
  static getLastCheckTime() {
    return parseInt(localStorage.getItem(LAST_INTEGRITY_CHECK_KEY) || '0', 10);
  }

  // Setup lifecycle and visibility listener (app resume, focus, interval)
  static initLifecycleWatcher(onViolationCallback = null) {
    // 1. Initial check on startup
    setTimeout(async () => {
      const res = await this.verifySystemIntegrity().catch(() => null);
      if (res && res.cheatingDetected && onViolationCallback) {
        onViolationCallback(res);
      }
    }, 2000);

    // 2. Check every time app becomes visible / focused (user unlocks phone or switches back)
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

    if (!force && (now - lastCheck < CHECK_INTERVAL_MS)) {
      const hoursLeft = Math.ceil((CHECK_INTERVAL_MS - (now - lastCheck)) / (1000 * 60 * 60));
      return { skipped: true, reason: `Controllo già eseguito di recente. Prossimo test tra circa ${hoursLeft}h.` };
    }

    // Run canary test on domains
    const diagnostic = await BlockerTester.runFullDiagnostic();
    localStorage.setItem(LAST_INTEGRITY_CHECK_KEY, now.toString());

    if (!diagnostic.isSecure) {
      // Cheat / Bypass Detected!
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
      diagnostic
    };
  }
}
