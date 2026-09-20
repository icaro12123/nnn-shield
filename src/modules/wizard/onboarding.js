// ==========================================================================
// ONBOARDING SETUP WIZARD (FASE 1: GUIDA INIZIALE A 6 PASSI SNELLITA)
// ==========================================================================

import { AndroidSetupGuide } from '../android/setup.js';
import { PiHoleService } from '../pihole/pihole.js';
import { TimeVault } from '../vault/vault.js';
import { BlockerTester } from '../tester/tester.js';
import { ChallengeTracker } from '../tracker/tracker.js';
import { PanicService } from '../panic/panic.js';

export class OnboardingWizard {
  constructor(containerEl, onCompleteCallback) {
    this.container = containerEl;
    this.onComplete = onCompleteCallback;
    this.currentStep = 1;
    this.totalSteps = 6;

    // Wizard collected state
    this.state = {
      challengeDays: 30,
      selectedDnsHost: 'adult-filter-dns.cleanbrowsing.org',
      hasPiHole: false,
      piholeMode: 'api', // 'api' or 'manual'
      piholeConnected: false,
      piholeAutoChangePass: true,
      appLockerPin: '',
      pinGenerationCount: 0,
      canaryTested: false,
      canaryPassed: false
    };

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="md-card md-card-highlight glow-primary" style="margin-bottom: 16px;">
        <!-- Stepper Progress Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <span class="label-large" style="color: #c084fc; font-size: 12px; letter-spacing: 0.5px;">
            CONFIGURAZIONE GUIDATA • PASSO ${this.currentStep} DI ${this.totalSteps}
          </span>
          <span class="body-small" style="opacity: 0.8; font-weight: 600;">
            ${Math.round((this.currentStep / this.totalSteps) * 100)}%
          </span>
        </div>

        <!-- Linear Progress Bar -->
        <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.08); border-radius: 6px; overflow: hidden; margin-bottom: 20px;">
          <div style="width: ${(this.currentStep / this.totalSteps) * 100}%; height: 100%; background: linear-gradient(90deg, #7c3aed, #c084fc); border-radius: 6px; transition: width 0.4s ease;"></div>
        </div>

        <!-- Dynamic Step Content -->
        <div id="wizard-step-content">
          ${this.getStepHtml(this.currentStep)}
        </div>

        <!-- Stepper Action Buttons -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 24px; gap: 12px;">
          ${this.currentStep > 1 ? `
            <button id="btn-wizard-prev" class="md-btn md-btn-tonal" style="flex: 1;">
              <span class="material-symbols-rounded">arrow_back</span> Indietro
            </button>
          ` : '<div style="flex: 1;"></div>'}

