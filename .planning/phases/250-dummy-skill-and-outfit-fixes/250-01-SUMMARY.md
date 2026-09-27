# Phase 250: Skill Padrão nos Dummies de Treino e Correções Críticas do Modal de Outfit (Z-Index & Gênero Feminino)

## Resumo da Entrega

A Phase 250 resolveu com sucesso todos os três itens pendentes catalogados em `FIX.md`, abrangendo tanto a mecânica do motor de jogo quanto usabilidade e fidelidade estética:

1. **Skill de Treino Padrão por Vocação nos Dummies:**
   - **Sorcerer & Master Sorcerer:** Treino direto padronizado para `magicLevel`.
   - **Druid & Elder Druid:** Treino direto padronizado para `magicLevel`.
   - **Paladin & Royal Paladin:** Treino direto padronizado para `distance`.
   - **Knight & Elite Knight:** Treino direto padronizado para a skill de maior nível entre `sword`, `axe` e `club`. Se houver empate no nível mais alto, desempata pelos tries acumulados. Se ainda empatar, utiliza a arma melee equipada no loadout (com fallback determinístico para `sword`).
   - Implementado através de `getDefaultTrainingSkill(character, content)` no módulo `packages/domain/src/training.ts` e consumido em `GamePrototype.tsx`.
   - Refatoração do menu de contexto do dummy (`TrainingDummyContextMenu.tsx`) removendo emojis e adotando SVGs lineart elegantes.

2. **Z-Index e Layout do Modal de Outfit (`OutfitModal`):**
   - Backdrop configurado com `z-index: 100000 !important;` e janela configurada com `z-index: 100001 !important;`, tanto em `app/globals.css` quanto inline em `OutfitModal.tsx`.
   - Layout responsivo garantindo `max-height: calc(100vh - 24px) !important;` e `flex-direction: column !important;` com rodapé fixo `flex-shrink: 0`, impedindo que a barra de hotkeys (`.bottom-dock-wrapper` com z-index 900) ou outros elementos sobreponham as cores e os botões Cancelar e Salvar em notebooks e telas de menores resoluções.

3. **Gênero Feminino e Sprites no Modal de Trajes:**
   - Sincronização do gênero do personagem no `OutfitModal` com estado reativo `selectedGender` (`'male' | 'female'`).
   - Renderização correta dos sprites canônicos femininos (`/generated/outfits/${id}-female-south-f0-base.png`) na lista de cards e no canvas de preview interativo.
   - Nomes canônicos femininos aplicados dinamicamente via `getOutfitDisplayName` (ex: `Noblewoman` em vez de `Nobleman`).
   - Inclusão de seletor visual de Gênero (♂ Masc / ♀ Fem) no titlebar do modal com ícones SVG lineart (Zero Emojis).
   - Persistência permanente do gênero repassado em `onSave`, propagado via WebSocket no Colyseus (`sendChangeOutfit`), gravado no Prisma DB via `/api/characters/[id]/save` e sincronizado na sessão.

---

## Verificação e Qualidade

- **Typecheck:** `npm run typecheck` executado com 0 erros de tipagem.
- **Testes Unitários:** Suíte `tests/phase250-dummy-skill-and-outfit-gender.test.ts` criada cobrindo 10 cenários (todas as vocações, empates de Knight, desempate por arma, nomes femininos e paths de sprites).
- **Testes de Regressão:** `tests/phase29-city-training-skills.test.ts` e `tests/phase172-squad-dummy-training-formation-and-multi-hud.test.ts` validados com 100% de aprovação (19/19 testes).
- **Zero Emojis:** Diretriz visual respeitada estritamente em todas as interfaces.
