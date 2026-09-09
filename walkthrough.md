# Walkthrough: Correções do FIX.md (Nível/XP, Spawns no Dragon Lair e Modal do Personagem com Avatares)

Implementação e validação completa das 3 correções especificadas em [FIX.md](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/FIX.md).

---

## 1. Item 1: Inconsistência de Nível e Experiência

### Problema Diagnosticado
- O `ThaisCityRoom.ts` calculava `loadedExperience` no login, mas em certas ramificações o valor caía para 0 ou entrava em desacordo com o nível.
- Salvamentos simultâneos ou com latência pelo navegador podiam sobrescrever o progresso do banco com estados defasados.
- Ao morrer, a penalidade recalculava o nível a partir da XP, rebaixando bruscamente para 7 caso a XP estivesse zerada, e posteriormente recalculava para 63 ao reassociar o total acumulado.

### Ações Implementadas
1. **Backup de Segurança do Banco de Dados:**
   - Criado backup em `prisma/dev.db.backup_20260909_200234.bak` antes de qualquer manipulação de dados.
2. **Reconciliação Monótona no Banco:**
   - Executado o script `scripts/reconcile_db_xp.ts`.
   - Todos os personagens com XP zerada tiveram a experiência atualizada para o valor mínimo do seu nível atual (`experienceForLevel(level)`). Nenhum personagem perdeu progresso ou nível.
3. **Autoridade Autoritativa no Servidor (`ThaisCityRoom.ts`):**
   - No `onJoin`, o servidor garante que `player.experience = loadedExperience` e `player.level = Math.max(level, levelForExperience(loadedExperience))`.
   - Adicionado message handler `player:syncProgress`.
4. **Proteção Monótona de Salvamento (`PrismaPersistenceManager.ts` & `characterService.ts`):**
   - O método `saveCharacter` e o endpoint `save` comparam o progresso recebido com o estado gravado e adotam sempre o maior valor (`Math.max(playerExp, existingExp)`), impedindo que requisições defasadas reduzam a XP ou o nível.
   - Penalidade de morte só diminui atributos quando explicitamente sinalizada com a flag `isDeathPenalty: true`.

---

## 2. Item 2: Spawns Acessíveis e Visibilidade no Dragon Lair

### Problema Diagnosticado
- O método `populateRespawnZone` selecionava posições sem checar se havia um caminho navegável até o centro da zona ou até o jogador, fazendo com que dragões nascessem em recortes inacessíveis de montanha/penhasco.
- No `PixiArena.tsx`, ao reentrar na mesma hunt com o mesmo `definitionId`, instâncias antigas de views podiam manter dragões com `alpha = 0` ou `visible = false`.

### Ações Implementadas
1. **Validação A\* de Acessibilidade (`packages/domain/src/combat.ts`):**
   - Em `populateRespawnZone`, cada tile candidato (tanto no conjunto principal quanto no fallback) é validado com:
     `findPath(encounter.room.map, pos, [zone.center], new Set()).length > 0`
   - Elimina completamente o surgimento de monstros isolados em plataformas inacessíveis.
2. **Reinicialização e Limpeza de Entidades (`apps/web/components/PixiArena.tsx`):**
   - Adicionada detecção de reinício de caçada (`elapsedMs < lastElapsedMs` ou mudança de sala).
   - Limpeza total das views e sprites antigos ao reiniciar ou reentrar.
   - Garantido que todo monstro vivo receba explicitamente `view.root.visible = true`, `view.sprite.alpha = 1` e `view.sprite.visible = true`.

---

## 3. Item 3: Ficha de Perfil do Personagem e 5 Avatares

### Ações Implementadas
1. **Modelagem e Persistência de Avatar:**
   - Adicionado campo `avatarId Int @default(1)` no modelo `Character` em `prisma/schema.prisma`.
   - Regenerado o cliente Prisma.
2. **5 Avatares Oficiais em Formato SVG:**
   - `public/images/avatars/avatar-1.svg` — Cavaleiro de Aço (Knight)
   - `public/images/avatars/avatar-2.svg` — Mago Arcano (Sorcerer)
   - `public/images/avatars/avatar-3.svg` — Guardião Élfico (Paladin)
   - `public/images/avatars/avatar-4.svg` — Arquidruida Ancestral (Druid)
   - `public/images/avatars/avatar-5.svg` — Lorde de Thais (Champion)
