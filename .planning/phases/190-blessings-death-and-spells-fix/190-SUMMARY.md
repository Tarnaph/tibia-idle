# Resumo da Fase 190: Sistema de Blessings, Revamp da Tela de Morte & Correção de Magias

## 📌 Contexto e Objetivos
A Fase 190 atendeu de ponta a ponta as solicitações do documento `FIX.md` e referências visuais anexadas pelo usuário:
1. **Correção de Direção de Magias**: `exori hur` (Whirlwind Throw) disparava erroneamente cone de área directional wave (`getWave4Tiles`) devido a um matching acidental em `isDirectionalSpell()`.
2. **Tela de Loading Segura**: Remoção completa do bypass/pulo prematuro por clique ou teclas (`Space`, `Enter`, `Escape`) na `ExuraLoadingScreen`, garantindo que os assets, texturas e mapa sejam 100% carregados antes da transição visual.
3. **Sistema Completo de Blessings**:
   - 5 bênçãos canônicas: *The Wisdom of Solitude*, *The Spark of the Phoenix*, *The Fire of the Suns*, *The Spiritual Shielding*, *The Embrace of Tibia*.
   - Compra individual (51.800 gp cada) e em lote (*Abençoar tudo* calculando o total das faltantes).
   - Redução da perda na morte: 0 blessings = 0% de redução / 10% chance perda de equipamentos; 5 blessings = 40% de redução de perda / 0% chance de perda de equipamentos.
   - Consumo integral: Ao morrer, todas as blessings ativas são consumidas e limpas.
4. **Persistência Permanente no Banco de Dados (Prisma DB)**:
   - Adicionado campo `blessingsJson` no model `Character` (`prisma/schema.prisma`).
   - Sincronização e hidratação no `PrismaPersistenceManager`, endpoints `/api/characters` e `/api/characters/[id]/save`.
5. **Revamp Visual Moderno da Janela de Morte (Death Modal)**:
   - Fita gótica bordô superior esquerda com caveira prateada.
   - Tipografia canônica: `† VOCÊ MORREU. †`, `Morto por [killerName]`.
   - Card de blessings consumidas (`Suas X blessings foram consumidas`).
   - Expansão de detalhes com skills e itens perdidos.

---

## 🛠️ Modificações Realizadas

### 1. Classificação de Magias & Servidor
- `packages/domain/src/spells.ts`:
  - Refatorado `isDirectionalSpell()` para aceitar tanto `string` quanto `SpellDefinition`.
  - Whitelist explícita de ondas direcionais (`flam hur`, `frigo hur`, `tera hur`, `vis hur`, `vis lux`, `wave`, `beam`).
  - `exori hur` e `utani hur` nunca mais são classificados como ondas de área.
- `packages/server/src/rooms/ThaisCityRoom.ts`:
  - Adicionado handler de `exori hur` / `whirlwind throw` / `107` com alcance 5 e projétil de arma 24.

### 2. Loading Seguro
- `apps/web/components/ExuraLoadingScreen.tsx`:
  - Removido texto de instrução `"Clique na tela ou pressione qualquer tecla..."`.
  - Removidos listeners de teclado (`Space`, `Enter`, `Escape`) que forçavam `setProgress(100)`.
  - Clique na tela apenas desbloqueia o contexto de áudio do navegador sem pular o progresso determinístico de carregamento.

### 3. Domínio e Persistência de Blessings
- `packages/domain/src/blessings.ts` & `index.ts`:
  - `BLESSINGS_CATALOG`, `calculateDeathProtection`, `getMissingBlessingIds`, `calculateMissingBlessingsCost`.
  - `buyBlessing`, `buyAllMissingBlessings`.
- `prisma/schema.prisma`:
  - Adicionado `blessingsJson String?` ao modelo `Character`.
  - Executado `prisma db push --skip-generate` e `prisma generate`.
- `packages/auth/src/characterService.ts`: Atualização e retorno de `blessingsJson`.
- `packages/server/src/persistence/PrismaPersistenceManager.ts`: Salvamento e carregamento autoritativo de `blessingsJson`.
- `app/api/characters/route.ts` & `app/api/characters/[id]/save/route.ts`: Desserialização e persistência de `blessings: number[]`.

### 4. Penalidades de Morte & Consumo
- `packages/domain/src/combat.ts`:
  - `calculateDeathPenaltyReport`: Aplica `protection.effectiveLossRatio` e calcula `lostEquipment` com base em `equipLossChancePercent`.
  - `respawnInTemple`: Reseta `character.blessings = []`, aplica perda reduzida, desaloca equipamentos perdidos e registra histórico.

### 5. Componentes Frontend
- `apps/web/components/BlessingsModal.tsx`:
  - Modal "TEMPLO — BLESSINGS" idêntico aos prints fornecidos.
  - Ícones SVG detalhados dos pergaminhos para cada bênção.
  - Card de status em tempo real.
  - Saldo em gp e botão "Abençoar tudo (X gp)".
- `apps/web/components/DeathModal.tsx`:
  - Redesign estético dark gothic idêntico ao print fornecido.
  - Fita com caveira, `Morto por [killer]`, card de consumo de bênçãos, detalhes expansíveis e botão `Reviver`.
- `apps/web/components/BottomDock.tsx` & `apps/web/components/GamePrototype.tsx`:
  - Conectado botão `BLESSINGS` no BottomDock e QuickActionDock.
  - Integrado gerenciamento de estado, handlers de compra e salvamento automático.

---

## 🧪 Verificação & Testes
- **Vitest**: `tests/phase190-blessings-and-spells.test.ts` (12 testes passando com 100% de sucesso).
- **Regressão**: `tests/phase68-death-penalty-and-modal.test.ts` (6 testes passando), `tests/phase83-directional-wave-spells-and-viewport.test.ts` (4 testes passando).
- **TypeScript**: 0 erros de tipagem.
