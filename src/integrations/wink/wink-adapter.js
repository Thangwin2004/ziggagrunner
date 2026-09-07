/**
 * WinkGameIntegration — JS port of client.ts adapter
 *
 * The single Wink adapter for this game. Everything the game needs from the
 * platform goes through here, using only the public window.WinkBridge surface.
 *
 * Rules enforced:
 *   1. One stable round id per semantic round
 *   2. Completion is reported exactly once per round
 *   3. Completion and score submission stay independent
 *   4. Score submission is capability-aware and never silently faked
 */

import {
  complete,
  getCapabilities,
  getLeaderboard,
  getPersonalBest,
  getState,
  onMute,
  onPause,
  onResume,
  onUnmute,
  submitScore,
  subscribe,
} from "./wink-bridge.js";

function newRoundId() {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === "function") {
    return cryptoRef.randomUUID();
  }
  const random = Math.random().toString(16).slice(2, 10);
  return `round-${Date.now().toString(16)}-${random}`;
}

export class WinkGameIntegration {
  /** @type {Set<string>} */
  #completedRounds = new Set();

  /** @type {Array<() => void>} */
  #disposers = [];

  /** @type {object | null} */
  #cachedPersonalBest = null;

  constructor() {
    this.observe((state) => {
      if (state?.phase === "ready_authenticated" && !this.#cachedPersonalBest) {
        this.getPersonalBest().catch(() => {});
      }
    });
  }

  /**
   * Open a new semantic round. Keep the returned handle for the whole round —
   * including through any revive, bonus, or continue step — so completion and
   * score refer to the same round id.
   * @returns {{ roundId: string, startedAtMs: number }}
   */
  startRound() {
    return Object.freeze({
      roundId: newRoundId(),
      startedAtMs: Date.now(),
    });
  }

  /**
   * Report the semantic end of a round. Safe to call more than once: only the
   * first call per round reaches the parent. This never submits a score.
   * @param {{ roundId: string, startedAtMs: number }} round
   * @param {{ playDurationMs?: number, metadata?: object }} [extra]
   * @returns {boolean}
   */
  completeRound(round, extra = {}) {
    if (this.#completedRounds.has(round.roundId)) return false;
    this.#completedRounds.add(round.roundId);

    if (!this.capabilities.complete) return false;

    const { playDurationMs, ...rest } = extra;
    try {
      complete({
        roundId: round.roundId,
        playDurationMs: Math.max(
          0,
          Math.round(playDurationMs ?? Date.now() - round.startedAtMs),
        ),
        ...rest,
      });
    } catch (err) {
      console.warn("[Wink] complete() failed:", err.message);
    }
    return true;
  }

  /**
   * Submit the final qualifying score. Anonymous players get CAPABILITY_DENIED.
   * @param {{ score: number, playTime?: number, gameMode?: string, counter?: number, metadata?: object }} input
   * @returns {Promise<{ entry: object, isNewBest: boolean, previousBest: number|null }>}
   */
  async submitFinalScore(input) {
    const res = await submitScore(input);
    if (res?.entry) {
      this.#cachedPersonalBest = res.entry;
    }
    return res;
  }

  /**
   * Refresh the leaderboard.
   * @param {{ limit?: number, offset?: number }} [options]
   * @returns {Promise<{ entries: Array, total: number, me?: object|null }>}
   */
  async refreshLeaderboard(options) {
    const res = await getLeaderboard(options);
    if (res?.me) {
      this.#cachedPersonalBest = res.me;
    }
    return res;
  }

  /**
   * Get the personal best of current player.
   * @returns {Promise<{ me: object | null }>}
   */
  async getPersonalBest() {
    const res = await getPersonalBest();
    if (res?.me) {
      this.#cachedPersonalBest = res.me;
    }
    return res;
  }

  /** @returns {object | null} */
  get personalBest() {
    return this.#cachedPersonalBest;
  }

  /** @returns {{ getLeaderboard: boolean, submitScore: boolean, complete: boolean }} */
  get capabilities() {
    return getCapabilities();
  }

  /** @returns {object | null} */
  get state() {
    return getState();
  }

  /** True when the current identity may persist a score. */
  get canSubmitScore() {
    return this.capabilities.submitScore === true;
  }

  /** True when bridge is ready (anonymous or authenticated). */
  get isReady() {
    const s = this.state;
    return s?.phase === "ready_anonymous" || s?.phase === "ready_authenticated";
  }

  /** True when user is authenticated (can submit scores). */
  get isAuthenticated() {
    return this.state?.phase === "ready_authenticated";
  }

  /**
   * Observe bridge state changes.
   * @param {(state: object) => void} listener
   * @returns {() => void}
   */
  observe(listener) {
    const stop = subscribe(listener);
    this.#disposers.push(stop);
    return stop;
  }

  /**
   * Bind the parent's pause/resume and mute/unmute signals to the game.
   * @param {{ onPause?: () => void, onResume?: () => void, onMute?: () => void, onUnmute?: () => void }} handlers
   * @returns {() => void}
   */
  bindLifecycle(handlers) {
    const stops = [];
    if (handlers.onPause) stops.push(onPause(handlers.onPause));
    if (handlers.onResume) stops.push(onResume(handlers.onResume));
    if (handlers.onMute) stops.push(onMute(handlers.onMute));
    if (handlers.onUnmute) stops.push(onUnmute(handlers.onUnmute));

    const stopAll = () => stops.forEach((stop) => stop());
    this.#disposers.push(stopAll);
    return stopAll;
  }

  dispose() {
    this.#disposers.forEach((stop) => stop());
    this.#disposers = [];
    this.#completedRounds.clear();
  }
}

/** Singleton instance for the game */
export const winkGame = new WinkGameIntegration();
