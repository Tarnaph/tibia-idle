---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: complete
last_updated: "2026-09-11T13:10:00.000Z"
last_activity: "2026-09-11 — Conclusão da Phase 127: Persistência Permanente de Variáveis e Rates do Servidor (Admin Server Config)."
progress:
  total_phases: 127
  completed_phases: 127
  total_plans: 127
  completed_plans: 127
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-02)

**Core value:** Combate e progressão idle com mecânicas e fórmulas autênticas do Tibia 11 / 10.98+ (TFS 1.x / realmap11), com lógica de jogo autoritativa e determinística desacoplada da camada visual de renderização.  
**Current focus:** Todas as fases da Milestone concluídas com sucesso.

## Current Position

Phase: 127 of 127 (Concluído)  
Plan: 1 of 1 in current phase  
Status: Complete  
Last activity: 2026-09-11 — Concluída a implementação da Phase 127.

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total phases completed: 127
- Total phases in roadmap: 127
- Tests status: 128 test suites (738 testes aprovados - 100%)
- Typecheck status: 0 erros (TypeScript 5.9)
- Lint status: 0 erros

**By Phase:**

| Phase | Plans | Total | Avg/Plan | Status |
|-------|-------|-------|----------|--------|
| 1 a 77. (Fases Anteriores Concluídas) | 77 | - | - | Complete |
| 78 a 123. (Fases Intermediárias Concluídas) | 46 | - | - | Complete |
| 124. Sistema de Exhaust, IA de Exploração Solo e Táticas de Party | 1 | - | - | Complete |
| 125. Importação Total do Acervo RealMap 11 e Tooltip Canônico de Look | 1 | - | - | Complete |
| 126. Otimização de Carregamento da Seleção e Caixa Canônica de Logout | 1 | - | - | Complete |
| 127. Persistência Permanente de Variáveis e Rates do Servidor | 1 | - | - | Complete |

## Accumulated Context

### Decisions

- [Phase 74]: Personagens novos iniciam estritamente no Nível 1 (0 XP, 150 HP, 35 MP, 400 de capacidade) com spawn canônico em Thais (32369, 32241, 7) e tags auditadas (inHunt: false, posZ: 7, nameplate e outfit da vocação) para visibilidade imediata por outros jogadores.
- [Phase 73]: Abas privadas dedicadas no ChatWindow (1-para-1) com isolamento estrito fora de Local e World, envio direto sem necessidade de digitar prefixo, e botão de fechar (✕) que restaura para o Local Chat.
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
