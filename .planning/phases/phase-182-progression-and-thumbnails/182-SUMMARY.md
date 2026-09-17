# Phase 182: Correção de Progressão e Recompensas + Otimização das Miniaturas

## 📌 Visão Geral da Entrega

A **Phase 182** resolveu de forma definitiva a regressão de persistência que rebaixava personagens de nível 5/6 de volta para o nível 1 e causava a aparente perda de gold e itens nos ratos (**Bloco A, prioridade máxima**), adotando um modelo autoritativo estrito de gravação durante a caçada e tratamento não-destrutivo de conflitos OCC com validação de titularidade da sessão (write lease). Além disso, otimizou exclusivamente as miniaturas dos cards do modal de customização de outfits e montarias através de **Thumbnail Atlases** consolidados sob demanda (**Bloco B**), mantendo 100% intocado o pipeline visual estabilizado na Phase 181 (`v1.0-stable-phase181-atlases`).

---

## 🛡️ Bloco A: Autoridade de Gravação na Caçada, Posse Exclusiva da Sessão e Handshake de Retorno

### 1. Garantia 1: Conflito Real e Direito Exclusivo de Gravação da Sessão (Session Write Lease)
- **Problema Abordado:** Atualizar `saveVersion` e reenviar snapshot local após 409 só é seguro se o servidor comprovar que aquela sessão ainda detém o direito exclusivo de gravar. Uma sessão antiga (ou aba concorrente) não pode sobrescrever compras, itens consumidos/vendidos ou penalidades de morte confirmadas pela nova sessão.
- **Solução Implementada:**
  - `ServerCharacterContextRegistry` rastreia o `activeSessionId` autoritativo para cada personagem.
  - No login/conexão de uma nova sessão (`onJoin`), o servidor registra o novo ID de sessão e eviscera sessões duplicadas via WebSocket (`session:duplicate`).
  - Em `CharacterService.saveCharacterProgress`, quando um `activeSession` está registrado no servidor, qualquer requisição pública `/save` é validada contra `data.sessionId`.
  - Se a sessão for diferente ou omitida, o servidor lança `SessionSupersededError` e a rota responde com `HTTP 409 SESSION_SUPERSEDED`.
  - No cliente (`GamePrototype.tsx`), ao detectar `SESSION_SUPERSEDED` ou o evento `onDuplicateSession`, `isSaveSuspendedRef.current = true` suspende permanentemente os salvamentos daquela aba sem tentar retry, impossibilitando a sobrescrita do estado legítimo da nova sessão.

### 2. Garantia 2: Retorno à Cidade Handshake e Sincronização com o Colyseus
- **Problema Abordado:** O salvamento final da caçada deve concluir com sucesso no banco antes de liberar o autosave urbano. O Colyseus precisa assumir o estado persistido atualizado (inventário, gold, XP, skills e `saveVersion`). Se o salvamento falhar, gravações urbanas não podem ser retomadas com o estado antigo.
- **Solução Implementada:**
  - Em `GamePrototype.tsx`, as rotinas `exitHunt` (saída voluntária) e `handleConfirmDeath` (respawn no templo) foram tornadas assíncronas e executam `await saveProgress(..., true)` **antes** de sinalizar saída de caçada ao servidor.
  - Se o salvamento falhar, a transição é retida, notificando o jogador; `sendReturnToCity()` **não** é chamado e a proteção de caçada permanece ativa no servidor.
  - Se o salvamento tiver sucesso, o cliente emite a mensagem de rede `player:returnToCity`.
  - No Colyseus (`ThaisCityRoom.ts`), ao receber `player:returnToCity`:
    1. O servidor recarrega os dados autoritativos do banco via `persistenceManager.loadCharacter(player.characterId)`.
    2. Atualiza o `PlayerState` com nível, experiência, HP, MP, capacidade, skills, bestiário e a `saveVersion` avançada do banco.
    3. **Apenas após** a sincronização completa, remove o contexto de caçada chamando `this.updatePlayerHuntContext(player, false)`.
  - O autosave urbano do Colyseus passa a salvar sobre a versão atualizada do banco, com 0 conflitos e 0 regressão.

