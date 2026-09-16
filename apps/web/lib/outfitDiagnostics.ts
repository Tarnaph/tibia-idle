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
  'desconhecido';

export interface PreparationManifest {
  totalUrls: number;
  uniqueUrls: number;
  categories: {
    base: number;
    mask: number;
    mount: number;
    addon1: number;
    addon2: number;
  };
  directions: string[];
  frames: number[];
  unmountedBaseCount: number;
}

export interface PreparationResourceState {
  enqueued: number;
  started: number;
  completed: number;
  failed: number;
  inProgress: string[];
  failedDetails: Array<{ url: string; error: string; elapsedMs: number }>;
}

export interface UncompositedFrameDetail {
  frameKey: string;
  direction: string;
  frame: number;
  missingLayers: string[];
}

export interface OutfitAttemptLog {
  attemptId: string;
  clientCommit: string;
  startedAt: number;
  completedAt?: number;
  modalReopened?: boolean;
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
    status: 'idle' | 'preparing' | 'ready' | 'failed' | 'exception';
    durationMs: number;
    success?: boolean;
    startedAt?: number;
    completedAt?: number;
    manifest?: PreparationManifest;
    resources?: PreparationResourceState;
    uncompositedFrames?: UncompositedFrameDetail[];
    missingAssets: string[];
    missingFrames?: string[];
    cachedFramesCount: number;
    totalFramesRequested: number;
    error?: string;
    attemptsCount?: number;
    attemptsHistory?: Array<{
      attempt: number;
      durationMs: number;
      missingAssets: string[];
      missingFrames: string[];
      success: boolean;
      timestamp: number;
      error?: string;
    }>;
  };
  preview: {
    hasCanvas: boolean;
    width: number;
    height: number;
    dataUrlLen: number;
    lastDrawnKey?: string;
    isDefinitive?: boolean;
    matchesSelection?: boolean;
    drawnOutfit?: string;
    drawnMount?: string;
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
    arenaAppearanceStatus?: 'idle' | 'preparing' | 'ready' | 'failed';
    pixiTextureKey?: string;
    appliedAt?: number;
    timeToApplyMs?: number;
    isMatchWithSelection?: boolean;
  };
  atlas?: {
    used: boolean;
    outfitAtlas?: string;
    mountAtlas?: string;
    fallbackPngsInitiated?: boolean;
    error?: string;
  };
  jsErrors: Array<{ message: string; stack?: string; timestamp: number }>;
  divergences: string[];
}

