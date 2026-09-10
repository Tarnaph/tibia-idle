# Phase 122: Navegação Personagem-Outfit, Validação de Camadas Inexistentes, Suporte a Sire e Concorrência de Preview

## Objetivo
Resolver os 5 pontos críticos reportados:
1. **Navegação Bidirecional Personagem ↔ Outfit:** Implementar transição real entre `OutfitModal` e `CharacterProfileModal` preservando o personagem selecionado.
2. **Validação e Proteção contra Camadas Inexistentes:** Respeitar `hasAddon1`, `hasAddon2` e `hasMountRider` do catálogo em `getOutfitCapabilities`, `getOutfitLayerUrls` e `OutfitModal.tsx`. Impedir que addons incompatíveis ou inexistentes bloqueiem a composição (`allLayersReady`) ou retornem `null`.
3. **Compatibilidade Completa com o Traje Sire:** Mapear os frames de caminhada para o ciclo real de 3 frames (f0 idle, f1..f2 passos alternados) sem tentar frames inexistentes f3..f8, e aplicar política explícita para outfits sem suporte a montaria (desabilitar montaria no UI e forçar pose a pé no compositor). Restaurar os arquivos do Sire em 64x64 com alpha transparente.
4. **Resolução de Concorrência no Preview:** Adicionar identificador de geração / cancelamento no `renderRecoloredOutfit` e `OutfitModal.tsx` para garantir que renderizações antigas nunca sobrescrevam a seleção mais recente.
5. **Auditoria de Desaparecimento de Assets e Conversão de Avatares:** Converter os arquivos `avatar-*.png` para PNGs genuínos (resolvendo o cabeçalho JPEG mascarado), e validar a integridade dos cards e visualização com cache limpo.

## Mudanças Propostas

### 1. `apps/web/lib/outfitRecolor.ts`
- Implementar `getOutfitCapabilities(outfitId)` retornando `hasAddon1`, `hasAddon2`, `hasMountRider` e `maxFrames`.
- Em `getOutfitLayerUrls`, consultar `getOutfitCapabilities`:
  - Se `!caps.hasAddon1`, não gerar `addon1Base` / `addon1Mask`.
  - Se `!caps.hasAddon2`, não gerar `addon2Base` / `addon2Mask`.
  - Se `!caps.hasMountRider`, desativar montaria e não gerar pose `-mount-base.png`.
  - Se `caps.maxFrames <= 3` (Sire), ciclar frames de caminhada entre 1 e 2: `((frame - 1) % 2) + 1`.
- Rastrear falhas de carregamento em `failedImageUrls`: se uma camada de addon falhar com 404, não bloquear a renderização da base e máscara do personagem.
- Adicionar parâmetro de cancelamento `isCurrent?: () => boolean` no `renderRecoloredOutfit`.

### 2. `apps/web/components/OutfitModal.tsx`
- Adicionar prop `onOpenCharacterProfile?: (characterId: string) => void`.
- Conectar o botão "Personagem" no topo para invocar `onOpenCharacterProfile(selectedCharId)`.
- Consultar `getOutfitCapabilities(selectedOutfit)`:
  - Desabilitar checkboxes de Addon 1 e Addon 2 quando não suportados pelo traje.
  - Limpar seleção de addons/montaria ao trocar para traje incompatível.
  - Exibir indicação clara de indisponibilidade quando desabilitado.
- Adicionar `renderGenerationRef` para invalidar renderizações assíncronas concorrentes de previews anteriores.

### 3. `apps/web/components/GamePrototype.tsx`
- Passar `onOpenCharacterProfile` para `OutfitModal` com sincronização de personagem ativo no `game.session.characters` e reabertura do `CharacterProfileModal`.
- No `CharacterProfileModal.onOpenOutfit`, passar o `activeChar.id` do perfil para abrir o mesmo personagem no modal de aparência.

### 4. `public/generated/outfits/` e `public/generated/outfit-thumbs/`
- Restaurar os sprites do Sire em 64x64 com alpha transparente a partir de `public/generated/tibia1098/outfit-sire-*.png`.
- Garantir que `sire.png` em `outfit-thumbs/` tenha 64x64 e conteúdo visível.
- Converter `public/images/avatars/avatar-*.png` para PNGs genuínos.

## Verificação
- Criar suíte de testes dedicada `tests/phase122-outfit-navigation-capabilities-sire.test.ts`.
- Rodar `cmd.exe /c npm run typecheck` (0 erros).
- Rodar `cmd.exe /c npm run test` (100% de aprovação).
