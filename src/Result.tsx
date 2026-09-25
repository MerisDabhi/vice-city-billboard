import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Download, Grid2x2, Heart, Home, ImageDown, LoaderCircle, MapPin, MessageCircle, Pencil, Plus, Send, Share2, ZoomIn, ZoomOut } from 'lucide-react';
import { audio } from './audio';
import { canvasBlob, downloadBlob, loadImage, renderScene, sceneFocus, scenes } from './scenes';
import type { CityScene, SceneId } from './scenes';
import { SceneCanvas } from './ui';

const comments = [
  ['sunsetsofia', 'ok who did this 😭🔥'],
  ['rico.vicewave', 'just shouted this out on air. legend.'],
  ['causeway_carl', 'saw it from the causeway, almost missed my exit'],
  ['velvet.door', 'line is around the block rn because of this'],
  ['pastel.pete', 'need this on a shirt immediately'],
  ['lil.havana', 'the whole block is taking pictures'],
];

export async function buildShareCard(scene: CityScene, artwork: string, hype = 0) {
  const sceneCanvas = document.createElement('canvas');
  await renderScene(scene, artwork, sceneCanvas, 'contain', false);
  try { await Promise.all([document.fonts.load('100px Anton'), document.fonts.load("100px 'Mr Dafoe'"), document.fonts.load("600 20px 'Chakra Petch'")]); } catch { /* ignore */ }
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0b0514'; ctx.fillRect(0, 0, W, H);
  const f = sceneFocus(scene), imgH = 900, sw = 1180, sh = sw * imgH / W;
  const sx = Math.max(0, Math.min(1536 - sw, f.x * 15.36 - sw / 2)), sy = Math.max(0, Math.min(1024 - sh, f.y * 10.24 - sh * 0.42));
  ctx.drawImage(sceneCanvas, sx, sy, sw, sh, 0, 0, W, imgH);
  const fade = ctx.createLinearGradient(0, imgH - 380, 0, imgH); fade.addColorStop(0, 'rgba(11,5,20,0)'); fade.addColorStop(1, '#0b0514');
  ctx.fillStyle = fade; ctx.fillRect(0, imgH - 380, W, 380);
  const topFade = ctx.createLinearGradient(0, 0, 0, 180); topFade.addColorStop(0, 'rgba(11,5,20,.7)'); topFade.addColorStop(1, 'rgba(11,5,20,0)');
  ctx.fillStyle = topFade; ctx.fillRect(0, 0, W, 180);
  // badge
  ctx.save(); ctx.transform(1, 0, -0.2, 1, 0, 0); ctx.fillStyle = '#ff3d8b'; ctx.fillRect(70, 56, 420, 58); ctx.restore();
  ctx.font = "700 28px 'Chakra Petch', sans-serif"; ctx.fillStyle = '#12021f'; ctx.fillText('★ TAKEOVER COMPLETE', 70, 95);
  ctx.font = "600 24px 'Chakra Petch', sans-serif"; ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.fillText(`${scene.time} · LIVE`, W - 60, 94); ctx.textAlign = 'left';
  // headline
  ctx.save(); ctx.translate(-18, 0);
  ctx.font = "96px 'Mr Dafoe', cursive"; ctx.save(); ctx.translate(80, 930); ctx.rotate(-0.08); ctx.shadowColor = '#ff3d8b'; ctx.shadowBlur = 30; ctx.fillStyle = '#ff5fa0'; ctx.fillText('I took over', 0, 0); ctx.restore();
  ctx.restore();
  let size = 150; ctx.font = `${size}px Anton, Impact, sans-serif`;
  const title = scene.title.toUpperCase();
  while (ctx.measureText(title).width > W - 140 && size > 60) { size -= 6; ctx.font = `${size}px Anton, Impact, sans-serif`; }
  ctx.save(); ctx.translate(70, 1080); ctx.transform(1, 0, -0.12, 1, 0, 0);
  for (let d = 10; d > 0; d -= 2) { ctx.fillStyle = 'rgba(40,0,60,.6)'; ctx.fillText(title, d, d); }
  const g = ctx.createLinearGradient(0, -size, 0, 0); g.addColorStop(0, '#fff3c4'); g.addColorStop(0.5, '#ffc94d'); g.addColorStop(0.51, '#ff8a3d'); g.addColorStop(1, '#ff3d8b');
  ctx.fillStyle = g; ctx.fillText(title, 0, 0); ctx.restore();
  ctx.font = "600 28px 'Chakra Petch', sans-serif"; ctx.fillStyle = 'rgba(255,240,250,.75)';
  ctx.fillText(`${scene.type.toUpperCase()} · ${scene.district.toUpperCase()} · VICE CITY`, 70, 1140);
  // stars
  ctx.fillStyle = '#ffc94d'; ctx.font = '44px sans-serif'; ctx.fillText('★★★★★', 70, 1215);
  ctx.font = "600 22px 'Chakra Petch', sans-serif"; ctx.fillStyle = 'rgba(255,240,250,.55)'; ctx.fillText(hype ? `+${hype.toLocaleString('en-US')} HYPE · STATUS: CITY LEGEND` : 'HYPE LEVEL: CITY LEGEND', 70, 1252);
  // footer
  ctx.fillStyle = '#ff3d8b'; ctx.fillRect(0, H - 70, W, 4);
  ctx.fillStyle = '#12071f'; ctx.fillRect(0, H - 66, W, 66);
  ctx.font = "44px 'Mr Dafoe', cursive"; ctx.fillStyle = '#fff'; ctx.fillText('Vice City', 70, H - 20);
  ctx.font = "600 22px 'Chakra Petch', sans-serif"; ctx.fillStyle = '#ffc94d'; ctx.textAlign = 'right'; ctx.fillText('BILLBOARD TAKEOVER · MAKE YOUR MARK', W - 60, H - 26); ctx.textAlign = 'left';
  return c;
}

