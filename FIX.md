# CORREÇÕES [FASE 190 - CONCLUÍDO]

- [x] 1 - Retirar aquele "clique para entrar mais rapido no loading" quando a pessoa clicar não deve acontecer nada, o loading tem que terminar por completo.
  - *Resolução*: Removido texto de instrução, listeners de tecla (Space, Enter, Escape) e bypass por clique em `ExuraLoadingScreen.tsx`. A tela agora aguarda o carregamento determinístico total dos assets e mapa.

- [x] 2 - Vamos implementar o sistema de blessing, aquele botão de blessings vai para um menu onde você pode comprar bênçãos, as regras delas estão abaixo:
  - Estado: Sem blessings -> 0% de redução, 10% de chance de perder cada item equipado.
  - Estado: Com as 5 -> 40% de redução (herói sofre 60% da perda normal de XP, skills e Magic Level), 0% de chance de perder itens equipados.
  - Cada morte consome 100% das blessings que o herói possuir.
  - Nomes canônicos implementados:
    1. *The Wisdom of Solitude*
    2. *The Spark of the Phoenix*
    3. *The Fire of the Suns*
    4. *The Spiritual Shielding*
    5. *The Embrace of Tibia*
  - Compra individual (51.800 gp cada) e botão "Abençoar tudo (X gp)" comprando apenas as faltantes.
  - Exibição em tempo real do saldo em gp do jogador, proteção atual e bênçãos ativas com insígnias em pergaminhos antigos.
  - Persistência permanente no banco Prisma DB (`blessingsJson`) com sincronização entre sessões e reconexão.
  - Tela de morte modernizada (`DeathModal.tsx`): Exibe quem matou o personagem, experiência e níveis perdidos, card de consumo das bênçãos (`Suas X blessings foram consumidas`), detalhes expansíveis e botão `Reviver` retornando com o estado devidamente persistido.

- [x] 3 - Correção de magias (Exori Hur / Whirlwind Throw):
  - *Resolução*: Corrigido `isDirectionalSpell()` em `packages/domain/src/spells.ts` com whitelist estrita de magias direcionais de mago/druida. `exori hur` e `utani hur` não são mais tratados como ondas de área, e o servidor dispara projétil de arma com alcance 5.