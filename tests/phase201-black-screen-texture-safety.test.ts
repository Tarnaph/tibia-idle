import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 201: Black Screen Elimination & PixiJS Texture Safety', () => {
  it('verifies ThaisCityArena does NOT contain any synchronous Texture.from calls for skulls', () => {
    const filePath = path.resolve(process.cwd(), 'apps/web/components/ThaisCityArena.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    // Must not call Texture.from for skull urls
    expect(content).not.toContain('Texture.from(url)');
    expect(content).not.toContain('Texture.from(skullUrl)');
  });

  it('verifies ThaisCityArena uses safe asynchronous Assets.load for skulls with guarded scaleMode', () => {
    const filePath = path.resolve(process.cwd(), 'apps/web/components/ThaisCityArena.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('Assets.load<InstanceType<typeof Texture>>(url)');
    expect(content).toContain('Assets.load<InstanceType<typeof Texture>>(skullUrl)');
    expect(content).toContain('if (skullTex.source?.style) skullTex.source.style.scaleMode = \'nearest\';');
  });

  it('verifies PixiArena guards skull texture scaleMode against undefined source or style', () => {
    const filePath = path.resolve(process.cwd(), 'apps/web/components/PixiArena.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content).toContain('if (skullTex.source?.style) skullTex.source.style.scaleMode = \'nearest\';');
    expect(content).toContain('if (t.source?.style) t.source.style.scaleMode = \'nearest\';');
  });

  it('verifies skull sprite creation is safely wrapped in try-catch blocks', () => {
    const thaisContent = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/components/ThaisCityArena.tsx'), 'utf8');
    const pixiContent = fs.readFileSync(path.resolve(process.cwd(), 'apps/web/components/PixiArena.tsx'), 'utf8');

    expect(thaisContent).toContain('view.skullSprite = new Sprite(skullTex);');
    expect(pixiContent).toContain('view.skullSprite = new Sprite(skullTex);');
  });
});
