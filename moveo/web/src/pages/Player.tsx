import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AttachmentView } from '../components/AttachmentView';
import { api, CATEGORY_LABEL, fmtDuration, youtubeEmbed, youtubeSearch, type Exercise, type Playable, type Step } from '../api';
import { ExerciseAnimation } from '../components/ExerciseAnimation';
import { YouTubePlaylistPlayer } from '../components/YouTubePlaylistPlayer';
import { homePath } from '../home';
import { keepAwake } from '../native';
import { navigate } from '../router';
import { ErrorBox, Loading, Modal, useData, useToast } from '../ui';

// ------------------------------------------------------------ audio & voice

let audioCtx: AudioContext | null = null;
function unlockAudio() {
  try {
    audioCtx = audioCtx || new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch { /* no audio */ }
}
function beep(freq = 880, ms = 120, gain = 0.15) {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + ms / 1000);
  o.connect(g).connect(audioCtx.destination);
  o.start();
  o.stop(audioCtx.currentTime + ms / 1000 + 0.02);
}

let itVoice: SpeechSynthesisVoice | null = null;
function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const voices = speechSynthesis.getVoices();
  itVoice = voices.find((v) => v.lang?.toLowerCase().startsWith('it') && /google|natural|online/i.test(v.name))
    || voices.find((v) => v.lang?.toLowerCase().startsWith('it')) || null;
}
if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}
function say(text: string) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'it-IT';
  if (itVoice) u.voice = itVoice;
  u.rate = 1.02;
  speechSynthesis.speak(u);
}

const pref = (k: string, def: boolean) => {
  try {
    const v = localStorage.getItem(`moveo:${k}`);
    return v === null ? def : v === '1';
  } catch {
    return def;
  }
};
const savePref = (k: string, v: boolean) => {
  try { localStorage.setItem(`moveo:${k}`, v ? '1' : '0'); } catch { /* ignore */ }
};

// ------------------------------------------------------------ icons (emoji media glyphs render as boxes on some systems)

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d={d} /></svg>
);
const I = {
  play: 'M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z',
  pause: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z',
  prev: 'M6 5h2.5v14H6zM19 5.5v13a1 1 0 0 1-1.5.86L9 12.86a1 1 0 0 1 0-1.72l8.5-6.5A1 1 0 0 1 19 5.5z',
  next: 'M15.5 5H18v14h-2.5zM5 5.5v13a1 1 0 0 0 1.5.86l8.5-6.5a1 1 0 0 0 0-1.72L6.5 4.64A1 1 0 0 0 5 5.5z',
  check: 'M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6 11-11-1.4-1.4z',
};

// ------------------------------------------------------------ helpers

type RunStep = Step | { kind: 'prepare'; duration: number; block: string };

const PREPARE_SEC = 10;
const isTimed = (s: RunStep) => s.kind !== 'work' || s.mode === 'time';
const sideLabel = (side?: string | null) => (side === 'sinistro' ? 'Lato sinistro' : side === 'destro' ? 'Lato destro' : side === 'per lato' ? 'Per lato' : '');

function announce(step: RunStep, next: Step | undefined) {
  if (step.kind === 'prepare') return `Preparati. Si parte con ${next?.name || ''}`;
  if (step.kind === 'rest') return `Recupero. ${next?.name ? `Poi: ${next.name}` : ''}`;
  const side = step.side === 'sinistro' ? ', lato sinistro' : step.side === 'destro' ? ', lato destro' : '';
  const amount = step.mode === 'reps' ? `${step.reps} ripetizioni${step.side === 'per lato' ? ' per lato' : ''}` : `${step.duration} secondi`;
  return `${step.name}${side}. ${amount}`;
}

function fmtClock(sec: number) {
  const s = Math.max(0, Math.ceil(sec));
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : String(s);
}

// ------------------------------------------------------------ player

