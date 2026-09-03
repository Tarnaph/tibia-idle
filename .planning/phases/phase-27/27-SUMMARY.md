# Phase 27 Summary: Desequipar para Bolsa, Foco Autêntico de Alvo (Retângulo Vermelho) e Anúncio de Level Up

## Visão Geral
Nesta fase, implementamos com precisão todas as correções e melhorias solicitadas em `FIX.md` e espelhadas nas imagens de referência:

1. **Comportamento Autêntico de Desequipar e Equipar para a Bolsa (`game.session.bag`):**
   - **Desequipar Itens:** Ao dar duplo-clique em qualquer slot de equipamento no Paperdoll (ou clicar com botão direito e escolher "Desequipar"), o equipamento não some mais do jogo: ele é transferido diretamente para a Bolsa (`session.bag`) preservando nome, itemId e quantidade (`amount: 1`). Se a bolsa atingir sua capacidade máxima de 12 slots, o item transborda de forma segura para a mochila (`session.loot`).
   - **Equipar Itens da Bolsa/Mochila:** Ao dar duplo-clique em um item da bolsa/mochila (ou escolher "Equipar" no menu de contexto), o item é equipado no slot preferencial correspondente e removido do container. Caso já exista um equipamento prévio no slot de destino, o equipamento anterior é automaticamente devolvido para a bolsa (`session.bag`).

2. **Foco e Retângulo Vermelho de Alvo Autêntico:**
   - **Estética Fiel do Retículo (Imagem 2 / Wyrm):** Substituídos os 4 cantos desconectados por um retângulo/quadrado vermelho contínuo e nítido de 32x32 px (`rect(left, top, 32, 32).stroke({ color: 0xff0000, width: 2, alpha: 1.0 })`) contornando perfeitamente o monstro focado.
   - **Trava Estrita de Foco e Ataque:** O personagem agora persegue e ataca rigorosamente o monstro marcado com o alvo vermelho (`actor.targetId`). Enquanto o monstro alvejado estiver vivo e acessível, o personagem não troca de alvo no meio do combate nem ataca outros monstros que passem por perto.
   - **Seleção por Clique no Canvas:** Ao clicar diretamente sobre qualquer monstro no jogo (`PixiArena`), o monstro é imediatamente selecionado e alvejado (`onSelectTarget`).

3. **Anúncio Centralizado de Level Up (Imagem 3):**
   - Ao avançar de nível (`levelUpCharacter`), é emitido o evento `{ type: 'level-up', characterId, level, previousLevel, message: 'You advanced from Level X to Level Y.' }`.
   - Um banner centralizado em tipografia clássica branca com contorno preto nítido (`text-shadow` preto espesso, estilo clássico do Tibia) é exibido no centro da tela (`.tibia-advancement-banner`) com animação suave de fade in/out de 4.5 segundos.

## Testes e Validação
- Nova suíte de testes unitários criada em `tests/phase27-unequip-target-levelup.test.ts` cobrindo:
  - Desequipar item diretamente para a bolsa sem sumir ou perder propriedades.
  - Equipar item da bolsa/mochila realizando a troca segura (swap) com o item já equipado.
  - Manutenção e perseguição do monstro focado sem troca de alvo aleatória para monstros adjacentes.
  - Atualização do alvo ativo via `setActorTarget`.
  - Emissão do evento de `level-up` com `previousLevel` e a mensagem oficial formatada.
- **100% de Aprovação no Vitest:** 22 suítes de teste executadas, 174 testes passando com 0 falhas.
- **0 Erros de Tipagem:** `npm run typecheck` executado com sucesso e 0 erros.
