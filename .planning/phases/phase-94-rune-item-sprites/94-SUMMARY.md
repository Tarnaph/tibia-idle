# Phase 94 Summary: Ícones e Sprites Autênticos de Runas via Tibia 10.98 Client

## Visão Geral

Nesta fase atendemos integralmente à solicitação do usuário:
1. **Extração das imagens dos próprios itens de runa do client Tibia 10.98**:
   - Mapeamos e extraímos todas as 34 runas canônicas diretamente dos arquivos oficiais `Tibia.dat`, `Tibia.spr` e `items.otb`.
   - Eliminamos o reuso de ícones de magias (como `/spells/*-rune.png` e `/spells/ice-storm.png`), associando cada runa estritamente à sprite oficial do item com seu Server ID e Client ID.
2. **Paridade Visual Exata em Todas as 4 Áreas da Interface**:
   - **Na lista** de ações (`HotbarConfigModal.tsx` painel esquerdo)
   - **Nos detalhes** da ação (`HotbarConfigModal.tsx` painel direito)
   - **No inventário** / loja / depot / trade / tooltips (`ItemSprite.tsx` via `content/generated/tibia1098-assets.json`)
   - **Na barra de ações** / hotbar (`Tibia11ActionIcon.tsx` / `Tibia11ActionBar.tsx`)
3. **Preservação ao Regenerar Assets**:
   - `packages/tibia1098-assets/src/extractor.ts` atualizado com `CANONICAL_RUNE_SERVER_IDS` e `CANONICAL_RUNE_METADATA`, garantindo que executar o pipeline de extração (`npm run extract:tibia1098`) preserve e gere novamente todas as 34 runas em `public/runes/` e `public/generated/tibia1098/items/`.
4. **Preservação de Magias, Poções e Regras**:
   - Nenhuma magia (Phase 93), poção (Phases 91-92) ou regra de combate foi modificada.

---

## Mapeamento das 34 Runas Canônicas Extraídas

| Server ID | Client ID | Nome da Runa | Palavras de Invocação | Arquivo Semântico | Arquivo do Item |
| :---: | :---: | :--- | :--- | :--- | :--- |
| `2260` | `3147` | Blank Rune | `adori blank` | `/runes/blank-rune.png` | `/generated/tibia1098/items/item-2260.png` |
| `2261` | `3148` | Destroy Field Rune | `adito grav` | `/runes/destroy-field-rune.png` | `/generated/tibia1098/items/item-2261.png` |
| `2262` | `3149` | Energy Bomb Rune | `adevo mas vis` | `/runes/energy-bomb-rune.png` | `/generated/tibia1098/items/item-2262.png` |
| `2265` | `3152` | Intense Healing Rune | `adura gran` | `/runes/intense-healing-rune.png` | `/generated/tibia1098/items/item-2265.png` |
| `2266` | `3153` | Cure Poison Rune | `adana pox` | `/runes/cure-poison-rune.png` | `/generated/tibia1098/items/item-2266.png` |
| `2268` | `3155` | Sudden Death Rune | `adori gran mort` | `/runes/sudden-death-rune.png` | `/generated/tibia1098/items/item-2268.png` |
| `2269` | `3156` | Wild Growth Rune | `adevo grav vita` | `/runes/wild-growth-rune.png` | `/generated/tibia1098/items/item-2269.png` |
| `2271` | `3158` | Icicle Rune | `adori frigo` | `/runes/icicle-rune.png` | `/generated/tibia1098/items/item-2271.png` |
| `2273` | `3160` | Ultimate Healing Rune | `adura vita` | `/runes/ultimate-healing-rune.png` | `/generated/tibia1098/items/item-2273.png` |
| `2274` | `3161` | Avalanche Rune | `adori mas frigo` | `/runes/avalanche-rune.png` | `/generated/tibia1098/items/item-2274.png` |
| `2277` | `3164` | Energy Field Rune | `adevo grav vis` | `/runes/energy-field-rune.png` | `/generated/tibia1098/items/item-2277.png` |
| `2278` | `3165` | Paralyze Rune | `adana ani` | `/runes/paralyze-rune.png` | `/generated/tibia1098/items/item-2278.png` |
| `2279` | `3166` | Energy Wall Rune | `adevo mas grav vis` | `/runes/energy-wall-rune.png` | `/generated/tibia1098/items/item-2279.png` |
| `2285` | `3172` | Poison Field Rune | `adevo grav pox` | `/runes/poison-field-rune.png` | `/generated/tibia1098/items/item-2285.png` |
| `2286` | `3173` | Poison Bomb Rune | `adevo mas pox` | `/runes/poison-bomb-rune.png` | `/generated/tibia1098/items/item-2286.png` |
| `2287` | `3174` | Light Magic Missile Rune | `adori min vis` | `/runes/light-magic-missile-rune.png` | `/generated/tibia1098/items/item-2287.png` |
| `2288` | `3175` | Stone Shower Rune | `adori mas tera` | `/runes/stone-shower-rune.png` | `/generated/tibia1098/items/item-2288.png` |
| `2289` | `3176` | Poison Wall Rune | `adevo mas grav pox` | `/runes/poison-wall-rune.png` | `/generated/tibia1098/items/item-2289.png` |
| `2290` | `3177` | Convince Creature Rune | `adeta sio` | `/runes/convince-creature-rune.png` | `/generated/tibia1098/items/item-2290.png` |
| `2291` | `3178` | Chameleon Rune | `adevo ina` | `/runes/chameleon-rune.png` | `/generated/tibia1098/items/item-2291.png` |
| `2292` | `3179` | Stalagmite Rune | `adori tera` | `/runes/stalagmite-rune.png` | `/generated/tibia1098/items/item-2292.png` |
| `2293` | `3180` | Magic Wall Rune | `adevo grav tera` | `/runes/magic-wall-rune.png` | `/generated/tibia1098/items/item-2293.png` |
| `2295` | `3182` | Holy Missile Rune | `adori san` | `/runes/holy-missile-rune.png` | `/generated/tibia1098/items/item-2295.png` |
| `2301` | `3188` | Fire Field Rune | `adevo grav flam` | `/runes/fire-field-rune.png` | `/generated/tibia1098/items/item-2301.png` |
| `2302` | `3189` | Fireball Rune | `adori flam` | `/runes/fireball-rune.png` | `/generated/tibia1098/items/item-2302.png` |
| `2303` | `3190` | Fire Wall Rune | `adevo mas grav flam` | `/runes/fire-wall-rune.png` | `/generated/tibia1098/items/item-2303.png` |
| `2304` | `3191` | Great Fireball Rune | `adori mas flam` | `/runes/great-fireball-rune.png` | `/generated/tibia1098/items/item-2304.png` |
| `2305` | `3192` | Fire Bomb Rune | `adevo mas flam` | `/runes/fire-bomb-rune.png` | `/generated/tibia1098/items/item-2305.png` |
| `2308` | `3195` | Soulfire Rune | `adevo res flam` | `/runes/soulfire-rune.png` | `/generated/tibia1098/items/item-2308.png` |
| `2310` | `3197` | Desintegrate Rune | `adito tera` | `/runes/desintegrate-rune.png` | `/generated/tibia1098/items/item-2310.png` |
| `2311` | `3198` | Heavy Magic Missile Rune | `adori vis` | `/runes/heavy-magic-missile-rune.png` | `/generated/tibia1098/items/item-2311.png` |
| `2313` | `3200` | Explosion Rune | `adevo mas hur` | `/runes/explosion-rune.png` | `/generated/tibia1098/items/item-2313.png` |
| `2315` | `3202` | Thunderstorm Rune | `adori mas vis` | `/runes/thunderstorm-rune.png` | `/generated/tibia1098/items/item-2315.png` |
| `2316` | `3203` | Animate Dead Rune | `adana mort` | `/runes/animate-dead-rune.png` | `/generated/tibia1098/items/item-2316.png` |

