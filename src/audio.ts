// Fully procedural audio: every sound effect and every radio track is synthesized
// live with the Web Audio API, so there are no licensed samples to ship.

type Note = [step: number, midi: number, length: number];
interface Bar { root: number; pad: number[]; lead?: Note[] }
export interface Station {
  id: string;
  name: string;
  freq: string;
  genre: string;
  color: string;
  tracks: string[];
  bpm: number;
  swing: number;
  bars: Bar[];
  kick: number[];
  snare: number[];
  hats: number[];
  bass: (root: number, step: number) => number | null;
  arp: boolean;
  leadWave: OscillatorType;
  leadFrom: number;
}

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export const stations: Station[] = [
  {
    id: 'vicewave', name: 'VICE WAVE', freq: '88.1', genre: 'Synthwave', color: '#ff3d8b',
    tracks: ['Sunset Protocol', 'Chrome Hearts on Ocean Drive', 'Pastel Getaway'],
    bpm: 104, swing: 0, arp: true, leadWave: 'sawtooth', leadFrom: 4,
    kick: [0, 8, 10], snare: [4, 12], hats: [0, 2, 4, 6, 8, 10, 12, 14],
    bass: (r, s) => (s % 2 === 0 ? (s % 8 === 4 ? r + 12 : r) : null),
    bars: [
      { root: 45, pad: [57, 60, 64], lead: [[0, 76, 6], [6, 74, 2], [8, 72, 4], [12, 71, 4]] },
      { root: 41, pad: [57, 60, 65], lead: [[0, 72, 6], [6, 69, 2], [8, 72, 4], [12, 74, 4]] },
      { root: 48, pad: [55, 60, 64], lead: [[0, 76, 6], [6, 79, 2], [8, 76, 4], [12, 72, 4]] },
      { root: 43, pad: [55, 59, 62], lead: [[0, 74, 8], [8, 71, 4], [12, 74, 4]] },
    ],
  },
  {
    id: 'nightdrive', name: 'NIGHT DRIVE', freq: '99.9', genre: 'Outrun', color: '#27e0d3',
    tracks: ['Midnight Interstate', 'Red Lights, Fast Heart', 'No Brakes Till Dawn'],
    bpm: 118, swing: 0, arp: false, leadWave: 'square', leadFrom: 2,
    kick: [0, 4, 8, 12], snare: [4, 12], hats: [2, 6, 10, 14],
    bass: (r, s) => (s % 4 === 3 ? r + 12 : r),
    bars: [
      { root: 38, pad: [62, 65, 69], lead: [[0, 74, 3], [3, 77, 3], [6, 81, 4], [12, 79, 4]] },
      { root: 34, pad: [58, 62, 65], lead: [[0, 77, 3], [3, 74, 3], [6, 70, 6], [14, 72, 2]] },
      { root: 43, pad: [58, 62, 67], lead: [[0, 74, 3], [3, 70, 3], [6, 67, 6], [14, 69, 2]] },
      { root: 45, pad: [57, 61, 64], lead: [[0, 73, 6], [8, 76, 4], [12, 69, 4]] },
    ],
  },
  {
    id: 'palmfm', name: 'PALM FM', freq: '102.4', genre: 'Sunset Chillwave', color: '#ffb23f',
    tracks: ['Golden Hour Forever', 'Pool Party at Starfish Isle', 'Slow Wave Goodbye'],
    bpm: 86, swing: 0.16, arp: false, leadWave: 'triangle', leadFrom: 0,
    kick: [0, 7, 10], snare: [4, 12], hats: [0, 2, 4, 6, 8, 10, 12, 14],
    bass: (r, s) => (s === 0 || s === 12 ? r : s === 10 ? r + 7 : null),
    bars: [
      { root: 41, pad: [57, 60, 64, 65], lead: [[0, 76, 4], [4, 74, 2], [6, 72, 4], [12, 69, 4]] },
      { root: 40, pad: [55, 59, 62, 64], lead: [[2, 71, 2], [4, 72, 4], [8, 74, 8]] },
      { root: 38, pad: [53, 57, 60, 62], lead: [[0, 72, 4], [4, 69, 2], [6, 67, 6], [14, 69, 2]] },
      { root: 36, pad: [55, 59, 60, 64], lead: [[0, 67, 8], [8, 64, 8]] },
    ],
  },
];

