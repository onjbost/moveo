# Moveo

App di allenamento per Home Assistant, sorella di **Calendary**. Contiene:

- **Pause da scrivania**: routine da 3-5 minuti per collo, spalle, schiena e anche. Moveo le propone durante l'orario di lavoro, le rimanda se in Calendary hai un impegno in corso e le fa ruotare per coprire tutto il corpo.
- **Programmi**: Ripartenza dolce (2 settimane), Yoga: fondamenta (4), Pilates: core di base (4), Calisthenics da zero (8), Surf: pronto per la tavola (6). Sono scritti da zero e hanno progressione settimanale.
- **Player guidato**: timer, guida vocale in italiano, segnali acustici, schermo sempre acceso, spiegazione di ogni esercizio con varianti più facili e più difficili.
- **Integrazione con Calendary**: il pulsante "Pianifica" crea gli eventi nel calendario *Allenamento*. Ogni evento ha il pulsante **▶ Avvia allenamento**, che apre direttamente la sessione giusta; quando finisci, l'evento viene spuntato ✓.
- **Import/export JSON** di programmi ed esercizi.
- **Sensori Home Assistant**: `sensor.moveo_streak`, `sensor.moveo_minutes_week`, `sensor.moveo_breaks_today`, `sensor.moveo_next_session`.

## Configurazione

| Opzione | Descrizione |
|---|---|
| `password` | **Obbligatoria.** Password della webapp. |
| `public_url` | Indirizzo pubblico di Moveo (es. `https://moveo.gattucciocloud.it`). Viene usato nei link salvati in Calendary e nelle notifiche, quindi deve essere raggiungibile dal telefono. |
| `timezone` | Fuso orario, `Europe/Rome`. |
| `calendary_url` | Indirizzo interno di Calendary. Se Calendary è un add-on locale, `http://local-calendary:8787`. Se l'hai installato da un repository GitHub, il nome host lo trovi nella pagina dell'add-on Calendary (es. `http://a1b2c3d4-calendary:8787`). Puoi anche usare `http://IP-DI-HOME-ASSISTANT:8787`. |
| `calendary_token` | Deve essere uguale all'opzione `api_token` di Calendary (almeno 16 caratteri). |
| `calendary_public_url` | Indirizzo pubblico di Calendary, usato per il pulsante *Calendary* e l'accesso unico (`https://calendary.gattucciocloud.it`). |
| `calendary_calendar` | Nome del calendario creato in Calendary per gli allenamenti (default `Allenamento`). |
| `calendary_push` | Invia le notifiche delle pause tramite le notifiche push di Calendary (PC, telefono e tablet su cui le hai attivate). |
| `ha_notify_services` | Servizi di notifica dell'app companion separati da virgola, es. `mobile_app_pixel_8, mobile_app_galaxy_tab`. La notifica ha il pulsante **▶ Inizia**. |
| `ai_api_key` | Chiave dell'AI per generare i programmi successivi: la stessa di Calendary (Gemini gratuito, https://aistudio.google.com/apikey). Vuota = solo regole di progressione. |
| `ai_base_url` / `ai_model` / `ai_fallback_models` | Come in Calendary: qualsiasi API compatibile OpenAI (Gemini, Groq, OpenRouter, Ollama). |
| `youtube_api_key` | Facoltativa (YouTube Data API v3). Serve per leggere titoli e durate dei video di una playlist; senza chiave il piano si costruisce indicando a mano il numero di video. |
| `ha_sensors` | Pubblica i sensori `sensor.moveo_*`. |

Orari di lavoro, numero di pause e pausa pranzo si impostano dall'app, in **Impostazioni**.

## Primo avvio

1. In **Calendary** (dalla versione 0.3.0) imposta `api_token` con una stringa lunga e casuale, per esempio generata con `openssl rand -hex 24`.
2. In **Moveo** imposta `password`, `calendary_token` (lo stesso token) e, se vuoi le notifiche dell'app companion, `ha_notify_services`. Trovi i nomi in *Strumenti per sviluppatori → Azioni → notify.mobile_app_…*.
3. Avvia Moveo, apri `http://IP-DI-HOME-ASSISTANT:8788` e vai in **Impostazioni**: i due collegamenti devono risultare "Collegato". Premi **Invia notifica di prova**.
4. Aggiungi l'hostname a Cloudflared come per Calendary:
   ```yaml
   additional_hosts:
     - hostname: moveo.gattucciocloud.it
       service: http://local-moveo:8788
   ```

## Prossimo programma (AI + regole)

Quando un piano arriva all'80% delle sessioni, o supera la sua ultima data, Moveo prepara il programma successivo e ti avvisa. Lo trovi in **✨ Prossimo programma**, dove puoi anche chiederlo quando vuoi, con una richiesta libera (es. "più remata, 20 minuti").

