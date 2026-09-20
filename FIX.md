# CORREÇÕES

## Concluído na Phase 215:
- [x] **Efeitos de combate e magias:** Corrigido no PixiArena e domain. Ataques com sword do knight agora geram evento visual de sangue (`effectId: 1`) em acertos de dano e faísca de bloqueio de escudo (`effectId: 4`) em bloqueios. Efeitos essenciais de magias (físico 10, cura 12, taunt 13, magias de druid e mísseis) foram incluídos na prioridade do Pixi e contam com fallback resiliente de textura.
- [x] **Ícone do Cyclops Smith no bestiário:** Extraído lookType 277 canônico do Tibia 10.98 DAT/SPR em 64x64 perfeito (martelo e armadura completos), regenerado sprite no bestiário, thumbnail e atlas de hunt-cyclops-camp.
- [x] **Exori sem loop de cooldown fantasma:** Em `castAutomaticSpells`, o Exori não dispara no ar quando não há inimigos a 1 SQM de alcance. O cast manual projeta a animação autêntica nos 8 tiles ao redor e consome mana normalmente quando executado.
- [x] **Carregamento antecipado na tela de loading (Hunts e PvP):** Criada regra oficial em `.agents/rules/hunt-loading-and-assets.md`, módulo `apps/web/lib/huntAssetPreloader.ts` e orquestração no `GamePrototype.tsx`. O jogo agora instancia e carrega o mapa, atlas de hunt e texturas sob o `ExuraLoadingScreen`, garantindo que o jogador chegue ao mapa com tudo renderizado na GPU.

## Concluído na Phase 216:
- [x] **Atlas Unificado de Efeitos e Mísseis de Combate (`combat-fx-atlas`):** Compilação de 1.955 frames (32x32) cobrindo todos os efeitos (1 a 60) e mísseis (1 a 50) em um único atlas de texturas (488KB) com 5.865 aliases (`scripts/build-combat-atlas.mjs`), eliminando requisições HTTP individuais e gargalos de rede.
- [x] **Resolução Definitiva de Texturas Invisíveis no PixiJS v8:** Solução da falha em que `Texture.from()` retornava `undefined` para texturas fora do cache, fazendo efeitos com vida útil curta (300-500ms) desaparecerem invisíveis. Integrado `Assets.load` do atlas no `PixiArena.tsx` com resolvedor de texturas resiliente multi-tier `getCombatTexture(url, onLoaded)`.
- [x] **Correção de Coordenadas e Mísseis:** Mísseis de wand/rod e magias passam a iniciar em sua posição correta (`from.x, from.y`) em vez de (0, 0), e os nós de visualEvents (`melee-hit`, `projectile-launched`) agora sincronizam dinamicamente suas texturas frame a frame no ticker da GPU.
