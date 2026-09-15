# Resumo da Fase 177: Stages de EXP e Skills, Bônus de Stamina Verde, Visibilidade de [GOD] Local e Alinhamento de Addons Montados

## 🎯 Objetivo Concluído
Implementação completa dos requisitos estabelecidos em `FIX.md`:
1. **[GOD] Local e Remoto**: Visibilidade do título administrativo `[GOD]` para o próprio jogador administrador no avatar, na barra superior (`TopNavigation`), na dock bar (`WindowDockBar`), e acima da cabeça no mapa/arena (`PixiArena`), mantendo o nome do personagem inalterado no banco de dados.
2. **Addons Montados Alinhados**: Eliminação do fallback incorreto em `apps/web/lib/outfitRecolor.ts` que substituía `-mount-addon` por `-addon` (versão a pé ereta). Implementado fallback seguro preservando o contexto montado (`f0` montado) para garantir encaixe anatômico perfeito na sela.
3. **Stages de EXP por Nível**: Tabela canônica de 1–8 (50×) até 1401+ (1.2×) em `packages/domain/src/progressionStages.ts`, integrado ao combate solo e de party.
4. **Stages de Skills Físicas e Magic Level**: Skills 1–80 (10×) até 121+ (2×); Magic level 0–80 (10×) até 131+ (2×). Cálculo fracionário preciso na travessia de faixas com aplicação da nova taxa sobre o excedente sem alterar custo real de mana das magias.
5. **Bônus de Stamina Verde (+50% EXP)**: Stamina oficial de 42 horas (2520 minutos), com as primeiras 3 horas (>= 2340 minutos) concedendo +50% de experiência (exemplo do nível 300: 15× normal, 22.5× verde). Indicador visual dinâmico em `StaminaBar.tsx` e `WindowDockBar.tsx`.
6. **Party & Segurança**: Divisão da experiência base entre membros da party, aplicando a cada integrante seu próprio stage de nível e stamina individual. Rate limiter atualizado em `packages/auth/src/xpRateLimiter.ts` para tolerar multiplicadores de até 120× sem falsos positivos.

---

## 📁 Arquivos Modificados / Criados
- `packages/domain/src/progressionStages.ts`: Novo módulo canônico de estágios de progressão, helpers de cálculo e transição de faixas de skill.
- `packages/domain/src/stamina.ts`: Atualização para capacidade oficial de 42h (2520m) e limiar verde de 39h (2340m).
- `packages/domain/src/combat.ts`: Integração de estágios de EXP individual e stamina na party, e treino de magic level e combate com estágios.
- `packages/domain/src/training.ts`: Integração de treino em dummies com transição suave de faixas de estágio e estimativa de tempo.
- `packages/domain/src/index.ts`: Exportação dos novos tipos e funções de estágios.
- `packages/auth/src/xpRateLimiter.ts`: Ajuste de capacidade de vazão para acomodar picos legítimos de 120× de EXP.
- `apps/web/components/WindowDockBar.tsx`: Exibição do título `[GOD]` e badge com multiplicador efetivo de EXP atual (incluindo status Verde).
- `apps/web/components/TopNavigation.tsx`: Prop e exibição de título `[GOD]` dourado no topo.
- `apps/web/components/PixiArena.tsx`: Nameplate de personagem com prefixo `[GOD]` dourado (`0xffd700`).
- `apps/web/components/StaminaBar.tsx`: Badge `🟢 +50% EXP` quando em stamina verde.
- `apps/web/lib/outfitRecolor.ts`: Correção do fallback de addons montados.
- `tests/phase177-stages-god-title-and-mounted-addons.test.ts`: Suíte de testes automatizados com 100% de aprovação.

---

## 🧪 Verificação e Testes
- **Vitest**: `tests/phase177-stages-god-title-and-mounted-addons.test.ts` (8 testes aprovados).
- **TypeScript**: `npm run typecheck` com 0 erros.
- **Segurança**: Testado com party de níveis e staminas diferentes, preservando a ausência de retroatividade no banco de dados.