class OutfitDiagnosticsManager {
  private currentAttempt: OutfitAttemptLog | null = null;
  private history: OutfitAttemptLog[] = [];
  private capturedErrors: Array<{ message: string; stack?: string; timestamp: number }> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (ev) => {
        const item = { message: `${ev.message} at ${ev.filename}:${ev.lineno}`, timestamp: Date.now() };
        this.capturedErrors.push(item);
        if (this.currentAttempt) {
          this.currentAttempt.jsErrors.push(item);
        }
      });
      window.addEventListener('unhandledrejection', (ev) => {
        const reason = ev.reason?.message || String(ev.reason);
        const item = { message: `UnhandledRejection: ${reason}`, timestamp: Date.now() };
        this.capturedErrors.push(item);
        if (this.currentAttempt) {
          this.currentAttempt.jsErrors.push(item);
        }
      });
    }
  }

  public getTargetAttempt(attemptId?: string): OutfitAttemptLog | null {
    if (attemptId) {
      if (this.currentAttempt && this.currentAttempt.attemptId === attemptId) {
        return this.currentAttempt;
      }
      const inHistory = this.history.find((a) => a.attemptId === attemptId);
      if (inHistory) {
        return inHistory;
      }
      return null;
    }
    return this.currentAttempt;
  }

  startAttempt(initialData: OutfitAttemptLog['initial'], isReopen: boolean = false): string {
    // Preserve existing attempt in history so re-opening modal does not erase past attempt or save records
    if (this.currentAttempt) {
      const isPrepInProgress = this.currentAttempt.preparation.status === 'preparing';
      const isSaveInProgress = this.currentAttempt.save.buttonClicked && !this.currentAttempt.save.apiDispatched;
      // Guarantee: moving an attempt to history does NOT mark it as completed if preparation or save is still in progress
      if (!isPrepInProgress && !isSaveInProgress && !this.currentAttempt.completedAt) {
        this.currentAttempt.completedAt = Date.now();
      }
      this.detectDivergence(this.currentAttempt);
      this.history.push(this.currentAttempt);
      if (this.history.length > 25) this.history.shift();
    }

    const attemptId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.currentAttempt = {
      attemptId,
      clientCommit: CURRENT_CLIENT_COMMIT,
      startedAt: Date.now(),
      modalReopened: isReopen,
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

  updateSelection(selection: OutfitAttemptLog['selection'], attemptId?: string): void {
    const target = this.getTargetAttempt(attemptId);
    if (!target) return;
    target.selection = { ...target.selection, ...selection };
    this.detectDivergence(target);
  }

  recordPreparation(prep: Partial<OutfitAttemptLog['preparation']>, attemptId?: string): void {
    const target = this.getTargetAttempt(attemptId);
    if (!target) return;
    const current = target.preparation;
    const attemptsCount = prep.attemptsCount ?? current.attemptsCount ?? 1;

    let attemptsHistory = current.attemptsHistory ? [...current.attemptsHistory] : [];
    if (prep.status === 'failed' || prep.status === 'ready' || prep.status === 'exception' || prep.success !== undefined) {
      attemptsHistory.push({
        attempt: attemptsCount,
        durationMs: prep.durationMs ?? current.durationMs ?? 0,
        missingAssets: prep.missingAssets || current.missingAssets || [],
        missingFrames: prep.missingFrames || current.missingFrames || [],
        success: Boolean(prep.success),
        timestamp: Date.now(),
        error: prep.error,
      });
      if (attemptsHistory.length > 10) attemptsHistory.shift();
    }

    target.preparation = {
      ...current,
      ...prep,
      manifest: prep.manifest || current.manifest,
      resources: prep.resources || current.resources,
      uncompositedFrames: prep.uncompositedFrames || current.uncompositedFrames,
      attemptsCount,
      attemptsHistory,
    };

    // If preparation settled (ready/failed/exception) and save is not pending API response, settle completedAt if needed
    if (target.preparation.status === 'ready' || target.preparation.status === 'failed' || target.preparation.status === 'exception') {
      const isSaveInProgress = target.save.buttonClicked && !target.save.apiDispatched;
      if (!isSaveInProgress && !target.completedAt) {
        target.completedAt = Date.now();
      }
    }

    this.detectDivergence(target);
  }

  recordPreview(preview: Partial<OutfitAttemptLog['preview']>, attemptId?: string): void {
    const target = this.getTargetAttempt(attemptId);
    if (!target) return;
    target.preview = { ...target.preview, ...preview };
    this.detectDivergence(target);
  }

  recordSaveClick(attemptId?: string): void {
    const target = this.getTargetAttempt(attemptId);
    if (!target) return;
    target.save.buttonClicked = true;
    target.save.buttonClickedAt = Date.now();
  }

  recordSaveCallback(payload: any, attemptId?: string): void {
    const target = this.getTargetAttempt(attemptId);
    if (!target) return;
    target.save.callbackFired = true;
    // Strip sensitive fields
    const safePayload = { ...payload };
    delete safePayload.password;
    delete safePayload.token;
    delete safePayload.email;
    target.save.callbackPayload = safePayload;
  }

  recordNetworkDispatch(attemptId?: string): void {
    const target = this.getTargetAttempt(attemptId);
    if (!target) return;
    target.save.networkDispatched = true;
  }

  recordApiSave(status: number, ok: boolean, error?: string, attemptId?: string): void {
    const target = this.getTargetAttempt(attemptId) || this.getLastSaveAttempt() || this.currentAttempt;
    if (!target) return;
    // Do not associate background autosaves if save was neither clicked nor fired in this attempt
    if (!target.save.buttonClicked && !target.save.callbackFired) {
      return;
    }
    target.save.apiDispatched = true;
    target.save.apiResponseStatus = status;
    target.save.apiResponseOk = ok;
    if (error) target.save.apiResponseError = error;

    // Check if attempt is settled (save finished and preparation not preparing)
    if (target.preparation.status !== 'preparing' && !target.completedAt) {
      target.completedAt = Date.now();
    }

    this.detectDivergence(target);
  }

  recordArenaState(arena: Partial<OutfitAttemptLog['arena']>, attemptId?: string): void {
    const target = this.getTargetAttempt(attemptId) || (this.currentAttempt?.save.buttonClicked ? this.currentAttempt : this.getLastSaveAttempt()) || this.currentAttempt;
    if (!target) return;
    const isReady = arena.arenaAppearanceStatus === 'ready' || (arena.arenaActiveAppearanceSig && arena.arenaActiveAppearanceSig === target.selection.outfit);
    const appliedAt = arena.appliedAt ?? target.arena.appliedAt ?? (isReady && target.save.buttonClickedAt ? Date.now() : undefined);
    const timeToApplyMs = appliedAt && target.save.buttonClickedAt ? (appliedAt - target.save.buttonClickedAt) : target.arena.timeToApplyMs;
    target.arena = {
      ...target.arena,
      ...arena,
      appliedAt,
      timeToApplyMs,
    };
    this.detectDivergence(target);
  }

  recordJsError(err: string | Error, attemptId?: string): void {
    const target = this.getTargetAttempt(attemptId);
    if (!target) return;
    const item = typeof err === 'string'
      ? { message: err, timestamp: Date.now() }
      : { message: err.message, stack: err.stack, timestamp: Date.now() };
    target.jsErrors.push(item);
  }

  recordAtlasUsage(data: NonNullable<OutfitAttemptLog['atlas']>, attemptId?: string): void {
    const target = this.getTargetAttempt(attemptId) || this.currentAttempt;
    if (!target) return;
    target.atlas = { ...target.atlas, ...data };
    this.detectDivergence(target);
  }

  recordDivergence(divergence: string, attemptId?: string): void {
    const target = this.getTargetAttempt(attemptId) || this.currentAttempt;
    if (!target) return;
    if (!target.divergences) target.divergences = [];
    if (!target.divergences.includes(divergence)) {
      target.divergences.push(divergence);
    }
  }

  private detectDivergence(target?: OutfitAttemptLog): void {
    const a = target || this.currentAttempt;
    if (!a) return;
    const div: string[] = [];

    // 1. Checar se a preparação de recursos falhou ou gerou exceção
    if (a.preparation.status === 'failed' || a.preparation.status === 'exception') {
      const parts: string[] = [];
      if (a.preparation.error) {
        parts.push(`erro: ${a.preparation.error}`);
      }
      if (a.preparation.missingFrames && a.preparation.missingFrames.length > 0) {
        parts.push(`frames: [${a.preparation.missingFrames.join(', ')}]`);
      }
      if (a.preparation.missingAssets && a.preparation.missingAssets.length > 0) {
        parts.push(`assets: [${a.preparation.missingAssets.slice(0, 5).join(', ')}]`);
      }
      if (a.preparation.uncompositedFrames && a.preparation.uncompositedFrames.length > 0) {
        const sample = a.preparation.uncompositedFrames.slice(0, 3).map((f) => `${f.frameKey} (faltam: ${f.missingLayers.join(', ')})`);
        parts.push(`frames_incompletos: [${sample.join('; ')}]`);
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
      if (a.preview.isDefinitive === false && a.preview.hasCanvas) {
        div.push(`PREVIEW_NAO_DEFINITIVO: preview exibido via fallback provisório, texturas definitivas incompletas no cache`);
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
    if (this.history.length > 25) this.history.shift();
    return finished;
  }

  getCurrentAttempt(): OutfitAttemptLog | null {
    return this.currentAttempt;
  }

  getLastSaveAttempt(): OutfitAttemptLog | null {
    if (this.currentAttempt && (this.currentAttempt.save.buttonClicked || this.currentAttempt.save.callbackFired)) {
      return this.currentAttempt;
    }
    for (let i = this.history.length - 1; i >= 0; i--) {
      const a = this.history[i];
      if (a.save.buttonClicked || a.save.callbackFired) {
        return a;
      }
    }
    return null;
  }

  getLatestReport(): OutfitAttemptLog | null {
    return this.currentAttempt || this.history[this.history.length - 1] || null;
  }

  getAllReports(): OutfitAttemptLog[] {
    return [...this.history, ...(this.currentAttempt ? [this.currentAttempt] : [])];
  }

  copyReportToClipboard(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    // Prioritize the actual save attempt if the current attempt has no save action
    const report =
      this.currentAttempt && (this.currentAttempt.save.buttonClicked || this.currentAttempt.save.callbackFired)
        ? this.currentAttempt
        : (this.getLastSaveAttempt() || this.getLatestReport());
    if (!report) return false;
    const json = JSON.stringify(report, null, 2);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(json).catch(() => {});
      return true;
    }
    return false;
  }

  copyLastSaveReportToClipboard(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    const report = this.getLastSaveAttempt() || this.getLatestReport();
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
  (window as any).__getLastSaveReport = () => outfitDiagnostics.getLastSaveAttempt();
  (window as any).__copyLastSaveReport = () => outfitDiagnostics.copyLastSaveReportToClipboard();
}
