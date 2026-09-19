# Phase 198: Visual Standardization & Royal Dark Stone Unification - Summary

## Overview
Phase 198 delivers complete visual harmonization across all 7 core interface windows, modals, and dock components to match the authentic "Royal Dark Stone" identity pioneered by the **Arena PvP** (`ArenaPvPModal.tsx`) and **Ranking** (`HighscoresModal.tsx`) systems.

## Key Changes Delivered

### 1. Central Design System & Draggable Windows (`app/globals.css`)
- **Draggable Window Shells (`.draggable-window`)**: Standardized with `#1e2022` stone base, `1.5px solid #4a4d52` border, `box-shadow: 0 12px 40px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.1)`.
- **Titlebars (`.window-header`, `.window-title`)**: Height `32px`, background `#18191b`, border-bottom `1px solid #33363a`, centered title in `Georgia, serif`, color `#f3c769` (royal gold), `text-shadow: 0 2px 4px rgba(0,0,0,0.8)`.
- **Window Controls (`.window-btn`)**: `#151618` base, `#282a2e` border, `#8b8e93` text. Hover in `#25272a` with `#f3c769` text. Red hover on close button.
- **Fixed Chat Dock (`.fixed-chat-dock`, `.fixed-chat-body`)**: Converted from old green tint to `#1e2022`, border `#4a4d52`, header `#18191b`, and body `#141517`.

### 2. Caçadas, Treinamento & Quests (`apps/web/components/HuntSelector.tsx`)
- **Subheaders & Search Bar**: Converted to `#151618` and `#161719` with `#2d3035` and `#2a2c30` borders. Input box uses `#121315` and `#33363a`.
- **Catalog Cards**: Converted from blue tint to `#161719` with `#2a2c30` border. Hover state elevated to `#1f2124` with `#f3c769` gold border.
- **Pulls & Setup**: Converted tabs to `#151618` (inactive) and `#2d3035` with `#f3c769` text (active).
- **Primary Action Buttons**: Gold gradient `linear-gradient(180deg, #eab308 0%, #ca8a04 100%)`, border `1px solid #facc15`, text `#18191b`, font `Georgia, serif`.
- **Treino Tab**: Cards upgraded from blue `#1a243a` to `#161719` / `#27292c` with `#facc15` border on selection and `Georgia, serif` `#f3c769` title.
- **Quests Inline Tab**: Fully implemented in-modal Quest Log with 5 canonical quests (`thais-sewers`, `cyclops-threat`, `dragon-lair`, `ancient-blessings`, `rookie-training`), status badges (`EM ANDAMENTO`, `DISPONÍVEL`, `CONCLUÍDA`), level requirements, lore descriptions, interactive objectives checklist, reward cards (XP, gp, item drops), and "Rastrear Missão" action button.

### 3. Lista de Amigos / VIP (`apps/web/components/window/FriendsWindow.tsx`)
- **Search & Add Friend**: Input container styled with `#161719` and `#33363a`. Button styled with `#27292c`, `#4a4d52` border, and `#f3c769` gold text.
- **Row Items & Selection**: Hover updated to `#202225`, selection updated to `#27292c` with `#facc15` border. Row message button updated to `#27292c` and `#4a4d52`.
- **Selected Friend Card**: Card styled with `#161719` and `#33363a`. "Mandar Mensagem" button updated to Royal Gold gradient `linear-gradient(180deg, #eab308 0%, #ca8a04 100%)` with `#18191b` text.
- **Footer & Context Menu**: Converted to `#18191b` and `#27292c` with `#f3c769` highlights.

### 4. Party Management (`apps/web/components/party/UnifiedPartyModal.tsx`)
- **Header**: Eliminated old vintage octagonal ruby plaque in favor of the clean Royal Dark Stone header (`#18191b`, `#33363a` border, `Georgia, serif` `#f3c769` title, clean `✕` button).
- **Top Tabs**: Formação do Time / Táticas & Sinergia styled with `#151618` (inactive) and `#2d3035` with `#f3c769` text (active).
- **Synergy Badge**: Styled with `#151618` and `#facc15` border.
- **Action Buttons**: "+ Convidar Jogador" updated to `#27292c`, "Escolher Caçada em Grupo" updated to Royal Gold gradient with Georgia font.

### 5. Chat Window (`apps/web/components/chat/ChatWindow.tsx`)
- **Tab Strip**: `#151618` background with `#2d3035` border. Local, World, and Private tabs use `#2d3035` with `#f3c769` text and bottom gold border `2px solid #f3c769` when active.
- **Messages List**: Background updated to sleek `#121315`.
- **Chat Input Bar**: Background `#18191b`, border `#33363a`. Input field `#141517`.
- **Send Button**: Gold gradient `linear-gradient(180deg, #eab308 0%, #ca8a04 100%)` with `#18191b` text.

### 6. Hotkeys Config Modal (`apps/web/components/HotbarConfigModal.tsx` & `app/globals.css`)
- **Window Container**: `#1e2022`, border `2px solid #4a4d52`.
- **Header**: `#18191b`, `Georgia, serif` `#f3c769` title.
- **Tabs & Cards**: Magias / Runas / Itens in `#151618` / `#2d3035` / `#f3c769`. Action cards in `#1b1c1e` with gold border on selection.
- **Save Button**: Converted from blue to Royal Gold gradient `linear-gradient(180deg, #eab308 0%, #ca8a04 100%)` with Georgia font.
- **Clear Buttons**: Harmonized with `#271717`, `#7f1d1d`, and `#fca5a5`.

## Verification Results
- `npm run typecheck`: **0 errors** (PASSED).
- `vitest tests/phase198-design-system-unification.test.ts`: **9/9 tests passed**.
- `vitest tests/phase196-hunt-pacing-and-arena-pulls.test.ts`: **5/5 tests passed**.
