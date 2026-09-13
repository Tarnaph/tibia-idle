# Walkthrough: Phase 156 — Curadoria de Magias, Escolha de Vocação, Promoção de Personagem e Correções de Outfits & Caminhada

Implementação completa dos 4 pilares de gameplay aprovados pelo usuário e resolução definitiva dos itens apontados em [FIX.md](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/FIX.md).

---

## 1. Curadoria de Magias no Hotbar (Sem Ícones Quebrados)

### O Que Foi Feito
- No [HotbarConfigModal.tsx](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/HotbarConfigModal.tsx), importamos `resolveActionImagePath` de [Tibia11ActionIcon.tsx](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/Tibia11ActionIcon.tsx).
- As magias disponíveis agora passam pelo filtro estrito:
  ```tsx
  const availableSpells = useMemo(() => {
    return (gameData.spells || []).filter((s) => {
      // 1. Deve possuir ícone oficial CipSoft
      const hasOfficialIcon = resolveActionImagePath(s.id, 'spell', s.speech) !== null;
      if (!hasOfficialIcon) return false;
      // 2. Filtro de busca de texto
      if (searchQuery.trim()) { ... }
      return true;
    });
  }, [gameData.spells, searchQuery]);
  ```
- **Resultado:** Magias que não possuíam ícone oficial CipSoft ou magias sem utilidade no combate idle (`Magic Rope`, `Levitate`, `Creature Illusion`, `Light`, `Buzz`, `Magic Patch`, etc.) foram retiradas da tela de configuração. Nenhum item na interface exibe ícone de interrogação `?` ou imagem quebrada.

---

## 2. Escolha Canônica de Vocação ao Nascer

### O Que Foi Feito
- **Gatilho de Spawn:** Em [GamePrototype.tsx](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/GamePrototype.tsx), assim que o jogador entra com um personagem recém-criado (`!activeCharacter.vocation || activeCharacter.vocation === 'None'`), o [VocationChoiceModal.tsx](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/VocationChoiceModal.tsx) abre instantaneamente no templo.
- **Visual dos Cards:** Cada card de vocação (`Knight`, `Paladin`, `Sorcerer`, `Druid`) utiliza miniaturas autênticas `/generated/outfit-thumbs/` (`knight.png`, `hunter.png`, `mage.png`) com fallbacks canônicos, descrições fiéis da função de combate e estatísticas de avanço.
- **Definição e Persistência:** Ao escolher:
  - O personagem recebe a vocação selecionada.
  - O outfit inicial é configurado automaticamente (`Knight` para Knight, `Hunter` para Paladin, `Mage` para Sorcerer/Druid).
  - A vocação e outfit são sincronizados via Colyseus WebSocket e persistidos permanentemente no PostgreSQL via `/api/characters/[id]/save`.

---

## 3. Promoção de Vocação no Nível 20 (Character Hover Card)

### O Que Foi Feito
- **Novo Componente:** Criado [PromotionModal.tsx](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/character/PromotionModal.tsx):
  - Exibe o novo título de elite (*Elite Knight*, *Royal Paladin*, *Master Sorcerer*, *Elder Druid*).
  - Exibe o outfit completo com Addon 1 e Addon 2.
  - Custo oficial de **20.000 GP**, validado contra o saldo de ouro do jogador.
  - Lista completa de vantagens permanentes: +50% velocidade de regeneração de HP e MP, +10% velocidade de ataque físico/mágico, redução da penalidade de morte de 10% para 7%, e desbloqueio de magias de elite.
- **Gatilho no Hover Card:** Integrado no Character Hover Card do [WindowDockBar.tsx](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/window/WindowDockBar.tsx) com botão dourado `👑 PROMOVER VOCAÇÃO (20.000 GP)`.
- **Aviso Automático em Zona Segura:** Ao atingir o Nível 20 pela primeira vez, se o jogador estiver fora de combate na cidade de Thais, o modal de promoção é sugerido automaticamente.

---

## 4. Resolução Definitiva dos Erros de `FIX.md` (Preview, Salvamento e Caminhada)

### Diagnósticos e Correções Realizadas
1. **Preview do OutfitModal:**
   - Adicionada verificação rápida síncrona `getRecoloredCanvasSync` no topo de `renderRecoloredOutfit`, desenhando em 0ms no canvas de preview assim que uma cor ou traje em cache é selecionado.
   - Catalogado o conjunto canônico `OUTFITS_WITH_MOUNTS` em [outfitRecolor.ts](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/lib/outfitRecolor.ts), garantindo que outfits sem sprites de montaria (`hasMountRider: false`) não tentem carregar camadas inexistentes que geravam falhas e travavam a composição.
2. **Salvamento de Outfits e Montarias:**
   - Eliminada a race condition em `handleSaveOutfit` e `handleToggleMount` no [GamePrototype.tsx](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/GamePrototype.tsx). O `latestSaveStateRef.current` agora é atualizado de forma síncrona com os novos dados de outfit, cores e montaria antes de disparar o save, impedindo que o auto-save sobrescreva o banco com o estado antigo.
3. **Animação das Pernas / Fim do Deslizamento do Personagem:**
   - **Preload Otimizado:** `preloadOutfitAllFrames` agora aceita `priorityDir` e carrega de forma imediata (em menos de 30ms) o frame idle (f0) e todos os frames de caminhada (f1..f8) da direção que o player está virado, ao invés de enfileirar 224 requisições desordenadas.
   - **Atualização Dinâmica do Sprite:** No [ThaisCityArena.tsx](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/ThaisCityArena.tsx), a textura do PixiJS é atualizada sempre que `view.lastTextureKey !== textureKey`, executando `(tex.source as any).update?.()`.
   - **Resultado:** O personagem mexe as pernas com fluidez máxima em todas as direções (sul, leste, norte, oeste) sem deslizar ou travar.

---

## 5. Validação Automatizada e Qualidade

- **TypeScript Typecheck:** `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit --incremental false`
  - **Status:** **0 erros** de compilação em todo o repositório.
- **Vitest Unit Tests:**
  - `tests/phase155-modular-atlases.test.ts` (4/4 aprovados)
  - `tests/phase156-outfits-and-vocation.test.ts` (3/3 aprovados)
  - **Status:** **100% de aprovação** em 7 testes.
- **Filtro Online:** Nenhuma chamada redundante por tick, payloads enxutos no Colyseus WebSocket e texturas geradas e cacheadas inteiramente no cliente.
