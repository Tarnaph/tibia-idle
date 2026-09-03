# Phase 21 Summary: Magias, Poções, Runas, Hotkeys Inteligentes e Animações Oficiais

## 📌 Visão Geral da Entrega
Conforme solicitado nas regras e no [FIX.md](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/FIX.md), esta fase implementou:
1. **Hotkeys Default Vazias:**
   - Todo novo personagem é criado com `hotbar: []` (em vez de magias pré-fixadas), exibindo os slots vazios `▫ ▫ ▫ ▫` com rótulos `[F1..F12]` e `[1..0]`.
   - O jogador configura livremente magias, poções e runas clicando em qualquer slot para abrir o modal de configuração autêntico.
2. **Auto-Cast Inteligente por Necessidade:**
   - **Cura & Poções de Vida Reativa:** Ao sofrer qualquer dano ou ter HP < 88%, aciona imediatamente a poção de vida equipada e/ou feitiços de cura (`exura`, `exura gran`, `exana mort`, `exura san`, `exura sio`).
   - **Poções de Mana Reativa:** Consome poção de mana automaticamente quando a reserva cair abaixo de 70%.
   - **Recast Contínuo de Buffs:** Recasta automaticamente `Haste` (`utani hur`), `Strong Haste` (`utani gran hur`), `Magic Shield` (`utamo vita`) e `Blood Rage` (`utito tempo`) imediatamente ao término da duração.
   - **Absorção de Dano por Mana (Utamo Vita):** Quando o Magic Shield está ativo, ataques inimigos reduzem Mana antes de encostar no HP.
   - **Magias e Runas de Ataque:** Dispara automaticamente feitiços de dano e runas (`exori`, strikes elementais, waves, `SD`, `GFB`, `Explosion`) assim que houver alvos vivos no alcance.
3. **Disparo Manual por Teclado e Mouse:**
   - Teclas de atalho funcionais: `F1-F12` (linha 1) e `1-0` (linha 2).
   - Clique com botão esquerdo para usar a ação imediatamente no combate; botão direito para reconfigurar o slot.
4. **Extração de 100% dos Efeitos Mágicos e Projéteis Oficiais do Tibia:**
   - Todos os **70 efeitos mágicos** (1 ao 70) e todos os **42 projéteis** (1 ao 42) do `Tibia.dat`/`Tibia.spr` foram extraídos com precisão para `content/generated/tibia860-assets.json` e `public/sprites/`.

---

## 🛠️ Modificações Realizadas
- [`packages/domain/src/party.ts`](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/packages/domain/src/party.ts): `hotbar: []` por padrão no `createCharacter`.
- [`packages/domain/src/types.ts`](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/packages/domain/src/types.ts): Adicionados campos `magicShieldUntil`, `bloodRageUntil` e `lastHitTakenAt` em `PartyActorState`.
- [`packages/domain/src/combat.ts`](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/packages/domain/src/combat.ts):
  - Lógica prioritária e reativa em `castAutomaticSpells`.
  - Absorção de dano por mana em `enemyAttacks`.
  - Nova função exportada `triggerManualHotbarAction`.
- [`packages/tibia860-assets/src/extractor.ts`](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/packages/tibia860-assets/src/extractor.ts): Extração completa de todos os 70 efeitos e 42 projéteis do `Tibia.dat`.
- [`packages/styller-importer/src/importSpells.ts`](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/packages/styller-importer/src/importSpells.ts): Inclusão oficial de `Magic Shield` e `Strong Haste`.
- [`packages/styller-importer/src/importMonsters.ts`](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/packages/styller-importer/src/importMonsters.ts): Preservado XP boost de 5000 para testes rápidos.
- [`apps/web/components/BottomConsoleHUD.tsx`](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/BottomConsoleHUD.tsx):
  - Slots vazios autênticos com indicadores `▫ ▫ ▫ ▫` e teclas `F1..F12` / `1..0`.
  - Clique esquerdo para acionamento manual; clique direito para configuração.
- [`apps/web/components/BottomDock.tsx`](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/BottomDock.tsx) e [`apps/web/components/GamePrototype.tsx`](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/GamePrototype.tsx):
  - Listener global de teclas de atalho (`F1-F12`, `1-0`).
  - Handler de acionamento manual via `triggerManualHotbarAction`.
- [`tests/hotkeys-combat-system.test.ts`](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/tests/hotkeys-combat-system.test.ts): Suíte completa cobrindo 8 cenários determinísticos.

---

## 🧪 Verificação & Qualidade
- `npm run typecheck`: **0 erros de tipagem**.
- `npm run test`: **16/16 suítes passando, 142/142 testes (100% de aprovação)**.
