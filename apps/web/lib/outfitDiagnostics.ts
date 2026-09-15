/**
 * Sistema de Diagnóstico Autônomo e Telemetria para Troca de Aparência (Outfit/Mount/Addons)
 * Registra cada tentativa com um attemptId único para correlacionar:
 * 1. Aparência inicial
 * 2. Seleção do usuário
 * 3. Preparação e download de assets (duração e faltantes)
 * 4. Desenho efetivo no preview
 * 5. Fluxo de salvamento (callback, rede, API, resposta)
 * 6. Estado final no personagem (React) e renderizador (PIXI)
 * 7. Erros de JavaScript
 * 8. Primeira divergência detectada
 */

export const CURRENT_CLIENT_COMMIT =
  (typeof window !== 'undefined' && (window as any).__GIT_COMMIT__) ||
  process.env.NEXT_PUBLIC_GIT_COMMIT ||
  'ce72a9b46';

export interface OutfitAttemptLog {
  attemptId: string;
  clientCommit: string;
  startedAt: number;
  completedAt?: number;
  initial: {
    characterId?: string;
    characterName?: string;
    outfit?: string;
    mount?: string;
    mountActive?: boolean;
    addons?: number;
    colors?: { head: number; primary: number; secondary: number; detail: number };
    arenaActiveSig?: string;
  };
  selection: {
    outfit?: string;
    mount?: string;
    mountActive?: boolean;
    addons?: number;
    colors?: { head: number; primary: number; secondary: number; detail: number };
    direction?: string;
  };
  preparation: {
    status: 'idle' | 'preparing' | 'ready' | 'failed';
    durationMs: number;
    success?: boolean;
    missingAssets: string[];
    missingFrames?: string[];
    cachedFramesCount: number;
    totalFramesRequested: number;
    attemptsCount?: number;
    attemptsHistory?: Array<{
      attempt: number;
      durationMs: number;
      missingAssets: string[];
      missingFrames: string[];
      success: boolean;
      timestamp: number;
    }>;
  };
  preview: {
    hasCanvas: boolean;
    width: number;
    height: number;
    dataUrlLen: number;
    lastDrawnKey?: string;
    isDefinitive?: boolean;
  };
  save: {
    buttonClicked: boolean;
    buttonClickedAt?: number;
    callbackFired: boolean;
    callbackPayload?: any;
    networkDispatched: boolean;
    apiDispatched: boolean;
    apiResponseStatus?: number;
    apiResponseOk?: boolean;
    apiResponseError?: string;
  };
  arena: {
    reactCharOutfit?: string;
    reactCharMount?: string;
    reactCharMountActive?: boolean;
    reactCharAddons?: number;
    arenaActiveAppearanceSig?: string;
    arenaPendingAppearanceSig?: string;
    arenaAppearanceStatus?: string;
    pixiTextureKey?: string;
    isMatchWithSelection?: boolean;
  };
  jsErrors: string[];
  divergences: string[];
}

