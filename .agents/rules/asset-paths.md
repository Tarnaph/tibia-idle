---
description: "Regras canônicas e localização oficial de imagens, sprites e assets visuais do jogo (CAVEBOUND / TibiaWeb)"
globs: "*"
---

# Diretriz Oficial de Imagens e Assets Visuais (Asset Paths)

Todas as imagens e sprites do jogo estão organizados e centralizados na pasta oficial **`public/assets/`** e seus espelhos canônicos em **`public/generated/`** e **`public/images/`**.

Qualquer agente, IA ou desenvolvedor deve consultar e referenciar as imagens exclusivamente segundo a tabela e convenções abaixo.

---

## 📁 1. Catálogo Canônico de Pastas e Categorias

| Categoria | Pasta Oficial (`public/assets/`) | Espelho / Origem Canônica | Convenção de Nomenclatura | Conteúdo / Quantidade |
|---|---|---|---|---|
| **Itens do Jogo** | `public/assets/items/` | `public/generated/cyclopedia/items/` | `item-${id}.png` (ex: `item-2152.png`) | 22.181 sprites canônicos do Tibia (todos os IDs) |
| **Magias e Feitiços** | `public/assets/spells/` | `public/spells/` e `public/spells/canonical/` | `${spell-name}.png` ou `canonical/spell-${id}.png` | 146+ ícones oficiais de feitiços de todas as vocações |
| **Runas** | `public/assets/runes/` | `public/runes/` | `${rune-name}.png` (ex: `sudden-death-rune.png`) | Ícones oficiais de runas utilizáveis e de criação |
| **Poções** | `public/assets/potions/` | `public/potions/` | `${potion-name}.png` (ex: `great-health-potion.png`) | Poções de vida, mana e espírito em todos os tiers |
| **Montarias** | `public/assets/mounts/` | `public/generated/mounts/` | `${mount-id}-${dir}-f${frame}.png` | Todas as montarias e animações de montaria do jogo |
| **Monstros e Bestiário** | `public/assets/monsters/` | `public/generated/bestiary/` | `${monster-id}.png` (ex: `dragon.png`, `demon.png`) | Todos os monstros, criaturas e chefes do bestiário |
| **Outfits (Sprites)** | `public/assets/outfits/` | `public/generated/outfits/` | `${outfit}-${gender}-${dir}-f${frame}-base.png` / `-mask.png` | Sprites de corpo e máscaras de coloração dos trajes |
| **Outfits (Thumbs)** | `public/assets/outfit-thumbs/` | `public/generated/outfit-thumbs/` | `${outfit}.png` (ex: `citizen.png`, `mage.png`) | Miniaturas de alta qualidade para seleção de trajes |
| **Caçadas e Dungeons** | `public/assets/hunts/` | `public/images/hunts/` | `${huntId}.jpg` (ex: `troll-caves.jpg`) | Artes temáticas de fundo de cada área de caça |
| **Avatares de Perfil** | `public/assets/avatars/` | `public/images/avatars/` | `avatar-${id}.png` (ex: `avatar-1.png`) | Avatares de exibição e perfil do jogador |
| **Telas de Loading** | `public/assets/loading/` | `public/images/loading/` | `thais-loading.jpg`, `loading-bar-frame.png` | Backgrounds e molduras douradas da tela de loading |

---

## 🛠️ 2. Módulo Helper Central: `apps/web/lib/assetPaths.ts`

Sempre que precisar obter a URL de uma imagem em um componente React / Next.js, importe os métodos padronizados:

```typescript
import {
  getCanonicalItemUrl,      // (itemId: number | string) => '/generated/cyclopedia/items/item-${id}.png'
  getCanonicalSpellUrl,     // (nameOrId: string | number) => '/spells/...'
  getCanonicalRuneUrl,      // (runeName: string) => '/runes/...'
  getCanonicalPotionUrl,    // (potionName: string) => '/potions/...'
  getCanonicalMonsterUrl,   // (monsterId: string) => '/generated/bestiary/${monsterId}.png'
  getCanonicalHuntUrl,      // (huntId: string) => '/images/hunts/${huntId}.jpg'
  getCanonicalAvatarUrl,    // (avatarId?: number) => '/images/avatars/avatar-${id}.png'
  ASSET_BASE_DIRS           // Objeto com os prefixos de todas as categorias
} from '@/apps/web/lib/assetPaths';
```

---

## ⚠️ 3. Regras Críticas para Evitar Imagens Quebradas

1. **Nunca inventar diretórios inexistentes:**
   - ❌ Errado: `/sprites/items/...`, `/images/spells/...`, `/items/...`
   - ✅ Correto: `/assets/items/item-${id}.png` ou `/generated/cyclopedia/items/item-${id}.png`

2. **Itens no Tibia 10.98 vs Cyclopedia:**
   - O diretório `public/generated/tibia1098/items/` contém apenas uma parcela reduzida de itens extraídos da versão antiga.
   - O diretório `public/generated/cyclopedia/items/` (e `public/assets/items/`) contém **22.181 itens**, incluindo moedas (2148, 2152, 2160), armas, runas e armaduras completas. **Sempre priorize ou forneça fallback para Cyclopedia/Assets!**

3. **Fallback gracioso com `onError`:**
   - Em componentes que renderizam tags `<img>` (ex: `ItemSprite.tsx`, `HuntCard.tsx`), sempre implemente um manipulador `onError` apontando para a pasta oficial ou imagem reserva caso o primeiro caminho falhe.

4. **Pré-carregamento Não-Bloqueante:**
   - O pré-carregamento no `assetPreloader.ts` e `ExuraLoadingScreen.tsx` deve rodar com timeout de segurança e nunca travar o carregamento do jogador caso uma imagem pontual falhe ou a conexão esteja lenta.