- **Dati usati**: fatica media (1-10), percentuale completata, sessioni saltate, note, minuti per disciplina delle ultime 6 settimane, obiettivi e preferenze impostati nella pagina.
- **AI** (`ai_api_key`): riceve lo storico, il programma precedente e la libreria esercizi, e risponde con un programma in JSON.
- **Regole di progressione**: si usano se l'AI non è configurata o non risponde, oppure se la sua proposta non supera i controlli anche dopo una correzione. Calcolano il nuovo ciclo del programma precedente: volume dell'ultima settimana consolidato, varianti più difficili se la fatica era bassa, volume ridotto se era alta, 4ª settimana di scarico.
- **Controlli su ogni proposta**:
  - solo esercizi della libreria;
  - da 3 a 8 settimane;
  - sessioni non oltre i minuti massimi;
  - al massimo +20% di volume a settimana e +25% rispetto all'ultima settimana del programma precedente;
  - una settimana di scarico se il programma dura 4 settimane o più.
- **Approvazione**: nessuna proposta entra in calendario senza il tuo ok. "Approva e pianifica" la salva tra i programmi (✨ generato) e crea il piano in Calendary.

## Animazioni degli esercizi

Nella scheda *Come si fa* e nel player gli esercizi hanno un'animazione in stile "poster": figura disegnata a contorno nero con riempimento bianco, con maglietta, pantaloncini e scarpe. È un SVG generato al momento e funziona anche senza internet. Per gli esercizi da fare su entrambi i lati, la figura si specchia quando cambi lato.
Le pose chiave sono in `content-src/animations.py`. Le mani e i piedi che devono restare appoggiati vengono calcolati con la cinematica inversa; `python3 content-src/build.py` genera `server/content/animations.json`.
Esercizi animati finora (prototipo): squat, piegamenti, gatto-mucca, remata a secco, pop-up.

A ogni esercizio puoi anche collegare un **video YouTube** (*Come si fa → Collega un video YouTube*): verrà mostrato incorporato da youtube-nocookie.com.

## Categorie personalizzate

Oltre alle categorie di base (Recupero, Scrivania, Yoga, Pilates, Calisthenics, Surf) puoi crearne di tue, ognuna con nome, emoji e colore. Puoi farlo in due modi:
- in **Impostazioni → Categorie**;
- al volo dal menu *Categoria* (voce **＋ Nuova categoria…**) quando crei un piano da playlist YouTube o un programma esterno.

Le categorie personalizzate:
- compaiono nei filtri di *Programmi*, nello *Storico*, nelle preferenze del *Prossimo programma* e nella card di Calendary, con la loro emoji;
- si possono rinominare e ricolorare;
- si eliminano solo quando nessun programma le usa.

La categoria *Scrivania* resta riservata alle pause.

Ai programmi che hai creato, importato o collegato puoi cambiare **nome e categoria** con il pulsante *✏️ Nome e categoria* nella pagina del programma. Anche i prossimi allenamenti già messi in Calendary prendono il nuovo titolo. Quelli della libreria di base non si modificano.

## Piani da playlist YouTube

*Programmi → ▶ Da playlist YouTube*: incolli il link di una playlist, dai al programma un **nome** e una **categoria**, anche una nuova creata lì, e ogni video diventa una sessione.
- Con `youtube_api_key` vedi l'elenco dei video con titoli e durate: scegli quali tenere, ne cambi l'ordine e i titoli.
- Senza chiave indichi quanti video sono, più i titoli se vuoi. La sessione N riproduce l'N-esimo video della playlist tramite l'API del player di YouTube.
- Scegli sessioni a settimana e numero di settimane; se le sessioni sono più dei video, i video si ripetono in ordine. Poi pianifichi il programma in Calendary come gli altri. Il player mostra il video incorporato con cronometro e "Fatto", e la sessione viene registrata nello storico.

## Programmi esterni (DAREBEE e altri siti)

In **Impostazioni → Programmi esterni** incolli il link di un programma, ne indichi giorni totali, sessioni a settimana e durata, e Moveo lo pianifica in Calendary come gli altri. Il player apre la pagina del sito, cronometra e registra la sessione.
Esercizi, immagini e testi **non vengono copiati** né inclusi nell'app: restano sul sito dell'autore. Le condizioni d'uso di DAREBEE vietano di inserire i loro materiali in altre app, anche gratuite, e di modificarli.

Il link **🌐 DAREBEE** nel menu e in *Programmi* apre il catalogo dei programmi.

