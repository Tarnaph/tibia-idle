# Walkthrough - Phase 158: Suporte à Vocação 'None' e Seleção de Gênero (Masculino / Feminino) na Criação

## 🎯 Resumo da Entrega

Nesta fase, resolvemos a causa raiz do erro de entrada no jogo (`Missing vocation None.`) e implementamos a seleção completa e persistente de sexo/gênero (**♂ Masculino / ♀ Feminino**) na criação de personagens.

---

## 🛠️ Modificações Realizadas

### 1. Suporte Seguro à Vocação 'None' no Domínio
- **`packages/domain/src/party.ts`**:
  - Definida e exportada a constante `NONE_VOCATION_DEFINITION: VocationDefinition` com id 0, multiplicadores e ganhos neutros.
  - Atualizado `vocationFor(content, name)` para retornar `NONE_VOCATION_DEFINITION` de forma segura sempre que `name === 'None' || !name`, prevenindo exceções durante `deriveStats`.
  - Adicionado fallback seguro em `starterFor` para quando `content.starterLoadouts` estiver vazio.
  - Atualizada `calculateStatsForLevel` para calcular stats autênticos de personagens sem vocação.

### 2. Persistência Permanente de Sexo/Gênero no Prisma (MMORPG State Rule 5)
- **`prisma/schema.prisma`**:
  - Adicionada a coluna `gender String @default("male")` à tabela `Character`.
  - Sincronizado o schema com o banco SQLite (`prisma db push`) e gerado o Prisma Client (`prisma generate`).

### 3. Backend e Starter Outfits por Gênero
- **`packages/auth/src/characterService.ts`**:
  - Adicionado `gender?: 'male' | 'female'` em `CreateCharacterInput`.
  - Criada função `getStarterLookType(vocationId, gender)` para atribuir o visual canônico correspondente:
    - **None (0):** Citizen Male = 128 | Citizen Female = 136
    - **Sorcerer / Druid (1, 2):** Mage Male = 130 | Mage Female = 138
    - **Paladin (3):** Hunter Male = 129 | Hunter Female = 137
    - **Knight (4):** Knight Male = 131 | Knight Female = 139
  - Persistido `gender` e `outfitLookType` na criação no banco.
- **`app/api/characters/route.ts`**:
  - Rota `POST /api/characters`: recebe `gender` do cliente e repassa ao serviço.
  - Rota `GET /api/characters`: retorna `gender` de cada personagem.

### 4. Interface com Seletor de Sexo/Gênero e Badges na Lista
- **`apps/web/components/auth/TibiaAuthCharacterModal.tsx`**:
  - Adicionado estado `charGender: 'male' | 'female'` com toggle estilizado na criação:
    - **♂ Masculino** (destaque azul)
    - **♀ Feminino** (destaque rosa)
  - Cards de personagens na lista exibem badges coloridas indicando o gênero (`♂ Masculino` ou `♀ Feminino`).
  - Enviado `gender: charGender` na requisição `POST /api/characters`.

### 5. Suporte no Game Prototype
- **`apps/web/components/GamePrototype.tsx`**:
  - Mapeado `0: 'None'` em `VOCATION_MAP`.
  - Ao carregar o personagem, passa o `gender` recuperado para `createCharacter`.
  - Mapeados lookTypes femininos (136, 137, 138, 139) em `LOOKTYPE_NAME_MAP`.
  - No modal de escolha de vocação (Nível 8+), define o lookType e outfit corretos de acordo com o sexo do personagem.

---

## 🧪 Validação dos Testes

1. **Vitest Test Suite:**
   - Suíte `tests/phase158-vocation-none-and-character-gender.test.ts` criada e aprovada (8/8 testes).
   - Testes de regressão executados:
     - `phase158-vocation-none-and-character-gender.test.ts`: 8/8 aprovados
     - `phase76-vocation-choice-level8.test.ts`: 5/5 aprovados
     - `phase154-outfit-preview-save-and-walking-animation.test.ts`: 7/7 aprovados
     - `phase135-outfit-mount-persistence-and-city-sync.test.ts`: 5/5 aprovados
     - `phase157-session-duplicate-and-logout.test.ts`: 13/13 aprovados
     - **Resultado:** 38/38 testes aprovados (100%).
2. **TypeScript Typecheck:**
   - `tsc --noEmit --incremental false`: **0 erros de tipagem**.
