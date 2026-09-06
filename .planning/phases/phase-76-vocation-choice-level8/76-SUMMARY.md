# Fase 76: Escolha de Vocação no Nível 8+, Remoção na Criação e Item de Troca - Resumo de Entrega

**Status:** Concluída com Sucesso  
**Data:** 06/09/2026  
**Escopo:** Remoção da seleção de vocação na criação de novos personagens (todos iniciam no Nível 1 como `None` / Aprendiz sem vocação), criação do modal autêntico de escolha de vocação ao atingir o Nível 8 ou superior, e disponibilização do item **Pergaminho de Troca de Vocação** (`Change Vocation Scroll`) na Loja por Gold Coins (5.000 GP) e na Loja de Testes (0 GP).

---

## 1. O Que Foi Implementado

1. **Remoção de Vocação na Criação (`PartyMemberModal.tsx` & `TibiaAuthCharacterModal.tsx`):**
   - A escolha de vocação (Knight, Paladin, Sorcerer, Druid) foi completamente removida das telas de criação.
   - Todos os novos personagens criados começam no Nível 1 como `None` (Sem vocação) com atributos base e equipamentos iniciais.

2. **Modal Autêntico de Escolha de Vocação ao Alcançar Nível 8+ (`VocationChoiceModal.tsx`):**
   - Modal em tela inteira disparado automaticamente quando o personagem ativo estiver no Nível 8+ e com vocação `'None'`.
   - Exibe opções detalhadas para **Knight** (Tank · Corpo a Corpo), **Paladin** (Atirador · Distância), **Sorcerer** (Mago · Magia Ofensiva) e **Druid** (Curandeiro · Magia & Cura) com sprites autênticos e descrições.
   - A confirmação define a vocação permanente e concede os atributos, HP/Mana e magias da vocação escolhida.

3. **Pergaminho de Troca de Vocação (ID 9912):**
   - **Loja Normal:** Disponível por 5.000 GP na categoria `consumables`.
   - **Loja de Testes:** Disponível por 0 GP na categoria `testing`.
   - **Efeito:** Ao ser comprado ou usado da Bolsa/Mochila (via duplo-clique ou menu de contexto `✨ Usar`), reverte a vocação do personagem ativo para `'None'`, permitindo escolher uma nova vocação se ele estiver no Nível 8+.

---

## 2. Estrutura do Código Modificado

- **Domínio (`packages/domain/src/` & `packages/content-schema/src/`):**
  - `index.ts`: Adição de `'None'` a `BaseVocationName`.
  - `party.ts`: Suporte a `baseSkills.None`, `starterSpellBooks.None`, `chooseCharacterVocation` e `resetCharacterVocation`.
  - `economy.ts`: Registro de `TEST_SHOP_ITEMS.VOCATION_RESET = 9912` e tratamento de reset de vocação.
  - `characterService.ts`: Registro da vocação `0` (None) com equipamentos e atributos base.
- **Frontend (`apps/web/components/`):**
  - `PartyMemberModal.tsx`: Remoção da seleção de vocação.
  - `VocationChoiceModal.tsx`: Novo componente para seleção de vocação no Nível 8+.
  - `ShopWindow.tsx`: Item 9912 adicionado nas categorias `consumables` (5.000 GP) e `testing` (0 GP).
  - `ItemSprite.tsx`: Mapeamento visual do pergaminho (ID 1949).
  - `GamePrototype.tsx`: Conexão do modal `VocationChoiceModal` e acionamento via `chooseCharacterVocation`.

---

## 3. Verificação de Qualidade

- **TypeScript Typecheck:** `npm run typecheck` executado com **0 erros** (exit code 0).
- **Testes Unitários:** [`tests/phase76-vocation-choice-level8.test.ts`](file:///c:/Users/rapha/Documents/Tibia%202/tests/phase76-vocation-choice-level8.test.ts) com **5/5 testes aprovados** (100% pass):
  1. Criação de personagem Nível 1 sem vocação (`None`).
  2. Bloqueio de escolha de vocação antes do Nível 8.
  3. Escolha permanente de vocação ao atingir Nível 8+.
  4. Redefinição de vocação via `resetCharacterVocation`.
  5. Compra e consumo do Pergaminho de Troca de Vocação (ID 9912).
