export type Point = [number, number];
export type SceneId = 'boulevard' | 'nightclub' | 'storefront' | 'causeway' | 'drivein' | 'plane' | 'busstop' | 'taxi';
export interface CityScene {
  id: SceneId;
  title: string;
  district: string;
  type: string;
  time: string;
  description: string;
  corners: [Point, Point, Point, Point];
  surface: 'billboard' | 'screen' | 'sign' | 'banner';
  glow: number;
  /** Position on the stylised minimap, in percent. */
  map: [number, number];
  color: string;
  subtitle: string;
  /** Daily audience, shown on location cards. */
  eyes: string;
}

// Coordinates refer to the four inside corners of each original 1536×1024 scene.
export const scenes: CityScene[] = [
  { id: 'boulevard', title: 'Ocean Drive', district: 'Ocean Beach', type: 'Billboard', time: '7:42 PM', description: 'Forty feet of sunset real estate above the most famous strip in the city.', corners: [[811, 212], [1374, 165], [1384, 405], [811, 442]], surface: 'billboard', glow: 0.5, map: [70, 38], color: '#ff3d8b', eyes: '1.2M', subtitle: 'Whole city drives past this thing at sunset. Your ad goes up tonight.' },
  { id: 'nightclub', title: 'The Velvet', district: 'Neon District', type: 'Club Mega-Screen', time: '12:08 AM', description: 'The LED wall over the hottest velvet rope in town. Midnight crowds, zero chill.', corners: [[454, 197], [1081, 197], [1096, 493], [442, 493]], surface: 'screen', glow: 0.75, map: [44, 30], color: '#b04dff', eyes: '640K', subtitle: 'Line’s around the block. Every phone in it is about to point at your screen.' },
  { id: 'causeway', title: 'Starfish Causeway', district: 'The Bay', type: 'Highway Mega-Board', time: '8:30 PM', description: 'The biggest board in the city, burning over six lanes of bay-bridge traffic.', corners: [[300, 70], [1147, 138], [1147, 402], [300, 366]], surface: 'billboard', glow: 0.6, map: [16, 45], color: '#4d8bff', eyes: '2.1M', subtitle: 'Six lanes, bumper to bumper, all night. Nobody’s getting off this bridge without seeing you.' },
  { id: 'drivein', title: 'Sunset Drive-In', district: 'Palm Harbor', type: 'Drive-In Screen', time: '9:14 PM', description: 'Two hundred convertibles, one giant screen. Tonight’s feature is you.', corners: [[391, 132], [1093, 169], [1093, 495], [388, 481]], surface: 'screen', glow: 0.85, map: [84, 72], color: '#ffc94d', eyes: '380K', subtitle: 'Two hundred cars, one giant screen, and nobody’s watching the movie tonight.' },
  { id: 'plane', title: 'Vice Beach', district: 'Ocean Front', type: 'Banner Plane', time: '6:58 PM', description: 'A propeller plane dragging your message over two miles of sand at golden hour.', corners: [[109, 128], [945, 164], [951, 349], [113, 335]], surface: 'banner', glow: 0.1, map: [27, 16], color: '#3ff2a0', eyes: '900K', subtitle: 'Every towel on the beach is about to look up. Wave hi.' },
  { id: 'storefront', title: 'Palm Boulevard', district: 'Little Havana', type: 'Storefront Marquee', time: '8:16 PM', description: 'Art-deco marquee on the corner everyone walks past on the way to the beach.', corners: [[446, 188], [1101, 188], [1101, 374], [446, 374]], surface: 'sign', glow: 0.4, map: [50, 64], color: '#27e0d3', eyes: '410K', subtitle: 'Old-school deco, brand-new message. The whole block’s gonna see it.' },
  { id: 'busstop', title: 'Starlight Avenue', district: 'Vice Beach', type: 'Bus Shelter Poster', time: '8:51 PM', description: 'A backlit glass shelter on the busiest wet sidewalk in the neon strip.', corners: [[296, 136], [767, 144], [759, 784], [289, 787]], surface: 'sign', glow: 0.55, map: [62, 52], color: '#ff8a3d', eyes: '520K', subtitle: 'Night bus, scooters, the whole late crowd — they all wait right in front of this glass.' },
  { id: 'taxi', title: 'Cab 86', district: 'Downtown', type: 'Taxi Topper', time: '11:47 PM', description: 'A rolling light-box on the city’s most famous yellow cab. Goes everywhere, all night.', corners: [[414, 97], [945, 138], [946, 277], [416, 252]], surface: 'sign', glow: 0.55, map: [38, 84], color: '#ff5d5d', eyes: '300K', subtitle: 'Cab 86 does three hundred rides a night. Your ad rides shotgun on every one.' },
];

