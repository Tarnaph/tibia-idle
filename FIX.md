# Correções Concluídas

- [x] A estética de quando o personagem fala agora é idêntica ao print do Tibia 11:
  - Formato com quebra de linha: `[PlayerName] says:\n[mensagem]` (ex: `Laron says:\nteste`).
  - Fonte com kerning e tipografia autêntica (`Verdana, Tahoma, Arial, sans-serif`, `fontSize: 8.5`, `lineHeight: 11`, `fontWeight: 700`).
  - Contorno preto sólido (`stroke: 0x000000, width: 2.5`) e preenchimento amarelo autêntico (`0xffff00`) para Local Chat e ciano/azul (`0x55ffff`) para World Chat.
  - Alinhamento centralizado com âncora vertical na base superior do nameplate do personagem (`anchor(0.5, 1)`), mantendo a mensagem sempre acima do nome sem sobreposição.