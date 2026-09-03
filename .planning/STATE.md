# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-02)

**Core value:** Combate e progressão idle com mecânicas e fórmulas autênticas do Tibia 8.60 (TFS), com lógica de jogo autoritativa e determinística desacoplada da camada visual de renderização.  
**Current focus:** Phase 12 concluída (todas as 12 fases do vertical slice finalizadas e testadas).

## Current Position

Phase: 30 of 30 (Mapa Global de Thais, Início Imediato de Hunt, Skills Escuro e Botão Sair no Dock)  
Plan: 1 of 1 in current phase  
Status: Complete  
Last activity: 2026-09-03 — Phase 30 concluída: Integração do mapa global de Thais (1.836 tiles de realmap.otbm); botão 'Começar caçada' imediato sem 5s quando na cidade; tema escuro estilo hotkeys para a janela Skills; e botão vermelho 'SAIR DA CAÇADA' no dock rápido ao lado de BLESSINGS com remoção da janela antiga de hunt/training room.

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total phases completed: 26
- Tests status: 21 test suites passando (Vitest - 169 testes aprovados, 100%)
- Typecheck status: 0 erros (TypeScript 5.9)
- Lint status: 0 erros

**By Phase:**

| Phase | Plans | Total | Avg/Plan | Status |
|-------|-------|-------|----------|--------|
| 1. Motor de Simulação e Combate Idle | 1 | - | - | Complete |
| 2. Sistema de Equipamento e Atributos Derivados | 1 | - | - | Complete |
| 3. Espacialidade 2D, Grid e Pathfinding A\* | 1 | - | - | Complete |
| 4. Camada de Apresentação e Interpolação PixiJS | 1 | - | - | Complete |
| 5. Treinamento Funcional de Habilidades | 1 | - | - | Complete |
| 6. Importadores de Conteúdo STYLLER (XML / OTBM) | 1 | - | - | Complete |
| 7. Pipeline de Extração de Assets Tibia 8.60 (DAT/SPR) | 1 | - | - | Complete |
| 8. Multi-Personagem, Spells, Promoção e Caçadas OTBM | 1 | - | - | Complete |
| 9. Rotas de Caça Contínuas (Continuous Hunt Routes) | 1 | - | - | Complete |
| 10. Câmera de Expedição e Controles em Tempo Real | 1 | - | - | Complete |
| 11. Economia de Party, Loot Pouch e UX Estrutural | 1 | - | - | Complete |
| 12. Fundação de Autenticação, Contas e Segurança (Supabase) | 1 | - | - | Complete |
| 13. Ajuste de Indicador Visual de Dano (Remover sinal -) | 1 | - | - | Complete |
| 14. Viewport em tela cheia e janelas de UI flutuantes e arrastáveis | 1 | - | - | Complete |
| 15. Janela compacta de inventario, tooltips e iluminacao de tocha | 1 | - | - | Complete |
| 16. Arraste de janelas, hotbar customizavel e XP 5000 | 1 | - | - | Complete |
| 17. Migracao para Tibia 11, Icones Oficiais e Action Bar | 1 | - | - | Complete |
| 18. Action Bar F1-F12 e Icones Identicos ao Tibia 11 Original | 1 | - | - | Complete |
| 19. Console Inferior Completo de Batalha e Acoes | 1 | - | - | Complete |
| 20. Extração e Integração Oficial de Ícones e Poções | 1 | - | - | Complete |
| 21. Magias, Poções, Runas, Hotkeys e Animações Oficiais | 1 | - | - | Complete |
| 22. Autenticidade de Combate Tibia (Animações, Retículo, Fala, Chase e Cooldown) | 1 | - | - | Complete |
| 23. Cooldowns Oficiais, Fluidez Inicial, Target Inteligente, XP 50k e Cave Rats | 1 | - | - | Complete |
| 24. Área Autêntica da Magia Exori (SQUARE1X1 3x3 e Efeito Visual) | 1 | - | - | Complete |
| 25. Novo Inventário, Depot, Venda Rápida, Movimento Reto e Preços | 1 | - | - | Complete |
| 26. Alinhamento do Inventário, HUD Centralizada, Janela Flutuante, Stances e Distância | 1 | - | - | Complete |

## Accumulated Context

### Decisions

- [Phase 1]: Combate baseado em ticks de 120ms com desacoplamento de interface e curva cumulativa de XP oficial do TFS.
- [Phase 2]: Derivação de ataque, defesa e armor usando fórmulas fiéis à engine TFS.
- [Phase 3]: Algoritmo A* com restrição estrita de anti-corner clipping e sistema de ocupação atômica por tile.
- [Phase 4]: Interpolação com `VisualMotionTrack` e PixiJS sem alteração do RNG determinístico de combate.
- [Phase 5]: Training Room funcional com dummies que consomem tentativas de avanço proporcionais aos multiplicadores de vocação.
- [Phase 6]: Importação somente leitura de `../styller-master/` para manter fontes originais íntegras.
- [Phase 7]: Extração binária de DAT/SPR determinística para PNG com manifesto auditado por hash SHA-256.
- [Phase 8]: Suporte a party de 4 vocações únicas com estados, inventários, hotbars e spells isolados.
- [Phase 9]: Rotas contínuas em mapa aberto OTBM com zonas de respawn seguro e variantes raras.
- [Phase 10]: Câmera de expedição desacoplada da seleção de UI e suporte a hot-swap de equipamentos em combate ativo.
- [Phase 11]: Loot Pouch com travas de venda (`lockSell`), peso/capacidade e divisão de experiência balanceada.
- [Phase 12]: Autenticação Supabase, RLS restrito a admin no backend e rota `/game-preview` sem login para facilidade em desenvolvimento local.
- [Phase 13]: Dano recebido exibido puramente em vermelho sem o sinal negativo (-), alinhado ao Tibia 8.60.
- [Phase 14]: Viewport em tela cheia com sistema de janelas flutuantes arrastáveis e HUD modular.
- [Phase 15]: Iluminação de masmorra via blendMode erase com tocha de ~7.5 tiles, mini-paperdoll integrado e tooltips de atributos clássicos.

### Roadmap Evolution

- Phase 1 a 12 concluídas e mapeadas a partir dos testes, esquemas e componentes do projeto.
- Phase 13 added: Remover sinal negativo dos danos recebidos e exibir apenas em vermelho (FIX.md).
- Phase 14 added: Viewport em tela cheia e janelas de UI flutuantes e arrastáveis (solicitação do usuário).
- Phase 15 added: Janela compacta de inventário, tooltips de atributos e iluminação de tocha estilo Tibia (FIX.md).
- Phase 16 added: Correção de arraste de janelas, hotbar customizável (magias, runas, itens) e boost de XP dos ratos (FIX.md).



