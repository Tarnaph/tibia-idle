# FASE 236: REDESIGN COMPLETO DOS MODAIS E MENUS MOBILE & POLIMENTO GERAL (CONCLUÍDO ✅)

### Demandas do Usuário & Checklist de Execução:
- [x] **Onda 1: Remoção Total do Balão de Coordenadas e Textos de Caminhada**
  - [x] Removido completamente o balão superior (`city-location-hud` e `hunt-location-hud`) em `GamePrototype.tsx` tanto do web/desktop quanto do mobile ("CIDADE DE THAIS", coordenadas X/Y/Z, "setas do teclado para andar", "Andando sozinho até...", "Parado em Thais...").
- [x] **Onda 2: Suavização Fluida do Joystick Virtual de Movimentação**
  - [x] Em `MobileVirtualDPad.tsx`: reformulada a taxa de disparo e o controle de toque do D-Pad virtual com cadência suave e progressiva (`STEP_CADENCE_MS = 240`), eliminando o disparo frenético e incontrolável.
  - [x] Implementado arrasto suave com `setPointerCapture`, deadzone de 14px e feedback visual direcional ergonômico.
- [x] **Onda 3: Redesign Mobile dos Modais de Personagem e Outfit**
  - [x] Reformulado `CharacterProfileModal.tsx`: layout adaptado para telas móveis com grid flexível `minmax(min(100%, 280px), 1fr)`, botão de fechar ✕ de 38x38px de alto contraste e botão inferior "✕ Fechar Ficha" para fácil acionamento pelo polegar.
  - [x] Reformulado `OutfitModal.tsx`: preview centralizado, abas limpas, paleta responsiva e botões fixos de confirmação ("Salvar" e "Cancelar") em tela inteira mobile.
- [x] **Onda 4: Redesign Mobile do Inventário e Equipamentos**
  - [x] Reformulado `InventoryWindow.tsx` para mobile: layout vertical sem cortes, slots corporais de 42px centralizados, capacidade, bolsa e mochila integradas em scroll vertical fluido.
  - [x] Backdrop escurecido para fechamento por toque externo e botão inferior "✕ Fechar Inventário".
- [x] **Onda 5: Auditoria Universal de Menus e Janelas no Mobile (Botão Fechar & Responsividade)**
  - [x] Todas as janelas flutuantes (`.inventory-window-container.floating-window`, `.shop-window`, `.depot-window-container`, `.quicksell-window-container`, `.tibia-skills-floating-window`) foram centralizadas (`top: 50%; left: 50%; transform: translate(-50%, -50%); width: 95vw; max-height: 88dvh`).
  - [x] Botões de fechar universais (`.inventory-close-btn`, `.tibia-window-close-btn`, `.tibia-skills-btn-ctrl`) com área de toque mínima ampliada para 38x38px com contraste carmesim.
- [x] **Onda 6: Validação, Testes Automatizados, Typecheck & Deploy na VPS**
  - [x] Suíte de testes automatizados `tests/phase236-mobile-windows-redesign.test.ts` passando com 100% de sucesso.
  - [x] Validação rigorosa com `npm run typecheck` (0 erros).
  - [x] Deploy ao vivo na VPS `187.7.16.210`.

---