# CORREÇÕES E ATUALIZAÇÕES RECENTES

## ⚔️ Phase 158: Vocação 'None' (Rookgaard), Criação de Personagem com Gênero e Trajes Canônicos
1. **Crash `Missing vocation None.` Eliminado:**
   - Implementado `NONE_VOCATION_DEFINITION` em `packages/domain/src/party.ts`.
   - `vocationFor(content, 'None')` retorna a definição base segura sem lançar exceção, permitindo que personagens recém-criados no Nível 1 sem vocação entrem no mundo e calculem atributos sem erros de runtime.
2. **Seleção de Sexo/Gênero (♂ Masculino / ♀ Feminino):**
   - Adicionado seletor visual na interface de criação (`TibiaAuthCharacterModal.tsx`) com destaque em azul/rosa.
   - Atribuição canônica de lookTypes do Tibia:
     - **Citizen Masculino:** LookType `128` (outfit base 'Citizen').
     - **Citizen Feminino:** LookType `136` (outfit base 'Citizen').
   - Persistência permanente da coluna `gender` no SQLite via Prisma Client (`dev.db`).
   - Badges estilizadas de gênero na listagem de personagens da conta.
3. **Escolha de Vocação Flexível (Criação Direta ou Nível 1 no Templo):**
   - **Na Criação de Personagem:** O jogador agora pode selecionar diretamente sua vocação inicial (⚔️ Knight, 🏹 Paladin, 🔮 Sorcerer, 🌿 Druid) com visual elegante e kits autênticos de equipamentos e magias, ou optar por "Sem Vocação".
   - **No Nível 1 no Jogo:** Personagens que iniciarem como "None" (Rookgaardiano) têm o `VocationChoiceModal` aberto imediatamente no Nível 1 no Templo de Thais, podendo escolher a vocação na hora.
   - **Persistência Imediata:** A vocação e os atributos (HP, Mana, Outfits) são sincronizados e gravados com 100% de persistência permanente no SQLite.

---

## 🛡️ Phase 157: Resolução de Sessão Ativa / Falso Positivo de Multi-Abas no Logoff
1. **Coordenação Multi-Aba via BroadcastChannel:**
   - Heartbeat em tempo real entre abas no canal `cavebound_auth_sessions`.
   - Quando o jogador desloga ou troca de personagem, o canal emite `SESSION_CLOSED`, liberando instantaneamente a conta sem falsos positivos de "conta já conectada".
2. **Botões de Resolução no Alerta:**
   - Inclusão do botão "Verificar Novamente" e "Desconectar Outra Aba e Liberar" caso haja abas zumbis retidas em cache.

---

## 🎨 Phase 156: Curadoria de Magias, Outfits e Montarias
1. **Preview do Outfit:** Fast-path síncrono no `renderRecoloredOutfit` e catálogo `OUTFITS_WITH_MOUNTS` para blindar trajes sem montaria. Ao clicar no outfit, ele atualiza instantaneamente no preview.
2. **Salvamento de Outfits e Montarias:** Sincronização em tempo real de `latestSaveStateRef.current` eliminando race condition com o auto-save. O outfit e a montaria persistem com 100% de confiabilidade entre sessões.
3. **Animação de Caminhada sem Deslizamento:** `preloadOutfitAllFrames` prioriza a direção ativa (`priorityDir`) carregando frames em < 30ms, e o `ThaisCityArena.tsx` atualiza a textura do PixiJS dinamicamente na alternância de frame de caminhada com `(tex.source as any).update?.()`. O personagem mexe as pernas com fluidez em todas as direções.