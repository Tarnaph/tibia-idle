# Phase 193: Novas Hunts (Cyclops & Elf) e Arena PvP Funcional no Mapa com Duelo em Tempo Real

## 📌 Contexto e Objetivos
Conforme solicitado no `FIX.md`:
1. **Adicionar 2 Novas Hunts Oficiais no Mapa RealMap**:
   - **Cyclops**: Coordenadas `x: 32416, y: 32041, z: 8` (Mount Sternum / Thais Cyclops Camp).
   - **Elf**: Coordenadas `x: 32741, y: 31298, z: 7` (Shadowthorn / Elf Fortress).
2. **Arena PVP Funcional no Mapa com Duelo em Tempo Real**:
   - Spawns de combate:
     - Spawn 1: `x: 33136, y: 32965, z: 8`
     - Spawn 2: `x: 33136, y: 32973, z: 8`
   - Spawns aleatórios para os duelistas (um no Spawn 1 e outro no Spawn 2).
   - Comportamento de batalha:
     - Movimentação automática de aproximação mútua.
     - Ataque automático usando as skills e magias programadas na rotação.
     - Cada lutador recebe **100 Mana Potions** e **100 Health Potions** automáticas durante o combate.
   - Sistema de Pontuação e Ranks:
     - Vencedor ganha **+20 pontos**.
     - Cada rank requer **250 pontos**:
       - 0 a 249 pontos: Sem caveira (`none`)
       - 250 a 499 pontos: Rank 1 -> **Caveira Verde (Green Skull)**
       - 500 a 749 pontos: Rank 2 -> **Caveira Amarela (Yellow Skull)**
       - 750 a 999 pontos: Rank 3 -> **Caveira Branca (White Skull)**
       - 1000 a 1249 pontos: Rank 4 -> **Caveira Vermelha (Red Skull)**
       - 1250 a 1499 pontos: Rank 5 -> **Caveira Preta (Black Skull)**
       - 1500+ pontos: Rank 6 -> **Caveira Laranja (Orange Skull)**
     - Ao alcançar 250 pontos (e múltiplos de 250), exibir celebração na tela parabenizando o jogador e informando quanto falta para o próximo rank.
     - A opção de ligar/desligar a caveira no outfit fica disponível assim que o jogador atinge 250 pontos (Rank 1).

---

## 🛠️ Planos de Execução
- **193-01-PLAN**: Mapear e adicionar `cyclops-camp` e `elf-sanctuary` em `importHuntRegions.ts`, `hunt.ts` e `huntRoute.ts`.
- **193-02-PLAN**: Ajustar o motor de domínio de PvP (`packages/domain/src/pvp.ts`) para pontuação em múltiplos de 250 pontos, ganho de +20 pontos por vitória, e desbloqueio do toggle de caveira no Rank 1.
- **193-03-PLAN**: Configurar a região de mapa da Arena PvP em (33136, 32969, 8) com Spawns 1 (33136, 32965, 8) e 2 (33136, 32973, 8).
- **193-04-PLAN**: Implementar o combate de duelo em tempo real com movimentação mútua, rotação de magias, 100 Health/Mana potions e celebração de rank no `ArenaPvPModal.tsx` e backend.
- **193-05-PLAN**: Testes automatizados no Vitest, typecheck global e deploy na VPS de produção.
