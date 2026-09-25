// Starter artwork is painted at runtime so it uses the real brand fonts and stays
// crisp — every poster is original, 80s-inspired ad art for the fictional city.

export type PosterId = 'nightclub' | 'car-meet' | 'music' | 'business' | 'custom' | 'hero';

interface PosterSpec {
  sky: string[];
  sun?: string[];
  title: string[];
  titleFill: string[];
  script: string;
  scriptColor: string;
  kicker: string;
  tagline: string;
  accent: string;
  motif: 'rays' | 'road' | 'sun' | 'waves' | 'grid' | 'city';
}

// Canvas size of the poster being painted (landscape 1800×760 or portrait 1080×1480).
let W = 1800, H = 760;

const specs: Record<PosterId, PosterSpec> = {
  hero: {
    sky: ['#1a0633', '#6a1b6e', '#ff3d7f', '#ff9a3d'], sun: ['#ffe45c', '#ff5f8f'],
    title: ['MAKE YOUR', 'MARK.'], titleFill: ['#fff6d6', '#ffc94d', '#ff5d8f'],
    script: 'Vice City', scriptColor: '#3ff2e2', kicker: 'NOW SHOWING ON OCEAN DRIVE', tagline: 'YOUR ART · THIS BILLBOARD · TONIGHT', accent: '#3ff2e2', motif: 'sun',
  },
  nightclub: {
    sky: ['#090018', '#2b0748', '#7c1480', '#e0217e'],
    title: ['AFTER', 'HOURS'], titleFill: ['#ffffff', '#ff9ad5', '#ff2e97'],
    script: 'at The Velvet', scriptColor: '#46f5ff', kicker: 'EVERY FRIDAY · DOORS 11PM', tagline: 'NEON DISTRICT · DRESS TO KILL · NO REGRETS', accent: '#46f5ff', motif: 'rays',
  },
  'car-meet': {
    sky: ['#04121f', '#0d3b52', '#e2465c', '#ffa640'],
    title: ['MIDNIGHT', 'RUN'], titleFill: ['#ffffff', '#b8fff5', '#2ee6d6'],
    script: 'Ocean Drive', scriptColor: '#ff6fa1', kicker: 'SATURDAY · 10PM · PIER 86', tagline: 'ALL MAKES WELCOME · BRING THE NOISE', accent: '#ffb347', motif: 'road',
  },
  music: {
    sky: ['#12002a', '#4a0a6b', '#ff3c7a', '#ffb04a'], sun: ['#fff27a', '#ff4f9a'],
    title: ['NEON', 'HEARTBREAK'], titleFill: ['#fff4e0', '#ffb3d6', '#ff4fa2'],
    script: 'the new album', scriptColor: '#ffe45c', kicker: 'VICE WAVE RECORDS PRESENTS', tagline: 'OUT NOW · STREAMING EVERYWHERE IN THE CITY', accent: '#ffe45c', motif: 'grid',
  },
  business: {
    sky: ['#063a4c', '#0f8c9b', '#ffcf7a', '#ff8a5b'], sun: ['#fff6b0', '#ffb347'],
    title: ['COCO BEACH', 'SURF CO.'], titleFill: ['#ffffff', '#fff1c1', '#ffcf5a'],
    script: 'since 1986', scriptColor: '#ff5d8f', kicker: 'BOARDS · WAX · GOOD VIBES', tagline: 'VICE BEACH BOARDWALK · OPEN SUNRISE TO SUNSET', accent: '#ff5d8f', motif: 'waves',
  },
  custom: {
    sky: ['#120524', '#3a0f5c', '#b31d7b', '#ff6b4a'],
    title: ['THIS COULD', 'BE YOU'], titleFill: ['#ffffff', '#ffd6f0', '#ff76c0'],
    script: 'Vice City', scriptColor: '#ffd84d', kicker: 'PRIME SPOT AVAILABLE', tagline: 'ADVERTISE HERE · CALL 555-0186', accent: '#ffd84d', motif: 'city',
  },
};

