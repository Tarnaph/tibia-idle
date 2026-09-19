# CORREÇÕES

## Concluído na Phase 215:
- [x] **Efeitos de combate e magias:** Corrigido no PixiArena e domain. Ataques com sword do knight agora geram evento visual de sangue (`effectId: 1`) em acertos de dano e faísca de bloqueio de escudo (`effectId: 4`) em bloqueios. Efeitos essenciais de magias (físico 10, cura 12, taunt 13, magias de druid e mísseis) foram incluídos na prioridade do Pixi e contam com fallback resiliente de textura.
- [x] **Ícone do Cyclops Smith no bestiário:** Extraído lookType 277 canônico do Tibia 10.98 DAT/SPR em 64x64 perfeito (martelo e armadura completos), regenerado sprite no bestiário, thumbnail e atlas de hunt-cyclops-camp.
- [x] **Exori sem loop de cooldown fantasma:** Em `castAutomaticSpells`, o Exori não dispara no ar quando não há inimigos a 1 SQM de alcance. O cast manual projeta a animação autêntica nos 8 tiles ao redor e consome mana normalmente quando executado.
- [x] **Carregamento antecipado na tela de loading (Hunts e PvP):** Criada regra oficial em `.agents/rules/hunt-loading-and-assets.md`, módulo `apps/web/lib/huntAssetPreloader.ts` e orquestração no `GamePrototype.tsx`. O jogo agora instancia e carrega o mapa, atlas de hunt e texturas sob o `ExuraLoadingScreen`, garantindo que o jogador chegue ao mapa com tudo renderizado na GPU.
