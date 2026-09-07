/**
 * WinkBridge facade — JS port of wink-bridge.ts
 *
 * Safe to import before the browser artifact (wink-bridge.js script tag).
 * Every delegate uses the live getter, so a later script install is observed.
 * The facade does not synthesize a session or implement a second protocol.
 */

const EMPTY_CAPABILITIES = Object.freeze({
  getLeaderboard: false,
  submitScore: false,
  complete: false,
});

const NOOP_UNSUBSCRIBE = () => {};

/**
 * @returns {import('./wink-bridge').WinkBridgeApi | null}
 */
export function getWinkBridge() {
  if (typeof window === "undefined") return null;
  return window.WinkBridge ?? null;
}

function requireBridge() {
  const current = getWinkBridge();
  if (!current) throw new Error("WinkBridge is not installed");
  return current;
}

/**
 * Observe immutable public state; returns unsubscribe function.
 * @param {(state: object) => void} listener
 * @returns {() => void}
 */
export function subscribe(listener) {
  return getWinkBridge()?.subscribe(listener) ?? NOOP_UNSUBSCRIBE;
}

/**
 * Read phase, game, identity type, capabilities, expiry, lifecycle, error.
 * @returns {object | null}
 */
export function getState() {
  return getWinkBridge()?.getState() ?? null;
}

/**
 * Read getLeaderboard, submitScore, and complete grants.
 * @returns {{ getLeaderboard: boolean, submitScore: boolean, complete: boolean }}
 */
export function getCapabilities() {
  return getWinkBridge()?.getCapabilities() ?? EMPTY_CAPABILITIES;
}

/**
 * Read the scoped game leaderboard.
 * @param {{ limit?: number, offset?: number }} [options]
 * @returns {Promise<{ entries: Array, total: number, me?: object|null }>}
 */
export function getLeaderboard(options) {
  return Promise.resolve()
    .then(() => {
      const bridge = getWinkBridge();
      if (!bridge || !bridge.getCapabilities?.()?.getLeaderboard) {
        return { entries: [], total: 0, me: null };
      }
      return bridge.getLeaderboard(options);
    })
    .catch((err) => {
      console.warn("[WinkBridge] getLeaderboard error:", err?.message || err);
      return { entries: [], total: 0, me: null };
    });
}

/**
 * Read the personal best of the current player.
 * @returns {Promise<{ me: object | null }>}
 */
export function getPersonalBest() {
  return Promise.resolve()
    .then(() => {
      const bridge = getWinkBridge();
      if (!bridge) return { me: null };
      if (typeof bridge.getPersonalBest === "function") {
        return bridge.getPersonalBest();
      }
      if (typeof bridge.getLeaderboard === "function") {
        return bridge
          .getLeaderboard({ limit: 1 })
          .then((res) => ({ me: res?.me ?? null }));
      }
      return { me: null };
    })
    .catch((err) => {
      console.warn("[WinkBridge] getPersonalBest error:", err?.message || err);
      return { me: null };
    });
}

/**
 * Submit an exact score body when capability permits.
 * @param {{ score: number, playTime?: number, gameMode?: string, counter?: number, metadata?: object }} input
 * @returns {Promise<{ entry: object, isNewBest: boolean, previousBest: number|null }>}
 */
export function submitScore(input) {
  return Promise.resolve()
    .then(() => {
      const bridge = getWinkBridge();
      if (!bridge || !bridge.getCapabilities?.()?.submitScore) {
        return { entry: null, isNewBest: false, previousBest: null };
      }
      return bridge.submitScore(input);
    })
    .catch((err) => {
      console.warn("[WinkBridge] submitScore error:", err?.message || err);
      return { entry: null, isNewBest: false, previousBest: null };
    });
}

/**
 * Tell the trusted parent the game reached a semantic completion.
 * @param {{ roundId: string, playDurationMs?: number, metadata?: object }} input
 */
export function complete(input) {
  getWinkBridge()?.complete(input);
}

/**
 * Register game-loop pause callback.
 * @param {() => void} listener
 * @returns {() => void}
 */
export function onPause(listener) {
  return getWinkBridge()?.onPause(listener) ?? NOOP_UNSUBSCRIBE;
}

/**
 * Register game-loop resume callback.
 * @param {() => void} listener
 * @returns {() => void}
 */
export function onResume(listener) {
  return getWinkBridge()?.onResume(listener) ?? NOOP_UNSUBSCRIBE;
}

/**
 * Register audio mute callback.
 * @param {() => void} listener
 * @returns {() => void}
 */
export function onMute(listener) {
  return getWinkBridge()?.onMute(listener) ?? NOOP_UNSUBSCRIBE;
}

/**
 * Register audio unmute callback.
 * @param {() => void} listener
 * @returns {() => void}
 */
export function onUnmute(listener) {
  return getWinkBridge()?.onUnmute(listener) ?? NOOP_UNSUBSCRIBE;
}

/**
 * Return a redacted diagnostic snapshot.
 * @returns {object | null}
 */
export function help() {
  return getWinkBridge()?.help() ?? null;
}
