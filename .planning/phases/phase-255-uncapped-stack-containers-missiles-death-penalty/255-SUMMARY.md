# Phase 255: Pilhas Sem Teto, Sincronia Multiplayer, Mochila vs Loot Bag e Projéteis Autênticos

## Resumo Executivo
Esta fase consolidou 5 frentes críticas solicitadas para a experiência do jogador:
1. **Pilhas Sem Teto (Uncapped Stacks):** Remoção da trava 1-100 para containers (`session.bag`, `session.loot`), ouro e munições no salvamento autoritativo, suportando até 1.000.000.000 unidades.
2. **Sincronia Multiplayer em Thais:** Resolução da visibilidade assimétrica (Warriot e Caos lado a lado) com normalização autoritativa das coordenadas urbanas e do status de hunt no Colyseus (`ThaisCityRoom.ts` e `CityMovementHandler.ts`).
3. **Compartimentos Renomeados:**
   - Compartimento superior (12 slots) agora se chama **Mochila** (pertences pessoais).
   - Compartimento inferior (20 slots) agora se chama **Loot Bag** (drops de caçada).
4. **Nova Regra de Morte MMORPG:**
   - Na morte sem bênçãos completas, o jogador perde **APENAS o conteúdo da Loot Bag (`session.loot`)**.
   - A **Mochila (`session.bag`)** e todos os **Equipamentos equipados no corpo** são **100% protegidos** contra perda.
   - Com as 5 bênçãos, até a Loot Bag é 100% protegida.
5. **Correção dos Projéteis:**
   - **Flecha com ponta invertida:** Ajustado o mapeamento da matriz 3x3 do Tibia (`pattern.x`, `pattern.y`) em `resolveMissileFrame`, garantindo que flechas atiradas para o Sul voem apontadas para o Sul.
   - **Spear do Paladin:** Armas de arremesso equipadas na mão (`spear`, `royal spear`, etc.) agora têm precedência absoluta sobre munições do inventário, arremessando a lança física sem disparar efeitos de magia.

## Testes e Validação
- Suíte `tests/phase255-uncapped-stack-containers-missiles-death-penalty.test.ts` com 7 testes passando (100%).
- Typecheck TypeScript com 0 erros.
