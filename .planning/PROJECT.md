# Cavebound — MMORPG Idle Web

## What This Is

Cavebound é um vertical slice de MMORPG 2D idle executado diretamente no navegador. O projeto combina grid, pathfinding A*, combate e progressão descolados da interface, renderização em PixiJS e extração/importação direta de dados do Styller OpenTibia Server (XML/OTBM) e assets binários do cliente Tibia 8.60 (DAT/SPR). A camada pública e de contas utiliza Supabase Auth e PostgreSQL com Row Level Security.

## Core Value

Combate e progressão idle com mecânicas e fórmulas autênticas do Tibia 8.60 (TFS), com lógica de jogo autoritativa e determinística desacoplada da camada visual de renderização.

## Requirements

### Validated

- [x] Motor de combate em ticks e simulação determinística com curva de XP oficial do TFS.
- [x] Sistema de equipamentos por slots (Knight starter set) com derivação de ataque/defesa por skill.
- [x] Espacialidade 2D em grid discreto com A* pathfinding, prevenção de corner-clipping e ocupação atômica de tiles.
- [x] Camada de apresentação em PixiJS com `VisualMotionTrack` e interpolação contínua de movimentos e direções.
- [x] Treinamento funcional de skills com dummies na Training Room e fórmulas de avanço vocacionais.
- [x] Importador somente leitura de conteúdo STYLLER (monstros, itens, magias, vocações, economia e mapas OTBM).
- [x] Extrator de assets do Tibia 8.60 (DAT/SPR) com conversão determinística para PNGs e manifesto com validação SHA-256.
- [x] Suporte a grupo (Party) de até 4 vocações únicas com estados, inventários, hotbars e relógios de ataque/movimento independentes.
- [x] Sistema de magia com custo de mana, cooldown, efeitos visuais/projéteis e dano escalado por Magic Level.
- [x] Promoção de vocações (Elite Knight, Master Sorcerer, etc.) aos níveis e custos adequados.
- [x] Rotas de caça contínuas em loop (Continuous Hunt) em mapas abertos OTBM com zonas de respawn e variantes raras.
- [x] Câmera dinâmica de expedição acompanhando o líder com interpolação suave e troca de equipamento em tempo real.
- [x] Economia de Loot Pouch com travas de venda, cálculo de capacidade/peso de inventário e divisão de XP compartilhado.
- [x] Camada de autenticação e contas com Supabase Auth (Email + Google OAuth), migrations com RLS e rota `/game-preview` para desenvolvimento local sem login.

### Active

- [ ] Persistência de savegame do jogador no banco PostgreSQL / Supabase (atualmente o save da sessão é em memória).
- [ ] Expansão de novas criaturas, magias e equipamentos importados da base do Styller.
- [ ] Sistema de chat de party e comandos in-game.

### Out of Scope

- Mundo aberto massivo contínuo com múltiplos jogadores na mesma instância de tela (o modelo é instanciado para o jogador e sua party idle).
- Parser completo de mapas OTBM dinâmicos no cliente (os mapas são pré-compilados pelos importadores offline/build-time).
- Modificação ou escrita nos arquivos originais do cliente Tibia ou do servidor Styller (as fontes originais são estritamente somente leitura).

## Context

- **Fontes de dados:** `../styller-master/` (XMLs de monstros, itens, vocações, magias e `styller.otbm`) e `../tibia-860-client/` (`Tibia.dat` e `Tibia.spr`).
- **Engine Web:** React 19 + Next.js App Router rodando sobre o motor Vite 8 / Vinext com suporte a RSC (React Server Components).
- **Backend / Dados:** Supabase Auth + PostgreSQL com RLS.

## Constraints

- **Node.js**: `>= 22.13.0` (suporte a `--experimental-strip-types` e compatibilidade Node nativa).
- **Leitura Estrita**: Importadores nunca modificam os diretórios originais do TFS ou do cliente 8.60.
- **Determinismo**: Toda a simulação e combate em `packages/domain/` depende exclusivamente de sementes (seeds) e nunca consome RNG visual.
- **Segurança**: Credenciais administrativas e chaves de serviço nunca são expostas ao cliente web; todas as rotas e tabelas utilizam RLS.

## Key Decisions

| Decisão | Racional | Status |
|---------|----------|--------|
| Separação estrita entre `domain` e `presentation` | Garante que o jogo possa ser testado, simulado e recalculado headless sem depender de WebGL/Canvas | Validado |
| Extração estática de assets DAT/SPR para PNG | Permite carregamento otimizado no navegador através do PixiJS sem exigir parsing binário no browser | Validado |
| Rota `/game-preview` sem auth em desenvolvimento | Facilita iteração rápida e testes locais sem exigir configuração obrigatória do Supabase | Validado |
| Rotas contínuas em loop no OTBM em vez de salas fechadas | Cria a verdadeira experiência imersiva de hunt do Tibia mantendo a natureza idle | Validado |
