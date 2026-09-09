# Phase 108 Summary: Seletor de Caçadas em Carrossel Horizontal de Cards (Design Exura Medieval / RPG Clássico)

## Overview
Refatoração visual e estrutural completa do seletor de caçadas do Exura (`HuntSelector.tsx`), substituindo a janela azul com lista de 3 colunas por um carrossel horizontal de cards baseado na referência visual clássica medieval do Exura (`media_1788985673216.png`), preservando 100% da lógica autoritativa existente de seleção, início de hunt, combate, monstros, loot, níveis e dados cadastrados.

## Key Accomplishments

1. **Extensão do Modelo de Domínio sem Perda de Compatibilidade (`packages/domain`):**
   - Adicionados os campos opcionais `displayName?: string;` e `shortDescription?: string;` na interface `HuntDefinition` (`types.ts`).
   - Preenchidos os títulos canônicos em português e descrições curtas no `initialHunts` (`hunt.ts`):
     - `rat-cellars`: *Porões Infestados* ("Ratos famintos infestam os porões.", Nv. sugerido: 1)
     - `spider-burrow`: *Toca Enredada* ("Teias cobrem esta toca esquecida.", Nv. sugerido: 8)
     - `troll-camp`: *Covil dos Trolls* ("Uma pequena tribo protege estes túneis.", Nv. sugerido: 15)
     - `old-crypt`: *Cripta Inquieta* ("Os mortos se recusam a permanecer enterrados.", Nv. sugerido: 22)
     - `rotworm-cave`: *Túneis Escavados* ("Rotworms se escondem sob a terra.", Nv. sugerido: 28)
     - `dragon-lair`: *Profundezas Chamuscadas* ("Um dragão antigo domina estas profundezas.", Nv. sugerido: 45)
   - Fallback gracioso: qualquer hunt nova sem esses campos utiliza automaticamente `hunt.name` e `hunt.description`.

2. **Criação de Subcomponentes Modulares sob `apps/web/components/hunts/`:**
   - `HuntCard.tsx`: Card vertical universal reutilizável para qualquer caçada. Contém ilustração de cenário temático em pixel art com vinheta, sprite da criatura nítido (`image-rendering: pixelated;`), medalhão circular de nível recomendado no canto superior esquerdo, título serif dourado, descrição curta, indicador de nível sugerido com coloração de dificuldade em tempo real relativa ao nível do personagem (verde = fácil, dourado = adequado, vermelho = perigoso), mini preview de loots e botão de mochila.
   - `HuntCarousel.tsx`: Carrossel horizontal exibindo simultaneamente 3 cards (`[ card anterior ] [ CARD SELECIONADO ] [ card seguinte ]`), navegação por setas chevron `<` e `>` com wrapping circular contínuo, transições suaves (200–300ms) e seleção imediata por clique nos cards laterais.
   - `HuntLootTooltip.tsx`: Popover flutuante desacoplado com posicionamento dinâmico em coordenadas de viewport, exibindo itens com `ItemSprite`, nomes e badges coloridas de raridade em português (`Comum`, `Incomum`, `Raro`, `Muito raro`), totalmente imune a corte por `overflow: hidden`.

3. **Arquitetura da Janela Modal Exura (`HuntSelector.tsx`):**
   - Moldura de pedra escura medieval com cantoneiras de ouro envelhecido e contorno chanfrado.
   - Placa superior octagonal "ESCOLHA SUA CAÇADA" com rubi decorativo superior e inferior.
   - Badge dinâmica de faixa de níveis derivada dos dados (`Nível 1 – 45`).
   - Botão principal inferior "INICIAR CAÇADA" em vermelho rubi com bisel dourado e rubis ornamentais.
   - Preservação da aba `TREINO`, botões de grupo ("Iniciar com o time", "Completar o time") e countdown de troca.

4. **Assets Gráficos Temáticos em `public/images/hunts/`:**
   - Geradas e integradas 6 ilustrações temáticas de cenário em pixel art autêntico para cada masmorra: `rat-cellars.jpg`, `spider-burrow.jpg`, `troll-camp.jpg`, `old-crypt.jpg`, `rotworm-cave.jpg`, `dragon-lair.jpg` e `default.jpg`.

5. **Estilização Vanilla CSS Autêntica (`app/globals.css`):**
   - Design elegante sem exageros, com paleta de ardósia escura, ouro envelhecido e vermelho carmim.
   - Efeitos do card central selecionado (`scale(1.045)`, brilho dourado e gemas) vs cards laterais (`scale(0.92)`, luminosidade reduzida).

## Verification Results
- `npm run typecheck`: **0 erros** de TypeScript.
- `vitest run tests/phase108-hunt-selector-carousel.test.ts`: **7/7 testes aprovados**.
- Suíte completa Vitest: **110/110 arquivos de teste aprovados (593/593 testes)**.
