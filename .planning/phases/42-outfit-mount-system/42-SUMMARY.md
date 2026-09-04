# Phase 42 Summary: Sistema de Outfits e Montarias para Party

## Resumo da Execução
Nesta fase, implementamos de ponta a ponta o sistema completo de seleção de Outfits e Montarias para todos os 4 membros da party, com menu de contexto de clique direito, estética clássica Tibia 11 dark-slate e dourado, e persistência em tempo real nas arenas urbana (Thais) e de caçada (Pixi).

### 1. Modelagem de Dados & Tipos
- **`packages/domain/src/types.ts`:**
  - Estendido `CharacterState` com campos opcionais:
    - `outfit?: string`: identificador do outfit selecionado (ex: `'Sire'`, `'Knight'`, `'Paladin'`).
    - `mount?: string`: identificador da montaria selecionada (ex: `'war-horse'`, `'midnight-panther'`).
    - `mountActive?: boolean`: estado montado/a pé com bônus de velocidade (+20).
    - `addons?: number`: bitmask de addons (Addon 1 = 1, Addon 2 = 2).
    - `outfitColors?: { head: number; primary: number; secondary: number; detail: number }`.

### 2. Componentes Criados & Estilizados
- **`apps/web/components/OutfitModal.tsx`:**
  - Janela ornamental modal estilo Tibia 11 com abas superiores para alternar entre os 4 membros da party.
  - Abas "Outfits" e "Montarias".
  - Stage pedestal com visualização ao vivo, ciclo animado de caminhada/respiração e botões de rotação 360° (`<` e `>`).
  - Checkboxes para Addon 1 e Addon 2.
  - Paleta com 16 cores clássicas do Tibia (Head, Primary, Secondary, Detail).
  - Suporte completo ao outfit personalizado `Sire` e vocações clássicas.
  - Lista de montarias (War Horse, Midnight Panther, Widow Queen, Shadow Draptor, etc.) com toggle montado/a pé.
- **`apps/web/components/CharacterContextMenu.tsx`:**
  - Menu de contexto de clique direito com cabeçalho do personagem, botão "Set Outfit", toggle de montaria ("Montar/Desmontar") e fechar.
- **`app/globals.css`:**
  - Estilização completa do modal `.outfit-modal-card`, backdrop, pedestal de visualização, paleta de cores e botões de ação beveled.

### 3. Integração com Arenas e Interface
- **`apps/web/components/GamePrototype.tsx`:**
  - Gerenciamento de estado de modal de outfit e menu de contexto de clique direito.
  - Handler `handleSaveOutfit` e `handleToggleMount` sincronizando as mudanças no `session.characters`.
  - Ativação de bônus de velocidade no cálculo de `playerSpeed` quando montado.
  - Botão de atalho `🥋` e evento `contextmenu` adicionados nos cards da janela de party.
  - Callback `onCharacterContextMenu` integrado em `ThaisCityArena` e `PixiArena`.
  - Integração no `WindowDockBar` permitindo clique direito ou botão "Outfit" no nome do personagem ativo.
- **`apps/web/components/ThaisCityArena.tsx`:**
  - Atualização do mapeamento de textura dinâmica priorizando `char.outfit || char.vocation`.
  - Captura de clique direito no canvas com detecção de proximidade aos membros da party para abrir o menu de contexto.
- **`apps/web/components/PixiArena.tsx`:**
  - Resolução dinâmica de sprites de party usando `char.outfit || char.vocation`.
  - Event mode interativo no clique direito sobre personagens da party para acionar o menu de contexto.

### 4. Verificação e Testes
- **TypeScript:** `npm.cmd run typecheck` executado com 0 erros de tipagem.
- **Vitest:** 38/38 suítes de testes aprovadas, 243 testes passando com 100% de sucesso.
- **Novo teste dedicado:** `tests/phase42-outfit-mount-selection.test.ts`.
