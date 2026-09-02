# Cavebound — MMORPG idle no navegador

Vertical slice de um MMORPG 2D idle no navegador. O protótipo mantém grid, pathfinding, combate e progressão separados da interface e usa `styller-master/` e `tibia-860-client/` somente como fontes de dados/assets. A camada pública e de contas usa Supabase Auth/PostgreSQL, enquanto o save do jogo continua deliberadamente em memória.

## Executar

Requisitos: Node.js 22.13 ou mais recente e npm.

```bash
npm install
npm run dev
```

Sem credenciais, a landing continua disponível e informa que o login precisa ser configurado. Para habilitar cadastro, login, Google OAuth e updates, copie `.env.example` para `.env.local` e siga [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).

O comando de desenvolvimento executa automaticamente os importadores somente leitura antes de iniciar a aplicação. Além do conteúdo STYLLER, ele extrai o conjunto mínimo de sprites DAT/SPR usado pelas rooms manuais.

## Verificações

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

## Estrutura

- `app/`: App Router; `/` é a landing, `/game` é o cliente protegido e `/admin` gerencia updates.
- `apps/web/components/`: interface do protótipo e arena PixiJS.
- `apps/web/auth/`: estado de sessão persistente e ações do Supabase Auth.
- `packages/auth/`: clientes browser/server, guards e contratos de conta.
- `packages/updates/`: leitura server-side e normalização de updates.
- `supabase/migrations/`: schema, triggers, grants e RLS.
- `packages/domain/`: combate, progressão, RNG, equipamentos, grid, A*, occupancy e rooms sem dependência da interface.
- `packages/presentation/`: configuração e fila de interpolação visual, métricas de sessão e seleção do modo de viewport, sem acesso ao RNG ou mutação do estado lógico.
- `packages/content-schema/`: contrato normalizado para conteúdo importado.
- `packages/styller-importer/`: importador de XML que lê `../styller-master/` e grava apenas em `content/generated/`.
- `packages/tibia860-assets/`: parser DAT/SPR e extrator mínimo que lê o cliente 8.60 sem modificá-lo.
- `content/generated/`: Rotworm, catálogo restrito de equipamentos e vocação Knight normalizados.
- `public/generated/tibia860/`: sprites de criaturas, cenário manual, Training Room e itens resolvidos pela cadeia OTB → DAT → SPR.
- `tests/`: testes do domínio e do importador.

## Rotas

- `/`: apresentação pública, updates publicados e login/cadastro.
- `/game`: cliente Cavebound existente; exige sessão válida.
- `/admin`: CRUD compacto de updates; exige profile com `role = 'admin'`.
- `/auth/callback`: troca segura do código PKCE por sessão Supabase.

## Escopo deliberadamente simplificado

O estado existe apenas em memória. As cinco waves são apresentadas como rooms manuais 15×11; não há parser OTBM nem mundo aberto. Ataque máximo, defesa e armor são derivados do level, skills, vocação e loadout, aproximando as fórmulas desta engine TFS. O loop ainda simplifica cooldowns, bloqueios, fatores de luta, distribuição de dano e resistências.

Os tiles lógicos continuam autoritativos. O PixiJS interpola os passos confirmados em uma fila visual com pequeno buffer, animações direcionais e retorno a idle. A Training Room é uma composição manual com piso, parede, tapete, dummies e weapon racks extraídos do cliente; o golpe repetido é somente visual e deixa um hook explícito para progressão futura. O painel de equipamento e a grade de inventário usam a mesma regra de transferência do domínio para clique e drag-and-drop.
