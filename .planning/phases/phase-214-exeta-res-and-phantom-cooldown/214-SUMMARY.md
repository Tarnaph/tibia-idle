# Resumo da Fase 214: Knight Exeta Res (Visuals/Taunt) e Eliminação do Loop de Cooldown Fantasma

**Data de Conclusão:** 19 de Setembro de 2026  
**Status:** Concluído com 100% de Aprovação (5/5 testes novos, 41/41 regressão, 0 erros no typecheck)  
**Itens do FIX.md Solucionados:**
1. *Knight 'Exeta Res': corrigir animação e efeitos mágicos visuais que não estão aparecendo durante a conjuração do taunt/challenge.*
2. *Falha na conjuração de magias e loop de cooldown fantasma: investigar magias que não exibem efeito gráfico nem causam dano, e que ao término do cooldown reiniciam o temporizador sem terem disparado o feitiço.*

---

## 1. Diagnóstico da Causa Raiz

### 1.1 Knight 'Exeta Res' (Challenge - spellId: 93)
- **Falta de Suporte a Caçadas Solo e Ausência de Efeitos em Área:** A implementação anterior de `executeKnightChallenge` abortava silenciosamente com `if (livingActors.length <= 1) return;`, impedindo o Knight de usar Exeta Res em caçadas solo.
- **Tratamento Inadequado no Loop da Hotbar:** Tanto em `castAutomaticSpells` quanto em `triggerManualHotbarAction`, Exeta Res possui `group: 'support'`. Sem o tratamento explícito de `isChallenge`, a magia caía no `else actor.hasteUntil = ...`, aplicando buff de velocidade e emitindo apenas um efeito no próprio personagem, sem desafiar monstros e sem emitir o efeito oficial do Tibia.
- **Efeito Canônico do Tibia:** Conforme a especificação oficial do Tibia (`realmap11/data/spells/scripts/support/challenge.lua`), Exeta Res utiliza `CONST_ME_MAGIC_BLUE` (efeito 13) e `AREA_SQUARE1X1` (8 tiles adjacentes + centro) além de afetar todas as criaturas em um raio de até 3 sqm.

### 1.2 Loop de Cooldown Fantasma e Perda de Mana
- **Ordem de Execução Invertida em `triggerManualHotbarAction`:** O consumo de mana (`actor.mana -= spell.mana`) e a ativação de cooldowns (`actor.spellCooldowns[...] = ...`) aconteciam **ANTES** de validar o alcance e a existência de alvos válidos.
- **Aborto Silencioso:** Quando `inRange.length === 0 && spell.area === 'target'`, o código retornava `false`. O jogador perdia mana, o slot no HUD entrava em recarga regressiva, mas nenhum evento `spell-cast` nem `spell-visual` era emitido e nenhum dano era infligido. Ao expirar o cooldown, o jogador (ou automação) tentava conjurar novamente e o ciclo se repetia (loop de cooldown fantasma).
- **Colapso de Magias com `area: 'self'`:** Magias agressivas centradas no caster (como Divine Caldera / `exevo mas san`, Groundshaker / `exori mas`) com `spell.range === 0` tinham o alcance calculado como `Math.max(1, 0) = 1` e `targets` limitado a `[inRange[0]]` (1 único monstro adjacente), falhando ao atingir monstros a 2-4 sqm e não explodindo os efeitos visuais na área.

---

## 2. Mudanças Implementadas

### 2.1 `packages/domain/src/combat.ts`
1. **Constantes de Área:** Exportação e padronização de `SQUARE_1X1_WITH_CENTER_OFFSETS` para projeção autêntica de 9 tiles (`AREA_SQUARE1X1`).
2. **`executeKnightChallenge`:**
   - Suporte completo a caçadas solo (taunta monstros a até 3 sqm sem taunt ativo) e party (taunta quando monstros miram ou cercam aliados).
   - Emissão de `spell-cast` com fala laranja autêntica `Exeta res`.
   - Emissão de `spell-visual` com efeito 13 (`CONST_ME_MAGIC_BLUE`) nos 9 tiles da área e em cada monstro desafiado.
   - Aplicação autoritativa de `targetId`, `challengedTargetId` e `challengedUntil` nas criaturas.
3. **`castAutomaticSpells`:**
   - Identificação de `isChallenge` no branch de magias de suporte da hotbar.
   - Tratamento de magias de ataque com `area: 'self'` com raio de área correto (`spell.range > 0 ? spell.range : (spell.words.includes('mas') ? 4 : 3)`), atingindo todos os alvos vivos na área.
   - Emissão de efeito visual centralizado para magias `area: 'self'`.
4. **`triggerManualHotbarAction`:**
   - **Validação Prévia de Alvos:** Para magias ofensivas de alvo único (`spell.area === 'target'`), se não houver inimigos vivos ao alcance (`inRange.length === 0`), a função retorna `false` imediatamente **SEM debitar mana** e **SEM aplicar cooldown**, eliminando 100% o loop de cooldown fantasma.
   - Suporte completo a Exeta Res manual com efeito visual 13 nos 9 tiles e taunt nos monstros.
   - Suporte a magias agressivas `area: 'self'` atingindo todos os monstros vivos no raio.

### 2.2 `packages/server/src/rooms/ThaisCityRoom.ts`
- Implementação de `handleCastSpell` para `exeta res` / `challenge` / `93`, emitindo fala `Exeta res`, efeito 13 nos 8 sqm adjacentes e taunt nos monstros locais da cidade.

---

## 3. Testes e Verificação

- **Nova Suíte de Testes:** `tests/phase214-exeta-res-and-phantom-cooldown.test.ts`
  - *Knight conjura Exeta Res com fala, efeito 13 nos 8 tiles de AREA_SQUARE1X1 e taunt nos monstros* -> **Aprovado**
  - *Exeta Res via acionamento manual da Hotbar aplica taunt, consome mana e gera efeitos visuais 13* -> **Aprovado**
  - *Magia ofensiva de alvo único (Strike) fora de alcance NÃO consome mana e NÃO entra em loop de cooldown fantasma* -> **Aprovado**
  - *Magia ofensiva de alvo único (Strike) dentro do alcance consome mana, ativa cooldown e causa dano* -> **Aprovado**
  - *Magia agressiva com area self (Divine Caldera / Mas San) atinge múltiplos monstros no raio* -> **Aprovado**
- **Testes de Regressão:** 41/41 testes aprovados (100%) em `phase214`, `phase213`, `domain`, `party-economy-camera` e `continuous-hunt`.
- **Typecheck:** 0 erros no TypeScript 5.9 (`npm run typecheck`).
