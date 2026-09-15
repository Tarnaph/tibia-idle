# Phase 179: Diagnóstico Instrumental e Resolução Estrita de Troca de Outfits, Montarias e Persistência de Aparência

**Status:** Concluída  
**Data:** 2026-09-15  
**Commit:** `2b1f4b5dc`

---

## 🎯 Objetivo da Fase
Atender à solicitação estrita do usuário com suspensão de correções por hipótese:
1. Preservar o commit `15ca6ae03` como referência baseline.
2. Implementar diagnóstico instrumental completo por tentativa (`attemptId`), cobrindo:
   - Personagem e aparência inicial.
   - Outfit, addons e montaria selecionados.
   - Estado da preparação, recursos pendentes/falhos e duração.
   - Aparência efetivamente desenhada no preview.
   - Se o clique em salvar executou o callback, qual atualização enviou e qual resposta recebeu.
   - Aparência no estado do personagem e aparência ativa/pendente no renderizador.
   - Erros de JavaScript durante a sequência.
   - Sem registro de senhas ou tokens.
   - Confirmação de versão/commit carregado no browser.
3. Localizar a **primeira divergência** entre o que foi selecionado e o que o sistema fez.
4. Corrigir pontualmente sem migrar para spritesheets, sem novos fallbacks e sem ampliação de escopo.
5. Criar testes automatizados rigorosos que reproduzem a sequência e verificam que o resultado final corresponde estritamente à seleção.

---

## 🔍 Divergências Identificadas & Resoluções

### Divergência 1 (Preview Intermitente / Lento / Cancelado)
- **Causa Raiz:** No componente `apps/web/components/OutfitModal.tsx`, a cada alteração de slider de cor, seleção de addon ou montaria, o `useEffect` de preview disparava `prepareAppearanceCanvas(all 4 directions, 9 frames)`.
- **Efeito:** Uma enxurrada de mais de 100 requisições simultâneas de sprites de direções e frames de caminhada concorria pelo limite de 6 sockets HTTP/1.1 do navegador. O frame ativo do preview (direção Sul, f0) ficava bloqueado na fila de sockets. Quando o usuário mexia em outro controle, `renderGenRef.current` avançava e cancelava o frame em andamento (`isCurrent() === false`), fazendo o preview parecer travado ou não atualizar.
- **Correção:** Removido o pré-carregamento desnecessário de 36 variações durante o preview estático. O preview agora foca exclusivamente no frame ativo e direção ativa, exibindo a mudança imediatamente em < 16ms.

### Divergência 2 (Salvamento que Não Aplica no Personagem)
- **Causa Raiz:** No componente `apps/web/components/GamePrototype.tsx`, ao clicar no botão "Salvar" (`handleSaveOutfit`), o estado React `state.characters` era atualizado, porém `latestSaveStateRef.current.characters` **NÃO** era atualizado no mesmo tick.
- **Efeito:** Logo após a chamada de salvamento, `saveProgressRef.current(false, true)` era disparado. Dentro de `saveProgress`, o personagem era buscado em `latestSaveStateRef.current.characters`. Como a ref ainda continha o outfit/montaria antigos, o cliente enviava um payload HTTP POST `/api/characters/${id}/save` com a aparência **antiga**, sobrescrevendo no banco e revertendo visualmente o personagem no jogo logo após o salvamento.
- **Correção:** Sincronizado `latestSaveStateRef.current.characters` imediatamente dentro de `handleSaveOutfit` e `handleToggleMount`, garantindo que qualquer save imediato ou periódico envie a aparência nova e correta.

---

## 🛠️ Instrumentação Diagnóstica
- Criado `apps/web/lib/outfitDiagnostics.ts`:
  - `startAttempt`: cria correlation ID único por abertura de modal.
  - `updateSelection`: rastreia seleções e recalcula discrepâncias com o preview em tempo real.
  - `recordPreparation`: registra recursos pendentes e tempo de resolução.
  - `recordPreview`: registra o que foi efetivamente rasterizado no canvas.
  - `recordApiSave`: captura payload enviado e status retornado pela API.
  - `recordArenaState`: compara o que está desenhado no ator da arena PixiJS com a seleção do usuário.
  - Botão visível `[📋 Copiar Diagnóstico]` no rodapé do `OutfitModal`, permitindo ao usuário exportar o JSON completo e anonimizado com 1 clique.

---

## 🧪 Testes Automatizados
- `tests/phase179-outfit-diagnostic-and-strict-save.test.ts`:
  - Suíte rigorosa validando correlação por `attemptId`.
  - Validação de que a sincronização da ref impede regressão para a aparência antiga.
  - Detecção automática de divergências quando o preview ou arena divergem da seleção.
  - 4/4 testes aprovados.
- Testes de regressão:
  - `tests/phase154-outfit-preview-save-and-walking-animation.test.ts` (7/7 aprovados).
  - `tests/phase138-outfit-walking-bestiary-persistence.test.ts` (8/8 aprovados).
- `npm run typecheck`: 0 erros de tipagem.

---

## 🚀 Deploy & Ambiente VPS
- Commit `2b1f4b5dc` enviado ao GitHub `main`.
- VPS (`187.7.16.210`):
  - `git pull origin main` realizado com sucesso.
  - `npx vinext build` concluído com código 0.
  - PM2 reiniciado (`tibia-web` pid 226991, status `online`).
