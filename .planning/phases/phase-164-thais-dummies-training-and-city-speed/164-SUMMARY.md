# Fase 164: Thais Dummies Training and City Speed — Resumo de Entrega

## 🎯 Objetivo da Fase
Implementar o sistema completo de treino nos bonecos (*Training Dummies*, item ID 5787) do Depot de Thais, alocação autônoma de vagas para vocações melee vs ranged, estimativa de tempo e barra de progresso no HUD central de treino, velocidade urbana fixa em 500 em Thais e ajuste no anti-speedhack do servidor.

---

## 🛠️ O que foi Implementado

### 1. Atualização do Mapa Realmap e Atlas PixiJS
- Reexecução do pipeline de extração e conversão do mapa `realmap11/data/world/world/realmap.otbm`:
  - `content/generated/thais-city.json`: 25.993 tiles atualizados com os 3 dummies de treino (ID 5787) e suas coordenadas oficiais.
  - `content/generated/thais-collision.json`: malha de colisão atualizada, com tiles dos dummies identificados como sólidos e waypoints livres ao redor.
  - `content/generated/thais-item-metadata.json`: metadados dos itens atualizados.
  - `public/generated/atlases/thais-atlas.png` e `.json`: 2.787 frames reempacotados, com o sprite 5787 devidamente incluído no atlas PixiJS.
- Coordenadas dos 3 bonecos de treino:
  - Dummy 1: `(32349, 32219, 7)`
  - Dummy 2: `(32349, 32221, 7)`
  - Dummy 3: `(32349, 32223, 7)`
- Ponto de aproximação: `(32345, 32220, 7)`.

### 2. Alocação Inteligente de Vagas e Navegação Autônoma (`training.ts`)
- **Navegação em Duas Etapas:**
  1. Ao acionar o treino e escolher a habilidade, o personagem calcula a rota com `findCityPath` até o ponto de aproximação `(32345, 32220, 7)`.
  2. Ao chegar na aproximação, sorteia aleatoriamente um dos 3 dummies e invoca `findBestTrainingTile(...)`.
- **Alocação Dinâmica (`findBestTrainingTile`):**
  - Prioriza tiles adjacentes livres (distância 1).
  - Caso todos os tiles adjacentes estejam ocupados por outros jogadores (`remotePlayers`):
    - **Vocações Ranged (Sorcerer, Druid, Paladin e promoções):** posicionam-se a 2 ou 3 tiles de distância para bater de longe com tiros/magias.
    - **Vocações Melee (Knight e promoções):** alocam a vaga livre mais próxima na coroa de distância 2.
  - Ao alcançar o tile da vaga, vira o personagem de frente para o dummy e ativa o estado `isTrainingAtDummy(true)`.

### 3. Fórmulas de Domínio e Estimativa de Tempo de Treino
- Função `calculateTrainingTimeEstimate`:
  - Fórmulas canônicas de avanço de skill por vocação (`requiredSkillTries` e `requiredMagicTries`).
  - Intervalos autênticos: 2s por tentativa para melee e shielding, 4s para distance, ticks de regeneração de mana para magic level.
  - Fator de escala dinâmico com o multiplicador de skills do servidor (`serverSkillRate`).
  - Retorna `remainingSeconds`, `formattedTime` (ex: "2h 15min", "45min 20s", "30s"), `progressPercent`, nível atual e próximo nível.

### 4. Interface HUD Central de Progresso (`TrainingProgressHUD.tsx`)
- Componente elegante com estética visual Tibia 11:
  - Ícone temático da habilidade treinada (🗡️ Sword, 🪓 Axe, 🔨 Club, 🏹 Distance, 🛡️ Shielding, 🔮 Magic Level, 🥊 Fist).
  - Barra de progresso com porcentagem dinâmica.
  - Indicador de tempo restante até o próximo avanço de skill.
  - Botão "Parar Treino" que encerra o treino e libera a movimentação livre instantaneamente.
  - Movimentação manual (clique no mapa ou setas do teclado) também interrompe o treino e devolve o controle livre ao jogador.

### 5. Botão de Treino no Menu de Ações Rápidas (`BottomDock.tsx` e `HuntSelector.tsx`)
- Adicionado o botão `TREINO` na barra de ações rápidas da `BottomDock`.
- Desabilitado dinamicamente quando o jogador está em caçada (`isHunting === true`), com tooltip explicativo: "Treino disponível apenas na cidade de Thais".
- Ao ser acionado na cidade, abre a janela `HuntSelector` diretamente na aba `TREINO`, permitindo escolher a skill desejada.

### 6. Velocidade Urbana Fixa de 500 e Desativação de Utani Hur
- Constante `THAIS_CITY_FIXED_SPEED = 500` em `progression/speed.ts`.
- `cityPlayerSpeed` configurado para 500 fixo na cidade de Thais.
- Magias de Haste (`utani hur` e `utani gran hur`) bloqueadas em Thais via hotbar, exibindo mensagem informativa de que a velocidade máxima de 500 já está ativa na cidade.
- Tolerância anti-speedhack no servidor Colyseus (`ThaisCityRoom.ts`) ajustada para 75ms para acomodar com folga passos em velocidade 500.

---

## 🧪 Verificação e Cobertura de Testes
- **Testes Automatizados:** `tests/phase164-thais-dummies-training-and-city-speed.test.ts`:
  1. Dummies presentes no JSON do mapa com ID 5787 e coordenadas exatas.
  2. Alocação de vagas (melee adjacente vs ranged a 2-3 tiles quando lotado).
  3. Fórmulas de tempo de treino com multiplicadores do servidor.
  4. Velocidade urbana 500, bloqueio de haste e tolerância do servidor.
- **Suíte de Regressão Executada:**
  - `phase40` e `phase47`: 100% aprovados.
  - `phase160`, `phase161`, `phase162`, `phase163` e `phase164`: 100% aprovados (31 testes passando).
- **TypeScript:** 0 erros de tipagem.
