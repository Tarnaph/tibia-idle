# Phase 28 Summary: Nova UI de Caçadas (Bestiary, Loots e Countdown de Troca) e Nova UI da Party com Modal Novo Membro

## Visão Geral
Nesta fase, implementamos a modernização completa da interface de Caçadas e da janela de Party de acordo com as diretrizes de `FIX.md` e as 5 imagens de referência:

1. **Nova Janela de Caçadas ("Escolha uma caçada" - Imagens 2 e 3):**
   - **Abas Superiores:** `CAÇADAS` (ativa), `TREINO`, `QUESTS`, `ARENA` e `BOSSES` (desativadas/placeholders).
   - **Layout Autêntico em 3 Colunas:**
     - **Coluna da Esquerda (Busca & Lista de Caçadas):**
       - Campo de busca textual ("Buscar uma caçada ou criatura").
       - Indicador de contagem total de caçadas disponíveis.
       - Lista scrollável com cards contendo sprite do monstro, nome da caçada, nome do monstro e contagem de drops de loot (removido o controle de pull size conforme solicitado).
     - **Coluna Central (Detalhes da Caçada & Monstro):**
       - Título da caçada selecionada.
       - Card de recorde com estatísticas da Party (XP/h e gp/h) e botão de reset.
       - Preview do monstro com sprite ampliado, botão `DETALHES`, nome da criatura e descrição/lore.
       - **Tooltip de Bestiary & Danos Recebidos (Imagem 3):**
         - Seção **DANO RECEBIDO** com 8 elementos: Físico, Fogo, Terra, Energia, Gelo, Sagrado, Morte e Life Drain, calculando as porcentagens exatas a partir das fraquezas e resistências do monstro (`100 - elementalPercent`).
         - Seção **BESTIARY** com contagem de abates (`2.500 / 2.500`), barra de progresso verde e badge `✓ Entrada concluída`.
     - **Coluna da Direita (Loot Possível):**
       - Cabeçalho "Loot possível".
       - Lista com sprite de cada item dropado pelo monstro, nome, etiqueta de raridade calculada pela chance (`always`, `common`, `semi-rare`, `rare`, `very rare`) e checkbox de auto-loot.
   - **Barra Inferior & Countdown de 5 Segundos:**
     - Botão `Trocar de caçada`: ao ser clicado, inicia um contador regressivo de 5 segundos (`Trocando de caçada em 5s... 4s... 3s... 2s... 1s...`), efetuando a transição determinística para a nova hunt e fechando a janela.
     - Botão `Completar o time`: aciona a abertura do modal de Novo Membro.
     - Botão `Fechar`: fecha a janela.

2. **Nova UI da Janela da Party (Imagem 4):**
   - Layout vertical limpo e moderno para os membros da party:
     - Nome do personagem com estrela dourada `★` para o líder e nível `Lv. {level}`.
     - Botão `✕` para remover membro da party (exclusivo para membros não-líderes).
     - Barra de Vida (HP) com gradiente arredondado rosa/vermelho.
     - Barra de Mana (MP) com gradiente arredondado azul.
     - Barra de Stamina verde-petróleo com indicador de horas (ex: `42:00h`).
   - Removidos os botões anteriores de "Ratear custos" e "Sair da party", substituídos pelo botão de ação: `[ + Adicionar membro (X/4) ]`.

3. **Novo Modal "NOVO MEMBRO" (Imagem 5):**
   - Título estilizado **NOVO MEMBRO** em dourado e subtítulo orientando a criação.
   - Campo de entrada com placeholder `"nome do personagem"`.
   - Seletor de gênero: botões `[ Masculino ]` e `[ Feminino ]`.
   - Grid em 2 colunas com as 5 vocações de referência:
     - `Knight` (Tank · corpo a corpo) com outfit clássico.
     - `Monk` (Tank · punhos) com visual de combate desarmado.
     - `Paladin` (Atirador · distância) com outfit de arqueiro.
     - `Sorcerer` (Atirador · magia) com outfit místico.
     - `Druid` (Atirador · magia + cura) com outfit naturalista.
   - Botões de ação: `Criar personagem` (destaque bege) e `Cancelar` (cinza escuro).

4. **Domínio & Lógica de Negócio (`packages/domain/src/party.ts`):**
   - Implementada a função `removePartyMember(state, characterId)` garantindo que o líder nunca possa ser removido, reajustando a seleção ativa e retirando o ator do encounter em tempo real.

## Testes e Validação
- Criada a suíte `tests/phase28-hunts-party-ui.test.ts` com 5 testes automatizados cobrindo:
  - Proteção contra remoção do líder da party.
  - Remoção de membros não-líderes com reajuste automático de seleção e atores.
  - Cálculo e correspondência das porcentagens de dano por fraqueza e resistência elemental.
  - Categorização correta das faixas de raridade de loot.
  - Criação de membros e imposição do limite máximo de 4 integrantes na party.
- **100% de Aprovação no Vitest:** 23 suítes de teste executadas, 179 testes passando com 0 falhas.
- **0 Erros de Tipagem:** `npm run typecheck` executado com 0 erros.
