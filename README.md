<div align="center">

  <img src="public/icon.png" width="128" height="128" alt="NNN Shield Icon" style="border-radius: 28px; box-shadow: 0 8px 24px rgba(168, 85, 247, 0.4);" />

  # NNN Shield

  **Il sistema di difesa definitivo, blocco NSFW e disciplina neurale per superare la No Nut November su Android.**

  [![Platform](https://img.shields.io/badge/Platform-Android_8.0+-3DDC84?logo=android&logoColor=white)](https://github.com/icaro12123/nnn-shield)
  [![Version](https://img.shields.io/badge/Version-v2.1_Stable-a855f7)](https://github.com/icaro12123/nnn-shield/releases)
  [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![Design](https://img.shields.io/badge/Design-Material_Design_3_OLED-9333ea)](https://m3.material.io)

</div>

---

## 📱 Cos'è NNN Shield?

**NNN Shield** non è un semplice contatore di giorni o un blocco DNS banale: è un **sistema integrato di autodifesa digitale e disciplina** progettato per rimuovere la tentazione alla radice prima che la forza di volontà possa vacillare.

Combina filtri DNS crittografati a livello di sistema operativo, un Vault crittografico con sigillo temporale (Time-Lock), l'integrazione automatizzata con Pi-hole domestici, un watchdog anti-manomissione e strumenti di emergenza psicologica per disinnescare i momenti di crisi acuta.

---

## ✨ Funzionalità Principali

### 🛡️ 1. DNS Privato Android (DNS-over-TLS)
- Blocco totale di domini per adulti, traccianti e malware a livello di sistema operativo Android.
- Funziona sia sotto **Wi-Fi** che su rete dati **4G/5G**.
- **Nessun consumo di batteria** e zero overhead rispetto alle classiche app VPN.
- Scelta guidata tra i migliori provider: CleanBrowsing Adult Filter (con SafeSearch forzato su Google/Bing/YouTube), Cloudflare 1.1.1.3 Family e AdGuard.

### 🔒 2. Cassaforte Temporale Crittografica (Time-Locked Vault AES-GCM)
- Utilizza la Web Cryptography API nativa con cifratura **AES-256-GCM**.
- Sigilla in modo irreversibile password amministrative e PIN di sicurezza fino alla data esatta di fine sfida.
- Nessuna possibilità di sblocco anticipato: la chiave si sblocca solo allo scadere del timer.

### 🏠 3. Integrazione REST API per Pi-hole v6
- Connessione diretta e verifica del server Pi-hole locale via API v6.
- Iniezione automatica di oltre 100.000 domini NSFW (liste StevenBlack) direttamente nel database delle Adlists al momento del sigillo.
- *(Opzionale)* Cambio automatico della password admin con stringa crittografica casuale a 32 caratteri, sigillata nel Vault fino al termine della sfida.

### 📱 4. Protezione App-Locker dalle Ricadute
- Procedura guidata per bloccare l'accesso alle *"Impostazioni"* di Android tramite un'app di blocco (es. AppBlock o StayFree).
- Generatore di PIN casuale da impostare nell'App-Locker: una volta confermato, il PIN viene sigillato nel Vault e dimenticato, impedendo di disattivare il DNS Privato nei momenti di debolezza.

### 🚨 5. Panic Button & Protocollo di Emergenza SOS
- Tasto di soccorso rapido con feedback aptico per gestire gli impulsi improvvisi (urges).
- Tecniche di respirazione tattica guidata (4-7-8) con animazioni visive di concentrazione.
- Promemoria di grounding sensoriale (protocollo 5-4-3-2-1), doccia fredda e citazioni stoiche per resettare i picchi di dopamina.

### 📅 6. Streak Tracker & Check-in Giornaliero Obbligatorio
- Contatore progressivo con traguardi storici (Giorno 1, 3, 7, 14, 21, 30).
- **Check-in obbligatorio entro le 23:59**: saltare un giorno comporta automaticamente +24h di penalità alla cassaforte temporale e 1 Strike.
- **Sentinella Anti-Cheat**: controlli periodici con sonde canary DNS. Se il blocco viene disattivato, scatta una penalità di +24 ore sulla cassaforte (con periodo di grazia iniziale di 2h per consentire la corretta propagazione della rete).

### 🔔 7. Notifiche Locali & Modalità Stealth
- Promemoria discreti alle 20:30 e alle 23:00 per ricordare il check-in giornaliero.
- **Modalità Stealth (Privacy Schermo)**: maschera il testo delle notifiche sul blocco schermo usando diciture neutre di sincronizzazione di sistema (*"Sincronizzazione di sicurezza completata"*), nascondendo a occhi indiscreti qualunque riferimento alla NNN.

### 🎨 8. Design Seamless & Material Design 3
- Palette OLED Black profonda (`#0B0813`) e accenti viola al neon con effetto Bloom.
- Supporto completo Edge-to-Edge: barre di sistema (Status Bar e Navigation Bar) perfettamente integrate senza barre nere.
- Scorrimento protetto da overscroll elastico web per un'esperienza 100% nativa.

---

## 📥 Come Installare l'Applicazione (.APK)

Non è necessario passare dal Google Play Store: puoi installare direttamente il pacchetto `.apk` ufficiale in pochi secondi.

1. **Scarica il file APK**:
   - Vai alla sezione **[Releases](https://github.com/icaro12123/nnn-shield/releases)** di questo repository.
   - Scarica l'ultimo file disponibile (es. `app-release.apk` o `app-debug.apk`).
2. **Abilita l'installazione**:
   - Se è la prima volta che installi un file APK, Android ti chiederà il permesso *"Installa app sconosciute"*: tocca **Impostazioni** sul popup e attiva l'interruttore per il tuo browser o gestore file.
3. **Avvia l'app**:
   - Apri **NNN Shield** e segui la **Configurazione Guidata in 6 passi**:
     1. Imposta la durata (30, 14 o 7 giorni).
     2. Configura il DNS Privato Android DoT.
     3. Connetti facoltativamente il tuo Pi-hole.
     4. Genera il PIN per l'App-Locker.
     5. Esegui il Test Canarino di verifica live.
     6. Sigilla il patto e inizia la sfida!

---

## 🛠️ Compilazione da Sorgente (Per Sviluppatori)

Se desideri ispezionare il codice o compilare l'APK autonomamente:

### Prerequisiti
- **Node.js** v18+ e **npm**
- **Android Studio** (con Android SDK 34 installato)
- **JDK 17** o **JDK 21**

### 1. Clonare il repository e installare i moduli
```bash
git clone https://github.com/icaro12123/nnn-shield.git
cd nnn-shield
npm install
```

### 2. Eseguire in ambiente di sviluppo (Web/Browser)
```bash
npm run dev
```

### 3. Compilare il bundle web e sincronizzare con Android
```bash
npm run build
npx cap sync android
```

### 4. Generare l'APK da Android Studio
1. Apri la cartella `android/` del progetto all'interno di Android Studio:
   ```bash
   npx cap open android
   # oppure apri manualmente la cartella /android in Android Studio
   ```
2. Attendi la sincronizzazione di Gradle.
3. **Per APK Debug veloce**:
   - Vai su menu **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
   - Troverai il file in `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 🔑 Come Generare un APK Firmato (Release) in Android Studio

Per creare l'APK finale firmato pronto per l'uso quotidiano:

1. In Android Studio, vai nel menu principale in alto: **Build** > **Generate Signed Bundle / APK...**
2. Seleziona **APK** e clicca su **Next**.
3. Sotto **Key store path**:
   - Se hai già un keystore, selezionalo con *Choose existing*.
   - Altrimenti clicca su **Create new...**, scegli un percorso sul tuo PC (es. nella tua cartella personale, **non** dentro il repository), imposta una password per il keystore e per la chiave, e compila il campo *Alias* (es. `key0`).
4. Inserisci le password e clicca su **Next**.
5. Seleziona la variante di build **release** e spunta le opzioni di firma (V1 / V2).
6. Clicca su **Finish**.
7. Al termine della compilazione, clicca sulla notifica in basso a destra su **locate** per trovare il tuo file APK firmato e pronto all'uso!

---

## 🔒 Privacy & Sicurezza dei Dati

- **Nessun server centrale**: NNN Shield è completamente serverless. Tutti i dati (streak, log, timer, note di diario) sono memorizzati localmente nel tuo dispositivo tramite storage cifrato.
- **Nessuna telemetria né tracciamento pubblicitario**: zero analytics di terze parti, zero chiamate verso server esterni se non quelle strettamente necessarie al test canarino DNS e all'API del tuo Pi-hole locale.
- **Open Source trasparente**: ogni riga di codice che gestisce il Vault e i controlli è pubblicamente verificabile.

---

## 📄 Licenza

Distribuito sotto licenza **MIT**. Consulta il file `LICENSE` per ulteriori informazioni.
