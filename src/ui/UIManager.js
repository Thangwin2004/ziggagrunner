import { i18n, t } from "../system/I18nManager.js";
import * as THREE from "three";
import gsap from "gsap";
import { winkGame } from "../integrations/wink/wink-adapter.js";

const UI_PALETTE = Object.freeze({
  primaryTop: "#FF9F5A",
  primaryBottom: "#FF713D",
  primaryShadow: "#CE482B",
  primaryHighlight: "#FFC39A",
  secondaryTop: "#FFF2C9",
  secondaryBottom: "#FFE09B",
  secondaryShadow: "#E7A23E",
  surface: "#FFF9F1",
  surfaceAlt: "#F7F0E7",
  surfaceHighlight: "#FFF0D5",
  ink: "#403442",
  mutedInk: "#796C78",
  controlInk: "#FFFDF8",
  border: "#E6D2BF",
  focus: "#8F3F2C",
});

const PRIMARY_BUTTON_THEME = Object.freeze({
  top: UI_PALETTE.primaryTop,
  bottom: UI_PALETTE.primaryBottom,
  shadow: UI_PALETTE.primaryShadow,
  ink: UI_PALETTE.controlInk,
});

const BUTTON_THEMES = Object.freeze({
  primary: PRIMARY_BUTTON_THEME,
  orange: PRIMARY_BUTTON_THEME,
  green: PRIMARY_BUTTON_THEME,
  blue: PRIMARY_BUTTON_THEME,
  red: PRIMARY_BUTTON_THEME,
  gold: PRIMARY_BUTTON_THEME,
  yellow: PRIMARY_BUTTON_THEME,
});

const UI_FONT_FAMILY = '"Be Vietnam Pro", sans-serif';
const TITLE_FONT_FAMILY = '"Baloo 2", "Be Vietnam Pro", sans-serif';

function getButtonTheme(theme) {
  return BUTTON_THEMES[theme] || BUTTON_THEMES.gold;
}

function createUIMaterial(map) {
  return new THREE.SpriteMaterial({ map, toneMapped: false });
}

function getEffectiveUser() {
  if (winkGame && winkGame.personalBest?.displayName) {
    return {
      name: winkGame.personalBest.displayName,
      avatar: "/assest/image/imagebldp/001_avatar_laclac.webp",
    };
  }

  try {
    const savedUser = window.localStorage.getItem("google_user");
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed && parsed.name) return parsed;
    }
  } catch (err) {
    console.warn(err);
  }

  if (winkGame && winkGame.isAuthenticated) {
    return {
      name: t("account.member"),
      avatar: "/assest/image/imagebldp/001_avatar_laclac.webp",
    };
  }
  return null;
}

export class UIManager {
  constructor(uiScene, uiCamera, domElement) {
    this.scene = uiScene;
    this.camera = uiCamera;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.interactiveObjects = [];
    this.isHoveringUI = false;

    // Callbacks
    this.onPlay = null;
    this.onLevelSelect = null;
    this.onReplay = null;
    this.onSettings = null;
    this.onAchievements = null;
    this.onHome = null;
    this.onContinue = null;
    this.onToggleMusic = null;
    this.onToggleSfx = null;
    this.onPlayClick = null;

    this.activeGroup = new THREE.Group();
    this.scene.add(this.activeGroup);

    this.hudGroup = new THREE.Group();
    this.scene.add(this.hudGroup);

    this.scoreSprite = null;
    this.hudSettingsButton = null;
    this.hudTutorialSprite = null;
    i18n.subscribe(() => this.refreshLanguageView?.());

    domElement.addEventListener("pointermove", this.onPointerMove.bind(this));
    domElement.addEventListener("pointerdown", this.onPointerDown.bind(this));
  }

  createLanguageSelect() {
    const select = document.createElement("select");
    select.setAttribute("aria-label", t("settings.language"));
    select.innerHTML =
      '<option value="en">English</option><option value="vi">Tiếng Việt</option>';
    select.value = i18n.language;
    select.style.cssText =
      'min-height:44px;max-width:100%;padding:8px 12px;border:2px solid #E6D2BF;border-radius:12px;background:#FFF9F1;color:#403442;font:600 14px "Be Vietnam Pro",sans-serif;cursor:pointer;';
    select.addEventListener("change", () => {
      this.playClickSound();
      i18n.setLanguage(select.value);
    });
    return select;
  }

  playClickSound() {
    if (this.onPlayClick) this.onPlayClick();
  }

  onPointerMove(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects);

    let hoveringSomething = false;

    if (intersects.length > 0) {
      const obj = intersects[0].object;
      if (obj.onClick) {
        hoveringSomething = true;
        if (this.hoveredObject !== obj) {
          if (this.hoveredObject && this.hoveredObject.onHoverLeave)
            this.hoveredObject.onHoverLeave();
          this.hoveredObject = obj;
          if (this.hoveredObject.onHoverEnter)
            this.hoveredObject.onHoverEnter();
        }
      }
    }

    if (!hoveringSomething && this.hoveredObject) {
      if (this.hoveredObject.onHoverLeave) this.hoveredObject.onHoverLeave();
      this.hoveredObject = null;
    }

