# Phase 110 Summary: Tela de Carregamento de Thais (Nova Ilustração do Templo) e Sistema de Curiosidades Rotativas ("Você Sabia?")

## Objetivo da Fase
Substituir a imagem de fundo da tela de carregamento de Thais pela nova ilustração do Templo de Thais e introduzir um sistema dinâmico de curiosidades/lore de Tibia, alternando aleatoriamente a cada 3 segundos com transições suaves acima da barra de carregamento.

## O Que Foi Realizado

### 1. Atualização e Publicação da Nova Arte Oficial
- Ilustração artística do Templo de Thais (com colunas neoclássicas, chafarizes com água cristalina, jardins e castelo medieval ao fundo) copiada para:
  - `public/images/loading/thais-loading.jpg`
  - `public/images/loading/loading-bg.jpg`
- Suporte a prop `bgImage?: string` adicionada em `ExuraLoadingScreenProps` com fallback padrão para `'/images/loading/thais-loading.jpg'`.

### 2. Sistema de Curiosidades Históricas ("Você Sabia?")
- Definido o catálogo canônico `THAIS_LORE_CURIOSITIES`:
  1. *"Você sabia? Thais é considerada a cidade mais antiga de Tibia e foi a primeira cidade do jogo."*
  2. *"Antes de se chamar Thais, o local era conhecido como Tradespot, um pequeno posto comercial que cresceu até se tornar a capital do reino."*
  3. *"O nome Thais vem de um guerreiro. Após sua morte defendendo Tradespot dos orcs, seu filho Tibianus I renomeou a cidade em homenagem ao pai."*
- **Sorteio Inicial Aleatório:** A cada montagem/ativação da tela de carregamento, um índice aleatório é selecionado para variar a experiência do jogador desde o primeiro segundo.
- **Rotação Periódica a cada 3 Segundos (3000ms):**
  - Intervalo de 3000ms que sorteia um novo índice aleatório, garantindo que não haja repetição consecutiva da mesma frase.
  - **Transição Suave (Fade):** Fade-out de 200ms -> troca do texto -> fade-in de 220ms com leve elevação vertical (`translateY`), evitando cortes bruscos na leitura.

### 3. Design Medieval e Posicionamento
- Placa de curiosidades posicionada acima da barra de carregamento de magma (`exura-loading-curiosity-box`):
  - Fundo translúcido escuro de pedra/ardósia (`rgba(22, 13, 10, 0.9)` a `rgba(12, 7, 6, 0.95)`) com efeito backdrop blur;
  - Moldura chanfrada com borda dourada (`#d4a737`) e 4 cantoneiras clássicas;
  - Cabeçalho decorativo estilizado `📜 VOCÊ SABIA?` em dourado iluminado (`#ffd875`);
  - Tipografia serif marfim/parchment (`#fbf1dc`) de alta legibilidade sobre o cenário com drop shadow.

## Testes e Validação
1. Suíte da Fase 110 (`tests/phase110-loading-curiosities-and-thais-bg.test.ts`):
   - 5 testes aprovados (100%).
2. Suíte de Loading Retroativa (Fases 99, 100, 101, 102, 105, 106, 107, 109, 110):
   - 9 arquivos de teste aprovados (53/53 testes).
3. Tipagem TypeScript:
   - `tsc --noEmit --incremental false`: **0 erros**.
