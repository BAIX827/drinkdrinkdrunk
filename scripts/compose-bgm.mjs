// Original instrumental score and synthesized instruments; no samples or services.
// Run with: node scripts/compose-bgm.mjs
import { mkdirSync, writeFileSync } from 'node:fs';

const rate = 24000, beat = 60 / 76, bars = 16;
const length = Math.round(bars * 4 * beat * rate);
const left = new Float32Array(length), right = new Float32Array(length);
let seed = 10201;
const noise = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2147483648 - 1; };
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
function voice(at, duration, level, pan, sample) {
  const start = Math.round(at * beat * rate), count = Math.round(duration * rate);
  const l = Math.sqrt((1 - pan) / 2) * level, r = Math.sqrt((1 + pan) / 2) * level;
  for (let i = 0; i < count; i++) {
    const t = i / rate;
    const envelope = Math.min(1, t / .009) * Math.min(1, (duration - t) / .09);
    const value = sample(t) * envelope, index = (start + i) % length;
    left[index] += value * l; right[index] += value * r;
  }
}
function keys(at, midi, level = .12, pan = -.18, duration = 2.6) {
  const f = hz(midi);
  voice(at, duration, level, pan, t => {
    const phase = 2 * Math.PI * f * t;
    return (Math.sin(phase + 1.15 * Math.exp(-t * 3.8) * Math.sin(phase * 2))
      + .15 * Math.sin(phase * 3) * Math.exp(-t * 5)) * Math.exp(-t * 1.65);
  });
}
function bass(at, midi, duration = .65) {
  const f = hz(midi);
  voice(at, duration, .25, 0, t => (Math.sin(2 * Math.PI * f * t)
    + .22 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t * 7)) * Math.exp(-t * 2.8));
}
function brush(at, accent = false) {
  let low = 0;
  voice(at, accent ? .23 : .085, accent ? .047 : .021, .28, t => {
    const n = noise(); low += .22 * (n - low);
    return (n - low) * Math.exp(-t * (accent ? 19 : 52));
  });
}
const harmony = [
  { root: 38, chord: [53, 57, 60, 64], melody: [69, 72, 76, 72] }, // Dm9
  { root: 43, chord: [53, 57, 59, 64], melody: [71, 69, 67, 64] }, // G13
  { root: 36, chord: [52, 55, 59, 62], melody: [67, 71, 74, 71] }, // Cmaj9
  { root: 45, chord: [55, 58, 61, 64], melody: [73, 70, 67, 64] }, // A7b9
  { root: 38, chord: [53, 57, 60, 64], melody: [65, 69, 72, 76] },
  { root: 43, chord: [53, 57, 59, 64], melody: [74, 71, 69, 67] },
  { root: 36, chord: [52, 55, 59, 62], melody: [64, 67, 71, 74] },
  { root: 45, chord: [55, 58, 61, 64], melody: [76, 73, 70, 69] },
];
for (let bar = 0; bar < bars; bar++) {
  const h = harmony[bar % harmony.length], at = bar * 4;
  h.chord.forEach((note, i) => {
    keys(at + .025 * i, note, .105, -.28);
    keys(at + 2.58 + .018 * i, note, .062, -.18, 1.8);
  });
  bass(at, h.root, .95); bass(at + 1.58, h.root + 7);
  bass(at + 2.5, h.root + 12, .55);
  bass(at + 3.58, harmony[(bar + 1) % 8].root - 1, .32);
  // A spacious four-note phrase, with small variations in the second chorus.
  const rhythm = bar % 2 ? [.58, 1.5, 2.58, 3.25] : [.5, 1.58, 2, 3.58];
  h.melody.forEach((note, i) => {
    if (bar >= 8 && i === 2) return;
    keys(at + rhythm[i], note, i === 0 ? .12 : .095, .26, 1.7);
  });
  for (let b = 0; b < 4; b++) {
    brush(at + b, b === 1 || b === 3); brush(at + b + .58);
  }
  [0, 2].forEach(b => voice(at + b, .2, .105, 0,
    t => Math.sin(2 * Math.PI * (48 * t + 1.4 * (1 - Math.exp(-t * 35)))) * Math.exp(-t * 23)));
}
// Short stereo room reflections wrap at the loop boundary, including note tails.
const dryL = left.slice(), dryR = right.slice();
for (const [seconds, gain] of [[.071, .13], [.139, .09], [.223, .065], [.347, .04]]) {
  const offset = Math.round(seconds * rate);
  for (let i = 0; i < length; i++) {
    const j = (i + offset) % length;
    left[j] += dryR[i] * gain; right[j] += dryL[i] * gain;
  }
}
let peak = 0, energy = 0;
for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
const gain = .76 / peak;
const wav = Buffer.alloc(44 + length * 4);
wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 4, 28);
wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(length * 4, 40);
for (let i = 0; i < length; i++) {
  const l = left[i] * gain, r = right[i] * gain;
  energy += l * l + r * r;
  wav.writeInt16LE(Math.round(l * 32767), 44 + i * 4);
  wav.writeInt16LE(Math.round(r * 32767), 46 + i * 4);
}
const directory = new URL('../Cocktail60/BarWeb/audio/', import.meta.url);
mkdirSync(directory, { recursive: true });
writeFileSync(new URL('after-hours.wav', directory), wav);
console.log(`After Hours: ${(length / rate).toFixed(2)}s, 76 BPM, stereo PCM, peak 0.76, RMS ${Math.sqrt(energy / (length * 2)).toFixed(3)}; ${wav.length} bytes.`);
