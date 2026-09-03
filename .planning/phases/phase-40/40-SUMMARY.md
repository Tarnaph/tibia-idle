# Phase 40: Velocidade Normal na Cidade, Bloqueio Estrito de Paredes e Âncora Canto Inferior Direito do SQM

## 📌 Visão Geral da Entrega

Nesta fase resolvemos os 3 bugs reportados em `FIX.md` e na imagem enviada pelo usuário:

1. **Bug 1 - Velocidade Normal na Cidade ao Segurar a Seta:**
   - O intervalo de passos na cidade foi ajustado para corresponder exatamente à velocidade normal do personagem baseada na fórmula de nível oficial do TFS (`cityStepDurationMs = baseStepDurationMs`).
   - Implementado controle de cadência suave (`now - lastStepTimeRef.current >= cityStepDurationMs`):
     - **Primeiro toque (idle):** Responde instantaneamente com **0ms de atraso**.
     - **Segurando a tecla:** Cada passo seguinte ocorre estritamente a cada `cityStepDurationMs` (ex: 500ms no nível 20, 400ms no nível 50), eliminando a caminhada "super rápida" e garantindo sincronização perfeita com a animação dos passos.

2. **Bug 2 - Bloqueio Estrito de Colisão (Impossível Andar em Cima de Paredes):**
   - Corrigida a condição de validação de movimento no `GamePrototype.tsx`:
     ```ts
     const tile = activeTileMap.get(`${nextX},${nextY}`);
     if (!tile || !tile.walkable) return current;
     ```
     Anteriormente, `if (tile && !tile.walkable)` permitia que coordenadas sem tile explicitamente indexado ou fora do mapa fossem aceitas como destino.
   - Corrigida a mesma condição em `packages/domain/src/spatial/pathfinding.ts` (`if (!tile || !tile.walkable) continue;`), blindando o pathfinding de rotacionar sobre paredes ou vazios.

3. **Bug 3 - Personagem Ancorado no Canto Inferior Direito do SQM:**
   - No Tibia, devido à projeção oblíqua (visão sudeste), os sprites de criaturas são ancorados no canto inferior direito do SQM (`anchor(1, 1)` com offset `(16, 16)` em relação ao centro do tile).
   - O `ThaisCityArena.tsx` foi atualizado para utilizar o layout canônico `creatureVisualLayout`:
     ```ts
     sprite.anchor.set(creatureVisualLayout.spriteAnchorX, creatureVisualLayout.spriteAnchorY);
     sprite.position.set(creatureVisualLayout.spriteOffsetX, creatureVisualLayout.spriteOffsetY);
     ```
   - O boneco de treino (dummy) e a `TrainingArena.tsx` também foram alinhados com o mesmo padrão.
   - Isso elimina qualquer deslocamento incorreto do personagem para o canto superior/esquerdo, garantindo que o personagem fique exatamente dentro do seu SQM e com a mesma visualização autêntica da arena de caçada (`PixiArena.tsx`).

---

## 🧪 Verificação e Testes

- **Testes Automatizados (Vitest):**
  - Nova suite: `tests/phase40-normal-speed-strict-walls-bottom-right-anchor.test.ts`.
  - **35 arquivos de teste passando (100%).**
  - **229 de 229 testes aprovados.**
- **Tipagem Estrita (TypeScript):**
  - `npm run typecheck` executado com **0 erros**.
