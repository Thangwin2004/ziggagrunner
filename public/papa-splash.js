(() => {
  const splash = document.getElementById("papa-studio-splash");
  if (!splash) return;

  const startedAt = window.performance.now();
  let dismissalScheduled = false;

  const scheduleDismissal = () => {
    if (dismissalScheduled) return;
    dismissalScheduled = true;

    const minimumDuration = 1400;
    const remainingDuration = Math.max(
      0,
      minimumDuration - (window.performance.now() - startedAt),
    );

    window.setTimeout(() => {
      splash.classList.add("is-ready");
      window.setTimeout(() => {
        splash.classList.add("is-hidden");
        window.setTimeout(() => splash.remove(), 450);
      }, 180);
    }, remainingDuration);
  };

  if (document.readyState === "complete") {
    scheduleDismissal();
  } else {
    window.addEventListener("load", scheduleDismissal, { once: true });
  }

  // Never leave the player blocked behind the publisher splash.
  window.setTimeout(scheduleDismissal, 3800);
})();
