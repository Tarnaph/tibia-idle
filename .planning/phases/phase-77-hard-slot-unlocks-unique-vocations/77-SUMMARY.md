# Fase 77: Progressão Difícil de Desbloqueio de Slots de Personagem e Restrição de Vocações Únicas por Conta - Resumo de Entrega

**Status:** Concluída com Sucesso  
**Data:** 06/09/2026  
**Escopo:** Implementação da progressão de nível exigente para liberação dos 4 slots de personagens por conta (Slot 1 no Lv 1, Slot 2 no Lv 50, Slot 3 no Lv 100 e Slot 4 no Lv 150) e da regra estrita de vocações únicas por conta (máximo de 1 Knight, 1 Paladin, 1 Sorcerer e 1 Druid por conta, sem duplicatas).

---

## 1. O Que Foi Implementado

1. **Progressão Difícil para Desbloqueio dos 4 Slots (`PartyWindow.tsx`, `GamePrototype.tsx` & `party.ts`):**
   - **Slot 1:** Liberado no Nível 1.
   - **Slot 2:** Exige Nível 50 ou superior em ao menos um personagem da conta.
   - **Slot 3:** Exige Nível 100 ou superior em ao menos um personagem da conta.
   - **Slot 4:** Exige Nível 150 ou superior em ao menos um personagem da conta.
   - **Indicadores Visuais:** Rótulos e botões travados com ícone de cadeado (`🔒 Requer Nível X para desbloquear`).
   - **Bypass de Permissões:** Contas com papel `ADMIN` ou `GM` mantêm acesso liberado a todos os slots.

2. **Restrição Estrita de Vocações Únicas por Conta (Sem Duplicatas):**
   - Função `getTakenAccountVocations(characters)` identifica todas as vocações ativas da conta.
   - Em `chooseCharacterVocation`, se o jogador tentar escolher uma vocação que outro personagem da mesma conta já possui, a tentativa é rejeitada com mensagem de erro clara.
   - No modal `VocationChoiceModal.tsx`, as vocações já em uso pela mesma conta são exibidas com estilo desabilitado, opacidade reduzida e a tag `🔒 Já em uso na conta`.
   - Ao utilizar o **Pergaminho de Troca de Vocação** (ID 9912), a vocação antiga é liberada e o personagem só pode trocar por vocações que estejam vagas na conta.
   - Uma conta completa com 4 personagens terá rigorosamente 1 Knight, 1 Paladin, 1 Sorcerer e 1 Druid.

---

## 2. Estrutura do Código Modificado

- **Domínio (`packages/domain/src/party.ts`):**
  - Adicionada a função `getTakenAccountVocations`.
  - Atualizada a função `chooseCharacterVocation` para validar duplicação de vocação na mesma conta.
- **Frontend (`apps/web/components/`):**
  - `window/PartyWindow.tsx`: Atualizada a verificação de unlocked slots para os limiares 50, 100 e 150.
  - `GamePrototype.tsx`: Atualizados os bloqueios de adição de novos membros no squad para Nível 50, 100 e 150, e repasse de `takenVocations` ao `VocationChoiceModal`.
  - `VocationChoiceModal.tsx`: Suporte a `takenVocations` e marcação visual `🔒 Já em uso na conta`.
- **Testes (`tests/phase77-slot-progression-unique-vocations.test.ts`):**
  - 4/4 testes unitários cobrindo identificação de vocações ativas, rejeição de vocações duplicadas, formação de 4 vocações únicas por conta e liberação via reset.

---

## 3. Verificação de Qualidade

- **TypeScript Typecheck:** `npm run typecheck` executado com **0 erros** (exit code 0).
- **Testes Unitários:** `tests/phase77-slot-progression-unique-vocations.test.ts` com **4/4 testes aprovados** (100% pass).
