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

  // Robust endpoint parser: handles "192.168.0.44:82", "http://192.168.0.44:82/admin", "https://pi.hole"
  static parseEndpoint(rawInput, explicitPort = null, defaultSsl = false) {
    if (!rawInput) return { host: '192.168.1.100', port: 80, useSsl: false };

    let cleaned = rawInput.trim();
    let useSsl = defaultSsl;

    if (cleaned.toLowerCase().startsWith('https://')) {
      useSsl = true;
      cleaned = cleaned.replace(/^https:\/\//i, '');
    } else if (cleaned.toLowerCase().startsWith('http://')) {
      useSsl = false;
      cleaned = cleaned.replace(/^http:\/\//i, '');
    }

    // Strip trailing slashes, /admin, /api
    cleaned = cleaned.split('/')[0];

    let host = cleaned;
    let port = explicitPort ? parseInt(explicitPort, 10) : (useSsl ? 443 : 80);

    // If host contains ":port", extract it and override
    if (cleaned.includes(':')) {
      const parts = cleaned.split(':');
      host = parts[0];
      const parsedPort = parseInt(parts[1], 10);
      if (!isNaN(parsedPort) && parsedPort > 0 && parsedPort <= 65535) {
        port = parsedPort;
      }
    }

    if (isNaN(port) || port <= 0) port = 80;

    return { host, port, useSsl };
  }

  static getBaseUrl(cfg) {
    const parsed = this.parseEndpoint(cfg.host, cfg.port, cfg.useSsl);
    const protocol = parsed.useSsl ? 'https' : 'http';
    return `${protocol}://${parsed.host}:${parsed.port}/api`;
  }

  // Authenticate against Pi-hole v6 REST API
  static async authenticate(rawHost, rawPort, password, useSsl = false) {
    const parsed = this.parseEndpoint(rawHost, rawPort, useSsl);
    const protocol = parsed.useSsl ? 'https' : 'http';
    const url = `${protocol}://${parsed.host}:${parsed.port}/api/auth`;

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
          host: parsed.host,
          port: parsed.port,
          useSsl: parsed.useSsl,
          sid: data.session.sid,
          csrf: data.session.csrf,
          lastChecked: Date.now(),
          connected: true
        };
        this.saveConfig(cfg);
        return { success: true, session: data.session, host: parsed.host, port: parsed.port };
      } else {
        throw new Error('Autenticazione Pi-hole v6 fallita. Password errata.');
      }
    } catch (err) {
      if (err.message && err.message.includes('Failed to fetch')) {
        return {
          success: false,
          error: `Impossibile raggiungere Pi-hole su ${protocol}://${parsed.host}:${parsed.port}. Controlla che l'IP e la porta siano corretti e che il Pi-hole sia acceso e connesso alla stessa rete.`
        };
      }
      return { success: false, error: err.message };
    }
  }

  // Helper to generate full Pi-hole v6 authentication headers (including CSRF tokens)
  static getAuthHeaders(cfg) {
    const headers = {
      'Content-Type': 'application/json',
      'sid': cfg.sid || '',
      'X-FTL-SID': cfg.sid || ''
    };
    if (cfg.csrf) {
      headers['X-FTL-CSRF'] = cfg.csrf;
      headers['X-CSRF-Token'] = cfg.csrf;
      headers['csrf'] = cfg.csrf;
    }
    return headers;
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
        headers: this.getAuthHeaders(cfg)
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
    const url = `${this.getBaseUrl(cfg)}/lists?type=block`;
    const headers = this.getAuthHeaders(cfg);

    let addedCount = 0;
    let existingCount = 0;
    let failedCount = 0;

    for (const adlist of PIHOLE_NSFW_ADLISTS) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            address: adlist.url,
            type: 'block',
            comment: `[NNN Shield] ${adlist.name}`,
            enabled: true
          })
        });

        if (res.ok) {
          addedCount++;
          results.push({ name: adlist.name, ok: true, status: res.status });
        } else if (res.status === 409) {
          // List already exists in Pi-hole
          existingCount++;
          results.push({ name: adlist.name, ok: true, status: 409, message: 'Già presente' });
        } else {
          failedCount++;
          const errBody = await res.json().catch(() => ({}));
          const errMsg = errBody.error || errBody.message || `HTTP ${res.status}`;
          results.push({ name: adlist.name, ok: false, status: res.status, error: errMsg });
        }
      } catch (e) {
        failedCount++;
        results.push({ name: adlist.name, ok: false, error: e.message });
      }
    }

    // Trigger gravity update asynchronously in background so lists are compiled
    this.updateGravity().catch(() => {});

    return {
      success: failedCount === 0,
      total: PIHOLE_NSFW_ADLISTS.length,
      added: addedCount,
      existing: existingCount,
      failed: failedCount,
      details: results
    };
  }

  // Trigger Pi-hole v6 Gravity update
  static async updateGravity() {
    const cfg = this.getConfig();
    if (!cfg.sid) return { success: false, error: 'Non connesso' };

    try {
      const url = `${this.getBaseUrl(cfg)}/action/gravity`;
      const res = await fetch(url, {
        method: 'POST',
        headers: this.getAuthHeaders(cfg)
      });
      return { success: res.ok, status: res.status };
    } catch (err) {
      return { success: false, error: err.message };
    }
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
        headers: this.getAuthHeaders(cfg),
        body: JSON.stringify({ password: newRandomPassword })
      });

      if (response.ok) {
        updateSucceeded = true;
      } else {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.message || `Il server Pi-hole ha rifiutato l'aggiornamento (${response.status})`);
      }
    } catch (networkErr) {
      throw new Error(`Impossibile contattare il server Pi-hole v6 (${cfg.host}:${cfg.port}): ${networkErr.message}. La password NON è stata modificata per motivi di sicurezza.`);
    }

    if (updateSucceeded) {
      // Invalidate the session so the user is immediately logged out
      cfg.sid = null;
      cfg.connected = false;
      this.saveConfig(cfg);

      return {
        success: true,
        newPassword: newRandomPassword,
        message: 'Password del server Pi-hole v6 modificata con successo!'
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