function rng(seed: number) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

function palm(ctx: CanvasRenderingContext2D, x: number, base: number, height: number, lean: number, color: string) {
  ctx.save(); ctx.fillStyle = color; ctx.strokeStyle = color;
  const topX = x + lean, topY = base - height;
  ctx.lineCap = 'round';
  for (let i = 0; i < 18; i++) {
    const t0 = i / 18, t1 = (i + 1) / 18;
    const px = (t: number) => x + lean * t * t, py = (t: number) => base - height * t;
    ctx.lineWidth = 26 - 14 * t0;
    ctx.beginPath(); ctx.moveTo(px(t0), py(t0)); ctx.lineTo(px(t1), py(t1)); ctx.stroke();
  }
  const fronds = [-2.7, -2.2, -1.7, -1.2, -0.7, -0.25, 0.2, 0.65, 3.4, 2.9];
  for (const a of fronds) {
    const len = height * (0.42 + Math.abs(Math.sin(a * 3)) * 0.12);
    const ex = topX + Math.cos(a) * len, ey = topY + Math.sin(a) * len * 0.55 + len * 0.35;
    const cx = topX + Math.cos(a) * len * 0.5, cy = topY - len * 0.28;
    ctx.beginPath(); ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(cx, cy - 12, ex, ey);
    ctx.quadraticCurveTo(cx, cy + 18, topX, topY + 6);
    ctx.fill();
    ctx.lineWidth = 2;
    for (let k = 1; k < 9; k++) {
      const t = k / 9, bx = (1 - t) ** 2 * topX + 2 * (1 - t) * t * cx + t * t * ex, by = (1 - t) ** 2 * topY + 2 * (1 - t) * t * (cy - 3) + t * t * ey;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a + 1.3) * 26 * (1 - t), by + 22 * (1 - t) + 10); ctx.stroke();
    }
  }
  ctx.restore();
}

function sun(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colors: string[], bg: string) {
  ctx.save();
  const glow = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 2.2);
  glow.addColorStop(0, colors[1] + '88'); glow.addColorStop(1, colors[1] + '00');
  ctx.fillStyle = glow; ctx.fillRect(x - r * 2.5, y - r * 2.5, r * 5, r * 5);
  const g = ctx.createLinearGradient(0, y - r, 0, y + r);
  g.addColorStop(0, colors[0]); g.addColorStop(1, colors[1]);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
  ctx.fillStyle = bg;
  for (let i = 0; i < 7; i++) { const yy = y + r * 0.1 + i * r * 0.14, hgt = 3 + i * 3.4; ctx.fillRect(x - r - 2, yy, r * 2 + 4, hgt); }
  ctx.restore();
}

function grid(ctx: CanvasRenderingContext2D, horizon: number, color: string) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.shadowColor = color; ctx.shadowBlur = 12;
  const fill = ctx.createLinearGradient(0, horizon, 0, H); fill.addColorStop(0, '#12002a'); fill.addColorStop(1, '#050010');
  ctx.fillStyle = fill; ctx.fillRect(0, horizon, W, H - horizon);
  for (let i = -24; i <= 24; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 22, horizon); ctx.lineTo(W / 2 + i * 190, H); ctx.stroke(); }
  for (let i = 0; i < 9; i++) { const y = horizon + (H - horizon) * (i / 8) ** 2.1; ctx.globalAlpha = 0.35 + i / 12; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.restore();
}

function skyline(ctx: CanvasRenderingContext2D, base: number, color: string, seed: number, lit: string) {
  const r = rng(seed); ctx.save();
  let x = -20;
  while (x < W) {
    const w = 40 + r() * 90, h = 60 + r() * 230;
    ctx.fillStyle = color; ctx.fillRect(x, base - h, w, h);
    if (r() > 0.6) { ctx.fillRect(x + w / 2 - 3, base - h - 40, 6, 40); }
    ctx.fillStyle = lit;
    for (let yy = base - h + 12; yy < base - 10; yy += 16) for (let xx = x + 8; xx < x + w - 8; xx += 14) if (r() > 0.72) ctx.fillRect(xx, yy, 6, 8);
    x += w + 4 + r() * 12;
  }
  ctx.restore();
}

