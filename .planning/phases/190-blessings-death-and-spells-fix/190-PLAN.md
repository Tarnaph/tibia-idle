# Phase 190 Plan: Sistema de Blessings, Revamp da Tela de Morte, Loading Screen Seguro e Correção de Magias

## 1. Contexto & Objetivos
Atender integralmente às solicitações de `FIX.md` e correções de magias reportadas pelo usuário:
1. **Loading Screen Seguro**: Remover a frase *"Clique na tela ou pressione qualquer tecla para entrar imediatamente"* e qualquer mecanismo de skip prematuro no clique ou teclado do `ExuraLoadingScreen.tsx`. O loading deve terminar por completo.
2. **Sistema de Blessings ("TEMPLO — BLESSINGS")**:
   - Modal autêntico estilizado conforme os prints de referência.
   - 5 bênçãos canônicas: The Wisdom of Solitude, The Spark of the Phoenix, The Fire of the Suns, The Spiritual Shielding, The Embrace of Tibia.
   - 51.800 gp cada ou 259.000 gp todas (compra individual e botão "Abençoar tudo").
   - Regras de proteção: 0 blessings = 0% redução / 10% chance de perda de item; 5 blessings = 40% redução (sofre 60%) / 0% chance de perda de item.
   - Persistência permanente no banco de dados Prisma (`blessingsJson`).
3. **Revamp da Tela de Morte ("VOCÊ MORREU")**:
   - Estilização escura premium idêntica ao print com fita superior carmesim e caveira 💀.
   - Apresentação clara de quem matou o personagem, experiência e níveis perdidos, skills perdidas.
   - Consumo integral de todas as blessings do personagem ao morrer (`† Suas X blessings foram consumidas.`).
   - Botão "Reviver" retornando ao Templo de Thais com o estado já persistido.
4. **Correção de Magias (`exori hur` e direcionais)**:
   - Em `packages/domain/src/spells.ts`, refatorar `isDirectionalSpell` removendo `lowerWords.includes('hur')`.
   - Garantir que `exori hur` (Whirlwind Throw) atinja 1 alvo dentro de 5 sqm, lançando a arma equipada e exibindo o efeito 10 (`CONST_ME_HITAREA`).
   - Preservar integralmente outfits, montarias, movimentos, efeitos visuais, mapa e recolors.

## 2. Tarefas de Execução
- [ ] Task 1: Correção de `isDirectionalSpell` em `packages/domain/src/spells.ts` e suporte em `ThaisCityRoom.ts`.
- [ ] Task 2: Remoção de skip em `ExuraLoadingScreen.tsx`.
- [ ] Task 3: Criação de `packages/domain/src/blessings.ts` com cálculos e catálogo.
- [ ] Task 4: Atualização de `prisma/schema.prisma`, `characterService.ts` e `characterHydration.ts` para persistência de `blessingsJson`.
- [ ] Task 5: Implementação de `BlessingsModal.tsx` com as 5 bênçãos e botões de compra individual e em lote.
- [ ] Task 6: Revamp de `DeathModal.tsx` e atualização de `combat.ts` (`calculateDeathPenaltyReport` e `respawnInTemple`).
- [ ] Task 7: Conexão dos modais em `BottomDock.tsx` e `GamePrototype.tsx`.
- [ ] Task 8: Criação de testes unitários automatizados em `tests/phase190-blessings-and-spells.test.ts`.
- [ ] Task 9: Execução de typecheck e testes Vitest.
- [ ] Task 10: Commit, push e deploy na VPS `187.7.16.210`.
