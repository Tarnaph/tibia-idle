# Phase 105 Summary: Exibição da Caixa de Notificação de Música ("Thais Theme") Estritamente Após a Tela de Carregamento (Loading)

## Visão Geral
Atendimento à solicitação direta do usuário: *"a box da musica deve aparecer só depois do loading"*.
A notificação "Now Playing" com o tema de Thais (*"Thais Theme"*) foi desacoplada do início antecipado da reprodução da música de fundo (que já começa a tocar durante o loading para ambientar o jogador) e agora só surge deslizando da direita estritamente depois que a tela de carregamento de 10 segundos é concluída e desmontada do DOM.

---

## O que foi implementado

1. **Parametrização e Enfileiramento em `MusicTrackToast.tsx`:**
   - Adicionada a prop `isLoading?: boolean` à interface `MusicTrackToastProps`.
   - Enquanto `isLoading === true`, o componente retorna estritamente `null` (não renderiza, não pré-anima e não aparece em tela).
   - Se uma notificação de música (`onTrackNotification`) for recebida enquanto `isLoading === true` (como o início do BGM no login ou na saída da caçada), ela é guardada em `queuedTrackRef.current`.
   - Quando `isLoading` transiciona de `true` para `false` (detecção via `prevLoadingRef.current && !isLoading`), o componente aguarda 350ms (para o cenário de Thais aparecer limpo para o jogador) e inicia a animação de entrada deslizante da direita (`music-toast-slide-in`).

2. **Integração em `GamePrototype.tsx`:**
   - `<MusicTrackToast isLoading={initialLoadingActive || Boolean(transitionLoading?.active)} />`.
   - No evento `onFinish` da `ExuraLoadingScreen`, adicionado o disparo explícito `triggerTrackNotification(THAIS_THEME_TRACK)` quando `mode === 'training'`, assegurando que a notificação apareça com perfeição após a conclusão de qualquer transição.
   - Prevenção de duplicação: caso a mesma trilha já esteja ativa e visível, o componente descarta reinícios redundantes.

3. **Validação e Testes:**
   - Criado `tests/phase105-music-toast-after-loading.test.ts` validando todas as garantias contratuais de enfileiramento e supressão visual durante o loading.
   - Atualizados `tests/phase104-music-track-toast.test.ts` e `tests/phase103-thais-city-audio-and-volume-controls.test.ts`.

---

## Métricas de Qualidade
- **TypeScript Typecheck:** 0 erros com `tsc --noEmit`.
- **Vitest:** 18 testes aprovados em 3 arquivos de teste relacionados (`phase103`, `phase104`, `phase105`).
- **Dev Servers:** Servidores Next/Vinext e Colyseus continuam rodando estavelmente em segundo plano.
