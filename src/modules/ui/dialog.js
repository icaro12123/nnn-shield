// ==========================================================================
// MATERIAL DESIGN 3 NATIVE MODAL DIALOGS (Sostituzione completa di alert/confirm)
// ==========================================================================

import { PanicService } from '../panic/panic.js';

export class ModalDialog {
  /**
   * Mostra una modale informativa o di avviso con stile nativo MD3.
   * Ritorna una Promise che si risolve quando l'utente clicca il pulsante di conferma.
   */
  static showNotice({
    title = 'Notice',
    message = '',
    icon = 'info',
    type = 'info', // 'info' | 'warning' | 'error' | 'success'
    confirmText = 'Got It'
  } = {}) {
    return new Promise((resolve) => {
      // Haptic vibration notice (no audio)
      if (type === 'error') {
        PanicService.vibrate([100, 50, 100]);
      } else if (type === 'warning') {
        PanicService.vibrate([60, 40]);
      } else {
        PanicService.vibrate(40);
      }

      const existingBackdrop = document.getElementById('nnn-native-dialog-backdrop');
      if (existingBackdrop) existingBackdrop.remove();

      const colorMap = {
        error: { color: '#f87171', border: 'rgba(239, 68, 68, 0.4)', icon: icon || 'error' },
        warning: { color: '#fbbf24', border: 'rgba(245, 158, 11, 0.4)', icon: icon || 'warning' },
        success: { color: '#34d399', border: 'rgba(16, 185, 129, 0.4)', icon: icon || 'check_circle' },
        info: { color: '#c084fc', border: 'rgba(192, 132, 252, 0.4)', icon: icon || 'info' }
      };

      const style = colorMap[type] || colorMap.info;
      const formattedMsg = (message || '').replace(/\n/g, '<br/>');

      const backdrop = document.createElement('div');
      backdrop.id = 'nnn-native-dialog-backdrop';
      backdrop.className = 'md-modal-backdrop';
      backdrop.style.zIndex = '99999';

      backdrop.innerHTML = `
        <div class="md-modal-content" style="border-color: ${style.border}; text-align: center; max-width: 380px;">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(0,0,0,0.3); border: 1px solid ${style.border}; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
            <span class="material-symbols-rounded" style="color: ${style.color}; font-size: 32px;">${style.icon}</span>
          </div>
          <h3 class="title-large" style="margin-bottom: 10px; color: #ffffff;">${title}</h3>
          <div class="body-medium" style="color: var(--md-sys-color-on-surface-variant); margin-bottom: 24px; font-size: 13px; line-height: 1.5; text-align: center;">
            ${formattedMsg}
          </div>
          <button id="nnn-dialog-btn-confirm" class="md-btn md-btn-primary md-btn-full" style="padding: 12px; font-weight: 600;">
            ${confirmText}
          </button>
        </div>
      `;

      document.body.appendChild(backdrop);

      requestAnimationFrame(() => {
        backdrop.classList.add('active');
      });

      const btnConfirm = backdrop.querySelector('#nnn-dialog-btn-confirm');
      const closeDialog = () => {
        PanicService.vibrate(30);
        backdrop.classList.remove('active');
        setTimeout(() => {
          backdrop.remove();
          resolve();
        }, 220);
      };

      btnConfirm.addEventListener('click', closeDialog);
    });
  }

  /**
   * Shows an MD3 native confirmation modal (Cancel / Confirm).
   */
  static showConfirm({
    title = 'Confirm Action',
    message = '',
    icon = 'help',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    danger = false
  } = {}) {
    return new Promise((resolve) => {
      PanicService.vibrate([50, 30]);

      const existingBackdrop = document.getElementById('nnn-native-dialog-backdrop');
      if (existingBackdrop) existingBackdrop.remove();

      const borderColor = danger ? 'rgba(239, 68, 68, 0.4)' : 'rgba(192, 132, 252, 0.4)';
      const iconColor = danger ? '#f87171' : '#c084fc';
      const formattedMsg = (message || '').replace(/\n/g, '<br/>');

      const backdrop = document.createElement('div');
      backdrop.id = 'nnn-native-dialog-backdrop';
      backdrop.className = 'md-modal-backdrop';
      backdrop.style.zIndex = '99999';

      backdrop.innerHTML = `
        <div class="md-modal-content" style="border-color: ${borderColor}; text-align: center; max-width: 380px;">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(0,0,0,0.3); border: 1px solid ${borderColor}; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
            <span class="material-symbols-rounded" style="color: ${iconColor}; font-size: 32px;">${icon}</span>
          </div>
          <h3 class="title-large" style="margin-bottom: 10px; color: #ffffff;">${title}</h3>
          <div class="body-medium" style="color: var(--md-sys-color-on-surface-variant); margin-bottom: 24px; font-size: 13px; line-height: 1.5; text-align: center;">
            ${formattedMsg}
          </div>
          <div style="display: flex; gap: 10px;">
            <button id="nnn-dialog-btn-cancel" class="md-btn md-btn-tonal" style="flex: 1; padding: 12px;">
              ${cancelText}
            </button>
            <button id="nnn-dialog-btn-ok" class="md-btn ${danger ? 'md-btn-danger glow-error' : 'md-btn-primary'}" style="flex: 1.2; padding: 12px; font-weight: 600;">
              ${confirmText}
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(backdrop);

      requestAnimationFrame(() => {
        backdrop.classList.add('active');
      });

      const btnCancel = backdrop.querySelector('#nnn-dialog-btn-cancel');
      const btnOk = backdrop.querySelector('#nnn-dialog-btn-ok');

      const close = (result) => {
        PanicService.vibrate(30);
        backdrop.classList.remove('active');
        setTimeout(() => {
          backdrop.remove();
          resolve(result);
        }, 220);
      };

      btnCancel.addEventListener('click', () => close(false));
      btnOk.addEventListener('click', () => close(true));
    });
  }
}
