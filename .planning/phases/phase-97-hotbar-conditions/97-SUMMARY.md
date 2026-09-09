# Phase 97: Correção do Sistema de Condições para Uso Automático de Poções, Magias e Runas - Resumo de Execução

## 🎯 Objetivo da Fase
Corrigir e unificar integralmente o sistema de condições e regras de uso automático para todas as poções, magias, runas e itens na hotbar. Cada ação agora respeita com fidelidade absoluta as condições configuradas pelo jogador em cada slot:
- **Alvo:** `self` (Você), `target` (Alvo), `leader` (Líder da Party), `lowest_hp` (Menor Vida do Grupo).
- **Métrica:** `hp` (Vida), `mana` (Mana), `monsters` (Monstros na tela/área).
- **Operador:** `<=` (`lte`), `>=` (`gte`), `<` (`lt`), `>` (`gt`), `==` (`eq`).
- **Valor e Unidade:** Percentual (`isPercent: true`) ou Quantidade Absoluta (`isPercent: false`).

## 🛠️ Modificações Implementadas

### 1. Modelagem de Tipos e Estado no Domínio
- **`packages/domain/src/types.ts`:**
  - Definidos os contratos `HotbarConditionTarget`, `HotbarConditionMetric`, `HotbarConditionOperator`, `HotbarCondition` e `HotbarSlotConfig`.
  - Adicionada a propriedade `hotbarConfigs?: Record<number, HotbarSlotConfig>;` na interface canônica `CharacterState`.
- **`packages/domain/src/party.ts`:**
  - `createCharacter` inicializa `hotbarConfigs: {}` por padrão.

### 2. Motor Determinístico de Avaliação de Condições
- **`packages/domain/src/hotbarActions.ts`:**
  - Implementada a função `evaluateHotbarCondition(condition, context)` que avalia métricas dinâmicas com base no contexto (ator atual, personagem, monstros elegíveis e estado da sala).
  - Implementada a função `isHotbarSlotConditionsMet(config, context)` com combinação estrita via conjunção lógica AND (todas as condições do slot devem ser verdadeiras para disparar).
  - Atualizada `ensureHealthPotionInHotbar` para respeitar configurações existentes, apenas gerando default se o slot estiver vazio/sem configuração prévia.

### 3. Eliminação de Hardcodes no Motor de Combate e Auto-Cast
- **`packages/domain/src/combat.ts`:**
  - Exportada `castAutomaticSpells`.
  - Refatorado o loop de `castAutomaticSpells` para iterar por índice de slot (`slotIndex = 0; slotIndex < character.hotbar.length; slotIndex++`).
  - **Trava de Desativação:** Verificação imediata de `slotConfig.enabled === false` abortando o auto-disparo de slots desativados.
  - **Filtro de Monstros Ignorados:** Verificação de `slotConfig.ignoredMonsters` impedindo o disparo de magias e runas de alvo único em criaturas listadas.
  - **Poções:** Removida a barreira hardcoded de 50% de HP/MP. Agora poções disparam estritamente com base nas regras configuradas no slot (ex.: `<= 75%` de Mana dispara com 75% ou menos).
  - **Runas:** Avaliação de condições tanto para runas de cura (como UH) quanto ofensivas (como Sudden Death com condição de vida do monstro).
  - **Magias:** Avaliação de condições para cura individual ou em grupo (`lowest_hp`, `leader`), buffs de suporte (evitando recasting quando ativo) e magias de ataque.

### 4. Interface e Sincronização em Tempo Real (Frontend)
- **`apps/web/components/HotbarConfigModal.tsx`:**
  - Sincronização atômica do estado local do modal com `character.hotbarConfigs?.[slotIndex]` via `useEffect` ao abrir ou alternar de slot.
  - Adição dos operadores `>` e `==` no seletor de operadores.
  - Preservação de edições ao salvar e despacho no callback `onSave(slotIndex, actionId, config)`.
- **`apps/web/components/GamePrototype.tsx`:**
  - `handleSaveHotbarSlot` atualiza o estado local `hotbarConfigs` e dispara imediatamente persistência remota via `POST /api/characters/${id}/save`.
  - `prepareHuntCharacters` propaga `hotbarConfigs` para as instâncias ativas na caçada.
  - Autosave periódico de 5s inclui `hotbarConfigs`.

### 5. Persistência Permanente no Banco de Dados Prisma (Diretriz 5)
- **`packages/auth/src/characterService.ts`:**
  - `saveCharacterProgress` aceita `hotbarConfigs` e serializa em `hotbarJson` como `{ hotbar, hotbarConfigs }`.
- **`app/api/characters/[id]/save/route.ts`:**
  - Rota REST recebe `hotbarConfigs` no corpo da requisição e repassa ao serviço de autenticação/progresso.
- **`packages/server/src/persistence/PrismaPersistenceManager.ts`:**
  - `saveCharacter` serializa `{ hotbar, hotbarConfigs }` de forma retrocompatível.
  - `loadCharacter` desserializa tanto o formato novo com `hotbarConfigs` quanto arrays legados diretos.

## 🧪 Verificação e Testes Automatizados
- Criada a suíte `tests/phase97-hotbar-conditions.test.ts` com 10 testes dedicados cobrindo:
  1. Condição de HP para Health Potion (<= 75% dispara em 75% e 70%, mas não em 76%).
  2. Condição de Mana para Mana Potion (<= 80% dispara em 80% e 60%, mas não em 85%).
  3. Slots desativados (`enabled: false`) nunca disparam automaticamente.
  4. Múltiplas condições combinadas via AND lógico.
  5. Magias de cura (Wound Cleansing) com condição de vida.
  6. Runas de ataque (Sudden Death) respeitando % de HP do alvo inimigo.
  7. Isolamento absoluto entre slots (condição de um slot não afeta outro).
  8. Filtro de monstros ignorados (`ignoredMonsters`).
  9. Todos os operadores (`lte`, `gte`, `lt`, `gt`, `eq`) e valores absolutos/percentuais.
  10. Persistência permanente em banco de dados Prisma (save e load relacional).

### Resultados de Qualidade:
- **Typecheck (`tsc --noEmit`):** 0 erros.
- **Testes Globais (`npm test`):** 98 suítes aprovadas, 525/525 testes passando (100% de aprovação).
