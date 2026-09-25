import { useEffect, useRef, useState } from 'react';
import { Headphones } from 'lucide-react';
import { audio } from './audio';
import { useAudio } from './ui';

export function Boot({ onEnter }: { onEnter: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const done = useRef(false);
  const a = useAudio();
  // VICE WAVE is queued on arrival; it plays as soon as the browser allows sound.
  useEffect(() => { audio.autoplay(); }, []);
  useEffect(() => {
    const enter = (e: Event) => {
      if (done.current) return;
      if (e instanceof KeyboardEvent && ['Tab', 'Shift', 'Alt', 'Control', 'Meta'].includes(e.key)) return;
      done.current = true;
      audio.unlock();
      audio.impact();
      if (!audio.playing) audio.startRadio(0);
      setLeaving(true);
      window.setTimeout(onEnter, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1100);
    };
    window.addEventListener('keydown', enter);
    window.addEventListener('pointerdown', enter);
    window.addEventListener('touchend', enter);
    return () => { window.removeEventListener('keydown', enter); window.removeEventListener('pointerdown', enter); window.removeEventListener('touchend', enter); };
  }, [onEnter]);

  return <div className={`boot ${leaving ? 'boot--leaving' : ''}`} role="dialog" aria-label="Title screen">
    <div className="boot-bg" aria-hidden="true" />
    <div className="boot-sun" aria-hidden="true" />
    <div className="boot-lockup">
      <span className="boot-kicker">A fan-made creative experience</span>
      <h1 className="boot-logo"><span className="boot-script">Vice City</span><span className="boot-title">Billboard<br />Takeover</span></h1>
    </div>
    <button className="boot-enter" data-sfx="none" autoFocus>
      <span className="boot-enter-main">Press any key</span>
      <span className="boot-enter-sub">or tap to enter the city</span>
    </button>
    {a.running && a.playing && !a.muted
      ? <p className="boot-tip boot-tip--live"><span className="boot-eq" aria-hidden="true"><i /><i /><i /><i /></span> Now playing · {a.station.name} {a.station.freq} — {a.trackName}</p>
      : <p className="boot-tip"><Headphones size={16} /> Sound on — press any key and VICE WAVE 88.1 drops the beat.</p>}
    <p className="boot-legal">Set in a fictional city. Original art, music and characters. Not affiliated with or endorsed by Rockstar Games or Take-Two Interactive.</p>
  </div>;
}
