---
phase: 14-viewport-em-tela-cheia-e-janelas-de-ui-flutuantes-e-arrastav
plan: 01
subsystem: ui-windows-system
tags: [fullscreen-canvas, draggable-windows, window-manager, localstorage, modular-hud]
provides:
  - Canvas PixiJS e TrainingArena ocupando 100% da tela (tela cheia)
  - Sistema de janelas flutuantes arrastáveis com z-index dinâmico e minimização
  - Barra de ferramentas superior (HUD) com atalhos de janelas e reset de layout
  - Persistência das posições e estados no localStorage
key-files:
  created:
    - apps/web/components/window/WindowManagerContext.tsx
    - apps/web/components/window/DraggableWindow.tsx
    - apps/web/components/window/WindowDockBar.tsx
  modified:
    - apps/web/components/GamePrototype.tsx
    - app/globals.css
completed: 2026-09-02
---

# Phase 14: Viewport em tela cheia e janelas de UI flutuantes e arrastáveis Summary

Reformulação da interface do cliente para modo tela cheia contínua (edge-to-edge), transformando os painéis fixos de 3 colunas em um sistema dinâmico de janelas flutuantes, arrastáveis e organizáveis.

## Realizações
- Criado o `WindowManagerContext` gerenciando posições `(x, y)`, visibilidade, minimização e salvamento em `localStorage`.
- Criado o componente `DraggableWindow` com arraste por captura de ponteiro (`setPointerCapture`), botões de minimizar/fechar e elevação de `zIndex` ao clicar.
- Criada a barra superior `WindowDockBar` com toggles rápidos para as 6 janelas (Personagem, Equipamentos, Party, Expedição, Métricas e Logs), botão de tela cheia do navegador e botão de restauração de layout ("Organizar").
- Refatorado `GamePrototype.tsx` para rodar o canvas no fundo cobrindo 100% da viewport e renderizar as janelas modulares sobre o jogo.
- Validação completa: 0 erros no TypeScript e 121 testes aprovados no Vitest.
