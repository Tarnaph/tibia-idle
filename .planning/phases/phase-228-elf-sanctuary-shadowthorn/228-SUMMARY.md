# Phase 228 Summary: Fortaleza dos Elfos (Shadowthorn) Canônica, Texture Atlas Completo e Blindagem de Movimento

## Visão Geral
A Fase 228 resolveu a causa raiz dos mapas quebrados nas caçadas e da animação de caminhada em falso pós-morte/retorno a Thais. As coordenadas de `elf-sanctuary` foram migradas das montanhas áridas de Mount Sternum para a cidadela canônica de Shadowthorn em Venore (`[33089, 32155, 7]`), com compilação de 776 tiles caminháveis e empacotamento integral de texturas em atlas unificado de caçada.

---

## 🛠️ Alterações Realizadas

### 1. Extração Autoritativa de Shadowthorn no RealMap 11
- Em `packages/realmap11-importer/src/importHuntRegions.ts`:
  - `elf-sanctuary` atualizado para `center: [33089, 32155, 7] as const, radius: 25`.
  - Re-executado o pipeline de importação OTBM (`realmap.otbm`), compilando em `content/generated/hunt-regions.json` uma arena rica com 776 tiles caminháveis interligados e anel circular de 6 spawn points para Elfos, Elfos Scouts e Elfos Arcanistas.

### 2. Empacotamento de Itens de Mapa nos Atlases de Caçadas
- Em `scripts/build-hunt-atlases.mjs`:
  - Integrada a leitura de `content/generated/hunt-regions.json` no construtor de atlas.
  - Todos os 257 IDs únicos de mapa de Shadowthorn (pisos de madeira, grama, árvores élficas, bordas, pontes e decorações) foram extrudados com 1px de border replication e empacotados no atlas `hunt-elf-sanctuary-atlas.json` e `.png` (1.08 MB com 6.404 aliases de frames).
  - Em `apps/web/components/PixiArena.tsx`:
    - Eliminado o gargalo de limite de 80 frames que disparava 2.500 requisições HTTP individuais não throttled no navegador.
    - O `PixiArena` agora consome todas as texturas de mapa e monstros instantaneamente do atlas pré-carregado em <100ms.

### 3. Eliminação Definitiva de Caminhada em Falso pós-Morte e pós-Hunt
- Em `apps/web/components/GamePrototype.tsx`:
  - `handleRespawnInTemple`: removido o agendamento de caminhada para o Depot que ficava congelado durante o loading de 10s e prendia o personagem no frame de passos ao nascer no Templo. Substituído por `setWalkingPath(null)` e `heldDirectionRef.current = null`.
  - `exitHunt`: reforçada a anulação de `heldDirectionRef.current = null`.

---

## 🧪 Validação e Testes
- **Testes Unitários e Integração:** `tests/phase228-elf-sanctuary-shadowthorn.test.ts` (4 testes aprovados).
- **Testes de Regressão:** `tests/phase193-cyclops-elf-and-arena-pvp.test.ts`, `tests/phase227-wave1-bestiary-bonus-and-exeta.test.ts`, `tests/phase227-wave2-and-3.test.ts` (100% aprovados).
- **Typecheck:** `npm.cmd run typecheck` passou com 0 erros de tipagem TypeScript.
