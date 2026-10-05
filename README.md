# Moveo 🌊

App di allenamento self-hosted per **Home Assistant**, in italiano: programmi guidati, pause di movimento durante il lavoro e un player con timer e guida vocale.
È un'applicazione indipendente che comunica con [Calendary](https://github.com/onjbost/calendary) tramite la sua API.

- **Programmi**: Ripartenza dolce (2 settimane), Yoga: fondamenta (4), Pilates: core di base (4), Calisthenics da zero (8), Surf: pronto per la tavola (6), più le routine brevi da scrivania.
- **103 esercizi** con spiegazione, indicazioni tecniche e varianti più facili o più difficili.
- **Player**: timer, guida vocale in italiano, segnali acustici, schermo sempre acceso e registrazione della fatica percepita.
- **Pause attive** durante l'orario di lavoro, rimandate se in Calendary c'è un impegno in corso.
- **Notifiche** tramite Calendary (web push su PC, telefono e tablet) e l'app companion di Home Assistant.
- **Sensori** `sensor.moveo_*` per le dashboard e le automazioni.
- **Import/export JSON** per aggiungere programmi.

```
Moveo/
├── repository.yaml        ← repository di add-on per Home Assistant
├── deploy.ps1             ← copia l'add-on nella cartella addons di Home Assistant (Samba)
├── tablet/                ← app Android (Capacitor) per tablet e telefono
└── moveo/                 ← l'add-on
    ├── config.yaml
    ├── Dockerfile
    ├── DOCS.md            ← configurazione e formato dei programmi
    ├── content-src/       ← sorgenti Python della libreria (esercizi e programmi)
    ├── server/            ← API Node.js (Fastify + SQLite integrato) + content/*.json
    └── web/               ← webapp React + Vite (PWA)
```

## Come comunica con Calendary

Le due app restano separate: ognuna ha il suo add-on, il suo database e la sua password.
Moveo usa l'API di Calendary (dalla **0.3.0**) con un token dedicato:

| Moveo → Calendary | A cosa serve |
|---|---|
| `GET/POST /api/calendars` | crea il calendario *Allenamento* |
| `POST /api/events/bulk` con `planId: "moveo:<id>"` | aggiunge le sessioni del piano, ciascuna con `linkUrl` verso il player |
| `PATCH /api/events/:id` | spunta ✓ la sessione completata |
| `DELETE /api/plans/moveo:<id>` | elimina il piano |
| `GET /api/events` | controlla se sei in riunione prima di proporre una pausa |
| `POST /api/notify` | invia le notifiche delle pause a tutti i dispositivi |

| Calendary → Moveo | A cosa serve |
|---|---|
| `GET /api/suite/today` (stesso token) | card *Allenamento* nella dashboard e nel kiosk di Calendary |
| `GET /api/suite/overview` (stesso token) | scheda *Moveo* del tablet di Calendary: ultimi allenamenti, prossimi, programmi |
| `/sso?t=…` | accesso unico: ticket firmati, monouso, validi 2 minuti, in entrambe le direzioni |
| `moveo://open?url=…` / `calendary://open?url=…` | le due app Android si aprono a vicenda |

In Calendary l'evento mostra il pulsante **▶ Avvia allenamento**, che apre `https://moveo…/play/<programma>/<sessione>`.
Se Calendary non è raggiungibile Moveo continua a funzionare e sincronizza i piani appena torna disponibile.

## Installazione

1. In Calendary (0.3.0+) imposta l'opzione `api_token`, per esempio con `openssl rand -hex 24`.
2. Copia l'add-on con `powershell -ExecutionPolicy Bypass -File deploy.ps1` oppure aggiungi questo repository in **Raccolta componenti aggiuntivi → ⋮ → Repository**.
3. Installa **Moveo** e imposta `password`, `calendary_token` (lo stesso token) ed eventualmente `ha_notify_services`.
4. Esponi Moveo con Cloudflared: `moveo.gattucciocloud.it → http://local-moveo:8788`.

I dettagli sono in [`moveo/DOCS.md`](moveo/DOCS.md).

## Sviluppo

```bash
cd moveo/server && npm install && npm test
cd ../web && npm install && npm run build
python3 moveo/content-src/build.py   # rigenera la libreria dopo aver modificato esercizi o programmi
```

> Moveo non sostituisce un medico o un fisioterapista.
