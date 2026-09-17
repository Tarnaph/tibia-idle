# Phase 182: Correção de Progressão e Recompensas + Otimização das Miniaturas

## 📌 Visão Geral da Entrega

A **Phase 182** resolveu de forma definitiva a regressão de persistência que rebaixava personagens de nível 5/6 de volta para o nível 1 e causava a aparente perda de gold e itens nos ratos (**Bloco A, prioridade máxima**), além de otimizar exclusivamente as miniaturas dos cards do modal de customização de outfits e montarias através de **Thumbnail Atlases** consolidados sob demanda (**Bloco B**), mantendo 100% intocado o pipeline de animações, composição, cores e movimentação estabilizado na Phase 181.

---

## 🛡️ Bloco A: Correção de Progresso e Recompensas (Prioridade Máxima)

### 1. Diagnóstico da Causa Raiz
- **Colisão de Autosave Concorrente:** O servidor Colyseus executava `performRoomAutoSave` a cada 20 segundos chamando `saveBatch`. Jogadores em caçada ativa (`p.inHunt === true`) tinham apenas estado defasado em memória no Colyseus (Level 1, 0 XP, inventário inicial vazio), gravando esse estado defasado no SQLite e incrementando a `saveVersion` para `version + 1`.
- **Reconciliação 409 Destrutiva:** Ao tentar persistir seu estado legítimo (Level 5/6, gold acumulado, loot), o cliente Web recebia `HTTP 409 VERSION_CONFLICT`. O handler do 409 adotava cegamente os dados defasados retornados pelo banco (`srv.level`, `srv.experience`, `srv.inventory.gold`), rebaixando o herói de volta ao Nível 1 e zerando o saldo.
- **Efeito Cascata no Próximo Rato:** Ao matar o rato subsequente no nível 1, o herói recebia 5 XP e avançava para o Nível 2, emitindo a mensagem incorreta `"You advanced from Level 1 to Level 2"`.
- **Divergência de Eventos:** O listener do banner de avanço utilizava `.find()` no histórico de eventos da caçada, capturando eventos antigos ao invés do avanço mais recente.

### 2. Implementação das Correções
- **Isolamento de Caçadores no Colyseus (`packages/server/src/rooms/ThaisCityRoom.ts`):**
  - Filtragem de `this.state.players.values()` em `performRoomAutoSave` e `onLeave`: jogadores com `inHunt: true` são estritamente excluídos do `saveBatch` do Colyseus urbano, preservando a autoridade da caçada.
- **Encaminhamento de Contexto na API (`app/api/characters/[id]/save/route.ts`):**
  - Repassa `options: { isHunting: Boolean(body.isHunting) }` para `CharacterService.saveCharacterProgress`.
- **Reconciliação Monotônica Estrita (`apps/web/components/GamePrototype.tsx`):**
  - No handler de 409, aplicação mandatória de limites inferiores:
    - `experience`: `Math.max(c.experience, srvExp)`
    - `level`: `Math.max(c.level, srvLvl, levelForExperience(reconciledExp))`
    - `gold`: `Math.max(curGold, srvGold)`
    - `loot` e `bag`: mesclados via `mergeLootStacks(curLoot, invResult.loot)`
    - `skills`: retenção do maior valor alcançado
  - Reagendamento imediato de retry save com a `saveVersion` atualizada do conflito.
- **Sincronização Contínua para o Colyseus (`apps/web/components/GamePrototype.tsx`):**
  - Despacho de `sendSyncProgress(curExp, level)` sempre que a experiência ou nível do personagem ativo evolui.
- **Correção do Banner de Nível:**
  - Uso de `.at(-1)` sobre eventos filtrados de `level-up`.
- **Telemetria de Progressão (`apps/web/lib/progressionDiagnostics.ts`):**
  - Módulo de rastreamento com correlação ponta a ponta de eventos (`level-up`, `save-attempt`, `save-success`, `save-conflict`, `reconcile`).

### 3. Validação do Bloco A
- Execução de script E2E `scripts/verify-phase182-progression.ts`:
  - Personagem de teste isolado `AtlasHeroAlpha` evoluído de Nível 1 até Nível 7 (2.600 XP).
  - 1.040 gold acumulado na caixa da party e queijos dropados nos ratos.
  - Autosave periódico registrado no banco (versão incrementada para 2).
  - Simulação de colisão 409 com servidor defasado: nível 7 e 2.600 XP 100% preservados.
  - Simulação de reinício completo do servidor e reconexão: dados relidos do SQLite confirmam Nível 7.
