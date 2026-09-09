# Phase 93 Summary: Ícones Oficiais de Magias de Sorcerer via Tibia 11 (graphics_resources.rcc)

## Visão Geral

Nesta fase atendemos integralmente ao pedido do usuário de extrair os ícones oficiais das magias do print de referência a partir dos arquivos locais do Tibia, iniciando pelo arquivo `graphics_resources.rcc` da pasta `Tibia 11`, e utilizando os ícones encontrados para corrigir todas as magias de Sorcerer na lista de configuração de ações, no painel de detalhes e na barra de ações.

---

## Descobertas Técnicas & Mapeamento Canônico

1. **Estrutura do `graphics_resources.rcc`**:
   - Localizado em `c:\Users\desig\OneDrive\Documentos\TibiaWeb\Tibia 11\Tibia 11\Tibia 11\bin\graphics_resources.rcc` (2.94 MB, formato Qt Resource Collection v1 `qres`).
   - Contém o arquivo interno `fonts/images/spells/spell-icons-32x32.png` com 146 ícones em resolução $4672 \times 32$ pixels, sem artefatos e com paleta RGB nativa da CipSoft.
2. **Registro no Binário `client.exe` & `client.en.qm`**:
   - As 137 magias do Tibia 11 são registradas com seus Spell IDs e índices na spritesheet de 146 ícones.
   - O ícone do **Apprentice's Strike** (`exori min flam`, Spell ID 169) é o **#126**: o míssil de fogo com o capelo/chapéu de formando no canto inferior direito, idêntico ao print do usuário!
   - O ícone de **Light Healing** (`exura`, Spell ID 1) é o **#5**: cruz translúcida branca com frasco de poção vermelha no canto inferior esquerdo.
   - O ícone de **Energy Strike** (`exori vis`, Spell ID 88) é o **#28**: redemoinho de energia magenta.
   - O ícone de **Terra Strike** (`exori tera`, Spell ID 113) é o **#34**: mão canalizando terra e folhas.
   - O ícone de **Flame Strike** (`exori flam`, Spell ID 89) é o **#25**: mão disparando labareda concentrada.
   - O ícone de **Haste** (`utani hur`, Spell ID 6) é o **#100**: silhueta de personagem correndo com rastro ciano.
   - O ícone de **Magic Shield** (`utamo vita`, Spell ID 44) é o **#123**: escudo dourado com aura ciano.
   - O ícone de **Fire Wave** (`exevo flam hur`, Spell ID 19) é o **#43**.
   - O ícone de **Energy Beam** (`exevo vis lux`, Spell ID 22) é o **#40**.
   - O ícone de **Great Energy Beam** (`exevo gran vis lux`, Spell ID 23) é o **#41**.
   - O ícone de **Energy Wave** (`exevo vis hur`, Spell ID 13) é o **#42**.
   - O ícone de **Hell's Core** (`exevo gran mas flam`, Spell ID 24) é o **#48**.
   - O ícone de **Rage of the Skies** (`exevo gran mas vis`, Spell ID 119) é o **#51**.
   - E todos os outros tiers de magias de ataque elementais (Strong, Ultimate, Ice e Death).

---

## Arquivos Modificados / Criados

- `scripts/extract-tibia11-spell-icons.mjs`:
  - Parser completo de Qt RCC (`graphics_resources.rcc`), decodificador de PNG RGB com descompressão de scanlines e desfiltragem Paeth/Sub/Up/Average, particionador de 146 ícones $32 \times 32$ e gerador de arquivos canônicos em `public/spells/` e `public/spells/canonical/`.
- `public/spells/*.png`:
  - Atualizados todos os arquivos de magias de Sorcerer com os PNGs canônicos 32x32 sem artefatos ou recortes incorretos.
  - Adicionado `exori-min-flam.png` (ícone #126 com o capelo).
- `apps/web/components/Tibia11ActionIcon.tsx`:
  - `resolveActionImagePath` atualizado para mapear as magias de Sorcerer com exatidão, eliminando colisões de IDs legados e garantindo a mesma aparência do print na lista do modal, no painel de detalhes e na action bar.
  - `ALL_SPELL_ICON_URLS` atualizado com as novas URLs canônicas.
- `tests/phase93-sorcerer-spell-icons-tibia11.test.ts`:
  - Testes cobrindo a resolução de todas as 6 magias do print de referência e de todas as 23 magias de Sorcerer, integridade byte-a-byte com os ícones extraídos do RCC e validação das dimensões $32 \times 32$.

---

## Verificação e Qualidade

- **Typecheck**: `npm run typecheck` $\rightarrow$ **0 erros**.
- **Testes Unitários**: `vitest run` executou **94 arquivos de teste** e **492 testes aprovados** (100% de sucesso).
- **Integridade do Jogo**: O mapa OTBM, arquivos DAT/SPR de simulação do jogo e as regras/fórmulas de dano permaneceram 100% inalterados conforme requisitado.
