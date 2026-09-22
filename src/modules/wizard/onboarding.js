// ==========================================================================
// ONBOARDING SETUP WIZARD (FASE 1: GUIDA INIZIALE A 6 PASSI SNELLITA)
// ==========================================================================

import { AndroidSetupGuide } from '../android/setup.js';
import { PiHoleService } from '../pihole/pihole.js';
import { TimeVault } from '../vault/vault.js';
import { BlockerTester } from '../tester/tester.js';
import { ChallengeTracker } from '../tracker/tracker.js';
import { PanicService } from '../panic/panic.js';
import { ModalDialog } from '../ui/dialog.js';
import { SealingOverlay } from './sealing-overlay.js';
import { NotificationService } from '../notifications/notifications.js';

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
      canaryPassed: false,
      notifEnabled: true,
      notifStealth: false
    };

    this.render();
  }

  render() {
    const statusText = document.getElementById('header-status-text');
    const statusDot = document.getElementById('header-status-dot');
    if (statusText) {
      statusText.textContent = `Passo ${this.currentStep}/${this.totalSteps}`;
    }
    if (statusDot) {
      statusDot.className = 'status-dot active';
    }

    this.container.innerHTML = `
      <div class="md-card md-card-highlight glow-primary" style="margin-bottom: 12px; padding: 18px 16px;">
        <!-- Dynamic Step Content -->
        <div id="wizard-step-content">
          ${this.getStepHtml(this.currentStep)}
        </div>

        <!-- Stepper Action Buttons -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; gap: 10px;">
          ${this.currentStep > 1 ? `
            <button id="btn-wizard-prev" class="md-btn md-btn-tonal" style="flex: 1; padding: 10px;">
              <span class="material-symbols-rounded">arrow_back</span> Indietro
            </button>
          ` : '<div style="flex: 1;"></div>'}

          ${this.currentStep < this.totalSteps ? `
            <button id="btn-wizard-next" class="md-btn md-btn-primary" style="flex: 1.2; padding: 10px;">
              Avanti <span class="material-symbols-rounded">arrow_forward</span>
            </button>
          ` : `
            <button id="btn-wizard-finish" class="md-btn md-btn-danger glow-error" style="flex: 1.5; font-size: 13px; font-weight: 700; padding: 10px;">
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
          <div style="text-align: center; margin-bottom: 8px;">
            <span class="material-symbols-rounded text-glow" style="color: #c084fc; font-size: 32px; margin-bottom: 2px;">android</span>
            <h2 class="title-large" style="margin-bottom: 4px; font-size: 18px;">DNS Privato Android (DoT)</h2>
            <p class="body-medium" style="font-size: 12px; line-height: 1.3;">Blocca ogni sito NSFW sia su Wi-Fi che in 4G/5G a livello di sistema operativo.</p>
          </div>

          <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 8px; margin-bottom: 8px;">
            <label class="glass-panel wiz-dns-card ${this.state.selectedDnsHost === 'adult-filter-dns.cleanbrowsing.org' ? 'glow-primary' : ''}" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-radius: 12px; cursor: pointer; border-color: ${this.state.selectedDnsHost === 'adult-filter-dns.cleanbrowsing.org' ? '#c084fc' : 'rgba(255,255,255,0.08)'};">
              <div style="padding-right: 8px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="label-large" style="color: #ffffff; font-size: 12px;">CleanBrowsing Adult Filter</span>
                  <span class="md-chip md-chip-primary" style="font-size: 9px; padding: 1px 6px;">Consigliato</span>
                </div>
                <p class="body-small" style="font-size: 10px; margin-top: 2px; color: #cac1df;">SafeSearch forzato su Google/Bing/YT e blocco NSFW totale.</p>
              </div>
              <input type="radio" name="wiz-dns-provider" value="adult-filter-dns.cleanbrowsing.org" ${this.state.selectedDnsHost === 'adult-filter-dns.cleanbrowsing.org' ? 'checked' : ''} style="accent-color: #a855f7; transform: scale(1.2);" />
            </label>

            <label class="glass-panel wiz-dns-card ${this.state.selectedDnsHost === 'family.cloudflare-dns.com' ? 'glow-primary' : ''}" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-radius: 12px; cursor: pointer; border-color: ${this.state.selectedDnsHost === 'family.cloudflare-dns.com' ? '#c084fc' : 'rgba(255,255,255,0.08)'};">
              <div style="padding-right: 8px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="label-large" style="color: #ffffff; font-size: 12px;">Cloudflare 1.1.1.3 Family</span>
                  <span class="md-chip md-chip-secondary" style="font-size: 9px; padding: 1px 6px;">Veloce</span>
                </div>
                <p class="body-small" style="font-size: 10px; margin-top: 2px; color: #cac1df;">Latenza minima globale, blocco malware e contenuti adulti.</p>
              </div>
              <input type="radio" name="wiz-dns-provider" value="family.cloudflare-dns.com" ${this.state.selectedDnsHost === 'family.cloudflare-dns.com' ? 'checked' : ''} style="accent-color: #a855f7; transform: scale(1.2);" />
            </label>

            <label class="glass-panel wiz-dns-card ${this.state.selectedDnsHost === 'family.adguard-dns.com' ? 'glow-primary' : ''}" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-radius: 12px; cursor: pointer; border-color: ${this.state.selectedDnsHost === 'family.adguard-dns.com' ? '#c084fc' : 'rgba(255,255,255,0.08)'};">
              <div style="padding-right: 8px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="label-large" style="color: #ffffff; font-size: 12px;">AdGuard Family Protection</span>
                  <span class="md-chip md-chip-warning" style="font-size: 9px; padding: 1px 6px;">AdBlock</span>
                </div>
                <p class="body-small" style="font-size: 10px; margin-top: 2px; color: #cac1df;">Anti-pubblicità integrato combinato al blocco NSFW.</p>
              </div>
              <input type="radio" name="wiz-dns-provider" value="family.adguard-dns.com" ${this.state.selectedDnsHost === 'family.adguard-dns.com' ? 'checked' : ''} style="accent-color: #a855f7; transform: scale(1.2);" />
            </label>
          </div>

          <div class="glass-panel" style="padding: 8px 12px; border-radius: 10px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <code id="wiz-host-preview" style="font-family: var(--md-sys-font-mono); color: #34d399; font-size: 11px;">${this.state.selectedDnsHost}</code>
              <button id="wiz-btn-copy-host" class="md-btn md-btn-tonal" style="padding: 4px 10px; font-size: 11px;">
                Copia
              </button>
            </div>
          </div>

          <button id="wiz-btn-open-settings" class="md-btn md-btn-primary md-btn-full" style="padding: 10px 12px; margin-bottom: 6px;">
            <span class="material-symbols-rounded">settings</span> Apri Impostazioni Rete Android
          </button>
          <p class="body-small" style="font-size: 10px; opacity: 0.8; text-align: center;">
            Rete e Internet > DNS Privato > Nome host provider > Incolla e Salva.
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
                <label class="md-label">Indirizzo IP locale Pi-hole (con porta facoltativa)</label>
                <input id="wiz-pi-ip" type="text" class="md-input" value="${this.state.piholeRawInput || '192.168.1.100'}" placeholder="es. 192.168.0.44 oppure 192.168.0.44:82" style="padding: 8px 12px;" />
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
          <div style="text-align: center; margin-bottom: 8px;">
            <span class="material-symbols-rounded text-glow" style="color: #f87171; font-size: 32px; margin-bottom: 2px;">lock</span>
            <h2 class="title-large" style="margin-bottom: 4px; font-size: 18px;">[OPZIONALE] Blocco Impostazioni Android</h2>
            <p class="body-medium" style="font-size: 12px; line-height: 1.3;">Impedisce di disattivare il DNS Privato nei momenti di debolezza.</p>
          </div>

          <!-- Compact Instructions + PIN Panel -->
          <div class="glass-panel" style="padding: 12px 14px; border-radius: 14px; margin-bottom: 8px;">
            <p class="body-small" style="margin-bottom: 8px; font-size: 11px; line-height: 1.4;">
              1. Installa un'app come <strong>AppBlock</strong> o <strong>StayFree</strong> dal Play Store e blocca l'app <em>Impostazioni</em> di Android.<br/>
              2. Imposta questo PIN nell'app di blocco, poi clicca Avanti:
            </p>

            <div style="text-align: center; padding: 4px 0;">
              <div id="wiz-pin-display" class="text-glow" style="font-family: var(--md-sys-font-mono); font-size: 26px; font-weight: 800; color: #38bdf8; letter-spacing: 4px; margin-bottom: 6px;">
                ${this.state.appLockerPin || '••••••'}
              </div>

              <div style="display: flex; gap: 8px; justify-content: center;">
                <button id="wiz-btn-generate-pin" class="md-btn md-btn-tonal" style="padding: 6px 12px; font-size: 11px;">
                  <span class="material-symbols-rounded" style="font-size: 15px;">autorenew</span> Genera PIN Casuale
                </button>
                ${this.state.appLockerPin ? `
                  <button id="wiz-btn-copy-pin" class="md-btn md-btn-tonal" style="padding: 6px 12px; font-size: 11px;">
                    <span class="material-symbols-rounded" style="font-size: 15px;">content_copy</span> Copia PIN
                  </button>
                ` : ''}
              </div>

              ${this.state.pinGenerationCount > 1 ? `
                <p class="body-small" style="color: #fbbf24; margin-top: 6px; font-size: 10px;">
                  ⚠️ Hai rigenerato il PIN: assicurati di usare questo <strong>ULTIMO</strong> (${this.state.appLockerPin})!
                </p>
              ` : ''}
            </div>
          </div>

          <div class="glass-panel glow-error" style="border-color: rgba(239, 68, 68, 0.4); padding: 8px 12px; border-radius: 10px;">
            <div style="display: flex; gap: 8px; align-items: center;">
              <span class="material-symbols-rounded" style="color: #ef4444; font-size: 18px; flex-shrink: 0;">lock_clock</span>
              <p class="body-small" style="color: #fca5a5; font-size: 10px; margin: 0; line-height: 1.3;">
                <strong>Nota:</strong> Cliccando "Avanti" il PIN verrà sigillato nel Vault fino al termine della sfida.
              </p>
            </div>
          </div>
        `;

      case 5:
        return `
          <div style="text-align: center; margin-bottom: 12px;">
            <span class="material-symbols-rounded text-glow" style="color: #38bdf8; font-size: 42px; margin-bottom: 4px;">radar</span>
            <h2 class="title-large" style="margin-bottom: 6px;">Test Canarino di Verifica Live</h2>
            <p class="body-medium">Verifica: accertiamoci che il blocco DNS stia filtrando i domini vietati prima di sigillare l'inizio della sfida.</p>
          </div>

          ${this.state.hasPiHole && this.state.piholeConnected ? `
            <div class="glass-panel" style="padding: 12px; border-radius: 12px; margin-bottom: 14px; border-color: rgba(56, 189, 248, 0.4); background: rgba(56, 189, 248, 0.07);">
              <div style="display: flex; gap: 10px; align-items: flex-start;">
                <span class="material-symbols-rounded" style="color: #38bdf8; font-size: 22px; margin-top: 1px;">info</span>
                <p class="body-small" style="color: #bae6fd; font-size: 11px; margin: 0; line-height: 1.4;">
                  <strong>Promemoria Pi-hole:</strong> Ricordati di aver attivato il DNS Privato DoT (Passo 2) e l'app di blocco. Le liste personalizzate di Pi-hole verranno iniettate e sigillate al passo finale!
                </p>
              </div>
            </div>
          ` : ''}

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
            : (this.state.hasPiHole && this.state.piholeConnected)
              ? 'Alcuni domini rispondono ancora: se ti affidi al blocco del Pi-hole, le sue liste verranno iniettate e sigillate al passo successivo. Potrai comunque procedere al Passo 6.'
              : 'Attenzione: alcuni domini per adulti rispondono ancora. Controlla il DNS Privato al Passo 2 e riesegui il test.'}
            </p>
          </div>

          ${!this.state.canaryPassed ? `
            <div class="md-chip md-chip-warning" style="margin-top: 14px; width: 100%; justify-content: center; font-size: 11px;">
              <span class="material-symbols-rounded">info</span> ${this.state.hasPiHole && this.state.piholeConnected ? 'Se usi Pi-hole potrai procedere al sigillo finale dove verranno caricate le liste.' : 'Il test canarino deve essere superato per poter avanzare!'}
            </div>
          ` : ''}
        `;

      case 6:
        return `
          <div style="text-align: center; margin-bottom: 8px;">
            <span class="material-symbols-rounded text-glow" style="color: #ef4444; font-size: 32px; margin-bottom: 2px;">gavel</span>
            <h2 class="title-large" style="color: #f87171; margin-bottom: 2px; font-size: 18px;">Patto di Non Ritorno & Sigillo</h2>
            <p class="body-medium" style="font-size: 12px; margin-bottom: 6px;">
              Inizio ufficiale della sfida di <strong>${this.state.challengeDays} giorni</strong>.
            </p>
          </div>

          <!-- Summary of Sealed Items -->
          <div class="glass-panel" style="padding: 10px 12px; border-radius: 12px; margin-bottom: 8px;">
            <h4 class="title-medium" style="margin-bottom: 6px; font-size: 12px; color: #c084fc;">Riepilogo Protezioni nel Vault:</h4>
            <div style="display: flex; flex-direction: column; gap: 5px;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
                <span>DNS Privato Android:</span>
                <span style="color: #34d399; font-weight: 600;">Verificato ✓</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
                <span>Blocklist Pi-hole v6:</span>
                <span style="color: ${this.state.hasPiHole && this.state.piholeConnected ? '#34d399' : '#cac1df'};">
                  ${this.state.hasPiHole && this.state.piholeConnected ? 'Iniezione NSFW al sigillo ✓' : 'Non configurato'}
                </span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
                <span>Password Pi-hole v6:</span>
                <span style="color: ${this.state.hasPiHole && this.state.piholeConnected && this.state.piholeAutoChangePass ? '#34d399' : '#cac1df'};">
                  ${this.state.hasPiHole && this.state.piholeConnected && this.state.piholeAutoChangePass ? 'Cambio & Sigillo attivo ✓' : 'Non configurato'}
                </span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
                <span>PIN App-Locker:</span>
                <span style="color: ${this.state.appLockerPin ? '#34d399' : '#cac1df'};">
                  ${this.state.appLockerPin ? 'Sigillato nel Vault ✓' : 'Nessuno'}
                </span>
              </div>
            </div>
          </div>

          <div class="glass-panel glow-error" style="padding: 10px 12px; border-radius: 12px; margin-bottom: 8px; border-color: rgba(239, 68, 68, 0.4);">
            <h4 class="title-medium" style="color: #f87171; margin-bottom: 4px; font-size: 12px;">Regole Inviolabili:</h4>
            <ul class="body-small" style="padding-left: 16px; display: flex; flex-direction: column; gap: 4px; font-size: 10px; margin: 0;">
              <li><strong>Check-in Obbligatorio</strong>: Registrati ogni giorno entro le 23:59. Saltare un giorno comporta <strong>+24h di penalità</strong> al Vault e 1 Strike.</li>
              <li><strong>Sentinella Anti-Cheat</strong>: Tentare di disattivare il DNS aggiunge automaticamente <strong>+24h di penalità</strong>.</li>
              <li><strong>Nessun Annullamento</strong>: Il Panic Button aiuta a resistere, non sblocca il Vault.</li>
            </ul>
          </div>

          <!-- Preferenze Notifiche & Privacy Stealth -->
          <div class="glass-panel" style="padding: 10px 12px; border-radius: 12px; margin-bottom: 8px; border-color: rgba(168, 85, 247, 0.3);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span class="label-large" style="display: flex; align-items: center; gap: 6px; font-size: 12px;">
                <span class="material-symbols-rounded" style="color: #c084fc; font-size: 18px;">notifications_active</span>
                Promemoria Notifiche
              </span>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input id="wiz-notif-enabled-cb" type="checkbox" ${this.state.notifEnabled ? 'checked' : ''} style="accent-color: #a855f7; transform: scale(1.1);" />
                <span class="body-small" style="font-size: 11px;">Abilita</span>
              </label>
            </div>
            <p class="body-small" style="font-size: 10px; color: #cac1df; margin-bottom: 6px; line-height: 1.3;">
              Promemoria giornaliero alle 20:30 e alle 23:00 (se non hai ancora fatto il check-in).
            </p>
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 6px;">
              <input id="wiz-notif-stealth-cb" type="checkbox" ${this.state.notifStealth ? 'checked' : ''} style="accent-color: #a855f7; transform: scale(1.1);" />
              <div>
                <span class="body-small" style="font-weight: 600; color: #ffffff; font-size: 11px;">Modalità Stealth (Privacy Schermo)</span>
                <p class="body-small" style="font-size: 9px; color: #94a3b8; margin: 0;">Nasconde riferimenti a NNN usando notifiche neutre di sincronizzazione.</p>
              </div>
            </label>
          </div>

          <p class="body-small" style="text-align: center; opacity: 0.8; font-size: 10px; margin-bottom: 4px;">
            Premi il pulsante qui sotto per sigillare il patto e accedere alla Dashboard.
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
      btnNext.addEventListener('click', async () => {
        // Step Validation Gate
        const isValid = await this.validateStep(this.currentStep);
        if (isValid) {
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
      const radios = document.querySelectorAll('input[name="wiz-dns-provider"]');
      const preview = document.getElementById('wiz-host-preview');
      const btnCopy = document.getElementById('wiz-btn-copy-host');
      const btnSettings = document.getElementById('wiz-btn-open-settings');

      radios.forEach(r => {
        r.addEventListener('change', () => {
          this.state.selectedDnsHost = r.value;
          preview.textContent = r.value;
          PanicService.vibrate(35);
          this.render();
        });
      });

      btnCopy.addEventListener('click', () => {
        navigator.clipboard.writeText(this.state.selectedDnsHost).then(() => {
          btnCopy.textContent = 'Copiato!';
          setTimeout(() => btnCopy.textContent = 'Copia', 1500);
        });
      });

      btnSettings.addEventListener('click', async () => {
        await AndroidSetupGuide.openAndroidNetworkSettings();
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
        const rawInput = document.getElementById('wiz-pi-ip').value.trim();
        const pass = document.getElementById('wiz-pi-pass').value;

        if (!rawInput || !pass) {
          await ModalDialog.showNotice({
            title: 'Dati Mancanti',
            message: 'Inserisci sia l\'indirizzo IP che la password attuale del tuo Pi-hole.',
            type: 'warning',
            icon: 'dns'
          });
          return;
        }

        const parsed = PiHoleService.parseEndpoint(rawInput);
        this.state.piholeRawInput = rawInput;
        this.state.piholeHost = parsed.host;
        this.state.piholePort = parsed.port;

        statusBox.style.display = 'block';
        statusBox.textContent = `Verifica connettività verso http://${parsed.host}:${parsed.port}/api...`;
        btnConnect.disabled = true;

        const res = await PiHoleService.verifyConnection(parsed.host, parsed.port, pass, parsed.useSsl);
        btnConnect.disabled = false;

        if (res.success) {
          this.state.piholeConnected = true;
          statusBox.innerHTML = `
            <div style="color: #34d399; font-weight: 600; font-size: 13px;">✓ Connesso e verificato a Pi-hole v6 (${parsed.host}:${parsed.port})!</div>
            <div style="color: #cac1df; font-size: 11px; margin-top: 4px;">• Stato Blocco DNS Pi-hole: <strong>${res.blocking ? 'Attivo' : 'Disabilitato'}</strong></div>
            <div style="color: #38bdf8; font-size: 11px; margin-top: 2px;">• Le blocklist NSFW verranno installate automaticamente al sigillo finale della sfida (Passo 6).</div>
          `;
          if (lockOptionBox) lockOptionBox.style.display = 'block';
          PanicService.vibrate(50);
        } else {
          this.state.piholeConnected = false;
          statusBox.innerHTML = `<span style="color: #f87171; font-weight: 600;">✗ Connessione fallita: ${res.error}</span>`;
          if (lockOptionBox) lockOptionBox.style.display = 'none';
          PanicService.vibrate([100, 50, 100]);
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
        PanicService.vibrate(35);
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

    // Step 6 Event Listeners (Notifiche & Stealth)
    if (this.currentStep === 6) {
      const cbNotif = document.getElementById('wiz-notif-enabled-cb');
      const cbStealth = document.getElementById('wiz-notif-stealth-cb');

      if (cbNotif) {
        cbNotif.addEventListener('change', () => {
          this.state.notifEnabled = cbNotif.checked;
        });
      }

      if (cbStealth) {
        cbStealth.addEventListener('change', () => {
          this.state.notifStealth = cbStealth.checked;
        });
      }
    }
  }

  // Strict Validation for Stepper using Native MD3 Modal Dialogs
  async validateStep(step) {
    if (step === 3) {
      if (this.state.hasPiHole && this.state.piholeMode === 'api') {
        if (!this.state.piholeConnected) {
          await ModalDialog.showNotice({
            title: 'Pi-hole non Connesso',
            message: 'Hai selezionato Pi-hole con REST API v6. Devi inserire IP e Password e cliccare "Connetti & Verifica" prima di poter andare avanti.\n\nSe non desideri usare le API, seleziona "Liste Manuali" o "No, solo Android".',
            type: 'warning',
            icon: 'dns'
          });
          return false;
        }
      }
    }

    if (step === 5) {
      if (!this.state.canaryTested) {
        await ModalDialog.showNotice({
          title: 'Test Canarino Obbligatorio',
          message: 'Devi eseguire il Test Canarino di verifica prima di poter procedere al patto finale.',
          type: 'warning',
          icon: 'radar'
        });
        return false;
      }
      if (!this.state.canaryPassed) {
        if (this.state.hasPiHole && this.state.piholeConnected) {
          const proceed = await ModalDialog.showConfirm({
            title: 'Fuga DNS (Pi-hole Configurato)',
            message: 'Il test ha rilevato domini raggiungibili. È previsto se fai affidamento su Pi-hole, poiché le sue liste NSFW verranno iniettate e sigillate al passo successivo.\n\nAssicurati comunque di aver impostato il DoT e l\'App Lock sul telefono. Vuoi procedere al Passo 6 per sigillare Pi-hole e avviare la sfida?',
            confirmText: 'Procedi al Sigillo',
            cancelText: 'Riesegui Test',
            icon: 'dns'
          });
          return proceed;
        }

        await ModalDialog.showNotice({
          title: 'Fuga DNS Rilevata',
          message: 'Il Test Canarino è fallito: sono state rilevate fughe DNS e alcuni siti vietati risultano ancora raggiungibili.\n\nAssicurati di aver impostato il DNS Privato Android (Passo 2) e riesegui il test fino al superamento per poter iniziare la sfida.',
          type: 'error',
          icon: 'gavel'
        });
        return false;
      }
    }

    return true;
  }

  async finishWizard() {
    const btnFinish = document.getElementById('btn-wizard-finish');
    if (btnFinish) {
      btnFinish.disabled = true;
      btnFinish.innerHTML = '<span class="material-symbols-rounded">hourglass_top</span> Avvio sigillo...';
    }

    const targetMs = Date.now() + (this.state.challengeDays * 24 * 60 * 60 * 1000);
    const secretsPayload = {};

    try {
      // Esegue l'animazione di sigillo (minimo 3 sec, massimo timeout 12 sec)
      await SealingOverlay.run(async () => {
        // 1. Se Pi-hole è connesso, inietta ORA le blocklist NSFW e cambia la password
        if (this.state.hasPiHole && this.state.piholeConnected) {
          const injectRes = await PiHoleService.injectNsfwAdlists();
          if (injectRes && injectRes.failed > 0 && injectRes.added === 0 && injectRes.existing === 0) {
            throw new Error('Iniezione blocklist su Pi-hole non riuscita. Verifica che il server Pi-hole sia online e connesso alla rete Wi-Fi.');
          }

          if (this.state.piholeAutoChangePass) {
            const piRes = await PiHoleService.lockPiHolePassword(targetMs);
            if (piRes && piRes.success) {
              secretsPayload.piholePassword = '[Cambiata e protetta sul server Pi-hole]';
            } else {
              throw new Error(piRes?.error || 'Il server Pi-hole ha rifiutato il cambio password.');
            }
          }
        }

        // 2. Se è stato generato il PIN App-Locker, inseriscilo nel payload del Vault
        if (this.state.appLockerPin) {
          secretsPayload.appLockerPin = this.state.appLockerPin;
        }

        // 3. Sigilla il payload crittografico nel TimeVault
        if (Object.keys(secretsPayload).length > 0) {
          await TimeVault.lockSecret(secretsPayload, targetMs, 'Segreti NNN Shield');
        } else if (!TimeVault.isLocked()) {
          await TimeVault.lockSecret('NNN_COMMITTED_TOKEN', targetMs, 'Patto di Disciplina NNN');
        }

        // 4. Avvia la sfida nel ChallengeTracker
        ChallengeTracker.startChallenge(this.state.challengeDays);

        // 5. Salva il flag di onboarding completato
        localStorage.setItem('nnn_onboarding_completed', 'true');

        // 6. Configura preferenze notifiche e schedulazione
        const notifSettings = NotificationService.getSettings();
        notifSettings.enabled = this.state.notifEnabled ?? true;
        notifSettings.stealthMode = this.state.notifStealth ?? false;
        NotificationService.saveSettings(notifSettings);
      }, 3000, 12000);

      // Richiede i permessi e programma le notifiche
      if (this.state.notifEnabled) {
        try {
          await NotificationService.requestPermissions();
          await NotificationService.scheduleDailyReminders();
        } catch (e) {
          console.warn('Errore richiesta permessi notifiche a fine setup:', e);
        }
      }

      // Transizione completata con successo
      if (this.onComplete) {
        this.onComplete();
      }
    } catch (err) {
      // In caso di errore o timeout:
      // Annulla la conferma, ripristina il pulsante e mostra l'errore in modale nativa MD3
      if (btnFinish) {
        btnFinish.disabled = false;
        btnFinish.innerHTML = '<span class="material-symbols-rounded">lock</span> SIGILLA E AVVIA SFIDA';
      }

      await ModalDialog.showNotice({
        title: 'Sigillo Annullato',
        message: err.message || 'Operazione annullata a causa di un errore o timeout di rete. I blocchi non sono stati applicati. Riprova.',
        type: 'error',
        icon: 'timer_off'
      });
    }
  }
}