          ${this.currentStep < this.totalSteps ? `
            <button id="btn-wizard-next" class="md-btn md-btn-primary" style="flex: 1.2;">
              Avanti <span class="material-symbols-rounded">arrow_forward</span>
            </button>
          ` : `
            <button id="btn-wizard-finish" class="md-btn md-btn-danger glow-error" style="flex: 1.5; font-size: 13px; font-weight: 700;">
              <span class="material-symbols-rounded">lock</span> SIGILLA E AVVIA SFIDA
            </button>
          `}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  getStepHtml(step) {
    switch (step) {
      case 1:
        return `
          <div style="text-align: center; margin-bottom: 12px;">
            <span class="material-symbols-rounded text-glow" style="color: #c084fc; font-size: 42px; margin-bottom: 4px;">flag</span>
            <h2 class="title-large" style="margin-bottom: 6px;">Durata della Sfida</h2>
            <p class="body-medium">Seleziona la durata del tuo impegno. L'applicazione imposterà tutte le difese per questo periodo.</p>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 16px;">
            <label class="glass-panel" style="display: flex; align-items: center; justify-content: space-between; padding: 14px; border-radius: 14px; cursor: pointer;">
              <div>
                <span class="label-large" style="color: #ffffff;">No Nut November Completo</span>
                <p class="body-small">30 Giorni di disciplina e reset neurale totale.</p>
              </div>
              <input type="radio" name="wiz-duration" value="30" ${this.state.challengeDays === 30 ? 'checked' : ''} style="accent-color: #a855f7; transform: scale(1.3);" />
            </label>

            <label class="glass-panel" style="display: flex; align-items: center; justify-content: space-between; padding: 14px; border-radius: 14px; cursor: pointer;">
              <div>
                <span class="label-large" style="color: #ffffff;">Due Settimane Hardcore</span>
                <p class="body-small">14 Giorni per superare il picco d'abitudine.</p>
              </div>
              <input type="radio" name="wiz-duration" value="14" ${this.state.challengeDays === 14 ? 'checked' : ''} style="accent-color: #a855f7; transform: scale(1.3);" />
            </label>

            <label class="glass-panel" style="display: flex; align-items: center; justify-content: space-between; padding: 14px; border-radius: 14px; cursor: pointer;">
              <div>
                <span class="label-large" style="color: #ffffff;">Reset Dopamina Iniziale</span>
                <p class="body-small">7 Giorni per ritrovare concentrazione e lucidità.</p>
              </div>
              <input type="radio" name="wiz-duration" value="7" ${this.state.challengeDays === 7 ? 'checked' : ''} style="accent-color: #a855f7; transform: scale(1.3);" />
            </label>
          </div>
        `;

      case 2:
        return `
          <div style="text-align: center; margin-bottom: 12px;">
            <span class="material-symbols-rounded text-glow" style="color: #c084fc; font-size: 42px; margin-bottom: 4px;">android</span>
            <h2 class="title-large" style="margin-bottom: 6px;">DNS Privato Android (DoT)</h2>
            <p class="body-medium">Difesa primaria: blocca ogni sito NSFW sia su Wi-Fi che in 4G/5G a livello di sistema operativo.</p>
          </div>

          <div class="md-input-group" style="margin-top: 14px;">
            <label class="md-label">Seleziona Provider Anti-NSFW</label>
            <select id="wiz-dns-select" class="md-input">
              <option value="adult-filter-dns.cleanbrowsing.org" ${this.state.selectedDnsHost === 'adult-filter-dns.cleanbrowsing.org' ? 'selected' : ''}>CleanBrowsing Adult Filter (Consigliato - SafeSearch forzato)</option>
              <option value="family.cloudflare-dns.com" ${this.state.selectedDnsHost === 'family.cloudflare-dns.com' ? 'selected' : ''}>Cloudflare 1.1.1.3 Family (Massima velocità)</option>
              <option value="family.adguard-dns.com" ${this.state.selectedDnsHost === 'family.adguard-dns.com' ? 'selected' : ''}>AdGuard Family Protection (Blocco annunci + Adult)</option>
            </select>
          </div>

          <div class="glass-panel" style="padding: 12px; border-radius: 12px; margin-bottom: 14px;">
            <span class="body-small">Indirizzo DoT da copiare:</span>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px;">
              <code id="wiz-host-preview" style="font-family: var(--md-sys-font-mono); color: #34d399; font-size: 12px;">${this.state.selectedDnsHost}</code>
              <button id="wiz-btn-copy-host" class="md-btn md-btn-tonal" style="padding: 4px 10px; font-size: 11px;">
                Copia
              </button>
            </div>
          </div>

          <button id="wiz-btn-open-settings" class="md-btn md-btn-primary md-btn-full" style="margin-bottom: 10px;">
            <span class="material-symbols-rounded">settings</span> Apri Impostazioni Rete Android
          </button>
          <p class="body-small" style="font-size: 11px; opacity: 0.8; text-align: center;">
            Impostazioni > Rete e Internet > DNS Privato > Nome host provider > Incolla e Salva.
          </p>
        `;

      case 3:
        return `
          <div style="text-align: center; margin-bottom: 12px;">
            <span class="material-symbols-rounded text-glow" style="color: #c084fc; font-size: 42px; margin-bottom: 4px;">dns</span>
            <h2 class="title-large" style="margin-bottom: 6px;">Protezione Rete Domestica (Pi-hole)</h2>
            <p class="body-medium">Hai un'istanza Pi-hole attiva sulla tua rete Wi-Fi di casa?</p>
          </div>

          <div style="display: flex; gap: 10px; margin-bottom: 16px;">
            <button id="wiz-pihole-yes-btn" class="md-btn ${this.state.hasPiHole ? 'md-btn-primary' : 'md-btn-tonal'}" style="flex: 1;">
              <span class="material-symbols-rounded">check</span> Sì, ho Pi-hole
            </button>
            <button id="wiz-pihole-no-btn" class="md-btn ${!this.state.hasPiHole ? 'md-btn-primary' : 'md-btn-tonal'}" style="flex: 1;">
              <span class="material-symbols-rounded">close</span> No, solo Android
            </button>
          </div>

          <div id="wiz-pihole-config-area" style="${this.state.hasPiHole ? 'display: block;' : 'display: none;'}">
            <div style="display: flex; gap: 6px; margin-bottom: 12px; background: rgba(0,0,0,0.3); padding: 4px; border-radius: 10px;">
              <button id="wiz-pi-mode-api" class="md-btn ${this.state.piholeMode === 'api' ? 'md-btn-primary' : 'md-btn-tonal'}" style="flex: 1; padding: 6px; font-size: 11px;">
                REST API v6
              </button>
              <button id="wiz-pi-mode-manual" class="md-btn ${this.state.piholeMode === 'manual' ? 'md-btn-primary' : 'md-btn-tonal'}" style="flex: 1; padding: 6px; font-size: 11px;">
                Liste Manuali
              </button>
            </div>

            <!-- API View -->
            <div id="wiz-pi-api-view" style="${this.state.piholeMode === 'api' ? 'display: block;' : 'display: none;'}">
              <div class="md-input-group" style="margin-bottom: 8px;">
                <label class="md-label">Indirizzo IP locale Pi-hole</label>
                <input id="wiz-pi-ip" type="text" class="md-input" value="192.168.1.100" style="padding: 8px 12px;" />
              </div>
              <div class="md-input-group" style="margin-bottom: 8px;">
                <label class="md-label">Password Attuale Pi-hole</label>
                <input id="wiz-pi-pass" type="password" class="md-input" placeholder="Password admin attuale" style="padding: 8px 12px;" />
              </div>

              <button id="wiz-btn-connect-pi" class="md-btn md-btn-primary md-btn-full" style="padding: 10px; margin-bottom: 10px;">
                <span class="material-symbols-rounded">sync</span> Connetti & Verifica Pi-hole v6
              </button>

              <div id="wiz-pi-status" class="glass-panel" style="display: ${this.state.piholeConnected ? 'block' : 'none'}; padding: 10px; border-radius: 10px; font-size: 12px; margin-bottom: 12px;">
                ${this.state.piholeConnected ? '<span style="color: #34d399; font-weight: 600;">✓ Connesso e verificato con successo a Pi-hole v6!</span>' : ''}
              </div>

              <!-- Option visible ONLY when connected -->
              <div id="wiz-pi-lock-option-box" class="glass-panel glow-primary" style="display: ${this.state.piholeConnected ? 'block' : 'none'}; padding: 14px; border-radius: 14px; border-color: rgba(168, 85, 247, 0.4);">
                <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer;">
                  <input id="wiz-pi-auto-lock-cb" type="checkbox" ${this.state.piholeAutoChangePass ? 'checked' : ''} style="accent-color: #a855f7; transform: scale(1.3); margin-top: 3px;" />
                  <div>
                    <span class="label-large" style="color: #ffffff;">Cambia automaticamente la password del Pi-hole e sigillala nel Vault</span>
                    <p class="body-small" style="margin-top: 4px; color: #cac1df;">
                      All'avvio della sfida, l'app genererà una password casuale a 32 caratteri, la imposterà sul server Pi-hole v6 reale e la nasconderà nella Cassaforte Temporale.
                    </p>
                  </div>
                </label>
                <div class="md-chip md-chip-warning" style="margin-top: 10px; width: 100%; justify-content: flex-start; font-size: 11px;">
                  <span class="material-symbols-rounded" style="font-size: 16px;">warning</span>
                  Avviso: verrai disconnesso dall'admin di Pi-hole fino al termine della sfida!
                </div>
              </div>
            </div>

            <!-- Manual View -->
            <div id="wiz-pi-manual-view" style="${this.state.piholeMode === 'manual' ? 'display: block;' : 'display: none;'}">
              <p class="body-small" style="margin-bottom: 8px;">Copia questo URL e incollalo in <strong>Pi-hole > Adlists</strong>:</p>
              <div class="glass-panel" style="padding: 10px; border-radius: 10px; margin-bottom: 8px; font-size: 11px;">
                <code style="word-break: break-all; color: #c084fc;">https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews-gambling-porn/hosts</code>
                <button id="wiz-btn-copy-adlist" class="md-btn md-btn-tonal md-btn-full" style="margin-top: 8px; padding: 6px; font-size: 11px;">
                  Copia URL Adlist NSFW
                </button>
              </div>
            </div>
          </div>
        `;

      case 4:
        return `
          <div style="text-align: center; margin-bottom: 12px;">
            <span class="material-symbols-rounded text-glow" style="color: #f87171; font-size: 42px; margin-bottom: 4px;">lock</span>
            <h2 class="title-large" style="margin-bottom: 6px;">[OPZIONALE] Blocco Impostazioni Android</h2>
            <p class="body-medium">Per impedire a te stesso di andare in "Impostazioni" e disattivare il DNS Privato durante un momento di debolezza.</p>
          </div>

          <div class="glass-panel" style="padding: 14px; border-radius: 14px; margin-bottom: 14px;">
            <h4 class="title-medium" style="color: #c084fc; margin-bottom: 6px; font-size: 14px;">Guida rapida:</h4>
            <ol class="body-small" style="padding-left: 18px; display: flex; flex-direction: column; gap: 6px;">
              <li>Installa un'app gratuita come <strong>AppBlock</strong> o <strong>StayFree</strong> dal Play Store.</li>
              <li>Imposta il blocco sull'applicazione <strong>"Impostazioni"</strong> di Android proteggendola con un PIN.</li>
              <li>Genera il PIN qui sotto, impostalo subito nell'app di blocco, e clicca Avanti: il PIN verrà sigillato nel Vault e dimenticato!</li>
            </ol>
          </div>

          <div class="glass-panel" style="padding: 14px; border-radius: 14px; text-align: center; margin-bottom: 14px;">
            <span class="body-small">PIN di Blocco Generato:</span>
            <div id="wiz-pin-display" class="text-glow" style="font-family: var(--md-sys-font-mono); font-size: 32px; font-weight: 800; color: #38bdf8; margin: 8px 0; letter-spacing: 4px;">
              ${this.state.appLockerPin || '••••••'}
            </div>

            <div style="display: flex; gap: 8px; justify-content: center; margin-top: 8px;">
              <button id="wiz-btn-generate-pin" class="md-btn md-btn-tonal" style="padding: 8px 14px; font-size: 12px;">
                <span class="material-symbols-rounded" style="font-size: 16px;">autorenew</span> Genera PIN Casuale
              </button>
              ${this.state.appLockerPin ? `
                <button id="wiz-btn-copy-pin" class="md-btn md-btn-tonal" style="padding: 8px 14px; font-size: 12px;">
                  <span class="material-symbols-rounded" style="font-size: 16px;">content_copy</span> Copia PIN
                </button>
              ` : ''}
            </div>

            ${this.state.pinGenerationCount > 1 ? `
              <p class="body-small" style="color: #fbbf24; margin-top: 10px; font-size: 11px;">
                ⚠️ Nota: hai rigenerato il PIN. Assicurati di impostare su AppBlock questo <strong>ULTIMO</strong> PIN (${this.state.appLockerPin}), perché sarà l'unico sigillato nel Vault!
              </p>
            ` : ''}
          </div>

          <div class="glass-panel glow-error" style="border-color: rgba(239, 68, 68, 0.4); padding: 12px; border-radius: 12px;">
            <div style="display: flex; gap: 8px; align-items: flex-start;">
              <span class="material-symbols-rounded" style="color: #ef4444; font-size: 20px;">lock_clock</span>
              <p class="body-small" style="color: #fca5a5;">
                <strong>Avviso:</strong> Imposta questo PIN nell'app di blocco prima di procedere. Cliccando "Avanti", il PIN verrà inserito automaticamente nella Cassaforte Temporale e non avrai più accesso alle Impostazioni Android fino alla fine della sfida!
              </p>
            </div>
          </div>
        `;

      case 5:
        return `
          <div style="text-align: center; margin-bottom: 12px;">
            <span class="material-symbols-rounded text-glow" style="color: #38bdf8; font-size: 42px; margin-bottom: 4px;">radar</span>
            <h2 class="title-large" style="margin-bottom: 6px;">Test Canarino di Verifica Live</h2>
            <p class="body-medium">Verifica obbligatoria: accertiamoci che il blocco DNS stia filtrando i domini vietati prima di sigillare l'inizio della sfida.</p>
          </div>

          <button id="wiz-btn-run-canary" class="md-btn md-btn-primary md-btn-full" style="margin-bottom: 14px; padding: 12px;">
            <span class="material-symbols-rounded">play_arrow</span> ${this.state.canaryTested ? 'Riesegui Test Canarino' : 'Esegui Test Canarino Adesso'}
          </button>

          <div id="wiz-canary-loading" style="display: none; text-align: center; margin: 12px 0;">
            <div class="pulse-bloom" style="width: 32px; height: 32px; border-radius: 50%; border: 3px solid #c084fc; margin: 0 auto;"></div>
            <span class="body-small" style="display: block; margin-top: 6px;">Test sonde canarino in corso...</span>
          </div>

          <div id="wiz-canary-results" class="glass-panel" style="display: ${this.state.canaryTested ? 'block' : 'none'}; padding: 14px; border-radius: 14px; border-color: ${this.state.canaryPassed ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'};">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span class="title-medium" style="font-size: 13px;">Esito Sonde Canarino:</span>
              <span id="wiz-canary-badge" class="md-chip ${this.state.canaryPassed ? 'md-chip-success' : 'md-chip-error'}">
                ${this.state.canaryPassed ? 'PROTETTO 100% ✓' : 'FUGA RILEVATA ✗'}
              </span>
            </div>
            <p id="wiz-canary-summary" class="body-small">
              ${this.state.canaryPassed 
                ? 'Tutti i domini vietati sono bloccati correttamente. Il tuo ambiente è sicuro.' 
                : 'Attenzione: alcuni domini per adulti rispondono ancora. Controlla il DNS Privato al Passo 2 e riesegui il test.'}
            </p>
          </div>

          ${!this.state.canaryPassed ? `
            <div class="md-chip md-chip-warning" style="margin-top: 14px; width: 100%; justify-content: center; font-size: 11px;">
              <span class="material-symbols-rounded">lock</span> Il test canarino deve essere superato per poter avanzare!
            </div>
          ` : ''}
        `;

      case 6:
        return `
          <div style="text-align: center; margin-bottom: 14px;">
            <span class="material-symbols-rounded text-glow" style="color: #ef4444; font-size: 48px; margin-bottom: 4px;">gavel</span>
            <h2 class="title-large" style="color: #f87171; margin-bottom: 6px;">Patto di Non Ritorno & Sigillo</h2>
            <p class="body-medium">
              Stai per iniziare ufficialmente il tuo percorso di <strong>${this.state.challengeDays} giorni</strong>.
            </p>
          </div>

          <!-- Summary of Sealed Items -->
          <div class="glass-panel" style="padding: 14px; border-radius: 14px; margin-bottom: 14px;">
            <h4 class="title-medium" style="margin-bottom: 10px; font-size: 13px; color: #c084fc;">Riepilogo Protezioni nel Vault:</h4>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                <span>DNS Privato Android:</span>
                <span style="color: #34d399; font-weight: 600;">Verificato ✓</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                <span>Password Pi-hole v6:</span>
                <span style="color: ${this.state.hasPiHole && this.state.piholeConnected && this.state.piholeAutoChangePass ? '#34d399' : '#cac1df'};">
                  ${this.state.hasPiHole && this.state.piholeConnected && this.state.piholeAutoChangePass ? 'Cambio & Sigillo attivo ✓' : 'Non configurato'}
                </span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                <span>PIN App-Locker:</span>
                <span style="color: ${this.state.appLockerPin ? '#34d399' : '#cac1df'};">
                  ${this.state.appLockerPin ? 'Sigillato nel Vault ✓' : 'Nessuno'}
                </span>
              </div>
            </div>
          </div>

          <div class="glass-panel glow-error" style="padding: 14px; border-radius: 14px; margin-bottom: 14px; border-color: rgba(239, 68, 68, 0.4);">
            <h4 class="title-medium" style="color: #f87171; margin-bottom: 6px; font-size: 13px;">Regole Inviolabili:</h4>
            <ul class="body-small" style="padding-left: 18px; display: flex; flex-direction: column; gap: 6px;">
              <li><strong>Sentinella Anti-Cheat</strong>: tentare di disattivare il DNS aggiunge automaticamente <strong>+24 ore di penalità</strong> alla cassaforte.</li>
              <li><strong>Nessun Annullamento</strong>: il Panic Button aiuta solo a superare le crisi, non disattiva nulla.</li>
              <li><strong>Resistenza Totale</strong>: disinstallare l'app distrugge per sempre la chiave e la password sigillata.</li>
            </ul>
          </div>

          <p class="body-small" style="text-align: center; opacity: 0.9;">
            Premi il pulsante qui sotto per sigillare il patto e accedere alla Dashboard principale della sfida.
          </p>
        `;

      default:
        return '';
    }
  }

