// sound.js — optional beeps made with the Web Audio API (no sound files).
// Off by default; turned on in Settings.

import { getSettings } from "./storage.js";

let ctx = null;

function audio() {
  if (!getSettings().sound) return null;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq, start, duration, type = "square", volume = 0.06) {
  const a = audio();
  if (!a) return;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, a.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + duration);
  osc.connect(gain).connect(a.destination);
  osc.start(a.currentTime + start);
  osc.stop(a.currentTime + start + duration + 0.02);
}

/** Correct answer: deeper answers play a higher "signal" blip. */
export function playCorrect(depth) {
  tone(320 + depth * 6, 0, 0.12, "triangle", 0.08);
  tone(480 + depth * 7, 0.08, 0.14, "triangle", 0.06);
}
export function playStrike() {
  tone(140, 0, 0.25, "sawtooth", 0.05);
}
export function playGem() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22, "triangle", 0.08));
}
export function playPop() {
  tone(90, 0, 0.4, "sawtooth", 0.09);
  tone(60, 0.05, 0.5, "square", 0.05);
}
