# Phase 220: Monster Spawn Teleport FX & Skill Rate Limiter Hunt Fix

## Overview
- **Phase:** 220
- **Status:** Complete
- **Date:** 2026-09-21
- **Focus:** 
  1. Efeito visual clássico de teleport do Tibia (`CONST_ME_TELEPORT` / effect 11) no nascimento de criaturas no mapa.
  2. Diagnóstico e resolução da recusa de salvamento de caçada e alts (Cerberus + Wolfy) por falso-positivo no orçamento contínuo de tentativas de treino de skills ao usar mana potions e magias de forma sustentada.

---

## 1. Monster Spawn Teleport FX (Efeito Visual)
- **Domain (`packages/domain/src/types.ts` & `combat.ts`):**
  - Adicionado subtipo `spawn-visual` em `CombatVisualEvent`:
    ```ts
    | { type: 'spawn-visual'; targetId?: string; position?: GridPosition; effectId: number; id?: string }
    ```
  - Em `populateRespawnZone` e `populatePullAroundParty`, para cada monstro instanciado, emite `spawn-visual` com `effectId: 11` (o ID oficial de `CONST_ME_TELEPORT` do Tibia) e coordenadas da criatura.
- **Frontend (`apps/web/components/PixiArena.tsx`):**
  - Implementado manipulador no renderizador PIXI para `spawn-visual`, exibindo a animação dos 11 frames de `effect-11` com escala e posicionamento canônico no tile de nascimento.
  - Integrados também `heal-applied` e `spell-cast-visual` para garantir visibilidade plena dos efeitos mágicos e de suporte.

---

## 2. Diagnóstico e Resolução do Erro de Salvamento de Habilidades
- **Contexto do Bug Reportado:**
  - Usuário caçando em party (Wolfy + alt Cerberus) usando mana potions e rotação intensiva de magias.
  - No alt Cerberus: `Falha ao salvar alt Cerberus status 400: Salto anômalo de habilidade não permitido: ganho de 576000 tentativas de treino excede o orçamento contínuo no tempo (máximo permitido: 72488 tentativas)`.
  - No Wolfy: `Salto anômalo de habilidade não permitido: ganho de 535250 tentativas de treino excede o orçamento contínuo no tempo (máximo permitido: 441297 tentativas)`.
  - Ao tentar sair da caçada: `[HUNT_SAVE] Falha ao salvar progresso antes de sair da caçada` (a proteção do jogo abortou o retorno a Thais para não perder o progresso não salvo).
- **Causa Raiz 1 (Party Alt Context Desconhecido):**
  - O alt Cerberus não possuía WebSocket Colyseus direto conectado em seu ID.
  - No `characterService.ts`, a checagem de skills consultava `ServerCharacterContextRegistry.getContextAsync(characterId)` passando o ID do alt Cerberus, retornando `isHunting: false`. O alt era classificado com o rate limiter urbano de cidade (500 tries/s e 25k burst, gerando o teto rígido de 72.488 tries).
  - **Correção:** O alt herda `leaderContext` através de `data.leaderCharacterId`, recebendo autoritativamente o status `isHunting: true` do líder.
- **Causa Raiz 2 (Multiplicador de Magic Level e Mana Potions):**
  - Com `rateMagic = 25` e stage inicial de `10x`, cada 1 de mana gasta gera 250 tentativas de treino de ML.
  - 2.000 de mana gasta em 20-25 segundos (via spam de Exori / Exura Ico com mana potions) gera mais de 500.000 tentativas de ML (ex: Knight subindo de ML 4 para 6).
  - O teto de caçada estava calibrado em 9.000/s (teto em 24s: 441k tries).
  - **Correção:** Calibrado `HUNT_MAX_TRIES_PER_SECOND = 40_000`, acomodando até 825k-1.000k tentativas legítimas em intervalos normais de autosave (15-20s), sem disparar falso-positivo.
- **Causa Raiz 3 (Integridade Arquitetural de Testes e OCC):**
  - Resolução do vazamento de estado estático em `ServerCharacterContextRegistry.clearAll()`.
  - Preservação da regra anti-salto abrupto de +2 níveis por save e transações OCC com rollback atômico.

---

## 3. Verification & Testes
- **Testes Unitários e de Integração:**
  - `tests/phase220-monster-spawn-fx-and-skill-limiter.test.ts` (4/4 passed)
  - `tests/phase182-hunt-context-recovery.test.ts` (6/6 passed)
  - `tests/block1-1-concurrency-and-security.test.ts` (15/15 passed)
  - `tests/phase217-exhaust-and-party-persistence.test.ts` (7/7 passed)
  - `tests/phase219-monster-damage-and-spells.test.ts` (5/5 passed)
  - `tests/continuous-hunt.test.ts` (10/10 passed)
  - **Total:** 47/47 testes aprovados (100%).
- **TypeScript Typecheck:**
  - `node --max-old-space-size=12288 ./node_modules/typescript/bin/tsc --noEmit --incremental false` -> 0 erros de tipagem.
