// ==========================================================================
// BLOCKER & SAFESEARCH DIAGNOSTIC TESTER
// ==========================================================================

import { CANARY_TEST_DOMAINS } from '../../data/blocklists.js';

export class BlockerTester {
  // Test a domain resolution via fetch probe
  static async probeDomain(domain) {
    const start = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    try {
      // Trying to fetch favicon with no-cors. If blocked by DNS (0.0.0.0 or NXDOMAIN), it throws network error
      await fetch(`https://${domain}/favicon.ico?_nnn_test=${Date.now()}`, {
        mode: 'no-cors',
        signal: controller.signal,
        cache: 'no-store'
      });
      clearTimeout(timeoutId);

      // If it resolved and loaded without DNS failure, it means domain was NOT blocked by DNS
      return {
        domain,
        blocked: false,
        latencyMs: Math.round(performance.now() - start),
        status: 'LEAK_DETECTED'
      };
    } catch (err) {
      clearTimeout(timeoutId);
      // Fetch failure typically indicates DNS NXDOMAIN / Connection Refused (successfully blocked)
      const isAbort = err.name === 'AbortError';
      return {
        domain,
        blocked: true,
        latencyMs: Math.round(performance.now() - start),
        status: isAbort ? 'TIMEOUT_BLOCKED' : 'DNS_BLOCKED'
      };
    }
  }

  // Run full diagnostic suite
  static async runFullDiagnostic(onProgress = null) {
    const results = [];
    let totalBlocked = 0;

    for (let i = 0; i < CANARY_TEST_DOMAINS.length; i++) {
      const domain = CANARY_TEST_DOMAINS[i];
      if (onProgress) onProgress(i + 1, CANARY_TEST_DOMAINS.length, domain);
      const res = await this.probeDomain(domain);
      results.push(res);
      if (res.blocked) totalBlocked++;
    }

    const isSecure = totalBlocked >= Math.ceil(CANARY_TEST_DOMAINS.length * 0.8);

    return {
      timestamp: Date.now(),
      isSecure,
      totalTested: CANARY_TEST_DOMAINS.length,
      totalBlocked,
      protectionRate: Math.round((totalBlocked / CANARY_TEST_DOMAINS.length) * 100),
      details: results
    };
  }
}
