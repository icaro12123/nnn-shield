// ==========================================================================
// PANIC BUTTON & URGENT INTERVENTION ENGINE
// ==========================================================================

import { RELAPSE_PREVENTION_QUOTES, PHYSICAL_RESET_ACTIONS } from '../../data/quotes.js';

export class PanicService {
  static getRandomQuote() {
    const idx = Math.floor(Math.random() * RELAPSE_PREVENTION_QUOTES.length);
    return RELAPSE_PREVENTION_QUOTES[idx];
  }

  static getAllQuotes() {
    return RELAPSE_PREVENTION_QUOTES;
  }

  static getPhysicalActions() {
    return PHYSICAL_RESET_ACTIONS;
  }

  // Play subtle calming synthesized tone using Web Audio API
  static playTone(freq = 432, duration = 0.4) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio context might be restricted before interaction
    }
  }

  // Trigger device haptic vibration on Android
  static vibrate(ms = [100, 50, 100]) {
    if (navigator.vibrate) {
      navigator.vibrate(ms);
    }
  }
}