class OutfitDiagnosticsManager {
  private currentAttempt: OutfitAttemptLog | null = null;
  private history: OutfitAttemptLog[] = [];
  private capturedErrors: string[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (ev) => {
        const msg = `${ev.message} at ${ev.filename}:${ev.lineno}`;
        this.capturedErrors.push(msg);
        if (this.currentAttempt) {
          this.currentAttempt.jsErrors.push(msg);
        }
      });
      window.addEventListener('unhandledrejection', (ev) => {
        const reason = ev.reason?.message || String(ev.reason);
        const msg = `UnhandledRejection: ${reason}`;
        this.capturedErrors.push(msg);
        if (this.currentAttempt) {
          this.currentAttempt.jsErrors.push(msg);
        }
      });
    }
  }

  startAttempt(initialData: OutfitAttemptLog['initial']): string {
    const attemptId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.currentAttempt = {
      attemptId,
      clientCommit: CURRENT_CLIENT_COMMIT,
      startedAt: Date.now(),
      initial: { ...initialData },
      selection: {},
      preparation: {
        status: 'idle',
        durationMs: 0,
        missingAssets: [],
        cachedFramesCount: 0,
        totalFramesRequested: 0,
      },
      preview: {
        hasCanvas: false,
        width: 0,
        height: 0,
        dataUrlLen: 0,
      },
      save: {
        buttonClicked: false,
        callbackFired: false,
        networkDispatched: false,
        apiDispatched: false,
      },
      arena: {},
      jsErrors: [...this.capturedErrors],
      divergences: [],
    };
    return attemptId;
  }

  updateSelection(selection: OutfitAttemptLog['selection']): void {
    if (!this.currentAttempt) return;
    this.currentAttempt.selection = { ...this.currentAttempt.selection, ...selection };
    this.detectDivergence();
  }

  recordPreparation(prep: Partial<OutfitAttemptLog['preparation']>): void {
    if (!this.currentAttempt) return;
    const current = this.currentAttempt.preparation;
    const attemptsCount = prep.attemptsCount ?? current.attemptsCount ?? 1;

    let attemptsHistory = current.attemptsHistory ? [...current.attemptsHistory] : [];
    if (prep.status === 'failed' || prep.status === 'ready' || prep.success !== undefined) {
      attemptsHistory.push({
        attempt: attemptsCount,
        durationMs: prep.durationMs ?? current.durationMs ?? 0,
        missingAssets: prep.missingAssets || current.missingAssets || [],
        missingFrames: prep.missingFrames || current.missingFrames || [],
        success: Boolean(prep.success),
        timestamp: Date.now(),
      });
      if (attemptsHistory.length > 10) attemptsHistory.shift();
    }

    this.currentAttempt.preparation = {
      ...current,
      ...prep,
      attemptsCount,
      attemptsHistory,
    };
    this.detectDivergence();
  }

  recordPreview(preview: Partial<OutfitAttemptLog['preview']>): void {
    if (!this.currentAttempt) return;
    this.currentAttempt.preview = { ...this.currentAttempt.preview, ...preview };
    this.detectDivergence();
  }

  recordSaveClick(): void {
    if (!this.currentAttempt) return;
    this.currentAttempt.save.buttonClicked = true;
    this.currentAttempt.save.buttonClickedAt = Date.now();
  }

  recordSaveCallback(payload: any): void {
    if (!this.currentAttempt) return;
    this.currentAttempt.save.callbackFired = true;
    // Strip sensitive fields
    const safePayload = { ...payload };
    delete safePayload.password;
    delete safePayload.token;
    delete safePayload.email;
    this.currentAttempt.save.callbackPayload = safePayload;
  }

  recordNetworkDispatch(): void {
    if (!this.currentAttempt) return;
    this.currentAttempt.save.networkDispatched = true;
  }

  recordApiSave(status: number, ok: boolean, error?: string): void {
    if (!this.currentAttempt) return;
    // Do not associate background autosaves if save was neither clicked nor fired in this attempt
    if (!this.currentAttempt.save.buttonClicked && !this.currentAttempt.save.callbackFired) {
      return;
    }
    this.currentAttempt.save.apiDispatched = true;
    this.currentAttempt.save.apiResponseStatus = status;
    this.currentAttempt.save.apiResponseOk = ok;
    if (error) this.currentAttempt.save.apiResponseError = error;
    this.detectDivergence();
  }

  recordArenaState(arena: Partial<OutfitAttemptLog['arena']>): void {
    if (!this.currentAttempt) return;
    this.currentAttempt.arena = { ...this.currentAttempt.arena, ...arena };
    this.detectDivergence();
  }

  recordJsError(err: string): void {
    if (!this.currentAttempt) return;
    this.currentAttempt.jsErrors.push(err);
  }

  private detectDivergence(): void {
    if (!this.currentAttempt) return;
    const a = this.currentAttempt;
    const div: string[] = [];

    // 1. Checar se a preparação de recursos falhou
    if (a.preparation.status === 'failed') {
      const parts: string[] = [];
      if (a.preparation.missingFrames && a.preparation.missingFrames.length > 0) {
        parts.push(`frames: [${a.preparation.missingFrames.join(', ')}]`);
      }
      if (a.preparation.missingAssets && a.preparation.missingAssets.length > 0) {
        parts.push(`assets: [${a.preparation.missingAssets.slice(0, 5).join(', ')}]`);
      }
      div.push(`PREPARAÇÃO_FALHOU: ${parts.join(' | ') || 'assets pendentes'} (tentativa ${a.preparation.attemptsCount || 1})`);
    }

    // 2. Checar se o preview desenhou algo divergente da seleção
    if (a.preview.lastDrawnKey && a.selection.outfit) {
      const expectedOutfit = a.selection.outfit.toLowerCase();
      if (!a.preview.lastDrawnKey.toLowerCase().includes(expectedOutfit)) {
        div.push(`PREVIEW_DIVERGENTE: esperado traje "${expectedOutfit}", desenhado chave "${a.preview.lastDrawnKey}"`);
      }
      if (a.selection.mountActive && a.selection.mount && a.selection.mount !== 'none') {
        const expectedMount = a.selection.mount.toLowerCase();
        if (!a.preview.lastDrawnKey.toLowerCase().includes(expectedMount)) {
          div.push(`PREVIEW_DIVERGENTE_MONTARIA: esperado montaria "${expectedMount}", chave "${a.preview.lastDrawnKey}"`);
        }
      }
    }

    // 3. Checar fluxo de salvamento:
    if (a.save.buttonClicked && !a.save.callbackFired) {
      div.push('SAVE_CALLBACK_NAO_DISPAROU: botão clicado mas onSave não executou');
    }

    if (a.save.callbackFired && a.save.callbackPayload && a.selection.outfit) {
      if (a.save.callbackPayload.outfit && a.save.callbackPayload.outfit !== a.selection.outfit) {
        div.push(`SAVE_DIVERGENTE_OUTFIT: selecionado "${a.selection.outfit}", enviado no save "${a.save.callbackPayload.outfit}"`);
      }
      if (a.selection.mount && a.save.callbackPayload.mount !== a.selection.mount) {
        div.push(`SAVE_DIVERGENTE_MOUNT: selecionado "${a.selection.mount}", enviado no save "${a.save.callbackPayload.mount}"`);
      }
    }

    // 4. Distinção estrita: antes de Salvar, seleção diferente do personagem NÃO é divergência (é navegação normal).
    // Se o save foi disparado, o personagem DEVE refletir a seleção salva.
    if (a.save.callbackFired && a.save.callbackPayload) {
      const expected = a.save.callbackPayload;
      if (a.arena.reactCharOutfit && a.arena.reactCharOutfit !== expected.outfit) {
        div.push(`ARENA_REACT_DIVERGENTE: char.outfit="${a.arena.reactCharOutfit}", esperado="${expected.outfit}"`);
      }
      if (a.arena.reactCharMount && a.arena.reactCharMount !== expected.mount) {
        div.push(`ARENA_REACT_MOUNT_DIVERGENTE: char.mount="${a.arena.reactCharMount}", esperado="${expected.mount}"`);
      }
    }

    // 5. Detectar se há aparência salva no personagem que o renderizador na arena não conseguiu assumir
    const activeSavedOutfit = (a.save.callbackFired && a.save.callbackPayload?.outfit) || a.arena.reactCharOutfit;
    if (activeSavedOutfit && a.arena.arenaActiveAppearanceSig) {
      const activeSigLower = a.arena.arenaActiveAppearanceSig.toLowerCase();
      const savedOutfitLower = activeSavedOutfit.toLowerCase();
      if (!activeSigLower.includes(savedOutfitLower)) {
        div.push(
          `APARENCIA_SALVA_NAO_ASSUMIDA_PELO_RENDERIZADOR: Personagem possui traje salvo "${activeSavedOutfit}", mas arena continua exibindo "${a.arena.arenaActiveAppearanceSig}" (status: "${a.arena.arenaAppearanceStatus || a.preparation.status}", pendente: "${a.arena.arenaPendingAppearanceSig || 'nenhum'}")`
        );
      }
    }

    a.divergences = div;
    if (a.arena.reactCharOutfit && a.selection.outfit) {
      a.arena.isMatchWithSelection = a.save.callbackFired
        ? div.length === 0
        : !div.some((d) => d.startsWith('PREVIEW_DIVERGENTE'));
    }
  }

  endAttempt(): OutfitAttemptLog | null {
    if (!this.currentAttempt) return null;
    this.currentAttempt.completedAt = Date.now();
    this.detectDivergence();
    const finished = { ...this.currentAttempt };
    this.history.push(finished);
    if (this.history.length > 20) this.history.shift();
    return finished;
  }

  getCurrentAttempt(): OutfitAttemptLog | null {
    return this.currentAttempt;
  }

  getLatestReport(): OutfitAttemptLog | null {
    return this.currentAttempt || this.history[this.history.length - 1] || null;
  }

  getAllReports(): OutfitAttemptLog[] {
    return [...this.history, ...(this.currentAttempt ? [this.currentAttempt] : [])];
  }

  copyReportToClipboard(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    const report = this.getLatestReport();
    if (!report) return false;
    const json = JSON.stringify(report, null, 2);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(json).catch(() => {});
      return true;
    }
    return false;
  }
}

export const outfitDiagnostics = new OutfitDiagnosticsManager();

// Expor globalmente na janela do navegador para fácil inspeção em DevTools
if (typeof window !== 'undefined') {
  (window as any).__outfitDiag = outfitDiagnostics;
  (window as any).__getOutfitReport = () => outfitDiagnostics.getLatestReport();
  (window as any).__copyOutfitReport = () => outfitDiagnostics.copyReportToClipboard();
}
