# Phase 192: Sistema de Arena PvP Ranqueada e Patentes de Caveiras

## 📌 Contexto e Objetivos
Transformar o sistema de PvP do Tibia em uma liga ranqueada esportiva por temporadas com pareamento justo por patentes de caveiras (Skulls):
- **Patentes por Skulls**:
  - Elo 1000–1249: Bronze (Caveira Verde / Green Skull)
  - Elo 1250–1499: Prata (Caveira Amarela / Yellow Skull)
  - Elo 1500–1749: Ouro (Caveira Branca / White Skull)
  - Elo 1750–1999: Platina (Caveira Vermelha / Red Skull)
  - Elo 2000+: Diamante / Mestre (Caveira Preta / Black Skull)
  - Top 1 Geral: Desafiante / Challenger (Caveira Laranja / Orange Skull)
- **Persistência Permanente no Prisma**:
  - `pvpElo`, `pvpTier`, `pvpWins`, `pvpLosses`, `pvpDraws`, `arenaCoins`, `displaySkull`, `pvpMatchHistoryJson`, `pvpTacticsJson`.
- **Fidelidade Visual à Imagem de Referência (`media_1789757663350.png`)**:
  - Modal `Arena PvP` completo com badge de elo/tier, tabela de estatísticas, histórico de partidas, atalho para Highscores, botões "Entrar na fila" e "Desafiar amigo (VIP)", painel de Loadout de PvP (com atalhos para Rotação e Helper por personagem), e seção de Táticas da Arena (3 pranchas configuráveis).
- **Nameplate Skulls**:
  - Exibição visual da caveira da patente sobre a cabeça do personagem no canvas PixiJS e nos jogadores da cidade quando `displaySkull` estiver habilitado.
- **Isolamento e Segurança**:
  - Derrotas em partidas de Arena PvP nunca aplicam perda de experiência, níveis ou itens na conta.

---

## 🛠️ Planos de Execução

### 192-01-PLAN: Geração de Sprites Oficiais de Caveiras (Skulls)
- Criar `scripts/generate-skull-sprites.cjs` para gerar os 6 ícones autênticos de caveiras em pixel art do Tibia:
  - `public/assets/skulls/skull-green.png`
  - `public/assets/skulls/skull-yellow.png`
  - `public/assets/skulls/skull-white.png`
  - `public/assets/skulls/skull-red.png`
  - `public/assets/skulls/skull-black.png`
  - `public/assets/skulls/skull-orange.png`

### 192-02-PLAN: Modelagem de Dados no Prisma e Domínio PvP
- Atualizar `prisma/schema.prisma` adicionando os campos de PvP no modelo `Character`.
- Executar `npx prisma db push --skip-generate` e `npx prisma generate`.
- Criar `packages/domain/src/pvp.ts` com:
  - Definição de patentes, limites de Elo, cores e caveiras associadas.
  - Funções de cálculo de Elo (ganho/perda de rating).
  - Cálculo de recompensa em Arena Coins.
  - Tipagem de táticas e histórico de combates.
- Atualizar `PrismaPersistenceManager.ts` para persistência permanente.

### 192-03-PLAN: API Autoritativa de PvP & Matchmaking
- Criar `app/api/pvp/status/route.ts` para leitura e atualização do estado de PvP da conta/personagem.
- Criar `app/api/pvp/queue/route.ts` para simulação e pareamento de duelo com adversários do mesmo rank/caveira.
- Criar `app/api/pvp/tactics/route.ts` para salvar as pranchas táticas de combate.

### 192-04-PLAN: Modal Arena PvP (`ArenaPvPModal.tsx`)
- Implementar o componente `ArenaPvPModal.tsx` com 100% de paridade estética com `media_1789757663350.png`.
- Conectar botão `ARENA PVP` no `BottomDock.tsx` e integrar no `GamePrototype.tsx`.
- Conectar botão `Highscores` para abrir o ranking da Phase 191.

### 192-05-PLAN: Renderização de Caveiras no Nameplate e Toggle no Perfil
- Integrar renderização da caveira em `ThaisCityArena.tsx` para o jogador local e jogadores remotos.
- Adicionar checkbox/toggle de exibição da caveira ("Exibir caveira de patente") na interface.

### 192-06-PLAN: Testes Automatizados, Typecheck e Deploy VPS
- Criar `tests/phase192-pvp-arena-and-skulls.test.ts`.
- Rodar vitest e typecheck (`tsc --noEmit`).
- Deploy na VPS com `scripts/deploy-phase192-vps.mjs`.
