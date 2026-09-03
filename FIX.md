# RODADA DE AJUSTES
- [x] Bug 1: ao segurar a seta para andar ele anda super rapido pela cidade, precisa resolver isso, para ao segurar ele andar na velocidade normal dele
  - **Resolvido**: `cityStepDurationMs` sincronizado com `baseStepDurationMs` e `lastStepTimeRef` implementado para cadência exata da velocidade base do personagem ao manter setas pressionadas.
- [x] Bug 2: mandei imagem como referência, personagem consegue andar em cima de algumas paredes
  - **Resolvido**: Validações estritas em `GamePrototype.tsx` e `pathfinding.ts` (`if (!tile || !tile.walkable)`), impedindo passos ou caminhos sobre tiles vazios/undefined ou paredes sólidas.
- [x] Bug 3: No Tibia o personagem na verdade não fica no canto inferior esquerdo do tile ele fica no canto inferior direito do tile/sqm isso muda bastante como é visto o personagem, confira se tem algo na documentação e pastas referente a isso
  - **Resolvido**: 
    1. Calibração de `creatureVisualLayout`: `spriteAnchorX: 1`, `spriteAnchorY: 1`, `spriteOffsetX: 16`, `spriteOffsetY: 12`.
    2. Correção crítica no ticker do `ThaisCityArena.tsx`: removido override acidental `view.sprite.x = 0;` (que deslocava o personagem 16px para a esquerda em relação à barra de HP e ao nome). Agora preserva `creatureVisualLayout.spriteOffsetX`.
    3. Elevação da barra de HP e nomeplate (`hpBarY: -24`, `nameplateY: -32`) conforme solicitado, eliminando o espaçamento excessivo e alinhando perfeitamente sobre a cabeça do personagem e o SQM.