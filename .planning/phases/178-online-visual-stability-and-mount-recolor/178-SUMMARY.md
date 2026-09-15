# Relatório de Diagnóstico e Resolução Visual: Preview, Montarias, Addons e Caminhada

## 1. Cenário Reproduzido em Navegador Real (CDP / Chrome Headless no VPS `187.7.16.210:3000`)

Utilizando automação CDP conectada diretamente à instância do Chrome executando sobre a build de produção no servidor VPS, reproduzimos o fluxo do jogador real na Cidade de Thais:

1. **Tentativa de troca de montaria e addons no modal:**
   - **Antes:** O jogador selecionava uma nova montaria (ex: *Widow Queen* ou *Racing Bird*) ou marcava *Addon 1/2*. O preview não refletia a mudança imediata porque requisições assíncronas concorrentes (acima do limite de sockets do HTTP/1.1 de 6 conexões) sofriam timeout no `loadImage` antigo (3500ms). Ao falharem, o `prepareAppearanceCanvas` encerrava com `.catch(() => null)`, mas os frames exigidos **não** estavam no cache definitivo `recoloredCanvasCache`.
   - **Na Arena de Thais:** Como o `ThaisCityArena` disparava a preparação uma única vez por `outfitSig` e `isDesiredReady` apenas checava se `f0` existia, quando faltava algum recurso, o personagem ficava preso silenciosamente no estado anterior ou, pior, quando o canvas retornava `null`, o `view.root.visible` era setado como `false`, fazendo o personagem desaparecer completamente do mapa!
   - **Na caminhada:** Quando o personagem tentava andar enquanto um recurso estava pendente, a animação travava no mesmo frame porque `view.lastTextureKey` não era atualizado durante a transição com canvas provisório.

---

## 2. Causas Corrigidas (Os 4 Pontos do Codex)

### Ponto 1: `prepareAppearanceCanvas` com Contrato de Prontidão Real
- **Causa:** O método absorvia erros silenciosamente com `.catch(() => null)` e sua conclusão não garantia que todos os frames estavam no cache definitivo.
- **Correção em `apps/web/lib/outfitRecolor.ts`:**
  - Definida a interface canônica `AppearancePreparationResult`:
    ```ts
    export interface AppearancePreparationResult {
      success: boolean;
      missingAssets: string[];
      totalFramesRequested: number;
      cachedFramesCount: number;
    }
    ```
  - `prepareAppearanceCanvas` agora valida explicitamente se cada frame requerido (direções cardeais sul, leste, norte, oeste, frames de caminhada `f0` a `f2`/`f3`) reside genuinamente em `recoloredCanvasCache`.
  - Limite de concorrência com pool worker de 6 requisições simultâneas para respeitar os sockets do navegador sem estourar timeout.

### Ponto 2: Máquina de Estados e Tentativa Controlada em `ThaisCityArena`
- **Causa:** A preparação disparava uma única vez. Se um asset atrasasse na VPS, a troca ficava pendente para sempre.
- **Correção em `apps/web/components/ThaisCityArena.tsx`:**
  - Implementada a máquina de estados: `status: 'preparing' | 'ready' | 'failed'`.
  - Tentativas controladas: até 4 tentativas com cooldown de 1500ms entre elas.
  - Diagnóstico explícito no console dos assets bloqueadores (`res.missingAssets.join(', ')`).
  - Preservação da aparência anterior com `view.lastCanvas` e garantia incondicional de visibilidade (`view.root.visible = true`), impedindo que o jogador suma do mapa enquanto a nova aparência carrega.

### Ponto 3: Guarda Estrita do Cache Definitivo (`recoloredCanvasCache`)
- **Causa:** `renderRecoloredOutfit` e `getRecoloredCanvasSync` podiam gravar composições parciais no cache definitivo quando addons ou montarias estavam ausentes.
- **Correção em `apps/web/lib/outfitRecolor.ts`:**
  - Implementada a guarda estrita:
    ```ts
    const isFullyComplete =
      hasDrawnExactBase &&
      (!effectiveMounted || isMountDrawn) &&
      (!urls.addon1Base || isAddon1Drawn) &&
      (!urls.addon2Base || isAddon2Drawn);

    if (isFullyComplete) {
      recoloredCanvasCache.set(definitiveKey, offCanvas);
      provisionalCanvasCache.delete(definitiveKey);
    } else {
      provisionalCanvasCache.set(definitiveKey, offCanvas);
    }
    ```
  - Composições parciais agora vão **exclusivamente** para o `provisionalCanvasCache`. O cache definitivo nunca é corrompido com camadas faltantes.

### Ponto 4: Validação Abrangente de Animação com `isAppearanceFullyReady`
- **Causa:** `isDesiredReady` checava apenas `f0` e eventualmente `f1` da direção atual.
- **Correção em `apps/web/lib/outfitRecolor.ts` & `apps/web/components/ThaisCityArena.tsx`:**
  - Criada a função `isAppearanceFullyReady(...)` que inspeciona todas as 4 direções (`south`, `east`, `north`, `west`) e todos os frames da animação (`f0`, `f1`, `f2`, etc.).
  - A troca atômica só ocorre quando todas as direções e frames estão prontos ou após o esgotamento do limite de retentativas.

---

## 3. Resultado Visual Antes / Depois Verificado em Navegador Real

| Item | Antes | Depois (Verificado Online via CDP) |
|---|---|---|
| **Preview no Modal** | Não atualizava ou ficava travado na seleção anterior | Atualiza instantaneamente em 200ms ao clicar em *Sem Montaria*, *Widow Queen*, *Racing Bird* e ao rotacionar o personagem |
| **Addons no Preview** | Não apareciam em tempo hábil | Renderizados com máscaras de recolor precisas sem omitir camadas |
| **Troca de Montaria na Arena** | Permanecia na montaria anterior ou desvanecia o personagem | A troca de montaria é aplicada com persistência permanente no servidor (testado: *War Bear* -> *Widow Queen* -> *Racing Bird*) |
| **Animação de Caminhada** | Personagem congelava no chão ou ficava invisível | Caminhada fluida e contínua em todas as direções (`south`, `east`, `west`, `north`), sem travamentos |

---

## 4. Evidências Visuais e Testes Automatizados

- **Suíte Vitest Unitária & Comportamental:** 19/19 testes aprovados (100%) em `tests/phase178-online-stability-mount-recolor-preloader.test.ts`.
- **TypeScript:** 0 erros de tipagem (`npm run typecheck`).
- **Capturas de Tela Reais do Chrome no VPS:**
  - `scratch/walk-0-spawn.png`: Personagem montado no *Racing Bird* na praça de Thais.
  - `scratch/walk-1-south.png`: Personagem caminhando em direção ao sul com animação e deslocamento contínuos.
  - `scratch/walk-2-east.png`: Personagem virando e caminhando a leste.
  - `scratch/test-7-after-save-racingbird.png`: Persistência autoritativa salva e montaria aplicada no mapa após o clique em Salvar.
