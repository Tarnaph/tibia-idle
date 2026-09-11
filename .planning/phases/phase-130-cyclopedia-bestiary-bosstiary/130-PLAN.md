# Plan 130-01: Sistema Completo de Cyclopedia (Items, Bestiary, Bosstiary, Boss Points, Character, Rastreamento na Tela e Persistência Permanente de Kills)

## Context & Objectives
Implementar a Cyclopedia completa com base nos requisitos de `FIX.md` e nas referências autênticas do Tibia 11:
1. Catálogo de itens completo dividido nas 11 categorias oficiais com busca, ordenação, paginação, atributos detalhados e listagem cruzada "DROPADO POR".
2. Catálogo de Bestiary com estrelas de dificuldade, estatísticas, 7 resistências elementais, drops e botão "Rastrear na tela".
3. Catálogo de Bosstiary com categorias (Archfoe, Bane, Nemesis), milestones de kills (Prowess, Expertise, Mastery), summons e cooldowns.
4. Abas de Boss Points e Character.
5. Rastreador flutuante em tela (`BestiaryTrackerHUD`) com abertura automática e notificação "Você começou o bestiário deste monstro" ao matar uma criatura pela primeira vez.
6. Persistência relacional permanente de kills e monstros rastreados no Prisma SQLite e sincronização autoritativa no Colyseus.

## Implementation Steps
1. [x] Modelagem no banco de dados (`prisma/schema.prisma`): `bestiaryKillsJson`, `trackedBestiaryId`, `bossPoints`.
2. [x] Persistência no servidor Colyseus (`PrismaPersistenceManager.ts` e `ThaisCityRoom.ts`) e no serviço de autenticação (`characterService.ts`).
3. [x] Loop de combate idle e eventos de primeiro kill (`combat.ts`).
4. [x] Dados e tipos canônicos da Cyclopedia (`cyclopediaData.ts`).
5. [x] Scripts de extração de sprites de itens e monstros (`extract-cyclopedia-items.mjs` e `extract-bestiary-sprites.mjs`).
6. [x] Interface modal completa com 5 abas (`CyclopediaModal.tsx`).
7. [x] Widget HUD flutuante de rastreamento de bestiário (`BestiaryTrackerHUD.tsx`).
8. [x] Integração no dock bar (`WindowDockBar.tsx`) e game loop (`GamePrototype.tsx`).
9. [x] Testes unitários e de integração (`phase130-cyclopedia-bestiary-items.test.ts`).
