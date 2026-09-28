# Phase 256 Summary: Unificação de Caçadas em Caverna Fechada & Visibilidade Mútua em Thais

## Objetivos Concluídos

1. **Unificação das Coordenadas de Caçadas (Caverna `x: 32947, y: 32476, z: 9`):**
   - Todas as 12 caçadas convencionais (`rat-cellars`, `spider-burrow`, `troll-camp`, `old-crypt`, `rotworm-cave`, `cyclops-camp`, `elf-sanctuary`, `dragon-lair`, `corym-mine`, `giant-spider-lair`, `hero-cave`, `hydra-lair`) foram configuradas para a caverna compacta subterrânea fechada por paredes sólidas de pedra natural extraídas do RealMap 11 (`items.otb` + `realmap.otbm`).
   - 2.601 tiles no bloco `51x51`, 520 tiles caminháveis, piso de terra batida (Server ID `9022`), delimitado em todo o perímetro por paredes rochosas intransponíveis.
   - Fim definitivo da caminhada automática em direção a blocos pretos ou vazios de mapa não mapeados.
   - Preservadas as tabelas individuais de catálogo de monstros, pulls de dificuldade e drops de cada masmorra.
   - `pvp-arena` preservada em suas coordenadas canônicas dedicadas `[33136, 32969, 8]`.

2. **Instâncias Isoladas em Caçadas:**
   - O componente de caçada (`PixiArena`) é puramente instanciado para o jogador / party. Jogadores em caçadas nunca se veem nem interferem no progresso uns dos outros.

3. **Garantia Absoluta de Visibilidade Mútua em Thais City (`ThaisCityRoom.ts` & `ThaisCityArena.tsx`):**
   - **Causa Raiz Resolvida:** Jogadores que desconectavam em caçadas tinham `isHunting: true` no banco de dados. No login, `ThaisCityRoom.onJoin` os forçava de volta para `inHunt: true` e `z: 9`, fazendo com que os outros jogadores na cidade filtrassem e descartassem sua renderização.
   - **Correção no Servidor (`ThaisCityRoom.ts`):** `onJoin` só ativa modo caçada se `options.inHunt === true` for explicitamente requisitado. Entrar na sala sem essa opção agora força a entrada na cidade (`z: 7, inHunt: false`), normaliza coordenadas e limpa flags obsoletas de caçadas no banco de dados.
   - **Correção no Cliente (`ThaisCityArena.tsx`):** Jogadores remotos no piso da cidade (`z: 7` ou `z: 6`) não são mais ocultados por flags de hunt residuais. A renderização do PIXI exibe todos os jogadores presentes no mesmo andar da cidade, habilitando context menu, inspeção e movimentação mútua no Templo de Thais.

4. **Verificação & Testes:**
   - `tests/phase256-cave-unification-and-city-multiplayer-visibility.test.ts` criado e 100% aprovado.
   - `tests/phase193-cyclops-elf-and-arena-pvp.test.ts` e `tests/phase228-elf-sanctuary-shadowthorn.test.ts` atualizados e 100% aprovados.
   - `npm run typecheck` executado com 0 erros de tipagem TypeScript.
