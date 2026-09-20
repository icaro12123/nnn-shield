// ==========================================================================
// PI-HOLE V6 INTEGRATION (REST API Client + Manual Adlists Generator)
// ==========================================================================

import { PIHOLE_NSFW_ADLISTS, SAFESEARCH_CNAME_REWRITES } from '../../data/blocklists.js';
import { TimeVault } from '../vault/vault.js';

const PIHOLE_CONFIG_KEY = 'nnn_pihole_config';

export class PiHoleService {
  static getConfig() {
    const raw = localStorage.getItem(PIHOLE_CONFIG_KEY);
    if (!raw) {
      return {
        host: '192.168.1.100',
        port: 80,
        useSsl: false,
        sid: null,
        csrf: null,
        lastChecked: null,
        connected: false
      };
    }
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  static saveConfig(cfg) {
    localStorage.setItem(PIHOLE_CONFIG_KEY, JSON.stringify(cfg));
  }

  static getBaseUrl(cfg) {
    const protocol = cfg.useSsl ? 'https' : 'http';
    return `${protocol}://${cfg.host}:${cfg.port}/api`;
  }

  // Authenticate against Pi-hole v6 REST API
  static async authenticate(host, port, password, useSsl = false) {
    const protocol = useSsl ? 'https' : 'http';
    const url = `${protocol}://${host}:${port}/api/auth`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password })
      });

      if (!response.ok) {
        throw new Error(`Errore (${response.status}): credenziali Pi-hole non valide.`);
      }

      const data = await response.json();
      if (data.session && data.session.valid) {
        const cfg = {
          host,
          port,
          useSsl,
          sid: data.session.sid,
          csrf: data.session.csrf,
          lastChecked: Date.now(),
          connected: true
        };
        this.saveConfig(cfg);
        return { success: true, session: data.session };
      } else {
        throw new Error('Autenticazione Pi-hole v6 fallita. Password errata.');
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Check Pi-hole v6 status and blocking
  static async checkStatus() {
    const cfg = this.getConfig();
    if (!cfg.sid) {
      return { connected: false, message: 'Nessuna sessione Pi-hole attiva.' };
    }

    try {
      const url = `${this.getBaseUrl(cfg)}/dns/blocking`;
      const response = await fetch(url, {
        headers: {
          'sid': cfg.sid
        }
      });

      if (!response.ok) {
        return { connected: false, message: 'Sessione scaduta o Pi-hole non raggiungibile.' };
      }

      const data = await response.json();
      return {
        connected: true,
        blocking: data.blocking,
        host: cfg.host
      };
    } catch (err) {
      return { connected: false, error: err.message };
    }
  }

  // Inject NNN NSFW Adlists into Pi-hole v6 Gravity
  static async injectNsfwAdlists() {
    const cfg = this.getConfig();
    if (!cfg.sid) {
      throw new Error('Connettiti prima al tuo Pi-hole v6.');
    }

    const results = [];
    const url = `${this.getBaseUrl(cfg)}/lists`;

    for (const adlist of PIHOLE_NSFW_ADLISTS) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'sid': cfg.sid
          },
          body: JSON.stringify({
            address: adlist.url,
            comment: `[NNN Shield] ${adlist.name}`,
            enabled: true
          })
        });
        results.push({ name: adlist.name, ok: res.ok });
      } catch (e) {
        results.push({ name: adlist.name, ok: false, error: e.message });
      }
    }

    return results;
  }

  // Real Pi-hole v6 Password Update & Lockdown
  // 1. Sends actual PUT request to Pi-hole v6 /api/auth/password
  // 2. Only if Pi-hole server confirms HTTP 200, seals the password in the TimeVault
  static async lockPiHolePassword(targetTimestamp) {
    const cfg = this.getConfig();
    if (!cfg.sid || !cfg.connected) {
      throw new Error('Nessun collegamento attivo con Pi-hole v6. Connettiti prima inserendo IP e password attuale.');
    }

    const newRandomPassword = TimeVault.generateRandomPassword();
    const url = `${this.getBaseUrl(cfg)}/auth/password`;

    let updateSucceeded = false;
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'sid': cfg.sid
        },
        body: JSON.stringify({ password: newRandomPassword })
      });

      if (response.ok) {
        updateSucceeded = true;
      } else {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.message || `Il server Pi-hole ha rifiutato l'aggiornamento (${response.status})`);
      }
    } catch (networkErr) {
      throw new Error(`Impossibile contattare il server Pi-hole v6 (${cfg.host}): ${networkErr.message}. La password NON è stata modificata per motivi di sicurezza.`);
    }

    if (updateSucceeded) {
      // Seal the new actual password in TimeVault
      await TimeVault.lockSecret(
        newRandomPassword,
        targetTimestamp,
        `Password Amministratore Pi-hole v6 (${cfg.host})`
      );

      // Invalidate the session so the user is immediately logged out
      cfg.sid = null;
      cfg.connected = false;
      this.saveConfig(cfg);

      return {
        success: true,
        message: 'Password del server Pi-hole v6 modificata con successo e sigillata nella cassaforte!'
      };
    }
  }

  static getManualAdlists() {
    return PIHOLE_NSFW_ADLISTS;
  }

  static getSafeSearchRewrites() {
    return SAFESEARCH_CNAME_REWRITES;
  }
}
