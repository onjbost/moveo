import { useState } from 'react';
import { api, type CategoryInfo } from '../api';
import { reloadCategories, useCategories } from '../categories';
import { useToast } from '../ui';

function Row({ c }: { c: CategoryInfo }) {
  const toast = useToast();
  const [f, setF] = useState({ label: c.label, emoji: c.emoji, color: c.color || '#888888' });
  const dirty = f.label !== c.label || f.emoji !== c.emoji || f.color !== (c.color || '#888888');
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      await reloadCategories();
      toast(ok);
    } catch (e) {
      toast((e as Error).message);
    }
  };
  if (c.builtin) {
    return (
      <div className={`session-row cat-${c.id}`}>
        <div className="bar" />
        <span style={{ fontSize: '1.2rem' }}>{c.emoji}</span>
        <span className="grow">{c.label}</span>
        <span className="faint small">{c.programs} programmi · di base</span>
      </div>
    );
  }
  return (
    <div className={`session-row cat-${c.id}`} style={{ gap: 8 }}>
      <div className="bar" />
      <input className="input" style={{ width: 58, textAlign: 'center', fontSize: '1.1rem' }} value={f.emoji} onChange={(e) => setF({ ...f, emoji: e.target.value })} aria-label="Emoji" />
      <input className="input grow" value={f.label} maxLength={30} onChange={(e) => setF({ ...f, label: e.target.value })} aria-label="Nome" />
      <input type="color" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} aria-label="Colore" style={{ width: 40, height: 36, border: 0, background: 'none', padding: 0 }} />
      <span className="faint small nowrap">{c.programs} progr.</span>
      {dirty && <button className="btn sm primary" onClick={() => run(() => api.updateCategory(c.id, f), 'Categoria aggiornata')}>Salva</button>}
      <button className="btn sm ghost" disabled={c.programs > 0} title={c.programs ? 'Usata da alcuni programmi: cambia prima la loro categoria' : 'Elimina'}
        onClick={() => run(() => api.deleteCategory(c.id), 'Categoria eliminata')} aria-label="Elimina">✕</button>
    </div>
  );
}

/** Settings → Categorie: built-in ones (read only) and yours (name, emoji, color). */
export function CategoriesEditor() {
  const toast = useToast();
  const cats = useCategories();
  const [f, setF] = useState({ label: '', emoji: '🏃', color: '#f97316' });
  const create = async () => {
    try {
      await api.createCategory(f);
      await reloadCategories();
      setF({ label: '', emoji: '🏃', color: '#f97316' });
      toast('Categoria creata');
    } catch (e) {
      toast((e as Error).message);
    }
  };
  return (
    <section className="card stack">
      <h2>Categorie</h2>
      <p className="muted small">Oltre a quelle di base puoi creare le tue (es. Corsa, Boxe, Mobilità) e usarle per i programmi da playlist YouTube, i programmi esterni e quelli importati. Una categoria si elimina solo quando nessun programma la usa.</p>
      <div className="stack tight">{cats.map((c) => <Row key={`${c.id}-${c.label}-${c.emoji}-${c.color}`} c={c} />)}</div>
      <div className="row nowrap" style={{ gap: 8 }}>
        <input className="input" style={{ width: 58, textAlign: 'center', fontSize: '1.1rem' }} value={f.emoji} onChange={(e) => setF({ ...f, emoji: e.target.value })} aria-label="Emoji" />
        <input className="input grow" placeholder="Nuova categoria" value={f.label} maxLength={30} onChange={(e) => setF({ ...f, label: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && f.label.trim() && create()} />
        <input type="color" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} aria-label="Colore" style={{ width: 40, height: 36, border: 0, background: 'none', padding: 0 }} />
        <button className="btn primary" onClick={create} disabled={!f.label.trim()}>＋ Aggiungi</button>
      </div>
    </section>
  );
}