export function Player({ programId, sessionId, week, planSessionId, breakId }: {
  programId: string; sessionId: string; week: number; planSessionId: string | null; breakId: string | null;
}) {
  const { data, error, reload } = useData(() => api.play(programId, sessionId, week), [programId, sessionId, week]);
  if (error) return <div className="main"><ErrorBox error={error} retry={reload} /></div>;
  if (!data) return <div className="main"><Loading /></div>;
  if (data.external) return <ExternalRunner play={data} planSessionId={planSessionId} />;
  return <Runner play={data} planSessionId={planSessionId} breakId={breakId} />;
}

/** Session of an external program (e.g. DAREBEE): open it on its site, time it, then log it here. */
function ExternalRunner({ play, planSessionId }: { play: Playable; planSessionId: string | null }) {
  const toast = useToast();
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!startedAt || done) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt, done]);
  useEffect(() => {
    if (!startedAt || done) return;
    let release: (() => void) | null = null;
    keepAwake().then((r) => { release = r; });
    return () => release?.();
  }, [startedAt, done]);
  const ext = play.external!;
  const startClock = useCallback(() => setStartedAt((s) => s || Date.now()), []);
  const seconds = startedAt ? Math.round((now - startedAt) / 1000) : 0;
  const leave = () => navigate(homePath(), { replace: true });

  if (done) {
    return <DoneScreen play={play} seconds={seconds || play.seconds} completion={1} planSessionId={planSessionId} breakId={null}
      onSaved={() => { toast('Allenamento salvato 💪'); leave(); }} onDiscard={leave} />;
  }
  return (
    <div className={`player cat-${play.program.category}`} style={{ overflow: 'auto' }}>
      <div className="player-top">
        <button className="btn icon ghost" onClick={leave} aria-label="Chiudi">✕</button>
        <div className="grow muted small">{play.program.title}</div>
      </div>
      <div style={{ maxWidth: ext.embed || ext.youtube || ext.attachment ? 1000 : 640, width: '100%', margin: 'auto' }} className="stack center">
        <div className="muted">{play.program.title} · settimana {play.week} · circa {Math.round(play.seconds / 60)} minuti</div>
        <h1>{play.session.title}</h1>
        {ext.attachment ? (
          <>
            <div className="row" style={{ justifyContent: 'center' }}>
              {startedAt ? (
                <>
                  <div className="num" style={{ fontSize: '2.6rem', fontWeight: 700 }}>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</div>
                  <button className="btn coral lg" onClick={() => setDone(true)}>✓ Fatto</button>
                </>
              ) : <button className="btn primary lg" onClick={() => setStartedAt(Date.now())}>⏱ Inizia</button>}
              <a className="btn ghost" href={ext.url} target="_blank" rel="noopener">↗ {ext.site}</a>
            </div>
            <AttachmentView att={ext.attachment} title={play.session.title} />
            <p className="faint tiny">File scaricato da {ext.site} per uso personale, mostrato senza modifiche.</p>
          </>
        ) : (<>
        {!ext.embed && ext.youtube?.playlistId && ext.youtube.index ? (
          <YouTubePlaylistPlayer playlistId={ext.youtube.playlistId} index={ext.youtube.index} title={play.session.title} onStart={startClock} />
        ) : ext.embed ? (
          <div className="video-frame" style={{ width: 'min(960px, 92vw)', alignSelf: 'center' }}>
            <iframe src={ext.embed} title={play.session.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen
              onLoad={() => { if (!startedAt) setStartedAt(Date.now()); }} />
          </div>
        ) : (
          <p className="muted">Questa sessione è su <b>{ext.site}</b>: aprila, allenati seguendo le indicazioni del sito e torna qui per segnarla come fatta.</p>
        )}
        <div className="row" style={{ justifyContent: 'center' }}>
          <a className={`btn ${ext.embed || ext.youtube ? '' : 'primary lg'}`} href={ext.url} target="_blank" rel="noopener" onClick={() => { if (!startedAt) setStartedAt(Date.now()); }}>
            ↗ Apri su {ext.site}
          </a>
          {!startedAt && <button className="btn lg" onClick={() => setStartedAt(Date.now())}>⏱ Avvia cronometro</button>}
        </div>
        {startedAt && (
          <>
            <div className="reps-big num" style={{ fontSize: '4rem' }}>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</div>
            <button className="btn coral lg" style={{ alignSelf: 'center' }} onClick={() => setDone(true)}>✓ Fatto</button>
          </>
        )}
        {!ext.embed && !ext.youtube && <p className="faint tiny">Contenuti, immagini e istruzioni restano sul sito dell'autore: Moveo pianifica e registra. Puoi caricare il PDF o le schede scaricate nella pagina del programma.</p>}
        </>)}
      </div>
    </div>
  );
}

function Runner({ play, planSessionId, breakId }: { play: Playable; planSessionId: string | null; breakId: string | null }) {
  const toast = useToast();
  const steps: RunStep[] = useMemo(() => [{ kind: 'prepare', duration: PREPARE_SEC, block: 'Preparazione' }, ...play.steps], [play]);
  const workTotal = useMemo(() => play.steps.filter((s) => s.kind === 'work').length, [play]);

  const [phase, setPhase] = useState<'intro' | 'run' | 'done'>('intro');
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [endsAt, setEndsAt] = useState(0); // for timed steps
  const [remainingOnPause, setRemainingOnPause] = useState(0);
  const [stepStartedAt, setStepStartedAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [voice, setVoice] = useState(() => pref('voice', true));
  const [sound, setSound] = useState(() => pref('sound', true));
  const [showHow, setShowHow] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [doneWork, setDoneWork] = useState<Set<number>>(new Set());

  // active time (excludes pauses)
  const startedAt = useRef<number>(0);
  const pausedMs = useRef(0);
  const pauseBegan = useRef(0);
  const lastBeep = useRef<number>(-1);

  const step = steps[i];
  const nextWork = useMemo(() => steps.slice(i + 1).find((s): s is Step => s.kind === 'work'), [steps, i]);
  const ex: Exercise | undefined = step?.kind === 'work' && step.exercise ? play.exercises[step.exercise] : undefined;

  // screen always on while running (native plugin in the tablet app, Wake Lock API in the browser)
  useEffect(() => {
    if (phase !== 'run') return;
    let release: (() => void) | null = null;
    let cancelled = false;
    keepAwake().then((r) => { if (cancelled) r(); else release = r; });
    return () => { cancelled = true; release?.(); };
  }, [phase]);

  const enter = useCallback((idx: number) => {
    const s = steps[idx];
    if (!s) return;
    setI(idx);
    setShowHow(false);
    lastBeep.current = -1;
    const t = Date.now();
    setStepStartedAt(t);
    if (isTimed(s)) setEndsAt(t + (s.duration || 0) * 1000);
    const next = steps.slice(idx + 1).find((x): x is Step => x.kind === 'work');
    if (voice) say(announce(s, next));
    if (sound && s.kind === 'work') beep(1046, 220, 0.2);
  }, [steps, voice, sound]);

  const finish = useCallback(() => {
    setPhase('done');
    if (voice) say('Fatto! Ottimo lavoro.');
    if (sound) { beep(784, 150); setTimeout(() => beep(1046, 260), 170); }
  }, [voice, sound]);

  const advance = useCallback((markDone = true) => {
    if (markDone && step?.kind === 'work') setDoneWork((d) => new Set(d).add(i));
    if (i + 1 >= steps.length) finish();
    else enter(i + 1);
  }, [i, step, steps.length, enter, finish]);

  // ticking clock
  useEffect(() => {
    if (phase !== 'run' || paused) return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [phase, paused]);

  // auto-advance timed steps + countdown beeps
  useEffect(() => {
    if (phase !== 'run' || paused || !step || !isTimed(step)) return;
    const left = (endsAt - now) / 1000;
    const whole = Math.ceil(left);
    if (whole <= 3 && whole >= 1 && whole !== lastBeep.current) {
      lastBeep.current = whole;
      if (sound) beep(660, 90);
    }
    if (left <= 0) advance(true);
  }, [now, phase, paused, step, endsAt, advance, sound]);

  const start = () => {
    unlockAudio();
    startedAt.current = Date.now();
    pausedMs.current = 0;
    setPhase('run');
    enter(0);
  };

  const togglePause = useCallback(() => {
    if (phase !== 'run') return;
    if (!paused) {
      pauseBegan.current = Date.now();
      setRemainingOnPause(endsAt - Date.now());
      setPaused(true);
      if ('speechSynthesis' in window) speechSynthesis.cancel();
    } else {
      pausedMs.current += Date.now() - pauseBegan.current;
      setEndsAt(Date.now() + remainingOnPause);
      setPaused(false);
      setNow(Date.now());
    }
  }, [phase, paused, endsAt, remainingOnPause]);

  const prev = () => { if (i > 0) { setPaused(false); enter(i - 1); } };
  const skip = () => { setPaused(false); advance(false); };
  const addRest = (sec: number) => setEndsAt((e) => e + sec * 1000);

  // keyboard: space = pause / done, arrows = navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'run' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (step && !isTimed(step)) advance(true);
        else togglePause();
      } else if (e.code === 'ArrowRight') skip();
      else if (e.code === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const activeSec = () => {
    if (!startedAt.current) return 0;
    const pausedNow = paused ? Date.now() - pauseBegan.current : 0;
    return Math.round((Date.now() - startedAt.current - pausedMs.current - pausedNow) / 1000);
  };
  const completion = workTotal ? doneWork.size / workTotal : 1;

  const exit = () => {
    if (phase === 'run' && doneWork.size > 0) setConfirmExit(true);
    else leave();
  };
  const leave = () => {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    navigate(homePath(), { replace: true });
  };

  const cc = `cat-${play.program.category}`;

  // ---------------------------------------------------------------- intro
  if (phase === 'intro') {
    const blocks: { title: string; names: string[] }[] = [];
    for (const s of play.steps) {
      if (s.kind !== 'work') continue;
      let b = blocks[blocks.length - 1];
      if (!b || b.title !== s.block) { b = { title: s.block, names: [] }; blocks.push(b); }
      const label = s.name + (s.mode === 'reps' ? ` · ${s.reps}${s.side === 'per lato' ? '/lato' : ''}` : ` · ${s.duration}s`);
      if (!b.names.includes(label)) b.names.push(label);
    }
    return (
      <div className={`player ${cc}`} style={{ overflow: 'auto' }}>
        <div className="player-top">
          <button className="btn icon ghost" onClick={leave} aria-label="Chiudi">✕</button>
          <div className="grow muted small">{CATEGORY_LABEL[play.program.category]} · {play.program.title}</div>
        </div>
        <div style={{ maxWidth: 720, width: '100%', margin: '0 auto', padding: '24px 0' }} className="stack">
          <h1>{play.session.title}</h1>
          <div className="row">
            <span className="chip">≈ {fmtDuration(play.seconds)}</span>
            {play.program.category !== 'desk' && play.program.id !== 'pause-scrivania' && <span className="chip">Settimana {play.week}</span>}
            {play.session.focus && <span className="chip">{play.session.focus}</span>}
          </div>
          {play.session.intro && <p className="muted">{play.session.intro}</p>}
          {play.weekNote && <div className="alert info small">💡 {play.weekNote}</div>}
          <div className="card flat stack">
            {blocks.map((b, bi) => (
              <div key={bi} className="stack tight">
                <div className="faint tiny" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>{b.title}</div>
                <div className="small">{b.names.join(' → ')}</div>
              </div>
            ))}
          </div>
          <div className="row">
            <label className="switch"><input type="checkbox" checked={voice} onChange={(e) => { setVoice(e.target.checked); savePref('voice', e.target.checked); }} /> Guida vocale</label>
            <label className="switch"><input type="checkbox" checked={sound} onChange={(e) => { setSound(e.target.checked); savePref('sound', e.target.checked); }} /> Segnali acustici</label>
          </div>
          <button className="btn primary lg" onClick={start} autoFocus>▶ Inizia</button>
          <p className="faint tiny">Ascolta il corpo: tensione sì, dolore no. Se un esercizio fa male, saltalo o usa la variante più facile (tocca "Come si fa").</p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- done
  if (phase === 'done') {
    return <DoneScreen play={play} seconds={activeSec()} completion={completion} planSessionId={planSessionId} breakId={breakId}
      onSaved={() => { toast('Allenamento salvato 💪'); navigate(homePath(), { replace: true }); }} onDiscard={leave} />;
  }

  // ---------------------------------------------------------------- run
  const timed = isTimed(step);
  const left = paused ? remainingOnPause / 1000 : Math.max(0, (endsAt - now) / 1000);
  const total = step.duration || 1;
  const frac = timed ? Math.min(1, Math.max(0, 1 - left / total)) : 0;
  const elapsed = Math.max(0, (now - stepStartedAt) / 1000);
  const cues = ex?.cues || [];
  const cue = step.kind === 'work' ? (step.note || cues[Math.floor(elapsed / 8) % Math.max(1, cues.length)] || '') : '';
  const R = 46;
  const C = 2 * Math.PI * R;
  const stepCount = steps.length - 1;
  const progress = Math.max(0, i) / stepCount;

  return (
    <div className={`player ${cc} ${step.kind !== 'work' ? 'rest' : ''}`}>
      <div className="player-top">
        <button className="btn icon ghost" onClick={exit} aria-label="Esci">✕</button>
        <div className="grow stack tight">
          <div className="row between small"><span className="ellipsis">{play.session.title}</span><span className="faint num">{fmtClock(activeSec())}</span></div>
          <div className="progress"><i style={{ width: `${progress * 100}%` }} /></div>
        </div>
        <button className="btn icon ghost" onClick={() => { const v = !voice; setVoice(v); savePref('voice', v); if (!v) speechSynthesis?.cancel(); }}
          aria-label="Guida vocale" title="Guida vocale">{voice ? '🗣️' : '🔇'}</button>
      </div>

      <div className="player-body">
        <div className="block">
          {step.kind === 'prepare' ? 'Preparati' : step.kind === 'rest' ? (step.label || 'Recupero') : (
            <>
              {step.block}
              {step.rounds && step.rounds > 1 ? ` · giro ${step.round}/${step.rounds}` : ''}
              {step.sets && step.sets > 1 ? ` · serie ${step.set}/${step.sets}` : ''}
            </>
          )}
        </div>

        <div className="ex-name">
          {step.kind === 'work' ? step.name : step.kind === 'rest' ? 'Recupera' : 'Si parte tra poco'}
        </div>
        {step.kind === 'work' && step.side && <div className="side">{sideLabel(step.side)}</div>}

        <div className={`player-visual ${ex?.animation && step.kind === 'work' ? 'with-anim' : ''}`}>
        {ex?.animation && step.kind === 'work' && (
          <div className="player-anim"><ExerciseAnimation anim={ex.animation} mirror={step.side === 'destro'} paused={paused} label={`Animazione: ${ex.name}`} /></div>
        )}
        {timed ? (
          <div className="ring">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
              <circle cx="50" cy="50" r={R} fill="none" stroke="var(--cc, var(--teal))" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * frac} style={{ transition: 'stroke-dashoffset 0.2s linear' }} />
            </svg>
            <div className="time" aria-live="off">{fmtClock(left)}</div>
          </div>
        ) : (
          <div className="stack" style={{ alignItems: 'center' }}>
            <div className="reps-big num">{step.kind === 'work' ? step.reps : ''}</div>
            <div className="muted">ripetizioni{step.kind === 'work' && step.side === 'per lato' ? ' per lato' : ''} · <span className="num">{fmtClock(elapsed)}</span></div>
          </div>
        )}
        </div>

        {step.kind === 'work' && <div className="cue">{cue}</div>}
        {step.kind !== 'work' && nextWork && (
          <div className="next-up">Poi: <b>{nextWork.name}</b>{nextWork.side && nextWork.side !== 'per lato' ? ` (${nextWork.side})` : ''} ·{' '}
            {nextWork.mode === 'reps' ? `${nextWork.reps} rip.` : `${nextWork.duration}s`}</div>
        )}
        {step.kind === 'work' && nextWork && <div className="next-up">Dopo: {nextWork.name}</div>}
      </div>

      <div className="stack" style={{ alignItems: 'center' }}>
        <div className="player-controls">
          <button className="btn round" onClick={prev} disabled={i === 0} aria-label="Indietro"><Icon d={I.prev} /></button>
          {timed ? (
            <button className="btn main primary" onClick={togglePause} aria-label={paused ? 'Riprendi' : 'Pausa'}><Icon d={paused ? I.play : I.pause} /></button>
          ) : (
            <button className="btn main primary" onClick={() => advance(true)} aria-label="Fatto"><Icon d={I.check} /></button>
          )}
          <button className="btn round" onClick={skip} aria-label="Salta"><Icon d={I.next} /></button>
        </div>
        <div className="row" style={{ justifyContent: 'center' }}>
          {step.kind === 'rest' && <button className="btn sm" onClick={() => addRest(15)}>+15 s</button>}
          {step.kind === 'work' && ex && <button className="btn sm ghost" onClick={() => { if (!paused && timed) togglePause(); setShowHow(true); }}>Come si fa</button>}
          {paused && <span className="chip warn">In pausa</span>}
        </div>
      </div>

      {showHow && ex && <HowTo ex={ex} onClose={() => setShowHow(false)} />}
      {confirmExit && (
        <Modal title="Interrompere l'allenamento?" onClose={() => setConfirmExit(false)}>
          <div className="stack">
            <p className="muted">Hai completato {doneWork.size} esercizi su {workTotal} ({Math.round(completion * 100)}%). Anche mezza sessione conta: vuoi salvarla?</p>
            <DoneScreen embedded play={play} seconds={activeSec()} completion={completion} planSessionId={planSessionId} breakId={breakId}
              onSaved={() => { toast('Sessione parziale salvata'); navigate(homePath(), { replace: true }); }} onDiscard={leave} />
          </div>
        </Modal>
      )}
    </div>
  );
}

// ------------------------------------------------------------ how-to

export function HowTo({ ex: initial, onClose }: { ex: Exercise; onClose: () => void }) {
  const toast = useToast();
  const [ex, setEx] = useState(initial);
  const [videoInput, setVideoInput] = useState('');
  const [editing, setEditing] = useState(false);
  const embed = ex.video ? youtubeEmbed(ex.video) : null;
  const saveVideo = async (url: string) => {
    try {
      setEx(await api.setExerciseVideo(ex.id, url));
      setEditing(false);
      setVideoInput('');
      toast(url ? 'Video salvato per questo esercizio' : 'Video rimosso');
    } catch (e) {
      toast((e as Error).message);
    }
  };
  return (
    <Modal title={ex.name} sub={[ex.position, ...(ex.targets || [])].filter(Boolean).join(' · ')} onClose={onClose}>
      <div className="stack how">
        {ex.animation && (
          <div className="card flat" style={{ padding: 12 }}>
            <ExerciseAnimation anim={ex.animation} label={`Animazione: ${ex.name}`} />
          </div>
        )}
        {embed && (
          <div className="video-frame"><iframe src={embed} title={`Video: ${ex.name}`} allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen /></div>
        )}
        <p>{ex.description}</p>
        {!!ex.cues?.length && (
          <ul style={{ margin: 0, paddingLeft: 18 }} className="stack tight">
            {ex.cues.map((c) => <li key={c}>{c}</li>)}
          </ul>
        )}
        {ex.easier && <div className="small"><b>Più facile:</b> <span className="muted">{ex.easier}</span></div>}
        {ex.harder && <div className="small"><b>Più difficile:</b> <span className="muted">{ex.harder}</span></div>}
        {ex.caution && <div className="alert small">⚠️ {ex.caution}</div>}
        {ex.equipment?.length ? <div className="faint small">Serve: {ex.equipment.join(', ')}</div> : null}
        {editing ? (
          <div className="row nowrap">
            <input className="input" autoFocus placeholder="Link YouTube del video" value={videoInput} onChange={(e) => setVideoInput(e.target.value)} />
            <button className="btn sm primary" onClick={() => saveVideo(videoInput)} disabled={!videoInput.trim()}>Salva</button>
          </div>
        ) : (
          <div className="row">
            <a className="btn sm" href={youtubeSearch(ex)} target="_blank" rel="noopener">🔎 Cerca un video</a>
            <button className="btn sm ghost" onClick={() => setEditing(true)}>{ex.video ? '✏️ Cambia video' : '＋ Collega un video YouTube'}</button>
            {ex.video && <button className="btn sm ghost" onClick={() => saveVideo('')}>Rimuovi video</button>}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------ done

const EFFORT = ['', 'Riposante', 'Molto facile', 'Facile', 'Leggero', 'Moderato', 'Impegnativo', 'Duro', 'Molto duro', 'Durissimo', 'Massimale'];

function DoneScreen({ play, seconds, completion, planSessionId, breakId, onSaved, onDiscard, embedded = false }: {
  play: Playable; seconds: number; completion: number; planSessionId: string | null; breakId: string | null;
  onSaved: () => void; onDiscard: () => void; embedded?: boolean;
}) {
  const [effort, setEffort] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setBusy(true);
    try {
      await api.addLog({
        programId: play.program.id, sessionId: play.session.id, durationSec: seconds, completion,
        effort, note, planSessionId, breakId,
      });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };
  const form = (
    <div className="stack">
      {error && <div className="alert error">{error}</div>}
      <div className="field">Quanto è stata faticosa? {effort ? <b style={{ color: 'var(--text)' }}>{effort} · {EFFORT[effort]}</b> : null}
        <div className="row" style={{ gap: 6 }}>
          {Array.from({ length: 10 }, (_, k) => k + 1).map((n) => (
            <button key={n} type="button" className={`chip ${effort === n ? 'on' : ''}`} onClick={() => setEffort(n)} style={{ minWidth: 38, justifyContent: 'center', minHeight: 34 }}>{n}</button>
          ))}
        </div>
      </div>
      <label className="field">Note (facoltative)
        <textarea className="input" style={{ minHeight: 70, fontFamily: 'inherit' }} value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Es. spalla destra un po' rigida, pop-up più fluido" />
      </label>
      <div className="row">
        <button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Salvataggio…' : 'Salva'}</button>
        <button className="btn ghost" onClick={onDiscard}>{embedded ? 'Esci senza salvare' : 'Non salvare'}</button>
      </div>
    </div>
  );
  if (embedded) return form;
  return (
    <div className={`player cat-${play.program.category}`} style={{ overflow: 'auto' }}>
      <div style={{ maxWidth: 560, width: '100%', margin: 'auto' }} className="stack">
        <div style={{ fontSize: '3rem' }}>🎉</div>
        <h1>Fatto!</h1>
        <p className="muted">{play.session.title} · {fmtDuration(seconds)} di movimento.</p>
        {form}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ quick break

/** /pausa: opens the next desk routine of the day (or a random one). */
export function QuickBreak() {
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const today = await api.today();
        const open = today.breaks.find((b) => b.status === 'sent') || today.breaks.find((b) => b.status === 'pending');
        if (open) return navigate(`/play/pause-scrivania/${open.sessionId}?b=${open.id}`, { replace: true });
        const program = await api.program('pause-scrivania');
        const s = program.sessions[Math.floor(Math.random() * program.sessions.length)];
        navigate(`/play/pause-scrivania/${s.id}`, { replace: true });
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);
  return <div className="main">{error ? <ErrorBox error={error} /> : <Loading />}</div>;
}
