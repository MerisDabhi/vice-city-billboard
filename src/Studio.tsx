import type { CSSProperties } from 'react';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { ImageEditorOptions, ImageEditorRef } from '@unlayer/react-image-editor';
import { ArrowLeft, ArrowRight, Camera, Car, Check, Disc3, LoaderCircle, MapPin, Music2, RotateCcw, Sparkles, Store, Upload, Wand2, X } from 'lucide-react';
import { audio } from './audio';
import { posterUrl } from './posters';
import type { PosterId } from './posters';
import { isPortrait, loadImage, scenes } from './scenes';
import type { CityScene, SceneId } from './scenes';
import { Reveal } from './Reveal';
import { Result } from './Result';
import { Brand, SceneCanvas, usePoster } from './ui';

const ImageEditor = lazy(() => import('@unlayer/react-image-editor'));
const editorOptions: ImageEditorOptions = {
  theme: 'dark',
  features: { ai: { enabled: false, assistant: false }, imageEditor: { enabled: true } },
};

export const categories = [
  { id: 'nightclub' as PosterId, title: 'Nightclub', line: 'Pack the dance floor.', icon: Disc3, color: '#ff3d8b', tips: ['Crop wide so the whole crowd fits the screen', 'Add a neon filter — push saturation up', 'Headline: club name + night of the week', 'Sticker a star or a sparkle for heat'] },
  { id: 'car-meet' as PosterId, title: 'Car Meet', line: 'Built to turn heads.', icon: Car, color: '#27e0d3', tips: ['Crop tight on the ride — lose the empty sky', 'Try a high-contrast or retro filter', 'Headline: crew name + meet time', 'Frame it — it reads like a race poster'] },
  { id: 'music' as PosterId, title: 'New Music', line: 'Drop it on the city.', icon: Music2, color: '#ffb23f', tips: ['Crop to a wide cinematic strip', 'Warm filter for that sunset glow', 'Artist name huge, title smaller', 'Draw a signature — make it personal'] },
  { id: 'business' as PosterId, title: 'Local Business', line: 'Be the local legend.', icon: Store, color: '#3ff2a0', tips: ['Keep the product or storefront centered', 'Brighten it up — it should feel sunny', 'Name big. Message short. Six words max', 'Add a frame for a classic sign look'] },
  { id: 'custom' as PosterId, title: 'Wildcard', line: 'Anything but ordinary.', icon: Sparkles, color: '#b04dff', tips: ['Crop to the shape of your spot', 'Pick a filter that sets the mood', 'Say something the city won’t forget', 'Stickers, shapes, doodles — go wild'] },
];
type Category = typeof categories[number];
type Stage = 'brief' | 'editor' | 'reveal' | 'result';

export const ratioOf = (scene: CityScene) => {
  const [q0, q1, , q3] = scene.corners;
  return Math.hypot(q1[0] - q0[0], q1[1] - q0[1]) / Math.hypot(q3[0] - q0[0], q3[1] - q0[1]);
};

function CategoryCard({ cat, selected, onSelect }: { cat: Category; selected: boolean; onSelect: () => void }) {
  const art = usePoster(cat.id);
  return <button className={`hustle ${selected ? 'is-selected' : ''}`} style={{ '--c': cat.color } as CSSProperties} aria-pressed={selected} onClick={onSelect} data-sfx="select">
    <span className="hustle-art" style={art ? { backgroundImage: `url(${art})` } : undefined} />
    <span className="hustle-icon"><cat.icon size={20} /></span>
    <strong>{cat.title}</strong>
    <small>{cat.line}</small>
    {selected && <span className="hustle-check"><Check size={14} strokeWidth={3} /></span>}
  </button>;
}

