# Phase 119: Substituição dos Avatares do Jogo pelas Novas Ilustrações

## Status: Complete
**Data:** 10 de Setembro de 2026  
**Responsável:** Antigravity (Pair Programming / GSD)  

---

## 1. Resumo Executivo
Atendendo à solicitação do usuário em `/gsd-phase troque os avares do jogo por esses`:
- Os avatares vetoriais antigos do jogo (`public/images/avatars/avatar-[1-5].svg`) foram substituídos pelos **5 novos retratos ilustrados de alta resolução** fornecidos pelo usuário, alinhados à temática dark fantasy medieval do Exura Online:
  1. **Avatar 1: Cavaleiro de Aço (Knight)** — Guerreiro de armadura forjada, elmo clássico de chifres, espada rúnica e escudo com brasão de fogo.
  2. **Avatar 2: Mago Arcano (Sorcerer)** — Arquimago de cabelos prateados, sorriso sinistro, manto púrpura de gola alta e amuleto místico.
  3. **Avatar 3: Guardiã Sagrada (Paladin)** — Valquíria/Paladina loira com diadema alado, armadura cerimonial e cetro com cristal de luz.
  4. **Avatar 4: Feiticeira dos Bosques (Druid)** — Druida/Bruxa de longos cabelos ruivos, vestes azuis com runas nórdicas e chapéu pontudo clássico com gema rubi.
  5. **Avatar 5: Lorde de Thais (Champion)** — Veterano de guerra bárbaro/berserker barbudo com armadura pesada de placas e ombreiras douradas.

---

## 2. Arquitetura e Formatos de Imagem
- Para garantir compatibilidade retroativa absoluta e evitar qualquer erro 404 em componentes existentes:
  - Cada avatar foi disponibilizado em formato nativo **`.png`** (para decodificação ultra-rápida no navegador).
  - Cada avatar foi disponibilizado em formato nativo **`.jpg`**.
  - Cada avatar foi encapsulado em **`.svg`** com a imagem embutida via base64 e bordas arredondadas proporcionais, assegurando que componentes que ainda utilizem extensão `.svg` exibam a nova arte imediatamente.

---

## 3. Arquivos Modificados
1. **Assets (`public/images/avatars/`)**:
   - `avatar-1.png`, `avatar-1.jpg`, `avatar-1.svg`
   - `avatar-2.png`, `avatar-2.jpg`, `avatar-2.svg`
   - `avatar-3.png`, `avatar-3.jpg`, `avatar-3.svg`
   - `avatar-4.png`, `avatar-4.jpg`, `avatar-4.svg`
   - `avatar-5.png`, `avatar-5.jpg`, `avatar-5.svg`
2. **`apps/web/components/CharacterProfileModal.tsx`**:
   - Atualizado array `AVAILABLE_AVATARS` com os novos caminhos `/images/avatars/avatar-[1-5].png`, nomes e descrições aprimoradas.
3. **`apps/web/components/window/WindowDockBar.tsx`**:
   - Atualizado card do perfil na barra superior para exibir a imagem nativa `.png`.
4. **`tests/phase112-level-xp-and-dragon-spawns.test.ts`**:
   - Ajustado regex de validação de rota de imagem para aceitar `\.(svg|png|jpg)$`.
5. **`scripts/install-new-avatars.mjs`**:
   - Script de conversão e extração atômica dos avatares para o build.

---

## 4. Verificação de Qualidade
- **TypeScript:** `npm.cmd run typecheck` com **0 erros**.
- **Testes Automatizados:** Suíte completa de testes do Vitest executada:
  - **120 de 120 arquivos de teste aprovados** (664 testes aprovados, 0 falhas).
