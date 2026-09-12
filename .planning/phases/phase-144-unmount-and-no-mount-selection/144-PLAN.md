# Plan 144-01: Correção Definitiva de Desativação de Montaria pelo Menu de Montarias e Sincronização de Estado Sem Montaria

## Objetivo
Investigar e corrigir a causa raiz pela qual ao clicar em "Sem Montaria" no menu de montarias (`OutfitModal.tsx`), o personagem ou o jogo apresentava anomalias ("bugou"):
1. A montaria equipada era destruída (`mount: 'none'`), quebrando o atalho `Ctrl+R`, ocultando a opção no menu de contexto e forçando a montaria a virar `'donkey'` ao tentar remontar pelo checkbox.
2. Desincronização de texturas e congelamento visual em `ThaisCityArena.tsx` devido a frames desmontados não estarem no cache e ausência de fallbacks unmounted no `outfitRecolor.ts`.
3. Prevenção de loop de renderização (`Maximum update depth exceeded`) ao estabilizar dependências em `OutfitModal.tsx`.

## Execução Realizada
1. **`apps/web/components/OutfitModal.tsx`**:
   - Adicionado estado `equippedMount` separado de `mountActive`.
   - Card "Sem Montaria" agora define `mountActive = false` e `selectedMount = 'none'`, mantendo a montaria equipada memorizada.
   - Seleção de cards de montaria ativa imediatamente a montaria e memoriza como equipada.
   - Checkbox "Montar" no painel esquerdo restaura a montaria equipada (ou 'donkey') sem perder o histórico do jogador.
   - `handleSave` persiste `mount: effectiveMount` e `mountActive: isMnt`, pré-carregando texturas montadas e a pé simultaneamente.
   - Removida dependência instável de `characters` do efeito de sincronização, prevenindo re-renders em cascata.
2. **`apps/web/components/GamePrototype.tsx`**:
   - `handleToggleMount` (`Ctrl+R`): desmonta e monta sem bloquear o jogador caso `mount` esteja como `'none'` (usando fallback seguro para `'donkey'`), pré-carregando ambos os estados.
   - Inicialização no login: pré-carrega texturas a pé e texturas montadas antecipadamente.
3. **`apps/web/components/CharacterContextMenu.tsx`**:
   - Exibe a opção `🐎 Montar / Desmontar` de forma consistente.
4. **`apps/web/lib/outfitRecolor.ts`**:
   - Implementado fallback em `provisionalCanvasCache` e composição on-the-fly para o estado a pé (`!effectiveMounted`), eliminando retorno nulo e evitando congelamento de sprites.
5. **`apps/web/components/ThaisCityArena.tsx`**:
   - Garantido fallback para frames de traje a pé mesmo quando o canvas sincronizado estiver em resolução.

## Verificação
- `tests/phase144-unmount-and-no-mount-selection.test.ts` (9 testes aprovados).
- `npm run typecheck` (0 erros de tipagem).
- `npm test` (100% de aprovação na suíte completa).
