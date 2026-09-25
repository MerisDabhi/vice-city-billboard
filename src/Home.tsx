import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowRight, Crop, Eye, MapPin, Play, Radio, Sparkles, Type, Upload, Wand2 } from 'lucide-react';
import { audio, stations } from './audio';
import { posterUrl } from './posters';
import type { PosterId } from './posters';
import { isPortrait, renderScene, sceneFocus, scenes } from './scenes';
import type { SceneId } from './scenes';
import { Brand, Kbd, Minimap, SceneCanvas, useAudio, usePoster } from './ui';

const heroRotation: { id: PosterId; name: string }[] = [
  { id: 'hero', name: 'Make Your Mark' },
  { id: 'music', name: 'Neon Heartbreak' },
  { id: 'nightclub', name: 'Afterhours' },
  { id: 'car-meet', name: 'Midnight Run' },
];

const collage: [SceneId, PosterId][] = [
  ['boulevard', 'hero'], ['causeway', 'music'], ['nightclub', 'nightclub'], ['drivein', 'car-meet'],
  ['plane', 'custom'], ['busstop', 'music'], ['taxi', 'nightclub'], ['storefront', 'business'],
];

const headlines = [
  'Banner plane over Vice Beach causes “the best kind of traffic jam” on the sand',
  'Sunset Drive-In crowd cheers louder for the ad than the movie',
  'Mysterious new ads spotted over Ocean Drive — locals “can’t stop looking”',
  'Line outside The Velvet reaches record length after mega-screen takeover',
  'Coco Beach Surf Co. credits billboard for “insane” weekend',
  'Traffic on Starfish Causeway at standstill as drivers stop to stare',
  'City council: “We have no idea who approved these, but they slap”',
  'Palm Boulevard marquee now the most photographed sign in Little Havana',
];

function HeroScene({ onIndex }: { onIndex: (i: number) => void }) {
  const [frames, setFrames] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    let alive = true;
    (async () => {
      for (const p of heroRotation) {
        const art = await posterUrl(p.id);
        const c = document.createElement('canvas');
        await renderScene(scenes[0], art, c, 'cover');
        if (!alive) return;
        const url = c.toDataURL('image/jpeg', 0.9);
        setFrames(f => [...f, url]);
      }
    })().catch(() => { /* keep the plain scene */ });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (frames.length < 2) return;
    const t = window.setInterval(() => { setIndex(i => (i + 1) % frames.length); audio.neonFlicker(0.35); }, 6000);
    return () => window.clearInterval(t);
  }, [frames.length]);
  useEffect(() => { onIndex(index); }, [index, onIndex]);
  return <div className="hero-scene" aria-hidden="true">
    <img src="/images/boulevard.webp" alt="" className="hero-frame is-base" />
    {frames.map((f, i) => <img key={i} src={f} alt="" className={`hero-frame ${i === index ? 'is-on' : ''}`} />)}
  </div>;
}

function CollagePanel({ id, poster, index, onPick }: { id: SceneId; poster: PosterId; index: number; onPick: (id: SceneId) => void }) {
  const scene = scenes.find(s => s.id === id)!;
  const art = usePoster(poster, isPortrait(scene));
  const eyes = scene.eyes;
  return <button className={`panel panel--${index + 1}`} onClick={() => onPick(id)} style={{ '--c': scene.color, '--fx': `${sceneFocus(scene).x}%`, '--fy': `${sceneFocus(scene).y}%` } as CSSProperties} data-sfx="select">
    <div className="panel-art">{art ? <SceneCanvas scene={scene} artwork={art} fit="cover" /> : <img src={`/images/${id}.webp`} alt="" />}</div>
    <div className="panel-tag"><span>0{index + 1}</span>{scene.type}</div>
    <div className="panel-info">
      <h3>{scene.title}</h3>
      <p className="panel-district"><MapPin size={14} /> {scene.district} · {scene.time}</p>
      <p className="panel-desc">{scene.description}</p>
      <span className="panel-stat"><Eye size={14} /> {eyes} daily eyes</span>
      <span className="panel-go">Claim this spot <ArrowRight size={16} /></span>
    </div>
  </button>;
}

