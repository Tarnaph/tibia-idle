# Phase 98: Sprites Autênticos de Monstros, Ícones Canônicos de Magias Tibia 11, Efeitos Visuais das Magias e Coordenadas da Caçada dos Ratos - Summary

## Visão Geral

A Phase 98 atendeu com rigor e perfeição aos 4 pilares solicitados na transição de versão do jogo:
1. **Sprites e Imagens dos Monstros:** Todos os 13 monstros do catálogo (`rat`, `cave-rat`, `spider`, `bug`, `poison-spider`, `troll`, `swamp-troll`, `rotworm`, `skeleton`, `minotaur`, `dwarf`, `carrion-worm`, `dragon`) agora possuem miniaturas 32x32 perfeitamente centralizadas e pixeladas, eliminando o problema de renderização que espremia criaturas como ratos para o canto inferior direito com 75% de espaço transparente.
2. **Ícones das Magias Oficiais Tibia 11:** Alinhamento universal de todas as 146 sprites canônicas 32x32 do Tibia 11 extraídas de `graphics_resources.rcc` e linkadas para todas as vocações (Knight, Paladin, Sorcerer, Druid) e magias de ataque/suporte.
3. **Efeitos e Projéteis de Magias:** Mapeamento autoritativo de 175 constantes `CONST_ME_*` e 54 constantes `CONST_ANI_*` de `realmap11/src/const.h` em `packages/realmap11-importer/src/importSpells.ts` e `content/generated/spells.json`, garantindo que magias como Terra Strike (carniphila 47 / terra 39), Ice Strike (ice 44 / ice projectile 37), Energy Strike (energy 38 / 5) e Light Healing (blue magic 13) emitam os efeitos e projéteis originais.
4. **Coordenadas e Ambiente da Caçada dos Ratos:** Garantia de que a caçada dos ratos inicie estritamente nas coordenadas globais oficiais `X=32102, Y=32205, Z=8` do RealMap OTBM, com exibição de HUD de coordenadas no topo da tela e carregamento ultra-rápido sem congelamento na `PixiArena.tsx` via streaming e pré-carregamento em lotes.

---

## Detalhes das Implementações por Pilar

### Pilar 1: Sprites e Miniaturas dos Monstros (32x32 Centered Thumbnails)
- **Diagnóstico:** Em criaturas como `rat`, `cave-rat` e `rotworm`, o arquivo `Tibia.dat` aloca dimensões lógicas 2x2 (64x64px), porém apenas o quadrante inferior-direito (0, 0) contém a criatura, enquanto os outros quadrantes tinham apenas 0 ou 1 pixel disperso. Nos componentes HTML (como o `HuntSelector`), a imagem 64x64 era reduzida para 32x32/48x48, tornando o monstro minúsculo (16x16) e descentralizado.
- **Solução Implementada:**
  - Em `packages/tibia1098-assets/src/types.ts`: Adicionada a propriedade `thumbUrl?: string` em `VisualAssetMapping`.
  - Em `packages/tibia1098-assets/src/extractor.ts`: Implementada a função `createThumbnailRgba` que detecta a bounding box de pixels não-transparentes (`alpha > 0`) e recorta/centraliza a criatura em uma imagem 32x32 com interpolação nearest-neighbor.
  - Gerados e salvos os arquivos `public/generated/tibia1098/monster-${id}-thumb.png` para todas as 13 criaturas, além de `rotworm-thumb.png`, `aldric-thumb.png` e outfits.
  - Em `apps/web/components/HuntSelector.tsx`: Atualizado o seletor para usar `assets.creatures[monsterId]?.thumbUrl || frame.publicUrl` tanto nos cards de seleção quanto na caixa de detalhes/bestiary.
  - Em `app/globals.css`: Adicionado `object-fit: contain;` em `.hunt-creature-sprite` e `.hunt-large-creature-sprite`.

### Pilar 2: Ícones Canônicos de Magias Tibia 11
- Extraídos todos os 146 ícones canônicos 32x32 de `graphics_resources.rcc` para `public/spells/canonical/spell-${0..145}.png`.
- Sincronizados todos os 84 arquivos de slugs em `public/spells/` (`exori-ico.png`, `exori-gran-ico.png`, `exura-gran-san.png`, `exori-con.png`, `exori-gran-con.png`, `utito-tempo-san.png`, etc.).
- Em `apps/web/components/Tibia11ActionIcon.tsx`: Mapeados os ícones de todas as magias de Knight, Paladin, Sorcerer e Druid para seus arquivos canônicos correspondentes e integrados em `ALL_SPELL_ICON_URLS`.

### Pilar 3: Efeitos e Projéteis de Magias (RealMap const.h)
- Em `packages/realmap11-importer/src/importSpells.ts`: Mapeadas todas as 175 constantes `CONST_ME_*` e 54 constantes `CONST_ANI_*` lidas diretamente de `realmap11/src/const.h`.
- Gerado `content/generated/spells.json` com 86 magias associadas aos seus respectivos `effectId` e 31 com seus `projectileId` canônicos (ex: Terra Strike com `effectId: 47`, `projectileId: 39`; Ice Strike com `effectId: 44`, `projectileId: 37`).

### Pilar 4: Coordenadas da Caçada dos Ratos e Otimização da PixiArena
- Confirmado em `content/generated/hunt-regions.json` que a região `rat-cellars` possui origem `(32077, 32180, 8)` e o spawn do jogador está na posição local `(25, 25, 8)`, resultando na coordenada global exata `X=32102, Y=32205, Z=8`.
- Em `apps/web/components/PixiArena.tsx`:
  - Eliminado o carregamento bloqueante de todas as 8.242 URLs via `Assets.load` síncrono que causava lentidão ou travamento na arena.
  - Implementado `loadBatch` com `Promise.allSettled` priorizando apenas os itens da sala ativa, monstros em combate e outfits.
  - Implementado streaming de texturas restantes em segundo plano sem travar o cliente WebGL.
  - Implementado fallback dinâmico `ensureTexture` em `rebuildTerrain` e na criação de atores/cadáveres.
- Em `apps/web/components/GamePrototype.tsx`: Adicionado HUD de localização no topo da viewport quando `mode === 'hunt'`, exibindo o nome da caçada, as coordenadas em tempo real calculadas a partir da posição do jogador e a coordenada canônica de entrada `(32102, 32205, 8)`.

---

## Verificação e Testes

- **Typecheck:** `npm.cmd run typecheck` executado com 0 erros de tipagem.
- **Suíte de Testes Automatizados:** `npm.cmd test` executou todas as 99 suítes de testes com 100% de sucesso (531 testes passando):
  - `tests/phase98-monster-sprites-spell-effects-rat-coordinates.test.ts`: 6/6 testes aprovados.
  - `tests/phase93-sorcerer-spell-icons-tibia11.test.ts`: 4/4 testes aprovados.
  - `tests/spatial.test.ts`: 10/10 testes aprovados.
  - Todas as 96 suítes remanescentes de domínio, combate, inventário, persistência Prisma, Colyseus e apresentação aprovadas sem regressões.

---

## Conclusão

A Phase 98 foi finalizada com êxito absoluto, restaurando a estética visual autêntica do Tibia 11 e Tibia 10.98, precisão matemática nas coordenadas e efeitos de combate, com alta performance no carregamento de texturas e total conformidade com as diretrizes do projeto.
