# CORREÇÕES

## Concluído na Phase 218:
- [x] **Regeneração Base RubinOT (sem exigência de comida):** Normal a cada 4s (Knight +20 HP/+5 MP, Paladin +10 HP/+10 MP, Mage +5 HP/+20 MP) e Promovida a cada 3s (Elite Knight +20 HP/+5 MP, Royal Paladin +10 HP/+10 MP, MS/ED +5 HP/+20 MP) em combate e na cidade.
- [x] **Regeneração Independente por Anéis (6s ticks):** Life Ring (+2 HP / +8 MP a cada 6s) e Ring of Healing (+6 HP / +24 MP a cada 6s) no slot de anel (`ring`).
- [x] **Slot de Anel no Paperdoll & Sincronização:** Slot `ring` integrado em `InventoryWindow`, `SlotSilhouette`, `characterHydration`, sincronização via Colyseus WebSocket e suíte de testes dedicada.

---


No RubinOT, a regeneração base depende da vocação e se ela está promovida. Segundo a página oficial do servidor:

Vocação	Normal	Promovida
Knight	+20 HP / +5 MP a cada 4s	+20 HP / +5 MP a cada 3s
Paladin	+10 HP / +10 MP a cada 4s	+10 HP / +10 MP a cada 3s
Sorcerer	+5 HP / +20 MP a cada 4s	+5 HP / +20 MP a cada 3s
Druid	+5 HP / +20 MP a cada 4s	+5 HP / +20 MP a cada 3s
Monk	+8 HP / +10 MP a cada 4s	+8 HP / +10 MP a cada 3s

Em 1 minuto, por exemplo, um Elite Knight regenera naturalmente aproximadamente 400 HP e 100 mana, porque são 20 ticks de 3 segundos.

Um Master Sorcerer/Elder Druid fica em aproximadamente 100 HP e 400 mana/minuto.

Item	HP	Mana	Por minuto	Duração	Total
Life Ring	+2 HP / 6s	+8 MP / 6s	20 HP + 80 MP	20 min	400 HP + 1.600 MP
Ring of Healing	+6 HP / 6s	+24 MP / 6s	60 HP + 240 MP	7min30s	450 HP + 1.800 MP

Então o Ring of Healing é exatamente 3× mais rápido que o Life Ring, só que dura bem menos.

Para implementar no seu idle sem comida, eu manteria justamente o efeito independente:

Life Ring: +2 HP / +8 MP a cada 6 segundos
Ring of Healing: +6 HP / +24 MP a cada 6 segundos

Isso funciona especialmente bem porque não precisa existir aquela regra do Tibia de estar alimentado para regenerar. O anel simplesmente gera regeneração enquanto estiver equipado.

E tem uma coisa interessante para o Exura: eu não transformaria isso em regeneração por segundo visualmente. Manteria o tick de 6 segundos, porque dá muito mais aquela sensação de Tibia: +8, +8, +8 aparecendo periodicamente em vez da mana subindo continuamente.