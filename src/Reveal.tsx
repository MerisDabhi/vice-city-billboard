import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audio } from './audio';
import { posterUrl } from './posters';
import { isPortrait, renderScene, sceneFocus } from './scenes';
import type { CityScene } from './scenes';
import { SceneCanvas, reducedMotion } from './ui';

// dark → approach (rival ad up) → hijack (glitch + hack HUD) → live (your art) → confirmed (city reacts) → legend → exit
type Phase = 'dark' | 'approach' | 'hijack' | 'live' | 'confirmed' | 'legend' | 'exit';
const order: Phase[] = ['dark', 'approach', 'hijack', 'live', 'confirmed', 'legend', 'exit'];

const reactionLines = [
  ['sunsetsofia', 'who did this?? 😭'],
  ['causeway_carl', 'LOOK UP 🔥🔥'],
  ['velvet.door', 'the whole block is filming'],
  ['rico.vicewave', 'ok this is going viral'],
  ['lil.havana', 'absolute legend 👑'],
];

function Typewriter({ text, start }: { text: string; start: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!start) return;
    if (reducedMotion()) { setN(text.length); return; }
    let i = 0;
    const t = window.setInterval(() => { i++; setN(i); if (i % 2 === 0) audio.typeKey(); if (i >= text.length) window.clearInterval(t); }, 26);
    return () => window.clearInterval(t);
  }, [text, start]);
  return <>{text.slice(0, n)}<span className="caret" /></>;
}

/** Eases from whatever it currently shows to the new target, so each reaction visibly adds to the total. */
function Rolling({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now(), a = from.current, dur = 520; let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur), v = Math.round(a + (value - a) * (1 - (1 - p) ** 3));
      setShown(v); from.current = v;
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{shown.toLocaleString('en-US')}</>;
}

function Stars({ count }: { count: number }) {
  return <span className="complete-stars" aria-label={`${count} stars`}>{[0, 1, 2, 3, 4].map(i => <svg key={i} viewBox="0 0 24 24" className={i < count ? 'on' : ''}><path d="M12 1.8l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.9l-6.4 3.5L7 14.3l-5.3-5 7.2-.9z" /></svg>)}</span>;
}

