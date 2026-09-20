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
        apiKey: '',
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
        throw new Error(`Errore di connessione (${response.status}): credenziali Pi-hole non valide.`);
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
      return { connected: false, message: 'Nessuna sessione Pi-hole configurata.' };
    }

    try {
      const url = `${this.getBaseUrl(cfg)}/dns/blocking`;
      const response = await fetch(url, {
        headers: {
          'sid': cfg.sid
        }
      });

      if (!response.ok) {
        return { connected: false, message: 'Sessione scaduta o host non raggiungibile.' };
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

  // Inject NNN NSFW Adlists into Pi-hole v6
  static async injectNsfwAdlists() {
    const cfg = this.getConfig();
    if (!cfg.sid) {
      throw new Error('Autenticati prima al Pi-hole v6.');
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

  // Hardcore Lockdown: Generate random password for Pi-hole v6 and lock it in the TimeVault
  static async lockPiHolePassword(targetTimestamp) {
    const cfg = this.getConfig();
    if (!cfg.sid) {
      throw new Error('Connetti prima l\'app al tuo Pi-hole v6.');
    }

    const newRandomPassword = TimeVault.generateRandomPassword();
    const url = `${this.getBaseUrl(cfg)}/auth/password`;

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'sid': cfg.sid
        },
        body: JSON.stringify({ password: newRandomPassword })
      });

      if (!response.ok) {
        throw new Error('Impossibile aggiornare la password su Pi-hole v6 tramite API.');
      }

      // Lock password in TimeVault
      await TimeVault.lockSecret(
        newRandomPassword,
        targetTimestamp,
        `Pi-hole v6 Admin Password (${cfg.host})`
      );

      // Invalidate current session
      cfg.sid = null;
      cfg.connected = false;
      this.saveConfig(cfg);

      return {
        success: true,
        message: 'Password del Pi-hole modificata e sigillata nella cassaforte fino al termine della sfida!'
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Manual Generator Helpers
  static getManualAdlists() {
    return PIHOLE_NSFW_ADLISTS;
  }

  static getSafeSearchRewrites() {
    return SAFESEARCH_CNAME_REWRITES;
  }
}
