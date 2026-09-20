// ==========================================================================
// ANDROID SETUP & ANTI-BYPASS HARDENING WIZARD
// ==========================================================================

import { PRIVATE_DNS_PROVIDERS } from '../../data/blocklists.js';

export class AndroidSetupGuide {
  static getProviders() {
    return PRIVATE_DNS_PROVIDERS;
  }

  // Open Android System Network/DNS Settings via Intents
  static openAndroidNetworkSettings() {
    try {
      // Try opening directly via Android intent URL
      window.location.href = 'intent:#Intent;action=android.settings.NETWORK_OPERATOR_SETTINGS;end';
    } catch {
      try {
        window.location.href = 'intent:#Intent;action=android.settings.WIRELESS_SETTINGS;end';
      } catch {
        alert('Apri manualmente: Impostazioni Android > Rete e Internet > DNS Privato.');
      }
    }
  }

  // Anti-Bypass Hardening Strategies
  static getAntiBypassStrategies() {
    return [
      {
        level: 'Massima Sicurezza (Consigliato)',
        title: 'Blocco Impostazioni con PIN Sigillato nel Vault',
        desc: 'Usa un\'app di blocco (es. AppBlock o Digital Wellbeing) per bloccare l\'accesso all\'app "Impostazioni" di Android. Genera un PIN casuale e sigillalo nella nostra Cassaforte a Tempo. In questo modo non potrai aprire le impostazioni per disattivare il DNS!',
        icon: 'lock_clock',
        badge: 'Inviolabile'
      },
      {
        level: 'Livello Rete',
        title: 'VPN Always-On con Killswitch Android',
        desc: 'Nelle impostazioni VPN di Android, attiva le opzioni "VPN Always-on" e "Blocca connessioni senza VPN". Se il tunnel o il filtro DNS viene disattivato, il telefono blocca istantaneamente l\'intera connessione internet.',
        icon: 'vpn_key',
        badge: 'Killswitch'
      },
      {
        level: 'Monitoraggio Attivo',
        title: 'Sentinella Anti-Cheat & Penalità +24h',
        desc: 'NNN Shield esegue controlli periodici della risoluzione DNS canary. Se disattivi il DNS Privato, l\'app applica una penalità di +24 ore sulla cassaforte per ogni tentativo.',
        icon: 'gavel',
        badge: 'Automatico'
      }
    ];
  }

  static getStepByStepGuide(selectedProviderHost = 'adult-filter-dns.cleanbrowsing.org') {
    return [
      {
        step: 1,
        title: 'Copia l\'Host DNS Privato',
        text: `Copia l'indirizzo DoT: "${selectedProviderHost}". Questo provider blocca alla radice qualsiasi contenuto NSFW, forum pornografici e impone SafeSearch.`,
        actionText: 'Copia Host DNS',
        copyValue: selectedProviderHost
      },
      {
        step: 2,
        title: 'Apri le Impostazioni Android',
        text: 'Tocca il pulsante qui sotto per aprire direttamente la schermata "Rete e Internet" del tuo dispositivo Android.',
        actionText: 'Apri Impostazioni Rete',
        isIntent: true
      },
      {
        step: 3,
        title: 'Imposta su "Nome host del provider DNS privato"',
        text: `Scorri fino alla voce "DNS Privato", seleziona la terza opzione ed incolla: ${selectedProviderHost}. Premi Salva.`,
        actionText: null
      },
      {
        step: 4,
        title: 'Attiva la Protezione Anti-Bypass',
        text: 'Blocca le Impostazioni Android con un PIN e sigilla il PIN nella nostra Cassaforte per impedire a te stesso di disattivarlo nei momenti di tentazione.',
        actionText: 'Sigilla nella Cassaforte'
      }
    ];
  }
}
