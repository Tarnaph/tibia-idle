# Summary - Phase 162: Target Lock Autêntico do Tibia (Foco Exclusivo de Alvo, Perseguição Estrita e Fim de Redirecionamento de Dano)

Implementação do comportamento 100% autêntico do Target Lock (mira com retângulo vermelho) do Tibia, garantindo foco exclusivo de perseguição de movimento e eliminação total de ataques e magias acidentais contra monstros vizinhos.

---

## 🎯 Principais Entregas

1. **Perseguição Estrita de Alvo em `movement.ts`:**
   - Em `movePartyTowardTargets`, quando o jogador possui um alvo travado (`actor.targetId`) e a criatura está viva, o algoritmo de pathfinding agora persegue estritamente o conjunto `new Set([currentLockedEnemy.id])`.
   - Eliminado o roubo de alvo por proximidade física: outros monstros não sobrescrevem mais o alvo do jogador só porque estão a 1 ou 2 passos mais perto.

2. **Fim do Redirecionamento de Ataques Básicos em `combat.ts` (`playerAttacks`):**
   - Se o personagem possui um alvo travado (`lockedTarget`), os ataques com espadas, machados, porretes, arcos, bestas, wands e rods são desferidos exclusivamente no alvo travado assim que ele entra no alcance (`meleeDistance <= range`).
   - Se o alvo travado estiver fora do alcance (personagem ainda se aproximando), o ataque aguarda sem desferir golpes em criaturas adjacentes vizinhas.
   - O ataque automático a qualquer monstro no alcance opera apenas no modo livre, quando não há nenhum monstro travado com mira vermelha (`!actor.targetId`).

3. **Magias e Runas com Foco Absoluto no Alvo com Mira Vermelha:**
   - **Runas Automáticas (`castAutomaticSpells`):** Seleção primária obrigatória no alvo travado (`lockedTarget`), impedindo desvio involuntário para monstros com menor distância euclidiana.
   - **Magias Ofensivas Automáticas:** Magias direcionadas (`spell.area === 'target'`) miram exclusivamente no alvo travado. Se estiver fora de alcance, o personagem não queima a magia em alvos não alvejados.
   - **Acionamento Manual (`triggerManualHotbarAction`):** Magias de alvo único (ex: *Flame Strike*) e runas manuais (ex: SD/HMM) abortam a conjuração com retorno `false` sem consumo indevido de recursos se o alvo travado estiver fora do alcance, impedindo ricochete em criaturas vizinhas.

4. **Auto-Retargeting Limpo pós-Morte (`defeatEnemy`):**
   - Ao morrer o monstro alvejado, `actor.targetId` e `combatState.targetId` são limpos com segurança, restaurando a seleção automática do próximo monstro mais próximo para continuidade ininterrupta da caçada.

5. **Sincronização Visual do Retângulo Vermelho (`PixiArena.tsx`):**
   - Resolução precisa do `activeActor` com prioridade para `cameraTargetCharacterId` e `selectedCharacterId`.
   - Renderização síncrona do contorno vermelho de 32x32 px sobre a criatura alvejada.

---

## 🧪 Verificações e Testes

- **Suíte de Testes Automatizados (`tests/phase162-authentic-target-lock.test.ts`):**
  1. *Perseguição estrita sem roubo de alvo por proximidade*: **Aprovado**.
  2. *Sem ataques em monstros adjacentes quando o alvo está fora de alcance*: **Aprovado**.
  3. *Ataque básico no alvo travado ao entrar no alcance com múltiplos inimigos ao redor*: **Aprovado**.
  4. *Restauração do auto-retargeting suave após morte do monstro*: **Aprovado**.
  5. *Verificação estática de código de PixiArena e movement.ts*: **Aprovado**.
  6. *Prevenção de desvio em disparo manual de magia direcionada*: **Aprovado**.
- **Testes de Regressão (Phases 156 a 162):** 100% de aprovação (15/15 testes).
- **TypeScript:** 0 erros de tipagem (`npm run typecheck`).
