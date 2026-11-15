// Input and sound. Keyboard and pointer are folded into one tiny action vocabulary (pull, steer,
// confirm, pause, restart, mute) so the simulation never reads a key code and the same code path
// serves a mouse, a trackpad and a keyboard. Sound is synthesised with WebAudio oscillators only:
// the game ships no audio files, and every blip is safe to skip when the browser blocks audio.

import { VIEW } from './config.js';
import { clamp } from './random.js';

const PULL_KEYS = new Set(['Space', 'KeyW', 'ArrowUp']);
const LEFT_KEYS = new Set(['KeyA', 'ArrowLeft']);
const RIGHT_KEYS = new Set(['KeyD', 'ArrowRight']);
const IGNORED = new Set(['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight']);

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pull = false;
    this.pointerPull = false;
    this.pointerX = VIEW.w * 0.5;
    this.pointerSteer = 0;
    this.steer = 0;
    this.actions = [];
    this.sound = new Sound();
    this.usedPointer = false;

    window.addEventListener('keydown', (event) => this.onKeyDown(event));
    window.addEventListener('keyup', (event) => this.onKeyUp(event));
    window.addEventListener('blur', () => this.clear());
    canvas.addEventListener('pointerdown', (event) => this.onPointerDown(event));
    window.addEventListener('pointerup', (event) => this.onPointerUp(event));
    window.addEventListener('pointermove', (event) => this.onPointerMove(event));
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  onKeyDown(event) {
    if (IGNORED.has(event.code)) return;
    if (PULL_KEYS.has(event.code) || LEFT_KEYS.has(event.code) || RIGHT_KEYS.has(event.code)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    this.sound.unlock();
    this.keys.add(event.code);
    if (PULL_KEYS.has(event.code)) this.actions.push('confirm');
    if (event.code === 'Enter' || event.code === 'NumpadEnter') this.actions.push('confirm');
    if (event.code === 'Escape' || event.code === 'KeyP') this.actions.push('pause');
    if (event.code === 'KeyR') this.actions.push('restart');
    if (event.code === 'KeyM') this.actions.push('mute');
    this.refresh();
  }

  onKeyUp(event) {
    this.keys.delete(event.code);
    this.refresh();
  }

  onPointerDown(event) {
    this.sound.unlock();
    if (event.button !== 0) return;
    this.usedPointer = true;
    this.pointerPull = true;
    this.onPointerMove(event);
    this.actions.push('confirm');
    this.canvas.setPointerCapture?.(event.pointerId);
    this.refresh();
  }

  onPointerUp(event) {
    if (event.button !== 0) return;
    this.pointerPull = false;
    this.refresh();
  }

  onPointerMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0) return;
    this.pointerX = ((event.clientX - rect.left) / rect.width) * VIEW.w;
    const middle = VIEW.w * 0.5;
    const dead = 26;
    this.pointerSteer = this.pointerX < middle - dead ? -1 : this.pointerX > middle + dead ? 1 : 0;
    this.usedPointer = true;
    this.refresh();
  }

  refresh() {
    const keySteer = (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);
    this.steer = clamp(keySteer !== 0 ? keySteer : this.pointerSteer, -1, 1);
    this.pull = this.pointerPull || [...PULL_KEYS].some((code) => this.keys.has(code));
  }

  clear() {
    this.keys.clear();
    this.pointerPull = false;
    this.pointerSteer = 0;
    this.pull = false;
    this.steer = 0;
  }

  take() {
    const list = this.actions;
    this.actions = [];
    return list;
  }

  toggleMute() {
    this.sound.muted = !this.sound.muted;
    if (!this.sound.muted) this.sound.blip(660, 0.06, 0.25);
    return this.sound.muted;
  }
}

// A handful of tiny envelopes. Nothing is loaded, nothing is scheduled far ahead, and every
// method returns quietly when the context could not be created or is muted.
export class Sound {
  constructor() {
    this.ctx = null;
    this.out = null;
    this.muted = false;
  }

  unlock() {
    if (this.muted) return;
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.out = this.ctx.createGain();
        this.out.gain.value = 0.22;
        this.out.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch {
      this.ctx = null;
      this.out = null;
    }
  }

  tone(freq, dur, gain, type = 'sine', slideTo = 0, delay = 0) {
    if (this.muted || !this.ctx || !this.out) return;
    const start = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + Math.min(0.02, dur * 0.25));
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(env);
    env.connect(this.out);
    osc.start(start);
    osc.stop(start + dur + 0.03);
  }

  noise(dur, gain, cutoff = 1200, delay = 0) {
    if (this.muted || !this.ctx || !this.out) return;
    const start = this.ctx.currentTime + delay;
    const frames = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < frames; i += 1) {
      const white = Math.random() * 2 - 1;
      last = last * 0.72 + white * 0.28;
      data[i] = last * (1 - i / frames);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, start);
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(gain, start);
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    source.connect(filter);
    filter.connect(env);
    env.connect(this.out);
    source.start(start);
  }

  blip(freq = 520, dur = 0.08, gain = 0.3) {
    this.tone(freq, dur, gain, 'triangle', freq * 1.4);
  }

  gust(combo) {
    const base = 460 + Math.min(combo, 5) * 90;
    this.tone(base, 0.16, 0.3, 'triangle', base * 1.9);
    this.tone(base * 1.5, 0.22, 0.12, 'sine', base * 2.2, 0.03);
  }

  snap() {
    this.noise(0.28, 0.5, 2400);
    this.tone(180, 0.4, 0.32, 'sawtooth', 60);
    this.tone(90, 0.5, 0.18, 'sine', 40, 0.04);
  }

  clear() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, index) => this.tone(freq, 0.34, 0.2, 'triangle', freq, index * 0.09));
  }

  start() {
    this.tone(392, 0.22, 0.22, 'triangle', 523);
    this.tone(587, 0.3, 0.16, 'sine', 784, 0.12);
  }

  warn() {
    this.tone(140, 0.5, 0.2, 'square', 92);
  }

  over(win) {
    if (win) {
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, index) => this.tone(freq, 0.6, 0.18, 'triangle', freq, index * 0.12));
    } else {
      this.tone(220, 0.7, 0.24, 'sawtooth', 110);
      this.tone(164, 0.9, 0.16, 'sine', 82, 0.15);
    }
  }
}
