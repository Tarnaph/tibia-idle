# Phase 224 Summary: Skeleton Monster Corpses, Dragon Fire Wave & Complete AoE Runes Resolution

## O que foi realizado

1. **Decaimento Canônico de Monstros para Esqueletos (Item 5972):**
   - Corrigido o bug onde corpos de Cyclops e outras criaturas 64x64 (`corpseId: 5962`) sobrepunham múltiplos tiles e eram cortados em 4 quadrantes.
   - No `PixiArena.tsx`, invertida a prioridade para `const mapping = skeletonMapping || specificMapping;` em criaturas não-humanas, fazendo com que todo monstro caçado decaia limpa e canonicamente para o esqueleto oficial 32x32 do Tibia (`item-5972` - *remains of a skeleton*).
   - Preservado o corpo humano ensanguentado de jogadores (`item-3058`/`3065`).

2. **Magias de Monstros, Fire Wave do Dragão (8 SQMs) & Projéteis Visíveis:**
   - Criada a projeção de ondas direcionais `getMonsterWaveTiles` calculando cones autênticos de até 8 SQMs na direção do alvo.
   - O Dragão emite seu rugido característico no balão de fala (`GROOOAAARRR!`) e solta o efeito visual 7 (`CONST_ME_FIREAREA`) em todos os pisos da área da onda, causando dano a todos os jogadores na trajetória.
   - Ataques de disparo à distância de criaturas (bolas de fogo, flechas, pedras) agora emitem `spell-visual` com atraso de voo e animação de mísseis voando na GPU.
   - Mapeado `'firearea'` para o efeito visual canônico 7.

3. **Druid Avalanche & Resolução Integral de Runas em Área (AoE):**
   - Corrigido o bug em que o foco no alvo do líder restringia a busca de inimigos secundários a uma lista unitária, fazendo com que a Avalanche atingisse apenas 1 monstro. Agora, `secondaryEnemies` busca em todos os monstros vivos da sala (`allLivingEnemies`), garantindo que 100% dos monstros dentro do raio 3x3 recebam dano e floaters numéricos simultâneos.
   - Corrigido o cast manual de runas para buscar em todos os monstros vivos e usar chaves bidimensionais `{x, y}` resilientes ao eixo Z.
   - Removido o acoplamento de poções (`usedSpellThisTick = true` em poções e `!usedPotionThisTick` em runas), permitindo uso independente de runas.
   - Removida a trava arbitrária `knightNeedsHeal || allyNeedsHeal` para runas e magias de ataque do Druid, permitindo rotação constante respeitando o exhaust de 2s e mana disponível.
   - Corrigida a contagem de monstros em condições de hotbar.

## Arquivos Modificados
- `packages/domain/src/combat.ts`: Lógica de ondas de monstros, projeção de cone, rugido, mísseis, alvos secundários para runas AoE, desacoplamento de poções e remoção de trava de HP de aliados para magias ofensivas.
- `packages/domain/src/spells.ts`: Exportação de `getMonsterWaveTiles`.
- `apps/web/components/PixiArena.tsx`: Priorização de `skeletonMapping` para decaimento de criaturas em `item-5972`.
- `tests/phase224-monster-spells-wave-and-aoe-runes.test.ts`: Suíte de testes automatizados com 6 cenários passando 100%.
- `tests/phase223-dragon-lair-and-city-exeta-fix.test.ts`: Ajuste de tipos `maxMana` na fixture.
- `FIX.md`, `ROADMAP.md`, `STATE.md`: Documentação e rastreabilidade completas.
