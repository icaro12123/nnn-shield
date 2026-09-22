// ==========================================================================
// TIME-LOCK PASSWORD VAULT (AES-GCM Web Crypto Implementation)
// ==========================================================================

const STORAGE_KEY = 'nnn_time_vault_data';

// Helper: Convert string to ArrayBuffer
function str2ab(str) {
  return new TextEncoder().encode(str);
}

// Helper: Convert ArrayBuffer to string
function ab2str(buf) {
  return new TextDecoder().decode(buf);
}

// Helper: Base64 encoding/decoding
function buf2b64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function b642buf(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Derive AES-GCM Key from local device entropy and target timestamp
async function deriveKey(salt, unlockTimestamp) {
  const secretMaterial = `NNN_SHIELD_VAULT_${unlockTimestamp}_IRREVERSIBLE_LOCK`;
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    str2ab(secretMaterial),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 150000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export class TimeVault {
  static getVaultState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  static isLocked() {
    const state = this.getVaultState();
    if (!state || !state.isLocked) return false;
    return true;
  }

  static isUnlockable() {
    const state = this.getVaultState();
    if (!state || !state.isLocked) return false;
    return Date.now() >= state.unlockTimestamp;
  }

  static getTimeRemaining() {
    const state = this.getVaultState();
    if (!state || !state.isLocked) return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
    const diff = Math.max(0, state.unlockTimestamp - Date.now());
    const seconds = Math.floor((diff / 1000) % 60);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return { days, hours, minutes, seconds, totalMs: diff };
  }

  // Generate a cryptographically secure 32-char password
  static generateRandomPassword() {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~';
    const randomValues = new Uint32Array(32);
    crypto.getRandomValues(randomValues);
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += charset[randomValues[i] % charset.length];
    }
    return result;
  }

  // Lock a secret (string or object) in the vault until target timestamp
  static async lockSecret(passwordToHide, targetTimestamp, label = 'Segreti NNN Shield') {
    if (Date.now() >= targetTimestamp) {
      throw new Error('La data di sblocco deve essere futura.');
    }

    const payload = typeof passwordToHide === 'object' ? JSON.stringify(passwordToHide) : String(passwordToHide);

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(salt, targetTimestamp);

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      str2ab(payload)
    );

    const vaultData = {
      isLocked: true,
      label: label,
      createdTimestamp: Date.now(),
      unlockTimestamp: targetTimestamp,
      originalDurationDays: Math.ceil((targetTimestamp - Date.now()) / (1000 * 60 * 60 * 24)),
      penaltiesCount: 0,
      penaltyHoursAdded: 0,
      salt: buf2b64(salt),
      iv: buf2b64(iv),
      ciphertext: buf2b64(ciphertext)
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(vaultData));
    return vaultData;
  }

  // Unlock and reveal secret only if time has elapsed
  static async unlockSecret() {
    const state = this.getVaultState();
    if (!state || !state.isLocked) {
      throw new Error('Nessun segreto bloccato nella cassaforte.');
    }

    if (Date.now() < state.unlockTimestamp) {
      const remaining = this.getTimeRemaining();
      throw new Error(`La cassaforte è SIGILLATA. Tempo rimanente: ${remaining.days}d ${remaining.hours}h ${remaining.minutes}m.`);
    }

    const salt = new Uint8Array(b642buf(state.salt));
    const iv = new Uint8Array(b642buf(state.iv));
    const ciphertext = b642buf(state.ciphertext);

    // Using the original unlockTimestamp to derive key
    const key = await deriveKey(salt, state.unlockTimestamp);

    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        ciphertext
      );
      const str = ab2str(decrypted);
      try {
        const obj = JSON.parse(str);
        if (typeof obj === 'object' && obj !== null) {
          const parts = [];
          if (obj.appLockerPin) parts.push(`PIN App-Locker: ${obj.appLockerPin}`);
          if (obj.piholePassword) parts.push(`Password Pi-hole v6: ${obj.piholePassword}`);
          if (obj.customSecret) parts.push(`Password Personale: ${obj.customSecret}`);
          if (parts.length > 0) return parts.join('\n');
        }
      } catch {
        // Not a JSON object, return as string
      }
      return str;
    } catch (err) {
      throw new Error('Errore di decifratura: integrità della chiave compromessa.');
    }
  }

  // Add penalty time (Anti-cheat punishment, e.g. +24 hours)
  static addPenalty(hours = 24, reason = 'Tentativo di aggiramento DNS rilevato') {
    const state = this.getVaultState();
    if (!state || !state.isLocked) return null;

    const penaltyMs = hours * 60 * 60 * 1000;
    state.unlockTimestamp += penaltyMs;
    state.penaltiesCount = (state.penaltiesCount || 0) + 1;
    state.penaltyHoursAdded = (state.penaltyHoursAdded || 0) + hours;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    // Save penalty log
    const penaltyLogs = JSON.parse(localStorage.getItem('nnn_penalty_logs') || '[]');
    penaltyLogs.push({
      timestamp: Date.now(),
      hoursAdded: hours,
      reason: reason
    });
    localStorage.setItem('nnn_penalty_logs', JSON.stringify(penaltyLogs));

    return state;
  }

  // Revert a false positive penalty (e.g. from initial setup DNS propagation)
  static revertPenalty(hours = 24, reasonSubstring = 'Fuga DNS') {
    const state = this.getVaultState();
    if (!state || !state.isLocked) return false;

    const penaltyLogs = JSON.parse(localStorage.getItem('nnn_penalty_logs') || '[]');
    const idx = penaltyLogs.findIndex(log => log.reason && log.reason.includes(reasonSubstring));
    if (idx !== -1) {
      penaltyLogs.splice(idx, 1);
      localStorage.setItem('nnn_penalty_logs', JSON.stringify(penaltyLogs));

      const penaltyMs = hours * 60 * 60 * 1000;
      state.unlockTimestamp = Math.max(state.unlockTimestamp - penaltyMs, Date.now());
      state.penaltiesCount = Math.max((state.penaltiesCount || 1) - 1, 0);
      state.penaltyHoursAdded = Math.max((state.penaltyHoursAdded || hours) - hours, 0);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    }
    return false;
  }

  // Destroy vault (Simulating tamper-destruction: password is lost forever)
  static emergencyPurge() {
    localStorage.removeItem(STORAGE_KEY);
  }
}
