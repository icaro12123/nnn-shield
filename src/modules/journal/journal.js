// ==========================================================================
// ENCRYPTED PERSONAL JOURNAL (AES-GCM Local Storage)
// ==========================================================================

const JOURNAL_STORAGE_KEY = 'nnn_encrypted_journal_data';
const JOURNAL_SALT_KEY = 'nnn_journal_salt';

function str2ab(str) {
  return new TextEncoder().encode(str);
}

function ab2str(buf) {
  return new TextDecoder().decode(buf);
}

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

// Derive AES-GCM Key for Journal from device master seed
async function getJournalKey(pin = 'NNN_SHIELD_SECURE_KEY') {
  let saltB64 = localStorage.getItem(JOURNAL_SALT_KEY);
  let salt;
  if (!saltB64) {
    salt = crypto.getRandomValues(new Uint8Array(16));
    localStorage.setItem(JOURNAL_SALT_KEY, buf2b64(salt));
  } else {
    salt = new Uint8Array(b642buf(saltB64));
  }

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    str2ab(`JOURNAL_ENTROPY_${pin}`),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export class EncryptedJournal {
  static getRawEntries() {
    const raw = localStorage.getItem(JOURNAL_STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static async saveEntry(noteText, mood = 3, urgeLevel = 1, pin = 'NNN_SHIELD_SECURE_KEY') {
    const key = await getJournalKey(pin);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      str2ab(noteText)
    );

    const newEntry = {
      id: 'entry_' + Date.now(),
      timestamp: Date.now(),
      dateStr: new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }),
      mood,
      urgeLevel,
      iv: buf2b64(iv),
      encryptedNote: buf2b64(ciphertext)
    };

    const entries = this.getRawEntries();
    entries.unshift(newEntry);
    localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries));
    return newEntry;
  }

  static async decryptEntry(entry, pin = 'NNN_SHIELD_SECURE_KEY') {
    try {
      const key = await getJournalKey(pin);
      const iv = new Uint8Array(b642buf(entry.iv));
      const ciphertext = b642buf(entry.encryptedNote);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        ciphertext
      );
      return ab2str(decrypted);
    } catch (err) {
      return '[Decryption error: invalid key]';
    }
  }

  static deleteEntry(id) {
    let entries = this.getRawEntries();
    entries = entries.filter(e => e.id !== id);
    localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries));
  }
}
