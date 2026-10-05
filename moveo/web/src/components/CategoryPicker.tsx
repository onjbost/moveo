import { useState } from 'react';
import { api } from '../api';
import { reloadCategories, useCategories } from '../categories';
import { useToast } from '../ui';

const NEW = '__new__';
const SUGGESTED = ['🏃', '🚴', '🥊', '🏊', '🧗', '⛷️', '🤸', '🏋️', '🧘', '🌀', '❤️', '⚽', '🎾', '🥾'];

/**
 * Category <select> with "＋ Nuova categoria…": name, emoji and color are created on the spot
 * and selected. The desk category is reserved to the break routines, so it isn't offered.
 */
export function CategoryPicker({ value, onChange, label = 'Categoria' }: { value: string; onChange: (id: string) => void; label?: string }) {
  const toast = useToast();
  const cats = useCategories().filter((c) => c.id !== 'desk');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🏃');
  const [color, setColor] = useState('#f97316');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try {
      const c = await api.createCategory({ label: name, emoji, color });
      await reloadCategories();
      onChange(c.id);
      setCreating(false);
      setName('');
      toast(`Categoria «${c.label}» creata`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="field">
      {label}
      <select className="input" value={creating ? NEW : value} onChange={(e) => (e.target.value === NEW ? setCreating(true) : (setCreating(false), onChange(e.target.value)))}>
        {cats.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
        <option value={NEW}>＋ Nuova categoria…</option>
      </select>
      {creating && (
        <div className="card stack tight" style={{ padding: 12, marginTop: 6 }}>
          <div className="row nowrap" style={{ gap: 8 }}>
            <input className="input" style={{ width: 64, textAlign: 'center', fontSize: '1.2rem' }} value={emoji} onChange={(e) => setEmoji(e.target.value)} aria-label="Emoji" />
            <input className="input grow" autoFocus placeholder="Es. Corsa, Boxe, Mobilità" value={name} maxLength={30}
              onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && create()} />
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Colore" style={{ width: 44, height: 40, border: 0, background: 'none', padding: 0 }} />
          </div>
          <div className="row" style={{ gap: 4 }}>
            {SUGGESTED.map((s) => <button key={s} type="button" className={`btn xs ghost ${s === emoji ? 'on' : ''}`} onClick={() => setEmoji(s)}>{s}</button>)}
          </div>
          <div className="row">
            <button type="button" className="btn sm primary" onClick={create} disabled={busy || !name.trim()}>Crea categoria</button>
            <button type="button" className="btn sm ghost" onClick={() => setCreating(false)}>Annulla</button>
          </div>
        </div>
      )}
    </div>
  );
}
