# Cavebound — MMORPG 2D Idle no Navegador

Vertical slice de um **MMORPG 2D idle no navegador**, baseado em mecânicas, fórmulas e dados autênticos do **Tibia 8.60 / 10.98 / 11 (TFS / Styller / Realmap)**. O projeto combina lógica de jogo determinística em ticks separada da interface visual, servidor autoritativo multiplayer em tempo real via **Colyseus.js**, persistência relacional com **PostgreSQL / Prisma ORM**, renderização interpolada em **PixiJS**, importação direta de dados do OpenTibia Server (`styller-master/` e `mapaserver.otbm`) e extração determinística de sprites do cliente binário oficial.

---

## ⚡ Como Executar

### Pré-requisitos
* **Node.js**: `>= 22.13.0`
* **npm**
* Pastas irmãs `styller-master/` e `tibia-860-client/` / `Tibia 11/` no mesmo diretório pai do projeto (fontes de dados somente leitura).

### Instalação e Execução

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar o servidor de jogo autoritativo Colyseus (Multiplayer)
npm run server

# 3. Iniciar o cliente web (Next.js / Vite) em outro terminal
npm run dev
```

> **Nota:** Ao executar `npm run dev`, os scripts em tempo de compilação processam os importadores e extratores de assets se necessário:
> - `npm run import:content`: Processa monstros, equipamentos, vocações, magias, economia e regiões do mapa OTBM.
> - `npm run extract:tibia860`: Extrai e compõe os sprites PNG determinísticos.

---

## 🌐 Rotas e Acesso

| Rota | Descrição | Requisitos |
|---|---|---|
| **`/game-preview`** | **Preview direto do jogo (Recomendado para Dev)**. Carrega o cliente do jogo (PixiJS, cidade de Thais, caçadas, party, inventário, skills) sem login. | `NODE_ENV === 'development'` |
| **`/`** | Landing page pública, feed de notas de atualização e modais de autenticação. | Livre / Público |
| **`/game`** | Cliente de jogo oficial integrado ao Colyseus.js e servidor autoritativo com persistência. | Requer login ativo |
| **`/admin`** | Painel de Administração (Configurações do servidor, controle de variáveis, tabela de players online, logs do sistema e métricas `@colyseus/monitor`). | Requer role `ADMIN` |

---

## 🗺️ Destaques dos Desenvolvimentos Recentes (Fases 73 a 78)

| Fase | Título | Subsistema | Foco e Entregáveis Principais | Testes |
|:---:|---|---|---|:---:|
| **73** | **Abas Privadas Dedicadas no Chat** | `chat-ui` | Abas privadas com o nome do personagem para mensagens diretas (1-to-1 PMs), isoladas do Local e World Chat, com botão de fechar (`✕`). | [`phase73-private-chat-tabs.test.ts`](tests/phase73-private-chat-tabs.test.ts) |
| **74** | **Novos Personagens em Nível 1 & Visibilidade Urbana** | `character-domain` | Inicialização estrita no Nível 1 (0 XP, 150 HP, 35 MP, 400 cap) no Templo de Thais com visibilidade imediata no mapa urbano. | [`phase74-new-characters-level-1.test.ts`](tests/phase74-new-characters-level-1.test.ts) |
| **75** | **Itens de Teste Gratuitos na Loja** | `shop-system` | Itens de teste por 0 GP na loja para avançar +1 Nível (com recálculo de vida/mana/stats), +1 ponto em cada skill e pacotes de Gold Coins. | [`phase75-testing-shop-items.test.ts`](tests/phase75-testing-shop-items.test.ts) |
| **76** | **Escolha de Vocação no Nível 8+ & Pergaminho de Troca** | `vocation-system` | Início sem vocação no Nível 1, modal autêntico de escolha no Nível 8+ (`VocationChoiceModal`) e Pergaminho de Troca de Vocação (Item 9912). | [`phase76-vocation-choice-level8.test.ts`](tests/phase76-vocation-choice-level8.test.ts) |
| **77** | **Progressão Difícil de Slots & Vocações Únicas por Conta** | `squad-domain` | Desbloqueio progressivo dos 4 slots de heróis da conta (Nível 1, 50, 100 e 150) e restrição estrita de 1 vocação de cada por conta sem duplicatas. | [`phase77-slot-progression-unique-vocations.test.ts`](tests/phase77-slot-progression-unique-vocations.test.ts) |
| **78** | **Auditoria de Progressão de Skills, Bônus & Tooltips na UI** | `skills-domain` | Bônus de **Velocidade de Ataque** e **Movimento** para skills físicas (Sword, Axe, Club, Distance, Fist); **Resistência Mágica** para Magic Level; **Mitigação Física** para Shielding; e tooltips informativos com bônus atuais e do próximo nível em `SkillsWindow`. | [`phase78-skill-progression-and-tooltips.test.ts`](tests/phase78-skill-progression-and-tooltips.test.ts) |

---

## 🏗️ Estrutura do Projeto

```text
mmorpg-web/
├── app/                          # Next.js App Router (Páginas, Layouts e Guards)
│   ├── page.tsx                  # Landing pública com notícias e login
│   ├── game/page.tsx             # Cliente de jogo oficial
│   ├── game-preview/page.tsx     # Preview rápido de desenvolvimento
│   └── admin/page.tsx            # Painel administrativo (/admin)
├── apps/web/
│   ├── components/               # Componentes React (PixiArena, ThaisCityArena, SkillsWindow, PartyWindow)
│   └── auth/                     # Autenticação e sessão client-side
├── packages/
│   ├── domain/                   # Engine pura: combate, derivedStats, A*, party, spells, itens, skills
│   ├── presentation/             # VisualMotionTrack, interpolação PixiJS e câmera dinâmica
│   ├── content-schema/           # Contratos e esquemas tipados TypeScript
│   ├── styller-importer/         # Importador de XMLs, itens e OTBM
│   └── tibia860-assets/          # Parsers binários de DAT e SPR
├── tests/                        # 48 suítes de testes com Vitest (297+ testes aprovados)
└── .planning/                    # Governança de desenvolvimento Get-Shit-Done (GSD)
```

---

## 🧪 Verificações e Testes

O projeto exige 0 erros de TypeScript e 100% de aprovação na suíte de testes:

```bash
# Validação de tipos TypeScript
npm run typecheck

# Execução dos testes automatizados (Vitest)
npm run test

# Análise de linting (ESLint)
npm run lint

# Build de produção
npm run build
```
