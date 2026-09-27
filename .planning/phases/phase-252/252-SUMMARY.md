# Phase 252 Summary: Experiência Mobile Game-First & Minimalista, Redesign Auth/Char, Kick Concorrente, Fix Spider Burrow e Métricas Compactas

## 🎯 Objetivo da Fase
Implementar as diretrizes do `FIX.md` autorizadas pelo usuário para transformar a interface mobile em uma experiência limpa, nativa e com cara autêntica de jogo RPG, eliminando o visual denso de web desktop e resolvendo os problemas de travamento e concorrência:
1. **Áudio Mobile Canônico:** Banner menor (`MobileMusicBadge`) padronizado para todas as músicas no celular, inibindo o `MusicTrackToast` grande de desktop.
2. **Correção da Spider Burrow:** Coordenadas oficiais `[32094, 32108, 8]`, raio 25, `available: true`, `status: 'available'` e malha navegável extraída do RealMap 11 em `hunt-regions.json` com 6 pontos de spawn.
3. **Janela VIP (Amigos) Mobile:** Ajuste para limites de tela (`max-width: 95vw, max-height: 85vh`), cabeçalho de 42px e botões de 36x36px com `onTouchEnd` nativo em `DraggableWindow.tsx`.
4. **Widget Minimalista de Métricas (`MobileHuntMetricsWidget`):** Mini-card flutuante semi-transparente fixado no topo, com XP/h, Gold/h e monstros mortos, minimizável em um pill discreto com 1 toque sem cobrir o combate.
5. **Redesign do Bestiário Mobile no Padrão Game Menu:** Topo com contador de concluídos e bônus de XP de Bestiário, cards táteis de criaturas com barra de progresso horizontal dourada e drawer de detalhes com botão `◀ Voltar` proeminente.
6. **Redesign da Seleção e Criação de Personagens:** Ocultação do vídeo do bardo no mobile (`<= 768px`) poupando bateria e dados, container responsivo em padrão Royal Dark Stone, cards verticais com botão largo "JOGAR", botão "+ Novo Personagem" (até 4 slots), e formulário de criação touch com botões largos de gênero (♂ | ♀) e vocações.
7. **Trava de Sessão Única & Kick Concorrente (PC vs Celular):** No `ThaisCityRoom.ts`, detecção de logins simultâneos na mesma conta, save atômico do jogador anterior no Prisma DB (`await persistenceManager.saveCharacter`), kick limpo com código 4001 (`session:duplicate`), e exibição de modal informativo no frontend com botões `[Reconectar Aqui]` e `[Voltar ao Início]`.

---

## 🛠️ Arquivos Modificados / Criados
- `content/generated/hunt-regions.json`: Malha navegável e spawns oficiais da Spider Burrow `[32094, 32108, 8]`.
- `packages/realmap11-importer/src/importHuntRegions.ts`: Configuração canônica da Spider Burrow com raio 25 e `available: true`.
- `packages/domain/src/hunt.ts`: `status: 'available'` para Spider Burrow.
- `apps/web/components/GamePrototype.tsx`:
  - `MusicTrackToast` restrito a `!responsive.isMobile`.
  - Integração do `MobileHuntMetricsWidget` no mobile e `DraggableWindow` no desktop.
  - Modal estético Royal Dark Stone de sessão concorrente com botões `[Reconectar Aqui]` e `[Voltar ao Início]`.
- `apps/web/components/mobile/MobileHuntMetricsWidget.tsx`: Novo componente flutuante compacto e minimizável.
- `apps/web/components/window/DraggableWindow.tsx`: Suporte a `onTouchEnd` nos controles e limites responsivos móveis.
- `apps/web/components/CyclopediaModal.tsx`: Redesign de layout do Bestiário com resumo de progresso, bônus de XP, cards táteis e navegação fluida.
- `apps/web/components/auth/TibiaAuthCharacterModal.tsx`: Ocultação do vídeo bardo no mobile, container responsivo, botão "+ Novo Personagem" e classes móveis.
- `app/globals.css`: Regras `@media (max-width: 768px)` para DraggableWindow, Cyclopedia, Bestiário e Auth Modal.
- `packages/server/src/rooms/ThaisCityRoom.ts`: Persistência atômica pré-kick concorrente e desconexão graciosa com código 4001.
- `tests/phase252-mobile-game-first-and-fix-overhaul.test.ts`: Nova suíte com 7 testes cobrindo todas as funcionalidades.
- `tests/phase84-hunt-regions-availability-regression.test.ts`: Atualizado para validar que a Spider Burrow é navegável e ativa.

---

## 🧪 Verificação & Qualidade
- **Vitest:** 7/7 testes aprovados na suíte dedicada `phase252-mobile-game-first-and-fix-overhaul.test.ts`.
- **Regressão:** Suítes das fases 84, 185 e 251 100% aprovadas.
- **Typecheck:** 0 erros de tipagem TypeScript em todo o monorepo (`tsc --noEmit`).
