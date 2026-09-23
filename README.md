<div align="center">

  <img src="public/icon.png" width="96" height="96" alt="NNN Shield Icon" style="border-radius: 22px;" />

  # NNN Shield

  App Android per il blocco di contenuti NSFW e il tracciamento della No Nut November.

</div>

---

## Panoramica

NNN Shield è un'applicazione Android pensata per chi vuole completare la No Nut November (o un periodo di astinenza e reset della dopamina) riducendo al minimo il rischio di ricadute impulsive.

Invece di affidarsi solo alla forza di volontà o a un semplice contatore di giorni, l'app interviene a livello di sistema operativo: configura un DNS sicuro con filtro contenuti, fornisce un meccanismo di blocco delle impostazioni protetto da cassaforte crittografica a tempo, e permette di integrare anche un eventuale server Pi-hole casalingo.

Non richiede root e non usa una VPN locale in background, evitando così consumi anomali di batteria.

---

## Caratteristiche

- **DNS Privato di sistema (DNS-over-TLS)**: guida alla configurazione del DNS nativo di Android su CleanBrowsing, Cloudflare Family o AdGuard. Il blocco funziona su tutto il traffico (browser, app terze, social) sia in Wi-Fi che sotto rete dati 4G/5G, con SafeSearch forzato su Google, Bing e YouTube.
- **Cassaforte crittografica a tempo (TimeVault)**: basata su cifratura AES-256-GCM tramite Web Cryptography API. Permette di generare e sigillare PIN o password amministrative che non possono essere decifrate prima della scadenza naturale della sfida.
- **Integrazione Pi-hole v6**: supporta la connessione diretta via REST API v6 per caricare automaticamente oltre 100.000 domini vietati nelle Adlist di Pi-hole. Opzionalmente può cambiare la password admin del Pi-hole con una stringa casuale a 32 caratteri e sigillarla nella cassaforte fino alla fine del mese.
- **Supporto ad app esterne di blocco (App-Locker)**: procedura per bloccare l'accesso all'app Impostazioni di Android tramite tool come AppBlock o StayFree. L'app genera un PIN casuale da inserire nel blocco e lo archivia nella cassaforte: in questo modo non è possibile disattivare il DNS nei momenti di debolezza.
- **Check-in giornaliero e sentinella DNS**: tracciamento dello streak con obbligo di check-in entro mezzanotte e verifiche periodiche (sonde canary) per controllare che il blocco sia ancora attivo. All'avvio della sfida è previsto un periodo di grazia di 2 ore per consentire la propagazione dei DNS e lo svuotamento della cache locale.
- **Pulsante di emergenza (Panic Button)**: schermata rapida richiamabile con un tocco, con esercizi di respirazione ritmica (tecnica 4-7-8), checklist di distrazione sensoriale e citazioni stoiche.
- **Notifiche locali e Modalità Stealth**: promemoria giornalieri per il check-in. Con la modalità stealth attiva, il testo della notifica sul blocco schermo diventa neutro (es. sincronizzazione completata) per non mostrare riferimenti alla NNN a chi guarda il telefono.
- **Interfaccia Material Design 3**: tema scuro OLED con supporto completo per display edge-to-edge, senza barre nere nella status bar o nella navigation bar.

---

## Installazione (.apk)

L'app non è distribuita sul Play Store. Per installarla sul telefono:

1. Vai nella sezione **Releases** di questo repository e scarica il file `.apk` più recente (es. `app-release.apk`).
2. Apri il file scaricato sul dispositivo Android. Se il sistema lo richiede, autorizza l'installazione da fonti sconosciute per il browser o il file manager in uso.
3. Avvia **NNN Shield** e segui il setup iniziale guidato:
   - Scelta della durata (30 giorni, 14 giorni o 7 giorni).
   - Configurazione guidata del DNS Privato Android.
   - Configurazione opzionale di Pi-hole (REST API o adlist manuali).
   - Generazione del PIN per l'app di blocco impostazioni.
   - Test canarino per verificare che il filtro DNS stia effettivamente bloccando i domini.
   - Sigillo finale e accesso alla dashboard.

---

## Privacy e sicurezza

- **Nessun backend remoto**: l'applicazione funziona interamente in locale sul dispositivo. Non ci sono database cloud, account utente o server proprietari.
- **Nessun tracciamento**: non sono presenti librerie di analytics, telemetria o pubblicità.
- **Chiamate di rete**: le uniche connessioni effettuate dall'app sono le chiamate locali all'IP del tuo Pi-hole (se configurato) e i test canary diretti verso i domini di verifica per accertare che il DNS stia bloccando la risoluzione.

---

## Compilazione da sorgente

Per compilare autonomamente l'applicazione:

### Requisiti
- Node.js 18+ e npm
- Android Studio con Android SDK (API 34) e JDK 17 o 21

### Procedura

1. Clona il repository e installa le dipendenze:
   ```bash
   git clone https://github.com/icaro12123/nnn-shield.git
   cd nnn-shield
   npm install
   ```

2. Compila il bundle frontend e sincronizza il progetto Android:
   ```bash
   npm run build
   npx cap sync android
   ```

3. Apri il progetto in Android Studio:
   ```bash
   npx cap open android
   ```

4. Genera il pacchetto APK:
   - **Debug**: menu *Build* > *Build Bundle(s) / APK(s)* > *Build APK(s)*.
   - **Release firmato**: menu *Build* > *Generate Signed Bundle / APK...* > seleziona *APK*, imposta il tuo keystore e compila la variante *release*.

---

## Licenza

Progetto rilasciato sotto licenza MIT. Consulta il file [LICENSE](LICENSE) per i dettagli.
