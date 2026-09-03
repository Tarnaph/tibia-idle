# Phase 38 Summary: Fontes da Caçada Unificadas, Caminhada Fluída com VisualMotionTrack e Integridade Completa do Barco e Cidade

## Objetivo Concluído
Atender integralmente às solicitações em `FIX.md` e corrigir todas as 5 anomalias visuais apontadas nas imagens do usuário:
1. **Fontes Flutuantes na Caçada Padronizadas**:
   - As fontes de XP (`+X XP`), Magia/Falas (`Exura`, etc.), Dano e Cura foram todas padronizadas no tamanho `7` (`fontSize: 7`), com estilo em negrito e borda nítida, exatamente um pouco menor que a fonte do nome do personagem (`fontSize: 8`).
2. **Caminhada 100% Fluida na Cidade com `VisualMotionTrack`**:
   - `ThaisCityArena.tsx` foi atualizado para utilizar o mesmo `VisualMotionTrack` de `PixiArena.tsx`.
   - A movimentação agora possui velocidade linear constante e cadenciada (`curStepDuration`), eliminando a desaceleração exponencial (`dist * 0.28`) que causava a sensação de engasgo/travamento a cada tile.
3. **Alinhamento Natural de Multi-Tile Items (Banco, Depot e Escadas)**:
   - Removidos os offsets negativos artificiais `-(mapping.frame.height - 32)` e `-(mapping.frame.width - 32)` que deslocavam itens grandes 32px para cima e para a esquerda.
   - Solucionado o bug da parede divisória de pedra cortando o balcão do depot (Imagem 3).
   - Solucionado o desalinhamento e sobreposição em zigue-zague das mesas e balcões de madeira (Imagens 1, 2 e 4).
4. **Integridade Estrutural Completa do Barco (Pisos Z:5 e Z:4)**:
   - Identificado que o OTBM original armazena a estrutura superior da embarcação em pisos elevados: mastros, velas, cabine e quarterdeck em Z:5 (80 tiles) e mastros superiores com cordas em Z:4 (119 tiles).
   - Atualizado o script `extract-thais-region.mjs` para extrair os pisos Z:4 e Z:5 em `roofTiles` sem poluir a navegação de Z:6.
   - `ThaisCityArena.tsx` agora renderiza essas estruturas no container superior de Floor 6 com z-index ordenado.
   - Extraídos mais de 1.180 sprites autênticos de itens do Tibia 10.98.

## Testes e Validação
- Criada suíte automatizada `tests/phase38-hunt-fonts-visual-motion-track-boat-integrity.test.ts`.
- **Vitest:** 33 arquivos de teste passando, **221/221 testes aprovados (100%)**.
- **TypeScript:** 0 erros com `tsc --noEmit --incremental false`.
