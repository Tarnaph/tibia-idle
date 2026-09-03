---
description: "Sempre utilizar a skill /gsd e o framework GSD para gerenciar e executar tarefas no projeto"
globs: ["*"]
---

# Always Use GSD (Git. Ship. Done.)

1. **Padrão Obrigatório:**
   - O agente DEVE sempre adotar a metodologia GSD (`/gsd`) para qualquer desenvolvimento, correção ou evolução de código neste repositório.
   - Mesmo que o usuário não digite `/gsd`, o agente deve estruturar a solução utilizando os passos e convenções do GSD.

2. **Rastreabilidade e Estado:**
   - Registrar novas fases no `.planning/ROADMAP.md` e `.planning/STATE.md`.
   - Gerar os resumos de entrega (`SUMMARY.md`) em `.planning/phases/`.

3. **Garantia de Qualidade:**
   - Validar com `npm run typecheck` e `npm run test` antes de considerar qualquer tarefa finalizada.
   - Realizar commits git atômicos e descritivos.
