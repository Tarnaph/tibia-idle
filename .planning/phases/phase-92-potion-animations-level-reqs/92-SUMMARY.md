# Phase 92 Summary: Animação Autêntica de Poções (APNG), Remoção de Quantidade no Menu de Ações e Requisitos de Nível Canônicos

## Visão Geral

Nesta fase atendemos integralmente aos 3 novos requisitos solicitados para o sistema de poções:
1. **Remoção da quantidade de poções no menu de configurar ações (`HotbarConfigModal.tsx`)**: Eliminamos as badges numéricas que mostravam quantidades fixas/arbitrárias nos cards de poções.
2. **Requisitos de nível e vocação para cada poção**:
   - Mapeamos e tipamos todos os níveis canônicos (`Small Health`: Lv 1, `Health`: Lv 1, `Strong Health`: Lv 50, `Great Health`: Lv 80, `Ultimate Health`: Lv 130, `Supreme Health`: Lv 200, `Mana`: Lv 1, `Strong Mana`: Lv 50, `Great Mana`: Lv 80, `Ultimate Mana`: Lv 130, `Great Spirit`: Lv 80, `Ultimate Spirit`: Lv 130, poções de suporte: Lv 1).
   - Aplicamos trava estrita no modal de configuração de ação (`HotbarConfigModal.tsx`): poções acima do nível do personagem exibem `🔒 Requer Lv X` e não podem ser selecionadas/equipadas.
   - Painel lateral de detalhes exibe os requisitos exatos de nível e vocação (`Requer: level X+ · Vocações`).
3. **Animação das poções (Animated PNG - APNG)**:
   - Identificamos nos arquivos oficiais do Tibia 10.98 (`Tibia.dat` e `Tibia.spr`) que poções de alto nível possuem 12 frames de animação com efeitos de brilho estelar (star glint sparkle).
   - Implementamos o encoder nativo de Animated PNG (APNG com chunks `acTL`, `fcTL` e `fdAT`) no pacote `tibia1098-assets`.
   - Para poções de alto nível (`8473` Ultimate Health, `26031` Supreme Health, `26029` Ultimate Mana, `26030` Ultimate Spirit), extraímos os 12 frames autênticos do `Tibia.spr` e geramos o APNG a 100ms/frame.
   - Para poções canônicas de frame único, geramos loops nativos de 12 frames de brilho no vidro, preservando a transparência e paleta original.
   - Os arquivos APNG funcionam nativamente no navegador em `<img>`, CSS `background-image` e canvas sem qualquer overhead de CPU/loops JavaScript.

---

## Arquivos Modificados / Criados

- `packages/tibia1098-assets/src/png.ts`:
  - Implementado `encodeRgbaApng(width, height, framesRgba, delayMs)` com geração de chunks `acTL`, `fcTL` e `fdAT`.
  - Implementado `generateSparkleApng(width, height, baseRgba, delayMs)` para brilhos cintilantes periódicos em 12 frames.
- `packages/tibia1098-assets/src/extractor.ts`:
  - `renderFrame` agora retorna tanto o buffer `png` quanto o buffer `rgba`.
  - Integração da geração de APNG durante o ciclo de build de assets para poções canônicas e itens multi-frame.
- `packages/domain/src/hotbarActions.ts`:
  - Adicionadas definições completas de `requiredLevel`, `category` e `vocations` para todas as poções e elixires canônicos (`8704`, `7618`, `7588`, `7591`, `8473`, `26031`, `7620`, `7589`, `7590`, `26029`, `8472`, `26030`, `8474`, `7439`, `7440`, `7443`).
- `apps/web/components/HotbarConfigModal.tsx`:
  - Removido badge de quantidade (`hotbar-potion-badge`).
  - Implementada verificação `isLocked = character.level < (potion.requiredLevel ?? 0)`.
  - Poções bloqueadas desabilitam o clique via `handleSelect(potion.id, isLocked)` e exibem visual bloqueado com texto `🔒 Requer Lv {reqLevel}`.
  - Painel de detalhes atualizado com requisitos de nível e vocação.
- `public/potions/*.png` e `public/generated/tibia1098/items/*.png`:
  - 22 poções atualizadas para Animated PNG (APNG) nativo de 12 frames.
- `tests/phase92-potion-animations-and-level-requirements.test.ts`:
  - 7 testes automatizados cobrindo chunks APNG (`acTL`, `fcTL`), contagem de 12 frames, travas de nível canônicas, verificação de vocação e ausência de badge no modal.

---

## Verificação e Qualidade

- **Typecheck**: `npm run typecheck` executado com **0 erros**.
- **Testes Unitários**: `vitest run` executou **93 arquivos de teste** e **488 testes aprovados** (100% de sucesso).
- **Compatibilidade Web**: APNG é suportado universalmente por Chromium, Gecko e WebKit sem necessidade de bibliotecas externas.
