# Phase 194: Live PvP Arena Matchmaking, Real-Time Map Teleport & Automated Duel

## 📌 Contexto e Diretrizes do Usuário
Conforme explicitado pelo usuário:
1. **Fila com Jogadores Online e Timeout**:
   - O jogador clica em "Entrar na fila" e o sistema busca exclusivamente **jogadores reais online** com rank/patente compatível.
   - O sistema exibe o status de busca com temporizador e botão para cancelar a qualquer momento.
   - Se passar o tempo limite (~15 a 20 segundos) e nenhum outro jogador online entrar na fila, o sistema encerra a busca e informa amigavelmente: *"Nenhum oponente disponível no momento. Tente novamente em instantes!"*.
2. **Teleporte Idêntico às Hunts & Batalha ao Vivo no Mapa**:
   - Assim que 2 jogadores online são pareados, ocorre o teleporte para o mapa da Arena (`pvp-arena`), idêntico ao fluxo de teleporte de caçadas (com transição e tela de loading).
   - Um combatente nasce no Spawn 1 (`x: 33136, y: 32965, z: 8`) e o outro no Spawn 2 (`x: 33136, y: 32973, z: 8`) de forma aleatória.
   - Ambos aparecem no mapa da Arena na tela um do outro.
   - Eles se movem automaticamente um na direção do outro até o alcance de ataque.
   - Executam o combate automático disparando os feitiços e ataques programados da rotação.
   - Cada combatente consome automaticamente seu suprimento de 100 Health e 100 Mana Potions durante o combate.
   - O vencedor ganha +20 pontos de rank (com celebração a cada 250 pontos) e ambos retornam para Thais pós-duelo.

---

## 🛠️ Planos de Ação (Waves)

### Wave 1: Matchmaking Autoritativo em Tempo Real no Colyseus (`ThaisCityRoom.ts`)
- Implementar fila em memória no Colyseus: `pvp:queue:join`, `pvp:queue:leave`, `pvp:queue:status`.
- Pareamento estrito entre jogadores conectados online com ranks compatíveis.
- Timeout de 18 segundos com emissão de evento `pvp:queue:timeout` ("Nenhum oponente disponível no momento").
- Emissão de `pvp:match:found` para ambos os clientes quando o match for formado, enviando id do duelo, dados do adversário e spawns sorteados (Spawn 1 vs Spawn 2).

### Wave 2: Teletransporte para o Mapa da Arena PvP e Modo de Duelo
- Integrar a região `pvp-arena` com o viewport e engine de jogo (semelhante ao modo `hunt`, mas em formato de arena PvP 1v1).
- Posições de spawn: `(33136, 32965, 8)` e `(33136, 32973, 8)`.
- Sincronização espacial de ambos os combatentes na arena.
- IA de aproximação automática: ambos caminham pelo grid de tiles em direção ao oponente.

### Wave 3: Combate em Tempo Real com Rotação, Auto-Potions e Resolução
- Disparo de habilidades, magias e ataques da rotação com efeitos visuais e sons.
- Auto-consumo das 100 Health Potions e 100 Mana Potions (com indicador visual na tela de poções restantes).
- Detecção de vitória/derrota com proteção total (sem perda de XP nem loot).
- Atribuição de +20 pontos ao vencedor no Prisma DB com celebração de rank e retorno suave para Thais.

### Wave 4: Interface do Usuário (`ArenaPvPModal.tsx` e HUD de Arena)
- Atualização do botão "Entrar na fila":
  - Estado de busca: contador regressivo/progressivo ("Buscando oponente online... 0:12") e botão "[Cancelar Busca]".
  - Mensagem de timeout amigável quando expirar sem adversário.
  - Alerta de "Partida Encontrada!" com contagem para o teletransporte.
- HUD durante o duelo na Arena mostrando vida/mana do oponente, poções restantes (100 HP / 100 MP) e telemetria.

### Wave 5: Testes Automatizados, Typecheck e Deploy na VPS
- Testes no Vitest para fila online, timeout, spawns e transição.
- Validação de 0 erros no `tsc --noEmit`.
- Commit convencional e deploy na VPS `187.7.16.210`.
