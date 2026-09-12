# Phase 144 Summary: Correção Definitiva de Desativação de Montaria pelo Menu de Montarias e Sincronização de Estado Sem Montaria

## Visão Geral

Nesta fase foi investigada e solucionada a causa raiz do bug reportado pelo usuário ao selecionar a opção **"Sem Montaria"** no menu de montarias do jogo.

### Causas Raízes Identificadas
1. **Destruição da Montaria Equipada**:
   - Ao clicar no card "Sem Montaria" (`mount.id === 'none'`), `selectedMount` era sobrescrito para `'none'`, e o `handleSave` persistia `{ mount: 'none', mountActive: false }`.
   - Isso apagava permanentemente a montaria selecionada do jogador (Donkey, Widow Queen, etc.).
   - Em decorrência disso:
     - O atalho de teclado `Ctrl+R` (`handleToggleMount`) falhava com mensagem impeditiva: *"Você não tem uma montaria selecionada..."*.
     - O botão de clique com o botão direito do mouse no personagem (`🐎 Montar / Desmontar`) desaparecia por completo.
     - Ao abrir o menu de outfits e tentar ligar a montaria pelo checkbox, a montaria anterior era substituída forçadamente por `'donkey'`.
2. **Desincronização e Congelamento de Sprites no Pixi Arena (`ThaisCityArena.tsx` / `outfitRecolor.ts`)**:
   - No login, apenas a pose montada era pré-carregada. Quando o jogador desmontava, os frames a pé não estavam em memória.
   - O `getRecoloredCanvasSync` retornava `null` porque o branch unmounted não consultava `provisionalCanvasCache` e não tinha fallbacks imediatos.
   - Com retorno nulo, o `ThaisCityArena` deixava de atualizar `view.sprite.texture`, fazendo com que o sprite continuasse na pose montada enquanto a velocidade diminuía para a velocidade a pé, gerando sensação de bug/travamento.
3. **Loop de Renderização em `OutfitModal.tsx`**:
   - A dependência de `characters` dentro de `useEffect` com `setState` criava riscos de loops em cascata (`Maximum update depth exceeded`) durante atualizações contínuas de estado do jogo.

---

## Soluções Implementadas

### 1. Desacoplamento de Montaria Equipada e Estado Ativo (`OutfitModal.tsx`)
- Implementado o estado `equippedMount` separado de `mountActive`.
- Ao clicar em "Sem Montaria", `mountActive` é definido como `false` e `selectedMount` como `'none'`, mas a montaria equipada do jogador é preservada intacta na memória do personagem.
- Ao clicar em qualquer card de montaria, `equippedMount` e `selectedMount` são atualizados e `mountActive` é ligado.
- O card "Sem Montaria" é destacado visualmente com a classe `.active` sempre que o jogador estiver a pé (`!mountActive || selectedMount === 'none'`).
- O checkbox "Montaria" no painel lateral esquerdo exibe o status claro (ex.: `Montaria (Desativada - Widow Queen)`) e, ao ser marcado, restaura a montaria equipada do jogador sem regredir para 'donkey'.
- `handleSave` persiste `mount: effectiveMount` (preservando a montaria equipada) e `mountActive: isMnt`, pré-carregando ambos os estados no cliente.
- Estabilizadas as dependências do `useEffect` de inicialização para prevenir loops de renderização.

### 2. Resiliência do Atalho `Ctrl+R` e Login (`GamePrototype.tsx`)
- No hook `handleToggleMount`, se o personagem estiver sem montaria definida, adota fallback resiliente para `'donkey'` e permite montar imediatamente sem travar o jogador.
- No `useEffect` de login do personagem, tanto as texturas a pé (`isMounted: false`) quanto as montadas (`isMounted: true`) são pré-carregadas durante a tela de loading de 10 segundos, tornando a transição montado/desmontado 100% instantânea (0ms).

### 3. Menu de Contexto do Personagem (`CharacterContextMenu.tsx`)
- O botão `🐎 Montar / Desmontar` é exibido sempre que a ação estiver disponível, permitindo ao jogador alternar a montaria livremente pelo menu do botão direito.

### 4. Blindagem de Texturas Unmounted (`outfitRecolor.ts` & `ThaisCityArena.tsx`)
- Adicionadas verificações em `provisionalCanvasCache` e geração on-the-fly de canvas provisório quando base e máscara estiverem disponíveis, garantindo que o `getRecoloredCanvasSync` nunca retorne `null` para trajes a pé.
- No `ThaisCityArena.tsx`, o fallback para sprites de trajes unmounted é acionado mesmo se o jogador possuir cores personalizadas.

---

## Resultados e Validação

- **Testes Unitários Dedicados**: Criado `tests/phase144-unmount-and-no-mount-selection.test.ts` com 9 testes cobrindo catálogo, preservação de estado, toggle mount e chaves de cache (100% de aprovação).
- **TypeScript Typecheck**: Executado `npm run typecheck` com **0 erros** de tipagem.
- **Suíte Completa Vitest**: 146 test suites e 874 testes aprovados com 100% de sucesso.
