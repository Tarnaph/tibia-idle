# Phase 185 Summary: Trilha Sonora Dinâmica por Hunt, Vídeo songtibia.webm e Sincronização VPS

## Entrega Concluída com Sucesso

### 1. Upload e Sincronização dos Arquivos de Mídia na VPS (`187.7.16.210`)
- **Vídeo de Seleção de Personagem**:
  - `songs/songtibia.webm` (140.5 MB) transferido via SFTP para `/root/tibia-idle/public/songtibia.webm` e `/root/tibia-idle/songs/songtibia.webm`.
  - Verificado online via HTTP 200 (`http://187.7.16.210:3000/songtibia.webm`).
- **Músicas de Caçada (MP3)**:
  - Todas as 7 faixas foram enviadas via SFTP para `/root/tibia-idle/public/songs/` e `/root/tibia-idle/songs/` com nomes originais e normalizados (kebab-case).
  - Todas retornam status `HTTP 200 OK` na porta pública 3000.

### 2. Trilha Sonora Dinâmica por Hunt (`apps/web/lib/audioManager.ts`)
- Mapeamento canonical `HUNT_MUSIC_TRACKS` associando o sufixo de cada faixa à sua respectiva caçada:
  - **Rats** (`Beneath the Streets - Rats.mp3`): Hunt `rat-cellars` ("Porões Infestados")
  - **Trolls** (`Drums Under Stone - Trolls.mp3`): Hunt `troll-camp` ("Covil dos Trolls")
  - **Rotworms** (`Underfoot - Rotworms.mp3`): Hunt `rotworm-cave` ("Túneis Escavados")
  - **Skeletons** (`The Dead Remember - Skeletons.mp3`): Hunt `old-crypt` ("Cripta Inquieta")
  - **Spiders** (`Threads in the Dark - Spiders.mp3`): Hunt `spider-burrow` ("Toca Enredada")
  - **Dragons** (`Dragons pride.mp3`): Hunt `dragon-lair` ("Profundezas Chamuscadas")
  - **Thais / Cidade** (`Sunset in the Village.mp3`): Modo Cidade ("Cidade de Thais")
- Funções exportadas: `playHuntBgm(huntId)`, `pauseHuntBgm()`, `stopHuntBgm()`, `getTrackForHunt(huntId)`.
- Pool de áudio e desbloqueio transparente de autoplay de navegadores preservando integridade das fases anteriores.

### 3. Integração Completa com o Jogo (`apps/web/components/GamePrototype.tsx`)
- Ao iniciar uma caçada (`startSelectedHunt` ou sync de party), a música correspondente da hunt começa a tocar imediatamente durante a tela de loading.
- A notificação toast (`MusicTrackToast`) exibe o banner com o título da música e a localização assim que o personagem aparece no mapa da caçada.
- Ao retornar para o Templo de Thais (`exitHunt`), a música da hunt é interrompida e o tema da cidade (`Sunset in the Village`) é restaurado fluidamente.

### 4. Correção e Validação do Vídeo de Seleção (`TibiaAuthCharacterModal.tsx`)
- `BardChromaVideo` configurado com `preload="auto"` e `src="/songtibia.webm"`.
- O canvas processa em tempo real a remoção do fundo (chroma key) e exibe o botão de reprodução/mudo.

### 5. Verificação e Testes
- `tests/phase185-hunt-music-and-auth-video.test.ts`: 7/7 testes aprovados.
- Testes de áudio anteriores (`phase103`, `phase104`, `phase109`, `character-selection`): 25/25 testes aprovados (Total de 32 testes de áudio 100% aprovados).
- `npm run typecheck`: 0 erros de tipagem TypeScript.
- Smoke tests HTTP públicos: 8/8 assets de mídia retornando `HTTP 200 OK` na VPS.
