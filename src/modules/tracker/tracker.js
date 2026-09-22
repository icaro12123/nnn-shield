// ==========================================================================
// STREAK & NNN CHALLENGE TRACKER
// ==========================================================================

const TRACKER_STORAGE_KEY = 'nnn_challenge_tracker_data';

export const MILESTONES = [
  { day: 1, title: 'Inizio del Cammino', icon: 'flag', desc: 'Hai preso la decisione consapevole di dominare i tuoi impulsi.' },
  { day: 3, title: 'Resistenza Iniziale', icon: 'local_fire_department', desc: 'I primi tre giorni sono i più critici: hai superato la tempesta neurochimica.' },
  { day: 7, title: 'Settimana d\'Acciaio', icon: 'shield', desc: 'Recettori androgeni in forte rialzo. Autostima e chiarezza aumentano.' },
  { day: 14, title: 'Guerriero di Metà Strada', icon: 'military_tech', desc: 'Due settimane senza cedere. Il vecchio circuito neurale inizia ad atrofizzarsi.' },
  { day: 21, title: 'Abitudine d\'Oro', icon: 'psychology', desc: 'La corteccia prefrontale ha ripreso il comando completo delle funzioni esecutive.' },
  { day: 30, title: 'Trascendenza NNN', icon: 'workspace_premium', desc: 'Vittoria assoluta. Hai dimostrato una forza di volontà d\'élite.' }
];

export class ChallengeTracker {
  static getTrackerData() {
    const raw = localStorage.getItem(TRACKER_STORAGE_KEY);
    if (!raw) {
      return {
        isActive: false,
        startDate: null,
        targetDays: 30,
        checkIns: [],
        missedDays: [],
        strikes: 0,
        lastCheckInDate: null
      };
    }
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.missedDays)) parsed.missedDays = [];
      if (!Array.isArray(parsed.checkIns)) parsed.checkIns = [];
      return parsed;
    } catch {
      return { isActive: false, startDate: null, targetDays: 30, checkIns: [], missedDays: [], strikes: 0 };
    }
  }

  static saveTrackerData(data) {
    localStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(data));
  }

  static startChallenge(targetDays = 30) {
    const todayStr = new Date().toDateString();
    const data = {
      isActive: true,
      startDate: new Date().toISOString(),
      targetDays: targetDays,
      checkIns: [todayStr],
      missedDays: [],
      strikes: 0,
      lastCheckInDate: todayStr
    };
    this.saveTrackerData(data);
    localStorage.setItem('nnn_last_integrity_check', Date.now().toString());
    return data;
  }

  static getProgress() {
    const data = this.getTrackerData();
    if (!data.isActive || !data.startDate) {
      return {
        isActive: false,
        currentDay: 0,
        totalDays: data.targetDays || 30,
        percentage: 0,
        isCheckedInToday: false,
        daysRemaining: data.targetDays || 30,
        strikes: 0,
        missedCount: 0
      };
    }

    const start = new Date(data.startDate);
    const now = new Date();
    const diffMs = now - start;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

    const currentDay = Math.min(Math.max(1, diffDays), data.targetDays);
    const percentage = Math.min(100, Math.round((currentDay / data.targetDays) * 100));
    const isCheckedInToday = data.checkIns.includes(now.toDateString());
    const daysRemaining = Math.max(0, data.targetDays - currentDay);

    return {
      isActive: true,
      currentDay,
      totalDays: data.targetDays,
      percentage,
      isCheckedInToday,
      daysRemaining,
      strikes: data.strikes || 0,
      missedCount: (data.missedDays || []).length
    };
  }

  /**
   * Valuta se l'utente ha saltato il check-in in giorni passati.
   * Se trova giorni chiusi senza check-in, applica +24h di penalità al Vault
   * e aggiunge uno strike per ogni giorno mancato.
   */
  static evaluateMissedCheckIns(TimeVaultClass = null) {
    const data = this.getTrackerData();
    if (!data.isActive || !data.startDate) {
      return { missedCount: 0, missedDates: [] };
    }

    const startDate = new Date(data.startDate);
    const startMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const newlyMissed = [];
    const cursor = new Date(startMidnight);

    // Itera tutti i giorni del passato strictly prima di oggi (00:00)
    while (cursor < todayMidnight) {
      const dateStr = cursor.toDateString();
      const hasCheckedIn = data.checkIns.includes(dateStr);
      const alreadyMarkedMissed = (data.missedDays || []).includes(dateStr);

      if (!hasCheckedIn && !alreadyMarkedMissed) {
        newlyMissed.push(dateStr);
        if (!data.missedDays) data.missedDays = [];
        data.missedDays.push(dateStr);
        data.strikes = (data.strikes || 0) + 1;

        if (TimeVaultClass && typeof TimeVaultClass.addPenalty === 'function') {
          TimeVaultClass.addPenalty(24, `Check-in mancato per il giorno: ${dateStr}`);
        }
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    if (newlyMissed.length > 0) {
      this.saveTrackerData(data);
    }

    return {
      missedCount: newlyMissed.length,
      missedDates: newlyMissed
    };
  }

  static checkInToday() {
    const data = this.getTrackerData();
    if (!data.isActive) return false;

    const todayStr = new Date().toDateString();
    if (!data.checkIns.includes(todayStr)) {
      data.checkIns.push(todayStr);
      data.lastCheckInDate = todayStr;
      this.saveTrackerData(data);
      return true;
    }
    return false;
  }

  static addStrike() {
    const data = this.getTrackerData();
    data.strikes = (data.strikes || 0) + 1;
    this.saveTrackerData(data);
    return data.strikes;
  }

  static removeStrike() {
    const data = this.getTrackerData();
    data.strikes = Math.max(0, (data.strikes || 1) - 1);
    this.saveTrackerData(data);
    return data.strikes;
  }

  static getMilestones() {
    const progress = this.getProgress();
    return MILESTONES.map(m => ({
      ...m,
      unlocked: progress.isActive && progress.currentDay >= m.day
    }));
  }
}
