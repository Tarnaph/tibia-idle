# Phase 217 Summary: Cooldown/Exhaust Decoupling, Alt Level/XP Persistence, Outfit Isolation & Squad Re-login Preservation

## Status: Complete ✅ (100% dos testes Vitest e 0 erros de Typecheck)

### 1. Objetivos Alcançados
1. **Desacoplamento Completo de Cooldown e Exhaust (Regra Canônica Tibia 10.98+):**
   - No motor de combate de domínio (`packages/domain/src/combat.ts`), eliminou-se a regra errônea onde beber poção bloqueava ações de ataque, cura e suporte por 1000ms.
   - Poções agora possuem exclusivamente seu cooldown próprio (`actor.groupCooldowns['potion']`) de 1000ms.
   - Magias de ataque, cura e suporte e runas ofensivas/curativas NUNCA checam e NUNCA estendem o cooldown de poção.
   - Removido o bloqueio `!usedPotionThisTick` ao conjurar feitiços e `!usedSpellThisTick` ao usar poções, permitindo a jogabilidade autêntica onde o jogador solta magia e bebe poção de mana/vida fluidamente.

2. **Persistência Confiável de Nível, XP e Skills de Alts da Conta:**
   - Em `packages/auth/src/characterService.ts` e na rota `app/api/characters/[id]/save/route.ts`, adicionou-se suporte a `leaderCharacterId` e repasse correto de `sessionId`.
   - Quando um alt da mesma conta é salvo após uma caçada (ex: Cerberus nos Cyclops que upou para o level 32), o `ServerCharacterContextRegistry` e o `XpRateLimiter` reconhecem a evidência da caçada (`hasHuntEvidence` com `lastHuntId` ou contexto do líder).
   - O ganho de experiência deixa de ser avaliado com o teto restritivo de cidade (10.000 XP), permitindo a gravação de grandes quantias de XP legítimas sem estourar o continuous time budget nem lançar `ContextPendingError` (HTTP 503).

3. **Isolamento de Outfits e Montarias de Alts:**
   - Em `apps/web/components/GamePrototype.tsx`, as funções `handleSaveOutfit` e `handleToggleMount` foram refatoradas para verificar se o personagem é o jogador ativo conectado ao WebSocket (`isPrimaryPlayer`).
   - Alts NÃO disparam `gameNetwork.sendChangeOutfit` no socket do Colyseus (o que causava a troca cruzada atribuindo o visual do Cerberus ao Wolfy).
   - O visual de alts é persistido diretamente em seu próprio endpoint `/api/characters/${characterId}/save`, enviando todas as cores (`outfitHead`, `outfitBody`, `outfitLegs`, `outfitFeet`), addons e montaria.
   - O loop de persistência de `ownedAlts` em `saveProgress` passa a enviar a totalidade dos dados visuais e contextuais.

4. **Preservação Automática da Composição do Squad/Party no Re-login:**
   - Implementada persistência dinâmica no `localStorage` sob a chave `cavebound_squad_${leaderId}` para registrar os IDs dos membros que compõem o grupo do líder.
   - Durante o login e hidratação da conta em `handleSelectCharacter`, o jogo restaura automaticamente os alts salvos (ex: Wolfy + Cerberus) para dentro de `game.session.characters` e `partyMemberIds`, mantendo a party montada com os dados atualizados do banco.

---

### 2. Arquivos Modificados & Criados
- `packages/domain/src/combat.ts`: Remoção de acoplamento entre poções e magias/runas (linhas 705, 729, 940, 980, 1070, 1175, 1245, 1465, 1625, 1695, 1755, 1870).
- `packages/auth/src/characterService.ts`: Aceite de `leaderCharacterId` e `lastHuntId`, validação contextual e herança autoritativa de caçada para alts no `XpRateLimiter`.
- `app/api/characters/[id]/save/route.ts`: Sanitização e repasse de `leaderCharacterId` e `lastHuntId`.
- `apps/web/components/GamePrototype.tsx`: Isolamento de outfit de alts, payload completo de alts no `saveProgress`, salvamento e hidratação de squad persistente.
- `tests/phase217-exhaust-and-party-persistence.test.ts`: Suíte de testes com 7 asserções automatizadas cobrindo 100% dos requisitos.
- `FIX.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`: Documentação e tracking de fase.

---

### 3. Validação Automatizada
- `npm run typecheck`: **0 erros de tipagem**.
- `npx vitest run tests/phase217-exhaust-and-party-persistence.test.ts`: **7/7 testes aprovados (100%)**.
- `npx vitest run tests/phase174-party-gold-vault-and-autosave.test.ts tests/phase217-exhaust-and-party-persistence.test.ts`: **13/13 testes aprovados (100%)**.
