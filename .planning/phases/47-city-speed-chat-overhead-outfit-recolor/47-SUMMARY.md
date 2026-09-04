# Phase 47: Correção de Cores ao Andar, +100 Velocidade na Cidade e Chat Local/World com Texto Flutuante

**Data:** 2026-09-04  
**Status:** Concluído (100% aprovado nos testes)

---

## 🎯 Objetivos Atingidos

1. **Correção do Bug de Cores do Outfit ao Andar:**
   - Diagnosticada a causa raiz da alternância/flicker de cores: ao andar, o ciclo de caminhada alterna os frames de 0 para 1 e 2 (`-f1-base.png`, `-f1-mask.png`), os quais não estavam pré-carregados no cache de imagens nem pré-renderizados no cache de canvas. Quando `getRecoloredCanvasSync` retornava `null`, o renderizador caía no fallback para o sprite base descolorido (`outfit-knight-...png`).
   - Implementado `preloadOutfitAllFrames` em `apps/web/lib/outfitRecolor.ts` cobrindo todas as 4 direções (`south`, `east`, `north`, `west`) e os 3 frames de caminhada (`0`, `1`, `2`).
   - Adicionado fallback seguro no `getRecoloredCanvasSync` para reutilizar o frame standing (f0) já colorido com a mesma paleta caso um novo frame ainda esteja decodificando, impedindo reversão para o sprite descolorido.
   - Otimizada a atribuição de texturas no PixiJS com `lastTextureKey`, eliminando recriações desnecessárias por tick.

2. **Aumento de +100 Pontos de Velocidade na Cidade:**
   - Adicionado o bônus de velocidade `citySpeedBonus = 100` em `apps/web/components/GamePrototype.tsx`.
   - O cálculo do passo passa a considerar `cityPlayerSpeed = playerSpeed + 100` via `calculateStepDurationMs(cityPlayerSpeed)`.
   - Um personagem no nível 1 (velocidade base 220) tem agora velocidade 320 em Thais, reduzindo o tempo do passo de 550ms para 400ms.
   - Ajustado o limite anti-speedhack do servidor em `ThaisCityRoom.ts` para 100ms, permitindo a fluidez sem risco de drop de pacotes.

3. **Janela de Chat Tibia 11 com Abas Local e World:**
   - Criado o componente `apps/web/components/chat/ChatWindow.tsx` integrado ao `WindowManagerContext` e renderizado como `<DraggableWindow id="chat" icon="💬">`.
   - Abas funcionais:
     - **Local Chat:** Conversas e interações com quem estiver próximo (raio espacial `LOCAL_CHAT_RADIUS = 8` SQMs no servidor).
     - **World Chat:** Conversas globais transmitidas para o servidor inteiro.
   - Formatação autêntica com timestamp `[HH:MM]`, destaque de remetente e auto-scroll ao receber novas mensagens.
   - Botão de atalho rápido adicionado à barra superior `WindowDockBar`.

4. **Interação com Enter e Falas Flutuantes (Overhead Speech):**
   - Ao pressionar `Enter` na cidade (quando não estiver digitando em outro input), o cliente abre a janela de chat (se fechada/minimizada), traz para o topo e foca diretamente no campo de texto do Local Chat.
   - Ao enviar mensagens no **Local Chat**, é renderizado texto flutuante em **Amarelo** (`#ffff00` / `0xffff00`) com contorno preto grosso e nítido acima da cabeça do personagem.
   - Ao enviar mensagens no **World Chat**, é renderizado texto flutuante em **Azul / Ciano** (`#55ffff` / `0x55ffff`) com contorno preto grosso e nítido acima da cabeça do personagem.
   - As falas flutuantes acompanham o movimento do personagem e possuem duração de ~4.8 segundos com fade-out suave nos últimos 600ms.
   - Comportamento restrito à cidade (`mode !== 'hunt'`), preservando o HUD de combate e hotkeys numéricas durante caçadas.

---

## 🧪 Verificação & Qualidade

- **TypeScript (`npm run typecheck`):** 0 erros.
- **Vitest (`npm run test`):** 46/46 arquivos de teste passando, 289/289 testes aprovados.
- **Servidor e Web:** Servidor Colyseus (porta 2567) e cliente web (porta 3000) ativos e saudáveis (Status 200).
