import { TexturePool } from 'pixi.js';

/**
 * Polyfill e blindagem para o TexturePool do PixiJS v8.
 *
 * Corrige a falha crítica de runtime onde a destruição de nós de Text
 * (ou descarte de containers contendo nameplates na troca/criação de personagem)
 * tenta devolver a textura para um bucket inexistente no pool após GC/clear:
 * `Cannot read properties of undefined (reading 'push')`.
 */
if (TexturePool && typeof TexturePool.returnTexture === 'function') {
  const originalReturnTexture = TexturePool.returnTexture.bind(TexturePool);

  TexturePool.returnTexture = function (renderTexture: any, resetStyle: boolean = false) {
    if (!renderTexture) return;
    try {
      const poolKeyHash = (this as any)._poolKeyHash;
      const key = poolKeyHash ? poolKeyHash[renderTexture.uid] : undefined;
      if (key === undefined) return;

      if (!(this as any)._texturePool) {
        (this as any)._texturePool = {};
      }

      if (!Array.isArray((this as any)._texturePool[key])) {
        (this as any)._texturePool[key] = [];
      }

      originalReturnTexture(renderTexture, resetStyle);
    } catch {
      // Ignora com segurança erros de devolução ao pool durante ciclos de descarte
    }
  };
}

export function ensurePixiPolyfills(): void {
  // Chamada de garantia para inicialização do módulo
}
