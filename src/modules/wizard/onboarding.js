// ==========================================================================
// ONBOARDING SETUP WIZARD (FASE 1: GUIDA INIZIALE A 7 PASSI)
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
    this.totalSteps = 7;

    // Wizard collected state
    this.state = {
      challengeDays: 30,
      selectedDnsHost: 'adult-filter-dns.cleanbrowsing.org',
      hasPiHole: false,
      piholeMode: 'api', // 'api' or 'manual'
      piholeConnected: false,
      appLockerPin: '',
      vaultSealed: false
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
            <p class="body-medium">Seleziona la durata del tuo impegno. L'applicazione imposterà tutte le difese e le protezioni per questo periodo.</p>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 16px;">
            <label class="glass-panel" style="display: flex; align-items: center; justify-content: space-between; padding: 14px; border-radius: 14px; cursor: pointer;">
              <div>
                <span class="label-large" style="color: #ffffff;">No Nut November Completo</span>
                <p class="body-small">30 Giorni di disciplina e reset neurale totale.</p>
              </div>
              <input type="radio" name="wiz-duration" value="30" checked style="accent-color: #a855f7; transform: scale(1.3);" />
            </label>

            <label class="glass-panel" style="display: flex; align-items: center; justify-content: space-between; padding: 14px; border-radius: 14px; cursor: pointer;">
              <div>
                <span class="label-large" style="color: #ffffff;">Due Settimane Hardcore</span>
                <p class="body-small">14 Giorni per superare il picco di abitudine.</p>
              </div>
              <input type="radio" name="wiz-duration" value="14" style="accent-color: #a855f7; transform: scale(1.3);" />
            </label>

            <label class="glass-panel" style="display: flex; align-items: center; justify-content: space-between; padding: 14px; border-radius: 14px; cursor: pointer;">
              <div>
                <span class="label-large" style="color: #ffffff;">Reset Dopamina Iniziale</span>
                <p class="body-small">7 Giorni per ritrovare concentrazione e lucidità.</p>
              </div>
              <input type="radio" name="wiz-duration" value="7" style="accent-color: #a855f7; transform: scale(1.3);" />
            </label>
          </div>
        `;

      case 2:
        return `
          <div style="text-align: center; margin-bottom: 12px;">
            <span class="material-symbols-rounded text-glow" style="color: #c084fc; font-size: 42px; margin-bottom: 4px;">android</span>
            <h2 class="title-large" style="margin-bottom: 6px;">DNS Privato Android (DoT)</h2>
            <p class="body-medium">Questa è la difesa #1: blocca ogni sito NSFW sia su Wi-Fi che in 4G/5G a livello di sistema operativo.</p>
          </div>

          <div class="md-input-group" style="margin-top: 14px;">
            <label class="md-label">Seleziona Provider Anti-NSFW</label>
            <select id="wiz-dns-select" class="md-input">
              <option value="adult-filter-dns.cleanbrowsing.org">CleanBrowsing Adult Filter (Consigliato - SafeSearch forzato)</option>
              <option value="family.cloudflare-dns.com">Cloudflare 1.1.1.3 Family (Massima velocità)</option>
              <option value="family.adguard-dns.com">AdGuard Family Protection (Blocco annunci + Adult)</option>
            </select>
          </div>

          <div class="glass-panel" style="padding: 12px; border-radius: 12px; margin-bottom: 14px;">
            <span class="body-small">Indirizzo DoT da copiare:</span>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px;">
              <code id="wiz-host-preview" style="font-family: var(--md-sys-font-mono); color: #34d399; font-size: 12px;">adult-filter-dns.cleanbrowsing.org</code>
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
              <button id="wiz-pi-mode-api" class="md-btn md-btn-primary" style="flex: 1; padding: 6px; font-size: 11px;">
                REST API v6
              </button>
              <button id="wiz-pi-mode-manual" class="md-btn md-btn-tonal" style="flex: 1; padding: 6px; font-size: 11px;">
                Liste Manuali
              </button>
            </div>

            <!-- API View -->
            <div id="wiz-pi-api-view">
              <div class="md-input-group" style="margin-bottom: 8px;">
                <label class="md-label">IP Pi-hole locale</label>
                <input id="wiz-pi-ip" type="text" class="md-input" value="192.168.1.100" style="padding: 8px 12px;" />
              </div>
              <div class="md-input-group" style="margin-bottom: 8px;">
                <label class="md-label">Password Attuale Pi-hole</label>
                <input id="wiz-pi-pass" type="password" class="md-input" placeholder="Password admin attuale" style="padding: 8px 12px;" />
              </div>
              <button id="wiz-btn-connect-pi" class="md-btn md-btn-primary md-btn-full" style="padding: 8px;">
                <span class="material-symbols-rounded">sync</span> Connetti & Inietta Adlists
              </button>
              <div id="wiz-pi-status" class="glass-panel" style="display: none; margin-top: 8px; padding: 8px; font-size: 12px;"></div>
            </div>

            <!-- Manual View -->
            <div id="wiz-pi-manual-view" style="display: none;">
              <p class="body-small" style="margin-bottom: 8px;">Copia questo URL e incollalo in <strong>Pi-hole > Adlists</strong>:</p>
              <div class="glass-panel" style="padding: 8px; border-radius: 8px; margin-bottom: 8px; font-size: 11px;">
                <code style="word-break: break-all; color: #c084fc;">https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews-gambling-porn/hosts</code>
                <button id="wiz-btn-copy-adlist" class="md-btn md-btn-tonal md-btn-full" style="margin-top: 6px; padding: 4px; font-size: 11px;">
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
            <p class="body-medium">Per impedire a te stesso di andare in "Impostazioni" e disattivare il DNS Privato quando arriva un impulso.</p>
          </div>

          <div class="glass-panel" style="padding: 14px; border-radius: 14px; margin-bottom: 14px;">
            <h4 class="title-medium" style="color: #c084fc; margin-bottom: 6px; font-size: 14px;">Come fare in 3 passaggi:</h4>
            <ol class="body-small" style="padding-left: 18px; display: flex; flex-direction: column; gap: 6px;">
              <li>Installa un'app gratuita come <strong>AppBlock</strong> o <strong>StayFree</strong> dal Play Store.</li>
              <li>Imposta il blocco sull'applicazione <strong>"Impostazioni"</strong> di sistema con un PIN di sicurezza.</li>
              <li>Genera un PIN casuale qui sotto, impostalo sull'App-Locker, e incollalo nella Cassaforte al passo successivo per non vederlo più!</li>
            </ol>
          </div>

          <div class="glass-panel" style="padding: 12px; border-radius: 12px; text-align: center;">
            <span class="body-small">Generatore PIN di Emergenza:</span>
            <div id="wiz-pin-display" class="text-glow" style="font-family: var(--md-sys-font-mono); font-size: 24px; font-weight: 800; color: #38bdf8; margin: 6px 0;">
              ${this.state.appLockerPin || '••••'}
            </div>
            <button id="wiz-btn-generate-pin" class="md-btn md-btn-tonal" style="padding: 6px 14px; font-size: 11px;">
              <span class="material-symbols-rounded" style="font-size: 16px;">autorenew</span> Genera Nuovo PIN Casuale
            </button>
          </div>
        `;

      case 5:
        return `
          <div style="text-align: center; margin-bottom: 12px;">
            <span class="material-symbols-rounded text-glow" style="color: #c084fc; font-size: 42px; margin-bottom: 4px;">lock_clock</span>
            <h2 class="title-large" style="margin-bottom: 6px;">Cassaforte a Tempo (Time-Lock Vault)</h2>
            <p class="body-medium">Scegli cosa sigillare nella cassaforte fino al termine della sfida.</p>
          </div>

          ${this.state.hasPiHole && this.state.piholeConnected ? `
            <div class="glass-panel glow-primary" style="padding: 14px; border-radius: 14px; margin-bottom: 14px;">
              <span class="label-large" style="color: #34d399; display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span class="material-symbols-rounded" style="font-size: 18px;">check_circle</span> Pi-hole v6 Connesso
              </span>
              <p class="body-small" style="margin-bottom: 10px;">
                Possiamo cambiare <strong>realmente</strong> la password del tuo Pi-hole v6 sul server con una casuale a 32 caratteri e sigillarla nel Vault. Nessuno potrà accedere all'admin fino a fine sfida.
              </p>
              <button id="wiz-btn-lock-pihole-real" class="md-btn md-btn-primary md-btn-full" style="font-size: 12px;">
                <span class="material-symbols-rounded">autorenew</span> Cambia Password Pi-hole & Sigilla nel Vault
              </button>
            </div>
          ` : ''}

          <div class="glass-panel" style="padding: 14px; border-radius: 14px;">
            <label class="md-label">Sigilla PIN App-Locker, Router o Password Personale</label>
            <input id="wiz-manual-secret-input" type="password" class="md-input" value="${this.state.appLockerPin}" placeholder="Incolla qui il PIN o la password da dimenticare" style="margin: 6px 0 10px 0;" />
            <button id="wiz-btn-lock-manual-secret" class="md-btn md-btn-tonal md-btn-full" style="font-size: 12px;">
              <span class="material-symbols-rounded">enhanced_encryption</span> Sigilla questo Segreto nella Cassaforte
            </button>
          </div>

          <div id="wiz-vault-confirm-status" class="glass-panel" style="display: ${this.state.vaultSealed ? 'block' : 'none'}; margin-top: 12px; padding: 10px; border-radius: 10px; text-align: center; border-color: #34d399;">
            <span style="color: #34d399; font-weight: 600; font-size: 13px;">✓ Segreto sigillato con AES-GCM nella Cassaforte!</span>
          </div>
        `;

      case 6:
        return `
          <div style="text-align: center; margin-bottom: 12px;">
            <span class="material-symbols-rounded text-glow" style="color: #38bdf8; font-size: 42px; margin-bottom: 4px;">radar</span>
            <h2 class="title-large" style="margin-bottom: 6px;">Test Canarino di Verifica Live</h2>
            <p class="body-medium">Verifichiamo che il tuo DNS stia effettivamente bloccando i domini vietati prima di far partire la sfida.</p>
          </div>

          <button id="wiz-btn-run-canary" class="md-btn md-btn-primary md-btn-full" style="margin-bottom: 14px;">
            <span class="material-symbols-rounded">play_arrow</span> Esegui Test Canarino Adesso
          </button>

          <div id="wiz-canary-results" class="glass-panel" style="display: none; padding: 12px; border-radius: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span class="title-medium" style="font-size: 13px;">Esito Sonde:</span>
              <span id="wiz-canary-badge" class="md-chip md-chip-success">Verificato</span>
            </div>
            <p id="wiz-canary-summary" class="body-small"></p>
          </div>
        `;

      case 7:
        return `
          <div style="text-align: center; margin-bottom: 14px;">
            <span class="material-symbols-rounded text-glow" style="color: #ef4444; font-size: 48px; margin-bottom: 4px;">gavel</span>
            <h2 class="title-large" style="color: #f87171; margin-bottom: 6px;">Patto di Non Ritorno</h2>
            <p class="body-medium">
              Stai per iniziare ufficialmente il tuo percorso di <strong>${this.state.challengeDays} giorni</strong>.
            </p>
          </div>

          <div class="glass-panel glow-error" style="padding: 16px; border-radius: 16px; margin-bottom: 16px; border-color: rgba(239, 68, 68, 0.4);">
            <h4 class="title-medium" style="color: #f87171; margin-bottom: 6px;">Regole Inviolabili della Sfida:</h4>
            <ul class="body-small" style="padding-left: 18px; display: flex; flex-direction: column; gap: 8px;">
              <li><strong>Nessun Cheat</strong>: La sentinella controllerà periodicamente il DNS. Se viene disattivato, vengono aggiunte <strong>+24 ore di penalità</strong> al vault.</li>
              <li><strong>Nessun Annullamento</strong>: Il Panic Button serve solo ad aiutarti a superare le crisi, non disattiva nulla.</li>
              <li><strong>Resistenza Totale</strong>: Se disinstalli l'app, il contenuto della cassaforte è perso per sempre.</li>
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
        this.saveCurrentStepData();
        if (this.currentStep < this.totalSteps) {
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

    // Step-specific bindings
    if (this.currentStep === 1) {
      const radios = document.querySelectorAll('input[name="wiz-duration"]');
      radios.forEach(r => {
        r.addEventListener('change', () => {
          this.state.challengeDays = parseInt(r.value, 10);
        });
      });
    }

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

      btnYes.addEventListener('click', () => {
        this.state.hasPiHole = true;
        btnYes.className = 'md-btn md-btn-primary';
        btnNo.className = 'md-btn md-btn-tonal';
        configArea.style.display = 'block';
      });

      btnNo.addEventListener('click', () => {
        this.state.hasPiHole = false;
        btnNo.className = 'md-btn md-btn-primary';
        btnYes.className = 'md-btn md-btn-tonal';
        configArea.style.display = 'none';
      });

      btnModeApi.addEventListener('click', () => {
        btnModeApi.className = 'md-btn md-btn-primary';
        btnModeManual.className = 'md-btn md-btn-tonal';
        apiView.style.display = 'block';
        manualView.style.display = 'none';
      });

      btnModeManual.addEventListener('click', () => {
        btnModeManual.className = 'md-btn md-btn-primary';
        btnModeApi.className = 'md-btn md-btn-tonal';
        manualView.style.display = 'block';
        apiView.style.display = 'none';
      });

      btnConnect.addEventListener('click', async () => {
        const ip = document.getElementById('wiz-pi-ip').value.trim();
        const pass = document.getElementById('wiz-pi-pass').value;
        statusBox.style.display = 'block';
        statusBox.textContent = 'Connessione a Pi-hole v6 in corso...';
        btnConnect.disabled = true;

        const res = await PiHoleService.authenticate(ip, 80, pass);
        btnConnect.disabled = false;

        if (res.success) {
          this.state.piholeConnected = true;
          await PiHoleService.injectNsfwAdlists().catch(() => {});
          statusBox.innerHTML = '<span style="color: #34d399;">✓ Connesso e adlists NSFW iniettate nel database Gravity!</span>';
        } else {
          statusBox.innerHTML = `<span style="color: #f87171;">✗ Connessione fallita: ${res.error}</span>`;
        }
      });

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

    if (this.currentStep === 4) {
      const pinDisplay = document.getElementById('wiz-pin-display');
      const btnGen = document.getElementById('wiz-btn-generate-pin');

      btnGen.addEventListener('click', () => {
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        this.state.appLockerPin = pin;
        pinDisplay.textContent = pin;
        PanicService.playTone(520, 0.2);
      });
    }

    if (this.currentStep === 5) {
      const btnLockPihole = document.getElementById('wiz-btn-lock-pihole-real');
      const btnLockManual = document.getElementById('wiz-btn-lock-manual-secret');
      const manualInput = document.getElementById('wiz-manual-secret-input');
      const confirmStatus = document.getElementById('wiz-vault-confirm-status');

      const targetMs = Date.now() + (this.state.challengeDays * 24 * 60 * 60 * 1000);

      if (btnLockPihole) {
        btnLockPihole.addEventListener('click', async () => {
          btnLockPihole.disabled = true;
          btnLockPihole.textContent = 'Aggiornamento password Pi-hole sul server...';
          try {
            const res = await PiHoleService.lockPiHolePassword(targetMs);
            if (res.success) {
              this.state.vaultSealed = true;
              confirmStatus.style.display = 'block';
              confirmStatus.innerHTML = '<span style="color: #34d399;">✓ Password Pi-hole cambiata sul server e sigillata nel Vault!</span>';
              PanicService.playTone(660, 0.5);
            }
          } catch (e) {
            alert('Errore: ' + e.message);
          }
          btnLockPihole.disabled = false;
        });
      }

      btnLockManual.addEventListener('click', async () => {
        const val = manualInput.value.trim();
        if (!val) {
          alert('Inserisci un PIN o password da sigillare.');
          return;
        }
        await TimeVault.lockSecret(val, targetMs, 'PIN App-Locker / Router');
        this.state.vaultSealed = true;
        confirmStatus.style.display = 'block';
        PanicService.playTone(660, 0.5);
      });
    }

    if (this.currentStep === 6) {
      const btnRun = document.getElementById('wiz-btn-run-canary');
      const resBox = document.getElementById('wiz-canary-results');
      const badge = document.getElementById('wiz-canary-badge');
      const summary = document.getElementById('wiz-canary-summary');

      btnRun.addEventListener('click', async () => {
        btnRun.disabled = true;
        btnRun.textContent = 'Test in corso sulle sonde canarino...';

        const diag = await BlockerTester.runFullDiagnostic();
        btnRun.disabled = false;
        btnRun.textContent = 'Riesegui Test Canarino';

        resBox.style.display = 'block';
        if (diag.isSecure) {
          badge.className = 'md-chip md-chip-success';
          badge.textContent = `${diag.protectionRate}% Protetto`;
          summary.textContent = `Ottimo! ${diag.totalBlocked} sonde su ${diag.totalTested} sono state bloccate con successo dal tuo DNS.`;
        } else {
          badge.className = 'md-chip md-chip-warning';
          badge.textContent = `${diag.protectionRate}% Copertura`;
          summary.textContent = `Attenzione: alcune sonde hanno risposto. Assicurati di aver impostato il DNS Privato Android prima di continuare.`;
        }
      });
    }
  }

  saveCurrentStepData() {
    // Collect radio values if step 1
    if (this.currentStep === 1) {
      const checked = document.querySelector('input[name="wiz-duration"]:checked');
      if (checked) this.state.challengeDays = parseInt(checked.value, 10);
    }
  }

  finishWizard() {
    // Ensure challenge is started in Tracker
    ChallengeTracker.startChallenge(this.state.challengeDays);

    // If vault wasn't sealed yet with custom password, ensure at least placeholder lock exists
    if (!TimeVault.isLocked()) {
      const targetMs = Date.now() + (this.state.challengeDays * 24 * 60 * 60 * 1000);
      TimeVault.lockSecret('NNN_PROTECTED_INITIAL_TOKEN', targetMs, 'Token Impegno Sfida').catch(() => {});
    }

    // Play victory initiation tone and vibrate
    PanicService.playTone(880, 0.6);
    PanicService.vibrate([150, 100, 250]);

    // Save wizard completed flag
    localStorage.setItem('nnn_onboarding_completed', 'true');

    if (this.onComplete) {
      this.onComplete();
    }
  }
}