function titleText(ctx: CanvasRenderingContext2D, lines: string[], fill: string[], x: number, y: number, maxW: number, size: number) {
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  let yy = y;
  lines.forEach((line, i) => {
    let s = size * (i === 1 && lines[1].length <= 6 ? 1.2 : 1);
    ctx.font = `${s}px Anton, Impact, sans-serif`;
    while (ctx.measureText(line).width > maxW && s > 40) { s -= 4; ctx.font = `${s}px Anton, Impact, sans-serif`; }
    yy += s * 0.98;
    ctx.save(); ctx.translate(x, yy); ctx.transform(1, 0, -0.14, 1, 0, 0);
    // extruded 3D shadow
    for (let d = 14; d > 0; d -= 2) { ctx.fillStyle = `rgba(20,0,40,${0.35 + (14 - d) / 40})`; ctx.fillText(line, d, d); }
    const g = ctx.createLinearGradient(0, -s * 0.9, 0, 0);
    g.addColorStop(0, fill[0]); g.addColorStop(0.55, fill[1]); g.addColorStop(0.56, fill[2]); g.addColorStop(1, fill[0]);
    ctx.fillStyle = g; ctx.fillText(line, 0, 0);
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.strokeText(line, 0, 0);
    ctx.restore();
    yy += 6;
  });
  ctx.restore();
  return yy;
}

function neonScript(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, rotate = -0.12) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotate);
  ctx.font = `${size}px 'Mr Dafoe', cursive`;
  ctx.shadowColor = color; ctx.shadowBlur = 30; ctx.fillStyle = color; ctx.fillText(text, 0, 0);
  ctx.shadowBlur = 8; ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.75; ctx.fillText(text, 0, 0);
  ctx.restore();
}

async function ensureFonts() {
  try { await Promise.all([document.fonts.load('100px Anton'), document.fonts.load("100px 'Mr Dafoe'"), document.fonts.load("600 20px 'Chakra Petch'")]); } catch { /* fall back to system fonts */ }
}

const cache = new Map<string, Promise<string>>();

export function posterUrl(id: PosterId, portrait = false): Promise<string> {
  const key = `${id}|${portrait}`;
  let p = cache.get(key);
  if (!p) { p = paint(id, portrait); cache.set(key, p); }
  return p;
}

