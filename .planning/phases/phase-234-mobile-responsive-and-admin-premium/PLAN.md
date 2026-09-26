# Phase 234: Diagnóstico de Seleção de Outfit, Interface Mobile Responsiva (Retrato & Paisagem) e Gestão de Assinatura Premium por Dias no ADMIN

## 🎯 Objetivo Geral
Entregar com excelência e estabilidade absoluta as demandas consolidadas no `FIX.md`:
1. **Bug Prioritário (P0):** Diagnosticar e resolver o congelamento na tela estática de Thais (`GameClientLauncher` suspense / `thais-loading.jpg`) ao clicar em "Set Outfit" e selecionar o traje "Citizen".
2. **Bloco A — Interface Mobile Responsiva (Retrato & Paisagem):** Transformar o Exura | Idle Adventures em uma experiência mobile completa, fluida e ergonômica, inspirada diretamente na imagem de referência anexada, preservando 100% da paridade com o Desktop, mecânicas de combate, salvamento, hotkeys, áudio e regras de jogo.
3. **Bloco B — Gestão de Assinatura Premium por Dias no ADMIN:** Implementar no painel administrativo (`/admin` → Jogadores) a gestão de Premium por dias com cálculo de expiração UTC autoritativo, auditoria de logs e persistência no banco Prisma DB.

---

## 🏗️ 1. Diagnóstico e Resolução do Freeze ao Selecionar Citizen (Bug P0)
- **Causa Raiz Identificada:**
  1. Durante a abertura de modais ou renderização de previews no `OutfitModal`, qualquer falha de carregamento de chunk (especialmente logo após reinicializações/rebuilds na VPS) ou colapso do ciclo de vida no React faz com que o `dynamic(() => import('./GamePrototype'))` em `GameClientLauncher.tsx` desmonte o `GamePrototype` e re-renderize o fallback estático `loading: () => <div style={{ backgroundImage: 'url(/images/loading/thais-loading.jpg)' }} />` sem controles e sem barra de progresso.
  2. Tratamento defensivo no `OutfitModal.tsx`:
     - Blindar a consulta `getAddonQuestFor(selectedOutfit, 1)` e a contagem de inventário para garantir que qualquer outfit selecionado (mesmo sem itens ou com valores nulos) nunca lance exceções durante o render.
     - Garantir que a renderização no canvas de preview (`renderRecoloredOutfit`) capture qualquer erro sem propagar rejeições para a árvore do React.
     - Proteger `GameClientLauncher.tsx` com um `ErrorBoundary` dedicado ao redor do `GamePrototype`, garantindo que um erro isolado de modal nunca desmonte o motor do jogo inteiro nem trave na tela de fundo de Thais.

---

## 📱 2. Bloco A — Interface Mobile Responsiva (Componentes e Organização)

### 2.1. Arquitetura de Detecção e Estado Responsivo
- Hook `useResponsiveLayout`:
  - Detecção em tempo real via ResizeObserver e `window.matchMedia`:
    - `isMobile`: largura de tela < 768px ou toque nativo.
    - `orientation`: `'portrait'` (altura > largura) vs `'landscape'` (largura >= altura).
    - `safeAreaInsets`: suporte a entalhe (notch) do celular via CSS `env(safe-area-inset-top, bottom, left, right)`.
  - Mudança de orientação **não recarrega a página**, não desconecta o WebSocket, não reseta a caçada e não duplica o áudio.

### 2.2. Organização no Modo Retrato (Portrait — Referência Visual)
Baseado diretamente no print fornecido pelo usuário:
1. **Header Mobile Compacto (`MobileTopBar.tsx`):**
   - **Avatar & Identidade:** Miniatura do avatar com borda dourada chanfrada.
   - **Informações do Herói:** Nome do personagem (ex: `Griener`), vocação e nível (ex: `Druid Lv 7`), com badge dourada `[👑 PREMIUM]` ou `[BÁSICO]`.
   - **Barras de Status:**
     - Barra de Vida (HP) vermelha com texto central `150 / 150`.
     - Barra de Mana (MP) azul com texto central `35 / 35`.
     - Barra de Experiência (XP) fina dourada com porcentagem `19.0%`.
   - **Ações Rápidas do Topo:**
     - Botão de Configurações (ícone de engrenagem chanfrado).
     - Indicador de Latência / Conexão (barras verticais com bolinha verde de online).
2. **Widget de Notificação de Música (`MobileMusicBadge.tsx`):**
   - Card flutuante no topo direito com fundo escuro e detalhes dourados: `♪ Thais Theme - Sunset in the Village ✕`.
   - Pequeno, temporário (auto-ocultamento após 5s) e com botão explícito de fechar.
3. **Área Central do Mapa/Canvas:**
   - Ocupa a maior área disponível da tela do celular.
   - Câmera suave centralizada no personagem, com proporções preservadas e sprites nítidos (pixel-art sem esticar).