export default function Studio({ initialScene, demo, onExit, onRestart, onHype, onEditing }: {
  initialScene: SceneId; demo: boolean; onExit: () => void; onRestart: () => void; onHype: (n: number) => void; onEditing: (v: boolean) => void;
}) {
  const [stage, setStage] = useState<Stage>(demo ? 'reveal' : 'brief');
  const [isDemo, setIsDemo] = useState(demo);
  const [category, setCategory] = useState<Category>(categories[0]);
  const [picked, setPicked] = useState(false);
  const [sceneId, setSceneId] = useState<SceneId>(initialScene);
  const scene = scenes.find(s => s.id === sceneId)!;
  const [sourceImage, setSourceImage] = useState('');
  const [sourceKind, setSourceKind] = useState<'upload' | 'starter' | ''>('');
  const [filename, setFilename] = useState('');
  const [editedImage, setEditedImage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [editorFailed, setEditorFailed] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [done, setDone] = useState<boolean[]>([false, false, false, false]);
  const [snap, setSnap] = useState('');
  const [confirmExit, setConfirmExit] = useState(false);
  const editorRef = useRef<ImageEditorRef>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadSeq = useRef(0);
  const alive = useRef(true);
  const starter = usePoster(category.id, isPortrait(scene));

  useEffect(() => { alive.current = true; return () => { alive.current = false; uploadSeq.current++; }; }, []);
  useEffect(() => { if (demo) void posterUrl('hero').then(u => { if (alive.current) setEditedImage(u); }); }, [demo]);

  // A loaded starter poster follows the chosen hustle and the spot's orientation.
  useEffect(() => { if (sourceKind === 'starter' && starter) setSourceImage(starter); }, [starter, sourceKind]);

  // Hype level mirrors progress through the missions.
  useEffect(() => {
    const n = stage === 'result' || stage === 'reveal' ? (isDemo ? 0 : 5) : stage === 'editor' ? 3 : (picked ? 1 : 0) + (sourceImage ? 1 : 0);
    onHype(n);
  }, [stage, picked, sourceImage, isDemo, onHype]);
  useEffect(() => {
    onEditing(stage === 'editor');
    audio.setMood(stage === 'editor' ? 'studio' : stage === 'reveal' ? 'cutscene' : 'open');
    window.scrollTo(0, 0);
    return () => onEditing(false);
  }, [stage, onEditing]);
  useEffect(() => {
    if (stage !== 'editor' || editorReady || editorFailed) return;
    const t = window.setTimeout(() => { setEditorFailed(true); setError('The studio is taking longer than expected to load. Check your connection and retry.'); }, 40000);
    return () => window.clearTimeout(t);
  }, [stage, editorReady, editorFailed, editorKey]);
  useEffect(() => {
    if (stage !== 'editor') return;
    const unload = (e: BeforeUnloadEvent) => { if (editorRef.current?.editor?.hasChanges()) e.preventDefault(); };
    window.addEventListener('beforeunload', unload);
    return () => window.removeEventListener('beforeunload', unload);
  }, [stage]);

  const hasWork = () => (stage === 'editor' && !!editorRef.current?.editor?.hasChanges()) || (stage === 'result' && !isDemo);
  const requestExit = () => { if (hasWork()) setConfirmExit(true); else onExit(); };
  const requestExitRef = useRef(requestExit); requestExitRef.current = requestExit;
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.wheel')) requestExitRef.current(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  async function upload(file?: File) {
    if (!file) return;
    const seq = ++uploadSeq.current;
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { audio.error(); setError('That file won’t fly. Choose a JPG, PNG or WebP image.'); return; }
    if (file.size > 25 * 1024 * 1024) { audio.error(); setError('That image is huge. Please choose one under 25 MB.'); return; }
    setBusy(true);
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      if (img.width * img.height > 100_000_000) throw new Error('This image is too large to edit safely. Please resize it below 100 megapixels.');
      const scale = Math.min(1, 2800 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      const normalized = c.toDataURL('image/png');
      if (seq === uploadSeq.current && alive.current) { setSourceImage(normalized); setSourceKind('upload'); setFilename(file.name); audio.shutter(); }
    } catch (e) { if (seq === uploadSeq.current && alive.current) { audio.error(); setError(e instanceof Error ? e.message : 'We couldn’t open that image. Try another file.'); } }
    finally { URL.revokeObjectURL(url); if (seq === uploadSeq.current && alive.current) setBusy(false); }
  }

  function useStarter() { uploadSeq.current++; if (!starter) return; setSourceImage(starter); setSourceKind('starter'); setFilename(`${category.title} starter poster`); setError(''); audio.shutter(); }
  function pickCategory(cat: Category) {
    setCategory(cat); setPicked(true);
    if (sourceKind === 'starter') setFilename(`${cat.title} starter poster`);
  }
  function openEditor() { if (!sourceImage || busy) return; setError(''); setEditorFailed(false); setEditorReady(false); setSnap(''); setStage('editor'); }
  function publish(dataUrl?: string) {
    try {
      const image = dataUrl || editorRef.current?.editor?.getImage();
      if (!image) { audio.error(); setError('Your artwork is still loading. Give it a second and try again.'); return; }
      setEditedImage(image); setError(''); setIsDemo(false); setStage('reveal');
    } catch { audio.error(); setError('Your artwork couldn’t be exported. Try again.'); }
  }
  function snapPreview() {
    const image = editorRef.current?.editor?.getImage();
    if (!image) return;
    audio.shutter();
    setSnap(image);
  }
  const [hypeScore, setHypeScore] = useState(0);
  const finishReveal = useCallback((hype: number) => { setHypeScore(hype); setStage('result'); }, []);

  const ratio = ratioOf(scene);
  const ratioLabel = ratio < 1 ? `1 : ${(1 / ratio).toFixed(1)}` : `${ratio.toFixed(1)} : 1`;
  const stepLabel = stage === 'brief' ? 'Mission 1 · The Brief' : stage === 'editor' ? 'Mission 2 · The Studio' : 'Mission 3 · The Takeover';

  return <div className={`studio studio--${stage}`}>
    {stage !== 'reveal' && <header className="studio-header">
      <Brand small onClick={requestExit} />
      <div className="studio-progress" aria-label="Progress">
        <span className="studio-step">{stepLabel}</span>
        <span className="studio-bar">{['brief', 'editor', 'result'].map((s, i) => <i key={s} className={['brief', 'editor', 'result'].indexOf(stage) >= i ? 'on' : ''} />)}</span>
      </div>
      <button className="icon-btn" onClick={requestExit} aria-label="Leave the studio (Esc)" data-sfx="back"><X size={20} /></button>
    </header>}

    {stage === 'brief' && <div className="brief stage-in">
      <div className="brief-main">
        <p className="kicker kicker--pink">Mission briefing</p>
        <h1 className="studio-title">What are we <em>selling</em> tonight?</h1>

        <section className="brief-block" aria-labelledby="b1">
          <h2 id="b1" className="block-title"><span>01</span> Choose your hustle</h2>
          <div className="hustles" role="group" aria-label="Campaign category">
            {categories.map(cat => <CategoryCard key={cat.id} cat={cat} selected={picked && category.id === cat.id} onSelect={() => pickCategory(cat)} />)}
          </div>
        </section>

        <section className="brief-block" aria-labelledby="b2">
          <h2 id="b2" className="block-title"><span>02</span> Load your artwork</h2>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Upload your image" onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} />
          <div className="loadout">
            <button className={`dropzone ${dragging ? 'is-drag' : ''} ${sourceKind === 'upload' ? 'is-set' : ''}`} disabled={busy} onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); void upload(e.dataTransfer.files[0]); }}>
              {busy ? <span className="dz-loading"><LoaderCircle className="spin" /> Developing your photo…</span>
                : sourceKind === 'upload' ? <><img src={sourceImage} alt="Your uploaded image" /><span className="dz-set"><Check size={16} /> <strong>{filename}</strong><small>Click to swap</small></span></>
                : <><span className="dz-icon"><Upload size={26} /></span><strong>Drop your image here</strong><span>or <u>browse files</u> · JPG, PNG, WebP · up to 25 MB</span></>}
            </button>
            <button className={`starter ${sourceKind === 'starter' ? 'is-set' : ''}`} onClick={useStarter} disabled={!starter} style={{ '--c': category.color } as CSSProperties} data-sfx="select">
              <span className="starter-art">{starter ? <img src={starter} alt="" /> : <LoaderCircle className="spin" />}</span>
              <span className="starter-copy"><strong>{sourceKind === 'starter' ? <><Check size={14} /> Starter loaded</> : 'No image? Use ours'}</strong><small>{category.title} starter poster — remix it in the studio</small></span>
            </button>
          </div>
          <p className="fine"><span className="privacy-dot" /> Your image never leaves this browser.</p>
        </section>

        <section className="brief-block" aria-labelledby="b3">
          <h2 id="b3" className="block-title"><span>03</span> Pick your spot</h2>
          <div className="spot-picker" role="group" aria-label="Location">
            {scenes.map(s => <button key={s.id} className={`spot ${s.id === sceneId ? 'is-selected' : ''}`} aria-pressed={s.id === sceneId} onClick={() => setSceneId(s.id)} style={{ '--c': s.color } as CSSProperties} data-sfx="select">
              <img src={`/images/${s.id}.webp`} alt="" />
              <span className="spot-copy"><strong>{s.title}</strong><small>{s.type} · {s.district}</small></span>
              {s.id === sceneId && <Check size={16} className="spot-check" />}
            </button>)}
          </div>
        </section>

        {error && <p className="error" role="alert">{error}</p>}
        <div className="brief-cta">
          <p>{!sourceImage ? 'Load an image or grab a starter poster to continue.' : 'Looking good. Time to make it unmistakably yours.'}</p>
          <button className="btn btn-primary" disabled={!sourceImage || busy} onClick={openEditor} data-sfx="select"><span>Enter the studio <ArrowRight size={20} /></span></button>
        </div>
      </div>

      <aside className="viewfinder" aria-label="Live preview">
        <div className="vf-frame">
          <div className="vf-top"><span className="rec"><i /> Live preview</span><span>{scene.time}</span></div>
          <SceneCanvas scene={scene} artwork={sourceImage || starter} fit="contain" />
          <span className="vf-corner tl" /><span className="vf-corner tr" /><span className="vf-corner bl" /><span className="vf-corner br" />
        </div>
        <div className="vf-meta">
          <div><small><MapPin size={13} /> {scene.district}</small><h3>{scene.title}</h3><p>{scene.description}</p></div>
          <div className="vf-ratio"><span style={ratio < 1 ? { aspectRatio: ratio, width: 'auto', height: 110 } : { aspectRatio: ratio }} /><small>Best fit<br /><strong>{ratioLabel}</strong> {ratio < 1 ? 'tall' : 'wide'}</small></div>
        </div>
      </aside>
    </div>}

    {stage === 'editor' && <div className="workspace stage-in">
      <aside className="objectives">
        <button className="back-link" onClick={() => {
          const current = editorRef.current?.editor?.hasChanges() ? editorRef.current.editor.getImage() : null;
          if (current) { setSourceImage(current); setSourceKind('upload'); setFilename('Your work in progress'); }
          setStage('brief'); setError('');
        }} data-sfx="back"><ArrowLeft size={15} /> Back to the brief</button>
        <p className="kicker kicker--teal">Objectives</p>
        <h2>Make it <em>hit.</em></h2>
        <ul className="objective-list">
          {category.tips.map((t, i) => <li key={t}><button className={done[i] ? 'is-done' : ''} aria-pressed={done[i]} onClick={() => { setDone(d => d.map((v, j) => j === i ? !v : v)); if (!done[i]) audio.star(i); }} data-sfx="none"><span className="obj-box">{done[i] && <Check size={12} strokeWidth={3} />}</span>{t}</button></li>)}
        </ul>
        <div className="target">
          <small>Target</small>
          <strong>{scene.title} · {scene.type}</strong>
          <span className="target-ratio"><span style={ratio < 1 ? { aspectRatio: ratio, width: 'auto', height: 56 } : { aspectRatio: ratio }} />Crop {ratio < 1 ? 'tall' : 'wide'} to about <b>{ratioLabel}</b> for a perfect fit</span>
        </div>
        <div className="snap">
          <button className="btn btn-small" onClick={snapPreview} disabled={!editorReady} data-sfx="none"><Camera size={15} /> Preview on location</button>
          {snap && <SceneCanvas scene={scene} artwork={snap} fit="contain" className="snap-view" />}
        </div>
        <p className="powered">Studio powered by <strong>Unlayer</strong></p>
      </aside>
      <div className="editor-col">
        <div className="editor-bar">
          <div><p className="editor-hint"><Wand2 size={15} /> Tools on the right: Filter · Crop · Resize · Draw · Text · Shapes · Stickers · Frames</p></div>
          <button className="btn btn-primary btn-publish" disabled={!editorReady || editorFailed} onClick={() => publish()} data-sfx="select"><span>Publish to Vice City <ArrowRight size={20} /></span></button>
        </div>
        <div className={`editor-shell ${editorReady ? 'is-ready' : ''}`}>
          {!editorReady && !editorFailed && <div className="editor-loading"><div className="loader-ring" /><strong>Opening the studio…</strong><span>Warming up the neon, the brushes and the filters.</span></div>}
          {!editorFailed && <Suspense fallback={null}>
            <ImageEditor key={editorKey} ref={editorRef} image={sourceImage} options={editorOptions} minHeight="100%" style={{ height: '100%', minHeight: '100%' }}
              onLoad={() => { setEditorReady(true); setError(''); audio.notify(); }}
              onSave={({ dataUrl }) => publish(dataUrl)}
              onCancel={() => { setStage('brief'); setError(''); }}
              onLoadError={() => { setEditorFailed(true); setEditorReady(false); setError('We couldn’t load that image into the studio. Go back and choose another one.'); }}
              onError={() => { setEditorFailed(true); setEditorReady(false); setError('The studio couldn’t connect to Unlayer. Check your internet connection and try again.'); }} />
          </Suspense>}
          {editorFailed && <div className="editor-retry"><Wand2 size={32} /><h3>Let’s get you back in the studio.</h3><p>{error}</p>
            <button className="btn btn-primary" onClick={() => { setError(''); setEditorReady(false); setEditorFailed(false); setEditorKey(k => k + 1); }}><span><RotateCcw size={17} /> Retry</span></button>
            <button className="text-link" onClick={() => { setStage('brief'); setError(''); }}>Choose a different image</button></div>}
        </div>
        {error && !editorFailed && <p className="error" role="alert">{error}</p>}
      </div>
    </div>}

    {stage === 'reveal' && editedImage && <Reveal scene={scene} artwork={editedImage} demo={isDemo} onDone={finishReveal} />}
    {stage === 'reveal' && !editedImage && <div className="reveal reveal--loading" />}

    {stage === 'result' && editedImage && <Result artwork={editedImage} sceneId={sceneId} setSceneId={setSceneId} demo={isDemo} hype={hypeScore}
      onEdit={() => { setSourceImage(editedImage); setSourceKind('upload'); setFilename('Your published artwork'); setEditorKey(k => k + 1); setStage('editor'); }}
      onNew={onRestart} onCreate={() => { setIsDemo(false); setEditedImage(''); setStage('brief'); }} onHome={onExit} />}

    {confirmExit && <div className="confirm-backdrop" role="presentation" onClick={() => setConfirmExit(false)}>
      <div className="confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" onClick={e => e.stopPropagation()}>
        <p className="kicker kicker--pink">Hold up</p>
        <h2 id="confirm-title">Leaving already?</h2>
        <p>Your work only lives in this session. Download anything you want to keep before you bounce.</p>
        <div><button className="btn btn-primary" autoFocus onClick={() => setConfirmExit(false)}><span>Keep creating</span></button><button className="btn btn-ghost" onClick={onExit} data-sfx="back"><span>Leave the studio</span></button></div>
      </div>
    </div>}
  </div>;
}
