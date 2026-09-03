# Phase 37 Summary: Movimento Fluído na Cidade (+50% Velocidade) e Mapa Completo do Segundo Andar (Z:6)

## 1. Contexto e Diagnóstico
Em `FIX.md`, o usuário solicitou:
> 1. *"A animação do personagem andando na cidade esta meio travado, precisa ser mais fluído, vamos aumentar mais ainda a velocidade pode aumentar 50% da velocidade na cidade, para ficar mais dinâmico"*
> 2. *"O segundo andar na cidade esta bugado, esta tudo preto, precisa completar o mapa"*

**Diagnóstico Técnico:**
1. **Velocidade e Fluidez:** A velocidade anterior (+25%) e a taxa de alternância de frames do ciclo de passos (0 -> 1 -> 0 -> 2) estavam com intervalos longos, gerando uma sensação de passos travados/duros. Aumentar a velocidade para 50% superior à base oficial e calibrar a cadência dos frames da animação (`stepRateMs = curStepDuration / 3.5`) tornou o movimento contínuo e responsivo.
2. **Tela Preta no Segundo Andar:**
   - Na Phase 36, definimos `floor7Container.visible = curPos.z === 7`, o que ocultava completamente o piso Z:7 quando o jogador subia para o Z:6.
   - Em OTBM e no Tibia original, o piso Z:6 contém apenas telhados, passarelas e decks de madeira do píer; onde há mar aberto ou ruas ao redor da passarela, não há tile no Z:6.
   - Como o Z:7 ficava oculto, o mar e o chão ao redor do píer e do barco viravam um imenso vazio preto na tela.
   - Além disso, o script de extração `extract-tibia1098-thais.mjs` lia apenas `thaisCity.tiles` (Z:7), deixando de extrair 266 itens exclusivos do piso superior (Z:6).

## 2. Implementações Realizadas

### 2.1 Bônus de 50% na Velocidade Urbana e Movimentação Fluida ([GamePrototype.tsx](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/GamePrototype.tsx) & [ThaisCityArena.tsx](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/ThaisCityArena.tsx))
- `cityStepDurationMs = Math.round(baseStepDurationMs / 1.5)`: concede exatamente **50% de aceleração** na cidade em relação à base do TFS.
- Acelerado o ciclo de troca de frames da caminhada do personagem para `stepRateMs = Math.max(60, Math.min(130, Math.floor(curStepDuration / 3.5)))`.
- Interpolação de pixels suavizada: velocidade linear com aceleração proporcional à distância (`Math.max(targetPixelsPerFrame * 1.15, dist * 0.28)`), com snap imediato caso haja teleporte (`dist > 96`).

### 2.2 Eliminação de Vazio Preto e Extração Completa de Sprites do Z:6 ([extract-tibia1098-thais.mjs](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/scripts/extract-tibia1098-thais.mjs))
- Atualizado o pipeline de extração para cobrir tanto `thaisCity.tiles` (Z:7) quanto `thaisCity.upperTiles` (Z:6).
- Extraídos com sucesso **1.082 itens únicos** do Tibia 10.98 em PNGs de alta fidelidade para `public/generated/tibia1098/items/`.
- No cliente gráfico (`ThaisCityArena.tsx`):
  - `floor7Container.visible = true`: o piso Z:7 (mar, praias, ruas e construções) atua permanentemente como o terreno base da cidade.
  - `floor6Container.visible = curPos.z === 6`: quando no piso Z:6, as passarelas de madeira, o píer, o navio e os telhados são desenhados perfeitamente sobrepostos ao mar e ao térreo, sem nenhum vazio preto.

---

## 3. Validação e Qualidade
- **Nova Suíte de Testes:** [tests/phase37-fluid-walking-50percent-speed-full-floor6.test.ts](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/tests/phase37-fluid-walking-50percent-speed-full-floor6.test.ts) validando a velocidade urbana 50% mais rápida, presença dos mais de 7.000 tiles no Z:6 e cobertura de mais de 95% de sprites PNG válidos no disco.
- **Vitest:** **217 testes passando em 32 suítes (100% de aprovação)**.
- **TypeScript:** `npm run typecheck` com **0 erros**.
