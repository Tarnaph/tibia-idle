---
phase: 15-janela-compacta-de-inventario-tooltips-de-atributos-e-ilumin
plan: 01
subsystem: ui-ux-presentation
tags: [compact-inventory, item-tooltips, torch-lighting, tibia-fog-of-war, pixijs-lighting]
provides:
  - Janela de equipamentos e mochila reduzida e compacta (260px) com mini paperdoll embutido
  - Tooltips detalhados ao passar o mouse sobre qualquer item (ataque, defesa, armadura, peso oz, slots e requisitos)
  - Sistema de iluminação de tocha autêntico do Tibia no PixiJS com raio de luz quente e penumbra/escuridão de caverna
key-files:
  created:
    - apps/web/components/ItemTooltip.tsx
  modified:
    - apps/web/components/GamePrototype.tsx
    - apps/web/components/PixiArena.tsx
    - apps/web/components/window/WindowManagerContext.tsx
    - app/globals.css
completed: 2026-09-02
---

# Phase 15: Janela compacta de inventário, tooltips de atributos e iluminação de tocha estilo Tibia Summary

Atendidas integralmente as 3 solicitações de UI/UX registradas em `FIX.md`:

1. **Janela de Equipamento e Inventário Compacta:**
   - Reduzida a largura padrão de 340px para 260px em `WindowManagerContext.tsx`.
   - Adicionado mini-paperdoll integrado diretamente na janela com slots de 34px dispostos no formato clássico de boneco MMORPG (Elmo, Arma, Armadura, Escudo, Calças, Botas).
   - Grade da mochila compactada para 4 colunas com slots de 34px.

2. **Tooltips com Atributos ao Passar o Mouse:**
   - Criado o componente [ItemTooltip.tsx](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/ItemTooltip.tsx) e estilização com tema Tibia em `app/globals.css`.
   - Exibição de: Nome em destaque dourado, Slot/Posição, Ataque (vermelho), Defesa (azul/ciano), Armadura (verde), Peso em oz (amarelo) e Requisitos de Nível.
   - Integrado tanto no mini-paperdoll quanto em todos os slots da mochila e transferências por clique/arrasto.

3. **Sistema de Iluminação de Masmorra estilo Tibia com Tocha:**
   - Adicionada camada de penumbra ambiente (`darkness` com alpha 0.76) cobrindo toda a sala da masmorra no PixiJS.
   - Pré-renderizadas texturas radiais suaves de tocha com gradiente orgânico e leve oscilação (flicker de tocha).
   - Recorte de luz no escuro usando `blendMode: 'erase'` e camada de calor alaranjado de fogo com `blendMode: 'add'` centrada nos membros da party.
   - Áreas distantes e monstros distantes agora ficam na escuridão clássica de caverna do Tibia 8.60.

## Validação
- `npm run typecheck`: 0 erros no TypeScript.
- `npm run test`: 121 testes aprovados no Vitest (13/13 arquivos).
- Resposta HTTP 200 confirmada em `http://localhost:3000/game-preview`.