- Testes automatizados: `tests/phase182-progression-and-rewards-fix.test.ts` (6/6 aprovados).

---

## 🎨 Bloco B: Otimização das Miniaturas da Lista (Card Thumbnails)

### 1. Diagnóstico do Gargalo
- O modal `OutfitModal` exibe até 79 outfits e 126 montarias em um grid com barra de rolagem.
- Anteriormente, o componente `LazyCardImage` disparava dezenas de requisições individuais (`/generated/outfit-thumbs/citizen.png`, `/generated/mounts/donkey.png`), sobrecarregando o limite de 6 sockets do HTTP/1.1 e gerando latência visual cumulativa durante o scroll.

### 2. Implementação das Correções
- **Compilação de Thumbnail Atlases (`scripts/build-thumbnail-atlases.mjs`):**
  - `public/generated/atlases/outfit-thumbs-atlas.png` (640x512, 95 KB, 79 miniaturas).
  - `public/generated/atlases/outfit-thumbs-manifest.json`.
  - `public/generated/atlases/mount-thumbs-atlas.png` (768x704, 206 KB, 126 miniaturas).
  - `public/generated/atlases/mount-thumbs-manifest.json`.
- **Carregamento Sob Demanda (`apps/web/lib/thumbnailAtlasLoader.ts`):**
  - O atlas é requisitado apenas quando o modal de aparência é aberto ou quando a aba correspondente é selecionada.
  - Medições segregadas de primeiro acesso (**Cold Load**) e acesso subsequente (**Warm Render**).
- **Componente `CardThumbnail` (`apps/web/components/OutfitModal.tsx`):**
  - Renderiza via CSS background sprite positioning com coordenadas exatas extraídas do manifesto.
  - Fallback gracioso com `onError` para imagem individual caso a miniatura não conste no atlas.
  - Redução de mais de 200 requisições individuais para apenas 1-2 downloads consolidados de menos de 250 KB.
  - Zero alterações no preview do canvas, composição, cores ou arena.

### 3. Validação do Bloco B
- Testes automatizados: `tests/phase182-thumbnail-optimization.test.ts` (5/5 aprovados):
  - Existência e limites de tamanho dos arquivos de atlas.
  - Indexação correta dos outfits clássicos e montarias base.
  - Cold load medido em ~12ms em ambiente de teste (79 itens).
  - Warm lookup medido em < 1ms (meta < 100ms superada com folga).

---

## 🔄 Procedimento Operacional de Rollback

Caso seja necessária a reversão para a versão anterior (`v1.0-stable-phase181-atlases`):

> [!IMPORTANT]
> O comando `git checkout` isolado reverte apenas o código-fonte, sem atualizar o processo em execução no Node.js/Vinext e sem reiniciar o Colyseus. Jamais execute comandos que restaurem snapshots antigos do banco SQLite (`dev.db`), pois isso apagaria o progresso legítimo alcançado pelos jogadores.

### Passos de Rollback:
1. **Reverter o código para a tag estável da Phase 181:**
   ```bash
   git checkout v1.0-stable-phase181-atlases
   ```
2. **Reconstruir os bundles do frontend:**
   ```bash
   npx vinext build
   ```
3. **Reiniciar os processos no PM2:**
   ```bash
   pm2 restart colyseus-server tibia-web
   ```
4. **Preservação do Banco:**
   - O arquivo `prisma/dev.db` (ou `dev.db`) **NÃO** deve ser substituído. O schema Prisma é totalmente retrocompatível e preserva as colunas e integridade referencial.

---

## 📦 Segregação de Commits da Phase 182

1. **Bloco A (Progressão e Reconciliação):**
   - `177db055e`: `fix(progression): monotonic progress reconciliation, colyseus hunt save isolation, and rat rewards`
   - `3665c1753`: `test(progression): add end-to-end integration test for Phase 182 Bloco A`
   - `d9fc02a0b`: `test(types): fix BigInt literals and types in phase 182 test script`
2. **Bloco B (Miniaturas da Lista):**
   - `6fcd205be`: `perf(modal): optimize outfit and mount card thumbnails via consolidated atlases with on-demand loading`

---

## 🎯 Status Final
- **Phase 182:** Complete (100% testada e aprovada).
- **TypeScript:** 0 erros (`npm run typecheck`).
- **Vitest:** 100% de aprovação (31 testes executados na suíte da fase e segurança).
