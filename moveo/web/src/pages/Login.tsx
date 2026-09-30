import { useState, type FormEvent } from 'react';
import { api } from '../api';

export function Login({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.login(password);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <form className="card stack" style={{ width: 'min(380px, 100%)' }} onSubmit={submit}>
        <div className="row"><img src="/img/icon.svg" alt="" width={44} height={44} /><h1>Moveo</h1></div>
        <p className="muted">Allenamento, stretching e pause attive.</p>
        {error && <div className="alert error">{error}</div>}
        <input className="input" type="password" autoFocus placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn primary" disabled={busy || !password}>{busy ? 'Accesso…' : 'Entra'}</button>
      </form>
    </div>
  );
}