### 3. Proteção do Endpoint Interno de Contexto (`GET /api/character-context/:id`) e Resiliência de Lease
- **Camada 1 (Isolamento de Rede / Nginx Reverse Proxy):** No ambiente de produção VPS, o Nginx expõe unicamente o tráfego HTTP/HTTPS do web app (`443`) e o endpoint WebSocket `/colyseus`. O path `/api/character-context` do Express na porta interna 2567 **não** possui mapeamento externo, sendo inacessível pela internet pública.
- **Camada 2 (Loopback IP Verification):** O handler valida o IP de origem da conexão (`req.socket.remoteAddress`), restringindo chamadas ao loopback local (`127.0.0.1`, `::1`, `::ffff:127.0.0.1`).
- **Camada 3 (Internal Secret Header):** Exige o cabeçalho `x-internal-secret` correspondente a `process.env.INTERNAL_SERVICE_KEY`, carregado automaticamente nos dois serviços (Next.js e Colyseus) via `.env` / `process.loadEnvFile()`. Requisições não autorizadas recebem `HTTP 403 Forbidden`.
- **Camada 4 (Proteção contra Indisponibilidade e Ausência de Sessão):**
  - Quando um jogador se desconecta do Colyseus (`onLeave`), o servidor executa `ServerCharacterContextRegistry.setPlayerOffline()`, desmarcando `isHunting` e `activeSessionId`, mas **preservando estritamente** o `lastActiveSessionId`.
  - Quando não há sessão registrada ou quando o serviço de contexto do Colyseus está temporariamente indisponível, o servidor **NÃO** libera gravações arbitrárias de sessões antigas: valida a sessão recebida contra o último lease confirmado (`lastActiveSessionId`). Caso haja divergência ou ausência de lease válido, rejeita a gravação com `SessionSupersededError` (HTTP 409) ou `ContextServiceUnavailableError` (HTTP 503).

