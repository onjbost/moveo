import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Category } from './api';
import { CATEGORY_EMOJI, CATEGORY_LABEL } from './api';

// ------------------------------------------------------------------ toast

const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && <div className="toast" role="status">{msg}</div>}
    </ToastCtx.Provider>
  );
}

// ------------------------------------------------------------------ data

/** Loads data with a reload() helper; `deps` re-trigger the load. */
export function useData<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(load);
  loadRef.current = load;
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loadRef.current());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, deps);
  return { data, error, loading, reload, setData };
}

// ------------------------------------------------------------------ bits

export function Modal({ title, onClose, children, sub }: { title: ReactNode; sub?: ReactNode; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <div className="stack tight grow">
            <h2>{title}</h2>
            {sub && <div className="muted small">{sub}</div>}
          </div>
          <button className="btn icon ghost" onClick={onClose} aria-label="Chiudi">✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function CatChip({ category }: { category: Category | null | undefined }) {
  if (!category) return null;
  return <span className={`chip cat cat-${category}`}>{CATEGORY_EMOJI[category]} {CATEGORY_LABEL[category]}</span>;
}

export function Loading() {
  return <div className="empty">Caricamento…</div>;
}

export function ErrorBox({ error, retry }: { error: string; retry?: () => void }) {
  return (
    <div className="alert error row between">
      <span>{error}</span>
      {retry && <button className="btn sm" onClick={retry}>Riprova</button>}
    </div>
  );
}
