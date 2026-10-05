import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

// pdf.js is loaded only when a PDF is shown (it's large): Android WebViews can't display PDFs in an iframe,
// so pages are rendered on a canvas, the same way in every browser.
let pdfjsPromise: Promise<typeof import('pdfjs-dist/legacy/build/pdf.mjs')> | null = null;
function loadPdfjs() {
  pdfjsPromise ||= Promise.all([import('pdfjs-dist/legacy/build/pdf.mjs'), import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')]).then(([lib, worker]) => {
    lib.GlobalWorkerOptions.workerSrc = worker.default;
    return lib;
  });
  return pdfjsPromise;
}

/** One page of a PDF, fitted to the width, with page navigation. */
export function PdfPages({ url, page = 1, title }: { url: string; page?: number; title: string }) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState(page);
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let loaded: PDFDocumentProxy | null = null;
    setDoc(null);
    setError('');
    loadPdfjs()
      .then((lib) => lib.getDocument({ url, withCredentials: true }).promise)
      .then((d) => {
        loaded = d;
        if (cancelled) d.destroy();
        else setDoc(d);
      })
      .catch((e) => !cancelled && setError((e as Error).message || 'PDF non leggibile'));
    return () => { cancelled = true; loaded?.destroy(); };
  }, [url]);

  useEffect(() => setCurrent(page), [page]);
  const n = doc?.numPages || 0;
  const shown = n ? Math.min(Math.max(1, current), n) : current;

  useEffect(() => {
    if (!doc || !canvas.current || !box.current) return;
    let task: { cancel: () => void; promise: Promise<void> } | null = null;
    let cancelled = false;
    const draw = async () => {
      const pg = await doc.getPage(shown);
      if (cancelled || !canvas.current || !box.current) return;
      const base = pg.getViewport({ scale: 1 });
      const width = box.current.clientWidth || 600;
      const maxH = window.innerHeight * 0.78;
      const scale = Math.min(width / base.width, maxH / base.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const vp = pg.getViewport({ scale: scale * dpr });
      const c = canvas.current;
      c.width = Math.floor(vp.width);
      c.height = Math.floor(vp.height);
      c.style.width = `${Math.floor(vp.width / dpr)}px`;
      c.style.height = `${Math.floor(vp.height / dpr)}px`;
      task?.cancel();
      task = pg.render({ canvas: c, viewport: vp });
      await task.promise.catch(() => {});
    };
    draw();
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => { cancelled = true; task?.cancel(); window.removeEventListener('resize', onResize); };
  }, [doc, shown]);

  if (error) return <div className="alert small">Non riesco a mostrare il PDF ({error}). <a href={url} target="_blank" rel="noopener">Aprilo a parte ↗</a></div>;
  return (
    <div className="attachment stack tight" ref={box}>
      {!doc && <div className="faint small" style={{ padding: 40 }}>Carico il PDF…</div>}
      <canvas ref={canvas} role="img" aria-label={`${title}, pagina ${shown}`} style={{ display: doc ? 'block' : 'none' }} />
      {n > 0 && (
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn sm ghost" onClick={() => setCurrent(shown - 1)} disabled={shown <= 1}>← Pagina prec.</button>
          <span className="small muted num">{shown} / {n}{page !== shown ? '' : ' · pagina del giorno'}</span>
          <button className="btn sm ghost" onClick={() => setCurrent(shown + 1)} disabled={shown >= n}>Pagina succ. →</button>
          {page !== shown && <button className="btn sm ghost" onClick={() => setCurrent(page)}>↺ Torna al giorno</button>}
        </div>
      )}
    </div>
  );
}

/** A personal attachment (poster image or PDF page) shown unchanged. */
export function AttachmentView({ att, title }: { att: { url: string; mime: string; page?: number | null; name: string }; title: string }) {
  if (att.mime === 'application/pdf') return <PdfPages url={att.url} page={att.page || 1} title={title} />;
  return (
    <a className="attachment" href={att.url} target="_blank" rel="noopener" title="Apri a tutto schermo">
      <img src={att.url} alt={title} />
    </a>
  );
}
