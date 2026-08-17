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
      if (result && typeof result.catch === "function") result.catch(() => {});
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
    if (destroyed || !pauseReasons.delete(reason) || pauseReasons.size > 0) return;
    const resumeNow = shouldResume;
    shouldResume = false;
    safelyCall(resumeAudio);
    if (resumeNow) safelyCall(resume);
  };

  const handleVisibility = () => document.visibilityState === "hidden"
    ? pauseFor("visibility")
    : resumeFor("visibility");
  const handleBlur = () => pauseFor("focus");
  const handleFocus = () => resumeFor("focus");
  const handlePageHide = () => pauseFor("page");
  const handlePageShow = () => resumeFor("page");
  const viewportObserver = typeof IntersectionObserver === "undefined"
    ? null
    : new IntersectionObserver(([entry]) => {
        if (entry?.isIntersecting && entry.intersectionRatio >= 0.15) resumeFor("viewport");
        else pauseFor("viewport");
      }, { threshold: [0, 0.15] });

  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("blur", handleBlur);
  window.addEventListener("focus", handleFocus);
  window.addEventListener("pagehide", handlePageHide);
  window.addEventListener("pageshow", handlePageShow);
  viewportObserver?.observe(document.documentElement);
  if (document.visibilityState === "hidden") pauseFor("visibility");

  return {
    pauseFromHost: () => pauseFor("host"),
    resumeFromHost: () => resumeFor("host"),
    destroy: () => {
      destroyed = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
      viewportObserver?.disconnect();
      pauseReasons.clear();
    },
  };
}
