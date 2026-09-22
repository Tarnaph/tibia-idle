# CORREÇÕES

## Concluído na Phase 225:
- [x] **Eliminação Definitiva do Erro de Salto Anômalo e Travamento de Saída:**
  - Substituído o erro fatal de "Salto anômalo de habilidade não permitido" e "Contexto pendente" no backend por telemetria silenciosa de auditoria (`[AUDIT_TELEMETRY]`). Saves legítimos em caçada agora respondem sempre com HTTP 200 OK.
  - Removido o bloqueio rígido `incomingVal > prevVal + 2` que causava falsos positivos constantes ao subir habilidades.
  - Blindada a saída de caçada no `GamePrototype.tsx`: o retorno para o templo de Thais **nunca** é cancelado, impedindo que o jogador fique soft-locked na masmorra.
- [x] **Arquitetura Server-Authoritative de Caçadas (Colyseus HuntDungeonRoom):**
  - Criada a nova sala Colyseus `HuntDungeonRoom` (`packages/server/src/rooms/HuntDungeonRoom.ts`), registrando `'hunt-dungeon'` e `'hunt_dungeon'` no servidor.
  - Ticks de simulação de 100ms autoritativos no servidor para IA dos monstros, auto-ataques de jogadores, cálculo de dano/armadura, distribuição direta de XP, level-up e respawns com efeito de teleport.
  - Persistência autoritativa contínua via `PrismaPersistenceManager` com suporte a `{ allowInHunt: true }`.
  - Suíte completa de testes automatizados com 100% de aprovação (35/35 testes) e 0 erros no TypeScript (`npm run typecheck`).

## Concluído na Phase 219:
- [x] **Calibração Autêntica de Dano Físico de Monstros:** Defesa calculada de acordo com as regras oficiais do Tibia 10.98+ / TFS 1.x (`(defenseSkill * (defenseValue * 0.05)) + (defenseValue * 0.04)` com modificador de postura de combate). Eliminada a inflação de defesa e redução plana de 30%, fazendo com que personagens com equipamentos fracos recebam dano autêntico e proporcional.
- [x] **Quebra de Escudo (Shield Break):** O escudo só consegue bloquear ataques de até 2 monstros por turno (2.000ms). A partir do 3º atacante, o escudo quebra e a criatura atinge o jogador com dano direto reduzido apenas pela armadura (`armor * 0.475` a `armor * 0.95`).
- [x] **Magias e Habilidades Ofensivas de Monstros:** Reimportação canônica de 969 criaturas com catálogo completo de magias (Fire Wave, Great Fireball, Energy Strike, Ice, Poison, etc.) e ataques à distância (pedras, flechas). Monstros agora disparam suas magias no alcance correto (`range`), emitindo efeitos de projéteis e explosões de área, ignorando escudo físico e armadura.
- [x] **Auto-Cura de Criaturas (Healing Defenses):** Monstros que possuem tags de cura no XML utilizam periodicamente quando feridos, emitindo o efeito visual verde (`CONST_ME_MAGIC_GREEN`).

## Concluído na Phase 218:
- [x] **Regeneração Base RubinOT (sem exigência de comida):** Normal a cada 4s (Knight +20 HP/+5 MP, Paladin +10 HP/+10 MP, Mage +5 HP/+20 MP) e Promovida a cada 3s (Elite Knight +20 HP/+5 MP, Royal Paladin +10 HP/+10 MP, MS/ED +5 HP/+20 MP) em combate e na cidade.
- [x] **Regeneração Independente por Anéis (6s ticks):** Life Ring (+2 HP / +8 MP a cada 6s) e Ring of Healing (+6 HP / +24 MP a cada 6s) no slot de anel (`ring`).
- [x] **Slot de Anel no Paperdoll & Sincronização:** Slot `ring` integrado em `InventoryWindow`, `SlotSilhouette`, `characterHydration`, sincronização via Colyseus WebSocket e suíte de testes dedicada.

---


No RubinOT, a regeneração base depende da vocação e se ela está promovida. Segundo a página oficial do servidor:

Vocação	Normal	Promovida
Knight	+20 HP / +5 MP a cada 4s	+20 HP / +5 MP a cada 3s
Paladin	+10 HP / +10 MP a cada 4s	+10 HP / +10 MP a cada 3s
Sorcerer	+5 HP / +20 MP a cada 4s	+5 HP / +20 MP a cada 3s
Druid	+5 HP / +20 MP a cada 4s	+5 HP / +20 MP a cada 3s
Monk	+8 HP / +10 MP a cada 4s	+8 HP / +10 MP a cada 3s

