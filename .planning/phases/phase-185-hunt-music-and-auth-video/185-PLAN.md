# Phase 185: Trilha Sonora Dinâmica por Hunt, Vídeo songtibia.webm e Sincronização VPS

## Objetivos da Fase
1. **Subir Músicas e Vídeo para a VPS (`187.7.16.210`)**:
   - `songs/songtibia.webm` (140.5 MB) -> `/root/tibia-idle/public/songtibia.webm`
   - Músicas de cada hunt (`.mp3`) para `/root/tibia-idle/public/songs/` e `/root/tibia-idle/songs/`.
2. **Sistema de Trilha Sonora Dinâmica por Hunt (`apps/web/lib/audioManager.ts`)**:
   - Mapear cada hunt ao arquivo de áudio correspondente.
   - Fornecer API para tocar, pausar e interromper música da hunt ativa.
   - Manter compatibilidade com tema de Thais e Dragon's Lair.
3. **Integração no Fluxo de Jogo (`apps/web/components/GamePrototype.tsx`)**:
   - Tocar a música da hunt ao iniciar caçada solo ou em party.
   - Exibir notificação toast da música após a tela de loading.
   - Retornar ao tema de Thais ao sair da caçada.
4. **Validação do Vídeo de Fundo na Seleção de Personagem (`TibiaAuthCharacterModal.tsx`)**:
   - Garantir reprodução fluida de `songtibia.webm`.
5. **Testes e Deploy Online**:
   - Suíte de testes Vitest (`tests/phase185-hunt-music-and-auth-video.test.ts`).
   - Typecheck 100% limpo.
   - Verificação online via HTTP 200.
