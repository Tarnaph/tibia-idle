# Cavebound — MMORPG 2D Idle no Navegador

Vertical slice de um **MMORPG 2D idle no navegador**, baseado em mecânicas, fórmulas e dados autênticos do **Tibia 8.60 (TFS / Styller)**. O projeto combina lógica de jogo determinística em ticks separada da interface, servidor de jogo multiplayer em tempo real via **Colyseus.js**, persistência relacional com **Prisma / SQLite**, renderização interpolada em PixiJS, importação direta de dados do OpenTibia Server (`styller-master/`) e extração determinística de sprites do cliente binário (`tibia-860-client/`).

---

## ⚡ Como Executar

### Pré-requisitos
* **Node.js**: `>= 22.13.0` (suporte a `--experimental-strip-types`)
* **npm**
* Pastas irmãs `styller-master/` e `tibia-860-client/` no mesmo diretório pai do projeto (já configuradas e utilizadas exclusivamente como fontes de dados somente leitura).

### Instalação e Execução

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar o servidor de jogo Colyseus (Multiplayer) em um terminal
npm run server

# 3. Iniciar o cliente web (Next.js / Vite) em outro terminal
npm run dev
```

> **Nota:** Ao executar `npm run dev`, o script `predev` executa automaticamente os importadores em tempo de compilação:
> - `npm run import:content`: Processa monstros, equipamentos, vocações, magias, economia e regiões do mapa OTBM.
> - `npm run extract:tibia860`: Extrai e compõe os sprites PNG determinísticos a partir de `Tibia.dat` e `Tibia.spr`.

---

## 🌐 Rotas e Como Acessar

| Rota | Descrição | Requisitos de Acesso |
|---|---|---|
| **`/game-preview`** | **Preview direto do jogo (Recomendado para Dev)**. Carrega diretamente o cliente do jogo (PixiJS, grid, party, combate, inventário e training) sem exigir autenticação. | Disponível em `NODE_ENV === 'development'` |
| **`/`** | Landing page pública de apresentação, feed de notas de atualização e modal de login/cadastro. | Livre / Público |
| **`/game`** | Cliente do jogo oficial com verificação de sessão de usuário. | Requer login ativo via Supabase |
| **`/admin`** | Painel de controle para criação e publicação de notas de atualização (patch notes). | Requer usuário autenticado com `role = 'admin'` |
| **`/auth/callback`** | Endpoint seguro para troca do código PKCE por sessão persistente. | Utilizado pelo fluxo OAuth / Magic Link |

---

## 🗺️ As 12 Fases do Projeto

O desenvolvimento do Cavebound foi estruturado e documentado em 12 fases incrementais, todas com testes automatizados e critérios de validação rigorosos:

| Fase | Título | Subsistema | Foco e Entregáveis Principais | Testes |
|:---:|---|---|---|:---:|
| **1** | **Motor de Simulação e Combate Idle** | `simulation-domain` | Engine em ticks (120ms), RNG determinístico via seed, curva cumulativa de XP do TFS, cooldowns de ataque por criatura e 10 waves com chefes. | [`domain.test.ts`](tests/domain.test.ts) |
| **2** | **Sistema de Equipamento e Atributos Derivados** | `equipment-domain` | 6 slots corporais, starter loadout do Knight de `firstitems.lua`, derivação de ataque por armas (Sword, Axe, Club) vinculadas à skill ativa, defesa e armor. | [`equipment.test.ts`](tests/equipment.test.ts) |
| **3** | **Espacialidade 2D, Grid e Pathfinding A\*** | `spatial-domain` | Grade espacial discreta, algoritmo A* com prevenção estrita de *corner-clipping*, ocupação atômica por tile (sem sobreposição) e aproximação melee. | [`spatial.test.ts`](tests/spatial.test.ts) |
| **4** | **Camada de Apresentação e Interpolação PixiJS** | `presentation` | Fila de interpolação visual `VisualMotionTrack`, sprites com 4 direções, animação de passos, retorno suave a idle e métricas em tempo real (XP/h, gold/h). | [`presentation.test.ts`](tests/presentation.test.ts) |
| **5** | **Treinamento Funcional de Habilidades** | `progression-domain` | Training Room funcional com bonecos (dummies), avanço baseado em tentativas (`skillTries`) com multiplicadores vocacionais do TFS e impacto imediato no dano. | [`progression.test.ts`](tests/progression.test.ts) |
| **6** | **Importadores de Conteúdo STYLLER (XML / OTBM)** | `content-import` | Leitura somente leitura de `styller-master/`, gerando JSONs normalizados para monstros, itens, magias, economia e extração de 5 mapas reais do `styller.otbm`. | [`importer.test.ts`](tests/importer.test.ts) |
| **7** | **Pipeline de Extração de Assets Tibia 8.60 (DAT/SPR)** | `asset-pipeline` | Parsers binários de `Tibia.dat` e `Tibia.spr`, resolução OTB → DAT → SPR, extração determinística de 829 PNGs e manifesto com validação SHA-256. | [`tibia860-assets.test.ts`](tests/tibia860-assets.test.ts) |
| **8** | **Multi-Personagem, Spells, Promoção e Caçadas OTBM** | `multi-character-domain` | Grupo de até 4 heróis de vocações distintas (Knight, Paladin, Sorcerer, Druid), inventários isolados, magias ativas com mana/cooldown e promoção vocacional. | [`phase8.test.ts`](tests/phase8.test.ts) |
| **9** | **Rotas de Caça Contínuas (Continuous Hunt Routes)** | `continuous-hunt` | Caçada contínua em loop no mapa aberto do OTBM, zonas de respawn pré-populadas, salvaguarda de spawn seguro, variantes raras com auras e saída segura. | [`continuous-hunt.test.ts`](tests/continuous-hunt.test.ts) |
| **10** | **Câmera de Expedição e Controles em Tempo Real** | `presentation-camera` | Câmera dinâmica de mundo (`smoothWorldCamera`) com zoom e tracking, desacoplada da UI de seleção, hot-swap de equipamentos em combate e entrada ao vivo na party. | [`expedition-camera.test.ts`](tests/expedition-camera.test.ts) |
| **11** | **Economia de Party, Loot Pouch e UX Estrutural** | `economy-and-ux` | Loot Pouch com travas de venda (`lockSell`), preferências (`autoLoot`, `quickSell`), preços de NPCs do Styller, capacidade de carga, peso e divisão de XP com bônus. | [`structural-ux.test.ts`](tests/structural-ux.test.ts) |
| **12** | **Fundação de Autenticação, Contas e Segurança (Supabase)** | `auth-and-security` | Supabase Auth (Email/Senha e Google OAuth), schema PostgreSQL com Row Level Security (RLS) anti-escalonamento, painel `/admin` e rota `/game-preview`. | [`auth-foundation.test.ts`](tests/auth-foundation.test.ts) |

---

## 🏗️ Arquitetura e Estrutura de Pastas

```text
mmorpg-web/
├── app/                          # Next.js App Router (Páginas, Layouts e Guards)
│   ├── page.tsx                  # Landing pública com notícias e login
│   ├── game/page.tsx             # Rota protegida do cliente oficial
│   ├── game-preview/page.tsx     # Rota local sem autenticação para desenvolvimento
│   └── admin/page.tsx            # Painel administrativo de postagem de updates
├── apps/web/
│   ├── components/               # Componentes React (PixiArena, EquipmentPanel, BottomDock)
│   └── auth/                     # Gerenciamento de sessão client-side Supabase
├── packages/
│   ├── domain/                   # Núcleo puro de lógica: combate, grid 2D, A*, party, spells, itens
│   ├── presentation/             # VisualMotionTrack, interpolação, câmera suave e métricas
│   ├── content-schema/           # Contratos tipados em TypeScript para o conteúdo do jogo
│   ├── styller-importer/         # Importador de XMLs, itens, monstros e mapas do Styller OTBM
│   ├── tibia860-assets/          # Parsers binários de DAT e SPR do cliente Tibia 8.60
│   ├── auth/                     # Clientes browser/server e regras de autorização
│   └── updates/                  # Serviços de consulta e normalização de atualizações
├── content/generated/            # JSONs versionados gerados pelos importadores
├── public/generated/tibia860/    # Sprites PNGs extraídos determinísticamente
├── supabase/migrations/          # Migrations SQL com tabelas, triggers e políticas RLS
├── tests/                        # Suíte de testes com Vitest cobrindo todos os domínios
└── .planning/                    # Governança de projeto Get-Shit-Done (Roadmap, Project, State)
```

---

## 🔐 Configuração do Supabase (Opcional)

Para habilitar login, cadastro de contas reais e publicação de notícias pelo `/admin`:

1. Crie um projeto no [Supabase](https://supabase.com).
2. No **SQL Editor** do Supabase, execute a migration:  
   `supabase/migrations/202609010001_account_auth_foundation.sql`
3. Copie `.env.example` para `.env.local` e preencha suas chaves:
   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```
4. Para detalhes sobre Google OAuth e criação de administradores, consulte [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).

---

## 🧪 Verificações e Testes

O projeto conta com rigorosos padrões de tipagem estática, linting e testes unitários/integrados:

```bash
# Validação de tipos TypeScript
npm run typecheck

# Execução dos testes automatizados (Vitest)
npm test

# Análise de linting (ESLint)
npm run lint

# Build de produção
npm run build
```
