# Phase 265: Transição Completa para MMORPG 100% Autoritativo (Thin-Client PixiArena, Extinção da Simulação Offline e Combate Autoritativo no Colyseus HuntDungeonRoom)

## 📋 Contexto e Objetivo
Historicamente, o CAVEBOUND / TibiaWeb nasceu como uma simulação local/offline híbrida: o navegador rodava `advanceCombat` a cada 120ms calculando monstros, ataques e cooldowns. Na cidade (`ThaisCityRoom`), o jogo é 100% online e multiplayer com Colyseus. Quando duas contas (ex: Brututus e Caos) entravam em grupo para caçar, as duas simulações locais brigavam, geravam conflitos de passos, dessincronizações de monstros e deadlocks na tela de carregamento.

O objetivo da Phase 265 é fazer a **transição definitiva para um MMORPG 100% autoritativo online**:
1. Extinguir a simulação local offline `advanceCombat` durante caçadas.
2. Fazer do `HuntDungeonRoom` no Colyseus o motor único e autoritativo de combate: monstros, perseguição, ataques, magias (*Exori*, *Exori Flam*, *Exura*, etc.), cooldowns, cadáveres, experiência de grupo e drops.
3. Fazer do `PixiArena.tsx` um Thin-Client autêntico: ele se conecta ao estado do `HuntDungeonRoom` (`huntRoom.state.monsters`, `huntRoom.state.players`), interpola os movimentos com Lerp e renderiza o mundo com perfeição visual.
4. Despachar todas as ações do usuário (clique para atacar, teclas de atalho, magias, poções e caminhada) diretamente para o Colyseus via WebSocket.
5. Garantir transição fluida e rápida de entrada e saída da masmorra para todos os membros da party.

---

## 🌊 Ondas de Execução

### Onda 1: Expansão do Combate Autoritativo no Servidor (`packages/server/src/rooms/HuntDungeonRoom.ts`)
- Adicionar suporte a magias vocacionais:
  - Knight: *Exori* (área 3x3 ao redor do jogador, consome mana, dano físico), *Exori Ico*, *Exura Ico*.
  - Paladin: *Exori San*, *Exori Con*, *Exura Gran*.
  - Sorcerer/Druid: *Exori Flam*, *Exori Vis*, *Exori Frigo*, *Exura Vita*.
  - Poções: Health Potion, Mana Potion.
- Validação de alcance de ataque (melee vs distance/magic) e cooldowns de spells.
- Geração de cadáveres no chão com loot (ouro com multiplicador 5x do servidor e itens) ao derrotar monstros.
- Persistência permanente de progresso no Prisma DB (`PrismaPersistenceManager`).

### Onda 2: Thin-Client no PixiArena Conectado Diretamente ao `HuntDungeonRoom` (`apps/web/components/PixiArena.tsx` & `GameClientNetworkManager.ts`)
- Conectar `PixiArena.tsx` ao `huntRoom`:
  - Renderizar monstros diretamente de `huntRoom.state.monsters`.
  - Renderizar players da party diretamente de `huntRoom.state.players`.
  - Consumir `combatEvents` do servidor para exibir números flutuantes de dano (vermelho/amarelo), projéteis, impacto visual e animações de magia.
- Wireup de ações:
  - Selecionar alvo (`onSelectTarget`): envia `gameNetwork.sendHuntAttack(monsterId)`.
  - Ativar magia ou poção: envia `gameNetwork.sendHuntSpell(spellId, targetId)`.
  - Mover personagem: envia `gameNetwork.sendHuntMove(direction, x, y, z)`.

### Onda 3: Extinção da Simulação Offline e Transição Fluida no Cliente (`apps/web/components/GamePrototype.tsx`)
- Desativar o ticker `tickCombat` quando o jogador estiver em hunt autoritativa no Colyseus.
- Simplificar e blindar a transição de carregamento da caçada:
  - Preload ágil dos assets essenciais.
  - Fechamento imediato do loading assim que conectado ao `HuntDungeonRoom`.
  - Retorno suave para Thais City no templo (`32369, 32241, 7`) ao sair da masmorra.

### Onda 4: Validação Global com Vitest, Typecheck e Deploy na VPS
- Criar suíte de testes Vitest para a masmorra autoritativa completa (`tests/phase265-pure-mmorpg-authoritative-hunts.test.ts`).
- Validar `npm run typecheck` (0 erros).
- Validar `npm run test` (100% de testes passando).
- Atualizar `ROADMAP.md`, `STATE.md` e `FIX.md`.
- Deploy na VPS com reinicialização dos processos PM2 (`colyseus-server` e `tibia-web`).
