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
        throw new Error(`Error (${response.status}): invalid Pi-hole credentials.`);
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
        throw new Error('Pi-hole v6 authentication failed. Incorrect password.');
      }
    } catch (err) {
      if (err.message && err.message.includes('Failed to fetch')) {
        return {
          success: false,
          error: `Unable to reach Pi-hole at ${protocol}://${parsed.host}:${parsed.port}. Check that IP and port are correct and that Pi-hole is powered on and connected to the same network.`
        };
      }
      return { success: false, error: err.message };
    }
  }

  // Helper to generate clean Pi-hole v6 authentication headers
  // Using SID header and query parameters avoids browser CORS preflight issues with custom tokens
  static getAuthHeaders(cfg) {
    return {
      'Content-Type': 'application/json',
      'sid': cfg.sid || '',
      'X-FTL-SID': cfg.sid || ''
    };
  }

  // Check Pi-hole v6 status and blocking
  static async checkStatus() {
    const cfg = this.getConfig();
    if (!cfg.sid) {
      return { connected: false, message: 'No active Pi-hole session.' };
    }

    try {
      const url = `${this.getBaseUrl(cfg)}/dns/blocking?sid=${encodeURIComponent(cfg.sid)}`;
      const response = await fetch(url, {
        headers: this.getAuthHeaders(cfg)
      });

      if (!response.ok) {
        return { connected: false, message: 'Session expired or Pi-hole unreachable.' };
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

  // Full verification test for Wizard Step 3 (auth + status check, no list modification)
  static async verifyConnection(rawHost, rawPort, password, useSsl = false) {
    const authRes = await this.authenticate(rawHost, rawPort, password, useSsl);
    if (!authRes.success) {
      return authRes;
    }

    // Verify blocking status
    const status = await this.checkStatus();
    return {
      success: true,
      host: authRes.host,
      port: authRes.port,
      blocking: status.blocking
    };
  }

  // Get all currently configured adlists from Pi-hole v6
  static async getExistingAdlists() {
    const cfg = this.getConfig();
    if (!cfg.sid) return [];

    try {
      const url = `${this.getBaseUrl(cfg)}/lists?type=block&sid=${encodeURIComponent(cfg.sid)}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(cfg)
      });
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data.lists) ? data.lists : [];
      }
    } catch {
      // Network or CORS quirk
    }
    return [];
  }

  // Inject NNN NSFW Adlists into Pi-hole v6 Gravity
  static async injectNsfwAdlists() {
    const cfg = this.getConfig();
    if (!cfg.sid) {
      throw new Error('Connect to your Pi-hole v6 first.');
    }

    const results = [];
    const headers = this.getAuthHeaders(cfg);

    // 1. Fetch currently active lists from Pi-hole to detect already injected lists
    let existingLists = await this.getExistingAdlists();

    const isListPresent = (url, name) => {
      const targetUrl = url.toLowerCase().trim();
      return existingLists.some(item => {
        const itemUrl = (item.address || '').toLowerCase().trim();
        const itemComment = (item.comment || '');
        return itemUrl === targetUrl || (name && itemComment.includes(name));
      });
    };

    let addedCount = 0;
    let existingCount = 0;
    let failedCount = 0;

    for (const adlist of PIHOLE_NSFW_ADLISTS) {
      // If already present in Pi-hole database, mark as active
      if (isListPresent(adlist.url, adlist.name)) {
        existingCount++;
        results.push({ name: adlist.name, ok: true, status: 200, message: 'Already present on Pi-hole' });
        continue;
      }

      const url = `${this.getBaseUrl(cfg)}/lists?type=block&sid=${encodeURIComponent(cfg.sid)}`;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            address: adlist.url,
            type: 'block',
            comment: `[NNN Shield] ${adlist.name}`,
            enabled: true,
            sid: cfg.sid
          })
        });

        if (res.ok) {
          addedCount++;
          results.push({ name: adlist.name, ok: true, status: res.status });
        } else if (res.status === 409) {
          existingCount++;
          results.push({ name: adlist.name, ok: true, status: 409, message: 'Already present' });
        } else {
          failedCount++;
          const errBody = await res.json().catch(() => ({}));
          const errMsg = errBody.error || errBody.message || `HTTP ${res.status}`;
          results.push({ name: adlist.name, ok: false, status: res.status, error: errMsg });
        }
      } catch (e) {
        // Some desktop browsers throw 'Failed to fetch' on the response due to CORS header duplication,
        // even though the POST request was successfully received and written by Pi-hole.
        // Re-verify against Pi-hole's lists list:
        existingLists = await this.getExistingAdlists();
        if (isListPresent(adlist.url, adlist.name)) {
          addedCount++;
          results.push({ name: adlist.name, ok: true, status: 200, message: 'Successfully added to Pi-hole' });
        } else {
          failedCount++;
          results.push({ name: adlist.name, ok: false, error: e.message });
        }
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
    if (!cfg.sid) return { success: false, error: 'Not connected' };

    try {
      const url = `${this.getBaseUrl(cfg)}/action/gravity?sid=${encodeURIComponent(cfg.sid)}`;
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
      throw new Error('No active connection to Pi-hole v6. Connect first by entering IP and current password.');
    }

    const newRandomPassword = TimeVault.generateRandomPassword();
    const url = `${this.getBaseUrl(cfg)}/auth/password?sid=${encodeURIComponent(cfg.sid)}`;

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
        throw new Error(errorJson.message || `Pi-hole server rejected the update (${response.status})`);
      }
    } catch (networkErr) {
      throw new Error(`Unable to reach Pi-hole v6 server (${cfg.host}:${cfg.port}): ${networkErr.message}. Password was NOT changed for security reasons.`);
    }

    if (updateSucceeded) {
      // Invalidate the session so the user is immediately logged out
      cfg.sid = null;
      cfg.connected = false;
      this.saveConfig(cfg);

      return {
        success: true,
        newPassword: newRandomPassword,
        message: 'Pi-hole v6 server password successfully changed!'
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
