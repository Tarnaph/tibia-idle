# Phase 26 Summary: Alinhamento do Inventário, HUD Centralizada, Janela Flutuante, Stances e Distância

## Visão Geral
Nesta fase, atendemos a todos os refinamentos visuais e mecânicos solicitados em `FIX.md` e referenciados nas capturas de tela do usuário:
1. **Alinhamento do Paperdoll de Equipamentos (Layout 3x4):**
   - Linha 1: `neck` (colar/amuleto), `head` (capacete), `backpack` (mochila).
   - Linha 2: `leftHand` (espada/arma), `armor` (armadura), `rightHand` (escudo).
   - Linha 3: `legs` (calça centralizada com espaços vazios nas laterais).
   - Linha 4: `finger` (anel), `boots` (botas), `ammo` (munição/acessório).
2. **Centralização e Redimensionamento da HUD Inferior:**
   - Console de Hotkeys perfeitamente centralizado no meio da parte inferior da tela (`left: 50%; transform: translateX(-50%)`).
   - Botões `DEPOT`, `VENDA RÁPIDA`, `IMBUEMENTS` e `BLESSINGS` menores (altura 20px, fonte 9.5px) e centralizados diretamente acima das hotkeys.
3. **Sprite Oficial da Mochila (Item 1988):**
   - Extraído via pipeline de assets diretamente dos arquivos do jogo (`items.otb`, `Tibia.dat`, `Tibia.spr`) para `public/backpack.png` (32x32 px com transparência).
   - Renderizado no slot ao lado das barras de vida e mana da HUD, bem como no slot de mochila do paperdoll.
4. **Remoção da Aba Antiga de Equipamentos:**
   - Removida a aba e a janela antiga de equipamentos do topo da tela.
   - Todo o acesso aos itens e equipamentos agora é unificado através da nova mochila/inventário.
5. **Janela de Inventário Flutuante:**
   - Removido o overlay escuro (`inventory-window-overlay`) que bloqueava o viewport do jogo.
   - A janela agora é uma janela flutuante arrastável pelo cabeçalho, permitindo acompanhar o combate em tempo real enquanto manipula itens.
6. **Mecânica Autêntica de Combat Stances:**
   - Botões Full Attack (espadas cruzadas com borda verde ativa), Balanced (balança) e Full Defense (escudo) no canto direito da HUD.
   - Full Attack aplica 1.0x dano de ataque e 0.5x fator de defesa.
   - Balanced aplica 0.75x dano de ataque e 0.75x fator de defesa.
   - Full Defense aplica 0.5x dano de ataque e 1.0x fator de defesa.
7. **Controle de Distância do Alvo `[ - 1 + ]`:**
   - Distância 1: Personagem encosta no monstro (corpo a corpo).
   - Distância 2+: Personagem mantém a distância configurada em tiles, ideal para Paladinos e Magos.
   - Pathfinding e aproximação (`findRangedApproachTiles`, `movePartyTowardTargets`, `alreadyInRange`) atualizados para respeitar a distância desejada sem grudar desnecessariamente.

## Testes e Validação
- Nova suíte de testes em `tests/phase26-inventory-stances-distance.test.ts` cobrindo:
  - Presença e formato do sprite oficial `backpack.png` (32x32 px).
  - Configuração e propagação das stances de combate para personagem e actor.
  - Configuração, propagação e clamping da distância de alvo (1 a 5).
  - Priorização de aproximação na distância exata configurada.
  - Manutenção de 2 tiles de distância durante avanço de combate.
  - Multiplicadores de ataque e defesa por stance.
- 100% de aprovação no Vitest: 21 suites de teste e 169 testes passando sem falhas.
- 0 erros em `npm run typecheck` (TypeScript 5.9).
- 0 erros em `eslint` para todos os arquivos modificados.
