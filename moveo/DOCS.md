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
| `calendary_calendar` | Nome del calendario creato in Calendary per gli allenamenti (default `Allenamento`). |
| `calendary_push` | Invia le notifiche delle pause tramite le notifiche push di Calendary (PC, telefono e tablet su cui le hai attivate). |
| `ha_notify_services` | Servizi di notifica dell'app companion separati da virgola, es. `mobile_app_pixel_8, mobile_app_galaxy_tab`. La notifica ha il pulsante **▶ Inizia**. |
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
