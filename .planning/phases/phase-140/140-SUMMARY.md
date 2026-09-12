# Phase 140 Summary: Isolamento Arquitetural e Blindagem Modular de Outfits, Montarias e Cyclopedia

## 📌 Diagnóstico da Causa Raiz: Por que a edição de outras partes do jogo quebrava Outfits, Montarias e Cyclopedia?

A investigação técnica detalhada identificou 4 pontos críticos de fragilidade estrutural que provocavam regressões recorrentes:

1. **Monolito de Estado e Prop-Drilling em Camadas (`GamePrototype.tsx` com 3.200+ linhas):**
   * Os modais de tela cheia (`OutfitModal`, `CyclopediaModal`, `CharacterProfileModal`) eram controlados por dezenas de `useState` e callbacks instanciados diretamente no centro do loop do jogo em `GamePrototype.tsx`.
   * Sempre que uma tarefa modificava a barra de dock superior, chat, inspeção ou atalhos (ex: fases 136, 137, 138), desenvolvedores ou assistentes precisavam alterar os mesmos arquivos gigantescos. Qualquer pequeno ajuste nos parâmetros de props (`onOpenProfile`, `onOpenOutfit`, `onOpenSkills`, `onOpenCyclopedia`) causava inversão de prioridade de clique (ex: avatar chamando outfit em vez de perfil) ou desconexão total de botões.

2. **Ausência de um Gerenciador de Modais Global (`GameModalContext`):**
   * As janelas móveis clássicas possuíam o `WindowManagerContext`, mas os modais em tela cheia não possuíam nenhum hub centralizado.
   * Modais dependiam de cadeias de callbacks repassadas manualmente através de múltiplos componentes pais e filhos. Qualquer componente intermediário que esquecesse de repassar ou renomeasse uma prop quebrava a abertura do modal.

3. **Bifurcação de Estado na Determinação de Montaria (Dual-State Desync):**
   * O sistema mantinha duas fontes de verdade concorrentes: `mount: string` (ex: `'donkey'`) e `mountActive: boolean`.
   * Diferentes partes do código avaliavam montaria de formas incompatíveis: uma verificava apenas `mount !== 'none'`, outra apenas `mountActive`, e outra forçava `selectedMount = 'donkey'` ao abrir a tela. Isso gerava discrepâncias onde o card visual parecia montado enquanto o canvas renderizava a pé, ou quebrava ao selecionar trajes sem sprites de montaria (como *Sire*).

4. **Ausência de Camada de Serviços Pura (SSOT) para Aparência e Cyclopedia:**
   * Regras de capacidade de montaria, cálculo de frames de caminhada e busca de catálogos estavam espalhadas entre componentes React (`OutfitModal.tsx`, `ThaisCityArena.tsx`, `GamePrototype.tsx`), provocando comportamentos divergentes a cada edição.

---

## 🛠️ Solução Arquitetural Implementada (Isolamento e Desacoplamento)

### 1. `apps/web/contexts/GameModalContext.tsx`
* Criação de um Contexto React e hook global `useGameModal()` para modais do jogo.
* Oferece métodos canônicos sem necessidade de prop-drilling:
  * `openOutfit(characterId?)` / `closeOutfit()`
  * `openCyclopedia(initialTab?)` / `closeCyclopedia()`
  * `openProfile(characterId?)` / `closeProfile()`
  * `openSkills()` / `openShop()` / `openLogout()`
* Qualquer botão ou menu em qualquer lugar do jogo (DockBar, RightSidebar, menus de contexto, hotkeys `U`/`Ctrl+U`) pode acionar o modal correto diretamente, sem depender de callbacks repassados pelo `GamePrototype`.

### 2. `apps/web/components/modals/GameModalHost.tsx`
* Hospedeiro desacoplado responsável por orquestrar a renderização de `OutfitModal`, `CyclopediaModal` e `CharacterProfileModal`.
* Removeu centenas de linhas de JSX de modais de dentro do `GamePrototypeContent`. Edições futuras na lógica do jogo ou HUD não tocam mais na estrutura dos modais.

### 3. `apps/web/lib/appearanceService.ts`
* Single Source of Truth (SSOT) para todas as regras de aparência e montaria:
  * `isCharacterMounted(char)`: Cálculo determinístico e seguro (requer `mountActive === true`, `mount !== 'none'` e traje com `hasMountRider === true`).
  * `canOutfitHaveMount(outfitId)`: Trajes como *Sire* retornam estritamente `false`.
  * `getSafeWalkFrame(outfitId, frame)`: Clamping seguro para trajes de 3 frames (1..2) e 9 frames (1..8).
  * `formatMountStatusLabel(outfitId, mountName, isMounted)`: Mensagens claras de status.

### 4. `apps/web/lib/cyclopediaService.ts`
* Serviço de domínio desacoplado para consulta e cache da Cyclopedia:
  * Acesso em memória aos 1.167 itens e 968 monstros.
  * Busca por ID ou nome e cálculo autêntico de tiers e progresso do Bestiário.

### 5. Blindagem em `WindowDockBar.tsx` e `GamePrototype.tsx`
* O `WindowDockBar` agora possui fallback transparente para `useGameModal()`.
* O `GamePrototype` é envolvido pelo `<GameModalProvider>`, delegando a renderização para `<GameModalHost />`.

---

## 🧪 Verificação e Testes
* **TypeScript Check:** `npm run typecheck` → **0 erros**.
* **Suíte Dedicada da Fase 140:** `tests/phase140-modal-isolation-and-decoupling.test.ts` → **12 testes aprovados (100%)**.
* **Suíte da Fase 139:** `tests/phase139-avatar-profile-outfit-mount-cyclopedia.test.ts` → **9 testes aprovados (100%)**.
* **Suíte da Fase 138:** `tests/phase138-outfit-walking-bestiary-persistence.test.ts` → **8 testes aprovados (100%)**.
* **Total Verificado:** 29 testes cobrindo isolamento, compatibilidade e integridade de estado.
