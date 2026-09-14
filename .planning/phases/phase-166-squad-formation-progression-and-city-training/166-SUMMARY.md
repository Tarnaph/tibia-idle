# Phase 166: Reestruturação do Squad (Formação Fila Indiana na Cidade, Níveis 70/150/200, 1 Vocação por Slot, Auto-Login Direto e Treino Contínuo no Dummy) - Summary

**Data de Conclusão:** 2026-09-14  
**Status:** Concluído com Sucesso (100% Testes Aprovados, 0 Erros de Typecheck)  
**Branch:** main

---

## 🎯 Objetivos Atingidos

1. **Treino Direto e Contínuo no Dummy (`apps/web/components/GamePrototype.tsx`):**
   - Eliminado o intermediário engessado `distToApproach <= 2` que causava paradas na porta do DP (`32345, 32220, 7`) e exigia um segundo clique manual.
   - O percurso agora é calculado continuamente direto até a vaga ideal (`bestTile`) ao redor do dummy, andando sem interrupções e iniciando o treino com animações e efeitos imediatamente no `onArrive`.

2. **Regras e Novos Níveis de Desbloqueio do Squad (`apps/web/components/GamePrototype.tsx` & `PartyWindow.tsx`):**
   - **Novos Níveis de Desbloqueio:**
     - **Slot 1:** Nível 1
     - **Slot 2:** Nível 70 (anteriormente 10)
     - **Slot 3:** Nível 150 (anteriormente 20)
     - **Slot 4:** Nível 200 (anteriormente 30)
   - **Regra Estrita de 1 Vocação por Slot:** O Squad ativo de até 4 integrantes não permite vocações duplicadas (ex: se já houver um Knight, outro Knight não pode ser adicionado ao Squad).
   - **Banco de Heróis (Até 6 na Conta):** O modal de engrenagem (`PartyWindow.tsx`) lista todos os heróis da conta, indica "Vocação em Uso" quando uma vocação já está no Squad, e oferece criação in-game de novos heróis até o limite de 6.

3. **Auto-Login Direto (Bypass da Tela de Seleção Inicial) (`TibiaAuthCharacterModal.tsx` & `GamePrototype.tsx`):**
   - Ao carregar a página autenticado ou fazer login na conta com pelo menos 1 personagem, entra diretamente no jogo com o personagem principal ativo (`characters[0]`).
   - A tela de seleção com cards de personagens só fica aberta se o usuário clicar explicitamente em **Logout / Trocar Personagem** dentro do jogo (sinalizado via `sessionStorage.setItem('cavebound_manual_logout', 'true')`).
   - Se a conta for nova (0 personagens), o formulário de criação do 1º personagem abre automaticamente e, ao criar, entra imediatamente no jogo.
   - Na tela de seleção, o botão de criar novos personagens é restrito ao primeiro personagem (quando `characters.length === 0`), orientando que novos heróis são criados no Squad in-game.

4. **Formação em Fila Indiana na Cidade de Thais (Snake Follow) (`ThaisCityArena.tsx`):**
   - Adicionada a prop `squadFollowEnabled` e o toggle no cabeçalho da janela de Squad.
   - Implementado o loop de rastreamento em fila indiana determinística no ticker do PixiJS:
     - Membro 1 segue o líder (passo a passo onde o líder estava).
     - Membro 2 segue o Membro 1.
     - Membro 3 segue o Membro 2.
     - Distância estrita de 1 tile mantida entre cada membro da fila.
     - Em caso de teleporte ou mudança de andar, todos os membros do Squad são sincronizados suavemente para a posição do líder.
     - Suporte completo a sprites recoloridos, montarias, addons, frames de caminhada, barras de HP e tooltips individuais ao passar o mouse sobre cada herói da fila.

---

## 🧪 Verificação e Qualidade

- **Testes Unitários:** `tests/phase166-squad-progression-vocation-rules-and-city-follow.test.ts` criado com 10 testes cobrindo progressão, regra de vocações, limites de slots e fila indiana (100% aprovados).
- **Testes de Regressão:** `tests/phase126-character-selection-perf-and-logout-dialog.test.ts`, `tests/phase164-thais-dummies-training-and-city-speed.test.ts`, `tests/phase165-exercise-training-visuals-and-house-dummies.test.ts`, `tests/domain.test.ts` e `tests/hotkeys-combat-system.test.ts` (100% aprovados).
- **TypeScript:** `npm run typecheck` com 0 erros.

---

## 📁 Arquivos Modificados / Criados

- `apps/web/components/GamePrototype.tsx`
- `apps/web/components/window/PartyWindow.tsx`
- `apps/web/components/ThaisCityArena.tsx`
- `apps/web/components/auth/TibiaAuthCharacterModal.tsx`
- `tests/phase166-squad-progression-vocation-rules-and-city-follow.test.ts`
- `.planning/phases/phase-166-squad-formation-progression-and-city-training/166-01-PLAN.md`
- `.planning/phases/phase-166-squad-formation-progression-and-city-training/166-SUMMARY.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `walkthrough.md`
