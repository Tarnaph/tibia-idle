import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Character Selection - songtibia.webm Video Integration', () => {
  const publicVideoPath = path.resolve(__dirname, '../public/songtibia.webm');
  const authModalPath = path.resolve(__dirname, '../apps/web/components/auth/TibiaAuthCharacterModal.tsx');

  it('verifies that songtibia.webm exists in public/ with valid video file size', () => {
    expect(fs.existsSync(publicVideoPath), 'public/songtibia.webm must exist').toBe(true);
    const stat = fs.statSync(publicVideoPath);
    expect(stat.size).toBeGreaterThan(100_000_000); // 140.5MB
  });

  it('verifies that TibiaAuthCharacterModal renders BardChromaVideo with /songtibia.webm', () => {
    const content = fs.readFileSync(authModalPath, 'utf8');
    expect(content).toContain('src="/songtibia.webm"');
    expect(content).toContain('BardChromaVideo');
    expect(content).toContain('videoRef');
  });

  it('verifies that BardChromaVideo does not use display: none for video element to maintain active frame decoding', () => {
    const content = fs.readFileSync(authModalPath, 'utf8');
    // Ensure display: none is not applied to the video element inside BardChromaVideo
    expect(content).not.toContain("style={{ display: 'none' }}");
    expect(content).toContain('preload="auto"');
  });
});