function PhoneFeed({ image, scene, handle, setHandle }: { image: string; scene: CityScene; handle: string; setHandle: (v: string) => void }) {
  const [likes, setLikes] = useState(0);
  const [shown, setShown] = useState(0);
  const [liked, setLiked] = useState(false);
  useEffect(() => {
    setLikes(0); setShown(0);
    let l = 0;
    const t1 = window.setInterval(() => { l += Math.floor(80 + Math.random() * 900); setLikes(l); }, 140);
    const t2 = window.setTimeout(() => window.clearInterval(t1), 5200);
    const timers = comments.slice(0, 4).map((_, i) => window.setTimeout(() => { setShown(i + 1); if (i === 0) audio.notify(); }, 1400 + i * 1300));
    return () => { window.clearInterval(t1); window.clearTimeout(t2); timers.forEach(clearTimeout); };
  }, [scene.id]);
  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;
  return <div className="phone" aria-label="Your takeover on social media">
    <div className="phone-notch" />
    <div className="phone-status"><span>{scene.time.replace(' PM', '').replace(' AM', '')}</span><span>▮▮▮ 5G ▭</span></div>
    <div className="phone-app">
      <div className="phone-appbar"><span className="phone-logo">Vicegram</span><Send size={18} /></div>
      <div className="post-head">
        <span className="avatar">{(handle.replace('@', '')[0] || 'Y').toUpperCase()}</span>
        <span className="post-user">
          <label className="sr-only" htmlFor="handle">Your handle</label>
          <input id="handle" value={handle} maxLength={22} onChange={e => setHandle(e.target.value.startsWith('@') ? e.target.value : '@' + e.target.value)} spellCheck={false} />
          <small><MapPin size={11} /> {scene.title}, Vice City</small>
        </span>
      </div>
      <div className="post-img">{image ? <img src={image} alt="" style={{ objectPosition: `${sceneFocus(scene).x}% ${sceneFocus(scene).y}%` }} /> : <LoaderCircle className="spin" />}</div>
      <div className="post-actions">
        <button className={liked ? 'is-liked' : ''} onClick={() => { setLiked(v => !v); setLikes(v => v + (liked ? -1 : 1)); }} aria-pressed={liked} aria-label="Like" data-sfx="select"><Heart size={20} fill={liked ? 'currentColor' : 'none'} /></button>
        <MessageCircle size={20} /><Send size={20} />
      </div>
      <p className="post-likes">{fmt(likes)} likes</p>
      <p className="post-caption"><b>{handle}</b> just took over {scene.title} 🌴✨ #ViceCity #MakeYourMark</p>
      <ul className="post-comments">{comments.slice(0, shown).map(([u, c]) => <li key={u}><b>{u}</b> {c}</li>)}</ul>
    </div>
  </div>;
}

