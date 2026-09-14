# Phase 175 Summary: Resolução Completa do FIX.md (Persistência Diferencial de Alts, Otimização de Entrada, Ciclo de Áudio do Bardo e Hotbar Canônica)

## 📌 Visão Geral da Entrega

A Phase 175 atendeu e solucionou com fidelidade os 5 tópicos estruturais detalhados no arquivo `FIX.md`:
1. **Persistência de Solo e Party**: Proteção integral de mochilas, consumíveis e itens prévios de acompanhantes no banco de dados via salvamento diferencial (`replaceFullInventory: false`); eliminação de cópia/soma de ouro entre personagens no login; reconciliação atômica de atributos no HTTP 409 de alts; conexão do contador de moedas da barra superior (`WindowDockBar`) ao saldo real de Tibia Coins da conta; e notificação visual proativa em caso de falhas de persistência.
2. **Lentidão no carregamento e na entrada**: Otimização do arquivo de vídeo de 134 MB (`songtibia.webm`) de `preload="auto"` para `preload="metadata"`, liberando as conexões HTTP paralelas do navegador; sincronização imediata de cookies de autenticação na Landing Page para transição instantânea via "JOGAR AGORA"; e aumento de concorrência e redução de timeouts no `assetPreloader`.
3. **Música da seleção sobreposta**: Limpeza rigorosa e desacoplamento do elemento de vídeo e de todos os listeners de interação (`mousemove`, `mousedown`, `click`, etc.) do `BardChromaVideo` no unmount, ao entrar no jogo (`startFadeOutAndEnter`), ao deslogar ou ao retornar à home page, garantindo que o tema de Thais assuma sem qualquer ruído ou reprodução residual.
4. **Slot da health potion não permanece vazio**: O método de domínio `ensureHealthPotionInHotbar` agora respeita slots limpos pelo jogador (não força mais a inserção quando a hotbar já foi configurada) e as chamadas de emergência em combate utilizam a melhor poção disponível sem mutar a hotbar do usuário.
5. **Mostrar custo de runas e poções na janela "Configurar ação"**: Exibição em badges e banner informativo do custo por uso unitário e aviso explícito de débito da Caixa da Party quando não houver suprimento no inventário pessoal.

---

## 🛠️ Alterações por Componente

### 1. Domínio (`packages/domain`)
- **`hotbarActions.ts`**:
  - Criada a tabela canônica `ACTION_SUPPLY_COSTS` com valores fiéis de poções e runas canônicas.
  - Implementada função `getActionSupplyCost(actionId: number): number`.
  - Atualizado `ensureHealthPotionInHotbar`: quando `character.hotbar.length > 0`, respeita slots limpos e não reinsere forçadamente poções.
- **`combat.ts`**:
  - Em `consumePotionFromInventory`: alterado custo fixo para `getActionSupplyCost(potionId)`.
  - Removida chamada forçada de `ensureHealthPotionInHotbar` no loop de `castAutomaticSpells`.
  - Em `triggerEmergencyAutoPotion`: utiliza diretamente `getBestHealthPotionForCharacter(character)` sem mutar os slots da hotbar.

### 2. Backend & Persistência (`packages/auth` & `app/api`)
- **`characterService.ts`**:
  - Adicionada opção `replaceFullInventory?: boolean` ao `saveCharacterProgress`.
  - Quando `replaceFullInventory === false` (utilizado para os alts da party), realiza exclusão seletiva no Prisma (`deleteMany({ where: { characterId, slot: { in: incomingSlots } } })`), preservando intactos todos os consumíveis, mochilas e itens de inventário do alt.
- **`app/api/characters/[id]/save/route.ts`**:
  - Repassa o parâmetro booleano `replaceFullInventory` no payload JSON.

### 3. Frontend & Telas (`apps/web`)
- **`TibiaAuthCharacterModal.tsx`**:
  - Em `BardChromaVideo`: mudado `preload` para `"metadata"`, implementado cancelamento atômico de listeners de interação e parada total com `video.pause()`, `currentTime = 0`, `video.removeAttribute('src')` e `video.load()` no unmount, logout, retorno à home e entrada no jogo.
- **`LandingPage.tsx`**:
  - No mount da página, sincroniza `colyseus_token` do `localStorage` para cookies do navegador.
  - Na função `play()`, detecta tokens locais salvos e direciona imediatamente para `/game` sem bloquear o jogador.
- **`assetPreloader.ts`**:
  - Reduzido o timeout de pré-carregamento por imagem para 1000ms e safety timer para 3500ms.
  - Aumentada a concorrência paralela para 12 conexões simultâneas.
- **`HotbarConfigModal.tsx`**:
  - Badges de poções e runas exibem o custo por uso em GP.
  - Banner informativo: `📦 Consome 1 unidade do inventário. Sem estoque: X gold da Caixa da Party por uso.`
- **`WindowDockBar.tsx`**:
  - Adicionada prop `coins?: number` exibindo o saldo real de moedas da conta formatado (`.toLocaleString('pt-BR')`).
- **`GamePrototype.tsx`**:
  - Banner de alerta visual de persistência caso ocorra falha persistente ao salvar.
  - Titular salva com `replaceFullInventory: true`; alts salvam com `replaceFullInventory: false`.
  - Reconciliação atômica de atributos e skills no HTTP 409 de alts.
  - Removida a cópia/soma indevida de gold entre personagens no login.
  - Conectado `coins` da conta à `WindowDockBar`.

---

## 🧪 Verificação & Testes

- **Testes Automatizados (Vitest)**:
  - Criado `tests/phase175-fix-md-deep-persistence-and-polish.test.ts` com 6 testes unitários cobrindo custos canônicos, preservação de hotbars limpas, persistência diferencial e detecção de conflitos de versão.
  - Execução: `100% de aprovação (6/6 testes passaram)`.
  - Suíte de regressão (`phase173` e `phase174`): `100% de aprovação (13/13 testes passaram)`.
- **Verificação de Tipagem (TypeScript)**:
  - `npm run typecheck`: **0 erros de tipagem**.
- **Servidores Operacionais**:
  - Vite dev server ativo e respondendo na porta 3000.
