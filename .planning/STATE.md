# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-02)

**Core value:** Combate e progressão idle com mecânicas e fórmulas autênticas do Tibia 8.60 (TFS), com lógica de jogo autoritativa e determinística desacoplada da camada visual de renderização.  
**Current focus:** Phase 32 concluída (Vida, Nome do Personagem, Animação de Caminhada e Elementos Animados em Thais).

## Current Position

Phase: 32 of 32 (Vida, Nome do Personagem, Animação de Caminhada e Elementos Animados em Thais)  
Plan: 1 of 1 in current phase  
Status: Complete  
Last activity: 2026-09-03 — Phase 32 concluída: Exibição permanente do nome do personagem em verde (#58f773) com contorno preto e barra de vida verde (#4fc977) sobre fundo escuro acima da cabeça em Thais; rotação direcional e ciclo de animação de caminhada oficial com interpolação contínua; extração de todos os frames dos elementos do mapa (fogo azul 8058, teleporte 1387, tochas 2059/2061, lâmpadas de parede 2038/2040, bacias de carvão 1481, fontes 1360-1363 e ondas de água); e animação contínua em tempo real no ticker do Pixi.

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total phases completed: 32
- Tests status: 27 test suites passando (Vitest - 198 testes aprovados, 100%)
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
| 6. Importador Oficial de Mapas OTBM e Spawns XML | 1 | - | - | Complete |
| 7. Preservação de Integridade e Isolamento de Servidores Legados | 1 | - | - | Complete |
| 8. Pipeline Oficial de Assets Tibia 8.60 (DAT/SPR/OTB) | 1 | - | - | Complete |
| 9. Decodificador Universal de Sprites RLE do Tibia | 1 | - | - | Complete |
| 10. Catálogo Visual Integrado de Sprites e Apresentação | 1 | - | - | Complete |
| 11. Pipeline Automatizado de Extração e Validação Visual | 1 | - | - | Complete |
| 12. Arena OTBM 2D Real com Sprites Autênticos do Tibia 8.60 | 1 | - | - | Complete |
| 13. Combate Fluido com Movimento Contínuo e Câmera Centrada | 1 | - | - | Complete |
| 14. Animação Oficial de Morte, Cadáveres e Drop de Loot | 1 | - | - | Complete |
| 15. Sistema de Party, Gestão de Membros e Vocations | 1 | - | - | Complete |
| 16. Sistema de Economia, Moedas, Loot e Preços Oficiais | 1 | - | - | Complete |
| 17. Janelas Arrastáveis e HUD Tibia 11 | 1 | - | - | Complete |
| 18. Hotkeys Tibia 11, Action Bar e Disparo de Magias/Poções | 1 | - | - | Complete |
| 19. Refinamento Visual de Itens, Inventário e HUD | 1 | - | - | Complete |
| 20. Extração e Integração Oficial de Ícones e Poções | 1 | - | - | Complete |
| 21. Magias, Poções, Runas, Hotkeys e Animações Oficiais | 1 | - | - | Complete |
| 22. Autenticidade de Combate Tibia (Animações, Retículo, Fala, Chase e Cooldown) | 1 | - | - | Complete |
| 23. Cooldowns Oficiais, Fluidez Inicial, Target Inteligente, XP 50k e Cave Rats | 1 | - | - | Complete |
| 24. Área Autêntica da Magia Exori (SQUARE1X1 3x3 e Efeito Visual) | 1 | - | - | Complete |
| 25. Novo Inventário, Depot, Venda Rápida, Movimento Reto e Preços | 1 | - | - | Complete |
| 26. Alinhamento do Inventário, HUD Centralizada, Janela Flutuante, Stances e Distância | 1 | - | - | Complete |
| 27. Desequipar Mochila, Trava de Foco e Level Up | 1 | - | - | Complete |
| 28. Nova UI de Caçadas e Nova UI da Party com Modal | 1 | - | - | Complete |
| 29. Saída de Caçada e Sistema de Treino com Dummies | 1 | - | - | Complete |
| 30. Mapa Global de Thais, Início Imediato de Hunt e Sair no Dock | 1 | - | - | Complete |
| 31. Migração Tibia 10.98 DAT/SPR e Renderização Autêntica de Thais | 1 | - | - | Complete |
| 32. Vida, Nome do Personagem, Passos e Elementos Animados em Thais | 1 | - | - | Complete |

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



