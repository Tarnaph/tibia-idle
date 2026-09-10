# Phase 122 Summary: Navegação Bidirecional Personagem ↔ Outfit, Capabilities de Addon/Montaria, Compatibilidade do Sire e Token de Concorrência

## Status: Complete
- **Data:** 2026-09-10
- **Suíte de Testes:** 123/123 arquivos aprovados (689/689 testes passando — 100%)
- **Tipagem:** 0 erros (`npm run typecheck` / TypeScript 5.9)

---

## 1. Visão Geral e Objetivos Entregues

Nesta fase, foram identificados e solucionados 5 pontos críticos no subsistema de customização, renderização e perfil do jogador:

1. **Navegação Bidirecional Real Personagem ↔ Outfit:**
   - Em `OutfitModal.tsx`, a aba superior "Personagem" agora fecha o modal de outfits e reabre o `CharacterProfileModal` preservando o personagem selecionado.
   - Em `CharacterProfileModal.tsx`, a aba superior "OUTFIT" agora fecha a ficha e abre o `OutfitModal` passando o personagem ativo.
   - Em `GamePrototype.tsx`, as pontes de callback foram conectadas com `onOpenCharacterProfile` e `onOpenOutfit`.

2. **Respeito às Capabilities do Catálogo e Tolerância a Camadas Inexistentes:**
   - Implementado e exportado `getOutfitCapabilities(outfitId)` em `apps/web/lib/outfitRecolor.ts`, lendo os metadados canônicos do catálogo (`hasAddon1`, `hasAddon2`, `hasMountRider`, `maxFrames`).
   - `getOutfitLayerUrls` não gera URLs de addon ou montaria para trajes que não os suportam (como `retro-knight`, `retro-warrior`, `sire`).
   - `getRecoloredCanvasSync` não bloqueia a composição nem retorna `null` para trajes sem addons quando addons estão selecionados.
   - Rastreador `failedImageUrls`: assets com erro 404/onerror são registrados como falhos e não bloqueiam a composição do base + máscara, evitando personagens invisíveis.
   - No `OutfitModal.tsx`, checkboxes de addons e montarias incompatíveis são desabilitados com indicação visual (`(Indisponível)` / `(Sem suporte)`) e seleções inválidas são limpas automaticamente ao trocar de outfit.

3. **Compatibilidade Total do Outfit Sire e Ciclo de Caminhada:**
   - O traje Sire possui apenas 3 frames (`f0` idle, `f1` e `f2` passos flutuantes) e não possui animação de montaria (`hasMountRider: false`).
   - Implementada política de clamp/módulos para outfits com `maxFrames <= 3`:
     - Frame 0 -> `f0`
     - Frames 1 a 8 -> mapeados ciclicamente entre `f1` e `f2` (`((frame - 1) % 2) + 1`). Nunca requisita `f3..f8`.
   - Política estrita de montaria: montarias são recusadas para o Sire, forçando renderização a pé no compositor e desabilitando o checkbox de montaria no UI.
   - Restaurados os sprites autênticos em 64x64 com pixels reais (532 pixels com alpha > 0) para as 4 direções e thumbnail em `public/generated/outfit-thumbs/sire.png`.

4. **Token de Cancelamento e Concorrência no Preview:**
   - Adicionado parâmetro opcional `isCurrent?: () => boolean` em `renderRecoloredOutfit`.
   - Implementado contador de geração (`renderGenRef`) em `OutfitModal.tsx`.
   - A cada alteração de seleção, a geração é incrementada e o callback `() => renderGenRef.current === thisGen` invalida renderizações anteriores em trânsito, impedindo que requisições assíncronas lentas sobrescrevam escolhas recentes do usuário.

5. **Conversão de Avatares PNG e Verificação de Assets:**
   - Os 5 avatares (`avatar-1.png` a `avatar-5.png`) foram convertidos de JPEG falso para formato PNG autêntico com cabeçalho oficial (`89 50 4E 47`).
   - Verificada resposta HTTP 200 e content-length correto para avatares e miniaturas.

---

## 2. Arquivos Modificados e Criados

| Arquivo | Alteração |
|---|---|
| `apps/web/lib/outfitRecolor.ts` | Exportação de `getOutfitCapabilities`, tracking de `failedImageUrls`, frame cycling para Sire, suporte a `isCurrent` em `renderRecoloredOutfit` e sanitização no `getRecoloredCanvasSync`. |
| `apps/web/components/OutfitModal.tsx` | Navegação para ficha do personagem, `renderGenRef` para cancelamento de previews obsoletos, checkboxes desabilitados por capabilities e sanitização ao trocar outfit. |
| `apps/web/components/CharacterProfileModal.tsx` | Propagação do `activeChar.id` no callback `onOpenOutfit`. |
| `apps/web/components/GamePrototype.tsx` | Conexão do callback `onOpenCharacterProfile` no `<OutfitModal>` e sincronização bidirecional de personagem. |
| `tests/phase122-outfit-navigation-capabilities-sire.test.ts` | Nova suíte com 10 testes cobrindo capabilities, ausência de bloqueio por addon 1 no retro-knight, 404 resilience, frame cycle do Sire, recusa de montaria, token de cancelamento e cabeçalhos PNG de avatares. |

---

## 3. Validação e Testes

- **Testes Unitários da Fase 122:**
  - `npx vitest run tests/phase122-outfit-navigation-capabilities-sire.test.ts` -> 10/10 testes aprovados.
- **Suíte Completa de Testes:**
  - `npm run test` -> 123 arquivos de teste aprovados, 689 testes aprovados (100% de sucesso).
- **TypeScript Check:**
  - `npm run typecheck` -> 0 erros de tipagem.
