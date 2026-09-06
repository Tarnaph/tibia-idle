# Fase 75: Itens de Teste na Loja por 0 Gold - Resumo de Entrega

**Status:** Concluída com Sucesso  
**Data:** 06/09/2026  
**Escopo:** Adição de consumíveis de depuração/teste gratuitos (0 GP) na Loja da Cidade (`ShopWindow`) para evolução imediata de nível, todas as 8 perícias (skills) e obtenção de 10.000 GP, viabilizando testes rápidos de balanceamento e progressão.

---

## 1. Itens Adicionados à Loja (0 Gold)

| ID | Nome do Item | Categoria | Preço | Efeito Imediato / Ao Usar |
|---|---|---|---|---|
| **9900** | Saco de Ouro (10.000 GP) | `testing` | **0 GP** | Adiciona +10.000 gold à carteira do jogador imediatamente |
| **9901** | Tomo do Conhecimento (+1 Nível) | `testing` | **0 GP** | +1 Nível ao personagem ativo, recalcula XP pela fórmula canônica do Tibia (`experienceForLevel`) e adiciona HP/Mana de acordo com a vocação (Knight: +15 HP, +5 Mana; Paladin: +10 HP, +15 Mana; Sorcerer/Druid: +5 HP, +30 Mana) |
| **9902** | Pergaminho de Espada (+1 Sword) | `testing` | **0 GP** | +1 Perícia de Sword Fighting e reseta tries para 0 |
| **9903** | Pergaminho de Machado (+1 Axe) | `testing` | **0 GP** | +1 Perícia de Axe Fighting e reseta tries para 0 |
| **9904** | Pergaminho de Clava (+1 Club) | `testing` | **0 GP** | +1 Perícia de Club Fighting e reseta tries para 0 |
| **9905** | Pergaminho de Distância (+1 Distance) | `testing` | **0 GP** | +1 Perícia de Distance Fighting e reseta tries para 0 |
| **9906** | Pergaminho de Escudo (+1 Shielding) | `testing` | **0 GP** | +1 Perícia de Shielding e reseta tries para 0 |
| **9907** | Tomo Arcano (+1 Magic Level) | `testing` | **0 GP** | +1 Nível Mágico (Magic Level) e reseta tries para 0 |
| **9908** | Faixa de Luta (+1 Fist) | `testing` | **0 GP** | +1 Perícia de Fist Fighting e reseta tries para 0 |
| **9909** | Isca Mágica (+1 Fishing) | `testing` | **0 GP** | +1 Perícia de Fishing e reseta tries para 0 |

---

## 2. Modificações Técnicas Realizadas

1. **Domínio (`packages/domain/src/economy.ts` & `types.ts`):**
   - Constante canônica `TEST_SHOP_ITEMS` mapeando IDs 9900 a 9909.
   - `isTestShopItem(itemId: number)` para detecção de itens de depuração.
   - `applyCharacterLevelAdvance(character, levels, content)`: progressão precisa de nível, recalibração de HP/Mana por vocação.
   - `applyCharacterSkillAdvance(character, skill, points)`: incremento de perícia e reset de tries.
   - `applyTestItemEffect(state, itemId, quantity, content, targetCharId)`: aplicação de efeitos no estado global do jogo.
   - `buyShopItem`: permissão para compra com 0 gold mesmo quando o saldo do jogador é 0 (`totalPrice > 0 && gold < totalPrice`).
   - `useTestConsumable(state, itemId, content, characterId)`: consumo direto a partir da Bolsa ou Mochila.

2. **Frontend e Interface (`apps/web/components/`):**
   - `ShopWindow.tsx`:
     - Nova categoria `testing` com aba dedicada: `⭐ Testes (0 GP)`.
     - Badge verde `🎁 GRÁTIS (0 GP)` em itens de custo zero.
     - Botão adaptativo `Obter (0 GP)` habilitado mesmo para jogadores com saldo zerado.
   - `ItemSprite.tsx`:
     - Mapeamento visual dedicado `TEST_ITEM_SPRITE_MAP` apontando para sprites reais extraídos do cliente Tibia (moedas de ouro, tomos/runas, armas/escudos, poções e varinhas).
   - `InventoryWindow.tsx` & `ItemContextMenu.tsx`:
     - Suporte a consumo de itens de teste diretamente na Bolsa/Mochila via duplo-clique.
     - Botão `✨ Usar` no menu de contexto do botão direito para itens de teste.
   - `GamePrototype.tsx`:
     - Integração de `useTestConsumable` disparado pelo inventário, atualizando as mensagens de status e HUD do jogador.

---

## 3. Verificação de Qualidade

- **TypeScript Typecheck:** `npm run typecheck` executado com **0 erros** (código de saída 0).
- **Testes Unitários:** `tests/phase75-testing-shop-items.test.ts` com **5/5 testes aprovados** (100% pass):
  1. Identificação correta via `isTestShopItem`.
  2. Compra de Saco de Ouro (9900) por 0 GP com saldo zerado adicionando 10.000 GP.
  3. Compra de Tomo do Conhecimento (9901) avançando nível, experiência e atributos da vocação.
  4. Compra e avanço individual de todas as 8 perícias (9902 a 9909).
  5. Consumo direto de itens a partir da Bolsa com decremento de pilha e aplicação dos efeitos.
