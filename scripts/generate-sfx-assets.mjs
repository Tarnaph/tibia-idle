import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('public/assets/sfx');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function createWavBuffer(sampleRate, samples) {
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit
  const byteRate = sampleRate * numChannels * bytesPerSample;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF Chunk
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt Subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data Subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    // Clamp to [-1, 1]
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intSample = Math.round(s < 0 ? s * 32768 : s * 32767);
    buffer.writeInt16LE(intSample, offset);
    offset += 2;
  }

  return buffer;
}

const SAMPLE_RATE = 44100;

// 1. Knight Physical Attack (Slash / Blade Impact)
function generateKnightAttack() {
  const duration = 0.22; // 220ms
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(totalSamples);

  let noiseState = 0;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = t / duration;

    // Amplitude envelope: instantaneous punch, fast decay
    const env = Math.exp(-progress * 14) * (1 - Math.exp(-progress * 150));

    // Pitch sweep: 340Hz down to 80Hz (whoosh + blade clash)
    const freq = 340 * Math.exp(-progress * 8) + 80;
    const tone = Math.sin(2 * Math.PI * freq * t);

    // Filtered noise for metal slash
    const rawNoise = (Math.random() * 2 - 1);
    noiseState = noiseState * 0.7 + rawNoise * 0.3;
    const metalHarmonic = Math.sin(2 * Math.PI * 1250 * t) * Math.exp(-progress * 25);

    // Overdrive tone
    const mixed = (tone * 0.6 + noiseState * 0.5 + metalHarmonic * 0.3) * env;
    samples[i] = Math.tanh(mixed * 1.8);
  }
  return createWavBuffer(SAMPLE_RATE, samples);
}

// 2. Paladin Distance Attack (Bowstring Twang & Arrow Impact)
function generatePaladinAttack() {
  const duration = 0.28; // 280ms
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(totalSamples);

  let noiseState = 0;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = t / duration;

    // Phase 1 (0 to 80ms): Bow release twang
    const twangEnv = Math.exp(-t * 35);
    const twangFreq = 480 * Math.exp(-t * 20) + 180;
    const twang = Math.sin(2 * Math.PI * twangFreq * t) * twangEnv;

    // Phase 2 (30ms to 200ms): Arrow whoosh
    const whooshEnv = Math.sin(Math.PI * Math.min(1, Math.max(0, (t - 0.02) / 0.15)));
    const rawNoise = (Math.random() * 2 - 1);
    noiseState = noiseState * 0.82 + rawNoise * 0.18;
    const whoosh = noiseState * whooshEnv * 0.35;

    // Phase 3 (120ms to end): Arrow impact thud
    const impactT = Math.max(0, t - 0.11);
    const impactEnv = Math.exp(-impactT * 30);
    const impactFreq = 140 * Math.exp(-impactT * 18) + 65;
    const impact = Math.sin(2 * Math.PI * impactFreq * impactT) * impactEnv * 0.7;

    const mixed = twang * 0.5 + whoosh + impact;
    samples[i] = Math.tanh(mixed * 1.5);
  }
  return createWavBuffer(SAMPLE_RATE, samples);
}

// 3. Sorcerer Magic Spell (Fire / Energy Burst Cast)
function generateSorcererSpell() {
  const duration = 0.42; // 420ms
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(totalSamples);

  let noiseState = 0;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = t / duration;

    // Envelope: sharp rise, sustained burst, smooth roll-off
    const env = (1 - Math.exp(-t * 80)) * Math.exp(-progress * 6.5);

    // Crackling energy modulation
    const mod = Math.sin(2 * Math.PI * 45 * t);
    const freq = (580 + mod * 120) * Math.exp(-progress * 4) + 110;
    const tone = Math.sin(2 * Math.PI * freq * t) + 0.5 * Math.sin(4 * Math.PI * freq * t);

    // Burning/burst noise
    const rawNoise = (Math.random() * 2 - 1);
    noiseState = noiseState * 0.75 + rawNoise * 0.25;
    const fireNoise = noiseState * (0.6 + 0.4 * Math.sin(2 * Math.PI * 28 * t));

    // High sizzle sparkle
    const sparkle = Math.sin(2 * Math.PI * 2200 * t) * Math.exp(-progress * 15) * 0.25;

    const mixed = (tone * 0.45 + fireNoise * 0.5 + sparkle) * env;
    samples[i] = Math.tanh(mixed * 1.6);
  }
  return createWavBuffer(SAMPLE_RATE, samples);
}