export function Home({ onStart }: { onStart: (scene?: SceneId, demo?: boolean) => void }) {
  const a = useAudio();
  const [now, setNow] = useState(0);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON' && (e.target as HTMLElement).tagName !== 'A') onStart(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onStart]);

  return <div className="home">
    <header className="site-header">
      <Brand onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
      <nav aria-label="Main navigation">
        <a href="#spots">The spots</a><a href="#missions">How it works</a><a href="#radio">Radio</a>
      </nav>
    </header>

    <main id="main">
      <section className="hero" aria-labelledby="hero-title">
        <HeroScene onIndex={setNow} />
        <div className="hero-grade" aria-hidden="true" />
        <div className="letterbox letterbox--top" aria-hidden="true" /><div className="letterbox letterbox--bottom" aria-hidden="true" />
        <div className="hero-content">
          <p className="kicker"><span className="kicker-dot" /> Welcome to Vice City</p>
          <h1 id="hero-title" className="hero-title">
            <span className="hero-script">Vice City</span>
            <span className="hero-line hero-line--1">Make</span>
            <span className="hero-line hero-line--2">your mark.</span>
          </h1>
          <p className="hero-sub">Design an ad. Slap it on a forty-foot billboard.<br />Watch the whole city look up.</p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={() => onStart()} data-sfx="select"><span>Start the takeover <ArrowRight size={20} /></span><Kbd>Enter</Kbd></button>
            <button className="btn btn-ghost" onClick={() => onStart('boulevard', true)}><span><Play size={16} fill="currentColor" /> Watch the trailer</span></button>
          </div>
        </div>
        <div className="now-showing" aria-live="polite">
          <span className="now-showing-label">Now showing on Ocean Drive</span>
          <strong>{heroRotation[now].name}</strong>
          <span className="now-showing-dots">{heroRotation.map((_, i) => <i key={i} className={i === now ? 'on' : ''} />)}</span>
        </div>
        <div className="hero-minimap"><Minimap onPick={id => onStart(id)} /><span className="minimap-hint">Pick a blip, claim a spot</span></div>
        <a className="hero-scroll" href="#spots">Scroll <ArrowDown size={16} /></a>
      </section>

      <div className="ticker" aria-label="Vice City News headlines">
        <span className="ticker-badge"><i /> VCN Live</span>
        <div className="ticker-track"><div className="ticker-run">{[...headlines, ...headlines].map((h, i) => <span key={i}>{h}<b>★</b></span>)}</div></div>
      </div>

      <section className="spots" id="spots" aria-labelledby="spots-title">
        <div className="section-head">
          <p className="kicker kicker--pink">Choose your spot</p>
          <h2 id="spots-title">The city is <em>your canvas.</em></h2>
          <p className="section-lede">Eight prime spots, from a forty-foot billboard to a banner plane over the beach. Millions of eyeballs. Pick where your work goes up tonight — then see it everywhere.</p>
        </div>
        <div className="collage">
          {collage.map(([id, poster], i) => <CollagePanel key={id} id={id} poster={poster} index={i} onPick={onStart} />)}
          <div className="panel panel--title" aria-hidden="true">
            <span className="panel-title-script">Welcome to</span>
            <span className="panel-title-big">Vice<br />City</span>
            <span className="panel-title-small">8 spots · 7M daily eyes · 1 legend</span>
          </div>
        </div>
      </section>

      <section className="missions" id="missions" aria-labelledby="missions-title">
        <div className="section-head">
          <p className="kicker kicker--teal">Three missions. One legend.</p>
          <h2 id="missions-title">How the <em>takeover</em> works.</h2>
        </div>
        <ol className="mission-list">
          <li className="mission">
            <span className="mission-no">01</span>
            <div className="mission-body"><h3>Pick your hustle</h3><p>Nightclub, car meet, new music, a local business — or something only you would do. Upload your own image or start from one of our 80s-soaked posters.</p>
              <span className="mission-chips"><span><Upload size={14} /> Upload</span><span><Sparkles size={14} /> Starter posters</span></span></div>
            <span className="mission-reward">+2 ★</span>
          </li>
          <li className="mission">
            <span className="mission-no">02</span>
            <div className="mission-body"><h3>Make it hit</h3><p>A full creative studio powered by the <a className="hl" href="https://github.com/unlayer/react-image-editor" target="_blank" rel="noreferrer">Unlayer React Image Editor</a> — crop to billboard shape, grade it with filters, drop headlines, draw, add shapes, stickers and frames.</p>
              <span className="mission-chips"><span><Crop size={14} /> Crop</span><span><Wand2 size={14} /> Filters</span><span><Type size={14} /> Text</span><span><Sparkles size={14} /> Stickers</span></span></div>
            <span className="mission-reward">+1 ★</span>
          </li>
          <li className="mission">
            <span className="mission-no">03</span>
            <div className="mission-body"><h3>Take over the city</h3><p>Hit publish and watch the lights come on. Your art goes live on billboards, a club mega-screen, a drive-in, a taxi, a bus shelter — even a plane over the beach. Then share it everywhere.</p>
              <span className="mission-chips"><span><Eye size={14} /> Cinematic reveal</span><span><MapPin size={14} /> 8 locations</span></span></div>
            <span className="mission-reward">+2 ★</span>
          </li>
        </ol>
      </section>

      <section className="radio-section" id="radio" aria-labelledby="radio-title">
        <div className="section-head">
          <p className="kicker kicker--gold"><Radio size={14} /> Live from the city</p>
          <h2 id="radio-title">Pick a station. <em>Set the mood.</em></h2>
          <p className="section-lede">Every beat is synthesized live in your browser — three original stations, no two loops alike. Press <Kbd>Q</Kbd> for the radio wheel anywhere.</p>
        </div>
        <div className="stations">
          {stations.map((s, i) => {
            const on = a.playing && a.stationIndex === i;
            return <button key={s.id} className={`station ${on ? 'is-on' : ''}`} style={{ '--c': s.color } as CSSProperties} onClick={() => a.startRadio(i)} aria-pressed={on} data-sfx="none">
              <span className="station-freq">{s.freq}<small>FM</small></span>
              <span className="station-name">{s.name}</span>
              <span className="station-genre">{s.genre} · {s.bpm} BPM</span>
              <ul>{s.tracks.map(t => <li key={t}>{t}</li>)}</ul>
              <span className="station-cta">{on ? <><i className="live-dot" /> On air</> : 'Tune in'}</span>
            </button>;
          })}
        </div>
      </section>

      <section className="finale" aria-labelledby="finale-title">
        <span className="finale-script">the city is waiting</span>
        <h2 id="finale-title">Your name.<br />In lights.<br /><em>Tonight.</em></h2>
        <button className="btn btn-primary" onClick={() => onStart()} data-sfx="select"><span>Start the takeover <ArrowRight size={20} /></span></button>
      </section>
    </main>

    <footer className="site-footer">
      <Brand small onClick={() => { audio.whoosh(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
      <p>A fan-made creative playground set in a fictional city. Original scenes, posters and music. Not affiliated with or endorsed by Rockstar Games or Take-Two Interactive.</p>
      <p className="footer-credit">Editing powered by <a href="https://github.com/unlayer/react-image-editor" target="_blank" rel="noreferrer">Unlayer React Image Editor</a></p>
    </footer>
  </div>;
}
