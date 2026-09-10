# Phase 118: Identidade Visual Exura e Janela de Autenticação com Estilo Autêntico In-Game

## Status: Complete
**Data:** 10 de Setembro de 2026  
**Responsável:** Antigravity (Pair Programming / GSD)  

---

## 1. Resumo Executivo
Atendendo à solicitação do usuário:
- **Substituição da Marca:** O logo legado e monograma "C CAVEBOUND" no topo da janela de autenticação (`AuthModal.tsx`) foi substituído pelo logo oficial do **Exura** (`/logo.png`), com proporções nítidas (`52px`), centralização elegante e filtro de sombra projetada (`drop-shadow`).
- **Paleta e Estética In-Game (Tibia 11 / Exura Online):**
  - **Moldura da Janela:** Fundo em degradê radial de pedra/ardósia escura (`radial-gradient(ellipse at 50% 15%, #191e2b 0%, #0c0f16 100%)`), borda dupla chanfrada em bronze/dourado medieval (`border: 2.5px solid #6b5329; outline: 2px solid #1c2230`), chanfro interno iluminado (`inset 0 1px 0 rgba(255, 215, 0, 0.28)`) e sombra de profundidade (`0 24px 70px rgba(0, 0, 0, 0.95)`).
  - **Botão Fechar (Close Button):** Botão quadrado chanfrado autêntico do Tibia 11 (`#131722`, borda `#3c4f72`), com efeito hover de alerta de combate em carmesim (`#8b1e1e`, borda `#ef4444`, brilho avermelhado).
  - **Tipografia:**
    - Eyebrow em ouro tibiano (`#f3e5ab`) com text-shadow nítido.
    - Título (`h2`) em branco luminoso com leve aura dourada.
    - Subtítulo suave em ardósia clara (`#94a3b8`).
    - Rótulos dos campos (`labels`) em cinza metálico com text-shadow.
  - **Campos de Entrada (Inputs):** Slots escavados na pedra com fundo `#0b0e14`, borda azul-metálica `#283347`, sombra interna profunda e foco iluminado em âmbar tibiano (`#d97706`).
  - **Botão Principal (ENTRAR / CRIAR CONTA):** Botão dourado beveled autêntico do Tibia 11 com degradê de ouro/âmbar (`#d4a843` a `#875c12`), borda iluminada (`#fce49e`), texto com relevo e brilho expansivo ao passar o mouse.
  - **Botão Secundário (Google):** Botão em ardósia/aço chanfrado com borda `#3c4f72` e hover azul suave (`#60a5fa`).
  - **Divisor e Links:** Linha suave em degradê metálico e link de alternância de conta em âmbar radiante (`#f59e0b`).

---

## 2. Arquivos Modificados
1. **`apps/web/components/public/AuthModal.tsx`**:
   - Substituição de `<div className="auth-brand"><span>C</span><strong>CAVEBOUND</strong></div>` por `<div className="auth-brand auth-brand-exura"><img src="/logo.png" alt="Exura Idle Adventures" className="auth-logo-img" /></div>`.
2. **`app/globals.css`**:
   - Refatoração completa das classes de modal de autenticação: `.auth-backdrop`, `.auth-dialog`, `.auth-dialog .modal-close`, `.auth-brand-exura`, `.auth-logo-img`, `.auth-dialog > .eyebrow`, `.auth-dialog h2`, `.auth-intro`, `.auth-form label`, `.auth-form input`, `.auth-submit`, `.auth-divider`, `.google-button`, `.auth-switch`, `.auth-message`.

---

## 3. Verificação de Qualidade
- **TypeScript:** `npm.cmd run typecheck` executado com **0 erros** (`tsc --noEmit --incremental false`).
- **Testes Unitários:** `npx.cmd vitest run tests/auth-foundation.test.ts` executado com **10/10 testes aprovados** (100%).
- **SSR / Renderização:** Requisição via curl em `http://localhost:3000/?auth=required` validou resposta HTTP 200 e montagem completa do componente.
