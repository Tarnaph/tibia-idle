# Resumo da Phase 232: Matriz de Permissões de Outfits, Addons e Montarias

## Objetivo
Implementar o controle de acesso autoritativo para trajes, addons e montarias conforme FIX.md:
1. **Outfits Free:** Citizen, Hunter, Mage, Knight (addons dependem estritamente de quests).
2. **Outfits Premium:** Os 4 Free + 17 Premium Outfits canônicos: Noble, Summoner, Warrior, Barbarian, Druid, Oriental, Pirate, Assassin, Beggar, Wizard, Shaman, Norseman, Nightmare, Jester, Brotherhood, Demon Hunter e Yalaharian (masculino e feminino).
3. **Outfits Loja:** Todos os demais trajes permanecem visíveis, exibindo a badge "Loja" em tom lavanda/roxo (.tibia-card-badge-store), bloqueados para Free e Premium.
4. **Montarias:** Free (Rented Horse, Donkey e Sem Montaria), Premium (todas liberadas provisoriamente), GM/GOD (acesso irrestrito a todos os trajes, montarias e addons via cargo autenticado).
5. **Validação Server-Authoritative:** Impedir alteração de aparência não autorizada sem quebrar salvamento de progressão (XP, gold, loot).

## Entregas Realizadas
- `packages/domain/src/appearancePermissions.ts`: Definição de `FREE_OUTFIT_KEYS`, `PREMIUM_OUTFIT_KEYS`, `FREE_MOUNT_KEYS`, `getOutfitTier`, `isOutfitUnlockedFor`, `getMountTier`, `isMountUnlockedFor`, `isStaff`, `isAddonUnlockedFor`.
- `packages/auth/src/characterService.ts`: Validação de autorização no `saveCharacterProgress`, preservando a aparência anterior e salvando a progressão em caso de tentativa de envio de visual bloqueado.
- `apps/web/components/OutfitModal.tsx`: Badges "Loja", "Premium" e "Básico", bloqueio visual e validação de permissão ao salvar.
- `tests/phase232-outfit-mount-permissions.test.ts`: Suíte de testes automatizados com 100% de aprovação.
