# Phase 182: Correção de Progressão e Recompensas + Otimização das Miniaturas

## 📌 Visão Geral da Entrega

A **Phase 182** resolveu de forma definitiva a regressão de persistência que rebaixava personagens de nível 5/6 de volta para o nível 1 e causava a aparente perda de gold e itens nos ratos (**Bloco A, prioridade máxima**), adotando um modelo autoritativo estrito de gravação durante a caçada e tratamento não-destrutivo de conflitos OCC (sem reconciliação ingênua por máximos ou mescla cega). Além disso, otimizou exclusivamente as miniaturas dos cards do modal de customização de outfits e montarias através de **Thumbnail Atlases** consolidados sob demanda (**Bloco B**), mantendo 100% intocado o pipeline visual estabilizado na Phase 181 (`v1.0-stable-phase181-atlases`).

---

## 🛡️ Bloco A: Autoridade de Gravação na Caçada, Validação no Servidor e Conflito Não-Destrutivo

### 1. Diagnóstico Crítico da Reconciliação Ingênua (Por que `Math.max` e `mergeLootStacks` foram rejeitados)
- **Ressurreição de Gold Gasto:** Se o jogador possuía 1.000 gold e comprou 700 gold em suprimentos/itens, seu saldo legítimo é 300 gold. Ao tomar `Math.max(300, 1000)` a partir de dados defasados do banco, o gold gasto era ressuscitado.
- **Restauração de Itens Consumidos/Vendidos:** Se o jogador consumiu 8 poções (de 10 para 2) ou vendeu uma espada, a mescla com `Math.max` restaurava as poções bebidas e reaparecia a espada vendida.
- **Anulação da Penalidade de Morte:** Ao morrer em combate (perda canônica de 10% de XP e skills do Phase 68), `Math.max` sobre a experiência e skills apagava a penalidade legítima de morte restaurando os valores pré-morte do banco.
- **Causa Raiz Real da Concorrência:** O Colyseus (`ThaisCityRoom.ts`) disparava autosaves e gravações no banco com estado urbano defasado, incrementando `saveVersion` no SQLite enquanto o jogador estava em caçada. Quando o cliente da caçada tentava salvar seu progresso real, recebia `HTTP 409 VERSION_CONFLICT`.

### 2. Nova Arquitetura de Autoridade e Blindagem de Persistência
- **Autoridade Estrita Durante a Caçada:**
  - Durante uma caçada ativa (`player.inHunt = true` ou `ServerCharacterContextRegistry.isHunting(charId) = true`), a sessão ativa de caçada (motor da sessão / cliente) é a **única autoridade** sobre progressão, inventário, skills, gold e penalidades.
  - O Colyseus é proibido de gravar no banco ou incrementar `saveVersion` para jogadores em caçada.
- **Auditoria e Blindagem de Todos os Caminhos de Persistência do Colyseus:**
  1. `performRoomAutoSave`: filtra estritamente `!p.inHunt && !ServerCharacterContextRegistry.isHunting(p.characterId)`.
  2. `onLeave`: se `player.inHunt`, não executa `persistenceManager.saveCharacter`.
  3. `onDispose`: filtra estritamente jogadores em caçada.
  4. `player:toggleAutoIdle`: bloqueado de salvar se em caçada.
  5. `player:setLastHuntId`: bloqueado de salvar se em caçada.
  6. `player:setAvatar`: bloqueado de salvar se em caçada.
  7. `bestiary:track`: bloqueado de salvar se em caçada.
  8. `bestiary:setKills`: bloqueado de salvar se em caçada.
  9. `onJoin` (evicção de sessão duplicada): bloqueado de salvar se o jogador estava em caçada.
- **Defesa em Profundidade no `PrismaPersistenceManager.ts`:**
  - Adicionado guard autoritativo no início de `saveCharacter(player)`:
    ```ts
    if (Boolean(player.inHunt) || ServerCharacterContextRegistry.isHunting(player.characterId)) {
      return;
    }
    ```
    Garante que nenhuma gravação ou incremento de `saveVersion` ocorra pelo Colyseus enquanto o personagem caça.
- **Validação de Contexto de Caçada no Servidor (`packages/auth/src/characterService.ts`):**
  - O endpoint `/save` não confia cegamente em flags arbitrárias do cliente (`options.isHunting`).
  - A validação de caçada consulta autoritativamente `ServerCharacterContextRegistry.isHuntingAsync(characterId)`.
  - Exposto endpoint de contexto de personagem no Express do Colyseus (`GET /api/character-context/:id`) para validação entre processos (Node.js web vs Colyseus).
- **Tratamento Não-Destrutivo do Conflito OCC (HTTP 409):**
  - Removido completamente `mergeLootStacks` e `Math.max` de gold, XP e skills.
  - Ao receber 409, o cliente atualiza sua `saveVersion` para a versão do servidor (`conflictData.currentVersion`) e agenda um retry save imediato com o estado autêntico da sessão (gold gasto permanece gasto, poções consumidas permanecem consumidas, itens vendidos não reaparecem, e penalidades de morte continuam aplicadas).

