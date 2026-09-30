import { useEffect, useState } from 'react';
import { api, DAY_SHORT, type BreakSettings } from '../api';
import { navigate } from '../router';
import { ErrorBox, Loading, useData, useToast } from '../ui';

const EXAMPLE = `{
  "id": "mio-programma",
  "title": "Il mio programma",
  "category": "yoga",
  "summary": "Due sessioni a settimana",
  "sessions": [
    {
      "id": "sessione-a",
      "title": "Sessione A",
      "blocks": [
        { "title": "Riscaldamento", "items": [ { "exercise": "cat-cow", "reps": 8 } ] },
        { "title": "Principale", "rounds": 2, "restBetweenRounds": 30, "items": [
          { "exercise": "warrior-2", "duration": 30 },
          { "exercise": "squat", "reps": 10, "sets": 3, "rest": 45 }
        ] }
      ]
    }
  ],
  "schedule": [
    { "week": 1, "sessions": ["sessione-a", "sessione-a"] },
    { "week": 2, "sessions": ["sessione-a", "sessione-a"], "adjust": { "reps": 2, "duration": 10 } }
  ]
}`;

export function SettingsPage({ onLogout }: { onLogout: () => void }) {
  const toast = useToast();
  const status = useData(() => api.status());
  const settings = useData(() => api.breakSettings());
  const [form, setForm] = useState<BreakSettings | null>(null);
  const [json, setJson] = useState('');
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  useEffect(() => { if (settings.data) setForm(settings.data); }, [settings.data]);

  const set = <K extends keyof BreakSettings>(k: K, v: BreakSettings[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const save = async () => {
    if (!form) return;
    try {
      const s = await api.saveBreakSettings(form);
      setForm(s);
      toast('Impostazioni delle pause salvate');
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const doImport = async (text: string) => {
    setImportMsg(null);
    try {
      const r = await api.importContent(JSON.parse(text));
      setImportMsg({ ok: true, text: `Importati: ${r.programs.map((p) => p.title).join(', ') || 'nessun programma'}${r.exercises ? ` e ${r.exercises} esercizi` : ''}.` });
      setJson('');
    } catch (e) {
      setImportMsg({ ok: false, text: e instanceof SyntaxError ? `JSON non valido: ${e.message}` : (e as Error).message });
    }
  };
  const onFile = async (file: File | undefined) => {
    if (file) doImport(await file.text());
  };

  const test = async () => {
    setTestMsg('Invio…');
    try {
      const r = await api.testNotification();
      setTestMsg(r.length ? r.map((x) => `${x.channel}: ${x.ok ? `ok${x.sent !== undefined ? ` (${x.sent} dispositivi)` : ''}` : x.error || 'nessun dispositivo iscritto'}`).join(' · ') : 'Nessun canale di notifica configurato');
    } catch (e) {
      setTestMsg((e as Error).message);
    }
  };

  const logout = async () => {
    await api.logout();
    onLogout();
    navigate('/', { replace: true });
  };

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="page-head"><div><h1>Impostazioni</h1></div><button className="btn ghost" onClick={logout}>Esci</button></div>

      <section className="card stack">
        <h2>Pause durante il lavoro</h2>
        {settings.error && <ErrorBox error={settings.error} />}
        {!form ? <Loading /> : (
          <>
            <label className="switch"><input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} /> Ricordami di fare pause di movimento</label>
            <div className="field">Giorni lavorativi
              <div className="weekdays">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <button key={d} type="button" className={form.days.includes(d) ? 'on' : ''}
                    onClick={() => set('days', form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d])}>{DAY_SHORT[d]}</button>
                ))}
              </div>
            </div>
            <div className="grid-3">
              <label className="field">Inizio lavoro<input className="input" type="time" value={form.start} onChange={(e) => set('start', e.target.value)} /></label>
              <label className="field">Fine lavoro<input className="input" type="time" value={form.end} onChange={(e) => set('end', e.target.value)} /></label>
              <label className="field">Pause al giorno<input className="input" type="number" min={1} max={10} value={form.count} onChange={(e) => set('count', Number(e.target.value))} /></label>
              <label className="field">Pranzo dalle<input className="input" type="time" value={form.lunchStart} onChange={(e) => set('lunchStart', e.target.value)} /></label>
              <label className="field">alle<input className="input" type="time" value={form.lunchEnd} onChange={(e) => set('lunchEnd', e.target.value)} /></label>
              <label className="field">Avviso allenamenti (min prima)<input className="input" type="number" min={0} max={240} value={form.sessionReminder} onChange={(e) => set('sessionReminder', Number(e.target.value))} /></label>
            </div>
            <label className="switch"><input type="checkbox" checked={form.skipBusy} onChange={(e) => set('skipBusy', e.target.checked)} /> Se in Calendary ho un impegno in corso, rimanda la pausa di 15 minuti</label>
            <div className="row">
              <button className="btn primary" onClick={save}>Salva</button>
              <button className="btn" onClick={test}>🔔 Invia notifica di prova</button>
            </div>
            {testMsg && <div className="alert small">{testMsg}</div>}
          </>
        )}
      </section>

      <section className="card stack">
        <h2>Collegamenti</h2>
        {!status.data ? <Loading /> : (
          <div className="stack">
            <div className="row between"><div><b>Calendary</b><div className="faint small">Eventi degli allenamenti, notifiche push, impegni per rimandare le pause</div></div>
              <span className={`chip ${status.data.calendary.ok ? 'ok' : status.data.calendary.configured ? 'bad' : 'warn'}`}>{status.data.calendary.message}</span></div>
            <div className="row between"><div><b>Home Assistant</b><div className="faint small">Notifiche all'app companion (telefono, tablet) e sensori sensor.moveo_*{status.data.homeAssistant.notifyServices?.length ? ` · ${status.data.homeAssistant.notifyServices.join(', ')}` : ''}</div></div>
              <span className={`chip ${status.data.homeAssistant.ok ? 'ok' : 'warn'}`}>{status.data.homeAssistant.message}</span></div>
            <div className="faint small">Indirizzo pubblico usato nei link: {status.data.publicUrl} · versione {status.data.version}</div>
          </div>
        )}
      </section>

      <section className="card stack">
        <h2>Importa programmi</h2>
        <p className="muted small">Carica un file JSON esportato da Moveo o scritto a mano (anche con l'aiuto di Claude). Gli esercizi si richiamano con il loro id: li trovi nella pagina Esercizi o nei file esportati.</p>
        <div className="row">
          <label className="btn">📂 Scegli file<input type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} /></label>
          <a className="btn ghost" href="/api/export">⬇ Esporta tutta la libreria</a>
        </div>
        <textarea className="input" placeholder="…oppure incolla qui il JSON" value={json} onChange={(e) => setJson(e.target.value)} />
        <div className="row">
          <button className="btn primary" disabled={!json.trim()} onClick={() => doImport(json)}>Importa</button>
          <button className="btn ghost sm" onClick={() => setJson(EXAMPLE)}>Mostra un esempio</button>
        </div>
        {importMsg && <div className={`alert ${importMsg.ok ? 'ok' : 'error'}`}>{importMsg.text}</div>}
        <details className="small muted">
          <summary style={{ cursor: 'pointer' }}>Formato del file</summary>
          <ul style={{ paddingLeft: 18 }}>
            <li><code>category</code>: desk, recovery, yoga, pilates, calisthenics, surf</li>
            <li>ogni esercizio ha <code>duration</code> (secondi) <i>oppure</i> <code>reps</code>; facoltativi <code>sets</code>, <code>rest</code> (tra le serie), <code>restAfter</code>, <code>note</code></li>
            <li>i blocchi possono avere <code>rounds</code> e <code>restBetweenRounds</code> (circuiti)</li>
            <li><code>schedule</code> elenca le settimane; <code>adjust</code> aggiunge ripetizioni, secondi, serie o giri</li>
            <li><code>"kind": "collection"</code> per routine libere senza settimane</li>
            <li>per aggiungere esercizi nuovi: <code>{'{ "exercises": [...], "programs": [...] }'}</code></li>
          </ul>
        </details>
      </section>
    </div>
  );
}
