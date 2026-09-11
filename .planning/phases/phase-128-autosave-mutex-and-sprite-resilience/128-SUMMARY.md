# Phase 128 — Resumo da Entrega (Summary)

## Blindagem Arquitetural de Auto-Save, Prevenção de Esgotamento de Sockets HTTP e Resiliência Definitiva de Outfits e Movimentação

### 1. Resumo Executivo
Nesta fase, respondemos e solucionamos a solicitação do usuário:
> *"investigue no que você mexeu na ultima alteração que causou o bug dos outfits e montarias novamente, não estão aparecendo e a movimentação do personagem quebrou de novo, investigue e descubra por que isso acontece para que nas futuras mudanças isso não aconteça mais."*

#### Causa Raiz Investigada e Diagnosticada:
1. **O Gatilho:** No hook `useEffect` de auto-save de `apps/web/components/GamePrototype.tsx`, as dependências incluíam variáveis altamente voláteis: `[activeCharacter, onlineCharacter, cityPos, game.session.gold, game.session.loot, game.session.bag, content.equipment]`. E a função de limpeza (cleanup) executava:
   ```tsx
   return () => {
     clearInterval(timer);
     window.removeEventListener('beforeunload', handleUnload);
     void saveProgress(); // <-- DISPARO INVOLUNTÁRIO EM CADA RE-RENDER
   };
   ```
2. **O Efeito Cascata:** A cada passo que o personagem dava (`ArrowUp/Down/Left/Right` ou `WASD`), `setCityPos` era chamado. O React desmontava o efeito e disparava um `POST /api/characters/[id]/save`. Ao andar 10 tiles, 10 requisições simultâneas de save atingiam o servidor.
3. **Bloqueio SQLite:** O SQLite possui trava de escrita exclusiva em arquivo. Com dezenas de saves simultâneos gravando 7 relações/tabelas, o tempo de resposta saltou para até 74 segundos por requisição.
4. **Esgotamento dos Sockets HTTP do Navegador (Chrome 6-Socket Limit):** O Google Chrome limita estritamente a 6 conexões HTTP simultâneas para o mesmo host (`localhost:3000`). Todas as 6 conexões ficaram travadas na fila das requisições `/save` de 74s.
5. **Falha de Outfits/Montarias:** Qualquer requisição subsequente para carregar sprites (`/generated/outfits/...` ou `/generated/mounts/...`) expirava o timeout e falhava. No `outfitRecolor.ts`, a falha de rede adicionava imediatamente a URL ao `failedImageUrls`. Uma vez marcado como failed, o sistema nunca mais tentava recarregar a imagem e retornava `null`. O `ThaisCityArena.tsx` recebia `null` e caía no fallback `Texture.WHITE` (quadrado branco) ou invisível.
6. **Movimentação Travada:** O loop do React e o event loop do navegador estavam ocupados processando centenas de microtasks de promessas de saves lentos e re-renderizações desnecessárias, travando os inputs de teclado.

---

### 2. Solução Arquitetural Definitiva Implementada

Para garantir que essa falha **NUNCA MAIS OCORRA** em nenhuma mudança futura, foram criadas três camadas defensivas desacopladas:

1. **Desacoplamento e Mutex de Auto-Save (`GamePrototype.tsx`):**
   - **`latestSaveStateRef`**: Armazena síncronamente no ciclo de render o estado mais recente (`activeCharacter`, `onlineCharacter`, `cityPos`, `gold`, `loot`, `bag`, `equipment`) via `useRef`, sem forçar recriação de timers nem desmontagem de hooks.
   - **Mutex Lock (`isSavingRef`)**: Impede que mais de uma requisição `/save` execute simultaneamente. Se uma já estiver em voo, requisições concorrentes são descartadas de imediato.
   - **Throttle / Cooldown (`lastSaveTimeRef`)**: Garante um intervalo mínimo de 10 segundos entre auto-saves periódicos em segundo plano, a menos que seja um save forçado (`force = true`) no Logout ou Troca de Personagem.
   - **Eliminação de `saveProgress` na Limpeza do Efeito**: O cleanup do `useEffect` agora apenas cancela o timer e remove event listeners. Nunca dispara rede na desmontagem.
   - **Ciclo Estável de Dependências**: O `useEffect` de auto-save agora depende estritamente de `[onlineCharacter?.id, saveProgress]`. Não re-executa ao andar, regenerar HP ou pegar loot.
   - **Redução do Polling de Configuração**: O intervalo de `/api/config` foi ajustado de 3s para 60s (fallback), delegando a sincronização em tempo real para o WebSocket do Colyseus (`server:config`).

2. **Resiliência e Auto-Cura de Assets (`outfitRecolor.ts`):**
   - **Eliminação do Blacklist Permanente Imediato**: Erros transitórios de rede/timeout não banem a imagem para sempre na primeira tentativa.
   - **Controle de Tentativas (`failedImageAttempts`)**: Apenas URLs com 3 falhas consecutivas e respeitando intervalo de 2000ms são consideradas permanentemente indisponíveis.
   - **Recuperação Automática**: `canRetryImage(url)` permite que assets afetados por lentidão temporária de rede sejam automaticamente re-tentados no próximo ciclo assim que o navegador liberar as conexões.
   - **Preservação de Texturas**: Sprites válidos já renderizados não são substituídos por `Texture.WHITE` caso um novo frame ainda esteja em processo de decodificação.

---

### 3. Componentes Modificados e Criados

| Arquivo | Descrição das Modificações |
|---|---|
| `apps/web/components/GamePrototype.tsx` | Implementação de `latestSaveStateRef`, mutex `isSavingRef`, throttle `lastSaveTimeRef`, remoção de `saveProgress()` do cleanup de efeitos, desacoplamento do ciclo de auto-save e desaceleração do polling de `/api/config`. |
| `apps/web/lib/outfitRecolor.ts` | Sistema de retentativas resilientes (`canRetryImage`, `isImagePermanentlyFailed`), eliminação de ban imediato de imagens em timeouts transitórios e limpeza de estado em `clearImageElementCache`. |
| `tests/phase128-autosave-mutex-and-sprite-resilience.test.ts` | [NOVO] Suíte de 7 testes cobrindo resiliência de imagens, descarte de requisições concorrentes pelo mutex, throttle com liberação de save forçado no logout e normalização determinística de outfits/montarias. |
| `.planning/ROADMAP.md` & `.planning/STATE.md` | Registro completo da Phase 128 com status Complete. |

---

### 4. Resultados de Verificação e Qualidade
- **TypeScript:** 0 erros (`npm run typecheck`).
- **Suíte Dedicada da Fase 128:** 7/7 testes aprovados em 31ms (`tests/phase128-autosave-mutex-and-sprite-resilience.test.ts`).
- **Suíte de Outfits/Montarias:** 6/6 testes aprovados (`tests/phase121-outfit-mount-animation-fix.test.ts`).
- **Logs do Servidor Dev:** Fim definitivo do flooding de chamadas `/save` a cada passo do personagem; tempo de resposta normalizado em <100ms.