---

## Arquivos Modificados / Criados

- `packages/tibia1098-assets/src/extractor.ts`:
  - Adicionado `CANONICAL_RUNE_METADATA`, `CANONICAL_RUNE_SERVER_IDS` e `CANONICAL_RUNE_IDS`.
  - Integrada extração para `public/generated/tibia1098/items/item-${sId}.png`, `public/runes/${slug}.png` e `public/runes/item-${sId}.png`.
- `content/generated/tibia1098-assets.json`:
  - 2.024 itens registrados, com todas as 34 runas indexadas sob `items[String(id)]` com dimensões $32 \times 32$ pixels e `resolved: true`.
- `public/runes/`:
  - 68 arquivos PNG criados (formatos semântico e por ID) com transparência nativa e resolução de 32x32.
- `apps/web/components/Tibia11ActionIcon.tsx`:
  - `resolveActionImagePath` atualizado para resolver runas estritamente para `/runes/${slug}.png` ou `/runes/item-${id}.png`, eliminando de vez caminhos legados como `/spells/sd-rune.png`, `/spells/gfb-rune.png`, `/spells/hmm-rune.png`, `/spells/explosion-rune.png` e `/spells/ice-storm.png`.
  - `ALL_SPELL_ICON_URLS` atualizado com as novas URLs das runas.
- `packages/domain/src/hotbarActions.ts`:
  - Expandido o catálogo `HOTBAR_RUNES` com as runas canônicas adicionais (Magic Wall, Paralyze, Destroy Field, Holy Missile, etc.) com níveis, vocações e palavras oficiais.
- `tests/phase94-rune-item-sprites.test.ts`:
  - 5 testes automatizados cobrindo presença no manifesto, integridade dos arquivos em disco, resolução sem fallback no `ItemSprite`, resolução no `Tibia11ActionIcon` sem apontar para magias e verificação de paridade byte-a-byte entre inventário, lista, detalhes e barra de ações.

---

## Verificação e Qualidade

- **Typecheck**: `npm run typecheck` $\rightarrow$ **0 erros** (`tsc --noEmit`).
- **Testes Unitários**: `vitest run` $\rightarrow$ **95 arquivos de teste aprovados**, **497 testes passando** (100% de sucesso).
- **Integridade**: Zero alterações em magias, poções ou regras de combate.
