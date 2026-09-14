# Phase 160 Summary: Bestiary Floating HUD, Multi-Monsters por Hunt & Saneamento de Sprites

**Data de Conclusão:** 2026-09-13  
**Status:** Concluído com 100% de Sucesso  
**Dependência:** Phase 159  

---

## 🎯 Objetivos Concluídos

1. **Correção de Sprites de Monstros (Adeus Demon no Rat e em todas as criaturas da Cyclopedia):**
   - Sincronização em massa de 614 miniaturas em `public/generated/tibia1098/monster-*-thumb.png` diretamente para `public/generated/bestiary/` e `public/assets/monsters/`.
   - Inclusão canônica de `Rat` e `Cave Rat` em `INITIAL_CANONICAL_MONSTERS` com dados de loot, resistências e seus sprites autênticos da CipSoft (`/generated/bestiary/rat.png` e `/generated/bestiary/cave-rat.png`).
   - Saneamento dinâmico em `apps/web/lib/cyclopediaData.ts` em `canonicalMonsterMap`, substituindo qualquer fallback indevido de `demon.png` pelo sprite canônico `/generated/bestiary/${cleanId}.png`.
   - Adicionado manipulador de fallback visual em `onError` no `CyclopediaModal.tsx` apontando para `/generated/tibia1098/monster-${clean}-thumb.png`.

2. **Multi-Monstros por Hunt no Bestiary Tracker HUD:**
   - O `BestiaryTrackerHUD` agora aceita uma lista de monstros (`monsters: BestiaryMonster[]`) simultâneos ou um monstro único retrocompatível.
   - Em caçadas com mais de uma espécie (ex: Rat Cellars com `Rat` e `Cave Rat`), todas as espécies da hunt são rastreadas simultaneamente na tela com seus respectivos sprites, nomes, barras de progresso percentual e botões individuais de desfixar.
   - No `GamePrototype.tsx`, o `trackedMonstersList` une dinamicamente todas as espécies ativas da caçada (`encounter.hunt.monsters`) a qualquer criatura fixada manualmente na Cyclopedia.

3. **Janela Flutuante Arrastável e Posição no Canto Superior Direito:**
   - O Bestiary Tracker agora é uma janela flutuante arrastável (Drag & Drop nativo via Pointer Events com `setPointerCapture`), evitando travamentos e funcionando com precisão milimétrica em qualquer resolução.
   - A posição padrão inicial foi configurada para o canto superior direito (`top: 58px`, `right: 20px`), respeitando a visualização do mapa e a barra superior de navegação.
   - Suporte a persistência da posição customizada pelo jogador em `localStorage` (`cavebound_bestiary_tracker_pos`).
   - Adicionado botão de minimizar (`_` / `□`) que colapsa a janela para uma barra compacta e botão de fechar (`✕`) com reabertura automática ao entrar em nova caçada.

---

## 🧪 Verificação e Qualidade

- **Testes Unitários:** `tests/phase160-bestiary-multi-monster-hud-and-sprite-integrity.test.ts` (5 testes novos, 100% aprovados).
  1. `rat.png` e `cave-rat.png` existem em disco e são arquivos binários distintos de `demon.png`.
  2. `Rat` e `Cave Rat` em `CANONICAL_BESTIARY_MONSTERS` apontam para seus sprites canônicos.
  3. Saneamento Global: Nenhuma criatura que não seja o Demon canônico aponta para `demon.png`.
  4. Multi-Monster per Hunt: `rat-cellars` define múltiplos monstros (`['rat', 'cave-rat']`).
  5. Cálculo de progresso multi-monstros e percentuais para o `BestiaryTrackerHUD`.
- **Testes de Regressão:** Suíte Vitest rodando com 100% de sucesso.
- **TypeScript:** `npm run typecheck` sem erros de tipagem.
