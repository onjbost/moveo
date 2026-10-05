import { useEffect, useMemo, useRef, useState } from 'react';
import { body, poseAt, primPath, viewBox, type Animation } from '../animCore';

const OUTLINE = 2.3; // visible outline width (half of the dark stroke stays under the white fill)

/**
 * Looping line-art demo of an exercise (black outline, white body, like an exercise poster).
 * `mirror` flips it for the other side; `speed` < 1 slows it down.
 */
export function ExerciseAnimation({ anim, mirror = false, paused = false, speed = 1, className = '', label }: {
  anim: Animation; mirror?: boolean; paused?: boolean; speed?: number; className?: string; label?: string;
}) {
  const [t, setT] = useState(0.0001);
  const start = useRef(performance.now());
  const vb = useMemo(() => viewBox(anim), [anim]);
  const reduce = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);

  useEffect(() => {
    if (paused || reduce) return;
    let raf = 0;
    const loop = (now: number) => {
      setT(((now - start.current) / (anim.duration / speed)) % 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [anim, paused, speed, reduce]);

  const pose = poseAt(anim, t);
  const groups = body(pose, anim.alternate ? poseAt(anim, t + 0.5).armN : undefined);
  return (
    <div className={`ex-anim-wrap ${className}`}>
      <svg className="ex-anim" viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} role="img" aria-label={label || "Animazione dell'esercizio"}
        style={mirror ? { transform: 'scaleX(-1)' } : undefined}>
        {anim.surface === 'water' || anim.surface === 'board' ? (
          <>
            {anim.surface === 'water' && <path className="ex-water" d={`M${vb.x},4 ${Array.from({ length: 12 }, (_, i) => `q${vb.w / 24},${i % 2 ? 4 : -4} ${vb.w / 12},0`).join(' ')}`} />}
            <rect className="ex-board" x={-95} y={-2} width={175} height={7} rx={3.5} />
          </>
        ) : <line x1={vb.x + 8} x2={vb.x + vb.w - 8} y1={1.5} y2={1.5} className="ex-ground" />}
        {groups.map((g, i) => {
          return (
            <g key={i}>
              {/* each primitive is its own subpath: the dark pass outlines the union, the fill pass hides inner edges */}
              {g.prims.map((pr, k) => <path key={`o${k}`} d={primPath(pr)} className="ex-ol" strokeWidth={OUTLINE * 2} />)}
              {g.prims.map((pr, k) => <path key={`f${k}`} d={primPath(pr)} className={g.far ? 'ex-fill far' : 'ex-fill'} />)}
              {g.details?.map((dt, k) => <path key={`d${k}`} d={dt.d} className={dt.fill ? 'ex-hair' : 'ex-line'} />)}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
