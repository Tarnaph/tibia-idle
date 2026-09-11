---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: complete
last_updated: "2026-09-11T22:53:00.000Z"
last_activity: "2026-09-11 — Conclusão da Phase 137: Chat Fixo no Canto Inferior Esquerdo e Remoção do Ícone de Chat da Barra Superior."
progress:
  total_phases: 137
  completed_phases: 137
  total_plans: 137
  completed_plans: 137
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-02)

**Core value:** Combate e progressão idle com mecânicas e fórmulas autênticas do Tibia 11 / 10.98+ (TFS 1.x / realmap11), com lógica de jogo autoritativa e determinística desacoplada da camada visual de renderização.  
**Current focus:** Phase 137 Concluída com Sucesso.

## Current Position

Phase: 137 of 137 (Concluída)  
Plan: 1 of 1 in current phase  
Status: Complete  
Last activity: 2026-09-11 — Conclusão da Phase 137.

Progress: [██████████] 100%


## Performance Metrics

**Velocity:**
- Total phases completed: 137
- Total phases in roadmap: 137
- Tests status: 138 test suites, 804 testes (100% aprovados)
- Typecheck status: 0 erros (TypeScript 5.9)
- Lint status: 0 erros

**By Phase:**

| Phase | Plans | Total | Avg/Plan | Status |
|---|---|---|---|---|
| 1 a 77. (Fases Anteriores Concluídas) | 77 | - | - | Complete |
| 78 a 123. (Fases Intermediárias Concluídas) | 46 | - | - | Complete |
| 124. Sistema de Exhaust, IA de Exploração Solo e Táticas de Party | 1 | - | - | Complete |
| 125. Importação Total do Acervo RealMap 11 e Tooltip Canônico de Look | 1 | - | - | Complete |
| 126. Otimização de Carregamento da Seleção e Caixa Canônica de Logout | 1 | - | - | Complete |
| 127. Persistência Permanente de Variáveis e Rates do Servidor | 1 | - | - | Complete |
| 128. Blindagem Arquitetural de Auto-Save, Prevenção de Esgotamento de Sockets HTTP e Resiliência de Sprites | 1 | - | - | Complete |
| 129. Eliminação Definitiva de Travamento da Tela de Outfits/Montarias e Normalização Canônica Perfeita | 1 | - | - | Complete |
| 130. Sistema Completo de Cyclopedia (Items, Bestiary, Bosstiary, Boss Points, Character, Rastreamento na Tela) | 1 | - | - | Complete |
| 131. Resolução de Imagem na Tela de Loading e Eliminação Definitiva de Tela Preta pós-Loading no Game Viewport | 1 | - | - | Complete |
| 132. Correção Definitiva do Background de Loading, BGM e Renderização de Thais | 1 | - | - | Complete |
| 133. Correção do Botão Jogar Agora e Blindagem da Navegação Client-Side | 1 | - | - | Complete |
| 134. Resiliência de Montaria, Troca de Outfit, Atalhos de Dock e Eliminação de Deadlock no Vite RSC | 1 | - | - | Complete |
| 135. Correção Definitiva de Persistência de Outfit e Montaria, Sincronização em Thais e Resolução de Estado | 1 | - | - | Complete |



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
