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
        strikes: 0,
        lastCheckInDate: null
      };
    }
    try {
      return JSON.parse(raw);
    } catch {
      return { isActive: false, startDate: null, targetDays: 30, checkIns: [], strikes: 0 };
    }
  }

  static saveTrackerData(data) {
    localStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(data));
  }

  static startChallenge(targetDays = 30) {
    const data = {
      isActive: true,
      startDate: new Date().toISOString(),
      targetDays: targetDays,
      checkIns: [new Date().toDateString()],
      strikes: 0,
      lastCheckInDate: new Date().toDateString()
    };
    this.saveTrackerData(data);
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
        strikes: 0
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
      strikes: data.strikes || 0
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

  static getMilestones() {
    const progress = this.getProgress();
    return MILESTONES.map(m => ({
      ...m,
      unlocked: progress.isActive && progress.currentDay >= m.day
    }));
  }
}
