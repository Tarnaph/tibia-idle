# Phase 168 Summary: Bloco 1.2 - Sistema Unificado de Party & Interface Medieval Estilo Seletor de Caçadas

## Visão Geral
Nesta fase, aposentamos a divisão dicotômica e confusa entre "Squad" e "Party", unificando ambos em um **Sistema Único de Party** com **4 slots travados por vocação canônica (Knight, Paladin, Sorcerer, Druid)**. A interface foi totalmente redesenhada com a identidade visual medieval do **Seletor de Caçadas** (`hunt-exura-frame`, placa octogonal com rubis, medalhões circulares de nível, 4 cards vocacionais verticais atmosféricos e botão primário ruby).

## Realizações

### 1. Novo Componente `UnifiedPartyModal.tsx`
- Modal centralizado com backdrop escuro (`party-selector-backdrop`) e moldura Exura (`hunt-window-container.hunt-exura-frame`).
- **Barra Superior**:
  - Placa octogonal central de rubi (`hunt-header-plaque`) com "GERENCIADOR DE PARTY".
  - Abas medievais no estilo pill (`FORMAÇÃO DO TIME` e `TÁTICAS & SINERGIA`).
  - Badge de Bônus de 4 Vocações (`✨ Bônus 4 Vocações (+20% XP)`) e botão de fechar `✕`.
- **4 Cards de Vocações Estruturados**:
  - **Knight**: Vanguarda & Proteção (Tank) com foco em *Exeta Res* e absorção de dano.
  - **Paladin**: Dano Físico & Sagrado à Distância (Ranged DPS) com munições e magia divina.
  - **Sorcerer**: Dano Mágico Ofensivo em Área (Area DPS) com elementos e runas.
  - **Druid**: Curador Primário & Suporte Vital (Healer) com foco em *Exura Sio* no Knight.
- **Anatomia de Cada Card**:
  - Banner vocacional heráldico no topo com gradiente e ícone temático.
  - Art box com vinheta radial, medalhão circular de nível dourado, badge de dono (`⭐ Líder`, `👤 Sua Conta`, `🌐 Jogador`, `⚪ Disponível`).
  - Renderização do outfit em canvas com recolor ou silhueta mística para slots vazios.
  - Mini barras de HP e Mana com porcentagens em tempo real.
  - Badge de Prontidão: `🟢 PRONTO PARA CAÇAR` (auto-aprovado para alts da conta e líder; aprovado para jogadores remotos que aceitaram) e `🟡 AGUARDANDO ACEITE...` (pendente).
  - Ações dinâmicas: "Preencher com Alt" (dropdown com alts da mesma vocação), "Convidar Jogador", "Trocar Ativo", "Remover" e "Expulsar".
- **Barra de Ações Inferior**:
  - Botão secundário: `+ Convidar Jogador` (abre sub-modal rápido para digitar nick).
  - Botão primário Ruby & Gold (`hunt-btn-ruby-primary`): `ESCOLHER CAÇADA EM GRUPO` (engatilha o Seletor de Caçadas em modo time).
  - Botão secundário: `Desfazer Grupo` / `Sair da Party`.

### 2. Estilização CSS Medieval em `app/globals.css`
- Adicionados estilos completos para `.party-modal-container`, `.party-cards-grid`, `.party-vocation-card`, `.party-card-vocation-banner`, `.party-card-art-box`, `.party-card-medallion`, `.party-badge`, `.party-readiness-pill`, `.party-alt-dropdown-menu`, `.party-tactics-body` e `.party-invite-submodal-card`.
- Harmonia com os tokens medievais de `HuntSelector`.

### 3. Integração no `GamePrototype.tsx` e `WindowDockBar.tsx`
- Conectado o botão de Party da barra superior de docks (`WindowDockBar`) diretamente ao modal unificado através de `onOpenParty={() => setPartyModalOpen(true)}`.
- Conectado o botão "Completar o time" do `HuntSelector` para abrir a interface unificada.
- Adicionado banner com atalho rápido para o modal no topo da `PartyWindow` legado.

### 4. Validação & Qualidade
- `tests/phase168-unified-party-ui.test.ts`: 5/5 testes aprovados cobrindo vocações, papéis táticos, auto-readiness de alts, status de remotos e cálculo do bônus de 4 vocações.
- `tests/block1*.test.ts`: 30/30 testes aprovados.
- `npm run typecheck`: **0 erros de tipagem TypeScript**.

## Próximos Passos
- Avançar para a execução e orquestração do combate compartilhado autoritativo no servidor Colyseus (sala de caçada conjunta).
