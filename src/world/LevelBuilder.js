import * as THREE from "three";

export const TILE_SIZE = 8;

export class LevelBuilder {
  constructor(scene) {
    this.scene = scene;
    this.solids = [];
    this.coins = [];
    this.decorations = [];
    this.vfxList = [];

    // Load Textures
    const textureLoader = new THREE.TextureLoader();
    const coinTex = textureLoader.load(
      "/assest/image/Ref-20260630T071202Z-3-001/Ref/Props/BanhChungBanhTet (1).png",
    );
    coinTex.colorSpace = THREE.SRGBColorSpace;

    this.modelTextures = {
      atlas: textureLoader.load("/assest/assets3d/Textures/Atlas1.png"),
      cars: textureLoader.load("/assest/assets3d/Textures/cars.png"),
      rock: textureLoader.load("/assest/assets3d/Textures/Rock1.png"),
      roads: textureLoader.load("/assest/assets3d/Textures/Roads.png"),
    };
    Object.values(this.modelTextures).forEach(
      (t) => (t.colorSpace = THREE.SRGBColorSpace),
    );

    // Top surface texture
    const roadTex = textureLoader.load(
      "/assest/image/Ref-20260630T071202Z-3-001/Ref/Environment/matnen.png",
    );
    roadTex.colorSpace = THREE.SRGBColorSpace;
    roadTex.wrapS = THREE.RepeatWrapping;
    roadTex.wrapT = THREE.RepeatWrapping;
    roadTex.repeat.set(5, 5);

    // Side surface texture
    const wallTex = textureLoader.load(
      "/assest/image/Ref-20260630T071202Z-3-001/Ref/Environment/gach.png",
    );
    wallTex.colorSpace = THREE.SRGBColorSpace;
    wallTex.wrapS = THREE.RepeatWrapping;
    wallTex.wrapT = THREE.RepeatWrapping;
    wallTex.repeat.set(5, 1);

    const cloudTex = textureLoader.load(
      "/assest/image/Ref-20260630T071202Z-3-001/Ref/Character/cloudball.png",
    );
    cloudTex.colorSpace = THREE.SRGBColorSpace;

    const tex1 = textureLoader.load("/assest/image/vietnam_tribe_scenery.png");
    const tex2 = textureLoader.load("/assest/image/vietnam_tribe_hoian.png");
    const tex3 = textureLoader.load("/assest/image/vietnam_tribe_beach.png");
    const tex4 = textureLoader.load("/assest/image/vietnam_tribe_sapa.png");

    this.sceneryTextures = [tex1, tex2, tex3, tex4];
    this.sceneryTextures.forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      // Do not tile, stretch over the massive plane
    });

    this.materials = {
      wall: [
        new THREE.MeshStandardMaterial({
          map: wallTex,
          roughness: 0.9,
          color: 0xdddddd,
        }),
        new THREE.MeshStandardMaterial({
          map: wallTex,
          roughness: 0.9,
          color: 0xdddddd,
        }),
        new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.9 }),
        new THREE.MeshStandardMaterial({
          map: wallTex,
          roughness: 0.9,
          color: 0xdddddd,
        }),
        new THREE.MeshStandardMaterial({
          map: wallTex,
          roughness: 0.9,
          color: 0xdddddd,
        }),
        new THREE.MeshStandardMaterial({
          map: wallTex,
          roughness: 0.9,
          color: 0xdddddd,
        }),
      ],
      wallDark: new THREE.MeshStandardMaterial({
        map: wallTex,
        roughness: 0.9,
        color: 0x999999,
      }),
      coinMesh: new THREE.MeshStandardMaterial({
        map: coinTex,
        roughness: 0.8,
      }),
      coinSprite: new THREE.SpriteMaterial({ map: coinTex }),
      cloudMat: new THREE.SpriteMaterial({
        map: cloudTex,
        opacity: 0.8,
        transparent: true,
      }),
    };

    this.geometries = {
      box: new THREE.BoxGeometry(TILE_SIZE, 1, TILE_SIZE),
    };

    this.lastX = 0;
    this.lastZ = 0;
    this.path = [];
    this.regions = [];
    this.sceneryIndex = 0;

    this.buildLevel();
  }

  clear() {
    this.solids.forEach((s) => this.scene.remove(s.mesh));
    this.coins.forEach((c) => this.scene.remove(c.mesh));
    this.decorations.forEach((d) => this.scene.remove(d));
    this.regions.forEach((r) => this.scene.remove(r));
    this.vfxList.forEach((vfx) => {
      this.scene.remove(vfx.sprite);
      vfx.sprite.material.map.dispose();
      vfx.sprite.material.dispose();
    });
    this.solids = [];
    this.coins = [];
    this.decorations = [];
    this.regions = [];
    this.vfxList = [];
    this.path = [];
    this.lastX = 0;
    this.lastZ = 0;
    this.sceneryIndex = 0;
  }

  createBounds(x, z, width, depth) {
    return {
      x: x - width / 2,
      z: z - depth / 2,
      width,
      depth,
    };
  }

  spawnRegion(x, z) {
    // Spawn a large 250x250 plane centered roughly ahead of the road
    const texture =
      this.sceneryTextures[this.sceneryIndex % this.sceneryTextures.length];
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300),
      new THREE.MeshBasicMaterial({ map: texture, color: 0xdddddd }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, -40, z);
    this.scene.add(mesh);
    this.regions.push(mesh);
    this.sceneryIndex++;
  }

  buildLevel() {
    this.clear();
    this.path = [];
    let startX = 0;
    let startZ = 0;

    // Spawn the first starting region
    this.spawnRegion(0, 100);

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

    // Check if we need to spawn a new region based on distance
    const distanceTraveled = Math.abs(nextX) + Math.abs(nextZ);
    // 300 units is roughly 38 blocks of TILE_SIZE 8
    if (distanceTraveled > this.sceneryIndex * 300) {
      this.spawnRegion(nextX + 100, nextZ + 100);
    }
  }

  straightenPath(solidMatch, direction, straightCount = 10) {
    const solidIndex = this.solids.indexOf(solidMatch);
    if (solidIndex === -1) return;

    // Remove all blocks after the matched block
    for (let i = solidIndex + 1; i < this.solids.length; i++) {
      this.scene.remove(this.solids[i].mesh);
    }
    this.solids.splice(solidIndex + 1);

    // Remove coins that are no longer on valid blocks
    for (let i = this.coins.length - 1; i >= 0; i--) {
      let keep = false;
      for (const s of this.solids) {
        if (this.coins[i].mesh.position.x === s.mesh.position.x && this.coins[i].mesh.position.z === s.mesh.position.z) {
          keep = true;
          break;
        }
      }
      if (!keep) {
        this.scene.remove(this.coins[i].mesh);
        this.coins.splice(i, 1);
      }
    }

    // Truncate path
    let pathIndex = this.path.findIndex(p => p.x === solidMatch.mesh.position.x && p.z === solidMatch.mesh.position.z);
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

  spawnBlockMesh(index) {
    if (index < 0 || index >= this.path.length) return;

    const curr = this.path[index];
    const x = curr.x;
    const z = curr.z;

    // Surface block (thinner and positioned at y=-0.5 so top is at y=0)
    const mesh = new THREE.Mesh(this.geometries.box, this.materials.wall);
    mesh.position.set(x, -0.5, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.solids.push({
      mesh,
      bounds: this.createBounds(x, z, TILE_SIZE, TILE_SIZE),
    });

    // 10% chance to spawn a coin
    if (Math.random() < 0.1 && (x !== 0 || z !== 0)) {
      const coin = new THREE.Sprite(this.materials.coinSprite);
      coin.scale.set(3, 3, 1);
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

  spawnClouds() {
    for (let i = 0; i < 10; i++) {
      const cloud = new THREE.Sprite(this.materials.cloudMat);
      const s = TILE_SIZE * (3 + Math.random() * 5);
      cloud.scale.set(s, s, 1);
      cloud.position.set(
        Math.random() * 50 - 10,
        -20 - Math.random() * 10,
        Math.random() * 50 - 10,
      );
      this.scene.add(cloud);
      this.decorations.push(cloud);
    }
  }

  spawnCoinVFX(x, y, z, amount) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.font = "Bold 50px Arial";
    ctx.fillStyle = "#FFD700"; // Gold
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#000000";
    ctx.strokeText("+" + amount, 64, 64);
    ctx.fillText("+" + amount, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(4, 4, 1);
    sprite.position.set(x, y + 2, z);
    this.scene.add(sprite);
    
    this.vfxList.push({
      sprite,
      life: 1.0, // 1 second life
      vy: 0.1 // speed up
    });
  }

  update(player) {
    // Animate coins
    this.coins.forEach((coin) => {
      if (coin.active) {
        coin.mesh.position.y = coin.baseY + Math.sin(Date.now() * 0.003 + coin.timeOffset) * 0.5;
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
        this.solids.splice(i, 1);
      }
    }

    // Cleanup old regions
    for (let i = this.regions.length - 1; i >= 0; i--) {
      const region = this.regions[i];
      const dist =
        player.x - region.position.x + (player.z - region.position.z);
      if (dist > 400) {
        this.scene.remove(region);
        this.regions.splice(i, 1);
      }
    }
  }
}
