# Phase 120 Summary: Correção de Montarias, Alinhamento Relativo por DAT Displacement, Cache Definitivo e Addons Montados

## 1. Visão Geral e Problemas Abordados

Nesta fase foi implementada a resolução definitiva dos quatro problemas críticos no sistema de montarias, alinhamento e renderização de personagens:

1. **Prevenção de Envenenamento de Cache (`recoloredCanvasCache`):**
   - Anteriormente, em `apps/web/lib/outfitRecolor.ts`, `getRecoloredCanvasSync()` gravava no cache definitivo uma composição mesmo quando a imagem da montaria (`urls.mountUrl`) ainda estava pendente de download.
   - O retorno antecipado do cache nas chamadas subsequentes impedia a reconstrução da textura, deixando o jogador montado de forma permanente sem a montaria visível (reproduzido com carregamento simulado da Black Sheep).
   - **Solução:** `getRecoloredCanvasSync` agora valida rigorosamente se TODAS as camadas necessárias (base, máscara, montaria e addons ativos) estão completamente carregadas (`complete === true && naturalWidth > 0`). Se qualquer camada estiver incompleta, dispara o carregamento assíncrono em background e retorna um fallback provisório (sem salvar sob a chave definitiva no `recoloredCanvasCache`), permitindo que a composição definitiva seja gerada e armazenada assim que as texturas terminarem de carregar.

2. **Eliminação de Colisão de Chaves entre Pose a Pé e Pose Montada:**
   - A função utilizava a pose a pé como fallback enquanto a pose montada estava carregando e podia persistir esse fallback sob a chave definitiva da composição montada (`_mwar-bear`, `_mblack-sheep`).
   - **Solução:** O cache provisório e os fallbacks transitórios foram completamente segregados do `recoloredCanvasCache`. A checagem `isOutfitCanvasCached(key)` só retorna `true` quando a composição definitiva de todas as camadas foi gerada.

3. **Preservação de `ThingAttrDisplacement` e Alinhamento Relativo Canônico:**
   - No parser DAT (`packages/tibia1098-assets/src/dat.ts`), o atributo 24 (`ThingAttrDisplacement`) era lido e descartado, fazendo com que animal e cavaleiro fossem desenhados em `(0, 0)` sem deslocamento.
   - Com isso, o cavaleiro ficava desalinhado da sela (especialmente visível no War Bear nas quatro direções).
   - **Solução:**
     - `readAttributes1098` e `readAppearance1098` agora capturam `{ x, y }` de `ThingAttrDisplacement` na interface `TibiaAppearance`.
     - O script extrator exporta esses metadados em `outfits.json` e `mounts.json`.
     - Foi implementada a função canônica de deslocamento relativo `getMountDisplacementOffset(outfitId, gender, mountId)`:
       `offsetX = (mountWidth - outfitWidth) * 32 + (outfitDisp.x - mountDisp.x)`
       `offsetY = (mountHeight - outfitHeight) * 32 + (outfitDisp.y - mountDisp.y)`
       Para Citizen (`disp: { x: 8, y: 8 }`) em War Bear (`disp: { x: 0, y: 0 }`), o cavaleiro e addons são desenhados exatamente em `(8, 8)` sobre a montaria desenhada em `(0, 0)`, centralizando o cavaleiro com perfeição na sela nas 4 direções (South, North, East, West).
       Outfits com diferentes valores de deslocamento (e.g. `{ x: 5, y: 5 }` ou `{ x: 0, y: 0 }`) aplicam seus próprios valores canônicos da DAT, sem uso de constantes arbitrárias globais.

4. **Extração e Seleção de Addons Montados (`z = 1`):**
   - Anteriormente, os addons montados usavam os arquivos de addons a pé (`z = 0`), pois o extrator só gerava addons para `z = 0`.
   - **Solução:**
     - O extrator `scripts/extract-complete-appearances.mjs` foi atualizado para verificar se `hasMountRider` é verdadeiro (`patternZ >= 2`) e, se `hasAddon1` ou `hasAddon2` existirem, extrair as camadas correspondentes com `z = 1` tanto no FrameGroup 0 (Idle `f0`) quanto no FrameGroup 1 (Walk cycle `f1..f8`), salvando como `-mount-addon1-base.png`, `-mount-addon1-mask.png`, `-mount-addon2-base.png` e `-mount-addon2-mask.png`.
     - O compositor `getOutfitLayerUrls` agora seleciona automaticamente os arquivos `-mount-addon*` quando `isMounted` é verdadeiro.

---

## 2. Arquivos Modificados e Criados

- `packages/tibia1098-assets/src/types.ts`: Adicionada interface `ThingDisplacement` e atributo opcional `displacement?: ThingDisplacement` em `TibiaAppearance`.
- `packages/tibia1098-assets/src/dat.ts`: Atualizado `readAttributes1098` para decodificar atributo 24 (`ThingAttrDisplacement`) como `{ x, y }` e anexar à aparência.
- `scripts/extract-complete-appearances.mjs`:
  - Adicionada extração de addons montados (`z: 1`) para `f0` (repouso) e `f1..f8` (caminhada).
  - Exportação de `displacement`, `maleDisplacement` e `femaleDisplacement` em `content/generated/outfits.json`.
  - Exportação de `displacement`, `width` e `height` em `content/generated/mounts.json`.
- `apps/web/lib/outfitRecolor.ts`:
  - Importação e tipagem de `mounts.json`.
  - Implementação da função canônica `getMountDisplacementOffset(outfitId, gender, mountId)`.
  - Atualização de `getOutfitLayerUrls` para direcionar addons montados quando `isMounted === true`.
  - Atualização de `drawRecoloredLayer` para aceitar deslocamento de destino `(destX, destY)`.
  - Atualização de `renderRecoloredOutfit` e `getRecoloredCanvasSync` com a trava de integridade: composições definitivas só são gravadas quando todas as camadas necessárias estiverem prontas.
  - Exportação de `registerCachedImage`, `clearImageElementCache` e `clearRecoloredCanvasCache`.
- `content/generated/outfits.json`: Atualizado com os metadados de deslocamento e flags de addons.
- `content/generated/mounts.json`: Atualizado com os metadados de deslocamento e dimensões (`w: 2, h: 2`).
- `public/generated/outfits/*-mount-addon*.png`: Gerados mais de 18.000 novos arquivos PNG de addons montados para todos os outfits e direções.
- `tests/mount-composition-regression.test.ts`: Suíte de testes de regressão automatizada cobrindo deslocamento, addons montados, montaria terminando de carregar após o cavaleiro, e alternância montado/desmontado.
- `tests/phase115-fix-audit.test.ts`: Atualizado para esperar URLs de addons montados quando `isMounted` é verdadeiro.

---

## 3. Validação e Qualidade

- **Testes Unitários e de Integração:** 100% de aprovação (todos os 121 arquivos de testes do Vitest aprovados).
- **Testes de Regressão de Montaria:** 8 testes dedicados aprovados cobrindo Black Sheep, War Bear nas 4 direções, ciclo de caminhada, addons e invariantes de cache.
- **Typecheck:** 0 erros de TypeScript (`npm run typecheck`).
