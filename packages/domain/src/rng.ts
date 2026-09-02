export interface SeededRng {
  state: number;
}

export function seedToUint32(seed: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0 || 0x6d2b79f5;
}

export function createSeededRng(seed: string | number): SeededRng {
  return { state: typeof seed === 'number' ? seed >>> 0 : seedToUint32(seed) };
}

export function nextRandom(rng: SeededRng): number {
  let next = rng.state >>> 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  rng.state = next >>> 0;
  return rng.state / 4_294_967_296;
}

export function rollInteger(rng: SeededRng, min: number, max: number): number {
  const low = Math.ceil(Math.min(min, max));
  const high = Math.floor(Math.max(min, max));
  return low + Math.floor(nextRandom(rng) * (high - low + 1));
}
