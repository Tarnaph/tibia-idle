# Phase 39: Integração de mapaserver.otbm, Resposta Instantânea do Teclado e Velocidade Urbana Dobrada

## 📌 Visão Geral da Entrega

Nesta fase atendemos integralmente as demandas documentadas em `FIX.md` e os arquivos fornecidos pelo usuário (`mapaserver.otbm` de 145MB):

1. **Substituição Oficial do Mapa pelo `mapaserver.otbm` do Usuário:**
   - O pipeline de extração de Thais (`scripts/extract-thais-region.mjs`) foi direcionado diretamente para o arquivo `mapaserver.otbm`.
   - Extração pura e canônica de Thais:
     - **Térreo (Z:7):** 18.271 tiles com dados oficiais do servidor.
     - **Segundo Andar (Z:6):** 7.722 tiles (cais, píer, convés do navio, passarelas e telhados do 1º andar).
     - Remoção do dump arbitrário de telhados de Z:4/Z:5 que gerava peças flutuantes e desalinhadas na cidade.
   - Sincronização dos 1.082 sprites em `public/generated/tibia1098/items/` com extração do `Tibia.dat` e `Tibia.spr`.

2. **Restauração do Alinhamento e Offsets Canônicos do Tibia (`ThaisCityArena.tsx`):**
   - No Tibia, itens multi-tile (paredes de 64px de altura, portas, arcos, árvores e estátuas) têm como âncora o tile inferior do grid (`dest - (m_size - 1) * 32`).
   - Foram restaurados os offsets:
     `offsetY = mapping.frame.height > 32 ? -(mapping.frame.height - 32) : 0;`
     `offsetX = mapping.frame.width > 32 ? -(mapping.frame.width - 32) : 0;`
   - Com isso, todas as paredes e estruturas de Thais ficam rigorosamente ancoradas em seus tiles reais no mapa, sem ficarem deslocadas 32px para baixo/direita.

3. **Velocidade Urbana Dobrada (2.0x / +100% de Velocidade Base):**
   - `cityStepDurationMs = Math.round(baseStepDurationMs / 2.0)`
   - No Level 1: 275ms por passo.
   - No Level 20: 250ms por passo.
   - No Level 50: 200ms por passo.
   - Proporciona locomoção extremamente rápida e fluida pelas ruas de Thais.

4. **Resposta Instantânea do Teclado (0ms de Latência):**
   - Implementado gerenciador de direção contínua (`heldDirectionRef`) no `GamePrototype.tsx`.
   - **0ms de atraso no primeiro toque:** No momento exato em que o jogador pressiona uma setinha ou tecla WASD, o personagem dá o passo imediatamente.
   - **Caminhada contínua ininterrupta:** Um intervalo dedicado executa passos contínuos na velocidade rápida da cidade enquanto a tecla for mantida pressionada, eliminando totalmente a pausa de repetição de ~400ms do sistema operacional.
   - **Parada e troca de direção imediatas:** Ao soltar a tecla (`keyup`) ou mudar de direção, a resposta é imediata e precisa.

---

## 🧪 Verificação e Testes

- **Testes Automatizados (Vitest):**
  - Nova suite: `tests/phase39-mapaserver-otbm-instant-keyboard-double-city-speed.test.ts`.
  - **34 arquivos de teste passando (100%).**
  - **226 de 226 testes aprovados.**
- **Tipagem Estrita (TypeScript):**
  - `npm run typecheck` executado com **0 erros**.