### 4. Definição Real de Garantia de Persistência e Retratação de "Perda Zero"
- **Retratação de "Perda Zero" no Fechamento de Aba (Conforme MDN):**
  - Conforme especificação oficial da MDN ([Navigator.sendBeacon](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon) e [fetch keepalive](https://developer.mozilla.org/en-US/docs/Web/API/Request/keepalive)), chamadas durante `beforeunload` ou `pagehide` **não** possuem garantia de conclusão pelo navegador caso o processo da aba seja finalizado imediatamente pelo sistema operacional ou pelo usuário. Além disso, navegadores móveis e desktop frequentemente suspendem requisições de descarregamento antes da resposta HTTP.
  - Portanto, o envio no fechamento da aba (`handleUnload`) é configurado estritamente como uma **tentativa adicional oportunista** utilizando `fetch(..., { keepalive: true })`.
- **Garantia Autoritativa Real:**
  - A garantia real de integridade do progresso é vinculada **estritamente ao último salvamento confirmado** com sucesso (HTTP 200/201) pelo servidor.
  - O cliente rastreia e expõe o timestamp do último salvamento confirmado (`lastConfirmedSaveTimeRef` e telemetria `progressionDiagnostics.getLastConfirmedSave()`).
- **Janela Possível de Perda:**
  - Sob operação normal, o cliente e o servidor realizam tentativas periódicas de salvamento a cada 10 a 15 segundos de combate ativo.
  - No entanto, o sistema **não promete limite temporal absoluto de 15 segundos**, pois instabilidades de rede ou atrasos de transporte podem dilatar o tempo entre respostas.
  - A garantia inviolável do sistema é que **a perda máxima possível em qualquer desconexão súbita ou encerramento anômalo (queda de conexão, fechamento abrupto de aba, crash de SO, SIGKILL) é estritamente vinculada ao progresso ocorrido desde o último salvamento confirmado com sucesso pelo servidor (HTTP 200/201)**, atestado por `progressionDiagnostics.getLastConfirmedSave()`. Nenhum dado confirmado é perdido ou revertido.

---

## 🎨 Bloco B: Otimização das Miniaturas da Lista (Card Thumbnails)

- **Sprite Sheets Consolidados (`scripts/build-thumbnail-atlases.mjs`):**
  - `public/generated/atlases/outfit-thumbs-atlas.png` (79 miniaturas consolidadas).
  - `public/generated/atlases/mount-thumbs-atlas.png` (126 miniaturas consolidadas).
- **Carregamento Sob Demanda e Cache:**
  - Download sob demanda no primeiro uso da aba de customização.
  - Warm lookup medido em < 1ms (meta < 100ms superada).
  - Redução de mais de 200 requisições HTTP individuais para apenas 2 arquivos estáticos.
- **Preservação Visual Estrita:**
  - O pipeline visual da Phase 181 (atlas 4 direções, composição de camadas, recolorização de pixels e preview na arena) permaneceu 100% inalterado.

---

## 🧪 Evidências de Teste e Validação

### 1. Script End-to-End no Banco Real (`scripts/verify-phase182-progression.ts`):
```text
========================================================================
🔍 PHASE 182 BLOCO A: VERIFICAÇÃO INTEGRAL DE GARANTIAS E PERSISTÊNCIA
========================================================================

[CENÁRIO 0] Personagem de teste isolado inicializado: AtlasHeroAlpha em Nível 1

------------------------------------------------------------------------
🎯 CENÁRIO 1: Caçar até ultrapassar o Nível 6 (Nível Alvo: 7 = 2.600+ XP)
------------------------------------------------------------------------
[Caçada] Contexto registrado: isHunting = true, activeSession = session-1-hunt-lease
[Caçada] Ratos derrotados: 12
[Caçada] Nível alcançado: 7 (Esperado: >= 7)
[Caçada] Experiência acumulada: 3000 XP
[Caçada] Gold acumulado: 36 gold

------------------------------------------------------------------------
🛡️ CENÁRIO 2: Garantia de Isolamento: Colyseus NÃO grava durante caçada
------------------------------------------------------------------------
[Isolamento] Sucesso comprovado: saveVersion permaneceu 1. Autosave do Colyseus foi barrado.

------------------------------------------------------------------------
🏛️ CENÁRIO 3: Retorno à Cidade Handshake: Salvamento final síncrono e adoção do estado
------------------------------------------------------------------------
[Retorno à Cidade] Salvamento final da caçada concluído com êxito! Nova saveVersion: 2
[Retorno à Cidade] Colyseus assumiu o estado persistido: Nível=7, XP=3000, saveVersion=2
[Retorno à Cidade] inHunt liberado com sucesso após sincronização integral.

------------------------------------------------------------------------
⏳ CENÁRIO 4: Execução de 3 Ciclos de Autosave Urbano no Colyseus
------------------------------------------------------------------------
  - Ciclo 1 de autosave urbano concluído: saveVersion=3, Nível=7, XP=3000
  - Ciclo 2 de autosave urbano concluído: saveVersion=4, Nível=7, XP=3000
  - Ciclo 3 de autosave urbano concluído: saveVersion=5, Nível=7, XP=3000

------------------------------------------------------------------------
🔌 CENÁRIO 5: Reconexão e Conferência de Todos os Valores
------------------------------------------------------------------------
  - Nível após reconexão: 7 (Esperado: 7)
  - XP após reconexão: 3000 (Esperado: 3000)
  - Skill Sword após reconexão: 20 (Esperado: 20)
  - Gold após reconexão: 36 (Esperado: 36)
  - saveVersion no banco: 5 (Esperado: >= 5)

------------------------------------------------------------------------
⚔️ CENÁRIO 6: Proteção de Conflito Real com Duas Sessões do Mesmo Personagem
------------------------------------------------------------------------
[Sessão 2] Nova sessão conectada. Direito exclusivo atribuído a: session-2-new-active-lease
[Sessão 2] Ações confirmadas e salvas com sucesso no banco: saveVersion=6, Gold=21, Potions=4, XP=2700, Skill=19

[Sessão 1 - Antiga] Tentando salvar snapshot antigo após reconexão da sessão 2...
[Sessão 1 - Antiga] Bloqueio comprovado! Erro lançado: Sessão session-1-hunt-lease foi sobreposta pela sessão ativa session-2-new-active-lease para o personagem a50ba383-0b85-4347-9acf-ae911bdb8493. Gravação rejeitada para preservar compras, perdas e progresso legítimo.

[Auditoria Pós-Tentativa da Sessão Antiga]
  - Gold no banco: 21 (Esperado: 21 - compras preservadas)
  - Poções no banco: 4 (Esperado: 4 - consumos preservados)
  - Skill Sword no banco: 19 (Esperado: 19 - penalidade mantida)
  - XP no banco: 2700 (Esperado: 2700 - penalidade mantida)
✅ A sessão antiga foi 100% impedida de sobrescrever compras, consumos, perdas ou progresso.

========================================================================
🎉 TODAS AS GARANTIAS EXIGIDAS FORAM RIGOROSAMENTE VALIDADAS COM SUCESSO!
========================================================================
```

### 2. Suíte Automatizada Vitest (`tests/phase182-progression-and-rewards-fix.test.ts`):
- 11 testes aprovados (100% pass):
  1. Catálogo dos ratos contém gold coins e queijo com drop garantido.
  2. Matar ratos acumula gold na Party Box e concede XP contínua sem perdas.
  3. Progressão com stages configurados (50x) avança estritamente até ultrapassar o Nível 6.
  4. Autoridade na caçada: Colyseus não grava e não incrementa versão durante a caçada.
  5. Compra, consumo, venda e morte seguidos de 409: ausência de duplicação ou restauração indevida.
  6. Sincronização e telemetria de diagnóstico registram tentativas e conflitos sem corromper estado.
  7. Proteção de Conflito Real: Sessão antiga é bloqueada com SESSION_SUPERSEDED e não sobrescreve compras, perdas ou progresso da sessão atual.
  8. Retorno à cidade Handshake: salvamento final conclui com sucesso antes de liberar autosave urbano e Colyseus assume estado persistido.
  9. Bloqueio quando não há sessão registrada ou serviço de contexto está indisponível: gravação antiga é barrada sem liberação automática.
  10. Retração da garantia de perda zero: confirmação de timestamp de último salvamento confirmado e keepalive.
  11. Indisponibilidade do contexto: cache da API reconhece sessão mas serviço indisponível impede autorização (informação desatualizada não autoriza gravação).

### 3. Verificação Multi-Processo Real (`scripts/verify-real-multiprocess-e2e.ts`):
- Execução com servidor Colyseus real em porta dedicada (2568), Express HTTP `/api/character-context/:id`, `INTERNAL_SERVICE_KEY` e banco relacional SQLite:
  - **Cenário 1:** Caçada acima do nível 6 (nível 7, 3000 XP, 36 gold).
  - **Cenário 2:** Handshake de retorno à cidade: salvamento final síncrono no BD (saveVersion 2), Colyseus adota dados antes de desmarcar inHunt.
  - **Cenário 3:** 3 autosaves urbanos consecutivos no Colyseus (saveVersion 3 -> 4 -> 5), preservando 100% de XP, nível e gold.
  - **Cenário 4:** Reconexão com Sessão 2 (novo lease exclusivo), compra de poção (gold 21, potions 1), morte com penalidade mantida (XP 2700, skill 19), saveVersion 6.
  - **Cenário 5:** Sessão 1 antiga tenta gravar com snapshot antigo: bloqueada com `SessionSupersededError` (HTTP 409).
  - **Cenário 6:** Ausência de sessão registrada (player desconectado/offline): tentativa de gravação da sessão antiga barrada com `SessionSupersededError`.
  - **Cenário 7:** Serviço de contexto indisponível (Colyseus desligado/inacessível): tentativa de gravação antiga barrada com `SessionSupersededError`.
  - **Cenário 8:** Verificação final de integridade: Nível=7, XP=2700, Gold=21, Poções=1, Sword=19, saveVersion=6 rigorosamente preservados.

### 4. Validação no Navegador Real via CDP (`scripts/verify-browser-cdp-phase182.mjs`):
- Executado teste end-to-end automatizado via Chrome DevTools Protocol no Microsoft Edge instalado com perfil temporário isolado, comunicando com Next.js (:3000) e Colyseus (:2567) reais:
  - **Login e Entrada:** Personagem `BrowserHero182` em Nível 1, 0 XP, entra no Templo de Thais (`scratch/cdp-01-initial-level1.png`).
  - **Caçada Ativa:** Início de caçada em Rat Cellars, combate automático contínuo abate ratos até ultrapassar o Nível 6, alcançando **Nível 7** (2.700 XP) e acumulando **7 gold** (`scratch/cdp-02-hunted-level7.png`).
  - **Retorno à Cidade Handshake:** Acionado "SAIR DA CAÇADA", salvamento síncrono grava no banco com sucesso (saveVersion 5), Colyseus adota dados e jogador retorna ao templo de Thais (`scratch/cdp-03-returned-city.png`).
  - **Autosaves Urbanos Consecutivos:** Dois ciclos de autosave urbano no loop do Colyseus confirmados no banco (saveVersion 6 e 7) mantendo 100% de nível e XP (`scratch/cdp-04-urban-autosaves.png`).
  - **Reconexão e Conferência:** Navegação para fora e reconexão com nova sessão. DOM e banco auditados: **Nível 7**, **7 Gold**, 3 itens (Sword, Gold, Cheese) e **saveVersion 9** (`scratch/cdp-05-reconnected-integrity.png`).
  - **Resultado:** 100% de sucesso e integridade atestada no navegador real.

### 5. Comparação de Execução Real das 28 Suítes com Falha (Referência vs Candidato):
Executadas as 28 suítes com falha lado a lado no candidato (`HEAD`) e na referência estável (`v1.0-stable-phase181-atlases` / `a44ed4f16`):

| # | Arquivo de Teste | Referência (`v1.0-stable-phase181-atlases`) | Candidato (`HEAD`) | Status Paridade | Motivo Idêntico da Falha |
|---|---|---|---|---|---|
| 1 | `tests/character-selection-songtibia-video.test.ts` | 2/3 (1 falhas) | 2/3 (1 falhas) | **100% IDÊNTICO** | `AssertionError: expected '\'use client\';\r\n\r\nimport React, …'` |
| 2 | `tests/mount-composition-regression.test.ts` | 6/9 (3 falhas) | 6/9 (3 falhas) | **100% IDÊNTICO** | `AssertionError: expected false to be true // Object.is equality` |
| 3 | `tests/phase101-loading-screen-vanilla-css-and-thais-city-restoration.test.ts` | 6/7 (1 falhas) | 6/7 (1 falhas) | **100% IDÊNTICO** | `AssertionError: expected undefined to be true // Object.is equali` |
| 4 | `tests/phase107-character-spawn-post-loading-safety.test.ts` | 3/5 (2 falhas) | 3/5 (2 falhas) | **100% IDÊNTICO** | `AssertionError: expected '\'use client\';\r\n\r\nimport { useCa…'` |
| 5 | `tests/phase122-outfit-navigation-capabilities-sire.test.ts` | 8/10 (2 falhas) | 8/10 (2 falhas) | **100% IDÊNTICO** | `AssertionError: expected null not to be null` |
| 6 | `tests/phase123-outfit-addons-persistence-canonical-fix.test.ts` | 6/7 (1 falhas) | 6/7 (1 falhas) | **100% IDÊNTICO** | `AssertionError: expected null not to be null` |
| 7 | `tests/phase129-audit-all-outfits-preview.test.ts` | 6/7 (1 falhas) | 6/7 (1 falhas) | **100% IDÊNTICO** | `Error: STACK_TRACE_ERROR` |
| 8 | `tests/phase136-avatar-skills-inspect-and-dock-cleanup.test.ts` | 4/6 (2 falhas) | 4/6 (2 falhas) | **100% IDÊNTICO** | `AssertionError: expected '\'use client\';\r\n\r\nimport React, …'` |
| 9 | `tests/phase141-incognito-loading-sqlite-wal-and-hunt-icons.test.ts` | 6/7 (1 falhas) | 6/7 (1 falhas) | **100% IDÊNTICO** | `AssertionError: Sprite file must exist on disk: C:\Users\desig\On` |
| 10 | `tests/phase146-universal-asset-preloading-loading-screen.test.ts` | 11/13 (2 falhas) | 11/13 (2 falhas) | **100% IDÊNTICO** | `AssertionError: expected 15 to be greater than 150` |
| 11 | `tests/phase150-active-player-first-preload-and-assets-integrity.test.ts` | 4/6 (2 falhas) | 4/6 (2 falhas) | **100% IDÊNTICO** | `AssertionError: expected 2 to be greater than 30` |
| 12 | `tests/phase151-texture-atlases-and-instant-world.test.ts` | 6/7 (1 falhas) | 6/7 (1 falhas) | **100% IDÊNTICO** | `AssertionError: expected 61.28762435913086 to be less than 6.5` |
| 13 | `tests/phase154-outfit-preview-save-and-walking-animation.test.ts` | 6/7 (1 falhas) | 6/7 (1 falhas) | **100% IDÊNTICO** | `AssertionError: expected 'import React, { useState, useEffect, …'` |
| 14 | `tests/phase162-authentic-target-lock.test.ts` | 4/6 (2 falhas) | 4/6 (2 falhas) | **100% IDÊNTICO** | `AssertionError: expected 'close-rat' to be 'far-demon' // Object.` |
| 15 | `tests/phase178-online-stability-mount-recolor-preloader.test.ts` | 11/19 (8 falhas) | 11/19 (8 falhas) | **100% IDÊNTICO** | `AssertionError: expected [ Array(1) ] to include '/generated/moun` |
| 16 | `tests/phase179-outfit-diagnostic-and-strict-save.test.ts` | 15/19 (4 falhas) | 15/19 (4 falhas) | **100% IDÊNTICO** | `AssertionError: expected [ Array(1) ] to deeply equal []` |
| 17 | `tests/phase22-combat-authenticity.test.ts` | 4/6 (2 falhas) | 4/6 (2 falhas) | **100% IDÊNTICO** | `AssertionError: expected null to be 24 // Object.is equality` |
| 18 | `tests/phase31-tibia1098-thais-assets.test.ts` | 4/6 (2 falhas) | 4/6 (2 falhas) | **100% IDÊNTICO** | `AssertionError: expected undefined to be true // Object.is equali` |
| 19 | `tests/phase40-normal-speed-strict-walls-bottom-right-anchor.test.ts` | 2/3 (1 falhas) | 2/3 (1 falhas) | **100% IDÊNTICO** | `AssertionError: expected '\'use client\';\r\n\r\nimport { useEf…'` |
| 20 | `tests/phase42-outfit-mount-selection.test.ts` | 3/4 (1 falhas) | 3/4 (1 falhas) | **100% IDÊNTICO** | `AssertionError: expected [ 'Citizen', 'Hunter', 'Mage', …(73) ] t` |
| 21 | `tests/phase42-sire-outfit.test.ts` | 2/4 (2 falhas) | 2/4 (2 falhas) | **100% IDÊNTICO** | `AssertionError: expected undefined to be defined` |
| 22 | `tests/phase43-official-outfit-ui.test.ts` | 2/3 (1 falhas) | 2/3 (1 falhas) | **100% IDÊNTICO** | `AssertionError: expected [ 'Citizen', 'Hunter', 'Mage', …(73) ] t` |
| 23 | `tests/phase48-fix-requirements.test.ts` | 4/5 (1 falhas) | 4/5 (1 falhas) | **100% IDÊNTICO** | `AssertionError: expected 'import { Room, Client } from \'@colys…'` |
| 24 | `tests/phase51-squad-follow-party-creation.test.ts` | 1/2 (1 falhas) | 1/2 (1 falhas) | **100% IDÊNTICO** | `AssertionError: expected 'rat-minion-2' to be 'rat-boss-1' // Obj` |
| 25 | `tests/phase76-vocation-choice-level8.test.ts` | 4/5 (1 falhas) | 4/5 (1 falhas) | **100% IDÊNTICO** | `AssertionError: expected true to be false // Object.is equality` |
| 26 | `tests/phase81-emergency-auto-potion.test.ts` | 4/5 (1 falhas) | 4/5 (1 falhas) | **100% IDÊNTICO** | `AssertionError: expected 0 to be greater than 0` |
| 27 | `tests/phase90-target-strategy-monster-chase.test.ts` | 2/3 (1 falhas) | 2/3 (1 falhas) | **100% IDÊNTICO** | `AssertionError: expected 'enemy-full-hp' to be 'enemy-lowest-hp' ` |
| 28 | `tests/spatial.test.ts` | 10/10 (0 falhas) | 10/10 (0 falhas) | **100% IDÊNTICO** | `` |

**Conclusão da Auditoria:** 100% de paridade comprovada em execução real. Nenhuma das 28 falhas foi causada pelo candidato.

### 6. Configuração de `INTERNAL_SERVICE_KEY`:
- Ambos os serviços (`apps/web` via Next.js e `packages/server` via Colyseus `cli.ts` / `server.ts`) carregam `INTERNAL_SERVICE_KEY` a partir de `.env` com fallback padronizado e seguro.
- Confirmada a presença, validade e paridade da chave sem exposição do valor textual.

### 7. Verificação de Tipos TypeScript (`npm run typecheck`):
- 0 erros de compilação em todo o monorepo (`tsc --noEmit` exit code 0).

---

## 🚀 Commits e Deploy em Produção (VPS)

- **Diferenciação dos Hashes Git Registrados:**
  - `27974f15840636d5fc8b8d35c42cba339e035945`: Hash do **objeto tag anotada** do Git (`tag v1.0-stable-phase181-atlases`).
  - `a44ed4f16386721fad3eab2ee51189c514e8059b`: Hash do **commit peeled** efetivamente apontado pela tag (`v1.0-stable-phase181-atlases^{commit}` - "docs(gsd): complete Phase 181 all outfits texture atlases expansion and roadmap").
  - `a2faa1cfab929b5d5787d7c0cd75f2e3f0144daa`: Hash do **commit pai** (`HEAD~1` antes de `a44ed4f16`), responsável pelo alinhamento técnico das asserções da Phase 180 antes do commit de documentação da tag.
### 8. Adendo: Resolução da Sequência de Caçada Online, Orçamento Contínuo de Tentativas e Troca Direta entre Caçadas (Commits `1d54f0feb`, `3d0c2fa2a` e `e2e-sub18k`)

#### 1. Fórmula Completa das Tentativas Legítimas e Justificativa dos Limites:
- **EXP Stages (Nível do Personagem):** Utilizam o vetor `EXP_STAGES` em `packages/domain/src/progression/experience.ts` (multiplicador de 50x para níveis de 1 a 8).
- **Skill Stages e Treino Físico/Mágico:** **Totalmente desacoplados e independentes dos multiplicadores de EXP!**
  - **Tentativas Base por Ação:**
    - `content.rateSkill = 50`: número base de tentativas concedidas por golpe com armas ou desarmado.
    - `content.rateMagic = 25`: número base de tentativas por mana gasto.
  - **Multiplicadores de Estágio:**
    - `PHYSICAL_SKILL_STAGES`: 1-80 (**10x**), 81-100 (**7x**), 101-120 (**4x**), 121+ (**2x**).
    - `MAGIC_LEVEL_STAGES`: 0-80 (**10x**), 81-100 (**7x**), 101-120 (**4x**), 121-130 (**3x**), 131+ (**2x**).
  - **Velocidade de Ataque (`attackSpeedMs`):** **2.000 ms** (1 golpe a cada 2 segundos = 0.5 ataques por segundo).
  - **Tentativas por Nível Conforme Fórmula Canônica:**
    $$\text{Tries}(L) = \text{SkillBase} \times \text{VocationMultiplier}^{(L - 11)}$$
    Onde `SkillBase` é fixo por tipo de habilidade:
    - Fist, Club, Sword, Axe: **50 tentativas base**.
    - Distance: **30 tentativas base**.
    - Shielding: **100 tentativas base**.
    - Magic Level: $\text{Tries}(ML) = 1600 \times \text{ManaMultiplier}^{(ML - 1)}$.
  - **Particularidades por Habilidade:**
    - *Fist Fighting (Knight):* Multiplicador 1.1. Do nível 10 para o 11 exige exatamente **50 tentativas**. Como um único golpe com `rateSkill = 50` concede 50 tentativas, o **primeiro golpe já sobe o nível**. De 10 a 25 consome um total de **1.581 tentativas acumuladas**. Em 60 segundos de socos (30 golpes $\times$ 50), geram-se 1.500 tentativas de treino.
    - *Shielding:* Treina recebendo até 2 ataques de monstros por turno (1 ataque por segundo), gerando até $2 \times 250 = 500$ tentativas de shielding por segundo em combate cercado.
    - *Magic Level:* Treina consumindo mana continuamente com feitiços no cooldown.
  - **Justificativa dos Limites Adotados no Orçamento:**
    - `HUNT_MAX_TRIES_PER_SECOND = 2_500`: Cobre com folga defensiva a soma das ações físicas simultâneas máximas de um jogador em caçada intensa: 1 ataque com arma (250 tries/s) + 2 blocos de escudo de monstros (500 tries/s) + consumo contínuo de mana com magias no cooldown (~1.000 tries/s) + margem para acomodar variações de latência de rede entre pacotes, sem permitir saltos sobre-humanos.
    - `HUNT_MAX_BURST_TRIES = 18_000`: Tolerância de rajada para absorver atrasos transitórios de rede ou acumulação de alguns segundos de combate antes de um salvamento (~7 a 8 segundos de throughput máximo de pico).
    - `NON_HUNT_MAX_BURST_TRIES = 600` e `NON_HUNT_MAX_TRIES_PER_SECOND = 60`: Treino clássico em dummies urbanos em ambiente seguro.

#### 2. Enquadramento do Limitador: Proteção contra Ganhos Excessivos (Guardrail):
> [!NOTE]
> O `SkillRateLimiter` atua estritamente como **teto de segurança e barreira de contenção contra anomalias (guardrail anticheat)**. Ele garante que nenhum ganho exceda a capacidade física máxima do motor no tempo decorrido, barrando saltos absurdos e ataques de flood.
> 
> Ele **não comprova que todos os ganhos aceitos abaixo do limite foram legitimamente conquistados**, pois uma requisição fraudulenta pequena dentro da janela de tempo ainda pode ser aceita pelo limitador. A legitimidade intrínseca de cada golpe, kill e gasto de mana é assegurada pela autoridade do motor de jogo (`Colyseus` / simulação autoritativa).

#### 3. Teste de Esgotamento Acumulado com Requisições Sub-18.000:
- Demonstração de que requisições que **individualmente cabem com folga no limite de 18.000** esgotam o orçamento contínuo por acúmulo:
  - **Requisição 1:** Axe Fighting 10 $\rightarrow$ 40 (**8.209 tentativas** $\ll$ 18.000) $\rightarrow$ **Status 200 OK** (Consumiu parte do burst, saldo restante: ~9.791).
  - **Requisição 2:** Axe Fighting 40 $\rightarrow$ 46 (**6.729 tentativas** $\ll$ 18.000) $\rightarrow$ **Status 200 OK** (Consumiu saldo restante + regeneração de rede de ~750 tries, saldo restante: ~3.812).
  - **Requisição 3:** Axe Fighting 46 $\rightarrow$ 50 (**7.172 tentativas** $\ll$ 18.000 individualmente!).
    - Saldo disponível no momento descontada a regeneração: **4.702 tentativas**.
    - Como $7.172 > 4.702$, a 3ª requisição é **Rejeitada com HTTP 400 Bad Request**:
      `Salto anômalo de habilidade não permitido: ganho de 7172 tentativas de treino excede o orçamento contínuo no tempo (máximo permitido: 4702 tentativas).`
  - Comprovado tanto em testes unitários Vitest quanto em execução online contra o VPS público!

#### 4. Troca Direta entre Caçadas (Sem Retornar à Cidade):
- **Causa da Falha Anterior:** `startSelectedHunt` no `GamePrototype.tsx` acionava `setMode('training')` enquanto o personagem ainda possuía coordenadas de masmorra (`posZ: 8`). `ThaisCityArena` só possui tilemaps para `z: 6` e `z: 7`, gerando exceção não tratada no React.
- **Correção Definitiva:** `startSelectedHunt` interrompe o combate da caçada anterior via `leaveHunt(current)` diretamente sem alternar para `'training'`, e aplica clamp defensivo em `cityPos.z` para 6 ou 7.
- **Comprovação Online:** Troca direta de `rat-cellars` para `troll-camp` em combate ativo executada via CDP sem telas de erro (`scratch/val-182-direct-hunt-switch.png`).

#### 5. Esclarecimento do Banco de Dados Efetivo:
- **Banco em Uso:** **SQLite com WAL mode** (`DATABASE_URL="file:./dev.db"` via Prisma Client em `/root/tibia-idle/.env` e `prisma/schema.prisma`). Menções anteriores a PostgreSQL foram lapsos de nomenclatura textual herdados de fases antigas.

#### 6. Validação Automatizada Online no VPS (`scratch/validate-phase182-online-sequence.mjs`):
- **Etapa 3:** Gating de prontidão da cena (`[SCENE]`) antes do combate (`[COMBAT]`).
- **Etapa 4:** Troca direta de caçada sem transitar por cidade (`val-182-direct-hunt-switch.png`).
- **Etapa 5:** Salvamento de saída legítimo com HTTP 200 OK (`saveVersion` 48).
- **Etapa 6:** Retorno a Thais e movimentação por setas direcionais (`val-182-02-city.png`).
- **Etapa 7:** Auditoria de segurança:
  - Salto massivo (+90 lvls, Sword 100 = 2.635.918 tries) $\rightarrow$ Rejeitado com HTTP 400.
  - Sequência de 3 requisições abaixo de 18.000 tries (8.209, 6.729 e 7.172 tries) $\rightarrow$ 3ª requisição rejeitada com HTTP 400 por esgotamento acumulado (máximo permitido: 4.702 tentativas).
- **Etapa 8:** Reconexão e persistência integral (`val-182-03-reconnected.png`).
- **Preservação:** `Wolfy` 100% intocado. Atlases, outfits, montarias e animações 100% preservados.

