# Resumo da Fase 254: Correções dos 11 Itens Críticos do Backlog (FIX.md)

## Status: Concluída com Sucesso (100% Aprovada)

### 📌 Resumo Executivo
A Fase 254 resolveu integralmente os 11 itens críticos listados no arquivo `FIX.md`, abrangendo correções de interface e direção de arte canônica, regras de domínio e persistência, slots de inventário e combate com linha de visão (LOS), mecânicas de treino, sistema de montarias com bônus de velocidade, otimização de renderização contra Out of Memory (OOM) no modo AFK e isolamento autoritativo para evitar clones fantasmas em Thais.

---

### 🚀 Itens Implementados e Validados

#### Onda 1: Interface & Iconografia Canônica Tibia 11/12 (Itens 1, 2, 7)
1. **Rastreador de Bestiário (`BestiaryTrackerHUD.tsx`):**
   - Implementado estado vazio canônico ("Comece a rastrear monstros" com botão "Abrir Cyclopedia").
   - Suporte para exibição e abertura mesmo sem criaturas rastreadas previamente.
   - Ícone lineart SVG exclusivo de cabeça de monstro inserido no dock bar.
2. **Dock Bar & Chat Sanitizados de Emojis (`WindowDockBar.tsx`, `ChatWindow.tsx`):**
   - Erradicação completa de emojis de SO (trocados por lineart SVGs ou texto puro como `LOJA`).
   - Botão dedicado de Customizar Aparência / Outfit & Montaria restaurado.
   - Popover de Inspeção e Atributos padronizado no tema Dark Stone com sprites autênticos (`/assets/items/item-2376`, etc.).

#### Onda 2: Itens, Equipamentos & Loja Flutuante (Itens 5, 8, 9)
3. **10 Slots de Equipamento (`types.ts`, `characterHydration.ts`):**
   - Habilitação formal de `neck`, `backpack` e `ammo` no paperdoll e tipos de domínio.
4. **Validação Rígida de Compatibilidade & Armas Two-Handed (`equipment.ts`, `InventoryWindow.tsx`):**
   - `preferredSlotForItem` rejeita terminantemente itens não-equipáveis (potions, comidas, runas, gold).
   - Validação de drop com `isCompatibleEquipmentSlot`.
   - Empunhar armas de duas mãos desequipa automaticamente o escudo/item da outra mão, devolvendo-o com segurança ao inventário sem perda de itens.
5. **Loja da Cidade Arrastável com Abas COMPRAR / VENDER (`ShopWindow.tsx`, `economy.ts`):**
   - Janela livremente arrastável via `position: 'fixed'`.
   - Aba VENDER listando itens da Mochila e da Bolsa.
   - Seletor de quantidade com botão "TUDO", cálculo de valor unitário e crédito instantâneo de GP.

#### Onda 3: Combate, Retargeting Adjacente & Linha de Visão (Itens 4, 6)
6. **Treino de Dummy do Paladino & Auto-Seleção de Skill (`training.ts`):**
   - Paladinos avançam `shielding` no boneco de treino mesmo equipados com arco/besta (duas mãos).
   - `getDefaultTrainingSkill` prioriza a arma equipada (Sword, Axe ou Club) antes do fallback.
7. **Linha de Visão Canônica (LOS Bresenham) & Autodefesa Melee (`pathfinding.ts`, `combat.ts`, `movement.ts`):**
   - `hasLineOfSight` verifica tiles sólidos e não-andáveis (paredes, portas fechadas, rochas).
   - Magias direcionadas, runas, flechas, lanças e ataques à distância respeitam rigorosamente paredes.
   - Knights travados fora do alcance corpo a corpo retargetam automaticamente monstros adjacentes colados (`dist <= 1`).

#### Onda 4: Montarias, Sistema AFK Anti-OOM & Anti-Clone (Itens 3, 10, 11)
8. **Velocidade de Montarias Escalonada por Tier (`appearancePermissions.ts`, `OutfitModal.tsx`):**
   - Free (+20 Spd), Premium (+40 Spd) e Store (+60 Spd) ativos quando montado.
   - Montarias disponíveis e free listadas no topo da modal com compra por 20.000 GP.
9. **Sistema AFK & Eliminação de OOM (`ThaisCityArena.tsx`, `GamePrototype.tsx`, `PlayerState.ts`):**
   - Detecção de ausência (> 2 min ou aba oculta) com etiqueta `[AFK] Zzz` sobre o personagem.
   - Throttling do ticker para ~5 FPS durante AFK, reduzindo consumo de CPU/GPU em mais de 90%.
   - Limite estrito de no máximo 30 partículas ativas (`timedCityVisuals.length > 30`) com limpeza via `destroyVisualNode`.
10. **Eliminação de Clones e Fantasmas em Thais (`CityPartyHandler.ts`, `ThaisCityRoom.ts`, `ThaisCityArena.tsx`):**
    - Servidor marca autoritativamente `inHunt = true` e `posZ = 8` em personagens em caçada.
    - Arena de Thais descarta da renderização remota jogadores com `inHunt === true` ou `posZ > 7`.

---

### 🧪 Verificação & Testes
- **Testes Unitários e Integração:** `tests/phase254-correcoes-11-itens-fix.test.ts` (9/9 testes passando, 100% de aprovação).
- **Testes de Regressão:** `phase65`, `phase57`, `phase218`, `phase42`, `phase142`, `phase129` todos verdes.
- **Typecheck TypeScript:** 0 erros (`npm run typecheck`).
- **Estado no FIX.md:** Todos os 11 itens marcados com `[x]`.
