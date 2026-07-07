export class InputManager {
  constructor(element, uiManager) {
    this.element = element || document.body;
    this.uiManager = uiManager;
    this.isDown = false;
    this.onJump = null;

    this.handleDown = this.handleDown.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.element.addEventListener("pointerdown", this.handleDown);
    window.addEventListener("keydown", this.handleKeyDown);
  }

  handleDown() {
    if (this.uiManager && this.uiManager.isHoveringUI) return;
    this.isDown = true;
    if (this.onJump) this.onJump();
  }

  handleKeyDown(e) {
    if (e.code === "Space" || e.code === "ArrowUp") {
      this.isDown = true;
      if (this.onJump) this.onJump();
    }
  }

  dispose() {
    this.element.removeEventListener("pointerdown", this.handleDown);
    window.removeEventListener("keydown", this.handleKeyDown);
  }
}
