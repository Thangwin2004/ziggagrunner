import * as THREE from "three";
import gsap from "gsap";

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

    domElement.addEventListener("pointermove", this.onPointerMove.bind(this));
    domElement.addEventListener("pointerdown", this.onPointerDown.bind(this));
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
      intersects[0].object.onClick();
      // On mobile, interacting with UI shouldn't trigger game jump
      this.isHoveringUI = true;
    } else {
      this.isHoveringUI = false;
    }
  }

  makePopupResponsive(overlay, card) {
    const handleResize = () => {
      const scale = Math.min(
        1.0,
        window.innerWidth / 450,
        window.innerHeight / 650,
      );
      card.style.zoom = scale;
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
      if (child.material && child.material.map) child.material.map.dispose();
      if (child.material) child.material.dispose();
      this.activeGroup.remove(child);
    }
    while (this.hudGroup.children.length > 0) {
      const child = this.hudGroup.children[0];
      if (child.material && child.material.map) child.material.map.dispose();
      if (child.material) child.material.dispose();
      this.hudGroup.remove(child);
    }
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

  createWideButtonTexture(text, width = 240, height = 72, color = "green") {
    return this.createTextureFromCanvas(
      (ctx, w, h) => {
        // Base shadow color
        ctx.fillStyle = color === "green" ? "#AB47BC" : "#AB47BC";
        ctx.beginPath();
        ctx.roundRect(0, 10, w, h - 10, h / 2);
        ctx.fill();

        // Gradient Base
        const gradient = ctx.createLinearGradient(0, 0, 0, h - 10);
        if (color === "green") {
          gradient.addColorStop(0, "#E1BEE7");
          gradient.addColorStop(1, "#AB47BC");
        } else {
          gradient.addColorStop(0, "#E1BEE7");
          gradient.addColorStop(1, "#AB47BC");
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(0, 0, w, h - 10, h / 2);
        ctx.fill();

        // Thick White Stroke
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 4;
        ctx.stroke();

        // Sheen highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.beginPath();
        ctx.ellipse(
          w / 2,
          (h - 10) * 0.2,
          w * 0.35,
          (h - 10) * 0.2,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        // Text with Stroke
        ctx.font = '900 22px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.lineWidth = 6;
        ctx.strokeStyle = "#000000";
        ctx.lineJoin = "round";
        ctx.strokeText(text, w / 2, (h - 10) / 2);

        ctx.fillStyle = "#ffffff";
        ctx.fillText(text, w / 2, (h - 10) / 2);
      },
      width,
      height,
    );
  }

  createWideButton(text, onClick, color = "green") {
    const texture = this.createWideButtonTexture(text, 240, 72, color);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);

    sprite.scale.set(240, 72, 1);
    sprite.onClick = onClick;

    sprite.onHoverEnter = () => {
      gsap.to(sprite.scale, { x: 252, y: 75.6, duration: 0.1 });
    };
    sprite.onHoverLeave = () => {
      gsap.to(sprite.scale, { x: 240, y: 72, duration: 0.1 });
    };

    this.interactiveObjects.push(sprite);
    return sprite;
  }

  createIconButton(texturePath, onClick, scale = 60) {
    const texture = new THREE.TextureLoader().load(texturePath);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);

    sprite.scale.set(scale, scale, 1);
    sprite.onClick = onClick;

    sprite.onHoverEnter = () =>
      gsap.to(sprite.scale, { x: scale * 1.1, y: scale * 1.1, duration: 0.1 });
    sprite.onHoverLeave = () =>
      gsap.to(sprite.scale, { x: scale, y: scale, duration: 0.1 });
    this.interactiveObjects.push(sprite);

    return sprite;
  }

  createToggleSprite(isOn, onClick) {
    const w = 90,
      h = 40;

    const texOn = new THREE.TextureLoader().load(
      "/assest/iconbtn/toggle_on.png",
    );
    texOn.colorSpace = THREE.SRGBColorSpace;

    const texOff = new THREE.TextureLoader().load(
      "/assest/iconbtn/toggle_off.png",
    );
    texOff.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.SpriteMaterial({ map: isOn ? texOn : texOff });
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
    ribbonColor = "blue",
    borderStyle = "white",
    outerStrokeColor = "#7B1FA2",
  ) {
    return this.createTextureFromCanvas(
      (ctx, w, h) => {
        const pad = 30;
        const cardW = w - pad * 2;
        const cardH = h - pad * 2;

        // Shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
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
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.roundRect(pad, pad, cardW, cardH, 20);
          ctx.fill();

          // Yellow Inner Stroke
          ctx.strokeStyle = "#E1BEE7";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(pad + 6, pad + 6, cardW - 12, cardH - 12, 14);
          ctx.stroke();

          // Inner Card Face
          ctx.fillStyle = "#F3E5F5";
          ctx.beginPath();
          ctx.roundRect(pad + 8, pad + 8, cardW - 16, cardH - 16, 12);
          ctx.fill();
        } else {
          // Dark Purple (Leaderboard style)
          ctx.fillStyle = "#4A148C";
          ctx.beginPath();
          ctx.roundRect(pad, pad + 8, cardW, cardH, 20);
          ctx.fill();
          ctx.fillStyle = "#7B1FA2";
          ctx.beginPath();
          ctx.roundRect(pad, pad, cardW, cardH, 20);
          ctx.fill();
          ctx.strokeStyle = "#E1BEE7";
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.fillStyle = "#F3E5F5";
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
        if (ribbonColor === "pink") {
          rGrad.addColorStop(0, "#E1BEE7");
          rGrad.addColorStop(1, "#AB47BC");
          ctx.fillStyle = "#7B1FA2";
          ctx.strokeStyle = "#F3E5F5";
        } else {
          // blue
          rGrad.addColorStop(0, "#E1BEE7");
          rGrad.addColorStop(1, "#AB47BC");
          ctx.fillStyle = "#7B1FA2";
          ctx.strokeStyle = "#ffffff";
        }

        ctx.beginPath();
        ctx.roundRect(ribbonX, ribbonY + 6, ribbonW, ribbonH, 12);
        ctx.fill(); // Shadow

        ctx.fillStyle = rGrad;
        ctx.beginPath();
        ctx.roundRect(ribbonX, ribbonY, ribbonW, ribbonH, 12);
        ctx.fill(); // Base

        ctx.lineWidth = 2.5;
        ctx.stroke(); // Stroke

        ctx.font = '900 22px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Shadow / Stroke
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#000000";
        ctx.lineJoin = "round";
        ctx.strokeText(title, w / 2, ribbonY + ribbonH / 2 + 2);

        ctx.fillStyle = "#ffffff";
        ctx.fillText(title, w / 2, ribbonY + ribbonH / 2 + 2);
      },
      width + 60,
      height + 60,
    );
  }

  showMainMenu(stats) {
    this.clear();
    const highScore =
      stats && stats.highScore !== undefined ? stats.highScore : 0;

    const titleTex = this.createTextureFromCanvas(
      (ctx, w) => {
        const titleGrad = ctx.createLinearGradient(0, 0, 0, 150);
        titleGrad.addColorStop(0, "#E1BEE7");
        titleGrad.addColorStop(1, "#AB47BC");

        // Logo Title
        ctx.font = '900 60px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";

        ctx.lineWidth = 14;
        ctx.strokeStyle = "#7B1FA2";
        ctx.strokeText("HÀNH TRÌNH", w / 2, 50);

        ctx.fillStyle = titleGrad;
        ctx.fillText("HÀNH TRÌNH", w / 2, 50);

        // --- Line 2: ZIGZAG ---
        ctx.font = '900 84px "Segoe UI", Arial, sans-serif';
        ctx.lineWidth = 18;
        ctx.strokeStyle = "#7B1FA2";
        ctx.strokeText("ZIGZAG", w / 2, 135);

        ctx.fillStyle = titleGrad;
        ctx.fillText("ZIGZAG", w / 2, 135);

        // --- Subtitle ---
        ctx.font = '900 45px "Segoe UI", Arial, sans-serif';
        ctx.lineWidth = 10;
        ctx.strokeStyle = "#000000";
        ctx.strokeText("VÔ CỰC", w / 2, 205);

        ctx.fillStyle = "#ffffff";
        ctx.fillText("VÔ CỰC", w / 2, 205);

        // Yellow Line
        ctx.beginPath();
        ctx.moveTo(w / 2 - 200, 245);
        ctx.lineTo(w / 2 + 200, 245);
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#E1BEE7";
        ctx.stroke();

        // Highscore
        ctx.font = '900 28px "Segoe UI", Arial, sans-serif';
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#000000";
        ctx.strokeText("🏆 KỶ LỤC ĐIỂM: " + highScore, w / 2, 290);
        ctx.fillStyle = "#E1BEE7";
        ctx.fillText("🏆 KỶ LỤC ĐIỂM: " + highScore, w / 2, 290);
      },
      600,
      350,
    );
    const titleSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: titleTex }),
    );

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
    titleSprite.position.set(0, 130, 0);
    this.activeGroup.add(titleSprite);

    const playBtn = this.createWideButton(
      "CHƠI NGAY",
      () => {
        if (this.onPlay) this.onPlay();
      },
      "green",
    );
    playBtn.position.set(0, -60, 0);
    this.activeGroup.add(playBtn);

    const trophyBtn = this.createIconButton(
      "/assest/iconbtn/trophy_btn.png",
      () => {
        if (this.onAchievements) this.onAchievements();
      },
      70,
    );
    trophyBtn.position.set(-60, -160, 0);
    this.activeGroup.add(trophyBtn);

    const settingsBtn = this.createIconButton(
      "/assest/iconbtn/setting_btn.png",
      () => {
        if (this.onSettings) this.onSettings();
      },
      70,
    );
    settingsBtn.position.set(60, -160, 0);
    this.activeGroup.add(settingsBtn);
  }

  showSettings(isIngame = false) {
    this.clear();
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
    title.innerText = "CÀI ĐẶT GAME";
    card.appendChild(title);

    if (!isIngame) {
      const closeBtn = document.createElement("button");
      closeBtn.className = "game-popup-close-btn";
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
      row.style.cssText = `width:100%; height:70px; border-radius:12px; background:#fbfaf5; border:3px solid #fff; display:flex; justify-content:space-between; align-items:center; padding:0 20px; box-sizing:border-box; margin-bottom: 15px;`;
      
      const text = document.createElement("span");
      text.style.cssText = `font-family:'Fredoka', 'Baloo 2', 'Be Vietnam Pro', sans-serif; font-size:18px; font-weight:bold; color:#47363B; letter-spacing:0.8px; white-space:nowrap;`;
      text.innerText = label;

      const dots = document.createElement("div");
      dots.style.cssText = `flex:1; border-bottom: 4px dotted #c0bba0; margin: 0 15px; position:relative; top:5px;`;

      const toggle = document.createElement("div");
      const isMuted = !isEnabled;
      toggle.style.cssText = `width:96px; height:46px; border-radius:23px; background:${isMuted ? '#E8E3D8' : '#81C784'}; border:3px solid #fff; box-shadow: inset 0 3px 6px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.1); cursor:pointer; position:relative; transition: background 0.25s, transform 0.1s; flex-shrink:0; display:flex; align-items:center;`;
      
      const statusText = document.createElement("span");
      statusText.innerText = isMuted ? "OFF" : "ON";
      statusText.style.cssText = `color:#fff; font-family:'Impact', 'Arial Black', sans-serif; font-size:18px; position:absolute; width:100%; text-align:center; padding-right:${isMuted ? '0' : '32px'}; padding-left:${isMuted ? '32px' : '0'}; box-sizing:border-box; transition: padding 0.25s; text-shadow: 0 2px 3px rgba(0,0,0,0.4); pointer-events:none;`;

      const knob = document.createElement("div");
      knob.style.cssText = `width:36px; height:36px; border-radius:50%; background:#fff; position:absolute; top:2px; left:${isMuted ? '3px' : '51px'}; transition: left 0.25s cubic-bezier(0.3, 1.2, 0.5, 1); box-shadow: 0 3px 6px rgba(0,0,0,0.4); pointer-events:none;`;
      
      toggle.appendChild(statusText);
      toggle.appendChild(knob);

      toggle.onclick = () => {
        const newState = onToggle(); // Trả về trạng thái ENABLED sau khi toggle
        const nowMuted = !newState;
        toggle.style.background = nowMuted ? '#E8E3D8' : '#81C784';
        knob.style.left = nowMuted ? '3px' : '51px';
        statusText.innerText = nowMuted ? "OFF" : "ON";
        statusText.style.paddingRight = nowMuted ? '0' : '32px';
        statusText.style.paddingLeft = nowMuted ? '32px' : '0';
      };
      
      toggle.onmousedown = () => toggle.style.transform = "scale(0.92)";
      toggle.onmouseup = () => toggle.style.transform = "scale(1)";
      toggle.onmouseleave = () => toggle.style.transform = "scale(1)";

      row.appendChild(text);
      row.appendChild(dots);
      row.appendChild(toggle);
      return row;
    };

    if (this.musicOn === undefined) this.musicOn = true;
    if (this.sfxOn === undefined) this.sfxOn = true;

    // Music row
    const musicRow = createToggleRow("ÂM NHẠC", this.musicOn, () => {
      this.playClickSound();
      this.musicOn = !this.musicOn;
      if (this.onToggleMusic) this.onToggleMusic(this.musicOn);
      return this.musicOn;
    });
    rowContainer.appendChild(musicRow);

    // SFX row
    const sfxRow = createToggleRow("HIỆU ỨNG", this.sfxOn, () => {
      this.playClickSound();
      this.sfxOn = !this.sfxOn;
      if (this.onToggleSfx) this.onToggleSfx(this.sfxOn);
      return this.sfxOn;
    });
    rowContainer.appendChild(sfxRow);

    card.appendChild(rowContainer);

    if (isIngame) {
      const actionContainer = document.createElement("div");
      actionContainer.className = "game-paused-action-container";

      // Home
      const homeBtn = document.createElement("button");
      homeBtn.className = "game-paused-btn";
      homeBtn.style.backgroundImage = "url(/assest/iconbtn/Home_btn.png)";
      homeBtn.addEventListener("click", () => {
        this.playClickSound();
        overlay.remove();
        if (this.onHome) this.onHome();
        else this.showMainMenu();
      });
      actionContainer.appendChild(homeBtn);

      // Replay
      const replayBtn = document.createElement("button");
      replayBtn.className = "game-paused-btn";
      replayBtn.style.backgroundImage = "url(/assest/iconbtn/replay_btn.png)";
      replayBtn.addEventListener("click", () => {
        this.playClickSound();
        overlay.remove();
        if (this.onReplay) this.onReplay();
      });
      actionContainer.appendChild(replayBtn);

      // Continue
      const continueBtn = document.createElement("button");
      continueBtn.className = "game-paused-btn";
      continueBtn.style.backgroundImage =
        "url(/assest/iconbtn/continue_btn.png)";
      continueBtn.addEventListener("click", () => {
        this.playClickSound();
        overlay.remove();
        this.showHUD();
        if (this.onContinue) this.onContinue();
      });
      actionContainer.appendChild(continueBtn);

      card.appendChild(actionContainer);
    } else {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "game-settings-reset-btn";
      deleteBtn.innerHTML = `<img src="/assest/iconbtn/delete_btn.png" class="game-settings-reset-icon" alt="" /> XÓA LỊCH SỬ`;
      deleteBtn.addEventListener("click", () => {
        this.playClickSound();
        window.localStorage.clear();
        overlay.style.opacity = "0";
        card.style.transform = "scale(0.85)";
        setTimeout(() => {
          overlay.remove();
          if (this.onHome) this.onHome();
          else this.showMainMenu();
        }, 250);
      });
      card.appendChild(deleteBtn);
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
    title.innerText = "KẾT THÚC";
    card.appendChild(title);

    // Emblem Star
    const emblem = document.createElement("div");
    emblem.style.fontSize = "54px";
    emblem.style.margin = "20px 0 10px 0";
    emblem.innerText = "⭐";
    card.appendChild(emblem);

    const isHigh = score > highScore && score > 0;

    if (isHigh) {
      const newRecord = document.createElement("div");
      newRecord.style.background = "#AB47BC";
      newRecord.style.border = "2px solid #E1BEE7";
      newRecord.style.borderRadius = "8px";
      newRecord.style.color = "#ffffff";
      newRecord.style.fontWeight = "900";
      newRecord.style.padding = "4px 12px";
      newRecord.style.display = "inline-block";
      newRecord.style.fontSize = "16px";
      newRecord.style.marginBottom = "10px";
      newRecord.innerText = "KỶ LỤC MỚI!";
      card.appendChild(newRecord);
    }

    const scoreVal = document.createElement("div");
    scoreVal.style.fontSize = "26px";
    scoreVal.style.fontWeight = "900";
    scoreVal.style.color = "#4A148C";
    scoreVal.style.margin = "10px 0";
    scoreVal.innerText = `ĐIỂM SỐ: ${score}`;
    card.appendChild(scoreVal);

    const msgVal = document.createElement("div");
    msgVal.style.fontSize = "16px";
    msgVal.style.fontWeight = "800";
    msgVal.style.color = "#7B1FA2";
    msgVal.innerText = isHigh
      ? "🏆 KỶ LỤC MỚI! HẠNG #1"
      : "Chúc bạn may mắn lần sau!";
    card.appendChild(msgVal);

    const actionContainer = document.createElement("div");
    actionContainer.className = "game-paused-action-container";

    // (Revive button removed from here, it's now in the Revive Offer popup)

    // x2 score
    if (canDoubleReward) {
      const x2Btn = document.createElement("button");
      x2Btn.className = "game-paused-btn";
      x2Btn.style.backgroundImage = "url(/assest/iconbtn/x2_btn.png)";
      x2Btn.addEventListener("click", () => {
        this.playClickSound();
        overlay.remove();
        if (this.onDoubleReward) this.onDoubleReward();
      });
      actionContainer.appendChild(x2Btn);
    }

    // Replay
    const replayBtn = document.createElement("button");
    replayBtn.className = "game-paused-btn";
    replayBtn.style.backgroundImage = "url(/assest/iconbtn/replay_btn.png)";
    replayBtn.addEventListener("click", () => {
      this.playClickSound();
      overlay.remove();
      if (this.onReplay) this.onReplay();
    });
    actionContainer.appendChild(replayBtn);

    // Home
    const homeBtn = document.createElement("button");
    homeBtn.className = "game-paused-btn";
    homeBtn.style.backgroundImage = "url(/assest/iconbtn/Home_btn.png)";
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
    title.innerText = "HỒI SINH";
    card.appendChild(title);

    const question = document.createElement("div");
    question.style.fontSize = "22px";
    question.style.fontWeight = "900";
    question.style.color = "#4A148C";
    question.style.margin = "20px 0";
    question.innerText = "Bạn có muốn tiếp tục?";
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
    btnContainer.style.gap = "15px";

    const yesBtn = document.createElement("button");
    yesBtn.style.background = "linear-gradient(to bottom, #E1BEE7, #AB47BC)";
    yesBtn.style.border = "none";
    yesBtn.style.borderRadius = "12px";
    yesBtn.style.padding = "10px 60px";
    yesBtn.style.color = "white";
    yesBtn.style.fontSize = "26px";
    yesBtn.style.fontWeight = "900";
    yesBtn.style.fontFamily = '"Segoe UI", Arial, sans-serif';
    yesBtn.style.cursor = "pointer";
    yesBtn.style.display = "flex";
    yesBtn.style.alignItems = "center";
    yesBtn.style.justifyContent = "center";
    yesBtn.style.boxShadow = "0 6px 0 #7B1FA2, 0 8px 10px rgba(0,0,0,0.3)";
    yesBtn.style.transition = "transform 0.1s, box-shadow 0.1s";

    // Add video icon
    const videoIcon = document.createElement("img");
    videoIcon.src = "/assest/iconbtn/images.png";
    videoIcon.style.height = "30px";
    videoIcon.style.width = "auto";
    videoIcon.style.marginRight = "15px";
    yesBtn.appendChild(videoIcon);

    const yesText = document.createElement("span");
    yesText.innerText = "CÓ";
    yesText.style.textShadow = "0 2px 4px rgba(0,0,0,0.3)";
    yesBtn.appendChild(yesText);

    // Click effect for yesBtn
    yesBtn.addEventListener("mousedown", () => {
      yesBtn.style.transform = "translateY(6px)";
      yesBtn.style.boxShadow = "0 0px 0 #7B1FA2, 0 2px 5px rgba(0,0,0,0.3)";
    });
    yesBtn.addEventListener("mouseup", () => {
      yesBtn.style.transform = "translateY(0)";
      yesBtn.style.boxShadow = "0 6px 0 #7B1FA2, 0 8px 10px rgba(0,0,0,0.3)";
    });
    yesBtn.addEventListener("mouseleave", () => {
      yesBtn.style.transform = "translateY(0)";
      yesBtn.style.boxShadow = "0 6px 0 #7B1FA2, 0 8px 10px rgba(0,0,0,0.3)";
    });

    yesBtn.addEventListener("click", () => {
      this.playClickSound();
      overlay.remove();
      if (onRevive) onRevive();
    });
    btnContainer.appendChild(yesBtn);

    const noText = document.createElement("div");
    noText.innerText = "Không, cảm ơn";
    noText.style.fontSize = "16px";
    noText.style.fontWeight = "800";
    noText.style.color = "#888888";
    noText.style.textDecoration = "underline";
    noText.style.cursor = "pointer";
    noText.style.padding = "5px";
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
          ctx.font = '900 28px "Segoe UI", Arial, sans-serif';
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.lineWidth = 4;
          ctx.strokeStyle = "#000000";
          ctx.lineJoin = "round";
          ctx.strokeText(text, 5, h / 2);
          ctx.fillStyle = "#ffffff";
          ctx.fillText(text, 5, h / 2);
        },
        200,
        40,
      );
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex }));
      sprite.scale.set(200, 40, 1);
      return sprite;
    };

    this.scoreSprite = createTextSprite("ĐIỂM: 0");
    this.scoreSprite.position.set(
      -window.innerWidth / 2 + 120,
      window.innerHeight / 2 - 40,
      0,
    );
    this.hudGroup.add(this.scoreSprite);

    const settingsBtn = this.createIconButton(
      "/assest/iconbtn/setting_btn.png",
      () => {
        if (this.onSettings) this.onSettings();
      },
      50,
    );
    settingsBtn.position.set(
      window.innerWidth / 2 - 50,
      window.innerHeight / 2 - 50,
      0,
    );
    this.hudGroup.add(settingsBtn);

    // Tutorial Text (Center Screen)
    const tutTex = this.createTextureFromCanvas(
      (ctx, w, h) => {
        ctx.font = '900 26px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 6;
        ctx.lineJoin = "round";
        ctx.strokeText("CHẠM ĐỂ BẺ LÁI!", w / 2, h / 2);
        ctx.fillText("CHẠM ĐỂ BẺ LÁI!", w / 2, h / 2);
      },
      400,
      60,
    );
    const tutSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tutTex }),
    );
    tutSprite.scale.set(400, 60, 1);
    tutSprite.position.set(0, window.innerHeight / 2 - 120, 0);
    this.hudGroup.add(tutSprite);

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
        if (tutSprite.material.map) tutSprite.material.map.dispose();
        tutSprite.material.dispose();
      },
    });
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
          ctx.font = '900 28px "Segoe UI", Arial, sans-serif';
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.lineWidth = 4;
          ctx.strokeStyle = "#000000";
          ctx.lineJoin = "round";
          ctx.strokeText(text, 5, h / 2);
          ctx.fillStyle = "#ffffff";
          ctx.fillText(text, 5, h / 2);
        },
        200,
        40,
      );
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex }));
      sprite.scale.set(200, 40, 1);
      return sprite;
    };

    this.scoreSprite = createTextSprite("ĐIỂM: " + score);
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
    title.innerText = "BẢNG VÀNG";
    card.appendChild(title);

    const closeBtn = document.createElement("button");
    closeBtn.className = "game-popup-close-btn";
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

    const userText = document.createElement("div");
    userText.className = "game-achievements-user-text";
    userText.innerText = "Tài khoản: Khách (Điểm lưu thiết bị)";
    card.appendChild(userText);

    const personalScore = stats?.highScore || 0;

    let rankings = [
      { name: "Lạc Lạc", score: 9999 },
      { name: "Bé Lạc", score: 8500 },
      { name: "Trưởng Bản", score: 7200 },
      { name: "Người Lạ", score: 5000 },
      { name: "Dân Làng", score: 3000 },
      { name: "Khách", score: 1500 },
      { name: "Gà Con", score: 100 },
    ];

    if (personalScore > 0) {
      rankings = rankings.filter((r) => r.name !== "Khách");
      rankings.push({
        name: "Bạn (Khách)",
        score: personalScore,
        isPlayer: true,
      });
    }

    rankings.sort((a, b) => b.score - a.score);
    rankings = rankings.slice(0, 7);

    rankings.forEach((r, i) => {
      if (i === 0) r.medal = "🥇";
      else if (i === 1) r.medal = "🥈";
      else if (i === 2) r.medal = "🥉";
      else r.medal = (i + 1).toString();
    });

    const tableContainer = document.createElement("div");
    tableContainer.className = "game-achievements-table-container";

    const table = document.createElement("table");
    table.className = "game-achievements-table";

    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th style="text-align: left; padding-left: 10px;">HẠNG</th>
        <th style="text-align: center;">TÊN</th>
        <th style="text-align: right; padding-right: 10px;">ĐIỂM SỐ</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    rankings.forEach((r, i) => {
      const row = document.createElement("tr");
      if (i < 3) row.className = `rank-${i}`;
      if (r.isPlayer) row.classList.add("highlighted");
      row.innerHTML = `
        <td style="text-align: left; padding-left: 20px;">${r.medal}</td>
        <td style="text-align: center;">${r.name}</td>
        <td style="text-align: right; padding-right: 10px;">${r.score}</td>
      `;
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    tableContainer.appendChild(table);
    card.appendChild(tableContainer);

    // Personal Best Footer
    const footer = document.createElement("div");
    footer.className = "game-achievements-footer";

    const rankItem = document.createElement("div");
    rankItem.className = "game-achievements-footer-item";
    rankItem.style.width = "50%";
    rankItem.innerText = "PB: Bạn (Khách)";
    footer.appendChild(rankItem);

    const scoreItem = document.createElement("div");
    scoreItem.className = "game-achievements-footer-item";
    scoreItem.style.width = "50%";
    scoreItem.innerText = `Điểm: ${personalScore}`;
    footer.appendChild(scoreItem);

    card.appendChild(footer);

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
        .game-popup-overlay {
          position: fixed;
          top: 0; left: 0;
          width: 100dvw; height: 100dvh;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex; justify-content: center; align-items: center;
          z-index: 100000;
          opacity: 0;
          transition: opacity 0.25s ease;
          box-sizing: border-box;
        }
        .game-popup-card {
          background: #fffae6;
          border: 5px solid #d32f2f;
          box-shadow: inset 0 0 0 2.5px #E1BEE7, 0 6px 0 #8a0000, 0 12px 25px rgba(0, 0, 0, 0.35);
          border-radius: 20px;
          padding: 36px 24px 20px 24px;
          width: 90%; max-width: 380px;
          text-align: center;
          position: relative;
          transform: scale(0.85);
          transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.25s ease;
          font-family: 'Be Vietnam Pro', sans-serif;
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
          background: linear-gradient(180deg, #ff6b6b 0%, #d32f2f 100%);
          border: 2.5px solid #fff8b3;
          border-radius: 12px;
          box-shadow: 0 4px 0 #8a0000;
          color: #ffffff;
          font-family: 'Be Vietnam Pro', sans-serif;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: 1.5px;
          padding: 6px 32px;
          text-shadow: 0 2px 2px rgba(0, 0, 0, 0.3);
          white-space: nowrap;
          text-transform: uppercase;
        }
        .game-popup-close-btn {
          position: absolute;
          top: -16px;
          right: -16px;
          width: 40px;
          height: 40px;
          border: none;
          background: url(/assest/iconbtn/close_btn.png) no-repeat center center;
          background-size: contain;
          cursor: pointer;
          transition: transform 0.15s ease;
          z-index: 100100;
        }
        .game-popup-close-btn:hover {
          transform: scale(1.1);
        }
        .game-popup-close-btn:active {
          transform: scale(0.92);
        }
        .game-settings-row-container {
          margin-top: 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }
        .game-settings-row {
          background: #ffffff;
          border: 3.5px solid #ffccbc;
          border-radius: 15px;
          padding: 10px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-sizing: border-box;
          height: 62px;
        }
        .game-settings-label {
          font-family: 'Be Vietnam Pro', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: #5c0612;
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
        .game-settings-reset-btn {
          background: linear-gradient(180deg, #ff6b6b 0%, #d32f2f 100%);
          border: none;
          box-shadow: 0 4px 0 #8a0000;
          border-radius: 12px;
          color: #ffffff;
          font-family: 'Be Vietnam Pro', sans-serif;
          font-size: 14px;
          font-weight: 800;
          padding: 10px 20px;
          cursor: pointer;
          margin-top: 20px;
          transition: transform 0.1s ease, filter 0.1s ease;
          text-shadow: 0 1px 2px rgba(0,0,0,0.4);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .game-settings-reset-icon {
          width: 24px;
          height: 24px;
          object-fit: contain;
        }
        .game-settings-reset-btn:hover {
          transform: scale(1.05);
          filter: brightness(1.05);
        }
        .game-settings-reset-btn:active {
          transform: translateY(2px);
          box-shadow: 0 2px 0 #8a0000;
        }

        /* Paused popup */
        .game-paused-action-container {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 20px;
          margin-top: 24px;
        }
        .game-paused-btn {
          width: 52px;
          height: 52px;
          border: none;
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          background-color: transparent;
          cursor: pointer;
          transition: transform 0.15s ease, filter 0.15s ease;
        }
        .game-paused-btn:hover {
          transform: scale(1.1);
        }
        .game-paused-btn:active {
          transform: scale(0.92);
        }

        /* Achievements popup */
        .game-achievements-user-text {
          font-family: 'Be Vietnam Pro', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #5c0612;
          margin: 10px 0;
          text-align: center;
        }
        .game-achievements-user-text.logged-in {
          color: #d32f2f;
        }
        .game-achievements-level-selector {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 14px;
        }
        .game-achievements-arrow-btn {
          background: none;
          border: none;
          font-size: 22px;
          color: #d32f2f;
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        .game-achievements-arrow-btn:hover {
          transform: scale(1.2);
        }
        .game-achievements-level-name {
          font-family: 'Be Vietnam Pro', sans-serif;
          font-size: 22px;
          font-weight: 800;
          color: #e53935;
          min-width: 180px;
          text-align: center;
        }
        .game-achievements-table {
          width: 100%;
          margin-top: 16px;
          border-collapse: collapse;
          font-family: 'Be Vietnam Pro', sans-serif;
        }
        .game-achievements-table th {
          position: sticky;
          top: 0;
          background: #fffae6;
          z-index: 10;
          font-size: 12px;
          font-weight: 800;
          color: #5c0612;
          padding: 8px 4px;
          border-bottom: 2px solid #ffccbc;
        }
        .game-achievements-table td {
          font-size: 12px;
          font-weight: 700;
          color: #5c0612;
          padding: 8px 4px;
          text-align: center;
        }
        .game-achievements-table tr.highlighted td {
          color: #d32f2f;
          font-weight: 900;
        }
        .game-achievements-table tr.rank-0 td {
          color: #8a6d20;
          font-weight: 900;
        }
        .game-achievements-table tr.rank-1 td {
          color: #5a5a5a;
          font-weight: 900;
        }
        .game-achievements-table tr.rank-2 td {
          color: #8c5a3c;
          font-weight: 900;
        }
        .game-achievements-table tbody tr {
          border-bottom: 1px solid #ffebe6;
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
          background: #f1ebd8;
          border-radius: 4px;
        }
        .game-achievements-table-container::-webkit-scrollbar-thumb {
          background: #c5beaa;
          border-radius: 4px;
        }
        /* Footer personal best */
        .game-achievements-footer {
          margin-top: 14px;
          background: #fff3cd;
          border: 2px solid #E1BEE7;
          border-radius: 12px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 48px;
          box-sizing: border-box;
          font-family: 'Be Vietnam Pro', sans-serif;
        }
        .game-achievements-footer-item {
          font-size: 13px;
          font-weight: 900;
          color: #d32f2f;
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
