export function installFocusPause({
  isRunning = () => true,
  pause,
  resume,
  pauseAudio = () => {},
  resumeAudio = () => {},
}) {
  const pauseReasons = new Set();
  let shouldResume = false;
  let destroyed = false;

  const safelyCall = (callback) => {
    try {
      const result = callback();
      if (result && typeof result.catch === "function") {
        result.catch(() => {});
      }
    } catch {
      // Lifecycle pause must never crash the host game.
    }
  };

  const pauseFor = (reason) => {
    if (destroyed || pauseReasons.has(reason)) return;
    const firstReason = pauseReasons.size === 0;
    pauseReasons.add(reason);
    if (!firstReason) return;

    shouldResume = Boolean(isRunning());
    safelyCall(pause);
    safelyCall(pauseAudio);
  };

  const resumeFor = (reason) => {
    if (destroyed || !pauseReasons.delete(reason) || pauseReasons.size > 0) {
      return;
    }
    const resumeNow = shouldResume;
    shouldResume = false;
    safelyCall(resumeAudio);
    if (!resumeNow) return;
    safelyCall(resume);
  };

  const handleVisibility = () => {
    if (document.visibilityState === "hidden") pauseFor("visibility");
    else resumeFor("visibility");
  };
  const handleBlur = () => pauseFor("focus");
  const handleFocus = () => resumeFor("focus");
  const handleInteraction = () => {
    if (document.hasFocus()) resumeFor("focus");
  };
  const handlePageHide = () => pauseFor("page");
  const handlePageShow = () => resumeFor("page");
  const viewportObserver =
    typeof window !== "undefined" && "IntersectionObserver" in window
      ? new window.IntersectionObserver(
          ([entry]) => {
            if (entry?.isIntersecting && entry.intersectionRatio >= 0.15) {
              resumeFor("viewport");
            } else {
              pauseFor("viewport");
            }
          },
          { threshold: [0, 0.15] },
        )
      : null;

  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("blur", handleBlur);
  window.addEventListener("focus", handleFocus);
  window.addEventListener("pointerdown", handleInteraction, { passive: true });
  window.addEventListener("touchstart", handleInteraction, { passive: true });
  window.addEventListener("pagehide", handlePageHide);
  window.addEventListener("pageshow", handlePageShow);
  viewportObserver?.observe(document.documentElement);

  if (document.visibilityState === "hidden") pauseFor("visibility");
  if (!document.hasFocus()) pauseFor("focus");

  return {
    isPaused: () => pauseReasons.size > 0,
    pauseFromHost: () => pauseFor("host"),
    resumeFromHost: () => resumeFor("host"),
    destroy: () => {
      destroyed = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pointerdown", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
      viewportObserver?.disconnect();
      pauseReasons.clear();
    },
  };
}