export function Result({ artwork, sceneId, setSceneId, demo, hype = 0, onEdit, onNew, onCreate, onHome }: {
  artwork: string; sceneId: SceneId; hype?: number; setSceneId: (id: SceneId) => void; demo: boolean; onEdit: () => void; onNew: () => void; onCreate: () => void; onHome: () => void;
}) {
  const scene = scenes.find(s => s.id === sceneId)!;
  const [view, setView] = useState<'wide' | 'close' | 'city'>('wide');
  const [shot, setShot] = useState('');
  const [busy, setBusy] = useState<string>('');
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [handle, setHandle] = useState('@you');
  const toastTimer = useRef(0);
  const focus = sceneFocus(scene);

  const notify = (m: string) => { setToast(m); window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(''), 3800); };
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  async function run(kind: string, fn: () => Promise<void>) {
    setBusy(kind); setError('');
    try { await fn(); } catch (e) { if (!(e instanceof Error && e.name === 'AbortError')) { audio.error(); setError(e instanceof Error ? e.message : 'Something went wrong. Try again.'); } }
    finally { setBusy(''); }
  }
  const sceneFile = async () => { const c = document.createElement('canvas'); await renderScene(scene, artwork, c, 'contain', true); return canvasBlob(c); };
  const downloadScene = () => run('scene', async () => { downloadBlob(await sceneFile(), `vice-city-${scene.id}.png`); audio.cash(); notify('Scene saved. Frame it. Post it. Brag about it.'); });
  // The share card is pre-built so native share sheets open instantly (Safari blocks share() after a slow await).
  const [card, setCard] = useState<File | null>(null);
  useEffect(() => {
    let alive = true;
    setCard(null);
    buildShareCard(scene, artwork, hype).then(canvasBlob).then(b => { if (alive) setCard(new File([b], 'vice-city-takeover.png', { type: 'image/png' })); }).catch(() => { /* built on demand instead */ });
    return () => { alive = false; };
  }, [scene, artwork, hype]);
  const getCard = async () => card ?? new File([await canvasBlob(await buildShareCard(scene, artwork, hype))], 'vice-city-takeover.png', { type: 'image/png' });

  const shareUrl = window.location.origin;
  const headline = `I just took over ${scene.title} in Vice City 🌴✨ My art is live on the ${scene.type.toLowerCase()}.`;
  const caption = `${headline}

Make your mark 👉 ${shareUrl}

#ViceCity #MakeYourMark #BillboardTakeover`;

  const downloadCard = () => run('card', async () => { downloadBlob(await getCard(), `vice-city-takeover-card.png`); audio.cash(); notify('Share card saved — sized for stories and feeds.'); });
  const downloadArt = () => run('art', async () => { const img = await loadImage(artwork); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d')!.drawImage(img, 0, 0); downloadBlob(await canvasBlob(c), 'vice-city-artwork.png'); audio.cash(); notify('Your artwork, saved in full resolution.'); });
  const share = () => run('share', async () => {
    const file = await getCard();
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'I took over Vice City', text: caption });
    else { downloadBlob(file, 'vice-city-takeover.png'); notify('Share card downloaded — drop it into any app to share.'); }
  });

  const switchScene = (id: SceneId) => { if (id === sceneId) return; audio.whoosh(0.45); setShot(''); setSceneId(id); if (view === 'city') setView('wide'); };

  return <div className="result stage-in">
    <div className="result-stage">
      <div className={`viewer viewer--${view}`} style={{ '--fx': `${focus.x}%`, '--fy': `${focus.y}%` } as CSSProperties}>
        {view !== 'city' ? <div className="viewer-camera" key={scene.id}>
          <SceneCanvas scene={scene} artwork={artwork} fit="contain" onReady={c => setShot(c.toDataURL('image/jpeg', 0.82))} />
        </div> : <div className="citywide">
          {scenes.map((s, i) => <button key={s.id} className={`cw cw--${i + 1}`} style={{ '--fx': `${sceneFocus(s).x}%`, '--fy': `${sceneFocus(s).y}%` } as CSSProperties} onClick={() => { setSceneId(s.id); setView('wide'); audio.whoosh(0.4); }} data-sfx="select" aria-label={`View ${s.title}`}>
            <SceneCanvas scene={s} artwork={artwork} fit="contain" />
            <span className="cw-tag" style={{ '--c': s.color } as CSSProperties}>{s.title}</span>
          </button>)}
          <div className="cw-title"><span>City-wide</span><strong>Takeover</strong><small>8 / 8 spots</small></div>
        </div>}
        <div className="viewer-hud">
          <span className="live-pill"><i /> {demo ? 'Trailer' : 'Live now'}</span>
          {view !== 'city' && <span className="viewer-loc"><MapPin size={14} /> {scene.title} · {scene.district} · {scene.time}</span>}
        </div>
        <div className="viewer-controls" role="group" aria-label="Camera">
          <button className={view === 'wide' ? 'on' : ''} onClick={() => setView('wide')} aria-pressed={view === 'wide'}><ZoomOut size={16} /> Wide</button>
          <button className={view === 'close' ? 'on' : ''} onClick={() => setView('close')} aria-pressed={view === 'close'}><ZoomIn size={16} /> Close-up</button>
          <button className={view === 'city' ? 'on' : ''} onClick={() => setView('city')} aria-pressed={view === 'city'}><Grid2x2 size={16} /> City-wide</button>
        </div>
      </div>
      <div className="locations" role="group" aria-label="Locations">
        {scenes.map(s => <button key={s.id} className={`loc ${s.id === sceneId && view !== 'city' ? 'is-on' : ''}`} onClick={() => switchScene(s.id)} aria-pressed={s.id === sceneId} style={{ '--c': s.color } as CSSProperties} data-sfx="select">
          <img src={`/images/${s.id}.webp`} alt="" />
          <span><strong>{s.title}</strong><small>{s.type}</small></span>
        </button>)}
      </div>
    </div>

    <aside className="result-side">
      <p className="kicker kicker--gold">{demo ? 'This is just the trailer' : 'Mission passed'}</p>
      <h1 className="result-title">{demo ? <>Your art.<br /><em>Everywhere.</em></> : <>You own<br /><em>the block.</em></>}</h1>
      <p className="result-lede">{demo ? 'That was our poster. Imagine yours up there — upload anything and take over the city in under a minute.' : 'Your work is live across Vice City. Flip between spots, zoom in, then grab the shots and flex.'}</p>

      <PhoneFeed image={shot} scene={scene} handle={handle} setHandle={setHandle} />

      {demo ? <div className="result-actions">
        <button className="btn btn-primary btn-wide" onClick={onCreate} data-sfx="select"><span>Create my takeover <Plus size={20} /></span></button>
        <button className="btn btn-ghost btn-wide" onClick={onHome} data-sfx="back"><span><Home size={16} /> Back to the city</span></button>
      </div> : <div className="result-actions">
        <button className="btn btn-primary btn-wide" onClick={() => void downloadCard()} disabled={!!busy} data-sfx="none"><span>{busy === 'card' ? <LoaderCircle className="spin" size={18} /> : <ImageDown size={19} />} Download share card</span><small>1080×1350</small></button>
        <div className="action-row">
          <button className="btn btn-ghost" onClick={() => void downloadScene()} disabled={!!busy} data-sfx="none"><span>{busy === 'scene' ? <LoaderCircle className="spin" size={16} /> : <Download size={16} />} Scene</span></button>
          <button className="btn btn-ghost" onClick={() => void share()} disabled={!!busy}><span>{busy === 'share' ? <LoaderCircle className="spin" size={16} /> : <Share2 size={16} />} Share</span></button>
          <button className="btn btn-ghost" onClick={() => void downloadArt()} disabled={!!busy} data-sfx="none"><span>{busy === 'art' ? <LoaderCircle className="spin" size={16} /> : <Download size={16} />} Artwork</span></button>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="action-links">
          <button className="text-link" onClick={onEdit} data-sfx="back"><ArrowLeft size={14} /> <Pencil size={14} /> Back to the studio</button>
          <button className="text-link" onClick={onNew}><Plus size={14} /> New takeover</button>
        </div>
      </div>}
    </aside>
    {toast && <div className="toast" role="status"><span>★</span>{toast}</div>}
  </div>;
}
