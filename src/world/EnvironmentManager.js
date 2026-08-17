import * as THREE from "three";

export class EnvironmentManager {
  constructor(bgScene, bgCamera) {
    this.bgScene = bgScene;
    this.bgCamera = bgCamera;

    this.textureLoader = new THREE.TextureLoader();

    // The lobby uses the full illustration; gameplay swaps to a seamless
    // top-down meadow so the world perspective matches the running path.
    this.menuTexture = this.textureLoader.load("/assest/image/bg.webp");
    this.menuTexture.colorSpace = THREE.SRGBColorSpace;
    this.menuTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.menuTexture.wrapT = THREE.ClampToEdgeWrapping;

    this.mode = "menu";

    // 2. Full-Screen Quad in 2D Orthographic Background Scene
    const planeGeo = new THREE.PlaneGeometry(1, 1);

    this.bgMaterial = new THREE.MeshBasicMaterial({
      map: this.menuTexture,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });

    this.bgMesh = new THREE.Mesh(planeGeo, this.bgMaterial);
    this.bgMesh.position.z = -1;
    this.bgScene.add(this.bgMesh);

    this.currentW = window.innerWidth;
    this.currentH = window.innerHeight;
    this.resize(this.currentW, this.currentH);
  }

  resize(w, h) {
    this.currentW = w;
    this.currentH = h;

    // Scale quad to fit screen exactly
    this.bgMesh.scale.set(w, h, 1);

    if (this.mode === "menu") {
      // Display the complete lobby artwork: no crop and no tiling.
      this.menuTexture.repeat.set(1, 1);
      this.menuTexture.offset.set(0, 0);
    }
  }

  setMode(mode) {
    const nextMode = mode === "gameplay" ? "gameplay" : "menu";
    if (this.mode === nextMode) return;

    this.mode = nextMode;
    this.bgMaterial.map = nextMode === "gameplay" ? null : this.menuTexture;
    // Match the gameplay backdrop to the 3D distance fog so geometry fades
    // into one continuous cartoon horizon rather than a visible color seam.
    this.bgMaterial.color.set(nextMode === "gameplay" ? 0xa9d9c3 : 0xffffff);
    this.bgMaterial.needsUpdate = true;
    this.resize(this.currentW, this.currentH);
  }

  update(player) {
    // Keep the whole image visible. Moving UVs would expose or smear its edges.
    void player;
  }

  destroy() {
    this.bgScene.remove(this.bgMesh);
    this.bgMaterial.dispose();
    this.menuTexture.dispose();
  }
}
