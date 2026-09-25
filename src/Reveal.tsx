import type { CSSProperties } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { audio } from './audio';
import { sceneFocus } from './scenes';
import type { CityScene } from './scenes';
import { SceneCanvas, reducedMotion } from './ui';

type Phase = 'dark' | 'approach' | 'flicker' | 'live' | 'complete';

function Typewriter({ text, start }: { text: string; start: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!start) return;
    if (reducedMotion()) { setN(text.length); return; }
    let i = 0;
    const t = window.setInterval(() => { i++; setN(i); if (i % 2 === 0) audio.typeKey(); if (i >= text.length) window.clearInterval(t); }, 28);
    return () => window.clearInterval(t);
  }, [text, start]);
  return <>{text.slice(0, n)}<span className="caret" /></>;
}

function Counter({ to, run }: { to: number; run: boolean }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    const start = performance.now(), dur = 1300; let raf = 0;
    const step = (now: number) => { const p = Math.min(1, (now - start) / dur); setV(Math.round(to * (1 - (1 - p) ** 3))); if (p < 1) raf = requestAnimationFrame(step); else audio.cash(); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, run]);
  return <>{v.toLocaleString('en-US')}</>;
}

export function Reveal({ scene, artwork, demo, onDone }: { scene: CityScene; artwork: string; demo: boolean; onDone: () => void }) {
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<Phase>('dark');
  const [stars, setStars] = useState(0);
  const finished = useRef(false);
  const impressions = useRef(900_000 + Math.floor(Math.random() * 700_000));
  const focus = sceneFocus(scene);
  const finish = useCallback(() => { if (finished.current) return; finished.current = true; audio.setMood('open'); onDone(); }, [onDone]);

  useEffect(() => {
    if (!ready) return;
    if (reducedMotion()) { setPhase('complete'); setStars(5); audio.takeoverSting(); const t = window.setTimeout(finish, 2500); return () => window.clearTimeout(t); }
    audio.setMood('cutscene');
    audio.riser(3.4);
    const at = (ms: number, fn: () => void) => window.setTimeout(fn, ms);
    const timers = [
      at(250, () => setPhase('approach')),
      at(2700, () => { setPhase('flicker'); if (scene.surface === 'banner') audio.propeller(1.6); else audio.neonFlicker(1.05); }),
      at(3750, () => { setPhase('live'); audio.impact(); }),
      at(4300, () => { setPhase('complete'); audio.takeoverSting(); audio.setMood('open'); }),
      ...[0, 1, 2, 3, 4].map(i => at(5000 + i * 170, () => setStars(i + 1))),
      at(9400, finish),
    ];
    return () => timers.forEach(clearTimeout);
  }, [ready, finish, scene.surface]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ([' ', 'Enter', 'Escape'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); finish(); } };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [finish]);

  useEffect(() => { if (stars > 0) audio.star(stars - 1); }, [stars]);

  return <div className={`reveal reveal--${phase} ${scene.surface === 'banner' ? 'reveal--banner' : ''}`} onClick={finish} role="dialog" aria-label="Your takeover is going live" style={{ '--fx': `${focus.x}%`, '--fy': `${focus.y}%` } as CSSProperties}>
    <div className="reveal-camera">
      <SceneCanvas scene={scene} artwork={artwork} fit="contain" className="reveal-scene" onReady={() => setReady(true)} onError={finish} />
    </div>
    <div className="reveal-grade" aria-hidden="true" />
    <div className="reveal-flash" aria-hidden="true" />
    <div className="letterbox letterbox--top" aria-hidden="true" /><div className="letterbox letterbox--bottom" aria-hidden="true" />

    <div className="reveal-location" aria-hidden={phase === 'dark'}>
      <span className="reveal-loc-script">{scene.district}</span>
      <strong>{scene.title}</strong>
      <small>Vice City · {scene.time}</small>
    </div>

    <p className="subtitle" aria-live="polite">
      {(phase === 'approach' || phase === 'flicker') && <><b style={{ color: audio.station.color }}>DJ Rico, {audio.station.name} {audio.station.freq}:</b> <Typewriter text={scene.subtitle} start /></>}
    </p>

    {phase === 'complete' && <div className="complete" aria-live="assertive">
      <div className="complete-band">
        <span className="complete-script">{demo ? 'coming soon to' : 'the city is yours'}</span>
        <h2 className="complete-title">{demo ? 'Your art here' : 'Takeover complete'}</h2>
        <div className="complete-stats">
          <span className="complete-stars" aria-label={`${stars} stars`}>{[0, 1, 2, 3, 4].map(i => <svg key={i} viewBox="0 0 24 24" className={i < stars ? 'on' : ''}><path d="M12 1.8l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.9l-6.4 3.5L7 14.3l-5.3-5 7.2-.9z" /></svg>)}</span>
          <span className="complete-num">+<Counter to={impressions.current} run={stars >= 5} /> <small>impressions tonight</small></span>
        </div>
      </div>
    </div>}

    <button className="skip" onClick={e => { e.stopPropagation(); finish(); }} data-sfx="none">Skip <kbd>Space</kbd></button>
  </div>;
}
