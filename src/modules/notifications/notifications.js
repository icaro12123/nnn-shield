// ==========================================================================
// LOCAL NOTIFICATION SERVICE & PRIVACY STEALTH MODE
// ==========================================================================

import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

const NOTIF_STORAGE_KEY = 'nnn_notification_settings';
const NOTIF_ID_EVENING = 101;
const NOTIF_ID_DEADLINE = 102;

export const DEFAULT_NOTIF_SETTINGS = {
  enabled: true,
  stealthMode: false,
  eveningHour: 20,
  eveningMinute: 30,
  deadlineHour: 23,
  deadlineMinute: 0
};

export class NotificationService {
  static getSettings() {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_NOTIF_SETTINGS };
    try {
      return { ...DEFAULT_NOTIF_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_NOTIF_SETTINGS };
    }
  }

  static saveSettings(settings) {
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(settings));
  }

  static isStealthMode() {
    return this.getSettings().stealthMode === true;
  }

  static async setStealthMode(isStealth) {
    const settings = this.getSettings();
    settings.stealthMode = isStealth;
    this.saveSettings(settings);
    // Ri-schedula con i nuovi testi (stealth vs standard)
    if (settings.enabled) {
      await this.scheduleDailyReminders();
    }
  }

  static async isPermissionGranted() {
    if (Capacitor.isNativePlatform()) {
      try {
        const status = await LocalNotifications.checkPermissions();
        return status.display === 'granted';
      } catch (e) {
        console.warn('Errore verifica permessi nativi notifiche:', e);
        return false;
      }
    } else if ('Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  }

  static async requestPermissions() {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await LocalNotifications.requestPermissions();
        const granted = result.display === 'granted';
        const settings = this.getSettings();
        settings.enabled = granted;
        this.saveSettings(settings);
        if (granted) {
          await this.scheduleDailyReminders();
        }
        return granted;
      } catch (err) {
        console.error('Errore richiesta permessi notifiche Capacitor:', err);
        return false;
      }
    } else if ('Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        const granted = perm === 'granted';
        const settings = this.getSettings();
        settings.enabled = granted;
        this.saveSettings(settings);
        return granted;
      } catch (err) {
        console.error('Errore richiesta permessi notifiche Web:', err);
        return false;
      }
    }
    return false;
  }

  static getNotificationContent(type = 'evening') {
    const isStealth = this.isStealthMode();

    if (type === 'evening') {
      if (isStealth) {
        return {
          title: 'Promemoria Sincronizzazione',
          body: 'Attività di sicurezza programmata in attesa di conferma.'
        };
      }
      return {
        title: '🛡️ NNN Shield - Check-in Serale',
        body: 'Un\'altra giornata di disciplina completata! Apri l\'app ed effettua il check-in per mantenere saldo il patto.'
      };
    }

    // deadline
    if (isStealth) {
      return {
        title: 'Verifica di Sistema',
        body: 'Aggiornamento di stato giornaliero in scadenza a breve.'
      };
    }
    return {
      title: '⚠️ NNN Shield: Check-in in Scadenza!',
      body: 'Manca meno di un\'ora alla fine della giornata. Fai il check-in per evitare penalità alla cassaforte!'
    };
  }

  static async scheduleDailyReminders() {
    const settings = this.getSettings();
    if (!settings.enabled) return;

    if (!Capacitor.isNativePlatform()) {
      console.log('[NotificationService] Piattaforma web: promemoria locali attivi su Android.');
      return;
    }

    try {
      const hasPerm = await this.isPermissionGranted();
      if (!hasPerm) return;

      // Annulla eventuali notifiche pregresse per evitare duplicati
      try {
        await LocalNotifications.cancel({
          notifications: [{ id: NOTIF_ID_EVENING }, { id: NOTIF_ID_DEADLINE }]
        });
      } catch (_) {}

      const now = new Date();

      // 1. Notifica Serale (default 20:30)
      const eveningDate = new Date();
      eveningDate.setHours(settings.eveningHour, settings.eveningMinute, 0, 0);
      if (eveningDate.getTime() <= now.getTime()) {
        eveningDate.setDate(eveningDate.getDate() + 1);
      }

      // 2. Notifica Scadenza Urgente (default 23:00)
      const deadlineDate = new Date();
      deadlineDate.setHours(settings.deadlineHour, settings.deadlineMinute, 0, 0);
      if (deadlineDate.getTime() <= now.getTime()) {
        deadlineDate.setDate(deadlineDate.getDate() + 1);
      }

      const eveningContent = this.getNotificationContent('evening');
      const deadlineContent = this.getNotificationContent('deadline');

      await LocalNotifications.schedule({
        notifications: [
          {
            id: NOTIF_ID_EVENING,
            title: eveningContent.title,
            body: eveningContent.body,
            schedule: {
              at: eveningDate,
              repeats: true,
              every: 'day',
              allowWhileIdle: true
            },
            sound: undefined,
            actionTypeId: '',
            extra: { type: 'daily_checkin' }
          },
          {
            id: NOTIF_ID_DEADLINE,
            title: deadlineContent.title,
            body: deadlineContent.body,
            schedule: {
              at: deadlineDate,
              repeats: true,
              every: 'day',
              allowWhileIdle: true
            },
            sound: undefined,
            actionTypeId: '',
            extra: { type: 'urgent_checkin' }
          }
        ]
      });

      console.log('[NotificationService] Promemoria giornalieri schedulati con successo.');
    } catch (err) {
      console.warn('Errore durante la schedulazione delle notifiche:', err);
    }
  }

  static async onCheckInCompleted() {
    await this.scheduleDailyReminders();
  }
}
