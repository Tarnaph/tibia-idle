# Phase 240: Redesign Minimalista do Gerenciador de Party

## 🎯 Objetivo
Transformar a interface do Gerenciador de Party (`UnifiedPartyModal.tsx`) em uma experiência minimalista, elegante e compacta, eliminando o excesso de informações, removendo abas irrelevantes de táticas/sinergias e centralizando a formação do time em 4 cards claros com visual autêntico do TibiaWeb / Cavebound conforme a referência visual.

---

## 🛠️ Alterações Executadas

### 1. `apps/web/components/party/UnifiedPartyModal.tsx`
- **Remoção de Abas & Poluição:**
  - Removida navegação de abas ("FORMAÇÃO DO TIME" e "TÁTICAS & SINERGIA").
  - Removido texto prolixo de táticas por slot no corpo principal; inseridas descrições curtas e diretas de 1 linha:
    - **Knight:** `Vanguarda e defesa (Tank)`
    - **Paladin:** `DPS híbrido à distância`
    - **Sorcerer:** `Dano mágico explosivo`
    - **Druid:** `Cura e suporte`
- **Cabeçalho Compacto & Elegante:**
  - Ícone de brasão com espadas cruzadas `⚔️`.
  - Título `Gerenciador de Party` e subtítulo `Monte sua composição ideal para caçar.`.
  - Seção de `Formação recomendada` com 4 ícones temáticos (🛡️ Knight, 🏹 Paladin, 🔥 Sorcerer, 🌿 Druid).
  - Pílula contadora de ocupação: `👥 X/4 vagas`.
  - Botão fechar `[ ✕ ]` estilizado.
- **Cards de Vocações Compactos (Grid 4 colunas):**
  - **Slot Ocupado:**
    - Moldura de avatar circular (72px) com borda temática da vocação.
    - Miniatura de outfit animada com canvas recolor.
    - Medalhão de nível circular no canto inferior esquerdo (`82`).
    - Tag de origem no canto inferior direito (`★ Líder`, `👤 Sua Conta`, `🌐 Jogador`).
    - Nome do personagem com destaque tipográfico.
    - Barra de vida sutil com texto de HP e porcentagem (`1365 / 1365 HP (100%)`).
    - Divisor sutil em losango `◈`.
    - Pílula de prontidão com LED verde `● PRONTO PARA CAÇAR`.
    - Micro-ações contextuais de troca ou remoção.
  - **Slot Vazio:**
    - Marca d'água sutil com ícone da vocação ao fundo.
    - Botão circular `(+)` em destaque.
    - Descrição de função resumida em 1 linha.
    - Divisor sutil em losango `◈`.
    - Botão `+ Adicionar` com menu dropdown para escolher alts da conta disponíveis, criar novo personagem da vocação ou convidar jogador.
- **Barra de Ações Inferior (Footer):**
  - Esquerda: `[ 👤+ Convidar Jogador ]` e `[ 👥 Autopreencher ]` (aloca automaticamente alts disponíveis da conta nas vagas abertas correspondentes).
  - Centro: Botão dourado majestoso `[ ⚔️ Iniciar Caçada ]`.
  - Direita: Botão de ação discreto em tom avermelhado `[ ↺ Desfazer Grupo ]` ou `[ ↺ Sair do Grupo ]`.

### 2. `app/globals.css`
- Substituição dos estilos volumosos anteriores do modal de party pelos novos componentes compactos:
  - `.party-modal-container`: dimensões contidas com `width: min(840px, 94vw); max-height: min(560px, 88vh);`.
  - `.party-header-compact`, `.party-recommended-formation`, `.party-slots-counter-pill`.
  - `.party-cards-grid`, `.party-vocation-card`, `.party-card-portrait-circle`, `.party-card-circle-lvl`, `.party-card-circle-tag`.
  - `.party-footer-compact`, `.party-start-hunt-gold-btn`.

---

## 🧪 Validação
- **Testes Unitários:** `tests/phase240-party-manager-redesign.test.ts` (4 testes aprovados).
- **TypeScript:** Verificação estrita com `npm run typecheck` (0 erros).
