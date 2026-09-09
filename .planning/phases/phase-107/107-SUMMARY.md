# Phase 107 Summary: Diferimento da Entrada e Visibilidade do Personagem até o Fim do Loading

## Overview
- **Fase**: Phase 107
- **Objetivo**: Eliminar a vulnerabilidade crítica de morte precoce em que o jogador entrava em caçadas e sofria ataques de monstros em segundo plano enquanto olhava para a tela de carregamento (10s de loading screen), garantindo que o personagem só apareça e o combate só comece exatamente junto com o final da barra de loading (100% / `onFinish`).
- **Data**: 2026-09-09
- **Status**: Complete

---

## Principais Implementações

### 1. Bloqueio Determinístico de Combate Durante o Loading (`GamePrototype.tsx`)
- Adicionada trava estrita em `tickCombat`:
  ```ts
  if (initialLoadingActive || Boolean(transitionLoading?.active)) return;
  ```
- Garante que durante os 10 segundos da tela de carregamento Exura, rigorosamente 0 ticks de combate sejam processados, nenhum monstro se movimente, nenhuma magia hostil seja desferida e nenhum dano seja sofrido pelo personagem.
- Bloqueio correspondente em `tickCityAutoSpells` para evitar consumo de mana em segundo plano.

### 2. Diferimento da Transição de Caçada (`pendingHuntTransitionRef`)
- Ao clicar em "Viajar para [Hunt]" em `startSelectedHunt` ou ao receber `onPartyHuntStart` na party:
  - O progresso do jogador é salvo imediatamente via `saveProgressRef`.
  - A tela de carregamento de 10 segundos é disparada (`setTransitionLoading`).
  - Se o jogador já estava em uma caçada anterior, executa `leaveHunt(current)` preventivo para desconectar de monstros remanescentes.
  - Os parâmetros da caçada (`huntId`, `targetHunt`, `nextSeed`, `entrance`) são guardados em `pendingHuntTransitionRef`.
  - **O teleporte, o `restartHunt` e a mudança para `mode = 'hunt'` NÃO são executados imediatamente**, protegendo o jogador de spawnar perto de monstros enquanto não está olhando para a tela.

### 3. Spawn Seguro Pós-Loading e Inicialização Sincronizada (`onFinish`)
- No callback `onFinish` de `ExuraLoadingScreen` (quando a barra atinge 100% e o fadeout completa):
  - A transição enfileirada em `pendingHuntTransitionRef` é consumida.
  - `restartHunt(...)` inicializa a caçada com vida cheia e posicionamento autoritativo de entrada.
  - `setMode('hunt')` ativa a arena de caçada.
  - O relógio de combate `lastCombatTimeRef.current = performance.now()` é redefinido para que o primeiro tick ocorra suavemente em 120ms (sem acúmulo de delta).
  - O teleporte e a mensagem de hunt são despachados para o Colyseus Server.
  - O personagem surge na tela no exato instante em que o loading screen fecha, pronto para o jogador ver e agir.

### 4. Ocultação Visual do Personagem Durante o Loading (`isCharacterVisible`)
- Variável booleana reativa calculada no topo de `GamePrototype`:
  ```ts
  const isCharacterVisible = !initialLoadingActive && !transitionLoading?.active;
  ```
- **`ThaisCityArena.tsx`**:
  - Aceita prop `isCharacterVisible?: boolean` (default: true).
  - No loop de renderização do PixiJS, define `view.root.visible = latestRef.current.isCharacterVisible !== false;` para o personagem local e seguidores.
  - Impede que o personagem apareça no Templo de Thais no login antes do loading de 10s terminar.
- **`PixiArena.tsx`**:
  - Aceita prop `isCharacterVisible?: boolean` (default: true).
  - Define `view.root.visible = latestRef.current.isCharacterVisible !== false && actor.alive;` para todos os membros da party.
  - Oculta o retículo vermelho de mira (`targetReticle.clear()`) enquanto `isCharacterVisible` for falso.

---

## Verificação e Testes
- **Testes Unitários da Fase 107**: `tests/phase107-character-spawn-post-loading-safety.test.ts` (5 testes aprovados com 100% de sucesso).
- **Testes de Regressão das Fases 99 a 107**: 34 testes aprovados nas 6 suítes (`phase99` a `phase107`).
- **TypeScript Typecheck**: `npm run typecheck` executado e aprovado com **0 erros**.
