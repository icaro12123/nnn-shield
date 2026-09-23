// ==========================================================================
// ANDROID SETUP & ANTI-BYPASS HARDENING WIZARD
// ==========================================================================

import { PRIVATE_DNS_PROVIDERS } from '../../data/blocklists.js';
import { ModalDialog } from '../ui/dialog.js';
import { registerPlugin } from '@capacitor/core';

const NativeSettings = registerPlugin('NativeSettings');

export class AndroidSetupGuide {
  static getProviders() {
    return PRIVATE_DNS_PROVIDERS;
  }

  // Open Android System Network/DNS Settings via Native Intent Plugin
  static async openAndroidNetworkSettings() {
    try {
      if (NativeSettings && typeof NativeSettings.openNetworkSettings === 'function') {
        await NativeSettings.openNetworkSettings();
        return;
      }
    } catch (err) {
      console.warn('Errore apertura impostazioni native:', err);
    }

    // Fallback for browser or if unsupported
    await ModalDialog.showNotice({
      title: 'Manual Settings',
      message: 'Open manually on your phone:\nSettings > Network & internet (or Connections) > Private DNS.',
      type: 'info',
      icon: 'settings'
    });
  }

  // Anti-Bypass Hardening Strategies
  static getAntiBypassStrategies() {
    return [
      {
        level: 'Maximum Security (Recommended)',
        title: 'Settings Lock with PIN Sealed in Vault',
        desc: 'Use an app locker (e.g. AppBlock or Digital Wellbeing) to block access to Android "Settings". Generate a random PIN and seal it in our Time Vault. You will not be able to open settings to disable DNS!',
        icon: 'lock_clock',
        badge: 'Inviolable'
      },
      {
        level: 'Network Level',
        title: 'Always-On VPN with Android Killswitch',
        desc: 'In Android VPN settings, enable "Always-on VPN" and "Block connections without VPN". If the tunnel or DNS filter is disconnected, the phone immediately blocks all internet traffic.',
        icon: 'vpn_key',
        badge: 'Killswitch'
      },
      {
        level: 'Active Monitoring',
        title: 'Anti-Cheat Sentinel & +24h Penalty',
        desc: 'NNN Shield runs periodic checks of canary DNS resolution. If you disable Private DNS, the app adds a +24-hour penalty to the vault for each attempt.',
        icon: 'gavel',
        badge: 'Automatic'
      }
    ];
  }

  static getStepByStepGuide(selectedProviderHost = 'adult-filter-dns.cleanbrowsing.org') {
    return [
      {
        step: 1,
        title: 'Copy Private DNS Host',
        text: `Copy DoT address: "${selectedProviderHost}". This provider completely blocks NSFW content, adult forums, and enforces SafeSearch.`,
        actionText: 'Copy DNS Host',
        copyValue: selectedProviderHost
      },
      {
        step: 2,
        title: 'Open Android Settings',
        text: 'Tap the button below to directly open your Android device\'s "Network & internet" screen.',
        actionText: 'Open Network Settings',
        isIntent: true
      },
      {
        step: 3,
        title: 'Set to "Private DNS provider hostname"',
        text: `Scroll to "Private DNS", select the third option, and paste: ${selectedProviderHost}. Tap Save.`,
        actionText: null
      },
      {
        step: 4,
        title: 'Enable Anti-Bypass Protection',
        text: 'Lock Android Settings with a PIN and seal the PIN in our Vault to prevent yourself from turning it off in moments of weakness.',
        actionText: 'Seal in Vault'
      }
    ];
  }
}
