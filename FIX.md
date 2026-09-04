# Correção de Outfits & Montarias - CONCLUÍDO ✅

## Itens Atendidos:

1. **Correção do Bug de Trava no Knight (Seleção 100% Livre):**
   - Corrigido o `useEffect` de sincronização no `OutfitModal`: anteriormente, o array `characters` recriado a cada tick de combate reiniciava `selectedOutfit` para a vocação base do personagem (`Knight`).
   - Agora, o modal sincroniza o estado apenas na abertura ou quando o jogador troca de membro da party, permitindo trocar livremente para qualquer outfit (Citizen, Hunter, Mage, Knight, Noble, Summoner, Warrior, Barbarian, Druid, Sorcerer, Paladin, Sire, Oriental, Pirate, Assassin, Beggar) sem nunca reverter para o Knight.

2. **Inclusão de Todas as Montarias do Jogo (129 Montarias do `mounts.xml`):**
   - Extração do catálogo oficial de `realmap11/data/XML/mounts.xml` para `content/generated/mounts.json`.
   - Todas as 129 montarias oficiais do Tibia (Widow Queen, Racing Bird, War Bear, Black Sheep, Midnight Panther, Draptor, Titanica, Tin Lizzard, Blazebringer, Rapid Boar, Stampor, Undead Cavebear, Donkey, Tiger Slug, Uniwheel, Crystal Wolf, War Horse, Kingly Deer, Tamed Panda, Dromedary, Scorpion King, Armoured War Horse, Shadow Draptor, etc.) incluídas em `AVAILABLE_MOUNTS`, com bônus de velocidade (+20) e miniaturas 64x64 dedicadas geradas em `public/generated/mounts/`.
   - Mantida opção "Sem Montaria" (A pé).

3. **Correção da UI da Paleta de Cores (Tamanho Aumentado e Sem Invadir os Outfits):**
   - Corrigido o seletor CSS no `globals.css` para a classe `.tibia-color-swatch-19x7` com reset completo de botão (`all: unset; box-sizing: border-box; aspect-ratio: 1; width: 100%`).
   - Ajustada a coluna esquerda para 360px com `overflow: hidden` e a janela para 980px, garantindo que a matriz de 19x7 cores fique com botões visíveis, confortáveis de clicar, com efeito de hover e destaque ativo, sem jamais invadir ou sobrepor a área dos cards de outfits.

4. **Remoção do Botão Masculino/Feminino do Menu de Outfit:**
   - Botão de alternar gênero removido do `OutfitModal`.
   - O gênero é determinado exclusivamente na criação do personagem (`PartyMemberModal`), com suporte no domínio (`CharacterState.gender`) e preservação do outfit correspondente.
