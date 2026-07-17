import re
with open('src/ui/UIManager.js', 'r', encoding='utf-8') as f:
    content = f.read()

def replacer_wide(m):
    return '''  createWideButtonTexture(text, width = 240, height = 72, color = "orange") {
    const radius = height / 2;
    const strokeWidth = Math.max(3, radius * 0.15);
    const padX = strokeWidth + 2;
    const padY = strokeWidth + 2;

    const canvasW = width + padX * 2;
    const canvasH = height + height * 0.15 + padY * 2;

    const texture = this.createTextureFromCanvas(
      (ctx, cw, ch) => {
        let colorTop, colorBot, colorShadow;
        if (color === "green") {
          colorTop = "#66BB6A"; colorBot = "#43A047"; colorShadow = "#2e7d32";
        } else if (color === "orange") {
          colorTop = "#FF7043"; colorBot = "#F4511E"; colorShadow = "#D84315";
        } else if (color === "blue") {
          colorTop = "#4FC3F7"; colorBot = "#039BE5"; colorShadow = "#0277BD";
        } else if (color === "red") {
          colorTop = "#E53935"; colorBot = "#E53935"; colorShadow = "#C62828";
        } else { // yellow
          colorTop = "#FFF176"; colorBot = "#FBC02D"; colorShadow = "#F57F17";
        }

        ctx.translate(padX, padY);
        const w = width;
        const h = height;

        // 1. Solid Shadow
        ctx.fillStyle = colorShadow;
        ctx.beginPath();
        ctx.roundRect(0, h * 0.15, w, h, radius);
        ctx.fill();

        // 2. Main Face Background
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, colorTop);
        gradient.addColorStop(1, colorBot);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(0, 0, w, h, radius);
        ctx.fill();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = strokeWidth;
        ctx.stroke();

        // Text with Stroke
        ctx.font = '900 ' + Math.max(16, radius * 0.9) + 'px "Fredoka", "Baloo 2", "Be Vietnam Pro", sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.lineWidth = 5;
        ctx.strokeStyle = colorShadow;
        ctx.lineJoin = "round";
        ctx.strokeText(text, w / 2, h / 2);

        ctx.fillStyle = "#ffffff";
        ctx.fillText(text, w / 2, h / 2);
      },
      canvasW,
      canvasH
    );
    return { texture, canvasW, canvasH };
  }'''

content = re.sub(r'  createWideButtonTexture\(text, width = 240, height = 72, color = "orange"\) \{.*?(?=\n  createWideButton\()', replacer_wide, content, flags=re.DOTALL)

def replacer_widebtn(m):
    return '''  createWideButton(text, onClick, color = "orange") {
    const w = 240;
    const h = 72;
    const { texture, canvasW, canvasH } = this.createWideButtonTexture(text, w, h, color);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);

    sprite.scale.set(canvasW, canvasH, 1);
    sprite.onClick = onClick;

    sprite.onHoverEnter = () => {};
    sprite.onHoverLeave = () => {};

    this.interactiveObjects.push(sprite);
    return sprite;
  }'''

content = re.sub(r'  createWideButton\(text, onClick, color = "orange"\) \{.*?(?=\n  createIconButton\()', replacer_widebtn, content, flags=re.DOTALL)

def replacer_icon(m):
    return '''  createIconButton(iconName, onClick, scale = 60, theme = "blue") {
    const w = scale * 1.2;
    const h = scale * 1.2;
    const radius = w / 2;
    const strokeWidth = Math.max(3, radius * 0.15);
    const pad = strokeWidth + 2;

    const canvasW = w + pad * 2;
    const canvasH = h + h * 0.15 + pad * 2;

    const texture = this.createTextureFromCanvas(
      (ctx, cw, ch) => {
        let colorTop, colorBot, colorShadow;
        if (theme === "green") {
          colorTop = "#66BB6A"; colorBot = "#43A047"; colorShadow = "#2e7d32";
        } else if (theme === "orange") {
          colorTop = "#FF7043"; colorBot = "#F4511E"; colorShadow = "#D84315";
        } else if (theme === "blue") {
          colorTop = "#4FC3F7"; colorBot = "#039BE5"; colorShadow = "#0277BD";
        } else if (theme === "red") {
          colorTop = "#E53935"; colorBot = "#E53935"; colorShadow = "#C62828";
        } else {
          // yellow
          colorTop = "#FFF176"; colorBot = "#FBC02D"; colorShadow = "#F57F17";
        }

        ctx.translate(pad, pad);

        ctx.fillStyle = colorShadow;
        ctx.beginPath();
        ctx.arc(radius, radius + radius * 0.15, radius, 0, Math.PI * 2);
        ctx.fill();

        const gradient = ctx.createLinearGradient(0, 0, 0, w);
        gradient.addColorStop(0, colorTop);
        gradient.addColorStop(1, colorBot);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(radius, radius, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = strokeWidth;
        ctx.stroke();

        const ICONS = {
          home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
          setting: "M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z",
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
          ctx.translate(radius, radius);
          const iconScale = (w * 0.6) / 24;
          ctx.scale(iconScale, iconScale);
          ctx.translate(-12, -12);
          ctx.fillStyle = "#ffffff";
          ctx.fill(p);
          ctx.restore();
        } else {
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(radius, radius, radius * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      },
      canvasW,
      canvasH
    );

    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);

    sprite.scale.set(canvasW, canvasH, 1);
    sprite.onClick = onClick;

    sprite.onHoverEnter = () => {};
    sprite.onHoverLeave = () => {};
    this.interactiveObjects.push(sprite);

    return sprite;
  }'''

content = re.sub(r'  createIconButton\(iconName, onClick, scale = 60, theme = "blue"\) \{.*?(?=\n  createToggleSprite)', replacer_icon, content, flags=re.DOTALL)

with open('src/ui/UIManager.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated successfully")
