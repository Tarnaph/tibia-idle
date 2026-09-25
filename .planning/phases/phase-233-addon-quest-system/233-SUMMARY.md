# Resumo da Phase 233: Sistema de Missões e Desbloqueio de Addons (Citizen Addon 1)

## Objetivo
Implementar a primeira missão de addon ("Primeiros Passos de um Cidadão") com interface direta no OutfitModal e na aba Quests:
1. **Requisitos de Materiais:**
   - 5x Bunch of Troll Hair (10606) - Troll (Troll Camp)
   - 3x Spider Fangs (8859) - Spider (Spider Burrow)
   - 50x Bone (2230) - Skeleton (Old Crypt)
   - 20x Lump of Dirt (10609) - Rotworm (Rotworm Cave)
2. **Interface no OutfitModal:**
   - Badge "Quest" ao lado de Addon 1 e Addon 2 quando não conquistados.
   - Painel retrátil exibindo detalhes dos 4 materiais, ícones canônicos e quantidade possuída/necessária.
   - Botão dourado "Trocar" que aparece ativo quando o jogador tiver todos os itens na mochila.
3. **Transação Server-Side Atômica:**
   - Consumo exato dos materiais do inventário persistido sem perda ou duplicação.
   - Desbloqueio permanente de `unlockedAddonsJson` e `completedQuestsJson` no Prisma DB.
   - Não equipar automaticamente, permitindo escolha livre do jogador.
   - Proteção de concorrência com `CharacterSaveLockManager.withLock` e `$transaction`.

## Entregas Realizadas
- `prisma/schema.prisma`: Inclusão de `unlockedAddonsJson String?` e `completedQuestsJson String?` no modelo `Character`.
- `packages/domain/src/appearancePermissions.ts`: Definição de `CITIZEN_ADDON_1_QUEST`, `ADDON_QUESTS`, `getAddonQuestFor`, `parseUnlockedAddons`, `parseCompletedQuests`.
- `packages/auth/src/characterService.ts`: Método atômico `tradeAddonQuest` consumindo materiais e liberando o addon.
- `app/api/characters/[id]/trade-addon/route.ts`: Endpoint REST seguro com autenticação de conta.
- `apps/web/components/OutfitModal.tsx`: Badge `📜 Quest`, painel com contagem de estoque e botão dourado "Trocar" com resposta instantânea na UI.
- `apps/web/components/HuntSelector.tsx`: Missão adicionada na aba Quests com objetivos e recompensas.
- `tests/phase233-addon-quest-trade.test.ts`: Suíte de testes automatizados com 100% de aprovação.