  bindEvents() {
    const btnPrev = document.getElementById('btn-wizard-prev');
    const btnNext = document.getElementById('btn-wizard-next');
    const btnFinish = document.getElementById('btn-wizard-finish');

    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        if (this.currentStep > 1) {
          this.currentStep--;
          this.render();
        }
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', () => {
        // Step Validation Gate
        if (this.validateStep(this.currentStep)) {
          this.currentStep++;
          this.render();
        }
      });
    }

    if (btnFinish) {
      btnFinish.addEventListener('click', () => {
        this.finishWizard();
      });
    }

    // Step 1 Event Listeners
    if (this.currentStep === 1) {
      const radios = document.querySelectorAll('input[name="wiz-duration"]');
      radios.forEach(r => {
        r.addEventListener('change', () => {
          this.state.challengeDays = parseInt(r.value, 10);
        });
      });
    }

    // Step 2 Event Listeners
    if (this.currentStep === 2) {
      const select = document.getElementById('wiz-dns-select');
      const preview = document.getElementById('wiz-host-preview');
      const btnCopy = document.getElementById('wiz-btn-copy-host');
      const btnSettings = document.getElementById('wiz-btn-open-settings');

      select.value = this.state.selectedDnsHost;
      select.addEventListener('change', () => {
        this.state.selectedDnsHost = select.value;
        preview.textContent = select.value;
      });

      btnCopy.addEventListener('click', () => {
        navigator.clipboard.writeText(select.value).then(() => {
          btnCopy.textContent = 'Copiato!';
          setTimeout(() => btnCopy.textContent = 'Copia', 1500);
        });
      });

      btnSettings.addEventListener('click', () => {
        AndroidSetupGuide.openAndroidNetworkSettings();
      });
    }

    // Step 3 Event Listeners (Pi-hole)
    if (this.currentStep === 3) {
      const btnYes = document.getElementById('wiz-pihole-yes-btn');
      const btnNo = document.getElementById('wiz-pihole-no-btn');
      const configArea = document.getElementById('wiz-pihole-config-area');
      const btnModeApi = document.getElementById('wiz-pi-mode-api');
      const btnModeManual = document.getElementById('wiz-pi-mode-manual');
      const apiView = document.getElementById('wiz-pi-api-view');
      const manualView = document.getElementById('wiz-pi-manual-view');
      const btnConnect = document.getElementById('wiz-btn-connect-pi');
      const statusBox = document.getElementById('wiz-pi-status');
      const lockOptionBox = document.getElementById('wiz-pi-lock-option-box');
      const autoLockCb = document.getElementById('wiz-pi-auto-lock-cb');

      btnYes.addEventListener('click', () => {
        this.state.hasPiHole = true;
        btnYes.className = 'md-btn md-btn-primary';
        btnNo.className = 'md-btn md-btn-tonal';
        configArea.style.display = 'block';
      });

      btnNo.addEventListener('click', () => {
        this.state.hasPiHole = false;
        this.state.piholeConnected = false;
        btnNo.className = 'md-btn md-btn-primary';
        btnYes.className = 'md-btn md-btn-tonal';
        configArea.style.display = 'none';
      });

      btnModeApi.addEventListener('click', () => {
        this.state.piholeMode = 'api';
        btnModeApi.className = 'md-btn md-btn-primary';
        btnModeManual.className = 'md-btn md-btn-tonal';
        apiView.style.display = 'block';
        manualView.style.display = 'none';
      });

      btnModeManual.addEventListener('click', () => {
        this.state.piholeMode = 'manual';
        btnModeManual.className = 'md-btn md-btn-primary';
        btnModeApi.className = 'md-btn md-btn-tonal';
        manualView.style.display = 'block';
        apiView.style.display = 'none';
      });

      btnConnect.addEventListener('click', async () => {
        const ip = document.getElementById('wiz-pi-ip').value.trim();
        const pass = document.getElementById('wiz-pi-pass').value;

        if (!ip || !pass) {
          alert('Inserisci sia l\'indirizzo IP che la password attuale del tuo Pi-hole.');
          return;
        }

        statusBox.style.display = 'block';
        statusBox.textContent = 'Connessione e verifica credenziali su Pi-hole v6...';
        btnConnect.disabled = true;

        const res = await PiHoleService.authenticate(ip, 80, pass);
        btnConnect.disabled = false;

        if (res.success) {
          this.state.piholeConnected = true;
          await PiHoleService.injectNsfwAdlists().catch(() => {});
          statusBox.innerHTML = '<span style="color: #34d399; font-weight: 600;">✓ Connesso e verificato con successo a Pi-hole v6!</span>';
          if (lockOptionBox) lockOptionBox.style.display = 'block';
          PanicService.playTone(660, 0.4);
        } else {
          this.state.piholeConnected = false;
          statusBox.innerHTML = `<span style="color: #f87171; font-weight: 600;">✗ Connessione fallita: ${res.error}</span>`;
          if (lockOptionBox) lockOptionBox.style.display = 'none';
        }
      });

      if (autoLockCb) {
        autoLockCb.addEventListener('change', () => {
          this.state.piholeAutoChangePass = autoLockCb.checked;
        });
      }

      const btnCopyAdlist = document.getElementById('wiz-btn-copy-adlist');
      if (btnCopyAdlist) {
        btnCopyAdlist.addEventListener('click', () => {
          navigator.clipboard.writeText('https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews-gambling-porn/hosts').then(() => {
            btnCopyAdlist.textContent = 'URL Copiato!';
            setTimeout(() => btnCopyAdlist.textContent = 'Copia URL Adlist NSFW', 1500);
          });
        });
      }
    }

    // Step 4 Event Listeners (App-Locker)
    if (this.currentStep === 4) {
      const pinDisplay = document.getElementById('wiz-pin-display');
      const btnGen = document.getElementById('wiz-btn-generate-pin');
      const btnCopy = document.getElementById('wiz-btn-copy-pin');

      btnGen.addEventListener('click', () => {
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        this.state.appLockerPin = pin;
        this.state.pinGenerationCount++;
        this.render(); // Re-render to show Copy button and alert if regenerated
        PanicService.playTone(520, 0.2);
      });

      if (btnCopy) {
        btnCopy.addEventListener('click', () => {
          navigator.clipboard.writeText(this.state.appLockerPin).then(() => {
            btnCopy.textContent = 'Copiato!';
            setTimeout(() => btnCopy.innerHTML = '<span class="material-symbols-rounded" style="font-size: 16px;">content_copy</span> Copia PIN', 1500);
          });
        });
      }
    }

    // Step 5 Event Listeners (Test Canarino)
    if (this.currentStep === 5) {
      const btnRun = document.getElementById('wiz-btn-run-canary');
      const loading = document.getElementById('wiz-canary-loading');
      const resBox = document.getElementById('wiz-canary-results');
      const badge = document.getElementById('wiz-canary-badge');
      const summary = document.getElementById('wiz-canary-summary');

      btnRun.addEventListener('click', async () => {
        btnRun.disabled = true;
        loading.style.display = 'block';
        resBox.style.display = 'none';

        const diag = await BlockerTester.runFullDiagnostic();
        this.state.canaryTested = true;
        this.state.canaryPassed = diag.isSecure;

        loading.style.display = 'none';
        btnRun.disabled = false;
        this.render(); // Re-render step 5 to update badge and unblock Next button
      });
    }
  }

  // Strict Validation for Stepper
  validateStep(step) {
    if (step === 3) {
      if (this.state.hasPiHole && this.state.piholeMode === 'api') {
        if (!this.state.piholeConnected) {
          alert('Attenzione: hai selezionato Pi-hole con REST API v6. Devi inserire IP e Password e cliccare "Connetti & Verifica" prima di poter andare avanti.\n\nSe non vuoi usare le API, seleziona "Liste Manuali" o "No, solo Android".');
          return false;
        }
      }
    }

    if (step === 5) {
      if (!this.state.canaryTested) {
        alert('Devi eseguire il Test Canarino prima di poter procedere al patto finale.');
        return false;
      }
      if (!this.state.canaryPassed) {
        alert('Il Test Canarino è fallito: sono state rilevate fughe DNS e alcuni siti per adulti sono ancora raggiungibili.\n\nAssicurati di aver impostato il DNS Privato Android (Passo 2) e riesegui il test fino al superamento per poter iniziare la sfida.');
        return false;
      }
    }

    return true;
  }

  async finishWizard() {
    const btnFinish = document.getElementById('btn-wizard-finish');
    if (btnFinish) {
      btnFinish.disabled = true;
      btnFinish.textContent = 'Sigillo crittografico in corso...';
    }

    const targetMs = Date.now() + (this.state.challengeDays * 24 * 60 * 60 * 1000);
    const secretsPayload = {};

    // 1. If Pi-hole auto-change pass is active, execute real API call
    if (this.state.hasPiHole && this.state.piholeConnected && this.state.piholeAutoChangePass) {
      try {
        const piRes = await PiHoleService.lockPiHolePassword(targetMs);
        if (piRes && piRes.success) {
          secretsPayload.piholePassword = '[Cambiata e protetta sul server Pi-hole]';
        }
      } catch (err) {
        alert('Attenzione durante il cambio password Pi-hole: ' + err.message);
      }
    }

    // 2. If App-Locker PIN was generated, include in Vault payload
    if (this.state.appLockerPin) {
      secretsPayload.appLockerPin = this.state.appLockerPin;
    }

    // 3. Seal the payload in TimeVault
    if (Object.keys(secretsPayload).length > 0) {
      await TimeVault.lockSecret(secretsPayload, targetMs, 'Segreti NNN Shield');
    } else if (!TimeVault.isLocked()) {
      // Default commitment seal
      await TimeVault.lockSecret('NNN_COMMITTED_TOKEN', targetMs, 'Patto di Disciplina NNN');
    }

    // 4. Start Challenge in Tracker
    ChallengeTracker.startChallenge(this.state.challengeDays);

    // 5. Play victory initiation tone and vibrate
    PanicService.playTone(880, 0.7);
    PanicService.vibrate([150, 100, 250]);

    // Save wizard completed flag
    localStorage.setItem('nnn_onboarding_completed', 'true');

    if (this.onComplete) {
      this.onComplete();
    }
  }
}