// 4. Druid Magic Spell (Ethereal Nature & Healing Shimmer)
function generateDruidSpell() {
  const duration = 0.48; // 480ms
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = t / duration;

    // Gentle swelling envelope with airy decay
    const env = (1 - Math.exp(-t * 60)) * Math.exp(-progress * 4.8);

    // Harmonic triad shimmer: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz)
    const vibrato = Math.sin(2 * Math.PI * 5.5 * t) * 6;
    const h1 = Math.sin(2 * Math.PI * (523 + vibrato) * t);
    const h2 = Math.sin(2 * Math.PI * (659 + vibrato) * t) * 0.7;
    const h3 = Math.sin(2 * Math.PI * (784 + vibrato) * t) * 0.5;
    const h4 = Math.sin(2 * Math.PI * (1046 + vibrato * 1.5) * t) * 0.3;

    // Water ripple sweep
    const rippleFreq = 880 * Math.exp(-progress * 3) + 320;
    const ripple = Math.sin(2 * Math.PI * rippleFreq * t) * 0.25;

    const mixed = (h1 + h2 + h3 + h4 + ripple) * 0.28 * env;
    samples[i] = Math.tanh(mixed);
  }
  return createWavBuffer(SAMPLE_RATE, samples);
}

// 5. Player Death (Dramatic Defeat Chime / Minor Gong)
function generatePlayerDeath() {
  const duration = 1.3; // 1300ms
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = t / duration;

    // Initial heavy impact strike
    const impactEnv = (1 - Math.exp(-t * 120)) * Math.exp(-progress * 3.8);

    // Descending dissonant minor gong: Root C2 (65.4Hz) + Eb2 (77.8Hz) + G2 (98Hz)
    const f1 = 65.4 * Math.exp(-progress * 0.6);
    const f2 = 77.8 * Math.exp(-progress * 0.7);
    const f3 = 98.0 * Math.exp(-progress * 0.8);
    const bell1 = Math.sin(2 * Math.PI * f1 * t);
    const bell2 = Math.sin(2 * Math.PI * f2 * t) * 0.8;
    const bell3 = Math.sin(2 * Math.PI * f3 * t) * 0.6;

    // Upper dramatic dissonance (minor second tension Eb4/E4) decaying fast
    const tensionEnv = Math.exp(-progress * 9);
    const tension = (Math.sin(2 * Math.PI * 311 * t) + Math.sin(2 * Math.PI * 330 * t)) * 0.35 * tensionEnv;

    // Sub-bass heavy thump at start
    const subThump = Math.sin(2 * Math.PI * 45 * Math.exp(-t * 15) * t) * Math.exp(-t * 8) * 0.5;

    const mixed = (bell1 * 0.45 + bell2 * 0.35 + bell3 * 0.25 + tension + subThump) * impactEnv;
    samples[i] = Math.tanh(mixed * 1.4);
  }
  return createWavBuffer(SAMPLE_RATE, samples);
}

// Execute Generation
const files = [
  { name: 'knight_attack.wav', fn: generateKnightAttack },
  { name: 'paladin_attack.wav', fn: generatePaladinAttack },
  { name: 'sorcerer_spell.wav', fn: generateSorcererSpell },
  { name: 'druid_spell.wav', fn: generateDruidSpell },
  { name: 'player_death.wav', fn: generatePlayerDeath },
];

console.log('Gerando arquivos de áudio canônicos (SFX) em public/assets/sfx/ ...');
for (const file of files) {
  const buf = file.fn();
  const filePath = path.join(OUT_DIR, file.name);
  fs.writeFileSync(filePath, buf);
  console.log(`✓ Gerado: ${file.name} (${buf.length} bytes)`);
}
console.log('Todos os SFX gerados com sucesso!');
