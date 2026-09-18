# Phase 189: Slots e Ativos no Tooltip de Itens, Desacoplamento Leve de Auth/Seleção, Context Menu de Players (Inspecionar), Áudio no Sanduíche e Correção de Visibilidade Remota

## Overview & Scope
Esta fase atende integralmente os 5 pontos de melhorias e correções listados em `FIX.md`, garantindo a preservação absoluta de outfits, montarias, movimentos, efeitos visuais, áudios e mapa de jogo:

1. **Item Tooltips (Global & Hunt & ImbuingModal)**:
   - Exibir contagem de slots de imbuements em todos os tooltips (`GlobalItemTooltip.tsx`, `ItemTooltip.tsx`).
   - Se o item estiver imbuído, exibir nome do imbuement, tier, bônus e tempo restante (`Vampirism Powerful — Life Leech 25% · 4h55m` em verde), acompanhado do badge dourado "Imbuement ativo".
   - Adicionar eventos de hover (`onMouseEnter`/`onMouseLeave`) aos itens no `ImbuingModal.tsx` tanto no paperdoll quanto na mochila para inspecionar os slots e status.

2. **Desacoplamento Leve da Autenticação e Seleção de Personagens**:
   - Separar o modal inicial de login/seleção (`TibiaAuthCharacterModal.tsx`) do carregamento de 35MB+ de JSONs estáticos.
   - Substituir o iframe de YouTube por arte estática limpa e nítida.
   - Ao selecionar o personagem e clicar "Entrar", ativar a tela de loading de segurança e carregar via dynamic import (`next/dynamic`) o `GamePrototype.tsx`, garantindo que nada quebre e os assets sejam pré-carregados no `ExuraLoadingScreen`.

3. **Menu de Contexto de Outro Player (`CharacterContextMenu.tsx`)**:
   - Remover as opções "Set Outfit" e "Montar" (não aplicáveis a outros jogadores).
   - Manter "Mandar Mensagem Privada" e "Adicionar como Amigo".
   - Adicionar opção "Inspecionar" com abertura de modal limpo (`PlayerInspectModal.tsx`) exibindo equipamentos equipados e skills do personagem.
   - Atualizar a rota `/api/characters/lookup` para expor o inventário/equipamentos e skills do personagem pesquisado.

4. **Otimização da Barra de Topo (`WindowDockBar.tsx`)**:
   - Remover o botão quadrado avulso de Mute ao lado de "Sair".
   - Integrar o controle de áudio e toggle de mute dentro do menu sanduíche.
   - Preservar o atalho global de teclado `'M'`.

5. **Correção de Visibilidade de Jogadores Remotos (`ThaisCityArena.tsx`)**:
   - Eliminar o loop de 60fps de `preloadOutfitAllFrames` nas atualizações de atores.
   - Fornecer textura visível imediata de fallback (em vez de `Texture.EMPTY`) para que jogadores como Grievous fiquem visíveis imediatamente.
   - Garantir re-bind correto da textura recolorida no sprite PixiJS assim que o canvas do outfit for gerado.

---

## Planos de Execução
- **189-01**: Tooltips com slots de imbuements e ativos no `GlobalItemTooltip`, `ItemTooltip` e suporte a hover no `ImbuingModal`.
- **189-02**: Desacoplamento da seleção/login com lazy loading do `GamePrototype` e remoção do iframe do YouTube.
- **189-03**: Menu de contexto com Inspecionar, criação do `PlayerInspectModal` e rota `/api/characters/lookup`.
- **189-04**: Otimização do `WindowDockBar`: remoção do botão de mute externo e integração no menu sanduíche.
- **189-05**: Correção de jogadores remotos no `ThaisCityArena.tsx`, typecheck, testes e deploy VPS.