4. **D-Pad Virtual Flutuante (`MobileVirtualDPad.tsx`):**
   - No canto inferior esquerdo do mapa (semi-transparente, 120×120px).
   - Movimentação direcional por toque com suporte a 4 direções e diagonais.
   - Touch events com `stopPropagation()` e `preventDefault()` para **nunca** clicar no chão ou mapa por engano.
   - Desativado e oculto automaticamente durante caçadas idle automáticas.
5. **Barra de Hotkeys Mobile (`MobileHotkeyBar.tsx`):**
   - Linha horizontal de atalhos ergonômicos (mínimo 44×44px de área de toque).
   - Exibição de magias, runas e poções configuradas com contadores reais (ex: 10x).
   - Indicador de cooldown circular autêntico.
   - Botão de Chat com atalho rápido e badge vermelha de mensagens não lidas.
6. **Dock Bar de Navegação Mobile (`MobileBottomNav.tsx`):**
   - 6 botões no rodapé: `[🎯 Mundo]`, `[🛡️ Personagem]`, `[🎒 Inventário]`, `[👥 Social]`, `[📊 Métricas]`, `[☰ Menu]`.
   - Aba ativa destacada com chanfro dourado e fundo preto carvão.
   - Abertura de gavetas inferiores (bottom sheets expansíveis) ou telas completas para Inventário, Equipamentos e Quests, evitando sobreposição caótica de janelas.

### 2.3. Organização no Modo Paisagem (Landscape)
- **Header:** Ultra-compacto no topo esquerdo para não consumir altura útil.
- **Controles Laterais:** D-pad no canto inferior esquerdo; Hotkeys na lateral direita ou canto inferior direito.
- **Centro Limpo:** Viewport do combate 100% desobstruído para visualização de monstros e efeitos.
- **Painéis Secundários:** Abertura como gavetas laterais direitas deslizantes, mantendo o herói visível à esquerda.

### 2.4. Desktop
- Mantido exatamente como está, sem regressões visuais ou de usabilidade.

---

## 💎 3. Bloco B — Gerenciamento de Premium por Dias no ADMIN

### 3.1. Modelagem e Persistência no Banco (Prisma)
- Alteração no `prisma/schema.prisma`:
  - Adição do campo `premiumUntil DateTime?` no model `Account`.
- Regra de Avaliação Autoritativa:
  - `isPremium = account.role === 'ADMIN' || (account.isPremium && (account.premiumUntil === null || account.premiumUntil > new Date()))`.
  - Assegura que cargos administrativos (`ADMIN`, `GOD`, `GM`) mantenham acesso ilimitado sem depender de contagem regressiva de dias.

### 3.2. Interface no Painel de Administração (`AdminPlayersTab.tsx`)
- Adição da coluna/botão **"💎 Premium"** na tabela de contas e jogadores em `/admin`.
- Modal de Gestão de Assinatura:
  - Identificação clara da conta (Email e Personagens vinculados).
  - Status atual: `Free Account` ou `Premium Account`.
  - Vencimento atual em UTC e formato local legível + tempo restante (ex: *"Faltam 28 dias e 14 horas"*).
  - Campo numérico para quantidade de dias (inteiros positivos).
  - Ações com cálculo em tempo real do novo vencimento projetado:
    - Botão **"+ Adicionar dias"** (estende vencimento atual se ativo, ou inicia a partir de agora se free/vencido).
    - Botão **"- Remover dias"** (reduz vencimento; se resultado <= agora, vira Free).
    - Atalho rápido **"+ 30 Dias"**.
    - Botão de encerramento imediato **"Tornar Free Account"** com diálogo de confirmação.

### 3.3. API Segura e Auditoria
- Rota protegida: `POST /api/admin/premium`.
  - Verificação de role `ADMIN` ou `GOD`.
  - Transação atômica (`$transaction`) no Prisma.
  - Registro de auditoria (`admin_audit_logs` ou logger administrativo) com:
    - ID e email do administrador.
    - Conta afetada.
    - Ação executada (ADD, REMOVE, SET_30, CANCEL).
    - Dias alterados.
    - Data anterior e nova data de expiração.
    - Timestamp da operação.
- Atualização em tempo real sem exigir relog do jogador conectado.

---

## 🧪 4. Plano de Validação & Testes
1. **Teste Automatizado de Permissões e Duração:**
   - Testes unitários para cálculo de dias, expiração UTC, extensão de dias e reversão para Free.
2. **TypeScript & Typecheck:**
   - Execução de `npm run typecheck` com 0 erros.
3. **Testes Visuais e Responsividade:**
   - Validação em telas móveis nos formatos Retrato (ex: 390x844 iPhone / 412x915 Android) e Paisagem (ex: 844x390 / 915x412).
   - Capturas de tela das duas orientações.
4. **Deploy e Validação na VPS:**
   - Push para `origin/main`.
   - Execução do build de produção e restart dos serviços PM2 na VPS `187.7.16.210`.
   - Teste no celular e navegador real.
