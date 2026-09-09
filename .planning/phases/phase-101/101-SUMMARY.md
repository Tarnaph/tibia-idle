# Phase 101 Summary: Correção Visual da Tela de Loading Exura (Vanilla CSS) e Restauração Integral do Mapa de Thais

## 🎯 Escopo e Diagnóstico
O usuário identificou que após o login a tela de carregamento ornamental Exura de 5 segundos não aparecia, e a cidade de Thais estava com o mapa bugado.
A análise técnica profunda identificou:
1. **Ausência da tela de loading**: O componente `ExuraLoadingScreen.tsx` foi implementado utilizando classes do Tailwind CSS (`fixed inset-0 z-[9999999] ...`). Como o projeto opera estritamente com Vanilla CSS (`app/globals.css`), o elemento carecia de `position: fixed`, `inset: 0` e `zIndex`, sendo renderizado como elemento estático abaixo do viewport de 100vh da página.
2. **Cidade de Thais Bugada**: No commit `449ea305`, a tentativa de acelerar o carregamento aguardava apenas `priorityUrls.slice(0, 12)`, que continha apenas 6 texturas genéricas de sala de treino e magias. Quando o loop de criação de sprites de tiles executou, 100% das texturas autênticas de Thais ainda eram `undefined`, fazendo o código recorrer ao fallback de dummy floor de madeira em todos os pisos da cidade e nunca mais atualizá-los. Além disso, `object-fit: cover` no canvas causava distorções de coordenadas no PixiJS v8.

## 🚀 Implementações Realizadas

### 1. `apps/web/components/ExuraLoadingScreen.tsx` & `app/globals.css`
- **Vanilla CSS Puro & Inline Absoluto**: Convertido todo o layout para `position: fixed; inset: 0; zIndex: 999999999; width: 100vw; height: 100vh;` com flexbox centralizado e ancorado na base.
- **Moldura Ornamental e Barra de Magma**: Centralização da moldura 1024x341 (`loading-bar-frame.png`) sobreposta à cavidade de ranhura escura, preenchimento vermelho com `exura-bar-glow`, animação de brilho `exura-loading-shimmer` e ponta incandescente (*ember spark*).
- **Fade-out Suave**: Transição de opacidade de 400ms ao completar os 5000ms antes da chamada de `onFinish`.
- **Classes CSS Nativas**: Inclusão de `.exura-loading-overlay`, `.exura-loading-frame-wrapper`, `.exura-loading-cavity`, `.exura-loading-progress-fill` e `.exura-loading-frame-img` em `app/globals.css`.

### 2. `apps/web/components/ThaisCityArena.tsx`
- **Remoção de Poluição de Tiles de Hunt**: Removida a iteração das caçadas (`huntRegionsJson`) de Thais, mantendo apenas os andares 7 (térreo) e 6 (telhados/cais).
- **Ordenação por Proximidade**: Ordenação de todas as texturas de Thais pela distância em relação ao spawn no Templo (`32369, 32241, 7`). As ~450 texturas da área imediata visível são carregadas no primeiro lote aguardado (`priorityUrls`) durante os 5s da tela de loading.
- **Dynamic Texture Binding**: Implementado o sistema `pendingTileSprites`:
  - Se a textura já estiver em memória, ela é atribuída de imediato.
  - Se estiver em trânsito de download, o sprite é criado e registrado; assim que o `loadBatch` decodifica a textura, o sprite é atualizado instantaneamente com `sprite.texture = texture`.
  - O fallback para dummy floor de madeira só ocorre caso o tile não tenha mapeamento no manifesto.
- **Remoção de `object-fit: cover`**: Garantida a renderização pixel-art nativa 1:1 sem distorção ou corte nas bordas do canvas.

## 🧪 Verificação e Testes
- **Testes Unitários**: Criado `tests/phase101-loading-screen-vanilla-css-and-thais-city-restoration.test.ts` com 7 testes aprovados.
- **Regressão**: Executada a suíte de testes com aprovação de 100% dos testes Vitest (545+ testes).
- **TypeScript**: `npm run typecheck` executado com 0 erros.
