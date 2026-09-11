# Phase 129 Summary: Eliminação Definitiva de Travamento da Tela de Outfits/Montarias e Normalização Canônica Perfeita

## Status: Complete ✅
- **Testes:** 130 test files / 746 testes aprovados no Vitest (100% de aprovação).
- **Tipagem:** 0 erros no TypeScript (`npm run typecheck`).
- **Suíte Criada:** `tests/phase129-audit-all-outfits-preview.test.ts` (7 testes aprovados).

---

## 1. Problemas Diagnosticados e Causa Raiz

1. **Colisão e Mapeamento Errado do Traje `Retro Nobleman` (`retro-noblewoman`):**
   - **Diagnóstico:** Em `apps/web/lib/outfitRecolor.ts`, a função `normalizeOutfitId` continha uma checagem ampla:
     `(idLower.includes('noble') && (o.id === 'noblewoman' || o.name.toLowerCase() === 'nobleman'))`.
   - Ao processar `Retro Nobleman`, `idLower` era `'retro nobleman'`. Como continha `'noble'`, a busca no catálogo canônico parava no primeiro resultado (`noblewoman`, que antecede `retro-noblewoman` no arquivo JSON).
   - O jogador clicava em `Retro Nobleman` esperando o clássico visual retrô masculino, mas o sistema resolvia e renderizava `noblewoman` (o traje clássico feminino com vestido).
   - Além disso, o traje `Norseman` não possuía alias canônico para `norsewoman`, caindo no fallback `knight`.

2. **Inconsistência de IDs e Desconexão de Cards (`OutfitModal.tsx`):**
   - Em `EXTRA_OUTFITS`, a lista de trajes adicionais mapeava `id: o.name` em vez de `id: o.id`.
   - Como `char.outfit` guardava o ID canônico (ex: `retro-noblewoman` ou `retro-warrior`), a comparação de seleção `selectedOutfit === outfit.id` falhava e o card nunca ficava destacado.
   - A falta de normalização na seleção causava inconsistência de estado entre o thumbnail e o canvas de preview.

3. **Travamento e Congelamento por Promises Eternamente Pendentes (`loadImage`):**
   - Ao abrir a aba de Outfits (78 trajes) ou Montarias (130 montarias), o navegador iniciava requisições simultâneas de thumbnails.
   - O `loadImage` criava uma Promise gerenciada sem nenhum mecanismo de timeout. Se qualquer requisição sofresse atraso ou ficasse parada na fila do navegador, a Promise ficava em trânsito no `inFlightImagePromises` para sempre.
   - Qualquer tentativa de renderizar o canvas (`renderRecoloredOutfit`) ficava bloqueada esperando essa Promise, fazendo a tela de customização parecer totalmente congelada (não respondendo a rotações, cliques de cores ou addons).

4. **Falta de Proteção contra Exceções de Contexto e Canvas:**
   - Chamadas a `drawImage` e `getImageData` dentro de `drawRecoloredLayer` e `recolorPixels` não possuíam blocos `try...catch`. Qualquer imagem não inicializada ou contexto de canvas temporariamente corrompido disparava exceções síncronas que quebravam a execução e geravam unhandled rejections no React.

---

## 2. Alterações Implementadas

### A. Camada de Normalização e Carregador Resiliente (`apps/web/lib/outfitRecolor.ts`)
- **Prioridade Absoluta de Correspondência Exata:**
  - `clean === o.id`, `idLower === o.name.toLowerCase()`, `idLower === o.femaleName.toLowerCase()` e `idLower === o.maleName.toLowerCase()` são avaliados primeiro, garantindo resolução imediata e precisa para todos os 76 trajes.
- **Mapeamento Canônico de Aliases:**
  - `clean === 'noble' || idLower === 'noble' || idLower === 'nobleman' || idLower === 'noblewoman'` -> `noblewoman`.
  - `clean === 'norse' || idLower === 'norse' || idLower === 'norseman' || idLower === 'norsewoman'` -> `norsewoman`.
  - Prefixos `retro-` (`retro-citizen`, `retro-hunter`, `retro-knight`, `retro-wizard`, `retro-noblewoman`, `retro-summoner`, `retro-warrior`) são verificados antes de fallbacks clássicos para evitar colisões de substrings.
- **Timeout Protetivo de 3500ms no `loadImage`:**
  - Timer de segurança acoplado ao ciclo da Promise com `clearTimeout` tanto em sucesso quanto em falha. Nenhuma requisição fica pendente por mais de 3,5 segundos, eliminando qualquer possibilidade de congelamento da interface.
- **Blindagem e Tolerância a Falhas no Canvas:**
  - `drawRecoloredLayer`: verificação estrita de `complete && naturalWidth > 0` e bloco `try...catch` capturando e isolando exceções.
  - `recolorPixels`: encapsulamento em `try...catch` prevenindo quebras por canvas context invalidation.
  - `renderRecoloredOutfit`: redefinição atômica de `width` e `height` no `targetCanvas` apenas quando houver alteração de dimensão real, preservando estados de suavização.

### B. Interface de Customização de Aparência (`apps/web/components/OutfitModal.tsx`)
- `EXTRA_OUTFITS` agora mapeia estritamente `id: o.id`, preservando os identificadores canônicos.
- A verificação de seleção de cards utiliza `normalizeOutfitId(selectedOutfit) === normalizeOutfitId(outfit.id)`, sincronizando perfeitamente trajes independentemente de títulos legíveis ou slugs.
- A verificação de montarias utiliza `normalizeMountId(selectedMount) === normalizeMountId(mount.id)`.
- A chamada assíncrona a `renderRecoloredOutfit` no `useEffect` conta com tratamento de erro `.catch()`.

### C. Suíte de Testes Dedicada (`tests/phase129-audit-all-outfits-preview.test.ts`)
- Validação estrita da normalização de `Retro Nobleman` para `retro-noblewoman`.
- Verificação de normalização de 100% dos 78 trajes disponíveis e existência de todos os thumbnails em disco.
- Renderização simulada de todos os 78 outfits a pé e montados, em todas as 4 direções e variantes de gênero masculino/feminino.
- Teste de addons ativos (1, 2 e 3) e trajes sem suporte (Sire, Retro-Knight).
- Teste de timeout do `loadImage` comprovando descarte seguro de requisições estacionadas em ~3500ms.

---

## 3. Verificação Automatizada (GSD)
- `npm run typecheck`: **0 erros**
- `tests/phase129-audit-all-outfits-preview.test.ts`: **7 testes aprovados**
- `tests/phase128-autosave-mutex-and-sprite-resilience.test.ts`: **7 testes aprovados**
- `tests/phase123-outfit-addons-persistence-canonical-fix.test.ts`: **7 testes aprovados**
- `tests/phase122-outfit-navigation-capabilities-sire.test.ts`: **10 testes aprovados**
- `tests/phase121-outfit-mount-animation-fix.test.ts`: **6 testes aprovados**
