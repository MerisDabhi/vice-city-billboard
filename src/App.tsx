import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { audio } from './audio';
import { Boot } from './Boot';
import { Home } from './Home';
import { RadioWidget, Stars } from './ui';
import type { SceneId } from './scenes';

const Studio = lazy(() => import('./Studio'));

type View = 'boot' | 'home' | 'studio';
export interface StudioLaunch { scene: SceneId; demo: boolean; key: number }

export default function App() {
  const [view, setView] = useState<View>('boot');
  const [launch, setLaunch] = useState<StudioLaunch>({ scene: 'boulevard', demo: false, key: 0 });
  const [hype, setHype] = useState(0);
  const [editing, setEditing] = useState(false);
  const [wipe, setWipe] = useState<'in' | 'out' | null>(null);
  const wipeTimers = useRef<number[]>([]);

  // Every interactive element gets game-UI sound for free.
  useEffect(() => {
    let last: Element | null = null;
    const over = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const el = (e.target as HTMLElement).closest('button:not(:disabled), a[href], [data-sfx]');
      if (el && el !== last && el.getAttribute('data-sfx') !== 'none') audio.hover();
      last = el;
    };
    const click = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest('button:not(:disabled), a[href]');
      if (!el) return;
      const kind = el.getAttribute('data-sfx');
      if (kind === 'none') return;
      if (kind === 'select') audio.select(); else if (kind === 'back') audio.back(); else audio.click();
    };
    document.addEventListener('pointerover', over);
    document.addEventListener('click', click, true);
    return () => { document.removeEventListener('pointerover', over); document.removeEventListener('click', click, true); };
  }, []);

  const transition = useCallback((fn: () => void) => {
    wipeTimers.current.forEach(clearTimeout);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { fn(); return; }
    audio.whoosh(0.7);
    setWipe('in');
    wipeTimers.current = [
      window.setTimeout(() => { fn(); window.scrollTo(0, 0); setWipe('out'); }, 620),
      window.setTimeout(() => setWipe(null), 1350),
    ];
  }, []);

  const openStudio = useCallback((scene: SceneId = 'boulevard', demo = false) => {
    transition(() => { setLaunch(l => ({ scene, demo, key: l.key + 1 })); setHype(0); setView('studio'); });
  }, [transition]);
  const goHome = useCallback(() => { transition(() => { setView('home'); setHype(0); setEditing(false); audio.setMood('open'); }); }, [transition]);

  return <>
    {view === 'boot' && <Boot onEnter={() => setView('home')} />}
    {view === 'home' && <Home onStart={openStudio} />}
    {view === 'studio' && <Suspense fallback={<div className="studio-fallback" />}>
      <Studio key={launch.key} initialScene={launch.scene} demo={launch.demo} onExit={goHome} onRestart={() => openStudio(launch.scene)} onHype={setHype} onEditing={setEditing} />
    </Suspense>}
    {view !== 'boot' && <>
      <div className={`hud-top ${view === 'studio' ? 'hud-top--studio' : ''}`}><Stars count={hype} /></div>
      <RadioWidget compact={view === 'studio'} left={editing} />
    </>}
    <div className="film-grain" aria-hidden="true" />
    {wipe && <div className={`wipe wipe--${wipe}`} aria-hidden="true">
      <span /><span /><span />
      <div className="wipe-loading"><i /> LOADING</div>
    </div>}
  </>;
}