Em 1 minuto, por exemplo, um Elite Knight regenera naturalmente aproximadamente 400 HP e 100 mana, porque são 20 ticks de 3 segundos.

Um Master Sorcerer/Elder Druid fica em aproximadamente 100 HP e 400 mana/minuto.

Item	HP	Mana	Por minuto	Duração	Total
Life Ring	+2 HP / 6s	+8 MP / 6s	20 HP + 80 MP	20 min	400 HP + 1.600 MP
Ring of Healing	+6 HP / 6s	+24 MP / 6s	60 HP + 240 MP	7min30s	450 HP + 1.800 MP

Então o Ring of Healing é exatamente 3× mais rápido que o Life Ring, só que dura bem menos.

Para implementar no seu idle sem comida, eu manteria justamente o efeito independente:

Life Ring: +2 HP / +8 MP a cada 6 segundos
Ring of Healing: +6 HP / +24 MP a cada 6 segundos

Isso funciona especialmente bem porque não precisa existir aquela regra do Tibia de estar alimentado para regenerar. O anel simplesmente gera regeneração enquanto estiver equipado.

E tem uma coisa interessante para o Exura: eu não transformaria isso em regeneração por segundo visualmente. Manteria o tick de 6 segundos, porque dá muito mais aquela sensação de Tibia: +8, +8, +8 aparecendo periodicamente em vez da mana subindo continuamente.

---

## Phase 220: Efeito Visual de Teleport no Spawn dos Monstros e Rate Limiter de Skills para Party/Alts com Potions e Magias

### 1. Efeito Visual de Teleport no Spawn (`CONST_ME_TELEPORT` / effect 11)
- Criaturas geradas pelo motor de caçada contínua (`populateRespawnZone` e `populatePullAroundParty`) agora emitem o evento visual `spawn-visual` com `effectId: 11`.
- O renderizador PixiArena (`PixiArena.tsx`) desenha a animação oficial de 11 frames do portal/teleport do Tibia diretamente sobre o tile de nascimento da criatura, eliminando o spawn "seco".

### 2. Correção de Erro de Salto Anômalo de Habilidades em Party/Alts
- **Causa Raiz 1 (Alts como Cerberus):** No salvamento de alts da party, a validação de skills não herdava o contexto do líder (`leaderCharacterId`), avaliando o alt como fora de caçada (taxa urbana restrita de 500 tries/s e 25k burst, gerando o limite de 72.488 tries). Agora alts herdam o `leaderContext` de forma autoritativa.
- **Causa Raiz 2 (Líderes usando Magias e Mana Potions):** Com as taxas multiplicadas de Magic Level (stage 10x * 25 rate = 250x), o spam sustentado de magias e poções gerava mais de 500k tentativas legítimas em 20-25s. A taxa contínua de caçada foi calibrada para `40.000 tentativas/segundo`, suportando com ampla folga rotações intensivas sem falsos positivos.
- **Causa Raiz 3 (Falha de Retorno à Cidade):** A proteção do cliente impedia o retorno à cidade quando o save de caçada falhava (`[HUNT_SAVE] Falha ao salvar progresso antes de sair da caçada`). Com a regularização do rate limiter, o salvamento responde 200 OK e a transição para Thais ocorre suavemente.

---

## Phase 221: Corpo Humano (Dead Human) na Morte, Orçamento de XP Pós-Hunt e Stepper de Condições da Hotbar

### 1. Corpo Humano Canônico na Morte (`dead human` - item 3058 / 3065)
- Ao zerar o HP de qualquer membro da party (`applyDamageToPartyActor`), o motor cria autoritativamente um `CorpseState` com `corpseId: 3058` (masculino fresco na poça de sangue) ou `3065` (feminino) e emite `creature-died`.
- No `PixiArena.tsx`, o renderizador carrega os assets canônicos de `/assets/items/item-3058.png` e `/assets/items/item-3065.png` pré-carregados na GPU, desenhando o corpo estirado no chão exatamente nas coordenadas onde o jogador tombou sem forçar esqueletos genéricos.

