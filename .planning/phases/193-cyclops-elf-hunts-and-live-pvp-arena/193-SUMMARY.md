# Phase 193 Summary: Cyclops & Elf Hunts and Map-based Live PvP Arena

## 📌 Visão Geral
- **Objetivo**: Implementar exatamente os requisitos do arquivo `FIX.md`:
  1. Adicionar 2 novas hunts com coordenadas oficiais do mapa RealMap:
     - **Cyclops**: `x: 32416, y: 32041, z: 8` (Mount Sternum / Cyclops Camp).
     - **Elf**: `x: 32741, y: 31298, z: 7` (Shadowthorn / Elf Fortress).
  2. Implementar a **Arena PVP Funcional no Mapa**:
     - Fila com pareamento justo de jogadores com rank parecido.
     - Spawns aleatórios de duelo: Spawn 1 (`x: 33136, y: 32965, z: 8`) vs Spawn 2 (`x: 33136, y: 32973, z: 8`).
     - Combate automático: combatentes se aproximam e atacam utilizando as skills programadas na rotação.
     - Suprimentos de Arena: 100 Health Potions e 100 Mana Potions consumidas automaticamente durante o duelo.
     - Sistema de Pontos e Ranks: **+20 pontos por vitória** e **250 pontos para cada novo rank/caveira**.
     - Celebração de Patente: Ao atingir 250 pontos (e cada novo rank), aviso de parabéns na tela exibindo a nova caveira e quanto falta para o próximo rank (+250 pts).
     - Desbloqueio do Toggle de Caveira: A opção de ligar ou desligar a caveira no outfit só fica disponível a partir de 250 pontos (Rank 1 / Caveira Verde).
- **Status**: Concluído com 100% de aprovação nos testes automatizados e 0 erros de tipagem.

---

## 🚀 Entregas Principais

### 1. Novas Caçadas com Coordenadas Exatas do RealMap
- **`packages/realmap11-importer/src/importHuntRegions.ts`**:
  - `cyclops-camp`: Coordenadas `[32416, 32041, 8]`, raio 25, monstro `Cyclops`, nível recomendado 30.
  - `elf-sanctuary`: Coordenadas `[32741, 31298, 7]`, raio 25, monstros `Elf` e `Elf Scout`, nível recomendado 25.
  - `pvp-arena`: Coordenadas `[33136, 32969, 8]`, raio 20, arena de duelos.
- **`content/generated/hunt-regions.json`**:
  - Extração completa dos 9 mapas reais do OTBM com todos os pisos, paredes e caminhos navegáveis.
- **`packages/domain/src/hunt.ts` e `huntRoute.ts`**:
  - Registrados `cyclops-camp` e `elf-sanctuary` com status `available`, rotas de caça contínuas e definições de ondas.
- **`scripts/build-hunt-atlases.mjs`**:
  - Gerados os atlas de textura `hunt-cyclops-camp-atlas.png` e `hunt-elf-sanctuary-atlas.png` para renderização ultra-rápida no PixiJS.
- **`apps/web/lib/loadingConfig.ts` e `audioManager.ts`**:
  - Curiosidades de lore de Tibia personalizadas para os Ciclopes e Elfos na tela de loading e trilhas sonoras configuradas.

### 2. Motor de Domínio de PvP e Ranks (`packages/domain/src/pvp.ts`)
- **Fórmulas Canônicas**:
  - `PVP_POINTS_PER_WIN = 20`
  - `PVP_POINTS_PER_RANK = 250`
- **Escala de Caveiras por Pontuação**:
  - **Rank 0**: 0 a 249 pts -> `Iniciante` (Sem caveira, toggle bloqueado)
  - **Rank 1**: 250 a 499 pts -> `Bronze` (**Caveira Verde / Green Skull**, toggle desbloqueado)
  - **Rank 2**: 500 a 749 pts -> `Prata` (**Caveira Amarela / Yellow Skull**)
  - **Rank 3**: 750 a 999 pts -> `Ouro` (**Caveira Branca / White Skull**)
  - **Rank 4**: 1000 a 1249 pts -> `Platina` (**Caveira Vermelha / Red Skull**)
  - **Rank 5**: 1250 a 1499 pts -> `Diamante` (**Caveira Preta / Black Skull**)
  - **Rank 6**: 1500+ pts -> `Desafiante` (**Caveira Laranja / Orange Skull**)
- **Funções Utilitárias**:
  - `canDisplaySkull(points)`: Retorna `true` apenas se `points >= 250`.
  - `getNextRankProgress(points)`: Calcula pontos atuais, pontos para o próximo rank e porcentagem.
  - `checkRankPromotion(oldPoints, newPoints)`: Detecta promoções imediatas pós-partida com dados da nova patente.
  - `PVP_ARENA_SPAWNS`: Spawn 1 `(33136, 32965, 8)` e Spawn 2 `(33136, 32973, 8)`.

### 3. API Autoritativa de Duelos (`app/api/pvp/queue/route.ts`)
- Matchmaking por pontuação/rank parecido.
- Sorteio determinístico de spawns: um duelista no Spawn 1 e outro no Spawn 2.
- Combate automático round-a-round baseado nos atributos e níveis dos personagens.
- Auto-consumo das 100 Health Potions e 100 Mana Potions fornecidas para a arena.
- Concessão de +20 pontos para o vencedor e moedas da Arena.
- Desbloqueio automático e persistência permanente no Prisma SQLite (`pvpElo`, `pvpTier`, `displaySkull`, `pvpMatchHistoryJson`).

### 4. Interface da Arena (`apps/web/components/ArenaPvPModal.tsx`)
- **Pontuação e Barra de Progresso**: Exibe pontos totais e barra indicando quantos pontos faltam para o próximo rank (+20 pts por vitória).
- **Toggle Condicional de Caveira**:
  - Se `< 250 pts`: Exibe `🔒 Bloqueado: requer Rank 1 (250 pts)` com tooltip explicativo.
  - Se `>= 250 pts`: Habilita o checkbox para ligar/desligar a caveira exibida sobre a cabeça do personagem.
- **Banner de Celebração de Rank**:
  - Ao subir de rank, exibe banner comemorativo com a nova caveira dourada/colorida:
    `🎉 PARABÉNS! VOCÊ AVANÇOU PARA O RANK [TIER]! Você conquistou a Caveira [COR]! Próximo rank em [X] pontos (+250 pts)! ✨ Opção de exibir caveira no outfit liberada!`
- **Telemetria de Duelo Completa**:
  - Spawns utilizados no duelo: `Spawn 1 (33136, 32965) vs Spawn 2 (33136, 32973)`.
  - Poções automáticas gastas no duelo (`100 Health e 100 Mana Potions`).

---

## 🧪 Testes e Validação
- **Vitest**: `tests/phase193-cyclops-elf-and-arena-pvp.test.ts` (13/13 testes aprovados).
- **Atlas de Texturas**: `hunt-cyclops-camp-atlas.png` e `hunt-elf-sanctuary-atlas.png` compilados sem erros.
- **TypeScript**: 0 erros de tipagem.
- **Deploy**: Script `scripts/deploy-phase193-vps.mjs` pronto com backup pré-deploy, push do schema e compilação do bundle de produção.