**Fogli dell'allenamento (uso personale).** Nella pagina di un programma esterno puoi caricare i file che hai scaricato tu dal sito:
- il **PDF del programma intero**: indichi a che pagina c'è il giorno 1, e nel player il giorno N apre la pagina corrispondente; con le frecce sfogli il resto;
- una **scheda per giorno** (JPG, PNG o WebP): selezionando più file insieme vengono ordinati per nome e assegnati ai giorni ancora vuoti. La scheda del giorno ha la precedenza sul PDF.

I file restano in `/data/attachments` sul tuo server (non nel repository né nell'APK), non vengono modificati e sono mostrati per intero, con il copyright dell'autore. Il PDF viene disegnato con pdf.js, così si vede anche nell'app Android, dove la WebView non apre i PDF da sola.

## Suite con Calendary

- **Accesso unico**: il pulsante *📅 Calendary* (nel menu e nella vista tablet) apre Calendary già autenticato, e i link di Calendary aprono Moveo già autenticato. Funziona con ticket firmati con il segreto condiviso, monouso e validi 2 minuti.
- **Card in Calendary**: Calendary legge `GET /api/suite/today` (protetto dallo stesso token) e mostra nella dashboard e nel kiosk la sessione di oggi e le pause, con **▶ Avvia** e **Pausa adesso**.
- **Scheda Moveo del tablet di Calendary**: Calendary legge `GET /api/suite/overview` (stesso token): ultimi allenamenti (pause escluse), prossime sessioni pianificate e programmi, con quelli in corso per primi.
- **Vista tablet** `/tablet`: orologio, allenamento del giorno con un grande ▶, pausa immediata, pause della giornata e prossime sessioni.

## App Android (tablet e telefono)

La cartella `tablet/` contiene l'app Capacitor che apre `https://moveo.gattucciocloud.it/tablet`:

```powershell
cd tablet; npm install; npx cap sync android; cd android; $env:JAVA_HOME="C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"; .\gradlew.bat assembleDebug
```

L'APK viene creato in `tablet/android/app/build/outputs/apk/debug/app-debug.apk`; serve lo stesso JDK 21 usato per Calendary.
L'app risponde ai link `moveo://open?url=…`, quindi dall'app Calendary il pulsante ▶ apre direttamente Moveo. Il pulsante *Calendary* apre l'app Calendary con `calendary://`, se è installata. Durante l'allenamento lo schermo resta acceso.

## Da dove partire

Dopo mesi senza allenarti comincia con **Ripartenza dolce** (tre sessioni brevi a settimana per due settimane), con le pause da scrivania attive. Poi puoi affiancare due programmi, per esempio **Surf** 3 volte a settimana e **Yoga** 1-2 volte, in giorni diversi.

## Formato dei programmi (import)

```json
{
  "id": "mio-programma",
  "title": "Il mio programma",
  "category": "surf",
  "sessions": [
    { "id": "sessione-a", "title": "A", "blocks": [
      { "title": "Circuito", "rounds": 3, "restBetweenRounds": 60, "items": [
        { "exercise": "prone-paddle", "duration": 40 },
        { "exercise": "push-up", "reps": 8, "sets": 3, "rest": 60, "restAfter": 30 }
      ] }
    ] }
  ],
  "schedule": [
    { "week": 1, "sessions": ["sessione-a", "sessione-a"] },
    { "week": 2, "sessions": ["sessione-a", "sessione-a"], "adjust": { "reps": 2, "duration": 10, "rounds": 1 } }
  ]
}
```

- `category`: `desk`, `recovery`, `yoga`, `pilates`, `calisthenics`, `surf`.
- Ogni elemento ha `duration` (in secondi) **oppure** `reps`. Con `"fixed": true` l'elemento non viene modificato da `adjust`.
- `"kind": "collection"` indica una raccolta di routine libere, senza settimane.
- Per aggiungere esercizi nuovi usa `{ "exercises": [...], "programs": [...] }`. Gli id degli esercizi esistenti sono nella pagina **Esercizi** o in un file esportato.

La libreria di base è generata da `content-src/*.py` (`python3 content-src/build.py`) nei file `server/content/*.json`.

## Sviluppo in locale

```bash
cd moveo/server && npm install && npm test
cd ../web && npm install && npm run build
```

Avvio (PowerShell):

```bash
$env:MOVEO_PASSWORD="demo"; $env:CALENDARY_URL="http://localhost:8787"; $env:CALENDARY_TOKEN="<token>"; node --disable-warning=ExperimentalWarning moveo/server/src/index.js
```

> Moveo non è un servizio medico. Le indicazioni sono pensate per adulti in salute; con dolori persistenti chiedi a un medico o a un fisioterapista.
