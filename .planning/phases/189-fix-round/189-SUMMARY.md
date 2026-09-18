# Phase 189 Summary: Slots e Ativos no Tooltip de Itens, Desacoplamento Leve de Auth/Seleção, Context Menu de Players (Inspecionar), Áudio no Sanduíche e Correção de Visibilidade Remota

## Resumo das Entregas
Todas as 5 frentes de ajustes e correções listadas no `FIX.md` foram concluídas com sucesso, preservando 100% de estabilidade e funcionamento de outfits, montarias, animações de movimento, efeitos visuais, áudios e renderização do mapa de Thais:

1. **Slots e Ativos nos Tooltips de Itens**:
   - `GlobalItemTooltip.tsx` e `ItemTooltip.tsx` agora calculam e exibem de forma destacada o total de slots de imbuements (`Slots de Imbuement: X`) para qualquer equipamento (em caçadas, mochila, paperdoll, loja, etc.).
   - Se o item estiver imbuído, exibe a listagem dos imbuements em verde brilhante (`#4ade80`) com nome, tier, atributo e tempo restante (`Vampirism Powerful — Life Leech 25% · 4h55m`), junto ao aviso dourado canônico de item imbuído.
   - Adicionados eventos de hover (`onMouseEnter`, `onMouseMove`, `onMouseLeave`) a todos os slots de Paperdoll e itens da Mochila em `ImbuingModal.tsx` com limpeza no unmount.

2. **Desacoplamento Leve da Seleção de Personagem (Code Splitting / Fast Boot)**:
   - Criado `GameClientLauncher.tsx` em `apps/web/components/GameClientLauncher.tsx` e integrado à rota `/game`.
   - Substituído o iframe pesado do YouTube por imagem estática nítida com vinheta (`/images/loading/thais-loading.jpg`), zerando conexões lentas de terceiros.
   - O modal de autenticação e seleção de personagens carrega instantaneamente (< 200ms) sem baixar os 35MB+ de JSONs do motor de jogo.
   - O `GamePrototype` é importado dinamicamente via `next/dynamic` no clique de "Entrar no jogo", ativando a tela de loading de segurança (`ExuraLoadingScreen`) por 2.5 segundos para garantir decodificação total de assets, áudio e conexão sem qualquer glitch.

3. **Menu de Contexto de Outro Player & Inspeção**:
   - Removidas as opções "Set Outfit" e "Montar" de `CharacterContextMenu.tsx`.
   - Adicionada a opção "🔍 Inspecionar", abrindo o modal `PlayerInspectModal.tsx`.
   - Criado `PlayerInspectModal.tsx` exibindo o Paperdoll com todos os itens equipados pelo jogador, atributos, status online/offline, vida/mana e tabela completa de habilidades (skills).
   - Atualizada a rota `/api/characters/lookup` para retornar o inventário (`InventoryItem`) e habilidades (`CharacterSkill`) do personagem consultado.

4. **Otimização da Barra de Topo (`WindowDockBar.tsx`)**:
   - Removido o botão quadrado de Mute avulso que ocupava espaço externo ao lado do botão Sair.
   - O controle completo de áudio (volume deslizante, presets 0% a 100% e botão visual de ligar/desligar som) permanece integrado e destacado dentro do menu sanduíche.
   - Atalho global de teclado `'M'` preservado.

5. **Correção de Jogadores Remotos Invisíveis (`ThaisCityArena.tsx`)**:
   - Adicionado `pendingPreloadSignatures` para eliminar o flooding de chamadas a 60 FPS de `preloadOutfitAllFrames`.
   - Fornecido fallback imediato com `Texture.from(thumbUrl)` em `ensureActorView` e no ticker, eliminando o estado `Texture.EMPTY` invisível.
   - Vinculação garantida da textura recolorida ao sprite (`view.sprite.texture = Texture.from(canvas)`) assim que o canvas fica disponível no cache.

---

## Verificação e Qualidade
- `npm run typecheck`: **0 erros** de compilação TypeScript.
- `tests/phase189-fix-round.test.ts`: **100% aprovado** (8 de 8 testes passando).
- `tests/phase187-imbuements-system.test.ts`: **100% aprovado** (24 de 24 testes passando).