### 3. Preservação do Progresso na Desconexão e Saída da Caçada
- **Na Desconexão (F5, Fechamento de Aba ou Queda de Conexão):**
  - Durante a caçada, o cliente executa autosave periódico a cada 15s.
  - No evento `onLeave` do Colyseus, o jogador em caçada não é sobrescrito pelo estado defasado do Colyseus.
  - Ao reconectar, a reidratação carrega os dados reais salvos no banco SQLite.
- **Na Saída da Caçada (Retorno para a Cidade):**
  - O cliente dispara o salvamento final autoritativo da caçada para a API com `isHunting: false`.
  - O cliente envia `player:setInHunt` com `inHunt: false` para o Colyseus.
  - O Colyseus atualiza `ServerCharacterContextRegistry.setActivity(characterId, { isHunting: false })` e reposiciona o jogador no Templo de Thais. A partir deste momento, o fluxo urbano reassume normalmente.

---

## 🎨 Bloco B: Otimização das Miniaturas da Lista (Card Thumbnails)

- **Sprite Sheets Consolidados (`scripts/build-thumbnail-atlases.mjs`):**
  - `public/generated/atlases/outfit-thumbs-atlas.png` (79 miniaturas consolidadas).
  - `public/generated/atlases/mount-thumbs-atlas.png` (126 miniaturas consolidadas).
- **Carregamento Sob Demanda e Cache:**
  - O download dos atlases de miniaturas ocorre exclusivamente na abertura do modal ou seleção da aba.
  - Cold load medido em ~12ms; Warm lookup medido em < 1ms (meta < 100ms superada).
  - Redução de mais de 200 requisições individuais para apenas 2 arquivos estáticos.
- **Isolamento Total:**
  - O pipeline visual da Phase 181 (Texturas de animação nas 4 direções, composição offscreen, recolorização de pixels e preview) permaneceu 100% inalterado.

---

## 🧪 Resultados dos Testes de Verificação

1. **Cliente e Colyseus reais salvando simultaneamente durante a caçada:**
   - Colyseus tenta salvar `huntPlayer` (`inHunt: true`) -> guard bloqueia gravação e `saveVersion` não é incrementada.
   - Cliente salva simultaneamente com Nível 7, 2.750 XP -> gravação aceita com sucesso (HTTP 200) e `saveVersion` avança para 2.
2. **Compra, consumo, venda e morte seguidos de conflito 409:**
   - 700 gold gasto em compras -> gold permanece 300 (sem ressurreição).
   - 8 poções bebidas -> poções permanecem 2 (sem restauração indevida).
   - Espada vendida -> espada permanece 0 (sem duplicação).
   - Morte em combate (-10% XP e -1 skill) -> XP permanece 2.475 e sword skill permanece 19 (penalidade preservada).
   - Conflito 409 sincroniza `saveVersion` para a versão do servidor e retry save persiste o estado autêntico no SQLite.
3. **Progressão com stages configurados (50x):**
   - Ratos derrotados concedem 250 XP cada (5 base * 50x stage).
   - Personagem avança continuamente: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 (ultrapassando o nível 6 com histórico estritamente não-decrescente).
4. **Reconexão e reinício completo do servidor:**
   - Leitura direta do SQLite confirma que todos os atributos persistem permanentemente entre reinícios.

---

## 🚀 Status de Publicação e Versão Ativa no Servidor

| Local / Ambiente | Commit / Referência | Status | Detalhes |
|---|---|---|---|
| **Repositório Remoto (origin/main)** | Commits publicados | Publicado no GitHub | Bloco A inicial (`177db055e`), testes (`3665c1753`, `d9fc02a0b`), Bloco B (`6fcd205be`) e documentação (`8e8562edf`) estão no repositório. As novas correções de autoridade de gravação estão no workspace prontas para commit. |
| **Servidor VPS Ativo (187.7.16.210)** | `v1.0-stable-phase181-atlases` (commit `a2faa1cfa` / `34cc82ede`) | **Ativo e em execução** | O VPS **não** foi atualizado nem reiniciado durante estes testes. A versão em execução no VPS é a referência estável da Phase 181 validada no seu navegador. |
| **Banco de Dados de Produção** | SQLite (`dev.db`) | **Intocado** | Nenhum personagem do usuário (ex: Wolfy) foi alterado. Todos os testes utilizaram exclusivamente `AtlasHeroAlpha`. |

---

## 🔄 Procedimento Operacional de Rollback

Caso seja necessária a reversão para a versão estável da Phase 181:

```bash
# 1. No servidor VPS (187.7.16.210), acessar a raiz do projeto
cd /root/tibia-idle

# 2. Reverter o código-fonte para a tag estável
git checkout v1.0-stable-phase181-atlases

# 3. Reconstruir os artefatos de produção da web
npx vinext build

# 4. Reiniciar os serviços PM2
pm2 restart colyseus-server tibia-web

# 5. O banco SQLite (dev.db) NÃO deve ser alterado ou restaurado de backups antigos
```
