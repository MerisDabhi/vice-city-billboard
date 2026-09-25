import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ChevronLeft, ChevronRight, Radio, Volume2, VolumeX } from 'lucide-react';
import { audio, stations } from './audio';
import { posterUrl } from './posters';
import type { PosterId } from './posters';
import { renderScene, scenes } from './scenes';
import type { CityScene, SceneId } from './scenes';

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let audioVersion = 0;
audio.subscribe(() => { audioVersion++; });
export function useAudio() {
  useSyncExternalStore(fn => audio.subscribe(fn), () => audioVersion);
  return audio;
}

export function usePoster(id: PosterId, portrait = false) {
  const [url, setUrl] = useState('');
  useEffect(() => { let alive = true; void posterUrl(id, portrait).then(u => { if (alive) setUrl(u); }); return () => { alive = false; }; }, [id, portrait]);
  return url;
}

export function Brand({ onClick, small }: { onClick?: () => void; small?: boolean }) {
  return <button className={`brand ${small ? 'brand--small' : ''}`} aria-label="Vice City Billboard Takeover — home" onClick={onClick}>
    <span className="brand-script">Vice City</span>
    <span className="brand-sub">Billboard Takeover</span>
  </button>;
}

const renderCache = new Map<string, Promise<HTMLCanvasElement>>();
function cachedRender(scene: CityScene, artwork: string, fit: 'contain' | 'cover') {
  const key = `${scene.id}|${fit}|${artwork.length}|${artwork.slice(-96)}`;
  let p = renderCache.get(key);
  if (!p) {
    const buffer = document.createElement('canvas');
    p = renderScene(scene, artwork, buffer, fit).then(() => buffer);
    p.catch(() => renderCache.delete(key));
    renderCache.set(key, p);
    if (renderCache.size > 16) renderCache.delete(renderCache.keys().next().value!);
  }
  return p;
}

export function SceneCanvas({ scene, artwork, className = '', fit = 'contain', onReady, onError, label }: {
  scene: CityScene; artwork: string; className?: string; fit?: 'contain' | 'cover';
  onReady?: (canvas: HTMLCanvasElement) => void; onError?: (message: string) => void; label?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(onReady), errorRef = useRef(onError);
  readyRef.current = onReady; errorRef.current = onError;
  useEffect(() => {
    if (!artwork) return;
    let alive = true;
    setReady(false);
    cachedRender(scene, artwork, fit).then(buffer => {
      if (!alive || !ref.current) return;
      ref.current.width = buffer.width; ref.current.height = buffer.height;
      ref.current.getContext('2d')!.drawImage(buffer, 0, 0);
      setReady(true); readyRef.current?.(ref.current);
    }).catch((e: Error) => { if (alive) errorRef.current?.(e.message); });
    return () => { alive = false; };
  }, [scene, artwork, fit]);
  return <div className={`scene-canvas ${className} ${ready ? 'is-ready' : ''}`}>
    <img src={`/images/${scene.id}.webp`} alt="" aria-hidden="true" draggable={false} />
    <canvas ref={ref} role="img" aria-label={label ?? `Artwork on the ${scene.type.toLowerCase()} at ${scene.title}`} />
  </div>;
}

export function Stars({ count, label = 'Hype' }: { count: number; label?: string }) {
  const prev = useRef(count);
  const [flash, setFlash] = useState<number[]>([]);
  useEffect(() => {
    if (count > prev.current) {
      const gained = Array.from({ length: count - prev.current }, (_, i) => prev.current + i);
      setFlash(gained);
      gained.forEach((g, i) => window.setTimeout(() => audio.star(g), i * 140));
      const t = window.setTimeout(() => setFlash([]), 1600);
      prev.current = count;
      return () => window.clearTimeout(t);
    }
    prev.current = count;
  }, [count]);
  return <div className="hud-stars" role="img" aria-label={`${label} level ${count} of 5`}>
    <span className="hud-stars-label">{label}</span>
    <span className="hud-stars-row">{[0, 1, 2, 3, 4].map(i => <svg key={i} viewBox="0 0 24 24" className={`${i < count ? 'on' : ''} ${flash.includes(i) ? 'flash' : ''}`} style={{ animationDelay: `${flash.indexOf(i) * 140}ms` }}><path d="M12 1.8l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.9l-6.4 3.5L7 14.3l-5.3-5 7.2-.9z" /></svg>)}</span>
  </div>;
}

function Equalizer({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active) return;
    let raf = 0; const data = new Uint8Array(32);
    const loop = () => {
      const bars = ref.current?.children;
      if (bars && audio.analyser) {
        audio.analyser.getByteFrequencyData(data);
        for (let i = 0; i < bars.length; i++) (bars[i] as HTMLElement).style.transform = `scaleY(${Math.max(0.08, data[i * 2 + 1] / 255)})`;
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return <div className="eq" ref={ref} aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <span key={i} />)}</div>;
}

export function RadioWidget({ compact, left }: { compact?: boolean; left?: boolean }) {
  const a = useAudio();
  const [wheel, setWheel] = useState(false);
  const s = a.station;
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable="true"], iframe')) return;
      if (e.key === 'm' || e.key === 'M') a.setMuted(!a.muted);
      if (e.key === 'q' || e.key === 'Q') setWheel(w => !w);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [a]);
  return <>
    <div className={`radio ${compact ? 'radio--compact' : ''} ${left ? 'radio--left' : ''} ${a.playing ? 'is-on' : ''}`} style={{ '--station': s.color } as CSSProperties}>
      <button className="radio-badge" onClick={() => setWheel(true)} aria-label="Open radio station wheel (Q)" data-sfx="select">
        <Radio size={16} />
        <span className="radio-freq">{a.playing ? s.freq : 'OFF'}</span>
      </button>
      <div className="radio-info">
        <span className="radio-name">{a.playing ? s.name : 'Radio off'}</span>
        <span className="radio-track">{a.playing ? <>♪ {a.trackName}</> : 'Press Q to tune in'}</span>
      </div>
      <Equalizer active={a.playing && !a.muted} />
      <div className="radio-controls">
        <button aria-label="Previous station" onClick={() => a.nextStation(-1)} data-sfx="none"><ChevronLeft size={16} /></button>
        <button aria-label="Next station" onClick={() => a.nextStation(1)} data-sfx="none"><ChevronRight size={16} /></button>
        <button aria-label={a.muted ? 'Unmute (M)' : 'Mute (M)'} aria-pressed={a.muted} onClick={() => a.setMuted(!a.muted)}>{a.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
      </div>
    </div>
    {wheel && <RadioWheel onClose={() => setWheel(false)} />}
  </>;
}

