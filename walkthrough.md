# Walkthrough - Resolução de Bugs e Melhorias (FIX.md)

## 🎯 Resumo da Entrega

Todas as causas-raiz identificadas na versão online e no screenshot foram diagnosticadas com precisão cirúrgica, corrigidas no código-fonte, validadas com testes unitários, validadas com `typecheck` (0 erros) e implantadas em produção na VPS Hostinger (`187.7.16.210`).

---

### 1. 🖼️ Requisições de Outfits, Montarias, Frames de Caminhada e Hunts (HTTP 200 OK)
- **Causa Raiz Identificada:** 
  O servidor de produção Vinext (`prod-server.js`) interceptava e servia arquivos estáticos com base em uma lista pré-compilada em tempo de build (`publicFiles`). Como a base de assets continha mais de 185.000 arquivos (outfits, montarias, animações, banners de hunts e itens), qualquer arquivo que não constasse estritamente no índice inicial recebia **HTTP 404 Not Found**.
- **Solução Implementada:**
  - O script canônico `scripts/patch-http-pipeline.cjs` foi aprimorado para injetar uma verificação estática inteligente no pipeline do servidor de produção (`prod-server.js`).
  - O patch confere a existência em disco e serve com cache otimizado qualquer arquivo estático sob `/public` (`/assets/`, `/images/`, `/spells/`, `/hunts/`, `/generated/`).
  - Testado e validado online: todas as requisições de outfits (`hunter-male-*-mount-base.png`), montarias (`flying-book-*-f*.png`), animações e banners de hunt (`rat-cellars.jpg`, `dragon-lair.jpg`) retornam **HTTP 200 OK**.

---

### 2. 👤 Dimensionamento dos Avatares (CSS e Layout)
- **Causa Raiz Identificada:**
  A imagem original dos avatares (`avatar-1.png` a `avatar-5.png`) possui dimensão nativa de 1024×1024 pixels. Na `WindowDockBar.tsx` e na antiga janela de membros da party, o contêiner (`huntera-avatar-box`) não possuía `overflow: hidden`, e a tag `<img>` com classe `.huntera-avatar-img` não possuía estilos inline ou regras CSS que forçassem largura/altura de 100%. Consequentemente, o browser renderizava o avatar em seu tamanho intrínseco de 1024px, vazando sobre metade da tela do jogo.
- **Solução Implementada:**
  - **Preservação da Arte:** A arte original em alta resolução de todos os avatares foi preservada intacta, sem nenhuma degradação ou substituição de arquivos.
  - **Isolamento de Contêiner:** Em `WindowDockBar.tsx`, a imagem do avatar foi envolvida em um contêiner interno com `width: 100%; height: 100%; overflow: hidden; border-radius: 3px; display: flex; align-items: center; justify-content: center;`, mantendo a tooltip de hover externa sem recorte.
  - **Estilização Robusta:** Adicionados estilos defensivos inline (`width: 100%; height: 100%; max-width: 100%; max-height: 100%; object-fit: cover; display: block;`) e regras em `app/globals.css` para `.huntera-avatar-box`, `.huntera-avatar-img`, `.member-avatar-box` e `.squad-avatar-img`.

---

### 3. 👥 Remoção da Janela Antiga de Party e Direcionamento para Party Unificada
- **Causa Raiz Identificada:**
  Em `GamePrototype.tsx`, a janela clássica legada `<DraggableWindow id="party">` com `<PartyWindow>` ainda era montada na árvore de componentes. Além disso, `WindowManagerContext.tsx` definia `party.isOpen: true` por padrão e restaurava estados anteriores salvos no `localStorage` do navegador sob a chave `cavebound_window_layout_v1`.
- **Solução Implementada:**
  - Removido completamente o componente `<DraggableWindow id="party">` e o `<PartyWindow>` de `GamePrototype.tsx`.
  - Em `WindowManagerContext.tsx`, o valor padrão de `party.isOpen` foi definido como `false`.
  - Adicionado mecanismo de saneamento no `useEffect` de hidratação: qualquer preferência salva da janela `party` no `localStorage` é expurgada e deletada automaticamente, garantindo que usuários existentes não tenham a janela antiga reaberta.
  - O botão de grupo na `WindowDockBar` agora invoca diretamente `onOpenParty()`, abrindo a janela moderna e completa `UnifiedPartyModal`.

---

### 4. 💾 Resolução da Falha ao Salvar Progresso no Servidor
- **Causa Raiz Identificada via Logs de Produção (PM2):**
  Nos logs da VPS Hostinger, a API `/api/characters/:id/save` rejeitava requisições do personagem `Grievous` com o erro HTTP 400:
  `[CharacterSave API error]: Promoção de vocação exige nível 20 ou superior.`
  O personagem `Grievous` (Level 16 Master Sorcerer) já possuía a promoção salva no banco de dados. No entanto, o `CharacterService.ts` executava:
  ```typescript
  if (data.promotion && targetLevel < 20 && !options?.isInternal) {
    throw new Error('Promoção de vocação exige nível 20 ou superior.');
  }
  ```
  Essa regra bloqueava o auto-save de qualquer personagem que já fosse promovido mas estivesse abaixo do nível 20 (por exemplo, após perder experiência por morte ou ter sido promovido anteriormente). A cada 5 segundos, o salvamento periódico falhava e exibia a notificação vermelha no topo da tela: `⚠️ Falha ao salvar progresso no servidor.`
- **Solução Implementada:**
  - A validação em `packages/auth/src/characterService.ts` foi corrigida cirurgicamente:
    A exigência de nível 20 agora se aplica exclusivamente quando um personagem **ainda não promovido** tenta adquirir uma nova promoção (`!isAlreadyPromoted`).
  - Personagens já promovidos conseguem salvar normalmente seu progresso (posição, vida, mana, experiência, skills e inventário).
  - Testado diretamente na VPS contra a API com o personagem `Grievous`:
    - Status HTTP: **200 OK**
    - `saveVersion`: Atualizado com sucesso
    - O log de erro do PM2 na VPS permaneceu 100% zerado.

---

## 🧪 Verificações e Testes

1. **TypeScript Typecheck:**
   ```bash
   npm run typecheck -> Código de saída 0 (zero erros de compilação em todo o monorepo).
   ```
2. **Testes Unitários:**
   ```bash
   npx vitest run tests/block1-1-concurrency-and-security.test.ts -t "permite salvamento de personagem já promovido"
   # Resultado: 1 passed
   ```
3. **Deploy e Validação na VPS Hostinger (`187.7.16.210`):**
   - Código commitado no Git e sincronizado via `git push origin main`.
   - Build do cliente e SSR executados sem erros (`vinext build`).
   - Patch de serving estático reaplicado via `patch-http-pipeline.cjs`.
   - Processos PM2 reiniciados: `tibia-web` (ID 2) e `colyseus-server` (ID 0) online.
   - Script de teste ao vivo `test-vps-grievous-save.mjs` executado com sucesso (HTTP 200).