async function paint(id: PosterId, portrait: boolean): Promise<string> {
  await ensureFonts();
  W = portrait ? 1080 : 1800; H = portrait ? 1480 : 760;
  const s = specs[id];
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.75);
  s.sky.forEach((col, i) => sky.addColorStop(i / (s.sky.length - 1), col));
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  const r = rng(id.length * 977);
  // stars
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 90; i++) { ctx.globalAlpha = r() * 0.7; ctx.fillRect(r() * W, r() * H * 0.45, 2, 2); }
  ctx.globalAlpha = 1;
  const horizon = H * 0.68;

  if (s.motif === 'rays') {
    ctx.save(); ctx.translate(W * 0.72, H * 0.55);
    for (let i = 0; i < 24; i++) { ctx.rotate(Math.PI / 12); ctx.fillStyle = i % 2 ? 'rgba(255,60,170,.16)' : 'rgba(70,245,255,.08)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1400, -120); ctx.lineTo(1400, 120); ctx.fill(); }
    ctx.restore();
    // disco ball
    const bx = W * 0.72, by = H * 0.4, br = 120;
    const bg = ctx.createRadialGradient(bx - 40, by - 40, 10, bx, by, br); bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.4, '#c9b6e6'); bg.addColorStop(1, '#3a1e5a');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.clip(); ctx.strokeStyle = 'rgba(20,0,40,.45)'; ctx.lineWidth = 2;
    for (let i = -6; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(bx - br, by + i * 20); ctx.lineTo(bx + br, by + i * 20); ctx.stroke(); ctx.beginPath(); ctx.ellipse(bx, by, Math.abs(i) * 20, br, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = '#d7c8ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx, by - br); ctx.stroke();
    for (let i = 0; i < 40; i++) { ctx.fillStyle = r() > 0.5 ? '#46f5ff' : '#ff4fb0'; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(r() * W, r() * H, 3 + r() * 5, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    skyline(ctx, H, '#0b0118', 11, 'rgba(255,90,200,.55)');
  } else if (s.motif === 'road') {
    sun(ctx, W * 0.74, horizon - 40, 170, ['#ffe06b', '#ff3f7a'], s.sky[2]);
    skyline(ctx, horizon, '#0a1a2c', 5, 'rgba(255,210,120,.6)');
    ctx.fillStyle = '#061019'; ctx.fillRect(0, horizon, W, H - horizon);
    ctx.fillStyle = '#16222e'; ctx.beginPath(); ctx.moveTo(W * 0.6, horizon); ctx.lineTo(W * 0.66, horizon); ctx.lineTo(W * 1.15, H); ctx.lineTo(W * 0.05, H); ctx.fill();
    ctx.fillStyle = '#ffd35a'; for (let i = 0; i < 7; i++) { const t = i / 7, t2 = t + 0.06; const y1 = horizon + (H - horizon) * t ** 1.6, y2 = horizon + (H - horizon) * t2 ** 1.6; const x1 = W * 0.63 + (W * 0.6 - W * 0.63) * t ** 1.6, x2 = W * 0.63 + (W * 0.6 - W * 0.63) * t2 ** 1.6; const w1 = 3 + 16 * t, w2 = 3 + 16 * t2; ctx.beginPath(); ctx.moveTo(x1 - w1, y1); ctx.lineTo(x1 + w1, y1); ctx.lineTo(x2 + w2, y2); ctx.lineTo(x2 - w2, y2); ctx.fill(); }
    // speed streaks
    for (let i = 0; i < 26; i++) { const y = horizon + 20 + r() * (H - horizon - 30), x = r() * W; const g = ctx.createLinearGradient(x, 0, x + 400, 0); g.addColorStop(0, 'rgba(255,60,120,0)'); g.addColorStop(1, r() > 0.5 ? 'rgba(255,80,120,.8)' : 'rgba(80,240,255,.7)'); ctx.fillStyle = g; ctx.fillRect(x, y, 400, 3); }
    // tail lights
    ctx.shadowColor = '#ff2040'; ctx.shadowBlur = 40; ctx.fillStyle = '#ff3b52'; ctx.fillRect(W * 0.64, H * 0.84, 110, 16); ctx.fillRect(W * 0.8, H * 0.84, 110, 16); ctx.shadowBlur = 0;
    ctx.fillStyle = '#0c0f18'; ctx.beginPath(); ctx.moveTo(W * 0.61, H * 0.93); ctx.lineTo(W * 0.62, H * 0.8); ctx.lineTo(W * 0.66, H * 0.72); ctx.lineTo(W * 0.83, H * 0.72); ctx.lineTo(W * 0.88, H * 0.8); ctx.lineTo(W * 0.89, H * 0.93); ctx.fill();
    ctx.shadowColor = '#ff2040'; ctx.shadowBlur = 30; ctx.fillStyle = '#ff3b52'; ctx.fillRect(W * 0.625, H * 0.815, 90, 12); ctx.fillRect(W * 0.785, H * 0.815, 90, 12); ctx.shadowBlur = 0;
  } else if (s.motif === 'sun' || s.motif === 'grid') {
    sun(ctx, W * (s.motif === 'sun' ? 0.76 : 0.72), horizon - 20, s.motif === 'sun' ? 220 : 250, s.sun!, s.sky[2]);
    skyline(ctx, horizon, '#1a0530', 3, 'rgba(255,200,230,.45)');
    grid(ctx, horizon, s.motif === 'sun' ? '#ff4fa2' : '#ff3fd0');
  } else if (s.motif === 'waves') {
    sun(ctx, W * 0.74, horizon - 10, 190, s.sun!, s.sky[3]);
    const sea = ctx.createLinearGradient(0, horizon, 0, H); sea.addColorStop(0, '#0e7d8f'); sea.addColorStop(1, '#063447');
    ctx.fillStyle = sea; ctx.fillRect(0, horizon, W, H - horizon);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3;
    for (let row = 0; row < 7; row++) { const y = horizon + 14 + row * row * 5 + row * 6; ctx.beginPath(); for (let x = 0; x <= W; x += 10) ctx.lineTo(x, y + Math.sin(x / (30 + row * 8) + row) * (2 + row)); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,240,180,.45)'; for (let i = 0; i < 16; i++) ctx.fillRect(W * 0.74 - 120 + r() * 240, horizon + 6 + i * 6, 40 + r() * 80, 3);
  } else if (s.motif === 'city') {
    sun(ctx, W * 0.75, horizon, 200, ['#ffe86b', '#ff4f7a'], s.sky[2]);
    skyline(ctx, horizon + 20, '#16052a', 17, 'rgba(255,220,120,.6)');
    grid(ctx, horizon + 20, '#ffd84d');
  }
  const palmColor = '#0a0214';
  palm(ctx, W * 0.97, H + 20, H * 0.95, -120, palmColor);
  palm(ctx, W * 0.9, H + 30, H * 0.72, 90, palmColor);
  if (s.motif !== 'rays') palm(ctx, W * 0.52, H + 40, H * 0.55, -60, palmColor);

  // readable left panel
  const shade = portrait ? ctx.createLinearGradient(0, 0, 0, H * 0.55) : ctx.createLinearGradient(0, 0, W * 0.62, 0);
  shade.addColorStop(0, 'rgba(8,0,20,.62)'); shade.addColorStop(1, 'rgba(8,0,20,0)');
  ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);

  // kicker badge
  ctx.font = "600 30px 'Chakra Petch', sans-serif";
  const kw = ctx.measureText(s.kicker).width;
  ctx.fillStyle = s.accent; ctx.save(); ctx.transform(1, 0, -0.2, 1, 0, 0); ctx.fillRect(96, 64, kw + 44, 50); ctx.restore();
  ctx.fillStyle = '#12021f'; ctx.fillText(s.kicker, 92, 100);

  const bottom = titleText(ctx, s.title, s.titleFill, portrait ? 70 : 86, portrait ? 150 : 120, portrait ? W * 0.84 : W * 0.6, portrait ? 210 : 238);
  if (portrait) neonScript(ctx, s.script, 140, bottom + 110, 130, s.scriptColor, -0.1);
  else neonScript(ctx, s.script, 120 + Math.min(W * 0.28, 60 * s.title[0].length), Math.min(bottom + 20, H - 110), 120, s.scriptColor);

  // tagline strip
  ctx.fillStyle = 'rgba(8,0,20,.78)'; ctx.fillRect(0, H - 72, W, 72);
  ctx.fillStyle = s.accent; ctx.fillRect(0, H - 72, W, 4);
  ctx.font = `600 ${portrait ? 21 : 28}px 'Chakra Petch', sans-serif`; ctx.fillStyle = '#fff2e6';
  ctx.save(); ctx.letterSpacing = portrait ? '2px' : '6px'; ctx.fillText(s.tagline, portrait ? 50 : 92, H - 26); ctx.restore();
  if (!portrait) { ctx.font = "700 26px 'Chakra Petch', sans-serif"; ctx.fillStyle = s.accent; ctx.textAlign = 'right'; ctx.fillText('★ VICE CITY', W - 60, H - 26); ctx.textAlign = 'left'; }

  // print texture
  ctx.globalAlpha = 0.07; for (let i = 0; i < 2600; i++) { ctx.fillStyle = r() > 0.5 ? '#fff' : '#000'; ctx.fillRect(r() * W, r() * H, 2, 2); } ctx.globalAlpha = 1;
  return c.toDataURL('image/jpeg', 0.92);
}
