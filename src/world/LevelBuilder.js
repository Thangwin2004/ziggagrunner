import * as THREE from "three";

export const TILE_SIZE = 8;

const GROUND_SIZE = 720;
const GROUND_REPEAT = 4;
const GROUND_UV_SCALE = GROUND_REPEAT / GROUND_SIZE;
const GROUND_Y = -42;

const TRAIL_CONNECTION = Object.freeze({
  LEFT: 1,
  RIGHT: 2,
  BACK: 4,
  FRONT: 8,
});

function createTrailTexture(connectionMask) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  let seed = 7413 + connectionMask * 97;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  ctx.fillStyle = "#d3b277";
  ctx.fillRect(0, 0, size, size);

  // Compacted alpine soil with broad worn patches and fine gravel.
  for (let i = 0; i < 300; i++) {
    const x = random() * size;
    const y = random() * size;
    const radius = 0.8 + random() * 2.2;
    ctx.globalAlpha = 0.08 + random() * 0.1;
    ctx.fillStyle = random() > 0.48 ? "#80633f" : "#f0d79d";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 8; i++) {
    const x = 35 + random() * (size - 70);
    const y = 35 + random() * (size - 70);
    const radius = 12 + random() * 24;
    ctx.fillStyle = random() > 0.5 ? "#9b794e" : "#efd299";
    ctx.beginPath();
    ctx.ellipse(
      x,
      y,
      radius * 1.45,
      radius,
      random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  // Small slate stones keep the surface readable without becoming noisy.
  ctx.globalAlpha = 0.42;
  for (let i = 0; i < 15; i++) {
    const x = 24 + random() * (size - 48);
    const y = 24 + random() * (size - 48);
    const radius = 1.6 + random() * 3.5;
    ctx.fillStyle = random() > 0.5 ? "#756f63" : "#b9aa8d";
    ctx.beginPath();
    ctx.ellipse(
      x,
      y,
      radius * 1.35,
      radius,
      random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  const exposedEdges = [];
  if (!(connectionMask & TRAIL_CONNECTION.LEFT)) exposedEdges.push("left");
  if (!(connectionMask & TRAIL_CONNECTION.RIGHT)) exposedEdges.push("right");
  if (!(connectionMask & TRAIL_CONNECTION.BACK)) exposedEdges.push("back");
  if (!(connectionMask & TRAIL_CONNECTION.FRONT)) exposedEdges.push("front");

  // Layered stone rim appears only on exposed edges, making each tile read as
  // a trail carved into a high ridge instead of a floating grassy board.
  ctx.globalAlpha = 0.96;
  ctx.lineCap = "square";
  const strokeExposedEdge = (edge) => {
    ctx.beginPath();
    if (edge === "left") {
      ctx.moveTo(0, 0);
      ctx.lineTo(0, size);
    } else if (edge === "right") {
      ctx.moveTo(size, 0);
      ctx.lineTo(size, size);
    } else if (edge === "back") {
      ctx.moveTo(0, 0);
      ctx.lineTo(size, 0);
    } else {
      ctx.moveTo(0, size);
      ctx.lineTo(size, size);
    }
    ctx.stroke();
  };
  ctx.strokeStyle = "#69665c";
  ctx.lineWidth = 34;
  for (const edge of exposedEdges) strokeExposedEdge(edge);
  ctx.strokeStyle = "#a89b7b";
  ctx.lineWidth = 20;
  for (const edge of exposedEdges) strokeExposedEdge(edge);
  ctx.strokeStyle = "#789349";
  ctx.lineWidth = 7;
  for (const edge of exposedEdges) strokeExposedEdge(edge);

  // A few embedded edge stones break the perfectly straight silhouette.
  ctx.globalAlpha = 0.86;
  for (let i = 0; i < exposedEdges.length * 10; i++) {
    const edge = exposedEdges[Math.floor(random() * exposedEdges.length)];
    const inset = 7 + random() * 8;
    let x = 12 + random() * (size - 24);
    let y = 12 + random() * (size - 24);
    if (edge === "left") x = inset;
    if (edge === "right") x = size - inset;
    if (edge === "back") y = inset;
    if (edge === "front") y = size - inset;
    const radius = 2.5 + random() * 4;
    ctx.fillStyle = random() > 0.5 ? "#746f63" : "#b7aa8e";
    ctx.beginPath();
    ctx.ellipse(
      x,
      y,
      radius * 1.35,
      radius,
      random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  // Sparse alpine grass softens the rim without hiding its rocky structure.
  ctx.globalAlpha = 0.74;
  ctx.lineCap = "round";
  for (let i = 0; i < exposedEdges.length * 14; i++) {
    const edge = exposedEdges[Math.floor(random() * exposedEdges.length)];
    const inset = 7 + random() * 22;
    let x = random() * size;
    let y = random() * size;
    if (edge === "left") x = inset;
    if (edge === "right") x = size - inset;
    if (edge === "back") y = inset;
    if (edge === "front") y = size - inset;

    const blade = 7 + random() * 7;
    ctx.strokeStyle = random() > 0.5 ? "#557a3c" : "#83a953";
    ctx.lineWidth = 2 + random() * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y + blade * 0.45);
    ctx.lineTo(x - blade * 0.32, y - blade * 0.45);
    ctx.moveTo(x, y + blade * 0.45);
    ctx.lineTo(x + blade * 0.28, y - blade * 0.55);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

function createRockFaceTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, "#a99c83");
  gradient.addColorStop(0.45, "#837b6c");
  gradient.addColorStop(1, "#5e5b54");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  let seed = 28411;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // Horizontal strata and short cracks suggest a carved mountain ledge.
  for (let row = 0; row < 6; row++) {
    const baseY = 28 + row * 39 + random() * 10;
    ctx.strokeStyle = row % 2 === 0 ? "#645f55" : "#c1b397";
    ctx.globalAlpha = 0.34;
    ctx.lineWidth = 3 + random() * 4;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    for (let x = 32; x <= size; x += 32) {
      ctx.lineTo(x, baseY + (random() - 0.5) * 13);
    }
    ctx.stroke();
  }

  ctx.globalAlpha = 0.32;
  ctx.strokeStyle = "#494740";
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 16; i++) {
    const x = random() * size;
    const y = 18 + random() * (size - 36);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (random() - 0.5) * 18, y + 10 + random() * 20);
    ctx.lineTo(x + (random() - 0.5) * 24, y + 24 + random() * 22);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

function createPlatformShadowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(64, 64, 18, 64, 64, 62);
  gradient.addColorStop(0, "rgba(30, 65, 25, 0.42)");
  gradient.addColorStop(0.68, "rgba(30, 65, 25, 0.24)");
  gradient.addColorStop(1, "rgba(30, 65, 25, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

export class LevelBuilder {
  constructor(scene) {
    this.scene = scene;
    this.solids = [];
    this.coins = [];
    this.decorations = [];
    this.vfxList = [];
    this.solidPool = [];
    this.coinPool = [];

    // Load Textures
    const textureLoader = new THREE.TextureLoader();
    const coinTex = textureLoader.load("/assest/image/banh_chung_coin.webp");
    coinTex.colorSpace = THREE.SRGBColorSpace;

    this.groundTexture = textureLoader.load(
      "/assest/image/zigzag_mountain_valley_768.webp",
    );
    this.groundTexture.colorSpace = THREE.SRGBColorSpace;
    this.groundTexture.wrapS = THREE.MirroredRepeatWrapping;
    this.groundTexture.wrapT = THREE.MirroredRepeatWrapping;
    this.groundTexture.repeat.set(GROUND_REPEAT, GROUND_REPEAT);
    this.groundTexture.magFilter = THREE.LinearFilter;
    this.groundTexture.minFilter = THREE.LinearMipmapLinearFilter;

    this.groundMaterial = new THREE.MeshBasicMaterial({
      map: this.groundTexture,
      color: 0xffffff,
      toneMapped: false,
    });
    this.groundMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE),
      this.groundMaterial,
    );
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.y = GROUND_Y;
    this.groundMesh.renderOrder = -10;
    this.groundMesh.frustumCulled = false;
    this.scene.add(this.groundMesh);

    this.platformShadowMaterial = new THREE.MeshBasicMaterial({
      map: createPlatformShadowTexture(),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });

    this.roadSideMaterial = new THREE.MeshLambertMaterial({
      map: createRockFaceTexture(),
      color: 0xd2c7b2,
      emissive: 0x241f19,
      emissiveIntensity: 0.12,
    });
    this.roadBottomMaterial = new THREE.MeshLambertMaterial({
      color: 0x514c43,
    });
    this.trailMaterialCache = new Map();

    this.materials = {
      coinMesh: new THREE.MeshLambertMaterial({
        map: coinTex,
      }),
      coinSprite: new THREE.SpriteMaterial({ map: coinTex }),
    };

    this.geometries = {
      box: new THREE.BoxGeometry(TILE_SIZE, 1, TILE_SIZE),
      platformShadow: new THREE.PlaneGeometry(
        TILE_SIZE * 1.45,
        TILE_SIZE * 1.45,
      ),
    };

    this.lastX = 0;
    this.lastZ = 0;
    this.path = [];

    this.buildLevel();
  }

  clear() {
    if (this.groundMesh) this.groundMesh.visible = false;
    this.solids.forEach((s) => {
      this.scene.remove(s.mesh);
      this.solidPool.push(s.mesh);
    });
    this.coins.forEach((c) => {
      this.scene.remove(c.mesh);
      this.coinPool.push(c.mesh);
    });
    this.solids = [];
    this.coins = [];
    this.decorations = [];
    this.vfxList = [];
    this.path = [];
    this.lastX = 0;
    this.lastZ = 0;
  }

  createBounds(x, z, width, depth) {
    return {
      x: x - width / 2,
      z: z - depth / 2,
      width,
      depth,
    };
  }

  buildLevel() {
    this.clear();
    this.groundMesh.visible = true;
    this.path = [];
    let startX = 0;
    let startZ = 0;

    for (let i = 0; i < 5; i++) {
      this.path.push({ x: startX, z: startZ });
      this.spawnBlockMesh(i);
      this.lastX = startX;
      this.lastZ = startZ;
      startZ += TILE_SIZE;
    }

    for (let i = 0; i < 30; i++) {
      this.generateNextBlock();
      this.spawnBlockMesh(this.path.length - 1);
    }

    return {
      spawnPoint: { x: 0, z: 0 },
      solids: this.solids,
      coins: this.coins,
      spikes: [],
      enemies: [],
    };
  }

  generateNextBlock() {
    const lastNode = this.path[this.path.length - 1];
    let nextX = lastNode.x;
    let nextZ = lastNode.z;

    if (Math.random() > 0.5) {
      nextX += TILE_SIZE;
    } else {
      nextZ += TILE_SIZE;
    }

    this.path.push({ x: nextX, z: nextZ });
    this.lastX = nextX;
    this.lastZ = nextZ;
  }

  straightenPath(solidMatch, direction, straightCount = 10) {
    const solidIndex = this.solids.indexOf(solidMatch);
    if (solidIndex === -1) return;

    // Remove all blocks after the matched block
    for (let i = solidIndex + 1; i < this.solids.length; i++) {
      const mesh = this.solids[i].mesh;
      this.scene.remove(mesh);
      this.solidPool.push(mesh);
    }
    this.solids.splice(solidIndex + 1);

    // Remove coins that are no longer on valid blocks
    for (let i = this.coins.length - 1; i >= 0; i--) {
      let keep = false;
      for (const s of this.solids) {
        if (
          this.coins[i].mesh.position.x === s.mesh.position.x &&
          this.coins[i].mesh.position.z === s.mesh.position.z
        ) {
          keep = true;
          break;
        }
      }
      if (!keep) {
        const mesh = this.coins[i].mesh;
        this.scene.remove(mesh);
        this.coinPool.push(mesh);
        this.coins.splice(i, 1);
      }
    }

    // Truncate path
    let pathIndex = this.path.findIndex(
      (p) =>
        p.x === solidMatch.mesh.position.x &&
        p.z === solidMatch.mesh.position.z,
    );
    if (pathIndex !== -1) {
      this.path.splice(pathIndex + 1);
    }

    this.lastX = solidMatch.mesh.position.x;
    this.lastZ = solidMatch.mesh.position.z;

    // Generate straight blocks for safety
    for (let i = 0; i < straightCount; i++) {
      if (direction === "x") {
        this.lastX += TILE_SIZE;
      } else {
        this.lastZ += TILE_SIZE;
      }
      this.path.push({ x: this.lastX, z: this.lastZ });
      this.spawnBlockMesh(this.path.length - 1);
    }

    // Generate remaining random blocks
    for (let i = 0; i < 20; i++) {
      this.generateNextBlock();
      this.spawnBlockMesh(this.path.length - 1);
    }
  }

  getSolidMesh() {
    if (this.solidPool.length > 0) {
      return this.solidPool.pop();
    }
    const mesh = new THREE.Mesh(this.geometries.box, this.getWallMaterial(0));
    const groundShadow = new THREE.Mesh(
      this.geometries.platformShadow,
      this.platformShadowMaterial,
    );
    groundShadow.rotation.x = -Math.PI / 2;
    groundShadow.position.y = GROUND_Y + 0.56;
    groundShadow.renderOrder = -5;
    mesh.add(groundShadow);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    return mesh;
  }

  getWallMaterial(connectionMask) {
    if (!this.trailMaterialCache.has(connectionMask)) {
      const topMaterial = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        map: createTrailTexture(connectionMask),
      });
      this.trailMaterialCache.set(connectionMask, [
        this.roadSideMaterial,
        this.roadSideMaterial,
        topMaterial,
        this.roadBottomMaterial,
        this.roadSideMaterial,
        this.roadSideMaterial,
      ]);
    }
    return this.trailMaterialCache.get(connectionMask);
  }

  getConnectionMask(x, z) {
    let mask = 0;
    for (const solid of this.solids) {
      const sx = solid.mesh.position.x;
      const sz = solid.mesh.position.z;
      if (sx === x - TILE_SIZE && sz === z) mask |= TRAIL_CONNECTION.LEFT;
      if (sx === x + TILE_SIZE && sz === z) mask |= TRAIL_CONNECTION.RIGHT;
      if (sx === x && sz === z - TILE_SIZE) mask |= TRAIL_CONNECTION.BACK;
      if (sx === x && sz === z + TILE_SIZE) mask |= TRAIL_CONNECTION.FRONT;
    }
    return mask;
  }

  refreshTrailMaterialsAround(x, z) {
    for (const solid of this.solids) {
      const dx = Math.abs(solid.mesh.position.x - x);
      const dz = Math.abs(solid.mesh.position.z - z);
      if (dx + dz <= TILE_SIZE) {
        solid.mesh.material = this.getWallMaterial(
          this.getConnectionMask(solid.mesh.position.x, solid.mesh.position.z),
        );
      }
    }
  }

  getCoinMesh() {
    if (this.coinPool.length > 0) {
      const coin = this.coinPool.pop();
      coin.visible = true;
      return coin;
    }
    const coin = new THREE.Sprite(this.materials.coinSprite);
    coin.scale.set(3, 3, 1);
    return coin;
  }

  spawnBlockMesh(index) {
    if (index < 0 || index >= this.path.length) return;

    const curr = this.path[index];
    const x = curr.x;
    const z = curr.z;

    // Surface block (thinner and positioned at y=-0.5 so top is at y=0)
    const mesh = this.getSolidMesh();
    mesh.position.set(x, -0.5, z);
    this.scene.add(mesh);
    this.solids.push({
      mesh,
      bounds: this.createBounds(x, z, TILE_SIZE, TILE_SIZE),
    });
    this.refreshTrailMaterialsAround(x, z);

    // 10% chance to spawn a coin
    if (Math.random() < 0.1 && (x !== 0 || z !== 0)) {
      const coin = this.getCoinMesh();
      coin.position.set(x, 2, z);

      this.scene.add(coin);
      this.coins.push({
        mesh: coin,
        active: true,
        bounds: this.createBounds(x, z, 2.5, 2.5),
        baseY: 2,
        timeOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  spawnCoinVFX(x, y, z, amount) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.font = '900 50px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = "#FFD06A";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#7A4A2E";
    ctx.strokeText("+" + amount, 64, 64);
    ctx.fillText("+" + amount, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      toneMapped: false,
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(4, 4, 1);
    sprite.position.set(x, y + 2, z);
    this.scene.add(sprite);

    this.vfxList.push({
      sprite,
      life: 1.0, // 1 second life
      vy: 0.1, // speed up
    });
  }

  update(player) {
    // Keep one large 3D ground plane under the camera. Its UV compensation
    // locks the artwork to world space, so movement produces natural scrolling.
    this.groundMesh.position.x = player.x;
    this.groundMesh.position.z = player.z;
    this.groundTexture.offset.x = player.x * GROUND_UV_SCALE;
    this.groundTexture.offset.y = -player.z * GROUND_UV_SCALE;

    // Animate coins
    this.coins.forEach((coin) => {
      if (coin.active) {
        coin.mesh.position.y =
          coin.baseY + Math.sin(Date.now() * 0.003 + coin.timeOffset) * 0.5;
      }
    });

    // Animate VFX
    for (let i = this.vfxList.length - 1; i >= 0; i--) {
      const vfx = this.vfxList[i];
      vfx.sprite.position.y += vfx.vy;
      vfx.life -= 0.02; // Roughly 50 frames
      vfx.sprite.material.opacity = vfx.life;

      if (vfx.life <= 0) {
        this.scene.remove(vfx.sprite);
        vfx.sprite.material.map.dispose();
        vfx.sprite.material.dispose();
        this.vfxList.splice(i, 1);
      }
    }

    // Endless logic: If player is getting close to the last block, generate more
    const distToLast =
      Math.abs(player.x - this.lastX) + Math.abs(player.z - this.lastZ);
    if (distToLast < 40) {
      this.generateNextBlock();
      this.spawnBlockMesh(this.path.length - 1);
    }

    // Cleanup old blocks that are far behind the player (optimization)
    for (let i = this.solids.length - 1; i >= 0; i--) {
      const solid = this.solids[i];
      const dist =
        player.x - solid.mesh.position.x + (player.z - solid.mesh.position.z);
      if (dist > 30) {
        // Passed it safely
        this.scene.remove(solid.mesh);
        this.solidPool.push(solid.mesh);
        this.solids.splice(i, 1);
      }
    }
  }
}