### 2. Eliminação do Falso Positivo de Ganho Suspeito de XP ao Retornar para Thais
- **Causa:** Ao sair da caçada para Thais ou sincronizar personagens após a hunt, o contexto urbano (`isHunting: false`) aplicava o teto estrito de cidade (10.000 XP burst), bloqueando o ganho legítimo de dezenas de milhares de XP (+27.300 XP) acumulado na caçada.
- **Correção:** O validador autoritativo (`characterService.ts`) agora reconhece evidências de caçada recente (`hasHuntEvidence`, `data.lastHuntId`, `data.isHunting`) e experiência já aprovada na sessão em tempo real (`XpRateLimiter.getAuthorizedExp`). O burst de cidade foi elevado com segurança para 100.000 XP em `xpRateLimiter.ts` e o WebSocket em `ThaisCityRoom.ts` passou a suportar flags de transição.

### 3. Correção de Usabilidade e Layout das Condições de Hotbar (O Mistério do `[ - ]` e 80%)
- **Causa:** O texto extenso do operador (`menor ou igual a (<=)`) empurrava o container de número (`.hotbar-stepper`). Como ele não tinha `flex-shrink: 0`, o flexbox comprimia o stepper para 18px e o `overflow: hidden` cortava o `<input>` e o botão `+`, deixando apenas o botão `-` visível e impedindo o usuário de digitar `80`.
- **Correção:** `.hotbar-stepper` travado com `flex-shrink: 0; min-width: 74px; height: 24px;`, input numérico visível com `min-width: 32px;` e foco destacado, `.hotbar-condition-row` com `flex-wrap: wrap;`, operadores compactos (`<= (menor ou igual)`, etc.) e input fluido que permite apagar para digitar `80%` diretamente ou ajustar pelas setas, com execução autoritativa comprovada no motor de combate.

---

## Phase 223: Eliminação de Tela Preta no Dragon Lair, Purga de Exeta Res Urbano / Salto Anômalo de Skills e Novas Telas de Loading (Cyclops & Elfos)

### 1. Eliminação do Bug de Loading Instantâneo (0ms) e Tela Preta no Dragon Lair
- **Causa Raiz 1 (Loading Instantâneo):** No componente `ExuraLoadingScreen.tsx`, o cálculo de progresso utilizava `effectivePct = Math.max(timePct, assetProgressPct)`. Como os assets já haviam sido pré-carregados na cidade de Thais (`assetProgressPct = 100`), o loading completava no tick 0 (0ms) sem reproduzir a transição de viagem de 10 segundos.
- **Causa Raiz 2 (Viewport Congelado em 0x0):** Na transição instantânea, o container da `PixiArena.tsx` passava de `display: none` para visível com dimensões 0x0 antes do layout recalcular. O ticker permanecia parado e o `onSceneReady` era disparado prematuramente. Além disso, ao entrar no Dragon Lair sem atlas específico compilado, 2.601 requisições de texturas de piso sobrecarregavam a thread de rede.
- **Solução:** Sincronização do progresso no `ExuraLoadingScreen.tsx` acompanhando a duração real da viagem (`timePct`); acionamento de `app.ticker.start()` e redimensionamento via `requestAnimationFrame` na ativação da `PixiArena`; carregamento em lotes paralelos controlados (`loadBatch`, 40 texturas por vez) dos tiles da nova sala com reconstrução de terreno resiliente; e trava no `onSceneReady` para emitir somente com viewport ativo.

### 2. Purga de Inimigos Residuais ao Sair da Hunt e Fim do Spam de Exeta Res em Thais
- **Causa Raiz:** Ao sair voluntariamente da caçada (`leaveHunt`), o estado mantinha os dragões em `encounter.enemies`. Em Thais, o loop urbano de auto-spells (`advanceCityAutoSpells`) executava a cada segundo e detectava monstros a menos de 3 SQMs do Knight, acionando compulsivamente *Exeta Res* (Challenge - 30 mana). Cada ponto de mana gerava ~250 tentativas de Magic Level, acumulando 48.950 tentativas em segundos e ultrapassando o limite urbano de 26.028 tentativas no `SkillRateLimiter`, resultando no erro vermelho em tela.
- **Solução:** `leaveHunt()` agora purga integralmente `encounter.enemies = []`, `encounter.corpses = []`, reseta cooldowns e alvos e posiciona os personagens no Templo de Thais (`THAIS_TEMPLE_POSITION`); `advanceCityAutoSpells` reforça a limpeza de resíduos a cada segundo; e o despachador de auto-spells (`castAutomaticSpells`) com `allowOffensive = false` bloqueia estritamente *Exeta Res* e o desafio tático de Knight na cidade.