    this.isHoveringUI = hoveringSomething;
    document.body.style.cursor = hoveringSomething ? "pointer" : "default";
  }

  onPointerDown(event) {
    if (event.touches && event.touches.length > 0) {
      this.mouse.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
    } else {
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects);

    if (intersects.length > 0 && intersects[0].object.onClick) {
      this.playClickSound();

      const obj = intersects[0].object;
      const origX = obj.scale.x;
      const origY = obj.scale.y;

      gsap.to(obj.scale, {
        x: origX * 0.9,
        y: origY * 0.9,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          if (obj.onClick) obj.onClick();
        },
      });

      this.isHoveringUI = true;
    } else {
      this.isHoveringUI = false;
    }
  }

  makePopupResponsive(overlay, card) {
    const handleResize = () => {
      card.style.zoom = "1";
      card.style.maxWidth = card.classList.contains("wide")
        ? "min(440px, calc(100vw - 32px))"
        : "min(380px, calc(100vw - 32px))";
    };
    window.addEventListener("resize", handleResize);
    handleResize();

    const originalRemove = overlay.remove.bind(overlay);
    overlay.remove = () => {
      window.removeEventListener("resize", handleResize);
      originalRemove();
    };
  }

  clear() {
    this.refreshLanguageView = null;
    this.hoveredObject = null;
    this.isHoveringUI = false;
    document.body.style.cursor = "default";
    // Clear HTML popups
    const settings = document.getElementById("game-settings-overlay-id");
    if (settings) settings.remove();
    const achievements = document.getElementById(
      "game-achievements-overlay-id",
    );
    if (achievements) achievements.remove();
    const gameover = document.getElementById("game-gameover-overlay-id");
    if (gameover) gameover.remove();

    while (this.activeGroup.children.length > 0) {
      const child = this.activeGroup.children[0];
      gsap.killTweensOf(child.scale);
      if (child.material) gsap.killTweensOf(child.material);
      if (child.material && child.material.map) child.material.map.dispose();
      if (child.material) child.material.dispose();
      this.activeGroup.remove(child);
    }
    while (this.hudGroup.children.length > 0) {
      const child = this.hudGroup.children[0];
      gsap.killTweensOf(child.scale);
      if (child.material) gsap.killTweensOf(child.material);
      if (child.material && child.material.map) child.material.map.dispose();
      if (child.material) child.material.dispose();
      this.hudGroup.remove(child);
    }
    this.scoreSprite = null;
    this.hudSettingsButton = null;
    this.hudTutorialSprite = null;
    this.interactiveObjects = [];
  }

  createTextureFromCanvas(drawCallback, width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    drawCallback(ctx, width, height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  // --- Buttons ---

  createWideButtonTexture(text, width = 240, height = 72, color = "gold") {
    const radius = Math.min(16, height * 0.24);
    const shadowOffset = height * 0.1;
    const padX = 2;
    const padY = 2;

    const canvasW = width + padX * 2;
    const canvasH = height + shadowOffset + padY * 2;

    const texture = this.createTextureFromCanvas(
      (ctx) => {
        const {
          top: colorTop,
          bottom: colorBot,
          shadow: colorShadow,
          ink: colorInk,
        } = getButtonTheme(color);

        ctx.translate(padX, padY);
        const w = width;
        const h = height;

        // 1. Solid Shadow
        ctx.fillStyle = colorShadow;
        ctx.beginPath();
        ctx.roundRect(0, shadowOffset, w, h, radius);
        ctx.fill();

        // 2. Main Face Background
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, colorTop);
        gradient.addColorStop(0.7, colorTop);
        gradient.addColorStop(1, colorBot);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(0, 0, w, h, radius);
        ctx.fill();

        ctx.font = `800 ${Math.max(16, h * 0.42)}px ${UI_FONT_FAMILY}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.shadowColor = colorShadow;
        ctx.shadowBlur = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = colorInk;
        ctx.fillText(text, w / 2, h / 2);
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
      },
      canvasW,
      canvasH,
    );
    return { texture, canvasW, canvasH };
  }
  createWideButton(text, onClick, color = "gold") {
    const w = 240;
    const h = 72;
    const { texture, canvasW, canvasH } = this.createWideButtonTexture(
      text,
      w,
      h,
      color,
    );
    const material = createUIMaterial(texture);
    const sprite = new THREE.Sprite(material);

    sprite.scale.set(canvasW, canvasH, 1);
    sprite.onClick = onClick;

    sprite.onHoverEnter = () => {};
    sprite.onHoverLeave = () => {};

    this.interactiveObjects.push(sprite);
    return sprite;
  }

  getIconBase64(iconName, theme = "gold") {
    const scale = 60;
    const w = scale * 1.2;
    const h = scale * 1.2;
    const radius = 14;
    const centerX = w / 2;
    const centerY = h / 2;
    const shadowOffset = h * 0.1;
    const pad = 2;

    const canvasW = w + pad * 2;
    const canvasH = h + shadowOffset + pad * 2;

    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext("2d");

    const {
      top: colorTop,
      bottom: colorBot,
      shadow: colorShadow,
      ink: colorInk,
    } = getButtonTheme(theme);

    ctx.translate(pad, pad);
    ctx.fillStyle = colorShadow;
    ctx.beginPath();
    ctx.roundRect(0, shadowOffset, w, h, radius);
    ctx.fill();

    const gradient = ctx.createLinearGradient(0, 0, 0, w);
    gradient.addColorStop(0, colorTop);
    gradient.addColorStop(1, colorBot);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, radius);
    ctx.fill();

    const ICONS = {
      home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
      setting:
        "M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z",
      trophy:
        "M19,5h-2V3H7v2H5C3.9,5,3,5.9,3,7v1c0,2.55,1.92,4.63,4.39,4.94c0.63,1.5,1.98,2.63,3.61,2.96V19H7v2h10v-2h-4v-3.1 c1.63-0.33,2.98-1.46,3.61-2.96C19.08,12.63,21,10.55,21,8V7C21,5.9,20.1,5,19,5z M5,8V7h2v3.82C5.84,10.4,5,9.3,5,8z M19,8 c0,1.3-0.84,2.4-2,2.82V7h2V8z",
      replay:
        "M17.65,6.35C16.2,4.9,14.21,4,12,4c-4.42,0-7.99,3.58-7.99,8s3.57,8,7.99,8c3.73,0,6.84-2.55,7.73-6h-2.08 c-0.82,2.33-3.04,4-5.65,4c-3.31,0-6-2.69-6-6s2.69-6,6-6c1.66,0,3.14,0.69,4.22,1.78L13,11h7V4L17.65,6.35z",
      play: "M8 5v14l11-7z",
    };

    let iconNameStr = iconName;
    if (iconNameStr === "gear") iconNameStr = "setting";

    if (ICONS[iconNameStr]) {
      const p = new window.Path2D(ICONS[iconNameStr]);
      ctx.save();
      ctx.translate(centerX, centerY);
      const iconScale = (w * 0.6) / 24;
      ctx.scale(iconScale, iconScale);
      ctx.translate(-12, -12);
      ctx.shadowColor = colorShadow;
      ctx.shadowBlur = 1.5;
      ctx.shadowOffsetY = 1.5;
      ctx.fillStyle = colorInk;
      ctx.fill(p);
      ctx.restore();
    } else if (iconNameStr === "x2") {
      ctx.font = `900 32px ${UI_FONT_FAMILY}`;
      ctx.fillStyle = colorInk;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = colorShadow;
      ctx.shadowBlur = 2;
      ctx.shadowOffsetY = 2;
      ctx.fillText("x2", centerX, centerY);
    } else {
      ctx.fillStyle = colorInk;
      ctx.beginPath();
      ctx.arc(centerX, centerY, w * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    return canvas.toDataURL("image/png");
  }

  createIconButton(iconName, onClick, scale = 60, theme = "gold") {
    const w = scale * 1.2;
    const h = scale * 1.2;
    const radius = Math.max(12, scale * 0.23);
    const centerX = w / 2;
    const centerY = h / 2;
    const shadowOffset = h * 0.1;
    const pad = 2;

    const canvasW = w + pad * 2;
    const canvasH = h + shadowOffset + pad * 2;

    const texture = this.createTextureFromCanvas(
      (ctx) => {
        const {
          top: colorTop,
          bottom: colorBot,
          shadow: colorShadow,
          ink: colorInk,
        } = getButtonTheme(theme);

        ctx.translate(pad, pad);

        ctx.fillStyle = colorShadow;
        ctx.beginPath();
        ctx.roundRect(0, shadowOffset, w, h, radius);
        ctx.fill();

        const gradient = ctx.createLinearGradient(0, 0, 0, w);
        gradient.addColorStop(0, colorTop);
        gradient.addColorStop(1, colorBot);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(0, 0, w, h, radius);
        ctx.fill();

        const ICONS = {
          home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
          setting:
            "M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z",
          gear: "M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z",
          trophy:
            "M19,5h-2V3H7v2H5C3.9,5,3,5.9,3,7v1c0,2.55,1.92,4.63,4.39,4.94c0.63,1.5,1.98,2.63,3.61,2.96V19H7v2h10v-2h-4v-3.1 c1.63-0.33,2.98-1.46,3.61-2.96C19.08,12.63,21,10.55,21,8V7C21,5.9,20.1,5,19,5z M5,8V7h2v3.82C5.84,10.4,5,9.3,5,8z M19,8 c0,1.3-0.84,2.4-2,2.82V7h2V8z",
          replay:
            "M17.65,6.35C16.2,4.9,14.21,4,12,4c-4.42,0-7.99,3.58-7.99,8s3.57,8,7.99,8c3.73,0,6.84-2.55,7.73-6h-2.08 c-0.82,2.33-3.04,4-5.65,4c-3.31,0-6-2.69-6-6s2.69-6,6-6c1.66,0,3.14,0.69,4.22,1.78L13,11h7V4L17.65,6.35z",
        };

        let iconNameStr = iconName;
        if (iconNameStr === "gear") iconNameStr = "setting";

        if (ICONS[iconNameStr]) {
          const p = new window.Path2D(ICONS[iconNameStr]);
          ctx.save();
          ctx.translate(centerX, centerY);
          const iconScale = (w * 0.6) / 24;
          ctx.scale(iconScale, iconScale);
          ctx.translate(-12, -12);
          ctx.shadowColor = colorShadow;
          ctx.shadowBlur = 1.5;
          ctx.shadowOffsetY = 1.5;
          ctx.fillStyle = colorInk;
          ctx.fill(p);
          ctx.restore();
        } else {
          ctx.fillStyle = colorInk;
          ctx.beginPath();
          ctx.arc(centerX, centerY, w * 0.15, 0, Math.PI * 2);
          ctx.fill();
        }
      },
      canvasW,
      canvasH,
    );

    const material = createUIMaterial(texture);
    const sprite = new THREE.Sprite(material);

    sprite.scale.set(canvasW, canvasH, 1);
    sprite.onClick = onClick;

    sprite.onHoverEnter = () => {};
    sprite.onHoverLeave = () => {};
    this.interactiveObjects.push(sprite);

    return sprite;
  }
  createToggleSprite(isOn, onClick) {
    const w = 90,
      h = 40;

    const texOn = new THREE.TextureLoader().load(
      "/assest/iconbtn/toggle_on.webp",
    );
    texOn.colorSpace = THREE.SRGBColorSpace;

    const texOff = new THREE.TextureLoader().load(
      "/assest/iconbtn/toggle_off.webp",
    );
    texOff.colorSpace = THREE.SRGBColorSpace;

    const mat = createUIMaterial(isOn ? texOn : texOff);
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(w, h, 1);
    sprite.isOn = isOn;

    sprite.onClick = () => {
      sprite.isOn = !sprite.isOn;
      sprite.material.map = sprite.isOn ? texOn : texOff;
      if (onClick) onClick(sprite.isOn);
    };

    sprite.onHoverEnter = () =>
      gsap.to(sprite.scale, { x: w * 1.05, y: h * 1.05, duration: 0.1 });
    sprite.onHoverLeave = () =>
      gsap.to(sprite.scale, { x: w, y: h, duration: 0.1 });
    this.interactiveObjects.push(sprite);

    return sprite;
  }

  // --- Modals ---

  createModalTexture(
    title,
    width = 340,
    height = 300,
    borderStyle = "white",
    outerStrokeColor = UI_PALETTE.border,
  ) {
    return this.createTextureFromCanvas(
      (ctx, w, h) => {
        const pad = 30;
        const cardW = w - pad * 2;
        const cardH = h - pad * 2;

        // Shadow
        ctx.fillStyle = "rgba(64, 52, 66, 0.24)";
        ctx.beginPath();
        ctx.roundRect(pad + 6, pad + 12, cardW, cardH, 20);
        ctx.fill();

        if (borderStyle === "white") {
          // Outer colored stroke
          ctx.fillStyle = outerStrokeColor;
          ctx.beginPath();
          ctx.roundRect(pad - 4, pad - 4, cardW + 8, cardH + 8, 24);
          ctx.fill();

          // Thick White Border
          ctx.fillStyle = UI_PALETTE.surfaceHighlight;
          ctx.beginPath();
          ctx.roundRect(pad, pad, cardW, cardH, 20);
          ctx.fill();

          // Yellow Inner Stroke
          ctx.strokeStyle = UI_PALETTE.border;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(pad + 6, pad + 6, cardW - 12, cardH - 12, 14);
          ctx.stroke();

          // Inner Card Face
          ctx.fillStyle = UI_PALETTE.surface;
          ctx.beginPath();
          ctx.roundRect(pad + 8, pad + 8, cardW - 16, cardH - 16, 12);
          ctx.fill();
        } else {
          ctx.fillStyle = UI_PALETTE.primaryShadow;
          ctx.beginPath();
          ctx.roundRect(pad, pad + 8, cardW, cardH, 20);
          ctx.fill();
          ctx.fillStyle = UI_PALETTE.primaryBottom;
          ctx.beginPath();
          ctx.roundRect(pad, pad, cardW, cardH, 20);
          ctx.fill();
          ctx.strokeStyle = UI_PALETTE.border;
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.fillStyle = UI_PALETTE.surface;
          ctx.beginPath();
          ctx.roundRect(pad + 10, pad + 10, cardW - 20, cardH - 20, 15);
          ctx.fill();
        }

        // Ribbon
        const ribbonW = 240;
        const ribbonH = 46;
        const ribbonX = w / 2 - ribbonW / 2;
        const ribbonY = pad - 23;

        const rGrad = ctx.createLinearGradient(
          0,
          ribbonY,
          0,
          ribbonY + ribbonH,
        );
        rGrad.addColorStop(0, UI_PALETTE.primaryTop);
        rGrad.addColorStop(1, UI_PALETTE.primaryBottom);
        ctx.fillStyle = UI_PALETTE.primaryShadow;
        ctx.strokeStyle = UI_PALETTE.surfaceHighlight;

        ctx.beginPath();
        ctx.roundRect(ribbonX, ribbonY + 6, ribbonW, ribbonH, 12);
        ctx.fill(); // Shadow

        ctx.fillStyle = rGrad;
        ctx.beginPath();
        ctx.roundRect(ribbonX, ribbonY, ribbonW, ribbonH, 12);
        ctx.fill(); // Base

        ctx.lineWidth = 2.5;
        ctx.stroke(); // Stroke

        ctx.font = `800 22px ${TITLE_FONT_FAMILY}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(68, 39, 46, 0.28)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = UI_PALETTE.controlInk;
        ctx.fillText(title, w / 2, ribbonY + ribbonH / 2 + 2);
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
      },
      width + 60,
      height + 60,
    );
  }

  showMainMenu(stats) {
    this.clear();
    this.refreshLanguageView = () => this.showMainMenu(stats);
    const highScore =
      stats && stats.highScore !== undefined ? stats.highScore : 0;

    const titleTex = this.createTextureFromCanvas(
      (ctx, w) => {
        // Secondary line: light, compact and clearly separate from the main name.
        ctx.font = `800 43px ${TITLE_FONT_FAMILY}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(143, 63, 44, 0.52)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = UI_PALETTE.controlInk;
        ctx.fillText(t("menu.journey"), w / 2, 44);

        // Small same-hue ornaments give the wordmark a clear horizontal lockup.
        ctx.shadowColor = "transparent";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.strokeStyle = UI_PALETTE.primaryTop;
        ctx.beginPath();
        ctx.moveTo(w / 2 - 232, 44);
        ctx.lineTo(w / 2 - 190, 44);
        ctx.moveTo(w / 2 + 190, 44);
        ctx.lineTo(w / 2 + 232, 44);
        ctx.stroke();

        // Main wordmark.
        ctx.font = `800 106px ${TITLE_FONT_FAMILY}`;
        ctx.shadowColor = "rgba(143, 63, 44, 0.5)";
        ctx.shadowBlur = 5;
        ctx.shadowOffsetY = 7;
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = UI_PALETTE.primaryShadow;
        const wordmarkGradient = ctx.createLinearGradient(0, 76, 0, 170);
        wordmarkGradient.addColorStop(0, UI_PALETTE.primaryHighlight);
        wordmarkGradient.addColorStop(0.48, UI_PALETTE.primaryTop);
        wordmarkGradient.addColorStop(1, UI_PALETTE.primaryBottom);
        ctx.fillStyle = wordmarkGradient;
        ctx.strokeText("ZIGZAG", w / 2, 126);
        ctx.fillText("ZIGZAG", w / 2, 126);
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Brand separator
        ctx.beginPath();
        ctx.moveTo(w / 2 - 118, 207);
        ctx.lineTo(w / 2 - 13, 207);
        ctx.moveTo(w / 2 + 13, 207);
        ctx.lineTo(w / 2 + 118, 207);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "rgba(206, 72, 43, 0.66)";
        ctx.stroke();
        ctx.fillStyle = UI_PALETTE.primaryBottom;
        ctx.beginPath();
        ctx.moveTo(w / 2, 201);
        ctx.lineTo(w / 2 + 6, 207);
        ctx.lineTo(w / 2, 213);
        ctx.lineTo(w / 2 - 6, 207);
        ctx.closePath();
        ctx.fill();

        // Highscore
        ctx.font = `900 32px ${TITLE_FONT_FAMILY}`;
        ctx.fillStyle = "#3A2415";
        ctx.strokeStyle = "#3A2415";
        ctx.lineWidth = 1.6;
        ctx.shadowColor = "rgba(255, 255, 255, 0.85)";
        ctx.shadowBlur = 4;
        ctx.strokeText(t("menu.best", { score: highScore }), w / 2, 270);
        ctx.fillText(t("menu.best", { score: highScore }), w / 2, 270);
        ctx.shadowColor = "transparent";
      },
      600,
      350,
    );
    const titleSprite = new THREE.Sprite(createUIMaterial(titleTex));

    // Scale dynamically based on screen width to fit all devices
    const screenW = window.innerWidth;
    let scaleW = 600;
    let scaleH = 350;
    if (screenW < 600) {
      // Scale canvas so it fits exactly on screen with 20px padding
      const ratio = (screenW - 20) / 600;
      scaleW *= ratio;
      scaleH *= ratio;
    }

    titleSprite.scale.set(scaleW, scaleH, 1);
    titleSprite.position.set(0, 160, 0);
    this.activeGroup.add(titleSprite);

    const playBtn = this.createWideButton(
      t("menu.play"),
      () => {
        if (this.onPlay) this.onPlay();
      },
      "primary",
    );
    playBtn.position.set(0, -60, 0);
    this.activeGroup.add(playBtn);

    const trophyBtn = this.createIconButton(
      "trophy",
      () => {
        if (this.onAchievements) this.onAchievements();
      },
      70,
      "gold",
    );
    trophyBtn.position.set(-80, -180, 0);
    this.activeGroup.add(trophyBtn);

    const settingsBtn = this.createIconButton(
      "gear",
      () => {
        if (this.onSettings) this.onSettings();
      },
      70,
      "gold",
    );
    settingsBtn.position.set(80, -180, 0);
    this.activeGroup.add(settingsBtn);
  }

  showSettings(isIngame = false) {
    this.clear();
    this.refreshLanguageView = () => this.showSettings(isIngame);
    this.injectHTMLPopupStyles();

    const existing = document.getElementById("game-settings-overlay-id");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "game-settings-overlay-id";
    overlay.className = "game-popup-overlay";

    const card = document.createElement("div");
    card.className = "game-popup-card";

    const title = document.createElement("div");
    title.className = "game-popup-title";
    title.innerText = t("settings.title");
    card.appendChild(title);

    if (!isIngame) {
      const closeBtn = document.createElement("button");
      closeBtn.className = "game-popup-close-btn";
      closeBtn.innerText = "✕";
      closeBtn.setAttribute("aria-label", t("actions.close"));
      closeBtn.addEventListener("click", () => {
        this.playClickSound();
        overlay.style.opacity = "0";
        card.style.transform = "scale(0.85)";
        setTimeout(() => {
          overlay.remove();
          if (this.onHome) this.onHome();
          else this.showMainMenu();
        }, 250);
      });
      card.appendChild(closeBtn);
    }

    const rowContainer = document.createElement("div");
    rowContainer.className = "game-settings-row-container";

    const createToggleRow = (label, isEnabled, onToggle) => {
      const row = document.createElement("div");
      row.style.cssText = `width:100%; height:70px; border-radius:12px; background:${UI_PALETTE.surfaceAlt}; border:3px solid ${UI_PALETTE.surfaceHighlight}; display:flex; justify-content:space-between; align-items:center; padding:0 20px; box-sizing:border-box; margin-bottom: 15px;`;

      const text = document.createElement("span");
      text.style.cssText = `font-family:'Be Vietnam Pro', sans-serif; font-size:18px; font-weight:800; color:${UI_PALETTE.ink}; letter-spacing:0.8px; white-space:nowrap;`;
      text.innerText = label;

      const toggle = document.createElement("div");
      const isMuted = !isEnabled;
      toggle.style.cssText = `width:96px; height:46px; border-radius:23px; background:${isMuted ? "#C8C1BC" : UI_PALETTE.primaryBottom}; border:3px solid ${UI_PALETTE.controlInk}; box-shadow: inset 0 3px 6px rgba(64,52,66,0.12), 0 4px 6px rgba(64,52,66,0.14); cursor:pointer; position:relative; transition: background 0.25s, transform 0.1s; flex-shrink:0; display:flex; align-items:center;`;

      const statusText = document.createElement("span");
      statusText.innerText = isMuted ? "OFF" : "ON";
      statusText.style.cssText = `color:${UI_PALETTE.controlInk}; font-family:'Be Vietnam Pro', sans-serif; font-size:18px; font-weight:900; position:absolute; width:100%; text-align:center; padding-right:${isMuted ? "0" : "32px"}; padding-left:${isMuted ? "32px" : "0"}; box-sizing:border-box; transition: padding 0.25s; text-shadow: 0 2px 3px rgba(64,52,66,0.26); pointer-events:none;`;

      const knob = document.createElement("div");
      knob.style.cssText = `width:36px; height:36px; border-radius:50%; background:${UI_PALETTE.controlInk}; position:absolute; top:2px; left:${isMuted ? "3px" : "51px"}; transition: left 0.25s cubic-bezier(0.3, 1.2, 0.5, 1); box-shadow: 0 3px 6px rgba(64,52,66,0.28); pointer-events:none;`;

      toggle.appendChild(statusText);
      toggle.appendChild(knob);

      toggle.onclick = () => {
        const newState = onToggle(); // Trả về trạng thái ENABLED sau khi toggle
        const nowMuted = !newState;
        toggle.style.background = nowMuted
          ? "#C8C1BC"
          : UI_PALETTE.primaryBottom;
        knob.style.left = nowMuted ? "3px" : "51px";
        statusText.innerText = nowMuted ? "OFF" : "ON";
        statusText.style.paddingRight = nowMuted ? "0" : "32px";
        statusText.style.paddingLeft = nowMuted ? "32px" : "0";
      };

      toggle.onmousedown = () => (toggle.style.transform = "scale(0.92)");
      toggle.onmouseup = () => (toggle.style.transform = "scale(1)");
      toggle.onmouseleave = () => (toggle.style.transform = "scale(1)");

      row.appendChild(text);
      row.appendChild(toggle);
      return row;
    };

    if (this.musicOn === undefined) this.musicOn = true;
    if (this.sfxOn === undefined) this.sfxOn = true;

    // Music row
    const musicRow = createToggleRow(t("settings.music"), this.musicOn, () => {
      this.playClickSound();
      this.musicOn = !this.musicOn;
      if (this.onToggleMusic) this.onToggleMusic(this.musicOn);
      return this.musicOn;
    });
    rowContainer.appendChild(musicRow);

    // SFX row
    const sfxRow = createToggleRow(t("settings.sfx"), this.sfxOn, () => {
      this.playClickSound();
      this.sfxOn = !this.sfxOn;
      if (this.onToggleSfx) this.onToggleSfx(this.sfxOn);
      return this.sfxOn;
    });
    rowContainer.appendChild(sfxRow);
    const languageRow = document.createElement("label");
    languageRow.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px 0;color:#403442;font-weight:700;";
    const languageLabel = document.createElement("span");
    languageLabel.textContent = t("settings.language");
    languageRow.append(languageLabel, this.createLanguageSelect());
    rowContainer.appendChild(languageRow);

    card.appendChild(rowContainer);

    if (isIngame) {
      const actionContainer = document.createElement("div");
      actionContainer.className = "game-paused-action-container";

      // Home
      const homeBtn = document.createElement("button");
      homeBtn.setAttribute("aria-label", t("actions.home"));
      homeBtn.className = "game-paused-btn";
      homeBtn.style.backgroundImage = `url(${this.getIconBase64("home")})`;
      homeBtn.addEventListener("click", () => {
        this.playClickSound();
        overlay.remove();
        if (this.onHome) this.onHome();
        else this.showMainMenu();
      });
      actionContainer.appendChild(homeBtn);

      // Replay
      const replayBtn = document.createElement("button");
      replayBtn.setAttribute("aria-label", t("actions.replay"));
      replayBtn.className = "game-paused-btn";
      replayBtn.style.backgroundImage = `url(${this.getIconBase64("replay")})`;
      replayBtn.addEventListener("click", () => {
        this.playClickSound();
        overlay.remove();
        if (this.onReplay) this.onReplay();
      });
      actionContainer.appendChild(replayBtn);

      // Continue
      const continueBtn = document.createElement("button");
      continueBtn.setAttribute("aria-label", t("actions.resume"));
      continueBtn.className = "game-paused-btn";
      continueBtn.style.backgroundImage = `url(${this.getIconBase64("play")})`;
      continueBtn.addEventListener("click", () => {
        this.playClickSound();
        overlay.remove();
        this.showHUD();
        if (this.onContinue) this.onContinue();
      });
      actionContainer.appendChild(continueBtn);

      card.appendChild(actionContainer);
    }

    overlay.appendChild(card);
    const appContainer = document.getElementById("app") || document.body;
    this.makePopupResponsive(overlay, card);
    appContainer.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
      card.style.opacity = "1";
      card.style.transform = "scale(1)";
    });
  }

  showGameOver(score, highScore, canDoubleReward = true) {
    this.clear();
    this.injectHTMLPopupStyles();

    const existing = document.getElementById("game-gameover-overlay-id");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "game-gameover-overlay-id";
    overlay.className = "game-popup-overlay";

    const card = document.createElement("div");
    card.className = "game-popup-card";

    const title = document.createElement("div");
    title.className = "game-popup-title";
    title.innerText = t("gameover.title");
    card.appendChild(title);

    // Emblem Star
    const emblem = document.createElement("div");
    emblem.className = "game-result-emblem";
    emblem.innerText = "★";
    card.appendChild(emblem);

    const isHigh = score > highScore && score > 0;

    if (isHigh) {
      const newRecord = document.createElement("div");
      newRecord.className = "game-record-badge";
      newRecord.innerText = t("gameover.record");
      card.appendChild(newRecord);
    }

    const scoreVal = document.createElement("div");
    scoreVal.className = "game-result-score";
    scoreVal.innerText = String(score);
    card.appendChild(scoreVal);

    const msgVal = document.createElement("div");
    msgVal.className = "game-result-message";
    msgVal.innerText = isHigh ? t("gameover.top") : t("gameover.encouragement");
    card.appendChild(msgVal);

    const actionContainer = document.createElement("div");
    actionContainer.className = "game-paused-action-container";

    // (Revive button removed from here, it's now in the Revive Offer popup)

    // x2 score
    if (canDoubleReward) {
      const x2Btn = document.createElement("button");
      x2Btn.setAttribute("aria-label", t("actions.double"));
      x2Btn.className = "game-paused-btn";
      x2Btn.style.backgroundImage = `url(${this.getIconBase64("x2", "primary")})`;
      x2Btn.addEventListener("click", () => {
        this.playClickSound();
        overlay.remove();
        if (this.onDoubleReward) this.onDoubleReward();
      });
      actionContainer.appendChild(x2Btn);
    }

    // Replay
    const replayBtn = document.createElement("button");
    replayBtn.setAttribute("aria-label", t("actions.replay"));
    replayBtn.className = "game-paused-btn";
    replayBtn.style.backgroundImage = `url(${this.getIconBase64("replay", "primary")})`;
    replayBtn.addEventListener("click", () => {
      this.playClickSound();
      overlay.remove();
      if (this.onReplay) this.onReplay();
    });
    actionContainer.appendChild(replayBtn);

    // Home
    const homeBtn = document.createElement("button");
    homeBtn.setAttribute("aria-label", t("actions.home"));
    homeBtn.className = "game-paused-btn";
    homeBtn.style.backgroundImage = `url(${this.getIconBase64("home", "primary")})`;
    homeBtn.addEventListener("click", () => {
      this.playClickSound();
      overlay.remove();
      if (this.onHome) this.onHome();
      else this.showMainMenu();
    });
    actionContainer.appendChild(homeBtn);

    card.appendChild(actionContainer);

    overlay.appendChild(card);
    const appContainer = document.getElementById("app") || document.body;
    this.makePopupResponsive(overlay, card);
    appContainer.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
      card.style.opacity = "1";
      card.style.transform = "scale(1)";
    });
  }

  showReviveOffer(onRevive, onSkip) {
    this.clear();
    this.injectHTMLPopupStyles();

    const existing = document.getElementById("game-revive-overlay-id");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "game-revive-overlay-id";
    overlay.className = "game-popup-overlay";

    const card = document.createElement("div");
    card.className = "game-popup-card";

    const title = document.createElement("div");
    title.className = "game-popup-title";
    title.innerText = t("revive.title");
    card.appendChild(title);

    const question = document.createElement("div");
    question.className = "game-popup-heading";
    question.innerText = t("revive.question");
    card.appendChild(question);

    const heartIcon = document.createElement("div");
    heartIcon.innerText = "💖";
    heartIcon.style.fontSize = "110px";
    heartIcon.style.lineHeight = "1";
    heartIcon.style.textAlign = "center";
    heartIcon.style.marginBottom = "20px";
    heartIcon.style.textShadow =
      "0 10px 20px rgba(0,0,0,0.2), 0 0 30px rgba(255,100,150,0.6)";
    // Beating animation
    heartIcon.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.2)" },
        { transform: "scale(1)" },
        { transform: "scale(1.2)" },
        { transform: "scale(1)" },
      ],
      {
        duration: 1200,
        iterations: Infinity,
        easing: "ease-in-out",
      },
    );
    card.appendChild(heartIcon);

    const btnContainer = document.createElement("div");
    btnContainer.style.display = "flex";
    btnContainer.style.flexDirection = "column";
    btnContainer.style.alignItems = "center";
    btnContainer.style.gap = "12px";

    const yesBtn = document.createElement("button");
    yesBtn.className = "game-action-btn";

    // Add video icon
    const videoIcon = document.createElement("img");
    videoIcon.src = "/assest/iconbtn/video.webp";
    videoIcon.style.height = "30px";
    videoIcon.style.width = "auto";
    videoIcon.style.marginRight = "15px";
    videoIcon.style.filter =
      "brightness(0) saturate(100%) invert(18%) sepia(20%) saturate(1735%) hue-rotate(252deg) brightness(92%) contrast(91%)";
    yesBtn.appendChild(videoIcon);

    const yesText = document.createElement("span");
    yesText.innerText = t("revive.yes");
    yesBtn.appendChild(yesText);

    yesBtn.addEventListener("click", () => {
      this.playClickSound();
      overlay.remove();
      if (onRevive) onRevive();
    });
    btnContainer.appendChild(yesBtn);

    const noText = document.createElement("button");
    noText.className = "game-skip-btn";
    noText.innerText = t("revive.no");
    noText.addEventListener("click", () => {
      this.playClickSound();
      overlay.remove();
      if (onSkip) onSkip();
    });
    btnContainer.appendChild(noText);

    card.appendChild(btnContainer);
    overlay.appendChild(card);

    this.makePopupResponsive(overlay, card);
    (document.getElementById("app") || document.body).appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
      card.style.opacity = "1";
      card.style.transform = "scale(1)";
    });
  }

  showHUD() {
    this.clear();

    const createTextSprite = (text) => {
      const tex = this.createTextureFromCanvas(
        (ctx, w, h) => {
          ctx.font = `800 32px ${TITLE_FONT_FAMILY}`;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.lineWidth = 2;
          ctx.strokeStyle = UI_PALETTE.ink;
          ctx.lineJoin = "round";
          ctx.shadowColor = "rgba(95, 62, 35, 0.32)";
          ctx.shadowBlur = 4;
          ctx.shadowOffsetY = 2;
          ctx.strokeText(text, 7, h / 2);
          ctx.fillStyle = UI_PALETTE.secondaryTop;
          ctx.fillText(text, 7, h / 2);
        },
        200,
        48,
      );
      const sprite = new THREE.Sprite(createUIMaterial(tex));
      sprite.scale.set(200, 48, 1);
      return sprite;
    };

    this.scoreSprite = createTextSprite("0");
    this.scoreSprite.position.set(
      -window.innerWidth / 2 + 120,
      window.innerHeight / 2 - 40,
      0,
    );
    this.hudGroup.add(this.scoreSprite);

    const settingsBtn = this.createIconButton(
      "gear",
      () => {
        if (this.onSettings) this.onSettings();
      },
      50,
      "gold",
    );
    settingsBtn.position.set(
      window.innerWidth / 2 - 50,
      window.innerHeight / 2 - 50,
      0,
    );
    this.hudGroup.add(settingsBtn);
    this.hudSettingsButton = settingsBtn;

    // Tutorial Text (Center Screen)
    const tutTex = this.createTextureFromCanvas(
      (ctx, w, h) => {
        ctx.font = `800 25px ${UI_FONT_FAMILY}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillStyle = UI_PALETTE.surface;
        ctx.strokeStyle = UI_PALETTE.ink;
        ctx.lineWidth = 2;
        ctx.lineJoin = "round";
        ctx.shadowColor = "rgba(82, 55, 37, 0.38)";
        ctx.shadowBlur = 5;
        ctx.shadowOffsetY = 2;
        ctx.strokeText(t("hud.tutorial"), w / 2, h / 2);
        ctx.fillText(t("hud.tutorial"), w / 2, h / 2);
      },
      400,
      60,
    );
    const tutSprite = new THREE.Sprite(createUIMaterial(tutTex));
    tutSprite.scale.set(400, 60, 1);
    tutSprite.position.set(0, window.innerHeight / 2 - 120, 0);
    this.hudGroup.add(tutSprite);
    this.hudTutorialSprite = tutSprite;

    // Blink and fade out
    gsap.to(tutSprite.material, {
      opacity: 0.2,
      duration: 0.4,
      yoyo: true,
      repeat: 7,
    });
    gsap.to(tutSprite.material, {
      opacity: 0,
      duration: 0.5,
      delay: 3,
      onComplete: () => {
        this.hudGroup.remove(tutSprite);
        if (this.hudTutorialSprite === tutSprite) this.hudTutorialSprite = null;
        if (tutSprite.material.map) tutSprite.material.map.dispose();
        tutSprite.material.dispose();
      },
    });
  }

  resizeHUD(width = window.innerWidth, height = window.innerHeight) {
    if (this.scoreSprite) {
      this.scoreSprite.position.set(-width / 2 + 120, height / 2 - 40, 0);
    }
    if (this.hudSettingsButton) {
      this.hudSettingsButton.position.set(width / 2 - 50, height / 2 - 50, 0);
    }
    if (this.hudTutorialSprite) {
      this.hudTutorialSprite.position.set(0, height / 2 - 120, 0);
    }
  }

  updateHUD(score) {
    if (this.scoreSprite) {
      this.scoreSprite.material.map.dispose();
      this.scoreSprite.material.dispose();
      this.hudGroup.remove(this.scoreSprite);
    }

    const createTextSprite = (text) => {
      const tex = this.createTextureFromCanvas(
        (ctx, w, h) => {
          ctx.font = `800 32px ${TITLE_FONT_FAMILY}`;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.lineWidth = 2;
          ctx.strokeStyle = UI_PALETTE.ink;
          ctx.lineJoin = "round";
          ctx.shadowColor = "rgba(95, 62, 35, 0.32)";
          ctx.shadowBlur = 4;
          ctx.shadowOffsetY = 2;
          ctx.strokeText(text, 7, h / 2);
          ctx.fillStyle = UI_PALETTE.secondaryTop;
          ctx.fillText(text, 7, h / 2);
        },
        200,
        48,
      );
      const sprite = new THREE.Sprite(createUIMaterial(tex));
      sprite.scale.set(200, 48, 1);
      return sprite;
    };

    this.scoreSprite = createTextSprite(String(score));
    this.scoreSprite.position.set(
      -window.innerWidth / 2 + 120,
      window.innerHeight / 2 - 40,
      0,
    );
    this.hudGroup.add(this.scoreSprite);
  }

  showAchievements(stats) {
    this.clear();
    this.injectHTMLPopupStyles();

    const existing = document.getElementById("game-achievements-overlay-id");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "game-achievements-overlay-id";
    overlay.className = "game-popup-overlay";

    const card = document.createElement("div");
    card.className = "game-popup-card wide";

    const title = document.createElement("div");
    title.className = "game-popup-title";
    title.innerText = t("leaderboard.title");
    card.appendChild(title);

    const closeBtn = document.createElement("button");
    closeBtn.className = "game-popup-close-btn";
    closeBtn.innerText = "✕";
    closeBtn.setAttribute("aria-label", t("actions.close"));
    closeBtn.addEventListener("click", () => {
      this.playClickSound();
      overlay.style.opacity = "0";
      card.style.transform = "scale(0.85)";
      setTimeout(() => {
        overlay.remove();
        if (this.onHome) this.onHome();
        else this.showMainMenu();
      }, 250);
    });
    card.appendChild(closeBtn);

    const effUser = getEffectiveUser();
    const userText = document.createElement("div");
    userText.className = "game-achievements-user-text";
    userText.innerText = effUser
      ? t("account.signedIn", { name: effUser.name })
      : winkGame?.isAuthenticated
        ? t("account.memberSignedIn")
        : t("account.guest");
    card.appendChild(userText);

    const personalScore = stats?.highScore || 0;
    const playerName = effUser
      ? effUser.name
      : winkGame?.isAuthenticated
        ? t("account.member")
        : t("account.you");

    const defaultRankings =
      personalScore > 0
        ? [
            {
              name: playerName,
              score: personalScore,
              isPlayer: true,
              medal: "🥇",
            },
          ]
        : [];

    const tableContainer = document.createElement("div");
    tableContainer.className = "game-achievements-table-container";

    const table = document.createElement("table");
    table.className = "game-achievements-table";

    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th style="text-align: left; padding-left: 10px;">${t("leaderboard.rank")}</th>
        <th style="text-align: center;">${t("leaderboard.name")}</th>
        <th aria-label="${t("leaderboard.score")}" style="text-align: right; padding-right: 10px;">#</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    table.appendChild(tbody);
    tableContainer.appendChild(table);
    card.appendChild(tableContainer);

    const renderTable = (rankings) => {
      tbody.innerHTML = "";
      if (!rankings || rankings.length === 0) {
        const emptyRow = document.createElement("tr");
        emptyRow.innerHTML = `<td colspan="3" style="padding:24px;text-align:center;">${t("leaderboard.empty")}</td>`;
        tbody.appendChild(emptyRow);
        return;
      }
      rankings.forEach((r, i) => {
        const row = document.createElement("tr");
        if (i < 3) row.className = `rank-${i}`;
        if (r.isPlayer) row.classList.add("highlighted");
        const medal =
          r.medal ||
          (i === 0
            ? "🥇"
            : i === 1
              ? "🥈"
              : i === 2
                ? "🥉"
                : (i + 1).toString());
        row.innerHTML = `
          <td style="text-align: left; padding-left: 20px;">${medal}</td>
          <td style="text-align: center;">${r.name}</td>
          <td style="text-align: right; padding-right: 10px;">${r.score}</td>
        `;
        tbody.appendChild(row);
      });
    };

    // Personal Best Footer
    const footer = document.createElement("div");
    footer.className = "game-achievements-footer";

    const rankItem = document.createElement("div");
    rankItem.className = "game-achievements-footer-item";
    rankItem.style.width = "50%";
    footer.appendChild(rankItem);

    const scoreItem = document.createElement("div");
    scoreItem.className = "game-achievements-footer-item";
    scoreItem.style.width = "50%";
    footer.appendChild(scoreItem);

    card.appendChild(footer);

    const updateFooter = (pb) => {
      const activeUser = getEffectiveUser();
      const pName =
        pb?.displayName ||
        (activeUser
          ? activeUser.name
          : winkGame?.isAuthenticated
            ? t("account.member")
            : t("account.you"));
      const pScore =
        pb?.score !== undefined && pb?.score !== null
          ? pb.score
          : personalScore;
      const rankStr = pb?.rank ? `#${pb.rank}` : pScore > 0 ? "PB" : "—";

      userText.innerText = activeUser
        ? t("account.signedIn", { name: activeUser.name })
        : winkGame?.isAuthenticated
          ? t("account.memberSignedIn")
          : t("account.guest");

      rankItem.innerText = `${rankStr}: ${pName}`;
      scoreItem.innerText = String(pScore);
    };

    // Initial render
    renderTable(defaultRankings);
    updateFooter(winkGame?.personalBest);

    // Async fetch from Wink API
    if (winkGame) {
      Promise.all([
        winkGame.refreshLeaderboard({ limit: 10 }),
        winkGame.getPersonalBest(),
      ])
        .then(([lbRes, pbRes]) => {
          if (
            lbRes &&
            Array.isArray(lbRes.entries) &&
            lbRes.entries.length > 0
          ) {
            const apiRankings = lbRes.entries.map((item, idx) => ({
              name:
                item.displayName ||
                item.name ||
                `${t("account.member")} #${item.rank || idx + 1}`,
              score: item.score || 0,
              medal:
                (item.rank || idx + 1) === 1
                  ? "🥇"
                  : (item.rank || idx + 1) === 2
                    ? "🥈"
                    : (item.rank || idx + 1) === 3
                      ? "🥉"
                      : (item.rank || idx + 1).toString(),
              isPlayer:
                item.userId &&
                pbRes?.me?.userId &&
                item.userId === pbRes.me.userId,
            }));
            renderTable(apiRankings);
          }
          const activePb = pbRes?.me || lbRes?.me || winkGame.personalBest;
          updateFooter(activePb);
        })
        .catch(() => {
          // Fallback already rendered
        });
    }

    overlay.appendChild(card);
    const appContainer = document.getElementById("app") || document.body;
    this.makePopupResponsive(overlay, card);
    appContainer.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
      card.style.opacity = "1";
      card.style.transform = "scale(1)";
    });
  }

  injectHTMLPopupStyles() {
    if (!document.getElementById("game-popup-shared-styles")) {
      const style = document.createElement("style");
      style.id = "game-popup-shared-styles";
      style.textContent = `
        :root {
          --zig-btn-top: ${UI_PALETTE.primaryTop};
          --zig-btn-bottom: ${UI_PALETTE.primaryBottom};
          --zig-btn-base: ${UI_PALETTE.primaryShadow};
          --zig-btn-border: ${UI_PALETTE.border};
          --zig-btn-ink: ${UI_PALETTE.ink};
          --zig-control-ink: ${UI_PALETTE.controlInk};
          --zig-secondary-top: ${UI_PALETTE.primaryTop};
          --zig-secondary-bottom: ${UI_PALETTE.primaryBottom};
          --zig-secondary-base: ${UI_PALETTE.primaryShadow};
          --zig-danger-top: ${UI_PALETTE.primaryTop};
          --zig-danger-bottom: ${UI_PALETTE.primaryBottom};
          --zig-danger-base: ${UI_PALETTE.primaryShadow};
          --zig-success: ${UI_PALETTE.primaryBottom};
          --zig-btn-focus: ${UI_PALETTE.focus};
          --zig-surface: ${UI_PALETTE.surface};
          --zig-surface-alt: ${UI_PALETTE.surfaceAlt};
          --zig-surface-highlight: ${UI_PALETTE.surfaceHighlight};
          --zig-ink: ${UI_PALETTE.ink};
          --zig-muted: ${UI_PALETTE.mutedInk};
          --zig-font-display: 'Baloo 2', 'Be Vietnam Pro', sans-serif;
          --zig-font-body: 'Be Vietnam Pro', sans-serif;
        }
        .game-popup-overlay {
          position: fixed;
          top: 0; left: 0;
          width: 100dvw; height: 100dvh;
          background: rgba(43, 50, 47, 0.64);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex; justify-content: center; align-items: center;
          z-index: 100000;
          opacity: 0;
          transition: opacity 0.25s ease;
          box-sizing: border-box;
          padding: 24px 16px;
          overflow-y: auto;
        }
        .game-popup-card {
          background: var(--zig-surface);
          border: 4px solid var(--zig-btn-border);
          box-shadow: inset 0 0 0 2px var(--zig-surface-highlight), 0 5px 0 #CDB7A3, 0 12px 25px rgba(64, 52, 66, 0.22);
          border-radius: 20px;
          padding: 36px 24px 20px 24px;
          width: 90%; max-width: 380px;
          text-align: center;
          position: relative;
          transform: scale(0.85);
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
          font-family: var(--zig-font-body);
          color: var(--zig-ink);
          box-sizing: border-box;
          opacity: 0;
        }
        .game-popup-card.wide {
          max-width: 440px;
        }
        .game-popup-title {
          position: absolute;
          top: -25px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(180deg, var(--zig-btn-top) 0%, var(--zig-btn-bottom) 100%);
          border: none;
          border-radius: 14px;
          box-shadow: 0 5px 0 var(--zig-btn-base), 0 9px 18px rgba(93, 54, 34, 0.18);
          color: var(--zig-control-ink);
          font-family: var(--zig-font-display);
          font-size: 22px;
          font-weight: 800;
          letter-spacing: 0.5px;
          line-height: 1.1;
          padding: 8px 32px;
          text-shadow: 0 2px 0 rgba(164, 65, 37, 0.3);
          white-space: nowrap;
          text-transform: uppercase;
        }
        .game-popup-heading {
          margin: 20px 0;
          color: var(--zig-ink);
          font-family: var(--zig-font-display);
          font-size: 24px;
          font-weight: 800;
          line-height: 1.25;
        }
        .game-record-badge {
          display: inline-block;
          margin-bottom: 8px;
          padding: 4px 8px;
          color: var(--zig-btn-bottom);
          font-family: var(--zig-font-display);
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 0.3px;
        }
        .game-result-emblem {
          margin: 20px 0 8px;
          color: var(--zig-btn-bottom);
          font-family: var(--zig-font-display);
          font-size: 58px;
          font-weight: 800;
          line-height: 1;
          text-shadow: 0 4px 0 #FFD3AD;
        }
        .game-result-score {
          margin: 8px 0;
          color: var(--zig-ink);
          font-family: var(--zig-font-display);
          font-size: 48px;
          font-weight: 800;
          line-height: 1;
          text-shadow: 0 3px 0 #E5D6CA;
        }
        .game-result-message {
          color: var(--zig-muted);
          font-family: var(--zig-font-body);
          font-size: 15px;
          font-weight: 700;
          line-height: 1.4;
        }
        .game-popup-close-btn {
          position: absolute;
          top: -18px;
          right: -18px;
          width: 44px;
          height: 44px;
          border: none;
          border-radius: 50%;
          background: linear-gradient(180deg, var(--zig-btn-top), var(--zig-btn-bottom));
          box-shadow: 0 5px 0 var(--zig-btn-base), 0 8px 14px rgba(64, 52, 66, 0.18);
          color: var(--zig-control-ink);
          font-family: 'Be Vietnam Pro', sans-serif;
          font-size: 21px;
          font-weight: 800;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          cursor: pointer;
          transition: transform 0.1s ease-out, box-shadow 0.1s ease-out, filter 0.1s ease-out;
          z-index: 100100;
        }
        .game-popup-close-btn:hover {
          transform: translateY(-1px);
          filter: brightness(1.025);
        }
        .game-popup-close-btn:active {
          transform: translateY(4px);
          box-shadow: 0 1px 0 var(--zig-btn-base);
        }
        .game-popup-close-btn:focus-visible,
        .game-action-btn:focus-visible,
        .game-skip-btn:focus-visible,
        .game-settings-reset-btn:focus-visible,
        .game-achievements-arrow-btn:focus-visible {
          outline: 3px solid var(--zig-btn-focus);
          outline-offset: 3px;
        }
        .game-settings-row-container {
          margin-top: 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }
        .game-settings-row {
          background: var(--zig-surface-alt);
          border: 3.5px solid var(--zig-surface-highlight);
          border-radius: 15px;
          padding: 10px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-sizing: border-box;
          height: 62px;
        }
        .game-settings-label {
          font-family:'Be Vietnam Pro', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: var(--zig-ink);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .game-settings-toggle-btn {
          width: 68px;
          height: 42px;
          border: none;
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          background-color: transparent;
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        .game-settings-toggle-btn:hover {
          transform: scale(1.06);
        }
        .game-settings-toggle-btn:active {
          transform: scale(0.95);
        }
        .game-action-btn,
        .game-settings-reset-btn {
          background: linear-gradient(180deg, var(--zig-btn-top) 0%, var(--zig-btn-bottom) 100%);
          border: none;
          box-shadow: 0 6px 0 var(--zig-btn-base), 0 9px 16px rgba(93, 54, 34, 0.18);
          border-radius: 12px;
          color: var(--zig-control-ink);
          font-family:'Be Vietnam Pro', sans-serif;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.1s ease-out, box-shadow 0.1s ease-out, filter 0.1s ease-out;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .game-action-btn {
          min-width: 200px;
          min-height: 56px;
          padding: 12px 32px;
          font-size: 26px;
        }
        .game-skip-btn {
          min-width: 160px;
          min-height: 44px;
          padding: 8px 12px;
          border: 0;
          background: transparent;
          box-shadow: none;
          color: var(--zig-muted);
          font-family: 'Be Vietnam Pro', sans-serif;
          font-size: 14px;
          font-weight: 700;
          text-decoration: underline;
          text-decoration-thickness: 1px;
          text-underline-offset: 3px;
          cursor: pointer;
          transition: color 0.1s ease-out, transform 0.1s ease-out;
        }
        .game-settings-reset-btn {
          font-size: 14px;
          padding: 10px 20px;
          margin-top: 20px;
        }
        .game-settings-reset-icon {
          width: 24px;
          height: 24px;
          object-fit: contain;
        }
        .game-action-btn:hover,
        .game-settings-reset-btn:hover {
          transform: translateY(-1px);
          filter: brightness(1.025);
        }
        .game-skip-btn:hover {
          color: var(--zig-btn-ink);
          transform: translateY(-1px);
        }
        .game-action-btn:active,
        .game-settings-reset-btn:active {
          transform: translateY(5px);
          box-shadow: 0 1px 0 var(--zig-btn-base);
        }
        .game-skip-btn:active {
          transform: translateY(1px);
        }

        /* Paused popup */
        .game-paused-action-container {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 30px;
          flex-wrap: nowrap;
        }
        .game-paused-btn {
          width: 64px;
          height: 72px;
          flex: 0 0 64px;
          border: none;
          background-size: 100% 100%;
          background-repeat: no-repeat;
          background-position: center;
          background-color: transparent;
          cursor: pointer;
          transition: transform 0.1s ease-out, filter 0.1s ease-out;
        }
        .game-paused-btn:hover {
          transform: translateY(-1px);
          filter: brightness(1.025);
        }
        .game-paused-btn:active {
          transform: translateY(5px);
        }
        .game-paused-btn:focus-visible {
          outline: 3px solid var(--zig-btn-focus);
          outline-offset: 3px;
        }

        /* Achievements popup */
        .game-achievements-user-text {
          font-family:'Be Vietnam Pro', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: var(--zig-muted);
          margin: 10px 0;
          text-align: center;
        }
        .game-achievements-user-text.logged-in {
          color: var(--zig-success);
        }
        .game-achievements-level-selector {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 14px;
        }
        .game-achievements-arrow-btn {
          width: 44px;
          height: 44px;
          background: linear-gradient(180deg, var(--zig-secondary-top), var(--zig-secondary-bottom));
          border: none;
          border-radius: 12px;
          box-shadow: 0 5px 0 var(--zig-secondary-base);
          font-size: 22px;
          color: var(--zig-control-ink);
          cursor: pointer;
          transition: transform 0.1s ease-out, box-shadow 0.1s ease-out;
        }
        .game-achievements-arrow-btn:hover {
          transform: translateY(-1px);
        }
        .game-achievements-arrow-btn:active {
          transform: translateY(4px);
          box-shadow: 0 1px 0 var(--zig-secondary-base);
        }
        .game-achievements-level-name {
          font-family:'Be Vietnam Pro', sans-serif;
          font-size: 22px;
          font-weight: 800;
          color: var(--zig-ink);
          min-width: 180px;
          text-align: center;
        }
        .game-achievements-table {
          width: 100%;
          margin-top: 16px;
          border-collapse: collapse;
          font-family:'Be Vietnam Pro', sans-serif;
        }
        .game-achievements-table th {
          position: sticky;
          top: 0;
          background: var(--zig-surface);
          z-index: 10;
          font-size: 12px;
          font-weight: 800;
          color: var(--zig-muted);
          padding: 8px 4px;
          border-bottom: 2px solid var(--zig-surface-highlight);
        }
        .game-achievements-table td {
          font-size: 12px;
          font-weight: 700;
          color: var(--zig-ink);
          padding: 8px 4px;
          text-align: center;
        }
        .game-achievements-table tr.highlighted td {
          color: var(--zig-btn-bottom);
          font-weight: 900;
        }
        .game-achievements-table tr.rank-0 td {
          color: var(--zig-btn-bottom);
          font-weight: 900;
        }
        .game-achievements-table tr.rank-1 td {
          color: var(--zig-ink);
          font-weight: 900;
        }
        .game-achievements-table tr.rank-2 td {
          color: var(--zig-muted);
          font-weight: 900;
        }
        .game-achievements-table tbody tr {
          border-bottom: 1px solid var(--zig-surface-highlight);
        }
        .game-achievements-table tbody tr:last-child {
          border-bottom: none;
        }
        .game-achievements-table-container {
          max-height: min(350px, 50vh);
          overflow-y: auto;
          margin-top: 10px;
          padding-right: 4px;
        }
        .game-achievements-table-container::-webkit-scrollbar {
          width: 6px;
        }
        .game-achievements-table-container::-webkit-scrollbar-track {
          background: var(--zig-surface-alt);
          border-radius: 4px;
        }
        .game-achievements-table-container::-webkit-scrollbar-thumb {
          background: #C8B8AA;
          border-radius: 4px;
        }
        /* Footer personal best */
        .game-achievements-footer {
          margin-top: 14px;
          background: #FFF0E1;
          border: 2px solid var(--zig-btn-border);
          border-radius: 12px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 48px;
          box-sizing: border-box;
          font-family:'Be Vietnam Pro', sans-serif;
        }
        .game-achievements-footer-item {
          font-size: 13px;
          font-weight: 900;
          color: var(--zig-btn-bottom);
          width: 33%;
          text-align: center;
        }
        .game-achievements-footer-item:first-child {
          text-align: left;
        }
        .game-achievements-footer-item:last-child {
          text-align: right;
        }
      `;
      document.head.appendChild(style);
    }
  }
}
