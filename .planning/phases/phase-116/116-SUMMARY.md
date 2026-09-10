# Phase 116 Summary: Blindagem de Sessão/Auth Admin, Cadastro Seguro e Correção de Frame Parado (Idle Pose)

## Status: Complete
**Data:** 2026-09-10
**Duração:** Execução autônoma completa
**Testes:** 8/8 novos testes passando em `tests/phase116-auth-security-and-idle-pose.test.ts` (100% de sucesso na suíte de auth e visual arena).
**Typecheck:** 0 erros de TypeScript (`npm run typecheck`).

---

## 1. Objetivos Entregues

A Fase 116 executou e auditou com rigor as 3 frentes críticas especificadas em `FIX.md`:

### Item 1: Permissão de Admin Persistindo na Troca de Conta (Sessão / Logout)
- **Problema:** Ao deslogar de uma conta ADMIN e logar em uma conta comum, o cookie `colyseus_token` não era invalidado no browser, e o SSR (`getCurrentViewer`) mantinha a conta admin nos headers/cookies. Além disso, `GamePrototype.tsx` realizava `auth.viewer?.role || onlineAccount?.role`, permitindo que um viewer antigo concedesse poderes de admin a contas comuns em jogo.
- **Solução Implementada:**
  - `apps/web/components/auth/TibiaAuthCharacterModal.tsx`: No `handleLogout()` e ao falhar token de autenticação, invalida atômica e explicitamente o cookie `colyseus_token` via `document.cookie = 'colyseus_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'`, remove `colyseus_token` e `tibia_auth_token` do `localStorage`, desconecta a rede do jogo e aciona `onLogout?.()`.
  - `apps/web/auth/AuthProvider.tsx`: Em `signOut()`, expira o cookie `colyseus_token` incondicionalmente e remove os tokens do `localStorage`, resetando o estado de autenticação em memória.
  - `apps/web/components/GamePrototype.tsx`:
    - A checagem `roleUpper` e `isAdmin` prioriza estritamente a conta autenticada em jogo (`onlineAccount ? onlineAccount.role : (auth.viewer?.role || 'PLAYER')`), impedindo que viewers obsoletos sobrescrevam o role real da conta logada.
    - No `onExitGame`, executa a purga de tokens de storage, cookie e aciona `auth.signOut()`.

### Item 2: Falha Crítica de Cadastro Público Criando Admin & JWT Secret Seguro
- **Problema:** A rota `/api/auth/register` aceitava `role` no corpo da requisição e repassava ao `AccountService.register()`, permitindo escalonamento de privilégios. Adicionalmente, faltava garantia estrita de `JWT_SECRET` forte em ambiente de produção.
- **Solução Implementada:**
  - `app/api/auth/register/route.ts`: Parâmetro `body.role` foi completamente removido do payload processado. O endpoint agora extrai apenas `email` e `password`, repassando exclusivamente `{ email, password }` ao serviço.
  - `packages/auth/src/accountService.ts`: O método `register()` força incondicionalmente `const role = 'PLAYER';` no banco de dados Prisma, garantindo impossibilidade matemática de registro com privilégios elevados.
  - `packages/auth/src/jwt.ts`: Adicionado `getJwtSecret()`, que valida a existência de segredo forte em produção e aplica chave segura para assinatura e validação de tokens JWT.
  - `.env`: Configurado `JWT_SECRET="cavebound-jwt-secret-secure-prod-auth-key-2026"`.

### Item 3: Personagem Parado com Pose de Caminhada (Idle Pose / Frame 0)
- **Problema:**
  1. No jogador local, o cálculo do frame de caminhada utilizava `charIsMoving || curWalk`. Quando o jogador parava fisicamente, `curWalk` ainda continha referências ou demorava para ser zerado, fazendo o personagem ser renderizado com pose de caminhada (frame 1 ou 2) parado.
  2. Em jogadores remotos (`remotePlayers`), um callback assíncrono `.then()` em `preloadOutfitAllFrames` aplicava o `walkFrame` capturado no passado quando o carregamento terminava. Se o jogador parasse durante o carregamento da imagem, o `.then()` forçava a pose de caminhada em cima do personagem parado.
  3. Ao renderizar com fallback síncrono provisório antes do carregamento dos sprites definitivos, `view.lastTextureKey = textureKey` era fixado, impedindo que o ticker atualizasse para a textura definitiva assim que estivesse pronta.
- **Solução Implementada:**
  - `apps/web/lib/outfitRecolor.ts`: Exportada a função `isOutfitCanvasCached(outfitId, gender, direction, frame, colors, addons, mount, isMounted): boolean`.
  - `apps/web/components/ThaisCityArena.tsx`:
    - Jogador local: `const charWalkFrame = charIsMoving ? walkCycle[Math.floor(now / stepRateMs) % 4] : 0;`. Desacoplamento total de `curWalk`; se `charIsMoving` for false, o frame é 0 de forma garantida.
    - Deteção de cache: `view.lastTextureKey` só é travado se `isCached === true`. Enquanto a textura for provisória, o ticker continua checando a cada tick até que o canvas definitivo colorido seja aplicado.
    - Jogadores remotos: Eliminado o callback assíncrono `.then()` com textura obsoleta. O pré-carregamento é disparado com `.catch(() => {})`, e o ciclo natural de 60 FPS do Pixi ticker aplica a textura com o frame e direção exatos do momento em que a imagem estiver em cache.
  - `apps/web/components/PixiArena.tsx`: Atualizada a renderização de arena com `isOutfitCanvasCached` para máxima consistência visual em todos os modos do jogo.

---

## 2. Arquivos Modificados / Criados

- `app/api/auth/register/route.ts` (remoção de role no cadastro público)
- `packages/auth/src/accountService.ts` (força incondicional de role PLAYER)
- `packages/auth/src/jwt.ts` (gestão segura de JWT Secret com `getJwtSecret()`)
- `.env` (definição de JWT_SECRET forte)
- `apps/web/components/auth/TibiaAuthCharacterModal.tsx` (invalidação atômica de cookie max-age=0 e tokens no logout)
- `apps/web/auth/AuthProvider.tsx` (invalidação de cookie e storage em signOut)
- `apps/web/components/GamePrototype.tsx` (derivação estrita de isAdmin via onlineAccount e sanitização onExitGame)
- `apps/web/lib/outfitRecolor.ts` (exportação de isOutfitCanvasCached)
- `apps/web/components/ThaisCityArena.tsx` (desacoplamento de idle pose no frame 0 e eliminação de stale async textures)
- `apps/web/components/PixiArena.tsx` (suporte a isOutfitCanvasCached para renderização de caça)
- `tests/phase116-auth-security-and-idle-pose.test.ts` (suíte automatizada completa de 8 testes)

---

## 3. Verificação e Testes

- `npm.cmd run typecheck`: **0 erros de tipagem**.
- `npx.cmd vitest run tests/phase116-auth-security-and-idle-pose.test.ts`: **8/8 testes passando**.
- `npx.cmd vitest run tests/phase67-admin-access-guard.test.ts tests/auth-foundation.test.ts tests/phase42-postgresql-prisma-auth.test.ts`: **25/25 testes passando**.
- `npx.cmd vitest run tests/phase34-thais-arena-visual-parity.test.ts tests/phase55-multiplayer-remote-rendering.test.ts tests/phase65-thais-arena-remote-players-visibility.test.ts`: **10/10 testes passando**.
- Servidor web Next.js (`npm run dev`) e servidor Colyseus autoritativo ativos em background sem erros.
