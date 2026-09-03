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
