# CORREÇÕES - CONCLUÍDAS (Phase 116)

Todas as correções foram implementadas e validadas com sucesso através do fluxo GSD do projeto (Phase 116).

- [x] **1. Permissão de admin persiste na troca de conta** [RESOLVIDO]
  - `handleLogout()` e `signOut()` expiram `colyseus_token` via `max-age=0` e purgam `localStorage`.
  - `GamePrototype.tsx` deriva `isAdmin` estritamente da conta autenticada em jogo (`onlineAccount?.role`).
  - Purga completa de tokens e desconexão de rede ao deslogar ou sair do jogo.

- [x] **2. Falha crítica adicional: cadastro público aceita criar admin** [RESOLVIDO]
  - Rota `/api/auth/register` não aceita mais `body.role`.
  - `AccountService.register` força `role = 'PLAYER'` incondicionalmente no banco de dados.
  - `getJwtSecret()` valida e exige segredo forte configurado, protegido via `.env`.

- [x] **3. Personagem parado com pose de caminhada** [RESOLVIDO]
  - `ThaisCityArena.tsx` desacopla `charWalkFrame` de `curWalk`, dependendo estritamente de `charIsMoving` (se parado, frame é 0 de forma garantida).
  - Eliminados callbacks assíncronos (`.then()`) que sobrescreviam texturas com frames antigos de caminhada.
  - `isOutfitCanvasCached` agora previne o travamento da chave de textura quando é retornado um canvas de fallback provisório, garantindo atualização para a textura definitiva assim que carregada.
  - Renderizadores de caça (`PixiArena.tsx`) alinhados com o mesmo padrão.