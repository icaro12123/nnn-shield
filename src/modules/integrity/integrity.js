// ==========================================================================
// INTEGRITY & ANTI-CHEAT MONITOR
// ==========================================================================

import { BlockerTester } from '../tester/tester.js';
import { TimeVault } from '../vault/vault.js';
import { ChallengeTracker } from '../tracker/tracker.js';

const LAST_INTEGRITY_CHECK_KEY = 'nnn_last_integrity_check';

export class IntegrityMonitor {
  static getLastCheckTime() {
    return parseInt(localStorage.getItem(LAST_INTEGRITY_CHECK_KEY) || '0', 10);
  }

  // Run automatic integrity scan
  static async verifySystemIntegrity(force = false) {
    const lastCheck = this.getLastCheckTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const now = Date.now();

    // Check if challenge is active
    const tracker = ChallengeTracker.getTrackerData();
    if (!tracker.isActive) {
      return { skipped: true, reason: 'Nessuna sfida attiva al momento.' };
    }

    if (!force && now - lastCheck < oneDayMs) {
      return { skipped: true, reason: 'Controllo giornaliero già effettuato nelle ultime 24 ore.' };
    }

    // Run canary test on a random canary domain
    const diagnostic = await BlockerTester.runFullDiagnostic();
    localStorage.setItem(LAST_INTEGRITY_CHECK_KEY, now.toString());

    if (!diagnostic.isSecure) {
      // Cheat / Bypass Detected!
      const strikes = ChallengeTracker.addStrike();
      // Apply punishment to Vault: +24h extension
      const vaultState = TimeVault.addPenalty(24, `Leak DNS rilevato (${diagnostic.totalBlocked}/${diagnostic.totalTested} protetti).`);

      return {
        passed: false,
        cheatingDetected: true,
        strikes,
        penaltyHours: 24,
        vaultExtended: !!vaultState,
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