3. **Atualização da Barra Superior (`WindowDockBar.tsx`):**
   - O quadrado dourado ao lado de "CONTA [NOME]" agora exibe dinamicamente o avatar ativo e abre a ficha de perfil ao ser clicado.
4. **Componente de Ficha do Personagem (`CharacterProfileModal.tsx`):**
   - **Abas superiores:** `[PERSONAGEM]` e `[OUTFIT]`.
   - **Navegação do Squad:** Setas `<` e `>` ao lado do nome para alternar e editar os personagens do squad.
   - **Card Superior Esquerdo:** Quadrado do avatar clicável (abre o seletor com os 5 avatares), nome, nível, vocação e barras de HP, MP e Experiência percentual.
   - **Card Superior Direito:** Atributos gerais (Velocidade, Capacidade em oz, Magic Level, Regeneração de Vida/Mana, Stamina).
   - **Card Central Esquerdo:** Tabela de Skills de Combate (Fist, Club, Sword, Axe, Distance, Shielding, Fishing, Magic Level) com níveis numéricos e barras segmentadas de progresso idênticas ao Tibia.
   - **Card Central Direito:** Progresso para o próximo nível (XP restante e barra percentual), progresso no Bestiary e lista de bônus de XP (Bestiary, Scroll, Guild, Premium, Level).
   - **Card Inferior:** Detalhes de Combate (Armadura, Defesa, Dano min-max, Chance de crítico, Life Leech, Mana Leech e Dano do Bestiary).
   - **Card de Rodapé (ÚLTIMA MORTE):** Exibição da última morte com ícone de caveira, causa e tempo decorrido, acompanhado do botão "Ver o último minuto".

---

## 4. Item Adicional: Tela de Carregamento de Thais na Morte (Phase 113)

### Requisito Solicitado
- *"quando o personagem morre ele precisa passar pelo loading de thais também"*

### Ações Implementadas
1. **Ativação da Tela de Loading na Confirmação da Morte:**
   - Em `handleConfirmDeath` no arquivo [GamePrototype.tsx](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/GamePrototype.tsx), ao confirmar o respawn no [DeathModal.tsx](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/DeathModal.tsx), `setTransitionLoading` é disparado com duração de 10s (`durationMs: 10000`), mensagem `"Renasceu no Templo de Thais..."` e `huntId: undefined`.
   - O fallback canônico exibe a ilustração do Templo de Thais (`thais-loading.jpg`) e rotaciona as curiosidades históricas de Thais ("Você Sabia?").
2. **Controle de Áudio na Morte:**
   - A trilha da hunt ativa é imediatamente interrompida com `stopDragonLairBgm()`.
   - O tema musical de Thais inicia imediatamente com `playCityBgm()`.
   - Ao finalizar o carregamento, a notificação musical ("Sunset in the Village") é apresentada no canto inferior direito.
3. **Pausa de Movimentação Durante o Loading:**
   - Em `tickWalking`, a movimentação autônoma do personagem até o Depot é pausada enquanto a tela de carregamento estiver ativa (`initialLoadingActive || Boolean(transitionLoading?.active)`).
   - O personagem permanece no Templo durante todo o carregamento e inicia o trajeto até o Depot estritamente após a tela de loading sumir.
4. **Persistência de Penalidade:**
   - O estado do personagem com penalidade de morte é salvo no banco de dados com a flag `isDeathPenalty: true`, preservando a coerência entre banco e memória.

---

## 5. Verificação de Qualidade e Testes

- **Testes Automatizados (Vitest):**
  - Suíte `tests/phase113-death-loading-screen.test.ts` (3/3 aprovados).
  - Suíte `tests/phase112-level-xp-and-dragon-spawns.test.ts` (6/6 aprovados).
  - Suíte `tests/phase46-postgresql-persistence-reconnection-e2e.test.ts` (3/3 aprovados).
  - Suíte `tests/phase68-full-persistence-audit.test.ts` (7/7 aprovados).
- **TypeScript:**
  - `npm run typecheck` executado com **0 erros** de compilação.