type Listener = () => void;

class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private musicFilter!: BiquadFilterNode;
  private sfxBus!: GainNode;
  private reverb!: ConvolverNode;
  private delay!: DelayNode;
  private noise!: AudioBuffer;
  analyser: AnalyserNode | null = null;
  private timer = 0;
  private step = 0;
  private nextTime = 0;
  stationIndex = 0;
  playing = false;
  muted = false;
  private listeners = new Set<Listener>();

  constructor() {
    // Mute only lasts for the current visit, so every new visit opens with the music playing.
    try { this.muted = sessionStorage.getItem('vcbt-muted') === '1'; } catch { /* storage unavailable */ }
  }

  subscribe(fn: Listener) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private emit() {
    this.listeners.forEach(fn => fn());
    try { sessionStorage.setItem('vcbt-muted', this.muted ? '1' : '0'); } catch { /* ignore */ }
  }
  get station() { return stations[this.stationIndex]; }

  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      this.ctx = ctx;
      ctx.onstatechange = () => this.emit();
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
      this.master.connect(comp).connect(ctx.destination);
      this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 64; this.analyser.smoothingTimeConstant = 0.78;
      this.musicFilter = ctx.createBiquadFilter(); this.musicFilter.type = 'lowpass'; this.musicFilter.frequency.value = 18000; this.musicFilter.Q.value = 0.7;
      this.musicBus = ctx.createGain(); this.musicBus.gain.value = 0.5;
      this.musicBus.connect(this.musicFilter).connect(this.master);
      this.musicFilter.connect(this.analyser);
      this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = 0.8; this.sfxBus.connect(this.master);
      this.reverb = ctx.createConvolver(); this.reverb.buffer = this.impulse(2.6);
      const rv = ctx.createGain(); rv.gain.value = 0.42; this.reverb.connect(rv).connect(this.master);
      this.delay = ctx.createDelay(1); const fb = ctx.createGain(); fb.gain.value = 0.34; const dw = ctx.createGain(); dw.gain.value = 0.26;
      this.delay.connect(fb).connect(this.delay); this.delay.connect(dw).connect(this.musicBus);
      this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = this.noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private impulse(seconds: number) {
    const ctx = this.ctx!, len = ctx.sampleRate * seconds, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3.2; }
    return buf;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.05);
    this.emit();
  }

  /** Muffle the music like a game pause menu (used while editing / during cutscenes). */
  setMood(mood: 'open' | 'studio' | 'cutscene') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const f = mood === 'open' ? 18000 : mood === 'studio' ? 2600 : 700;
    const g = mood === 'open' ? 0.5 : mood === 'studio' ? 0.36 : 0.22;
    this.musicFilter.frequency.cancelScheduledValues(t);
    this.musicFilter.frequency.setTargetAtTime(f, t, 0.35);
    this.musicBus.gain.setTargetAtTime(g, t, 0.35);
  }

  // ───────────────────────────── Radio ─────────────────────────────
  /** True once the browser has actually let sound out. */
  get running() { return this.ctx?.state === 'running'; }

  /**
   * Queue VICE WAVE the moment the page loads. If the browser allows autoplay it plays right
   * away; otherwise the scheduled music sits silent and starts on the visitor's first
   * click, tap or key press anywhere (browsers only unlock sound on a real gesture).
   */
  autoplay() {
    if (!this.playing) this.startRadio(0);
    if (this.running) return;
    const events = ['pointerdown', 'keydown', 'touchend', 'click'] as const;
    const unlock = () => {
      this.unlock();
      if (this.running || this.ctx?.state === 'running') events.forEach(e => window.removeEventListener(e, unlock, true));
    };
    events.forEach(e => window.addEventListener(e, unlock, true));
    this.ctx?.addEventListener('statechange', () => { if (this.running) events.forEach(e => window.removeEventListener(e, unlock, true)); });
  }

  startRadio(index = this.stationIndex) {
    this.unlock();
    if (!this.ctx) return;
    this.stationIndex = index;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.35;
    this.tuneStatic();
    const t = this.ctx.currentTime;
    this.musicFilter.frequency.cancelScheduledValues(t);
    this.musicFilter.frequency.setValueAtTime(500, t);
    this.musicFilter.frequency.exponentialRampToValueAtTime(18000, t + 1.8);
    this.delay.delayTime.value = (60 / this.station.bpm) * 0.75;
    if (!this.timer) this.timer = window.setInterval(() => this.schedule(), 25);
    this.playing = true;
    this.emit();
  }
  stopRadio() {
    window.clearInterval(this.timer); this.timer = 0; this.playing = false;
    if (this.ctx) this.tuneStatic(0.25);
    this.emit();
  }
  nextStation(dir = 1) { this.startRadio((this.stationIndex + dir + stations.length) % stations.length); }
  get trackName() { const s = this.station; return s.tracks[Math.floor(this.step / 128) % s.tracks.length]; }

  private schedule() {
    const ctx = this.ctx!;
    const s = this.station, sixteenth = 60 / s.bpm / 4;
    while (this.nextTime < ctx.currentTime + 0.14) {
      const st = this.step % 16, barIndex = Math.floor(this.step / 16), bar = s.bars[barIndex % 4];
      const section = barIndex % 8;
      const t = this.nextTime + (st % 2 === 1 ? s.swing * sixteenth : 0);
      if (s.kick.includes(st)) this.kick(t);
      if (s.snare.includes(st) && barIndex > 0) this.snare(t, s.id === 'palmfm' ? 0.45 : 1);
      if (s.hats.includes(st) && barIndex > 0) this.hat(t, st % 4 === 2 ? 0.09 : 0.05);
      if (s.id === 'nightdrive' && st % 2 === 1 && section >= 2) this.hat(t, 0.025);
      const b = s.bass(bar.root, st);
      if (b !== null) this.bass(t, b, sixteenth * (s.id === 'palmfm' ? 5 : 1.6));
      if (st === 0) this.pad(t, bar.pad, sixteenth * 16);
      if (s.arp && section >= 1) { const tones = [...bar.pad, bar.pad[0] + 12]; this.pluck(t, tones[[0, 1, 2, 3, 2, 1, 3, 1][st % 8]] + 12, sixteenth * 0.9, 0.035); }
      if (bar.lead && section >= s.leadFrom) for (const [ns, n, len] of bar.lead) if (ns === st) this.lead(t, n + (s.id === 'palmfm' ? 12 : 0), sixteenth * len, s.leadWave);
      if (st === 0 && barIndex % 16 === 0 && barIndex > 0) this.crash(t);
      this.nextTime += sixteenth; this.step++;
      if (this.step % 128 === 0) this.emit();
    }
  }

  private env(g: GainNode, t: number, a: number, peak: number, d: number) {
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  private noiseSrc(t: number, dur: number) { const n = this.ctx!.createBufferSource(); n.buffer = this.noise; n.start(t, Math.random()); n.stop(t + dur); return n; }

  private kick(t: number) {
    const ctx = this.ctx!, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(155, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    this.env(g, t, 0.002, 0.95, 0.42); o.connect(g).connect(this.musicBus); o.start(t); o.stop(t + 0.5);
  }
  private snare(t: number, level = 1) {
    const ctx = this.ctx!, n = this.noiseSrc(t, 0.3), hp = ctx.createBiquadFilter(), g = ctx.createGain();
    hp.type = 'highpass'; hp.frequency.value = 1400; this.env(g, t, 0.001, 0.42 * level, 0.2);
    n.connect(hp).connect(g); g.connect(this.musicBus);
    const send = ctx.createGain(); send.gain.value = 0.9; g.connect(send).connect(this.reverb);
    const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(210, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    this.env(og, t, 0.001, 0.3 * level, 0.1); o.connect(og).connect(this.musicBus); o.start(t); o.stop(t + 0.2);
  }
  private hat(t: number, level: number) {
    const ctx = this.ctx!, n = this.noiseSrc(t, 0.08), hp = ctx.createBiquadFilter(), g = ctx.createGain();
    hp.type = 'highpass'; hp.frequency.value = 7500; this.env(g, t, 0.001, level, 0.045); n.connect(hp).connect(g).connect(this.musicBus);
  }
  private crash(t: number) {
    const ctx = this.ctx!, n = this.noiseSrc(t, 1.8), hp = ctx.createBiquadFilter(), g = ctx.createGain();
    hp.type = 'highpass'; hp.frequency.value = 5000; this.env(g, t, 0.002, 0.12, 1.6); n.connect(hp).connect(g); g.connect(this.musicBus); g.connect(this.reverb);
  }
  private bass(t: number, midi: number, dur: number) {
    const ctx = this.ctx!, o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o2.type = 'square'; o.frequency.value = hz(midi); o2.frequency.value = hz(midi - 12);
    f.type = 'lowpass'; f.Q.value = 6; f.frequency.setValueAtTime(1400, t); f.frequency.exponentialRampToValueAtTime(180, t + dur);
    this.env(g, t, 0.004, 0.2, dur); o.connect(f); o2.connect(f); f.connect(g).connect(this.musicBus);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  private pad(t: number, notes: number[], dur: number) {
    const ctx = this.ctx!, f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'lowpass'; f.frequency.setValueAtTime(700, t); f.frequency.linearRampToValueAtTime(2200, t + dur * 0.5); f.frequency.linearRampToValueAtTime(900, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.35); g.gain.setValueAtTime(0.05, t + dur - 0.2); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.25);
    f.connect(g); g.connect(this.musicBus); const s = ctx.createGain(); s.gain.value = 0.6; g.connect(s).connect(this.reverb);
    for (const n of notes) for (const det of [-9, 9]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(n); o.detune.value = det; o.connect(f); o.start(t); o.stop(t + dur + 0.3);
    }
  }
  private pluck(t: number, midi: number, dur: number, level: number) {
    const ctx = this.ctx!, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'square'; o.frequency.value = hz(midi); f.type = 'lowpass'; f.frequency.setValueAtTime(3800, t); f.frequency.exponentialRampToValueAtTime(600, t + dur);
    this.env(g, t, 0.002, level, dur); o.connect(f).connect(g); g.connect(this.musicBus); g.connect(this.delay); o.start(t); o.stop(t + dur + 0.05);
  }
  private lead(t: number, midi: number, dur: number, wave: OscillatorType) {
    const ctx = this.ctx!, f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    f.type = 'lowpass'; f.frequency.value = wave === 'triangle' ? 5000 : 3000; f.Q.value = 2;
    const peak = wave === 'triangle' ? 0.12 : 0.07;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + 0.02); g.gain.setValueAtTime(peak * 0.8, t + Math.max(0.03, dur - 0.05)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.3);
    lfo.frequency.value = 5.5; lg.gain.value = 9;
    lfo.connect(lg);
    for (const det of wave === 'triangle' ? [0] : [-7, 7]) {
      const o = ctx.createOscillator(); o.type = wave; o.frequency.value = hz(midi); o.detune.value = det; lg.connect(o.detune);
      o.connect(f); o.start(t); o.stop(t + dur + 0.35);
    }
    lfo.start(t); lfo.stop(t + dur + 0.35);
    f.connect(g); g.connect(this.musicBus); g.connect(this.delay); const s = ctx.createGain(); s.gain.value = 0.4; g.connect(s).connect(this.reverb);
  }

  // ───────────────────────────── SFX ─────────────────────────────
  private ready() { if (!this.ctx) return false; if (this.ctx.state === 'suspended') void this.ctx.resume(); return true; }
  private tone(freq: number, t: number, dur: number, type: OscillatorType, level: number, to?: number, dest: AudioNode = this.sfxBus) {
    const ctx = this.ctx!, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    this.env(g, t, 0.003, level, dur); o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05);
    return g;
  }
  private burst(t: number, dur: number, type: BiquadFilterType, freq: number, level: number, to?: number) {
    const ctx = this.ctx!, n = this.noiseSrc(t, dur + 0.05), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = type; f.frequency.setValueAtTime(freq, t); if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur); f.Q.value = 1.2;
    this.env(g, t, Math.min(0.01, dur / 4), level, dur); n.connect(f).connect(g).connect(this.sfxBus);
    return g;
  }

  hover() { if (!this.ready()) return; this.tone(2200, this.ctx!.currentTime, 0.025, 'sine', 0.035); }
  click() { if (!this.ready()) return; const t = this.ctx!.currentTime; this.tone(1100, t, 0.06, 'triangle', 0.16, 520); this.burst(t, 0.02, 'highpass', 4000, 0.08); }
  select() { if (!this.ready()) return; const t = this.ctx!.currentTime; this.tone(784, t, 0.07, 'square', 0.06); this.tone(1175, t + 0.06, 0.12, 'square', 0.06); }
  back() { if (!this.ready()) return; const t = this.ctx!.currentTime; this.tone(880, t, 0.06, 'square', 0.05); this.tone(587, t + 0.05, 0.1, 'square', 0.05); }
  whoosh(dur = 0.55) { if (!this.ready()) return; const t = this.ctx!.currentTime; this.burst(t, dur, 'bandpass', 250, 0.5, 3200); }
  tick() { if (!this.ready()) return; this.burst(this.ctx!.currentTime, 0.012, 'highpass', 3000, 0.05); }
  shutter() { if (!this.ready()) return; const t = this.ctx!.currentTime; this.burst(t, 0.03, 'bandpass', 2500, 0.4); this.burst(t + 0.07, 0.05, 'bandpass', 1800, 0.35); }
  notify() { if (!this.ready()) return; const t = this.ctx!.currentTime; this.tone(1319, t, 0.1, 'sine', 0.12); this.tone(1976, t + 0.09, 0.22, 'sine', 0.12); }
  error() { if (!this.ready()) return; const t = this.ctx!.currentTime; this.tone(220, t, 0.14, 'square', 0.07); this.tone(185, t + 0.13, 0.2, 'square', 0.07); }
  star(i = 0) { if (!this.ready()) return; const t = this.ctx!.currentTime; const f = [1047, 1175, 1319, 1568, 1760][i % 5]; this.tone(f, t, 0.25, 'triangle', 0.1); this.tone(f * 2, t, 0.15, 'sine', 0.04); }
  cash() {
    if (!this.ready()) return; const t = this.ctx!.currentTime;
    this.burst(t, 0.06, 'highpass', 2000, 0.3);
    this.tone(2093, t + 0.07, 0.5, 'sine', 0.13); this.tone(2637, t + 0.12, 0.6, 'sine', 0.11); this.tone(3136, t + 0.12, 0.4, 'sine', 0.05);
  }
  tuneStatic(dur = 0.45) {
    if (!this.ready()) return; const t = this.ctx!.currentTime;
    for (let i = 0; i < 4; i++) this.burst(t + i * dur / 4, dur / 4, 'bandpass', 700 + Math.random() * 2600, 0.16 + Math.random() * 0.08);
    this.tone(1400, t, dur * 0.8, 'sine', 0.03, 600);
  }
  impact() {
    if (!this.ready()) return; const t = this.ctx!.currentTime, ctx = this.ctx!;
    const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.8);
    this.env(g, t, 0.003, 1, 1.1); o.connect(g).connect(this.sfxBus); o.start(t); o.stop(t + 1.3);
    const n = this.burst(t, 0.5, 'lowpass', 3000, 0.5, 200); n.connect(this.reverb);
  }
  riser(dur = 2.6) {
    if (!this.ready()) return; const t = this.ctx!.currentTime, ctx = this.ctx!;
    const n = this.noiseSrc(t, dur + 0.1), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.Q.value = 3; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(7000, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.05);
    n.connect(f).connect(g).connect(this.sfxBus); g.connect(this.reverb);
    const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(880, t + dur);
    og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.06, t + dur); og.gain.linearRampToValueAtTime(0.0001, t + dur + 0.05);
    const of = ctx.createBiquadFilter(); of.type = 'lowpass'; of.frequency.value = 2400; o.connect(of).connect(og).connect(this.sfxBus); o.start(t); o.stop(t + dur + 0.1);
  }
  /** Electrical buzz with random dropouts — a neon sign struggling to light. */
  neonFlicker(dur = 1) {
    if (!this.ready()) return; const t = this.ctx!.currentTime, ctx = this.ctx!;
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = 118; f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.8;
    g.gain.setValueAtTime(0, t);
    let x = t; while (x < t + dur) { const on = Math.random() > 0.4; g.gain.setValueAtTime(on ? 0.1 + Math.random() * 0.12 : 0, x); if (on && Math.random() > 0.6) this.burst(x, 0.015, 'highpass', 5000, 0.12); x += 0.03 + Math.random() * 0.09; }
    g.gain.setValueAtTime(0.08, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.6);
    o.connect(f).connect(g).connect(this.sfxBus); o.start(t); o.stop(t + dur + 0.7);
  }
  /** A small prop plane droning past, panned left to right. */
  propeller(dur = 2) {
    if (!this.ready()) return; const t = this.ctx!.currentTime, ctx = this.ctx!;
    const o = ctx.createOscillator(), am = ctx.createOscillator(), amg = ctx.createGain(), f = ctx.createBiquadFilter(), g = ctx.createGain(), pan = ctx.createStereoPanner();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(96, t); o.frequency.linearRampToValueAtTime(84, t + dur);
    am.frequency.value = 28; amg.gain.value = 0.5; am.connect(amg).connect(g.gain);
    f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 0.9;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16, t + dur * 0.45); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    pan.pan.setValueAtTime(-0.8, t); pan.pan.linearRampToValueAtTime(0.8, t + dur);
    o.connect(f).connect(g).connect(pan).connect(this.sfxBus);
    o.start(t); am.start(t); o.stop(t + dur + 0.05); am.stop(t + dur + 0.05);
    this.burst(t, dur, 'lowpass', 600, 0.12);
  }
  // ─────────── Hijack + city-reaction sounds ───────────
  /** A burst of corrupted-signal noise: chopped static with random digital squeals. */
  glitch(dur = 0.35) {
    if (!this.ready()) return; const t = this.ctx!.currentTime;
    let x = t;
    while (x < t + dur) {
      const len = 0.015 + Math.random() * 0.05;
      if (Math.random() > 0.35) this.burst(x, len, Math.random() > 0.5 ? 'bandpass' : 'highpass', 600 + Math.random() * 5000, 0.12 + Math.random() * 0.14);
      if (Math.random() > 0.6) this.tone(300 + Math.random() * 2400, x, len, 'square', 0.04);
      x += len + Math.random() * 0.03;
    }
  }
  /** Rising terminal beep for the hijack progress bar. */
  hackBeep(i = 0) { if (!this.ready()) return; this.tone(660 + i * 90, this.ctx!.currentTime, 0.05, 'square', 0.045); }
  accessGranted() {
    if (!this.ready()) return; const t = this.ctx!.currentTime;
    [880, 1175, 1568].forEach((f, i) => this.tone(f, t + i * 0.07, 0.12, 'square', 0.06));
    this.tone(2349, t + 0.21, 0.35, 'triangle', 0.08);
  }
  /** Tiny phone-camera shutter, randomly panned — someone in the crowd snapping a pic. */
  snap() {
    if (!this.ready()) return; const t = this.ctx!.currentTime, ctx = this.ctx!;
    const pan = ctx.createStereoPanner(); pan.pan.value = Math.random() * 1.6 - 0.8; pan.connect(this.sfxBus);
    const n = this.noiseSrc(t, 0.05), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = 3000 + Math.random() * 1500; this.env(g, t, 0.001, 0.09, 0.035);
    n.connect(f).connect(g).connect(pan);
  }
  /** Bubbly pop for a reaction bubble; pitch climbs with each one. */
  pop(i = 0) {
    if (!this.ready()) return; const t = this.ctx!.currentTime;
    this.tone(520 + i * 110, t, 0.09, 'sine', 0.14, 1200 + i * 160);
    this.tone(2600 + i * 200, t + 0.02, 0.05, 'sine', 0.04);
  }
  /** A swelling crowd roar built from shaped noise. */
  crowdCheer(dur = 2.8) {
    if (!this.ready()) return; const t = this.ctx!.currentTime, ctx = this.ctx!;
    for (const [freq, q, level] of [[900, 0.8, 0.22], [1800, 1.2, 0.12], [420, 0.7, 0.1]] as const) {
      const n = this.noiseSrc(t, dur + 0.3), f = ctx.createBiquadFilter(), g = ctx.createGain(), wob = ctx.createOscillator(), wg = ctx.createGain();
      f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
      wob.frequency.value = 5 + Math.random() * 4; wg.gain.value = level * 0.35; wob.connect(wg).connect(g.gain);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(level, t + 0.5); g.gain.setValueAtTime(level, t + dur - 0.9); g.gain.linearRampToValueAtTime(0.0001, t + dur);
      n.connect(f).connect(g); g.connect(this.sfxBus); g.connect(this.reverb);
      wob.start(t); wob.stop(t + dur + 0.1);
    }
    for (let i = 0; i < 6; i++) this.tone(1800 + Math.random() * 900, t + 0.3 + Math.random() * (dur - 0.8), 0.25, 'sine', 0.025, 2600 + Math.random() * 600);
  }
  /** Status rank-up: a heavy stamp plus a bright ascending fanfare. */
  rankUp() {
    if (!this.ready()) return; const t = this.ctx!.currentTime;
    this.impact();
    [72, 76, 79, 84, 88].forEach((m, i) => { const f = 440 * 2 ** ((m - 69) / 12); this.tone(f, t + 0.08 + i * 0.07, 0.5, 'triangle', 0.09); this.tone(f * 2, t + 0.08 + i * 0.07, 0.3, 'sine', 0.03); });
  }

  /** The big payoff: an original triumphant sting when a takeover goes live. */
  takeoverSting() {
    if (!this.ready()) return; const t = this.ctx!.currentTime, ctx = this.ctx!;
    const stab = (at: number, notes: number[], dur: number, level: number) => {
      const f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'lowpass'; f.Q.value = 3; f.frequency.setValueAtTime(600, at); f.frequency.exponentialRampToValueAtTime(5200, at + 0.08); f.frequency.exponentialRampToValueAtTime(1600, at + dur);
      g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(level, at + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      f.connect(g); g.connect(this.sfxBus); const s = ctx.createGain(); s.gain.value = 0.7; g.connect(s).connect(this.reverb);
      for (const n of notes) for (const det of [-12, 0, 12]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(n); o.detune.value = det; o.connect(f); o.start(at); o.stop(at + dur + 0.1); }
    };
    stab(t, [60, 64, 67], 0.16, 0.07);
    stab(t + 0.15, [62, 65, 69], 0.16, 0.07);
    stab(t + 0.3, [64, 67, 71], 0.16, 0.07);
    stab(t + 0.5, [53, 60, 65, 69, 74, 77], 2.6, 0.075);
    this.snare(t + 0.5, 1.4); this.kick(t + 0.5);
    for (let i = 0; i < 6; i++) this.tone(hz(84 + [0, 4, 7, 12, 16, 19][i]), t + 0.62 + i * 0.06, 0.5, 'sine', 0.05);
  }
  typeKey() { if (!this.ready()) return; this.burst(this.ctx!.currentTime, 0.01, 'bandpass', 3500 + Math.random() * 1500, 0.06); }
}

export const audio = new AudioEngine();