function RadioWheel({ onClose }: { onClose: () => void }) {
  const a = useAudio();
  const [hover, setHover] = useState<number | null>(null);
  const items = [...stations.map((s, i) => ({ label: s.name, freq: s.freq, color: s.color, genre: s.genre, index: i })), { label: 'RADIO OFF', freq: '—', color: '#8b8195', genre: 'Silence is golden', index: -1 }];
  const current = a.playing ? a.stationIndex : -1;
  const shown = items.find(i => i.index === (hover ?? current))!;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button.selected')?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [onClose]);
  const choose = (index: number) => { if (index === -1) a.stopRadio(); else a.startRadio(index); onClose(); };
  return <div className="wheel-backdrop" onClick={onClose}>
    <div className="wheel" ref={ref} role="dialog" aria-modal="true" aria-label="Radio stations" onClick={e => e.stopPropagation()}>
      {items.map((it, i) => {
        const angle = (i / items.length) * 360 - 90;
        return <button key={it.label} className={`wheel-item ${it.index === current ? 'selected' : ''}`} style={{ '--a': `${angle}deg`, '--c': it.color } as CSSProperties}
          onMouseEnter={() => setHover(it.index)} onFocus={() => setHover(it.index)} onMouseLeave={() => setHover(null)} onClick={() => choose(it.index)} data-sfx="none">
          <span className="wheel-freq">{it.freq}</span><span className="wheel-label">{it.label}</span>
        </button>;
      })}
      <div className="wheel-center" style={{ '--c': shown.color } as CSSProperties}>
        <span className="wheel-center-freq">{shown.freq}</span>
        <strong>{shown.label}</strong>
        <small>{shown.genre}</small>
      </div>
    </div>
    <p className="wheel-hint">Click a station · <kbd>Esc</kbd> to close · <kbd>M</kbd> mutes</p>
  </div>;
}

export function Minimap({ onPick }: { onPick: (id: SceneId) => void }) {
  return <div className="minimap" aria-label="City map">
    <svg viewBox="0 0 100 100" className="minimap-map" aria-hidden="true">
      <defs>
        <radialGradient id="mm-sea" cx="0.2" cy="0.5"><stop offset="0" stopColor="#1f6f8b" /><stop offset="1" stopColor="#0b2d45" /></radialGradient>
      </defs>
      <rect width="100" height="100" fill="url(#mm-sea)" />
      <path d="M22 -5 C30 20 18 40 26 60 C32 78 24 92 30 110 L110 110 L110 -5 Z" fill="#26324a" />
      <path d="M8 20 C14 26 12 34 8 40 C4 34 3 26 8 20Z M10 62 C16 66 15 72 10 76 C6 72 6 66 10 62Z" fill="#2c3a52" />
      <path d="M40 10 C50 22 44 34 60 40 L80 30" stroke="#3b4a68" strokeWidth="1.2" fill="none" />
      <g stroke="#56617f" strokeWidth="1.6" fill="none" strokeLinecap="round">
        <path d="M30 0 L34 100" /><path d="M52 0 L50 100" /><path d="M74 0 L76 100" />
        <path d="M24 22 L100 18" /><path d="M26 48 L100 50" /><path d="M28 76 L100 80" />
        <path d="M8 40 L26 48" strokeDasharray="2 2" />
      </g>
      <rect x="56" y="54" width="14" height="10" rx="2" fill="#2f5a43" />
    </svg>
    {scenes.map(s => <button key={s.id} className="blip" style={{ left: `${s.map[0]}%`, top: `${s.map[1]}%`, '--c': s.color } as CSSProperties} onClick={() => onPick(s.id)} aria-label={`Take over ${s.title}`} data-sfx="select">
      <span className="blip-dot" /><span className="blip-label">{s.title}</span>
    </button>)}
    <span className="minimap-player" aria-hidden="true" />
    <span className="minimap-n" aria-hidden="true">N</span>
  </div>;
}

export function Kbd({ children }: { children: ReactNode }) { return <kbd className="kbd">{children}</kbd>; }
