import re
with open('src/ui/UIManager.js', 'r', encoding='utf-8') as f:
    content = f.read()

def replacer_wide(m):
    return '''  createWideButtonTexture(text, width = 240, height = 72, color = "yellow") {
    const radius = height / 2;
    const strokeWidth = Math.max(3, radius * 0.15);
    const padX = strokeWidth + 2;
    const padY = strokeWidth + 2;

    const canvasW = width + padX * 2;
    const canvasH = height + height * 0.15 + padY * 2;

    const texture = this.createTextureFromCanvas(
      (ctx) => {
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

content = re.sub(r'  createWideButtonTexture\(text, width = 240, height = 72, color = "purple"\) \{.*?(?=\n  createWideButton\()', replacer_wide, content, flags=re.DOTALL)

def replacer_widebtn(m):
    return '''  createWideButton(text, onClick, color = "yellow") {
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

content = re.sub(r'  createWideButton\(text, onClick, color = "purple"\) \{.*?(?=\n  createIconButton\()', replacer_widebtn, content, flags=re.DOTALL)

with open('src/ui/UIManager.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated wide buttons")
