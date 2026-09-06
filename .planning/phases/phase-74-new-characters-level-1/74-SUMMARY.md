# Phase 74: Personagens Novos em Nível 1 e Verificação de Visibilidade Urbana em Thais - Summary

## Visão Geral
Nesta fase, atendemos integralmente aos dois requisitos solicitados:
1. **Personagens Novos em Nível 1:**
   - Todos os personagens recém-criados agora começam estritamente no **Nível 1** com **0 de experiência**, com atributos canônicos iniciais do Tibia (150 HP, 35 MP, 400 de capacidade).
   - Atualização completa em:
     - `packages/auth/src/characterService.ts`: `VOCATION_CONFIGS` de todas as vocações (Sorcerer, Druid, Paladin, Knight) com 150 HP / 35 MP / 400 Cap e `CharacterService.createCharacter` configurando `level: 1` e `experience: BigInt(0)`.
     - `packages/server/src/schemas/PlayerState.ts`: Colyseus Schema padrão atualizado para `level: 1`, `experience: 0`, `hp: 150`, `maxHp: 150`, `capacity: 400`.
     - `packages/server/src/rooms/ThaisCityRoom.ts`: fallback de level alterado de 8 para 1 e atributos base para 150 HP / 35 MP / 400 Cap.
     - `prisma/schema.prisma`: defaults do modelo `Character` atualizados para `level @default(1)`, `experience @default(0)`, `health @default(150)`, `maxHealth @default(150)`, `capacity @default(400)`.
2. **Verificação Minuciosa de Visibilidade Urbana na Cidade de Thais:**
   - Auditoria completa no pipeline de multiplayer e renderização (`ThaisCityArena.tsx`, `GameClientNetworkManager.ts` e `ThaisCityRoom.ts`):
     - **Tag `inHunt`:** No `ThaisCityArena.tsx`, a regra de filtragem é `if (isLocal || p.inHunt) return;`. Novos personagens entram com `inHunt: false` (inicializado no `PlayerState` e no `ThaisCityRoom.onJoin`), garantindo que não sejam ignorados pelo renderer.
     - **Tag Floor / `posZ`:** O piso térreo de Thais é o andar 7 (`curPos.z = 7`). A regra de visibilidade é `view.root.visible = (p.z ?? 7) === curPos.z;`. Novos personagens recebem `posZ: 7` (`THAIS_TEMPLE_SPAWN`), estando exatamente no mesmo piso e 100% visíveis.
     - **Coordenadas:** Spawn inicial configurado em `(32369, 32241, 7)` no Templo de Thais.
     - **Appearance / Nameplate:** O nome do personagem (`p.name`) é exibido com o estilo autêntico (Arial 8px 700 verde `0x67de82` com contorno `0x08120a`), e a textura do sprite da vocação é resolvida e pré-carregada automaticamente.

## Arquivos Modificados e Criados
- `packages/auth/src/characterService.ts`: Atualização das constantes `VOCATION_CONFIGS` e `CharacterService.createCharacter` para nível 1 e 0 XP.
- `packages/server/src/schemas/PlayerState.ts`: Atualização de defaults do schema Colyseus para nível 1.
- `packages/server/src/rooms/ThaisCityRoom.ts`: Atualização de fallback para nível 1 e 150 HP / 400 Cap.
- `prisma/schema.prisma`: Atualização de defaults para nível 1.
- `tests/phase68-full-persistence-audit.test.ts`: Ajuste das asserções de criação de personagem para nível 1.
- `tests/phase74-new-characters-level-1.test.ts`: Nova suíte com 8 testes cobrindo fórmulas de XP, criação de personagens em nível 1 e auditoria das tags de visibilidade urbana.
- `.planning/ROADMAP.md` e `.planning/STATE.md`: Atualizados para refletir a Fase 74.

## Verificação e Qualidade
- **TypeScript Typecheck:** 0 erros com `tsc --noEmit --incremental false`.
- **Vitest:** 100% dos testes aprovados nas suítes executadas.
