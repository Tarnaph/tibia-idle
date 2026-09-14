# CORREÇÕES E ATUALIZAÇÕES RECENTES

## 👗 Phase 159: Miniaturas por Gênero no OutfitModal, Reset de Addons na Seleção e Remoção de Outfits Duplicados
1. **Resolução de Miniaturas por Gênero Feminino e Masculino:**
   - O `OutfitModal` agora resolve as miniaturas dos cards dinamicamente com base no `charGender` do personagem ativo (`/generated/outfits/${idLower}-${charGender}-south-f0-base.png`).
   - Para personagens femininos, os cards na lista de outfits agora exibem fielmente a versão feminina dos trajes com fallback gracioso em `onError`.
   - Propagado também para o `VocationChoiceModal` e `PromotionModal`, exibindo as versões femininas caso o personagem seja do sexo feminino.
2. **Reset Automático de Addons ao Trocar de Traje:**
   - Ao trocar de outfit (`handleSelectOutfit`), os addons 1 e 2 são resetados para `false`, permitindo que o novo traje comece sem addons e o usuário decida marcá-los caso queira.
3. **Eliminação dos Outfits Falsos/Duplicados "Sorcerer" e "Paladin":**
   - Removidas as entradas duplicadas `{ id: 'Sorcerer' }` e `{ id: 'Paladin' }` de `CLASSIC_OUTFITS`.
   - A lista de trajes clássicos agora segue rigorosamente o padrão canônico do Tibia oficial com 14 trajes únicos sem duplicações de Mage ou Hunter.

---

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

---

## 🐺 Phase 160: Bestiary Floating HUD, Multi-Monstros por Hunt e Saneamento de Sprites
1. **Saneamento Total de Sprites da Cyclopedia:**
   - Sincronização de 614 miniaturas `monster-*-thumb.png` do Tibia 10.98 para `public/generated/bestiary/` e `public/assets/monsters/`.
   - Eliminação do fallback indevido de `demon.png` para criaturas da Cyclopedia, garantindo que `Rat`, `Cave Rat` e todas as demais criaturas exibam suas sprites autênticas.
2. **Multi-Monstros por Caçada no Bestiary Tracker:**
   - Suporte dinâmico a rastrear simultaneamente múltiplas espécies em hunts heterogêneas (ex: `Rat` e `Cave Rat` em Rat Cellars).
   - Cada espécie conta com seu ícone, barra de progresso e estatísticas de kills individuais.
3. **Janela Flutuante Arrastável e Canto Superior Direito:**
   - Posição inicial no canto superior direito (`top: 58px`, `right: 20px`), livre de sobreposição com controles essenciais.
   - Drag & drop fluido via Pointer Events com persistência de coordenadas em `localStorage`.
   - Suporte a minimizar (`_`) e fechar (`✕`) com reabertura automática ao iniciar caçadas.

---

## 🌈 Phase 161: Cores Autênticas de Dano Elemental do Tibia & Propagação Visual de Elementos
1. **Propagação de Elementos no Motor de Combate:**
   - Extensão de `CombatEvent` (`types.ts`) para incluir `element?: string` em `player-attack`, `enemy-attack` e `spell-cast`.
   - Propagação em `combat.ts` para ataques corpo a corpo e projéteis físicos (`physical`), wands e rods (`energy`, `fire`, `earth`, `ice`, `death`), magias e runas de ataque (`fire`, `energy`, `earth`, `ice`, `holy`, `death`), e cura (`healing`).
2. **Renderização Visual no PixiJS com Paleta Canônica CipSoft:**
   - Criação do helper `getCombatTextColor` em `PixiArena.tsx` definindo cores autênticas com bordas de alto contraste:
     - 🩸 **Physical:** Vermelho sangue (`#ff4444`)
     - 🔥 **Fire:** Laranja incandescente (`#ff8800`)
     - ⚡ **Energy:** Ciano elétrico brilhante (`#00e6e6`)
     - 🌿 **Earth / Poison:** Verde vibrante tóxico (`#2cd92c`)
     - ❄️ **Ice:** Azul celeste gélido (`#66ccff`)
     - ☀️ **Holy:** Amarelo solar dourado (`#ffea33`)
     - 💀 **Death:** Roxo místico / Violeta profundo (`#b84dff`)
     - 💚 **Healing:** Verde restaurador (`#62e58a`)
     - 💧 **Mana:** Azul cobalto (`#3399ff`)
   - Preservação da cor do elemento em projéteis e runas de área com impacto retardado (`pendingImpacts`).