const imageCache = new Map<string, Promise<HTMLImageElement>>();
export function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) return cached;
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => { imageCache.delete(src); reject(new Error('This image could not be loaded. Please try another image.')); };
    img.src = src;
  });
  // Only cache bundled assets, not potentially large user uploads.
  if (src.startsWith('/images/')) imageCache.set(src, promise);
  return promise;
}

function project(quad: CityScene['corners']) {
  const [p0, p1, p2, p3] = quad;
  const dx1 = p1[0] - p2[0], dx2 = p3[0] - p2[0], sx = p0[0] - p1[0] + p2[0] - p3[0];
  const dy1 = p1[1] - p2[1], dy2 = p3[1] - p2[1], sy = p0[1] - p1[1] + p2[1] - p3[1];
  const determinant = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / determinant;
  const h = (dx1 * sy - sx * dy1) / determinant;
  const a = p1[0] - p0[0] + g * p1[0], b = p3[0] - p0[0] + h * p3[0];
  const d = p1[1] - p0[1] + g * p1[1], e = p3[1] - p0[1] + h * p3[1];
  return (u: number, v: number): Point => [(a * u + b * v + p0[0]) / (g * u + h * v + 1), (d * u + e * v + p0[1]) / (g * u + h * v + 1)];
}

function triangle(ctx: CanvasRenderingContext2D, image: HTMLCanvasElement, src: Point[], dst: Point[]) {
  const [s0, s1, s2] = src, [d0, d1, d2] = dst;
  const den = s0[0] * (s1[1] - s2[1]) + s1[0] * (s2[1] - s0[1]) + s2[0] * (s0[1] - s1[1]);
  const calc = (axis: number) => [
    (d0[axis] * (s1[1] - s2[1]) + d1[axis] * (s2[1] - s0[1]) + d2[axis] * (s0[1] - s1[1])) / den,
    (d0[axis] * (s2[0] - s1[0]) + d1[axis] * (s0[0] - s2[0]) + d2[axis] * (s1[0] - s0[0])) / den,
    (d0[axis] * (s1[0] * s2[1] - s2[0] * s1[1]) + d1[axis] * (s2[0] * s0[1] - s0[0] * s2[1]) + d2[axis] * (s0[0] * s1[1] - s1[0] * s0[1])) / den,
  ];
  const [a, c, e] = calc(0), [b, d, f] = calc(1);
  ctx.save();
  ctx.beginPath();
  // A tiny overlap eliminates anti-alias seams between mesh triangles.
  const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3;
  dst.forEach(([x, y], i) => { const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy); const px = x + dx / l * .45, py = y + dy / l * .45; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
  ctx.closePath(); ctx.clip(); ctx.transform(a, b, c, d, e, f);
  ctx.drawImage(image, 0, 0); ctx.restore();
}

export async function renderScene(scene: CityScene, artwork: string, canvas: HTMLCanvasElement, fit: 'contain' | 'cover' = 'contain', watermark = false) {
  const [background, art] = await Promise.all([loadImage(`/images/${scene.id}.webp`), loadImage(artwork)]);
  canvas.width = 1536; canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser does not support image export.');
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(background, 0, 0, 1536, 1024);
  const [q0, q1, , q3] = scene.corners;
  const across = Math.hypot(q1[0] - q0[0], q1[1] - q0[1]), down = Math.hypot(q3[0] - q0[0], q3[1] - q0[1]);
  const width = across < down ? 900 : 1200, height = Math.round(width * down / across);
  const fitted = document.createElement('canvas'); fitted.width = width; fitted.height = height;
  const fctx = fitted.getContext('2d')!;
  fctx.fillStyle = '#12051c'; fctx.fillRect(0, 0, width, height);
  if (fit === 'contain') {
    // Fill letterbox gaps with a blurred, darkened copy so the surface never looks empty.
    const cover = Math.max(width / art.width, height / art.height);
    fctx.save(); fctx.filter = 'blur(24px) brightness(.55) saturate(1.3)';
    fctx.drawImage(art, (width - art.width * cover) / 2, (height - art.height * cover) / 2, art.width * cover, art.height * cover);
    fctx.restore();
  }
  const ratio = (fit === 'cover' ? Math.max : Math.min)(width / art.width, height / art.height);
  fctx.drawImage(art, (width - art.width * ratio) / 2, (height - art.height * ratio) / 2, art.width * ratio, art.height * ratio);
  if (scene.surface === 'screen') {
    // LED pixel pitch
    fctx.fillStyle = 'rgba(0,0,0,.18)';
    for (let y = 0; y < height; y += 4) fctx.fillRect(0, y, width, 1);
    for (let x = 0; x < width; x += 4) fctx.fillRect(x, 0, 1, height);
  }
  if (scene.surface === 'banner') {
    // Fabric: soft vertical folds and a hem shadow.
    for (let x = 0; x < width; x += 4) {
      const f = Math.sin(x / width * Math.PI * 7 + 0.6) * 0.5 + Math.sin(x / width * Math.PI * 17) * 0.15;
      fctx.fillStyle = f > 0 ? `rgba(255,236,210,${f * 0.1})` : `rgba(20,0,20,${-f * 0.16})`;
      fctx.fillRect(x, 0, 4, height);
    }
    const hem = fctx.createLinearGradient(0, 0, 0, height);
    hem.addColorStop(0, 'rgba(0,0,0,.18)'); hem.addColorStop(0.08, 'rgba(0,0,0,0)'); hem.addColorStop(0.92, 'rgba(0,0,0,0)'); hem.addColorStop(1, 'rgba(0,0,0,.22)');
    fctx.fillStyle = hem; fctx.fillRect(0, 0, width, height);
  }
  const layer = document.createElement('canvas'); layer.width = 1536; layer.height = 1024;
  const lctx = layer.getContext('2d')!;
  lctx.imageSmoothingEnabled = true; lctx.imageSmoothingQuality = 'high';
  const map = project(scene.corners), columns = 20, rows = 10;
  lctx.save(); lctx.beginPath(); scene.corners.forEach(([x, y], i) => i === 0 ? lctx.moveTo(x, y) : lctx.lineTo(x, y)); lctx.closePath(); lctx.clip();
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    const u = x / columns, v = y / rows, u2 = (x + 1) / columns, v2 = (y + 1) / rows;
    const s: Point[] = [[u * width, v * height], [u2 * width, v * height], [u2 * width, v2 * height], [u * width, v2 * height]];
    const t = [map(u, v), map(u2, v), map(u2, v2), map(u, v2)];
    triangle(lctx, fitted, [s[0], s[1], s[2]], [t[0], t[1], t[2]]);
    triangle(lctx, fitted, [s[0], s[2], s[3]], [t[0], t[2], t[3]]);
  }
  const sheen = lctx.createLinearGradient(q0[0], q0[1], q1[0], q3[1]);
  sheen.addColorStop(0, 'rgba(255,220,240,0.12)'); sheen.addColorStop(.45, 'rgba(255,255,255,0)'); sheen.addColorStop(1, 'rgba(26,6,38,0.18)');
  lctx.fillStyle = sheen; lctx.fillRect(0, 0, 1536, 1024); lctx.restore();

  // Emissive bloom: the artwork lights up the air and buildings around it.
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  ctx.filter = 'blur(38px)'; ctx.globalAlpha = scene.glow; ctx.drawImage(layer, 0, 0);
  ctx.filter = 'blur(90px)'; ctx.globalAlpha = scene.glow * 0.8; ctx.drawImage(layer, 0, 18);
  ctx.restore();
  ctx.drawImage(layer, 0, 0);
  // Inner edge shade so the art sits inside its frame.
  ctx.save(); ctx.beginPath(); scene.corners.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)); ctx.closePath(); ctx.clip();
  ctx.lineWidth = 14; ctx.strokeStyle = 'rgba(10,0,20,.35)'; ctx.filter = 'blur(6px)'; ctx.stroke(); ctx.restore();

  if (watermark) {
    ctx.save();
    ctx.fillStyle = 'rgba(8,2,16,.72)'; ctx.fillRect(1536 - 430, 1024 - 70, 400, 44);
    ctx.fillStyle = '#ff3d8b'; ctx.fillRect(1536 - 430, 1024 - 70, 6, 44);
    ctx.font = "600 18px 'Chakra Petch', sans-serif"; ctx.fillStyle = '#fff'; ctx.fillText('VICE CITY BILLBOARD TAKEOVER', 1536 - 410, 1024 - 42);
    ctx.fillStyle = '#ffc94d'; ctx.fillText('★', 1536 - 58, 1024 - 42);
    ctx.restore();
  }
}

/** Where the artwork sits in the scene, in percent — used to aim the camera. */
export const isPortrait = (scene: CityScene) => {
  const [q0, q1, , q3] = scene.corners;
  return Math.hypot(q1[0] - q0[0], q1[1] - q0[1]) < Math.hypot(q3[0] - q0[0], q3[1] - q0[1]);
};

export function sceneFocus(scene: CityScene) {
  const xs = scene.corners.map(c => c[0]), ys = scene.corners.map(c => c[1]);
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2 / 15.36, y: (Math.min(...ys) + Math.max(...ys)) / 2 / 10.24 };
}

export function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not create the download. Please try again.')), 'image/png'));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}
