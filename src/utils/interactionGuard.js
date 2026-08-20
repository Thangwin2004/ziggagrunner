const EDITABLE_SELECTOR =
  "input, textarea, select, [contenteditable='true'], [contenteditable='']";

function isEditableTarget(target) {
  return (
    target instanceof window.Element &&
    Boolean(target.closest(EDITABLE_SELECTOR))
  );
}

function isInsideScrollableArea(target) {
  if (!(target instanceof window.Element)) return false;

  let element = target;
  while (element && element !== document.body) {
    const style = window.getComputedStyle(element);
    const canScrollY =
      /(auto|scroll)/.test(style.overflowY) &&
      element.scrollHeight > element.clientHeight;
    const canScrollX =
      /(auto|scroll)/.test(style.overflowX) &&
      element.scrollWidth > element.clientWidth;

    if (canScrollY || canScrollX) return true;
    element = element.parentElement;
  }

  return false;
}

export function installInteractionGuard() {
  if (window.__gameInteractionGuardInstalled) return;
  window.__gameInteractionGuardInstalled = true;

  const style = document.createElement("style");
  style.dataset.gameInteractionGuard = "true";
  style.textContent = `
    html.game-viewport-locked,
    html.game-viewport-locked body {
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
      overscroll-behavior: none;
      -webkit-user-select: none;
      user-select: none;
      -webkit-touch-callout: none;
    }

    html.game-viewport-locked body {
      position: fixed;
      inset: 0;
    }

    html.game-viewport-locked canvas,
    html.game-viewport-locked img {
      -webkit-user-drag: none;
      user-select: none;
    }

    html.game-viewport-locked canvas {
      touch-action: none;
    }
  `;
  document.head.appendChild(style);
  document.documentElement.classList.add("game-viewport-locked");

  const preventOutsideEditors = (event) => {
    if (!isEditableTarget(event.target)) event.preventDefault();
  };

  document.addEventListener("contextmenu", preventOutsideEditors);
  document.addEventListener("selectstart", preventOutsideEditors);
  document.addEventListener("dragstart", preventOutsideEditors);
  document.addEventListener("copy", preventOutsideEditors);

  document.addEventListener(
    "touchmove",
    (event) => {
      if (
        event.touches.length === 1 &&
        !isEditableTarget(event.target) &&
        !isInsideScrollableArea(event.target)
      ) {
        event.preventDefault();
      }
    },
    { passive: false },
  );
}
