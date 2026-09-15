# Phase 174 Summary: Caixa da Party (Party Vault), Persistência de Ouro, Autosave com Acompanhante e Transparência de Poções

## Resumo Executivo
Nesta fase, atendemos com rigor integral a todas as diretrizes do documento `FIX.md` referentes à economia e à persistência de saldo no jogo:
1. **Definição Canônica da Propriedade do Ouro:** Estabelecemos formalmente que o ouro adquirido em caçadas e saques de monstros é propriedade da **Caixa da Party (Party Vault)**. Alinhamos a mensagem de loot (`Loot (Gold): +X gold adicionados à Caixa da Party.`), eliminando a mensagem ambígua anterior de divisão individual.
2. **Titular Único no Banco de Dados (Zero Duplicação):** O titular conectado (`onlineCharacter` / líder da sessão) é o depositário exclusivo do saldo da Caixa da Party no banco de dados (`inventoryPayload` com `{ slot: 'gold', count: session.gold }`). Acompanhantes (`curCharacters.filter(c => c.id !== primaryChar.id)`) **nunca gravam `{ slot: 'gold' }`** em seus inventários nem mochilas compartilhadas, eliminando de forma definitiva a duplicação ou inflação artificial de ouro na conta.
3. **Desbloqueio do Autosave com Acompanhante Selecionado:** Removemos a restrição `curActive.id !== curOnline.id` que abortava silenciosamente a rotina de salvamento periódico e manual sempre que o jogador selecionava um herói alternativo (alt) no `FloatingPartyHUD`. Agora, o salvamento identifica `primaryChar = curOnline`, salvando a Caixa da Party no titular e preservando individualmente nível, experiência, HP, MP, coordenadas e equipamentos próprios de cada acompanhante.
4. **Preservação do Saldo entre Trocas de Login (Herança de Caixa):** Caso o jogador faça login diretamente com um acompanhante cujo inventário pessoal não possua ouro (`loadedGold === 0`), a rotina de inicialização consulta `totalAccountGold`. Havendo saldo da Caixa da Party na conta, ele é herdado integralmente pela sessão (`session.gold = totalAccountGold`), garantindo que a carteira nunca zere ao alternar personagens.
5. **Transparência Absoluta nos Gastos de Auto-Poções:** Quando poções são supridas automaticamente via Caixa da Party (-50 gold), o sistema identifica a operação em múltiplos pontos visuais:
   - Fala flutuante amarela sobre a criatura: `Aaaah... (-50gp)` (em vez de apenas `Aaaah...`).
   - Log detalhado no combate/console: `[Auto-Poção] Nome usou Health Potion (recuperou 150 HP, -50 gold da Caixa da Party).`
   - Atualização imediata do HUD e carteira da sessão.

---

## Detalhes das Modificações

### 1. `packages/domain/src/combat.ts`
- **Drop de Ouro de Monstros:** Em `defeatEnemy` / `rollLoot`, tanto solo quanto em party, a mensagem registrada no log foi padronizada:
  ```typescript
  addLog(state, `Loot (Gold): +${amount} gold adicionados à Caixa da Party.`);
  ```
- **Assinatura de `consumePotionFromInventory`:** Adicionado parâmetro opcional `outDetails?: { fromGold?: boolean; cost?: number }` para informar aos chamadores se o item veio de suprimento automático pago com gold da Caixa da Party.
- **Transparência de Disparo em 4 Pontos:**
  1. `castAutomaticSpells` (IA de combate automática)
  2. Disparo manual de hotbar na cidade de Thais (`triggerManualHotbarActionCity`)
  3. Disparo manual de hotbar durante expedição (`triggerManualHotbarAction`)
  4. Poção de emergência anti-morte (`castEmergencyAutoPotion`)
  - Em todos esses pontos, caso `potionDetails.fromGold === true`, o evento emite `speech: 'Aaaah... (-50gp)'` e o log registra o detalhe `(-50 gold da Caixa da Party)`.
- **Exportação de `defeatEnemy`:** Exportada a função no domínio para permitir verificações determinísticas de eliminação de criaturas e drops nos testes unitários.

### 2. `apps/web/components/GamePrototype.tsx`
- **Hidratação Inicial de Personagens (`/api/characters`):**
  - Implementada a verificação de `totalAccountGold`. Se o personagem que logou estiver com 0 de ouro no inventário pessoal mas a conta possuir saldo de Caixa da Party em outro herói, o jogo herda esse valor para `session.gold`.
- **Desbloqueio do `saveProgress`:**
  - Substituída a condição bloqueante `if (!token || !curActive || !curOnline || curActive.id !== curOnline.id) return;` por `if (!token || !curOnline) return;`.
  - Definido `primaryChar = curCharacters.find((c) => c.id === curOnline.id) || curActive;`.
  - O titular conectado (`primaryChar`) grava a Caixa da Party (`slot: 'gold'`), a bolsa (`curBag`) e o loot (`curLoot`).
  - O loop de acompanhantes (`curCharacters.filter(c => c.id !== primaryChar.id)`) salva o progresso de cada alt com inventário contendo apenas equipamentos pessoais (`slot !== 'gold'`), sem duplicar ouro nem bolsas compartilhadas.

---

## Verificação e Cobertura de Testes

Criada a suíte `tests/phase174-party-gold-vault-and-autosave.test.ts` com 6 testes cobrindo o fluxo de aceitação integral:
1. **Loot Solo:** Drop de ouro registrado diretamente na Caixa da Party (`Loot (Gold): +X gold adicionados à Caixa da Party.`).
2. **Loot em Party:** Drop compartilhado atribuído à Caixa da Party sem a mensagem incorreta de divisão individual.
3. **Consumo de Auto-Poção:** Verificação de que `consumePotionFromInventory` deduz 50 gold da Caixa da Party e sinaliza `fromGold = true` e `cost = 50`.
4. **Fala e Log de Auto-Poção:** Verificação de que `castAutomaticSpells` emite o evento com speech `Aaaah... (-50gp)` e registra no log o desconto.
5. **Autosave com Acompanhante Selecionado e Titular Único:**
   - Saldo inicial conhecido (1,000 gp) -> Ganho de loot (+200 gp -> 1,200 gp) -> Consumo de auto-poção (-50 gp -> 1,150 gp).
   - Troca do personagem ativo para o acompanhante (`activeCharacter.id !== onlineCharacter.id`).
   - Simulação da rotina de salvamento: titular recebe a Caixa da Party (1,150 gp) e o acompanhante recebe 0 linhas de ouro.
   - Total de ouro somado no banco = exatamente 1,150 gp (zero duplicação, zero perda).
6. **Herança de Saldo no Login com Alt:** Login direto selecionando o alt com 0 gp no inventário pessoal recupera 1,150 gp da conta para a Caixa da Party.

### Resultados dos Testes Automatizados:
- `tests/phase174-party-gold-vault-and-autosave.test.ts`: **6/6 testes aprovados (100%)**
- `tests/phase173-party-persistence-and-fix-md.test.ts`: **7/7 testes aprovados (100%)**
- `tests/party-economy-camera.test.ts`: **12/12 testes aprovados (100%)**
