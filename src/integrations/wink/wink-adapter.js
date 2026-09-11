const EMPTY_LEADERBOARD = Object.freeze({ entries: [], me: null, total: 0 });

function createCapabilityError(capability) {
  const error = new Error(`Wink capability is unavailable: ${capability}`);
  error.code = "CAPABILITY_DENIED";
  return error;
}

function readErrorCode(error) {
  return error && typeof error === "object" && "code" in error
    ? String(error.code)
    : "UNKNOWN";
}

function newRoundId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const random = Math.random().toString(16).slice(2, 10);
  return `round-${Date.now().toString(16)}-${random}`;
}

function normalizeScoreInput(input) {
  const value = typeof input === "number" ? { score: input } : { ...input };
  value.score = Math.max(0, Math.floor(Number(value.score) || 0));
  if (value.playTime !== undefined) {
    value.playTime = Math.max(0, Math.floor(Number(value.playTime) || 0));
  }
  if (value.counter !== undefined) {
    value.counter = Math.max(0, Math.floor(Number(value.counter) || 0));
  }
  return value;
}

export class WinkGameIntegration {
  #sdk = null;
  #ready;
  #destroyed = false;
  #completedRounds = new Set();
  #scoreAttemptedRounds = new Set();
  #activeRoundId = null;
  #disposers = [];
  #observers = new Set();
  #cachedPersonalBest = null;
  #state = {
    phase: "booting",
    status: "connecting",
    locale: "en",
    player: null,
    capabilities: {
      getLeaderboard: false,
      submitScore: false,
      complete: false,
    },
    lifecycle: { paused: false, muted: false },
    error: null,
  };

  constructor() {
    this.#ready = this.#initialize();
    void this.#ready.then((sdk) => {
      if (sdk?.can?.("getLeaderboard")) {
        void this.getPersonalBest();
      }
    });
  }

  async #initialize() {
    const sdkLoader = globalThis.window?.Wink;
    if (!sdkLoader?.init) {
      this.#setStandalone("SDK_UNAVAILABLE");
      return null;
    }

    try {
      const sdk = await sdkLoader.init();
      if (this.#destroyed) {
        sdk?.destroy?.();
        return null;
      }

      this.#sdk = sdk;
      this.#state = this.#readSdkState();
      this.#subscribeToSdkEvents();
      this.#notify();
      return sdk;
    } catch (error) {
      console.warn("[Wink SDK] init failed", readErrorCode(error));
      this.#setStandalone(readErrorCode(error));
      return null;
    }
  }

  #readSdkState() {
    const sdk = this.#sdk;
    const status = sdk?.status || "standalone";
    const capabilities = {
      getLeaderboard: Boolean(sdk?.can?.("getLeaderboard")),
      submitScore: Boolean(sdk?.can?.("submitScore")),
      complete: Boolean(sdk?.can?.("complete")),
    };
    const authenticated = Boolean(sdk?.player && capabilities.submitScore);

    return {
      ...this.#state,
      phase:
        status === "connecting"
          ? "booting"
          : authenticated
            ? "ready_authenticated"
            : "ready_anonymous",
      status,
      locale: sdk?.locale || this.#state.locale || "en",
      player: sdk?.player || null,
      capabilities,
      lifecycle: {
        ...this.#state.lifecycle,
        muted: Boolean(sdk?.muted),
      },
      error: null,
    };
  }

  #setStandalone(errorCode = null) {
    this.#state = {
      ...this.#state,
      phase: "ready_anonymous",
      status: "standalone",
      error: errorCode ? { code: errorCode } : null,
    };
    this.#notify();
  }

  #subscribeToSdkEvents() {
    const sdk = this.#sdk;
    if (!sdk?.on) return;

    const register = (event, listener) => {
      try {
        const off = sdk.on(event, listener);
        if (typeof off === "function") this.#disposers.push(off);
      } catch (error) {
        console.warn(
          `[Wink SDK] ${event} listener failed`,
          readErrorCode(error),
        );
      }
    };

    register("pause", () => {
      this.#state.lifecycle.paused = true;
      this.#notify();
    });
    register("resume", () => {
      this.#state.lifecycle.paused = false;
      this.#notify();
    });
    register("mute", () => {
      this.#state.lifecycle.muted = true;
      this.#notify();
    });
    register("unmute", () => {
      this.#state.lifecycle.muted = false;
      this.#notify();
    });
    register("locale", (locale) => {
      this.#state.locale = String(locale || sdk.locale || "en");
      this.#notify();
    });
  }

  #notify() {
    for (const observer of this.#observers) {
      try {
        observer(this.#state);
      } catch (error) {
        console.warn("[Wink SDK] state observer failed", readErrorCode(error));
      }
    }
  }

  startRound() {
    const round = Object.freeze({
      roundId: newRoundId(),
      startedAtMs: Date.now(),
    });
    this.#activeRoundId = round.roundId;
    void this.#ready.then((sdk) => sdk?.gameplayStart?.());
    return round;
  }

  completeRound(round) {
    if (!round?.roundId || this.#completedRounds.has(round.roundId))
      return false;
    this.#completedRounds.add(round.roundId);
    void this.#ready.then((sdk) => sdk?.gameplayStop?.());
    return true;
  }

  async submitFinalScore(input) {
    const roundId = this.#activeRoundId;
    if (roundId && this.#scoreAttemptedRounds.has(roundId)) {
      return { duplicate: true };
    }
    if (roundId) this.#scoreAttemptedRounds.add(roundId);
    const sdk = await this.#ready;
    if (!sdk?.can?.("submitScore")) throw createCapabilityError("submitScore");

    try {
      const result = await sdk.submitScore(normalizeScoreInput(input));
      if (result?.entry) this.#cachedPersonalBest = result.entry;
      return result;
    } catch (error) {
      console.warn("[Wink SDK] score submission failed", readErrorCode(error));
      throw error;
    }
  }

  async refreshLeaderboard(options = {}) {
    const sdk = await this.#ready;
    if (!sdk?.can?.("getLeaderboard")) return { ...EMPTY_LEADERBOARD };

    try {
      const result = await sdk.getLeaderboard(options);
      if (result?.me) this.#cachedPersonalBest = result.me;
      return result || { ...EMPTY_LEADERBOARD };
    } catch (error) {
      console.warn("[Wink SDK] leaderboard unavailable", readErrorCode(error));
      return { ...EMPTY_LEADERBOARD };
    }
  }

  async getPersonalBest() {
    const sdk = await this.#ready;
    if (!sdk?.getPersonalBest) return { me: null };

    try {
      const result = await sdk.getPersonalBest();
      if (result?.me) this.#cachedPersonalBest = result.me;
      return result || { me: null };
    } catch (error) {
      console.warn(
        "[Wink SDK] personal best unavailable",
        readErrorCode(error),
      );
      return { me: null };
    }
  }

  get personalBest() {
    return this.#cachedPersonalBest;
  }

  get capabilities() {
    return this.#state.capabilities;
  }

  get state() {
    return this.#state;
  }

  get canSubmitScore() {
    return this.capabilities.submitScore;
  }

  get isReady() {
    return (
      this.#state.phase === "ready_anonymous" ||
      this.#state.phase === "ready_authenticated"
    );
  }

  get isAuthenticated() {
    return this.#state.phase === "ready_authenticated";
  }

  observe(listener) {
    this.#observers.add(listener);
    listener(this.#state);
    const stop = () => this.#observers.delete(listener);
    this.#disposers.push(stop);
    return stop;
  }

  bindLifecycle(handlers = {}) {
    let active = true;
    const stops = [];

    void this.#ready.then((sdk) => {
      if (!active || !sdk?.on) return;
      const register = (event, listener) => {
        if (!listener) return;
        const off = sdk.on(event, listener);
        if (typeof off === "function") stops.push(off);
      };
      register("pause", handlers.onPause);
      register("resume", handlers.onResume);
      register("mute", handlers.onMute);
      register("unmute", handlers.onUnmute);
      register("locale", handlers.onLocale);

      if (sdk.muted) handlers.onMute?.();
      else handlers.onUnmute?.();
      handlers.onLocale?.(sdk.locale);
    });

    const stopAll = () => {
      active = false;
      for (const stop of stops.splice(0)) stop();
    };
    this.#disposers.push(stopAll);
    return stopAll;
  }

  dispose() {
    this.#destroyed = true;
    for (const stop of this.#disposers.splice(0)) stop();
    this.#observers.clear();
    this.#completedRounds.clear();
    this.#scoreAttemptedRounds.clear();
    this.#activeRoundId = null;
    this.#sdk?.destroy?.();
    this.#sdk = null;
  }
}

export const winkGame = new WinkGameIntegration();

if (import.meta.hot) {
  import.meta.hot.dispose(() => winkGame.dispose());
}
