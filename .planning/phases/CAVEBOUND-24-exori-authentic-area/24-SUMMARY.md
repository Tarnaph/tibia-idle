# Phase 24 Summary: Área Autêntica da Magia Exori (SQUARE1X1 nos 8 Tiles, Efeito Visual em Toda a Área e Dano Oficial realmap11)

## Objetivo da Fase
Corrigir a área de efeito da magia Berserk (`exori`) conforme os arquivos oficiais de `realmap11` (`spells.xml`, `attack/berserk.lua`, `lib/spells.lua`) e a autenticidade do Tibia:
1. **Área 3x3 (SQUARE1X1)**:
   - Em `realmap11`, `combat:setArea(createCombatArea(AREA_SQUARE1X1))`.
   - A matriz `AREA_SQUARE1X1` cobre todos os 8 tiles ao redor do cavaleiro (`{1, 1, 1}, {1, 3, 1}, {1, 1, 1}`).
2. **Efeito Visual em Toda a Área de 8 Tiles**:
   - Anteriormente, o efeito visual (`CONST_ME_HITAREA` = 10) só era emitido individualmente nas posições onde já existiam monstros alvejados.
   - Agora, quando `exori` é conjurado, são emitidos eventos `spell-visual` com `targetPosition` explícito para **todos os 8 tiles adjacentes** simultaneamente. No `PixiArena`, a animação clássica de cortes em 360° cobre todo o quadrado 3x3 ao redor do personagem.
3. **Conjuração Instantânea sem Dependência de Alvo**:
   - Magias de área instantânea não-alvejadas (`exori`) agora podem ser conjuradas a qualquer momento via hotkey ou clique manual. Se houver monstros nos 8 tiles, todos tomam dano; se não houver, a animação de área 3x3 executa normalmente, consumindo mana e acionando os cooldowns.
4. **Fórmula Oficial de Dano (`realmap11`)**:
   - Alinhado `skillAttack` para `0.07` (min) e `0.09` (max) em [importSpells.ts](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/packages/styller-importer/src/importSpells.ts) e propagado para `content/generated/spells.json`.

---

## Verificação e Testes
- **Testes Automatizados (Vitest)**:
  - Criada suíte dedicada: [phase24-exori-area.test.ts](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/tests/phase24-exori-area.test.ts) (4/4 testes passando).
  - Execução completa: **19/19 arquivos de teste passando, 157/157 testes aprovados (100%)**.
- **Typecheck**:
  - `npm run typecheck`: **0 erros de tipagem**.
