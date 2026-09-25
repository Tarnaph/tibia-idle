# Phase 241: Retrato da Party com Outfit e Montaria em Réplica Exata, Grande e Centralizado

## 🎯 Objetivo
Garantir que a moldura circular de retrato de cada personagem ocupante no **Gerenciador de Party** (`UnifiedPartyModal.tsx`) renderize uma réplica 100% autêntica do personagem atual: outfit real (ex: Hunter, Citizen, Warrior), montaria ativa (ex: flying-book, widow-queen, etc.), cores customizadas (head, primary/body, secondary/legs, detail/feet), addons e gênero, exibido em destaque grande e perfeitamente centralizado no círculo (sem ficar pequeno ou deslocado no canto inferior direito).

---

## 🛠️ Alterações Executadas

### 1. `apps/web/components/party/UnifiedPartyModal.tsx`
- **Função `getCharacterAppearance`:**
  - Extrai fielmente todos os atributos de aparência de `CharacterState` e de `RemotePartyMember`:
    - `outfitId`: ID normalizado do outfit atual do personagem (`Hunter`, etc.) em vez de usar fallback genérico de vocação.
    - `mount` e `mountActive`: detecção precisa da montaria selecionada e se está ativa/montado.
    - `colors`: mapeamento completo das cores do Tibia 133 para cabeça, torso, pernas e pés (`outfitColors` ou `outfitHead/Body/Legs/Feet`).
    - `addons`: valor numérico das adições conquistadas.
    - `gender`: gênero do personagem.
- **Algoritmo Dinâmico de Centralização e Escala (`drawCenteredAndScaled`):**
  - Renderiza o outfit e montaria com recolor em um canvas offscreen de 64x64.
  - Varre os dados de pixels (`getImageData`) para encontrar o bounding box exato (`minX, maxX, minY, maxY`) de todos os pixels não-transparentes desenhados (tanto a pé quanto montado).
  - Calcula o fator de escala ideal para que o sprite (seja corpo humano ou montaria volumosa) ocupe ~82% do diâmetro útil do círculo.
  - Centraliza perfeitamente no ponto médio horizontal e vertical `(dispW - drawW) / 2` e `(dispH - drawH) / 2`.
  - Renderiza em canvas com dobro de densidade de pixels (144x144 para exibição em 72px) com `imageSmoothingEnabled = false` para preservação autêntica da pixel art do Tibia sem borrões.

### 2. `apps/web/components/GamePrototype.tsx`
- Mapeamento explícito das propriedades de aparência de membros remotos da party (`mount`, `mountActive`, `outfitColors`, `addons`, `gender`) para alimentação do `UnifiedPartyModal`.

### 3. `app/globals.css`
- Estilização de `.party-card-outfit-canvas` com dimensões fixas de 72x72px, `image-rendering: pixelated;` e filtro suave de drop-shadow.

---

## 🧪 Validação
- **Testes Unitários:** `tests/phase241-party-portrait-outfit-mount-centering.test.ts` (5 testes aprovados).
- **Regressão:** `tests/phase240-party-manager-redesign.test.ts` (4 testes aprovados).
- **TypeScript:** `npm run typecheck` com 0 erros.
