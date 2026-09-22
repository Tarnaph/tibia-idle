# Regras e Diretrizes do Projeto - CAVEBOUND / TibiaWeb

## ⚡ Fluxo Obrigatório de Desenvolvimento: GSD (Git. Ship. Done.)

O assistente Antigravity DEVE **sempre utilizar a skill `/gsd`** e o ecossistema GSD em todas as tarefas, correções de bugs, criação de funcionalidades e refatorações neste projeto:

1. **Roteamento e Inicialização de Tarefas:**
   - Sempre que o usuário solicitar uma funcionalidade, ajuste visual ou correção de bug, utilizar o fluxo do GSD (`/gsd`, `/gsd-phase`, `/gsd-audit-fix`, `/gsd-plan-phase`, etc.).
   - Manter o registro das fases atualizado em `.planning/ROADMAP.md` e `.planning/STATE.md`.

2. **Ciclo de Fase GSD:**
   - **Discussão / Planejamento:** Elaborar ou atualizar o `implementation_plan.md` com escopo técnico antes de alterações complexas.
   - **Execução:** Implementar código modular, preservando contratos de tipos TypeScript e o determinismo do motor de jogo.
   - **Verificação Contínua:**
     - Sempre rodar `npm run typecheck` e garantir 0 erros de tipagem.
     - Sempre rodar `npm run test` (Vitest) e garantir 100% de aprovação em todos os testes.
   - **Documentação e Entrega:**
     - Criar o resumo da fase `.planning/phases/.../XX-SUMMARY.md`.
     - Atualizar o status da fase para `Complete` em `ROADMAP.md` e `STATE.md`.
     - Realizar commits atômicos no formato convencional (`feat(...)`, `fix(...)`, `refactor(...)`).

3. **Autonomia:**
   - O assistente deve agir proativamente adotando o padrão GSD mesmo quando o usuário não prefixar explicitamente `/gsd` na mensagem.

4. **Modo Totalmente Autônomo (Allow All & Accept All):**
   - O assistente opera em modo **100% autônomo**, com **Allow All** e **Accept All** pré-aprovados para todas as decisões, comandos, criações de arquivos e execução de planos.
   - Não interromper o fluxo para pedir confirmações triviais ou autorizações intermediárias; avançar diretamente de planejamento -> execução -> testes -> entrega.

5. **💾 Diretriz de Persistência Permanente Obrigatória (MMORPG State):**
   - Em QUALQUER solicitação de nova funcionalidade, alteração, criação de sistema, recompensa, inventário, conquista ou alteração de estado do jogador/conta:
   - O assistente DEVE analisar proativamente se a informação precisa ser **permanente entre sessões/relogs/restarts do servidor**.
   - Garantir a modelagem no banco de dados Prisma (`prisma/schema.prisma`), persistência no `PrismaPersistenceManager.ts` e carregamento autoritativo no `onJoin` do servidor Colyseus (`ThaisCityRoom.ts`), nunca deixando o progresso puramente em memória transiente de frontend ou runtime temporário.

6. **🖼️ Diretriz de Imagens, Sprites e Assets Visuais (Asset Paths):**
   - Todas as imagens do jogo estão catalogadas e centralizadas na pasta oficial **`public/assets/`** (e espelhos canônicos em `public/generated/` e `public/images/`):
     - **Itens:** `public/assets/items/item-${id}.png` (ou `public/generated/cyclopedia/items/` com 22.181 itens).
     - **Magias e Feitiços:** `public/assets/spells/` (ou `public/spells/` / `public/spells/canonical/`).
     - **Runas:** `public/assets/runes/` (ou `public/runes/`).
     - **Poções:** `public/assets/potions/` (ou `public/potions/`).
     - **Montarias:** `public/assets/mounts/` (ou `public/generated/mounts/`).
     - **Monstros e Bestiário:** `public/assets/monsters/` (ou `public/generated/bestiary/${monsterId}.png`).
     - **Outfits e Miniaturas:** `public/assets/outfits/` e `public/assets/outfit-thumbs/`.
     - **Caçadas:** `public/assets/hunts/` (ou `public/images/hunts/` com fallback para bestiário).
     - **Avatares:** `public/assets/avatars/` (ou `public/images/avatars/`).
     - **Loading:** `public/assets/loading/` (ou `public/images/loading/`).
   - Sempre utilize o módulo helper `apps/web/lib/assetPaths.ts` para resolver URLs canônicas em componentes React.
   - Sempre implemente manipulação de `onError` com fallbacks para garantir que nenhum item exiba ícone de interrogação `?` ou imagem quebrada.
   - Consulte a regra completa em `.agents/rules/asset-paths.md`.

7. **📋 Diretriz de Triagem e Execução com FIX.md (Anti-Overload & Batching):**
   - Sempre que o usuário listar múltiplos problemas, ideias ou alterações, o assistente DEVE registrá-los imediatamente no arquivo `FIX.md` para evitar perda de contexto ou tarefas incompletas.
   - A execução das correções deve ser estruturada em ondas lógicas e ordenadas (1 a 3 tarefas do mesmo subsistema por ciclo), marcando cada item concluído com `[x]` no `FIX.md` após validação estrita em testes e typecheck.
