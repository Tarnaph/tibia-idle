# Phase 116-01-PLAN: Blindagem de Sessão/Auth Admin, Cadastro Seguro e Correção de Frame Parado (Idle Pose)

## Contexto e Objetivos

Execução autônoma completa das 3 frentes de segurança e consistência visual de `FIX.md`:
1. **Permissão de admin persistindo na troca de conta:**
   - Centralizar logout e troca de conta: expirar cookie `colyseus_token` (`max-age=0`), limpar `localStorage` (`colyseus_token`, `tibia_auth_token`), resetar `viewer` e `onlineAccount`, fechar conexão Colyseus ativa.
   - Eliminar `auth.viewer?.role || onlineAccount?.role` em `GamePrototype.tsx`, garantindo que `isAdmin` reflita estritamente a sessão da conta conectada atual validada.
   - Em `packages/auth/src/server.ts`, verificar se o token decodificado do cookie ainda pertence a uma conta válida e ativa antes de retornar perfil com privilégios.
2. **Falha crítica: cadastro público aceitando criar admin:**
   - Em `app/api/auth/register/route.ts`, ignorar qualquer parâmetro `role` do body.
   - Em `packages/auth/src/accountService.ts`, fixar `role = 'PLAYER'` para qualquer registro público.
   - Em `packages/auth/src/jwt.ts`, exigir segredo configurado e definir chave segura no `.env`.
3. **Personagem parado com pose de caminhada:**
   - Em `ThaisCityArena.tsx`:
     - O frame de caminhada deve depender estritamente de `charIsMoving` (`sample.moving`). Quando parado (`!charIsMoving`), o frame DEVE ser 0 (pose de repouso/idle).
     - Remover o acoplamento `charIsMoving || curWalk`.
     - Para jogadores remotos: remover a aplicação assíncrona de `walkFrame` capturado no passado em `.then()`.
     - Em `outfitRecolor.ts`, indicar se a textura devolvida é definitiva (`isDefinitive` / `recoloredCanvasCache.has(key)`) para que os renderizadores só travem `lastTextureKey` quando a textura final for aplicada.
     - Em `GamePrototype.tsx`, alinhar `isWalking` ao movimento real.

---

## Passos de Execução

### Passo 1: Autenticação, Logout Atômico e Autorização (Itens 1 e 2)
1. Modificar `apps/web/components/auth/TibiaAuthCharacterModal.tsx`:
   - Em `handleLogout`, limpar `colyseus_token` do `localStorage`, remover cookie via `document.cookie = 'colyseus_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'`, desconectar `gameNetwork` se conectado.
2. Modificar `apps/web/auth/AuthProvider.tsx`:
   - Em `signOut`, além do Supabase, sempre limpar cookie `colyseus_token` e `localStorage` de `colyseus_token` e `tibia_auth_token`. Resetar `viewer` para `null`.
3. Modificar `apps/web/components/GamePrototype.tsx`:
   - Definir `isAdmin` estritamente a partir da conta ativa conectada (`onlineAccount?.role === 'ADMIN' || onlineAccount?.role === 'GM'`), sem contaminação por viewer obsoleto.
4. Modificar `app/api/auth/register/route.ts`:
   - Remover `role` do body e garantir que apenas `email` e `password` sejam processados.
5. Modificar `packages/auth/src/accountService.ts`:
   - Garantir `role = 'PLAYER'` incondicionalmente no método `register()`.
6. Modificar `packages/auth/src/jwt.ts` e `.env`:
   - Adicionar validação estrita de segredo e configurar `JWT_SECRET` seguro no `.env`.

### Passo 2: Sincronização do Frame de Repouso / Idle Pose (Item 3)
1. Modificar `apps/web/components/ThaisCityArena.tsx`:
   - Linha 1076: `const charWalkFrame = charIsMoving ? walkCycle[Math.floor(now / stepRateMs) % 4] : 0;`
   - Linha 1086: não travar `view.lastTextureKey` se o canvas for provisório.
   - Linha 1521: eliminar callback assíncrono que aplicava `walkFrame` antigo em jogadores remotos. O loop do ticker naturalmente aplica a textura no próximo tick quando o canvas estiver em cache.
2. Modificar `apps/web/lib/outfitRecolor.ts`:
   - Exportar helper `isOutfitCanvasCached(outfitId, gender, dir, frame, colors, addons, mount, isMounted): boolean`.
3. Modificar `apps/web/components/GamePrototype.tsx`:
   - Garantir que `isWalking` reflita movimento físico efetivo.

### Passo 3: Testes Automatizados e Auditoria
1. Criar `tests/phase116-auth-security-and-idle-pose.test.ts`:
   - Teste 1: Cadastro público rejeita ou ignora `role: 'admin'`, criando conta estritamente como `PLAYER`.
   - Teste 2: `AccountService.register` cria contas com role `PLAYER` mesmo se invocado com tentativa de admin.
   - Teste 3: `requireAdminAuth` rejeita token de PLAYER.
   - Teste 4: Logout limpa cookies e impede persistência de permissões admin.
   - Teste 5: `GamePrototype` deriva permissão de admin estritamente da conta autenticada conectada.
   - Teste 6: `ThaisCityArena` usa frame 0 estritamente quando `isMoving === false`, mesmo que exista caminho pendente.
   - Teste 7: Texturas provisórias de fallback não travam a renderização em frames incorretos.
2. Executar `npm run typecheck` (0 erros).
3. Executar `npx vitest run tests/phase116-auth-security-and-idle-pose.test.ts` e suíte completa.
