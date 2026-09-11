# Phase 127 — Resumo da Entrega (Summary)

## Persistência Permanente de Variáveis e Rates do Servidor (Admin Server Config)

### 1. Resumo Executivo
Nesta fase, atendemos à solicitação do usuário:
> *"Quando o admin mudar as variáveis e rates do servidor deve ficar salvo as rates e demais configurações até que ele mude novamente."*

Anteriormente, o `ServerConfigManager` mantinha as taxas e variáveis do servidor exclusivamente em uma variável singleton em memória (`private config: ServerConfig`). Sempre que o servidor era reiniciado, recarregado ou instanciado em processos isolados, os valores eram redefinidos para os padrões hardcoded (`1.0x` XP, `1.0x` loot, etc.).

**Solução Implementada:**
1. **Modelagem Relacional no Prisma (`ServerConfigRecord`):**
   - Adicionada a tabela `server_configs` ao `prisma/schema.prisma` com campos para todas as taxas e variáveis do jogo: `expRate`, `lootRate`, `skillRate`, `regenRate`, `maxClientsPerRoom`, `periodicSaveIntervalMs`, `allowReconnectionSec`, `localChatRadius`, `yellChatRadius`, `deathPenaltyExpPercent`, `deathPenaltySkillPercent`, `deathPenaltyLoseLoot`.
   - Banco sincronizado via `npx prisma db push` e cliente regenerado via `npx prisma generate`.
2. **Persistência Híbrida em Disco e Banco (`ServerConfigManager.ts`):**
   - Gravação e leitura síncrona em `content/server-config.json` para disponibilidade imediata no boot de qualquer processo sem latência.
   - Gravação assíncrona garantida no banco de dados relacional Prisma (`prisma.serverConfigRecord.upsert`).
   - Leitura síncrona/assíncrona no boot com métodos `loadFromFile()` e `loadFromDatabase()`.
   - Detecção automática de alterações em disco entre processos com verificação periódica de timestamp (`mtimeMs`), permitindo que alterações feitas pela API web do Next.js sejam refletidas em tempo real nas salas do Colyseus sem necessidade de restart.
3. **Rotas de API (`/api/admin/config` e `/api/config`):**
   - `POST /api/admin/config`: executa `await serverConfigManager.saveConfig(body)`, garantindo confirmação persistida em banco e disco antes de responder ao painel admin.
   - `GET /api/admin/config` e `GET /api/config`: consultam e retornam a configuração persistida mais recente.
4. **Sincronização Autoritativa no Colyseus (`ThaisCityRoom.ts`):**
   - No `onCreate`, a sala carrega a configuração persistida do banco (`loadFromDatabase`) e atualiza a capacidade e intervalo de auto-save.
   - O listener de `serverConfigManager.onChange` propaga atualizações de taxas e variáveis para todos os clientes conectados via broadcast `'server:config'`.
   - Proteção estrita contra mock clients em testes unitários.

---

### 2. Componentes Criados e Modificados

| Arquivo | Mudanças Principais |
|---|---|
| `prisma/schema.prisma` | Adicionado modelo `ServerConfigRecord` para persistência permanente no banco relacional. |
| `packages/server/src/config/ServerConfigManager.ts` | Implementada persistência em `content/server-config.json` e Prisma DB (`ServerConfigRecord`), métodos `saveConfig`, `loadFromDatabase`, `saveToDatabase`, `resetToDefaultsAsync` e detecção de atualizações entre processos. |
| `app/api/admin/config/route.ts` | Atualizado para aguardar `saveConfig` com persistência em banco e recarregar dados do DB em requisições GET. |
| `packages/server/src/rooms/ThaisCityRoom.ts` | Carregamento da configuração persistida do DB no `onCreate` e proteção com try-catch no broadcast de taxas. |
| `content/server-config.json` | [NOVO] Arquivo de sincronização local compartilhado entre processos do servidor. |
| `tests/phase127-server-config-persistence.test.ts` | [NOVO] Suíte de testes automatizados com 7 casos cobrindo persistência em arquivo, gravação no Prisma DB, restauração em reinicialização simulada, reset e rotas. |
| `.planning/ROADMAP.md` & `.planning/STATE.md` | Registrada e finalizada a Phase 127 com 100% de conclusão. |

---

### 3. Resultados dos Testes e Validação
- **TypeScript Typecheck:** 0 erros (`npm run typecheck`).
- **Suíte Dedicada da Fase 127:** 7/7 testes aprovados em `tests/phase127-server-config-persistence.test.ts`.
- **Regressão Global:** 128/128 arquivos de teste passando (738/738 testes aprovados - 100%).
