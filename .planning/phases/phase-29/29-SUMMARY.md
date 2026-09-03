# Phase 29 Summary: Saída a Thais Depot, Sistema de Treino no Dummy e Nova Janela Skills

## Visão Geral
Nesta fase, implementamos com precisão absoluta as novas diretrizes do `FIX.md` e as duas imagens de referência fornecidas:

1. **Saída de Caçada com Timer de 5s, Teleporte para Thais e Caminhada até o Depot:**
   - Adicionado botão `SAIR DA CAÇADA` em `HuntHeader.tsx` com contador regressivo de 5 segundos (`SAINDO EM 5S... 4S... 3S... 2S... 1S...`).
   - O jogador pode clicar novamente durante a contagem para cancelar a saída.
   - Ao zerar o timer de 5s:
     - O jogador e seus personagens são teleportados para a coordenada inicial da cidade de Thais: `x: 32369, y: 32241, z: 7`.
     - O personagem principal anda sozinho de forma autônoma e interpolada, passo a passo, de `(32369, 32241, 7)` até o Depot de Thais em `x: 32342, y: 32231, z: 7`.
     - Ao chegar no Depot, permanece em repouso aguardando nova ação.
   - Criado o componente de HUD de Localização da Cidade (`city-location-hud`), exibindo em tempo real as coordenadas ativas de Thais e os status:
     - `🚶 Andando sozinho até Depot de Thais...`
     - `🏛️ Parado no Depot (32342, 32231, 7)`
     - `⚔️ Treinando {Skill} no boneco de treino (32349, 32238, 7)`.

2. **Aba "TREINO" Autêntica (Imagem 1):**
   - Integrada na janela modal de caçadas sob a aba `TREINO`.
   - **Subtítulo:** "Escolha uma habilidade e como treiná-la no pátio de treino da cidade."
   - **Grid 2x3 de Habilidades Selecionáveis:**
     - `Club Fighting`, `Sword Fighting`, `Axe Fighting`, `Distance Fighting`, `Shielding` e `Magic Level`.
   - **3 Painéis de Treinamento:**
     - `ARMA DE EXERCÍCIO`: descrição da arma de exercício para a skill selecionada, com botões "Comprar na store" e "Loja da cidade".
     - `TREINO ONLINE`: descrição de treino em dummy básico no dobro do ritmo de hunt, com botão destacado "Iniciar treino".
     - `TREINO OFFLINE`: descrição de treino offline até 12 horas, com botão dourado "Assinar Premium".
   - **Restrição de Cidade & Caminhada ao Dummy:**
     - Se o personagem estiver em caçada (`!isInCity`), o rodapé informa *"Você já está em uma aventura — saia dela antes de começar outra."* e o botão "Iniciar treino" fica desabilitado.
     - Se o personagem estiver na cidade de Thais, o botão "Iniciar treino" é liberado. Ao clicar:
       - O modal fecha automaticamente.
       - O personagem anda sozinho da sua coordenada atual até o boneco de treino em `x: 32349, y: 32238, z: 7`.
       - Ao chegar no Dummy, inicia o ciclo de treino da skill selecionada com ganho contínuo de skill no motor de jogo (`advanceTraining(state, content, deltaMs, targetSkill)`).

3. **Nova Janela "Skills" Clássica do Tibia (Imagem 2):**
   - A antiga janela flutuante de "personagem e habilidades" foi removida.
   - Criado o componente [SkillsWindow.tsx](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/SkillsWindow.tsx), com visual clássico de pedra cinza do Tibia 11.
   - Para abrir a janela de Skills, o jogador clica diretamente no **nome do personagem** no canto superior esquerdo da tela (`WindowDockBar.tsx`).
   - Contém todos os dados autênticos:
     - `Level` + barra de progresso vermelha de XP.
     - `Experience` e `XP Gain Rate` em verde vivo (`237%`).
     - Badge/botão `XP Boost` azul com borda dourada.
     - `Hit Points`, `Mana`, `Soul Points`, `Capacity`, `Speed`, `Food`.
     - `Stamina` com barra verde cheia e `Offline Training` com barra vermelha.
     - `Magic Level` com barra vermelha de progresso.
     - Linhas divisórias chanfradas clássicas.
     - Barras verdes de progresso individual para `Fist Fighting`, `Club Fighting`, `Sword Fighting`, `Axe Fighting`, `Distance Fighting`, `Shielding` e `Fishing`.
     - Seções avançadas de `Critical Hit` (Chance/Extra Damage), `Hit Points Leech` (Chance/Amount) e `Mana Leech` (Chance/Amount).

## Testes e Validação
- Criada a suíte `tests/phase29-city-training-skills.test.ts` com 5 testes automatizados cobrindo:
  - Encerramento de hunt e preservação de personagens para transferência à cidade de Thais.
  - Verificação exata das coordenadas de Thais (32369, 32241, 7), Depot (32342, 32231, 7) e Dummy (32349, 32238, 7).
  - Simulação de caminhada passo a passo de 27 tiles até o Depot.
  - Simulação de caminhada passo a passo de 7 tiles até o boneco de treino.
  - Avanço determinístico da skill alvo selecionada no dummy via `advanceTraining`.
  - Cálculo e correspondência das porcentagens de progresso de todas as skills para a janela clássica.
- **100% de Aprovação no Vitest:** 24 arquivos de teste executados, 184 testes passando com 0 falhas.
- **0 Erros de Tipagem:** `npm run typecheck` executado com 0 erros.
