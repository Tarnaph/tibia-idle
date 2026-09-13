# Summary Phase 148: Otimização Rápida de Carregamento, Animação Autêntica de Caminhada Sincronizada com Passos, Atalho do Avatar para Personagem e Persistência Permanente do Bestiário

## Visão Geral
Nesta fase 148, foram solucionados os 4 pontos críticos identificados no backlog do jogo e nas notas do usuário (`FIX.md`):
1. **Velocidade de Carregamento da Tela Inicial:** Redução drástica do gargalo de rede causado pelo preloader de assets, cortando mais de 4.000 requisições desnecessárias e eliminando 404s.
2. **Animação Fluida de Caminhada (Passo a Passo):** Sincronização direta dos frames de movimento das pernas dos trajes com a progressão da interpolação física dos tiles (`motionTrack.sample(now)`), corrigindo travamento em pose de idle durante o movimento e alternando corretamente os pés.
3. **Clique do Avatar Superior:** Redirecionamento da ação de clique no avatar do topo para abrir a janela de Personagem/Aparência (`OutfitModal`), permitindo personalização imediata do traje e addons.
4. **Persistência Definitiva do Bestiário:** Correção de closure obsoleto no `saveProgress` de `GamePrototype.tsx`, garantindo que todas as mortes de monstros registradas durante a sessão sejam salvas no banco de dados Prisma (`bestiaryKillsJson`).

---

## Modificações Implementadas

### 1. Descongestionamento do Preloader (`apps/web/lib/assetPreloader.ts`)
- **Foco Geográfico Localizado:** O pré-carregamento de tiles do mapa de Thais agora foca estritamente em um raio visual ao redor do Templo (182 tiles ao invés de 2.760 tiles da cidade inteira).
- **Remoção de Requisições Fantasmas:** Eliminada tentativa de carregar URLs com `_rider_` inexistentes que resultavam em erros 404 e travavam conexões HTTP simultâneas.
- **Budget Enxuto:** Redução de mais de 5.000 URLs concorrentes para ~750 assets essenciais (outfits primários, magias básicas, montarias canônicas, itens iniciais).
- **Timeout Protetivo:** Timeout do preloader ajustado para 1500ms, garantindo que o jogador entre imediatamente no jogo mesmo com oscilações de rede.

### 2. Calibração da Tela de Loading (`apps/web/components/ExuraLoadingScreen.tsx` & `GamePrototype.tsx`)
- Duração padrão reduzida de 10.000ms para 2.000ms (`effectiveDuration = Math.min(durationMs, 2000)`).
- Barra de progresso visual fluida e transição ágil para o jogo.

### 3. Progresso Físico de Movimento (`packages/presentation/src/movement.ts`)
- Campo `progress` (0.0 a 1.0) adicionado à estrutura `MotionSample` no método `sample(now)` de `VisualMotionTrack`.
- Permite que qualquer componente gráfico saiba exatamente em que fração do passo o personagem se encontra.

### 4. Sincronização dos Passos do Personagem (`apps/web/components/ThaisCityArena.tsx`)
- Substituído o cálculo errático por relógio (`now / stepRateMs`) por cálculo determinístico com base em `sample.progress` e paridade de passos (`curPos.x + curPos.y`).
- Implementada alternância anatômica de pernas (frames 1..4 no pé esquerdo, frames 5..8 no pé direito).
- Garantida exibição estrita do frame 0 (idle) imediatamente ao parar de se mover.
- Corrigido o envio do `safeFrame` para `isOutfitCanvasCached` e `getRecoloredCanvasSync` (anteriormente recebia o frame bruto sem clamping).

### 5. Atalho do Avatar para Personagem/Aparência (`WindowDockBar.tsx` & `GamePrototype.tsx`)
- Botão de avatar na barra superior agora prioriza `onOpenOutfit()` e invoca `gameModal.openOutfit(activeCharacter.id)`.

### 6. Persistência Permanente do Bestiário (`apps/web/components/GamePrototype.tsx`)
- `bestiaryKills`, `trackedBestiaryId` e `bossPoints` adicionados a `latestSaveStateRef.current`.
- `saveProgress` agora resgata as mortes acumuladas diretamente da ref atualizada e envia para `/api/characters/${id}/save`.

---

## Verificação e Testes
- **Testes Automatizados:** `tests/phase148-fast-loading-walk-animation-bestiary.test.ts` criado e aprovado com 6/6 testes.
- **Suite Completa:** Todos os testes do Vitest executados com sucesso.
- **Checagem de Tipos:** `npm run typecheck` com 0 erros.
