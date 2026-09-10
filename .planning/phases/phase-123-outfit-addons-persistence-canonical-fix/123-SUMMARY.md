# Phase 123 Summary: Correção de Addons Invisíveis, Normalização Canônica de Outfits (Noble/Noblewoman), Hidratação de Estado e Persistência Permanente

## 1. Visão Geral e Diagnóstico Realizado
Nesta fase, investigamos a fundo e corrigimos com precisão cirúrgica os dois problemas reportados:
1. **Addons que pararam de funcionar e não apareciam no jogo:**
   - **Desconexão de Propriedades Prisma vs Domínio (`outfitAddons` vs `addons`):** O modelo Prisma utiliza o campo `outfitAddons Int @default(0)`, enquanto o cliente e os renderizadores utilizam `addons`. A rota `/api/characters` retornava apenas `outfitAddons`.
   - **Falta de Hidratação Inicial no Frontend:** Em `GamePrototype.tsx`, ao instanciar o `userChar`, os campos `addons`, `mount` e `mountActive` não eram inicializados, fazendo com que `userChar.addons` permanecesse `undefined` (defaultando para 0).
   - **Falta de Propagação na Conexão Colyseus:** Na chamada `gameNetwork.connect`, a propriedade `addons` não era repassada nas opções.
   - **Falta de Persistência Permanente no Endpoint de Save (`/api/characters/[id]/save`):** O método `saveCharacterProgress` e o handler da rota REST aceitavam apenas atributos de combate/skills e descartavam `outfit`, `outfitHead`, `outfitBody`, `outfitLegs`, `outfitFeet`, `outfitAddons`, `mount` e `mountActive`. Toda vez que o jogador trocava de tela, relogava ou ocorria o autosave periódico, as customizações eram perdidas.
   - **Envenenamento de Cache via `failedImageUrls`:** Quando uma imagem falhava ou demorava para carregar, `failedImageUrls` marcava o addon como "pronto", gerando um sprite incompleto sem addon e gravando esse canvas no `recoloredCanvasCache` definitivo, travando a renderização sem addon para o resto da sessão.

2. **Outfits que deixaram de aparecer:**
   - **Incompatibilidade Canônica do Traje Noble (`noble` vs `noblewoman`):** O catálogo possuía o ID `'Noble'`, mas a função `normalizeOutfitId` retornava `'noble'`. O ID canônico DAT no `content/generated/outfits.json` e todos os arquivos em disco em `public/generated/outfits/` utilizam `'noblewoman'`. Isso gerava URLs inválidas com 404 em todas as variantes de direção, addons e montaria do Noble.
   - **Filtro `filterAcquired` no `OutfitModal.tsx`:** O checkbox "Mostrar só os adquiridos" filtrava todos os trajes com `isPremium === true`, omitindo 70 dos 76 trajes mesmo para contas que possuem status premium por padrão no Cavebound (`isPremium: true`).

---

## 2. Alterações Implementadas

### A. Camada de Normalização e Proteção de Cache (`apps/web/lib/outfitRecolor.ts`)
- Mapeamento explícito de `Noble`, `Nobleman`, `noble` para o ID canônico DAT `'noblewoman'`.
- Resolução de capabilities completas para `'noblewoman'` (`hasAddon1: true`, `hasAddon2: true`, `hasMountRider: true`).
- Proteção anti-envenenamento no `recoloredCanvasCache`: se qualquer camada solicitada (base, máscara, addon1, addon2 ou montaria) não estiver presente na memória na hora da composição, o resultado é armazenado apenas no `provisionalCanvasCache`, reservando o `recoloredCanvasCache` definitivo apenas para renderizações completas.

### B. Persistência Permanente de Customização (Backend & Database)
- **`packages/auth/src/characterService.ts`**:
  - `saveCharacterProgress` estendido para aceitar e persistir no Prisma DB: `outfit`, `outfitHead`, `outfitBody`, `outfitLegs`, `outfitFeet`, `outfitAddons`, `mount`, `mountActive`.
- **`app/api/characters/[id]/save/route.ts`**:
  - Extração e repasse seguro de `outfit`, `outfitLookType`, `outfitHead`, `outfitBody`, `outfitLegs`, `outfitFeet`, `outfitAddons`, `mount`, `mountActive`.
- **`app/api/characters/route.ts`**:
  - Retorno explícito de `addons: c.outfitAddons ?? 0`, `outfitAddons: c.outfitAddons ?? 0` e `outfitColors` na listagem e na criação de personagens.

### C. Sincronização e Hidratação no Cliente (`apps/web/components/`)
- **`GamePrototype.tsx`**:
  - Hidratação autoritativa de `userChar.addons`, `userChar.mount`, `userChar.mountActive` no carregamento.
  - Envio de `addons: userChar.addons` nas opções do `gameNetwork.connect`.
  - Disparo de persistência permanente via REST POST para `/api/characters/${characterId}/save` imediatamente ao salvar customização em `handleSaveOutfit` e ao alternar montaria em `handleToggleMount`.
  - Inclusão dos campos de outfit, addons, cores e montaria no payload do autosave periódico (a cada 5 segundos) e no evento de saída de página.
- **`PixiArena.tsx`**:
  - Fallback seguro para leitura de addons: `const addons = (character as any).addons ?? (character as any).outfitAddons ?? 0;`.
- **`ThaisCityArena.tsx`**:
  - Repasse de `addons`, `char.mount` e `isMounted` na inicialização do `ensureActorView`.
  - Propagação correta de addons e montaria para players remotos conectados via Colyseus.
- **`OutfitModal.tsx`**:
  - Ajuste do filtro `filterAcquired` para considerar `isCharPremium = activeChar?.isPremium !== false`, exibindo o catálogo completo de trajes para contas premium.

---

## 3. Validação e Qualidade (GSD Verification)
- **TypeScript Typecheck (`npm run typecheck`):**
  - 0 erros de tipagem em todo o monorepo (`tsc --noEmit --incremental false`).
- **Suíte de Testes Vitest (`npm test`):**
  - 124 arquivos de teste executados.
  - 696 testes aprovados (100% de aprovação, 0 falhas).
  - Nova suíte `tests/phase123-outfit-addons-persistence-canonical-fix.test.ts` com 7 testes dedicados cobrindo:
    - Normalização e capabilities do Noble para `noblewoman`.
    - Presença de 100% dos arquivos de camadas em disco para todos os outfits.
    - Prevenção de poluição de cache para camadas incompletas.
    - Persistência no `CharacterService`.
    - Respeito ao status premium no filtro de adquiridos.