export function Reveal({ scene, artwork, demo, onDone }: { scene: CityScene; artwork: string; demo: boolean; onDone: (hype: number) => void }) {
  const [userReady, setUserReady] = useState(false);
  const [rival, setRival] = useState('');
  const [phase, setPhase] = useState<Phase>('dark');
  const [stars, setStars] = useState(0);
  const [hack, setHack] = useState(0);
  const [hype, setHype] = useState(0);
  const [reactions, setReactions] = useState<number[]>([]);
  const finished = useRef(false);
  const focus = sceneFocus(scene);

  // Total HYPE (e.g. 1,250) split across five crowd reactions so the score climbs as the city reacts.
  const plan = useMemo(() => {
    const total = Math.round((1000 + Math.random() * 600) / 50) * 50;
    const weights = reactionLines.map(() => 0.6 + Math.random());
    const sum = weights.reduce((a, b) => a + b, 0);
    const parts = weights.map(w => Math.round((w / sum) * total / 25) * 25);
    parts[parts.length - 1] += total - parts.reduce((a, b) => a + b, 0);
    return { total, parts, spots: reactionLines.map((_, i) => ({ x: [10, 64, 22, 72, 40][i] + Math.random() * 8, y: [64, 60, 72, 70, 66][i] + Math.random() * 6 })) };
  }, []);
  // Phone camera flashes popping across the crowd.
  const flashes = useMemo(() => Array.from({ length: 16 }, () => ({ x: 4 + Math.random() * 92, y: 58 + Math.random() * 30, d: Math.random() * 2.8, s: 0.6 + Math.random() * 0.8 })), []);
  const quad = scene.corners.map(([x, y]) => `${(x / 15.36).toFixed(2)}% ${(y / 10.24).toFixed(2)}%`).join(', ');
  const hackId = useMemo(() => Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0'), []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true; audio.setMood('open'); onDone(plan.total);
  }, [onDone, plan.total]);

  // The sign's current ad: a corporate cola ad (or, in the trailer, whatever was up before).
  useEffect(() => {
    let alive = true;
    (async () => {
      const art = await posterUrl('rival', isPortrait(scene));
      const c = document.createElement('canvas');
      await renderScene(scene, art, c, 'contain');
      if (alive) setRival(c.toDataURL('image/jpeg', 0.9));
    })().catch(() => { if (alive) setRival(`/images/${scene.id}.webp`); });
    return () => { alive = false; };
  }, [scene]);

  const ready = userReady && !!rival;
  useEffect(() => {
    if (!ready) return;
    if (reducedMotion()) {
      setPhase('legend'); setStars(5); setHype(plan.total); setReactions([0, 1, 2, 3, 4]); audio.takeoverSting();
      const t = window.setTimeout(finish, 3200); return () => window.clearTimeout(t);
    }
    audio.setMood('cutscene');
    audio.riser(3.8);
    const at = (ms: number, fn: () => void) => window.setTimeout(fn, ms);
    const timers = [
      at(250, () => setPhase('approach')),
      at(2600, () => { setPhase('hijack'); audio.tuneStatic(0.5); audio.glitch(0.5); if (scene.surface === 'banner') audio.propeller(1.8); }),
      ...Array.from({ length: 11 }, (_, i) => at(2750 + i * 90, () => { setHack(Math.min(100, Math.round((i + 1) * 9.1))); audio.hackBeep(i); if (i % 4 === 2) audio.glitch(0.12); })),
      at(3760, () => { setHack(100); audio.accessGranted(); }),
      at(3980, () => { setPhase('live'); audio.impact(); }),
      at(4550, () => { setPhase('confirmed'); audio.takeoverSting(); audio.setMood('open'); audio.crowdCheer(3.4); }),
      ...[0, 1, 2, 3, 4].map(i => at(4900 + i * 150, () => setStars(i + 1))),
      ...flashes.map(f => at(4700 + f.d * 1000, () => { if (Math.random() > 0.35) audio.snap(); })),
      ...plan.parts.map((amount, i) => at(5250 + i * 400, () => { setReactions(r => [...r, i]); setHype(h => h + amount); audio.pop(i); })),
      at(7500, () => { setPhase('legend'); audio.rankUp(); }),
      at(9900, () => { setPhase('exit'); audio.whoosh(0.7); }),
      at(10450, finish),
    ];
    return () => timers.forEach(clearTimeout);
  }, [ready, finish, scene.surface, flashes, plan]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ([' ', 'Enter', 'Escape'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); finish(); } };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [finish]);
  useEffect(() => { if (stars > 0) audio.star(stars - 1); }, [stars]);

  const past = (p: Phase) => order.indexOf(phase) >= order.indexOf(p);
  const classes = ['reveal', `reveal--${phase}`, scene.surface === 'banner' ? 'reveal--banner' : '', past('live') ? 'is-live' : '', past('confirmed') ? 'is-reacting' : ''].join(' ');

  return <div className={classes} onClick={finish} role="dialog" aria-label="Your takeover is going live" style={{ '--fx': `${focus.x}%`, '--fy': `${focus.y}%`, '--quad': `polygon(${quad})` } as CSSProperties}>
    <div className="reveal-camera">
      <div className="reveal-stage">
        {rival && <img className="stage-rival" src={rival} alt="" draggable={false} />}
        {rival && <div className="stage-hijack" aria-hidden="true">
          <img className="hj hj--r" src={rival} alt="" /><img className="hj hj--c" src={rival} alt="" />
          <span className="hj-noise" /><span className="hj-tear" />
        </div>}
        <SceneCanvas scene={scene} artwork={artwork} fit="contain" className="stage-user" onReady={() => setUserReady(true)} onError={finish} />
      </div>
    </div>
    <div className="reveal-grade" aria-hidden="true" />
    {past('confirmed') && <div className="crowd-flashes" aria-hidden="true">{flashes.map((f, i) => <i key={i} style={{ left: `${f.x}%`, top: `${f.y}%`, animationDelay: `${f.d}s`, '--s': f.s } as CSSProperties} />)}</div>}
    <div className="reveal-flash" aria-hidden="true" />
    <div className="letterbox letterbox--top" aria-hidden="true" /><div className="letterbox letterbox--bottom" aria-hidden="true" />

    {(phase === 'hijack' || phase === 'live') && <div className={`hijack-hud hijack-hud--${focus.x > 50 ? 'left' : 'right'} ${hack >= 100 ? 'is-granted' : ''}`} aria-live="polite">
      <span className="hh-warn">⚠ Signal intercepted</span>
      <strong>{hack >= 100 ? 'Access granted' : 'Hijacking feed'}</strong>
      <span className="hh-bar"><i style={{ width: `${hack}%` }} /></span>
      <small>{scene.type} · {scene.title} · node 0x{hackId} · {hack}%</small>
    </div>}

    <div className="reveal-location" aria-hidden={phase === 'dark'}>
      <span className="reveal-loc-script">{scene.district}</span>
      <strong>{scene.title}</strong>
      <small>Vice City · {scene.time}</small>
    </div>

    <p className="subtitle" aria-live="polite">
      {(phase === 'approach' || phase === 'hijack') && <><b style={{ color: audio.station.color }}>DJ Rico, {audio.station.name} {audio.station.freq}:</b> <Typewriter text={`Uh… folks? Something’s happening to the ${scene.type.toLowerCase()} on ${scene.title}. Is somebody… hijacking it?`} start /></>}
    </p>

    {past('confirmed') && <div className="reactions" aria-hidden="true">
      {reactions.map(i => <div key={i} className="reaction" style={{ left: `${plan.spots[i].x}%`, top: `${plan.spots[i].y}%` }}>
        <span className="reaction-user"><i />{reactionLines[i][0]}</span>
        <span className="reaction-text">{reactionLines[i][1]}</span>
        <span className="reaction-hype">+{plan.parts[i].toLocaleString('en-US')} hype</span>
      </div>)}
    </div>}

    {past('confirmed') && <div className="complete" aria-live="assertive">
      <div className="complete-band">
        <span className="complete-script">{demo ? 'coming soon to' : 'the city reacts'}</span>
        <h2 className="complete-title">{demo ? 'Your art here' : 'Takeover confirmed'}</h2>
        <div className="complete-stats">
          <Stars count={stars} />
          <span className="complete-num hype-num">+<Rolling value={hype} /> <small>hype</small></span>
        </div>
        {past('legend') && <div className="status-stamp">
          <small>Status</small>
          <strong>{demo ? 'Next legend: you' : 'City legend'}</strong>
        </div>}
      </div>
    </div>}

    <button className="skip" onClick={e => { e.stopPropagation(); finish(); }} data-sfx="none">Skip <kbd>Space</kbd></button>
  </div>;
}
