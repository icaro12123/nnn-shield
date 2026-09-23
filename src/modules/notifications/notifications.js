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
          title: 'Sync Reminder',
          body: 'Scheduled security task awaiting confirmation.'
        };
      }
      return {
        title: '🛡️ NNN Shield - Evening Check-in',
        body: 'Another day of discipline completed! Open the app and check in to keep your pact solid.'
      };
    }

    // deadline
    if (isStealth) {
      return {
        title: 'System Verification',
        body: 'Daily status update expiring soon.'
      };
    }
    return {
      title: '⚠️ NNN Shield: Check-in Expiring!',
      body: 'Less than an hour left today. Check in now to avoid a vault penalty!'
    };
  }

  static async scheduleDailyReminders() {
    const settings = this.getSettings();
    if (!settings.enabled) return;

    if (!Capacitor.isNativePlatform()) {
      console.log('[NotificationService] Web platform: local reminders active on Android.');
      return;
    }

    try {
      const hasPerm = await this.isPermissionGranted();
      if (!hasPerm) return;

      // Cancel previous notifications to prevent duplicates
      try {
        await LocalNotifications.cancel({
          notifications: [{ id: NOTIF_ID_EVENING }, { id: NOTIF_ID_DEADLINE }]
        });
      } catch (_) {}

      const now = new Date();

      // 1. Evening notification (default 20:30)
      const eveningDate = new Date();
      eveningDate.setHours(settings.eveningHour, settings.eveningMinute, 0, 0);
      if (eveningDate.getTime() <= now.getTime()) {
        eveningDate.setDate(eveningDate.getDate() + 1);
      }

      // 2. Urgent deadline notification (default 23:00)
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

      console.log('[NotificationService] Daily reminders scheduled successfully.');
    } catch (err) {
      console.warn('Error during notification scheduling:', err);
    }
  }

  static async onCheckInCompleted() {
    await this.scheduleDailyReminders();
  }
}
