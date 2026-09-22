// ==========================================================================
// SEALING ANIMATION OVERLAY (Transizione Scenografica di Blocco Sfida)
// Minimo 3 secondi, Timeout massimo di sicurezza, Vibrazioni aptiche (no suoni)
// ==========================================================================

import { PanicService } from '../panic/panic.js';

export class SealingOverlay {
  /**
   * Esegue l'animazione di sigillo a tutto schermo in parallelo all'operazione asincrona.
   * Se l'operazione fallisce o supera il timeout massimo, l'animazione si interrompe,
   * la conferma viene annullata e la Promise viene rifiutata con l'errore.
   * 
   * @param {Function} asyncTaskFn Funzione che esegue le chiamate (Pi-hole, Vault, etc.)
   * @param {number} minDurationMs Durata minima in ms dell'animazione (default: 3000ms)
   * @param {number} maxTimeoutMs Timeout massimo di sicurezza in ms (default: 12000ms)
   */
  static run(asyncTaskFn, minDurationMs = 3000, maxTimeoutMs = 12000) {
    return new Promise((resolve, reject) => {
      // 1. Crea l'overlay DOM
      const overlay = document.createElement('div');
      overlay.id = 'nnn-sealing-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: radial-gradient(circle at center, #1b1231 0%, #080511 100%);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        z-index: 999999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px;
        box-sizing: border-box;
        opacity: 0;
        transition: opacity 0.35s ease;
      `;

      overlay.innerHTML = `
        <!-- Central Animated Shield & Glowing Rings -->
        <div style="position: relative; width: 140px; height: 140px; margin-bottom: 28px; display: flex; align-items: center; justify-content: center;">
          
          <!-- Outer Pulsing Glow -->
          <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: radial-gradient(circle, rgba(168, 85, 247, 0.35) 0%, transparent 70%); animation: sealGlowPulse 2s infinite ease-in-out;"></div>
          
          <!-- Outer Rotating Dashed Ring -->
          <div style="position: absolute; width: 130px; height: 130px; border-radius: 50%; border: 2px dashed rgba(192, 132, 252, 0.5); animation: sealSpin 6s linear infinite;"></div>
          
          <!-- Inner Rotating Solid Ring -->
          <div style="position: absolute; width: 100px; height: 100px; border-radius: 50%; border: 2px solid transparent; border-top-color: #38bdf8; border-bottom-color: #c084fc; animation: sealSpinReverse 3s linear infinite;"></div>

          <!-- Central Icon -->
          <div id="seal-icon-wrap" style="position: relative; z-index: 2; width: 64px; height: 64px; border-radius: 50%; background: rgba(31, 22, 53, 0.9); border: 1px solid rgba(168, 85, 247, 0.6); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 24px rgba(168, 85, 247, 0.5);">
            <span id="seal-main-icon" class="material-symbols-rounded" style="color: #c084fc; font-size: 36px; transition: transform 0.3s, color 0.3s;">security</span>
          </div>
        </div>

        <!-- Headline -->
        <h2 id="seal-headline" class="title-large" style="color: #ffffff; text-align: center; margin-bottom: 8px; font-size: 20px; letter-spacing: 0.5px;">
          SIGILLO DELLA SFIDA IN CORSO
        </h2>
        <p class="body-small" style="color: #cac1df; text-align: center; margin-bottom: 24px; font-size: 13px;">
          Configurazione delle difese e chiusura della cassaforte...
        </p>

        <!-- Dynamic Steps Container -->
        <div style="width: 100%; max-width: 320px; display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px;">
          <div id="seal-step-1" class="glass-panel" style="padding: 10px 14px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; border-color: rgba(168, 85, 247, 0.2); transition: all 0.3s;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="material-symbols-rounded" style="color: #c084fc; font-size: 18px;">flag</span>
              <span class="body-small" style="color: #ffffff; font-size: 13px;">Inizializzazione protocollo</span>
            </div>
            <span id="seal-badge-1" style="color: #c084fc; font-size: 12px;">In corso...</span>
          </div>

          <div id="seal-step-2" class="glass-panel" style="padding: 10px 14px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; border-color: rgba(255,255,255,0.06); opacity: 0.5; transition: all 0.3s;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="material-symbols-rounded" style="color: #38bdf8; font-size: 18px;">dns</span>
              <span class="body-small" style="color: #ffffff; font-size: 13px;">Protezioni Pi-hole DNS</span>
            </div>
            <span id="seal-badge-2" style="color: #94a3b8; font-size: 12px;">In attesa</span>
          </div>

          <div id="seal-step-3" class="glass-panel" style="padding: 10px 14px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; border-color: rgba(255,255,255,0.06); opacity: 0.5; transition: all 0.3s;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="material-symbols-rounded" style="color: #fbbf24; font-size: 18px;">lock</span>
              <span class="body-small" style="color: #ffffff; font-size: 13px;">Cifratura TimeVault AES</span>
            </div>
            <span id="seal-badge-3" style="color: #94a3b8; font-size: 12px;">In attesa</span>
          </div>

          <div id="seal-step-4" class="glass-panel" style="padding: 10px 14px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; border-color: rgba(255,255,255,0.06); opacity: 0.5; transition: all 0.3s;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="material-symbols-rounded" style="color: #34d399; font-size: 18px;">verified_user</span>
              <span class="body-small" style="color: #ffffff; font-size: 13px;">Patto inviolabile sigillato</span>
            </div>
            <span id="seal-badge-4" style="color: #94a3b8; font-size: 12px;">In attesa</span>
          </div>
        </div>

        <!-- Linear Progress Bar -->
        <div style="width: 100%; max-width: 320px; height: 5px; background: rgba(255,255,255,0.08); border-radius: 6px; overflow: hidden;">
          <div id="seal-progress-bar" style="width: 10%; height: 100%; background: linear-gradient(90deg, #7c3aed, #c084fc, #38bdf8); border-radius: 6px; transition: width 0.4s ease;"></div>
        </div>
      `;

      // Iniettiamo stili per le keyframes di rotazione se non presenti
      if (!document.getElementById('seal-anim-styles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'seal-anim-styles';
        styleSheet.textContent = `
          @keyframes sealSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes sealSpinReverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
          @keyframes sealGlowPulse { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.15); opacity: 0.9; } }
        `;
        document.head.appendChild(styleSheet);
      }

      document.body.appendChild(overlay);
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
      });

      // Vibrazione iniziale (tattile)
      PanicService.vibrate(60);

      // Elementi per gli aggiornamenti visivi
      const mainIcon = overlay.querySelector('#seal-main-icon');
      const progressBar = overlay.querySelector('#seal-progress-bar');
      const step1 = overlay.querySelector('#seal-step-1');
      const badge1 = overlay.querySelector('#seal-badge-1');
      const step2 = overlay.querySelector('#seal-step-2');
      const badge2 = overlay.querySelector('#seal-badge-2');
      const step3 = overlay.querySelector('#seal-step-3');
      const badge3 = overlay.querySelector('#seal-badge-3');
      const step4 = overlay.querySelector('#seal-step-4');
      const badge4 = overlay.querySelector('#seal-badge-4');
      const headline = overlay.querySelector('#seal-headline');

      // Timeline di animazione visiva (fasi progressive)
      const t1 = setTimeout(() => {
        // Fase 2 (1000ms)
        badge1.textContent = '✓ OK';
        badge1.style.color = '#34d399';
        step2.style.opacity = '1';
        step2.style.borderColor = 'rgba(56, 189, 248, 0.4)';
        badge2.textContent = 'In corso...';
        badge2.style.color = '#38bdf8';
        progressBar.style.width = '40%';
        mainIcon.textContent = 'dns';
        mainIcon.style.color = '#38bdf8';
        PanicService.vibrate(40);
      }, 1000);

      const t2 = setTimeout(() => {
        // Fase 3 (2000ms)
        badge2.textContent = '✓ OK';
        badge2.style.color = '#34d399';
        step3.style.opacity = '1';
        step3.style.borderColor = 'rgba(251, 191, 36, 0.4)';
        badge3.textContent = 'In corso...';
        badge3.style.color = '#fbbf24';
        progressBar.style.width = '70%';
        mainIcon.textContent = 'lock';
        mainIcon.style.color = '#fbbf24';
        PanicService.vibrate(40);
      }, 2000);

      const t3 = setTimeout(() => {
        // Fase 4 (3000ms)
        badge3.textContent = '✓ OK';
        badge3.style.color = '#34d399';
        step4.style.opacity = '1';
        step4.style.borderColor = 'rgba(52, 211, 153, 0.4)';
        badge4.textContent = 'In corso...';
        badge4.style.color = '#34d399';
        progressBar.style.width = '90%';
        mainIcon.textContent = 'verified_user';
        mainIcon.style.color = '#34d399';
        PanicService.vibrate([40, 30, 40]);
      }, 3000);

      // Cleanup timers e overlay
      const cleanUp = () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(timeoutHandle);
      };

      const removeOverlay = () => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 350);
      };

      // 2. Timer di sicurezza (Timeout massimo)
      let timedOut = false;
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        cleanUp();
        PanicService.vibrate([200, 100, 200]); // Vibrazione di errore prolungata
        removeOverlay();
        reject(new Error('Timeout durante la connessione con Pi-hole o il Vault. Il sigillo è stato annullato per sicurezza. Verifica che la rete sia attiva e riprova.'));
      }, maxTimeoutMs);

      // 3. Esegui il task effettivo in parallelo con un timer di durata minima (3 sec)
      const minDurationPromise = new Promise(r => setTimeout(r, minDurationMs));
      const taskPromise = Promise.resolve().then(() => asyncTaskFn());

      Promise.all([taskPromise, minDurationPromise])
        .then(([taskResult]) => {
          if (timedOut) return;
          cleanUp();

          // Stato finale completato con successo
          progressBar.style.width = '100%';
          badge4.textContent = '✓ SIGILLATO';
          badge4.style.color = '#34d399';
          headline.textContent = 'SFIDA SIGILLATA!';
          headline.style.color = '#34d399';
          mainIcon.textContent = 'lock';
          mainIcon.style.color = '#34d399';
          mainIcon.style.transform = 'scale(1.25)';

          // Vibrazione di vittoria/completamento (no suoni)
          PanicService.vibrate([150, 80, 250]);

          // Pausa di 800ms per mostrare l'esito vittorioso prima di rimuovere l'overlay
          setTimeout(() => {
            removeOverlay();
            resolve(taskResult);
          }, 800);
        })
        .catch((err) => {
          if (timedOut) return;
          cleanUp();
          PanicService.vibrate([200, 100, 200]); // Vibrazione di errore
          removeOverlay();
          reject(err || new Error('Errore imprevisto durante il sigillo della sfida. Operazione annullata.'));
        });
    });
  }
}