### 3. Novas Telas Oficiais de Loading para Cyclops Camp e Elf Sanctuary
- **Assets Canônicos:** Integradas as artes originais fornecidas pelo usuário em `public/images/loading/cyclops-camp-loading.jpg` (Cyclops Camp) e `public/images/loading/elf-sanctuary-loading.jpg` (Elf Sanctuary), com espelhos correspondentes em `public/assets/loading/`.
- **Mapeamento:** `HUNT_LOADING_CONFIGS` em `apps/web/lib/loadingConfig.ts` atualizado para renderizar as respectivas artes temáticas e curiosidades de lore, e pré-carregamento no boot do cliente em `GamePrototype.tsx`.

---

## Phase 224: Decaimento Canônico de Monstros para Esqueletos (Item 5972), Fire Wave do Dragão & Resolução Integral de Runas em Área (Avalanche)

### 1. Corpos de Cyclops e Monstros Decaindo para Esqueletos Limpos (Item 5972)
- **Causa Raiz:** Na Phase 221 (ao adicionar o corpo ensanguentado de jogador `item-3058`), a prioridade foi alterada para `specificMapping || skeletonMapping`. Como `visualAssets.corpses['5962']` existe para o Cyclops (um sprite de 64x64 pixels composto por 4 quadrantes com offset -48px), o jogo desenhava o corpo gigante do cyclops sem decaimento para esqueleto, sobrepondo e sendo cortado por tiles de borda e piso.
- **Solução:** Em `PixiArena.tsx`, invertida a prioridade para `const mapping = skeletonMapping || specificMapping;` para todas as criaturas não-humanas. Monstros agora decaiem limpa e canonicamente para o esqueleto 32x32 oficial do Tibia (`item-5972` - *remains of a skeleton*), enquanto corpos de jogadores permanecem com a poça de sangue e corpo estirado (`item-3058`/`3065`).

### 2. Magias de Monstros, Fire Wave do Dragão (8 SQMs) e Projéteis Visíveis
- **Causa Raiz:** O Dragão lia `range: 1` e filtrava `distância <= 1`, impedindo-o de usar a Fire Wave se o jogador estivesse a mais de 1 SQM. O efeito visual de labareda `'firearea'` estava mapeado para o ID 15 (*HITBYFIRE*, uma faísca minúscula) em vez do 7 (*CONST_ME_FIREAREA*). Além disso, disparos de monstros com projéteis não renderizavam o míssil voando na GPU.
- **Solução:**
  - Implementada projeção de ondas direcionais (`getMonsterWaveTiles`) com cone de fogo expansivo de 8 SQMs na direção do alvo.
  - O Dragão emite seu rugido característico no balão de fala (`GROOOAAARRR!`) e a labareda de fogo clássica (efeito 7) em cada SQM do cone, causando dano a todos os jogadores na trajetória.
  - Projéteis disparados por monstros (bolas de fogo, flechas, pedras) agora emitem `spell-visual` com atraso de voo e animação completa da trajetória em direção ao alvo.

### 3. Druid Usando Avalanche e Resolução Definitiva de Runas em Área (AoE)
- **Causa Raiz 1 (Runas em Área Atingindo Apenas 1 Monstro):** No motor de combate (`combat.ts`), quando a party possuía um alvo focado, `rawEligible` e `inRange` eram restritos exclusivamente a `[targetToPrioritize]`. O filtro de alvos secundários buscava dentro dessa lista unitária, resultando sempre em `secondaryEnemies = []`. Tanto no auto-cast quanto no cast manual, runas como Avalanche, GFB e Thunderstorm causavam dano a apenas 1 monstro!
- **Causa Raiz 2 (Druid Travado sem Castar Runas):** Beber poções marcava `usedSpellThisTick = true` e o bloco de runas checava `!usedPotionThisTick`, impedindo o uso de runas no mesmo segundo. Além disso, a trava `knightNeedsHeal || allyNeedsHeal` silenciava magias de ataque do Druid sempre que o Knight estivesse abaixo de 85% de HP.
- **Causa Raiz 3 (Condição de Hotbar "Monstros >= N" Falhando):** O contador avaliava a lista restrita de 1 monstro, impedindo a ativação de condições de aglomeração.
- **Solução:**
  - `secondaryEnemies` agora busca em todos os monstros vivos da sala (`allLivingEnemies`) dentro da máscara 3x3 circular ou cruz, aplicando dano e floaters numéricos simultâneos em 100% das criaturas na área de impacto.
  - Desacoplamento total de poções e remoção da trava arbitrária de 85% de HP do Druid, garantindo rotação ininterrupta de Avalanche respeitando o exhaust de 2s e mana disponível.
  - Avaliação precisa de aglomeração de monstros no avaliador de condições de hotbar.