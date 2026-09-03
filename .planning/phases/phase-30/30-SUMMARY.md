# Phase 30 Summary: Mapa Global de Thais no Jogo, Início Imediato de Hunt, Cores Escuras em Skills e Botão Sair no Dock

## Visão Geral
Nesta fase, implementamos todos os ajustes solicitados na nova rodada do `FIX.md` e na imagem de referência da barra de hotkeys:

1. **Integração Real do Mapa Global do Tibia (Thais):**
   - Extraído `content/generated/thais-city.json` diretamente de `realmap.otbm` contendo os 1.836 tiles autênticos de Thais.
   - Os limites cobrem com exatidão o Templo de Thais (`32369, 32241, 7`), o Depot (`32342, 32231, 7`) e a sala de treino com dummies (`32349, 32238, 7`).
   - Criado [ThaisCityArena.tsx](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/ThaisCityArena.tsx) com renderização Pixi.js de alta performance:
     - Renderiza os tiles de calçada, paredes, lockers de depot, dummies e templo.
     - Câmera suave que segue o jogador centralizado em `cityPos`.
     - Animação dos membros da party acompanhando o líder.
     - O player e sua equipe agora caminham visualmente pelas ruas reais de Thais do Templo até o Depot e do Depot até os Dummies!

2. **Início Imediato de Hunt na Cidade (Sem 5s e com label "Começar caçada"):**
   - Em [HuntSelector.tsx](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/HuntSelector.tsx):
     - Quando o jogador está na cidade (no DP, dummy ou templo), o botão exibe **`Começar caçada`**.
     - Clicar nele inicia a caçada instantaneamente, sem esperar 5 segundos.
     - Quando o jogador já está em uma caçada ativa, exibe `Trocar de caçada` e mantém os 5 segundos de contagem para segurança do combate.

3. **Cores da Janela Skills no Tema Escuro da Barra de Hotkeys (Imagem 3):**
   - Atualizada a estilização de `SkillsWindow` em [app/globals.css](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/app/globals.css):
     - Fundo carvão escuro `#15181b` / `#14171a` com bordas sutis `#272e33`.
     - Titlebar `#111417` com botões escuros `#1d2125`.
     - Barras de HP em verde vivo `#52e043` e barras vermelhas `#e03838`.
     - Badge de Level dourado e badge de XP Boost azul `#17243b` com borda `#388bfd`.
     - Textos em alto contraste branco `#f0f3f6` e cinza `#8c979e`.

4. **Botão Vermelho "SAIR DA CAÇADA" no Dock e Remoção da Janela Hunt:**
   - Em [BottomDock.tsx](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/BottomDock.tsx), adicionado o botão `SAIR DA CAÇADA` em vermelho escuro (`btn-leave-hunt`) logo ao lado de `BLESSINGS`.
   - Inclui timer regressivo de 5 segundos (`SAINDO EM 5S (CANCELAR)`) imune a re-renders.
   - Removida a antiga janela 4 (`id="hunt"`), eliminando a janela desnecessária de "training room".
   - Removido o item `Expedição` da `WindowDockBar.tsx`.

## Verificação
- **Suíte de Testes:** [tests/phase30-thais-map-hunt-ui.test.ts](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/tests/phase30-thais-map-hunt-ui.test.ts) validando dataset do mapa global de Thais, coordenadas do templo e depot, e lógica imediata de início de caçada.
- **Vitest:** 25 arquivos de teste, **187 testes passando (100% de aprovação)**.
- **TypeScript:** `npm run typecheck` com **0 erros**.
