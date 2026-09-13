# Phase 158 Summary: Suporte a Personagem Sem Vocação (None) e Seleção de Gênero (Masculino / Feminino)

## 📌 Visão Geral

- **Fase:** 158
- **Objetivo:** 
  1. Corrigir o crash de runtime `Missing vocation None.` que impedia novos personagens sem vocação de entrar no jogo após a criação.
  2. Implementar seleção de sexo/gênero (**♂ Masculino / ♀ Feminino**) na tela de criação de personagens, persistindo no Prisma/SQLite (`gender`), exibindo badges na listagem de personagens e aplicando os `lookTypes` canônicos corretos por vocação e sexo.

---

## 🛠️ Alterações Implementadas

### 1. Suporte Seguro à Vocação 'None' no Domínio
- Arquivo: `packages/domain/src/party.ts`
  - Criada e exportada a constante `NONE_VOCATION_DEFINITION: VocationDefinition` (id: 0, nome: 'None', neutral gains de HP/MP/Cap).
  - Atualizada a função `vocationFor(content, name)` para retornar `NONE_VOCATION_DEFINITION` de forma segura quando `name === 'None' || !name`, eliminando o lançamento de erro `Missing vocation None.`.
  - Atualizada `calculateStatsForLevel` para calcular corretamente stats de personagens sem vocação.
  - Adicionado fallback em `starterFor` quando `content.starterLoadouts` estiver vazio.
  - Mantida a integridade da regra de vocação: personagens escolhem vocação definitiva a partir do Nível 8+.

### 2. Persistência Permanente de Sexo/Gênero no Prisma (MMORPG State Rule 5)
- Arquivo: `prisma/schema.prisma`
  - Adicionado campo `gender String @default("male") // male | female` ao modelo `Character`.
  - Sincronizado o banco de dados via `prisma db push` e regenerado o Prisma Client via `prisma generate`.

### 3. Backend e Starter Outfits por Gênero
- Arquivo: `packages/auth/src/characterService.ts`
  - Adicionada a propriedade `gender?: 'male' | 'female'` à interface `CreateCharacterInput`.
  - Criada a função `getStarterLookType(vocationId, gender)`:
    - **None (0):** Masculino = 128 (Citizen) | Feminino = 136 (Citizen)
    - **Sorcerer / Druid (1, 2):** Masculino = 130 (Mage) | Feminino = 138 (Mage)
    - **Paladin (3):** Masculino = 129 (Hunter) | Feminino = 137 (Hunter)
    - **Knight (4):** Masculino = 131 (Knight) | Feminino = 139 (Knight)
  - Persistido `gender` e `outfitLookType` na criação no Prisma.
- Arquivo: `app/api/characters/route.ts`
  - Rota `POST /api/characters`: recebe `gender` no corpo da requisição e repassa para o `characterService`.
  - Rota `GET /api/characters`: retorna `gender` de cada personagem.

### 4. Interface de Criação de Personagem com Seleção Visual de Gênero
- Arquivo: `apps/web/components/auth/TibiaAuthCharacterModal.tsx`
  - Adicionado estado `charGender: 'male' | 'female'` (padrão `'male'`).
  - Adicionados botões estilizados no padrão Tibia/Cavebound com destaque e badges:
    - **♂ Masculino** (azul suave com glow)
    - **♀ Feminino** (rosa suave com glow)
  - Na lista de personagens da conta, cada card agora exibe uma badge clara e elegante com o gênero (`♂ Masculino` ou `♀ Feminino`).

### 5. Integração no Game Prototype
- Arquivo: `apps/web/components/GamePrototype.tsx`
  - Adicionado mapeamento `0: 'None'` em `VOCATION_MAP`.
  - Ao selecionar um personagem, recupera `gender` da entidade e instancia `createCharacter` com o gênero correto.
  - Adicionados lookTypes femininos canônicos (136, 137, 138, 139) ao `LOOKTYPE_NAME_MAP`.
  - No `VocationChoiceModal`: determina lookType apropriado ao gênero do personagem ao escolher vocação no Nível 8+.

---

## 🧪 Verificação e Testes

1. **Testes Unitários e de Integração:**
   - Criado `tests/phase158-vocation-none-and-character-gender.test.ts` com 8 testes cobrindo:
     - `vocationFor` retornando `NONE_VOCATION_DEFINITION` sem erros.
     - `calculateStatsForLevel` e `deriveStats` com vocação 'None'.
     - Transição de vocação no nível 8 preservando gênero.
     - `getStarterLookType` cobrindo masculino e feminino para todas as vocações e defaults.
   - Executados os testes de regressão:
     - `phase158-vocation-none-and-character-gender.test.ts` (8 passed)
     - `phase76-vocation-choice-level8.test.ts` (5 passed)
     - `phase154-outfit-preview-save-and-walking-animation.test.ts` (7 passed)
     - `phase135-outfit-mount-persistence-and-city-sync.test.ts` (5 passed)
     - `phase157-session-duplicate-and-logout.test.ts` (13 passed)
     - **Total: 38/38 testes aprovados (100%)**.
2. **Typecheck TypeScript:**
   - `tsc --noEmit --incremental false`: **0 erros de tipagem**.
