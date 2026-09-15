# Phase 173 Summary: Resolução Completa do FIX.md (Deduplicação de Magias, Persistência de Alts, Auto-Leveling no Dummy e Floating Party HUD)

## Status: Complete
**Data:** 2026-09-14

---

## 1. Visão Geral e Entregas

Nesta fase foram implementadas todas as correções e melhorias estruturais documentadas em `FIX.md`:

1. **Deduplicação de Magias em Área e Eventos Visuais:**
   - **Combate em Área (Spells & Runes):** Nos 4 loops de área do domínio (`combat.ts` — magias manuais, magias automáticas, runas manuais e runas automáticas), a propriedade `speech` é emitida estritamente no primeiro alvo atingido (`isFirstTarget ? speech : undefined`). Todos os alvos recebem o dano, eventos visuais e reduções de HP normalmente, eliminando a sobreposição de falas no topo do conjurador.
   - **Deduplicação de Visual Events na Cidade (`ThaisCityArena.tsx`):** Implementada chave estável de identificação de eventos (`getStableEventId(ev)`) associada a um `Set<string>` de IDs já processados. Mesmo com múltiplos re-renders do componente React pai, eventos já exibidos não são re-disparados.

2. **Persistência de Alts da Party & Deserialização de Skills:**
   - **Persistência Individual de Alts (`GamePrototype.tsx`):** A função de persistência periódica (`saveProgress`) agora itera sobre cada alt pertencente à conta presente na party, salvando individualmente via POST em `/api/characters/${alt.id}/save` com seu nível, experiência, HP, MP e skills individuais.
   - **Controle de Concorrência Otimista (`saveVersion`):** Cada alt possui seu próprio rastreador de versão (`characterSaveVersionsRef`), garantindo integridade transacional sem sobreescrever dados de outros personagens e sem duplicar ouro ou itens compartilhados.
   - **Deserialização Canônica de Skills (`characterHydration.ts`):** Criada função auxiliar `resolveSkillKey` e rotina `hydrateDbCharacter` que mapeia confiavelmente as linhas relacionais de skills retornadas pelo Prisma (`skillId` e `skillName`) para os objetos de domínio `CharacterSkills` e `CharacterSkillTries`.

3. **Treino de Skill: Animação e Auto-Leveling Contínuo:**
   - **Postura Corporal no Dummy:** Durante o ataque aos dummies em `ThaisCityArena.tsx`, o frame do personagem permanece fixo em repouso (`charWalkFrame = 0`) quando parado, com micro-avanço de ataque (nudge), eliminando a ilusão de estar correndo parado.
   - **Level Up Imediato e Contínuo (`packages/domain/src/training.ts`):** Na função `calculateTrainingTimeEstimate`, caso as tentativas acumuladas atinjam a meta da fórmula (`currentTries >= requiredTries`), a skill avança de nível imediatamente através de `addTrainingTries(character, skill, 0, vocation)`. Quando o tempo restante é menor ou igual a zero, a formatação exibe `< 1s` em vez de travar em "Pronto para upar!", permitindo treino ininterrupto.

4. **HUD Flutuante de Organização da Party (`FloatingPartyHUD.tsx`):**
   - **Painel Flutuante e Arrastável:** Exibido automaticamente sempre que a party contiver mais de 1 membro. Possui persistência de coordenadas em `localStorage`.
   - **Cards de Integrantes:** Exibe cada integrante com Nome, Vocação, barra de Vida (HP), barra de Mana (MP), Estamina e barra de progresso de Experiência (XP).
   - **Troca Ativa de Personagem:** Um duplo clique em qualquer card seleciona instantaneamente aquele personagem como o ativo na visualização (`selectPartyCharacter`), centralizando a câmera e o controle sobre ele.

---

## 2. Arquivos Modificados e Criados

- `packages/domain/src/types.ts`:
  - Adicionado campo opcional `id?: string` em `GameCombatEvent` e `CombatVisualEvent`.
- `packages/domain/src/combat.ts`:
  - Deduplicação de `speech` nos loops de magias de área e runas de área.
- `packages/domain/src/training.ts`:
  - Auto-leveling imediato e contínuo em `calculateTrainingTimeEstimate` e formatação `< 1s`.
- `apps/web/lib/characterHydration.ts`:
  - Mapeamento bidirecional de IDs de skill numéricos e textuais para chaves canônicas de domínio.
- `apps/web/components/party/FloatingPartyHUD.tsx`:
  - Componente de HUD flutuante arrastável com barras de status e seleção de personagem ativo via duplo clique.
- `apps/web/components/ThaisCityArena.tsx`:
  - Deduplicação estável de eventos visuais com `getStableEventId`.
  - Fixação de `charWalkFrame = 0` no golpe do dummy.
- `apps/web/components/GamePrototype.tsx`:
  - Loop de autosave de alts com rastreamento individual de `saveVersion`.
  - Deserialização de skills via `hydrateDbCharacter`.
  - Memoização de `combinedCityVisualEvents`.
  - Renderização do `FloatingPartyHUD`.
- `tests/phase173-party-persistence-and-fix-md.test.ts`:
  - Suíte de 7 testes automatizados cobrindo os 4 tópicos do FIX.md.

---

## 3. Validação

- **Vitest:**
  - `tests/phase173-party-persistence-and-fix-md.test.ts`: 7/7 aprovados (100%).
- **TypeScript Typecheck (`tsc`):**
  - Concluído com **0 erros** (Exit code 0).
