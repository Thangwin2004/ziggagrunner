import * as THREE from "three";

const ACTIVE_STATES = new Set(["PLAYING", "PAUSED", "REVIVING", "GAME_OVER"]);
const GROUND_Y = -0.36;
const GROUND_SIZE = 560;
const GROUND_REPEAT = 14;
const GROUND_TILE_SIZE = GROUND_SIZE / GROUND_REPEAT;
const CELL_SIZE = 24;

const HOUSE_WALL_COLORS = [0xf0c879, 0xe9b867, 0xf2d59a];
const HOUSE_ROOF_COLORS = [0xd85836, 0x2d83bd, 0xe1a52c];
const TREE_COLORS = [0x2f9f43, 0x39b64b, 0x238b3b];
const BUSH_COLORS = [0x3aa94b, 0x58b84c, 0x2d943f];
const ROCK_COLORS = [0x8a8e82, 0x9b9b86, 0x777d73];

function hashCell(x, z, salt = 0) {
  let hash = Math.imul(x + salt * 17, 374761393);
  hash = (hash + Math.imul(z - salt * 31, 668265263)) | 0;
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
}

function createMaterial(color) {
  return new THREE.MeshLambertMaterial({ color, flatShading: true });
}

function createGableRoofGeometry() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [-6, 0, -5, 6, 0, -5, 0, 4, -5, -6, 0, 5, 6, 0, 5, 0, 4, 5],
      3,
    ),
  );
  geometry.setIndex([
    0, 2, 1, 3, 4, 5, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 4, 0, 1, 4, 0, 4, 3,
  ]);
  geometry.computeVertexNormals();
  return geometry;
}

export class ParallaxBackground {
  constructor(scene, { lowEnd = false } = {}) {
    this.scene = scene;
    this.lowEnd = lowEnd;
    this.radius = lowEnd ? 3 : 4;
    this.maxCells = (this.radius * 2 + 1) ** 2;
    this.layoutKey = "";
    this.dummy = new THREE.Object3D();
    this.instanceColor = new THREE.Color();

    const grassTexture = new THREE.TextureLoader().load(
      "/assest/image/grass_village_tile.webp",
    );
    grassTexture.colorSpace = THREE.SRGBColorSpace;
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(GROUND_REPEAT, GROUND_REPEAT);
    grassTexture.magFilter = THREE.LinearFilter;
    grassTexture.minFilter = THREE.LinearMipmapLinearFilter;
    grassTexture.anisotropy = 1;

    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE),
      new THREE.MeshBasicMaterial({
        map: grassTexture,
        color: 0x95bf78,
        fog: false,
        toneMapped: false,
      }),
    );
    this.ground.name = "endless-village-ground";
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = GROUND_Y;
    this.ground.renderOrder = -100;
    this.ground.frustumCulled = false;
    this.ground.visible = false;
    scene.add(this.ground);

    this.propsRoot = new THREE.Group();
    this.propsRoot.name = "instanced-village-props";
    this.propsRoot.visible = false;
    scene.add(this.propsRoot);

    this.instances = {
      houseWall: this.createInstances(
        "village-house-walls",
        new THREE.BoxGeometry(11, 7, 9),
        createMaterial(0xffffff),
        this.maxCells,
      ),
      houseRoof: this.createInstances(
        "village-house-roofs",
        createGableRoofGeometry(),
        createMaterial(0xffffff),
        this.maxCells,
      ),
      houseChimney: this.createInstances(
        "village-house-chimneys",
        new THREE.BoxGeometry(1.2, 2.2, 1.2),
        createMaterial(0x8c8374),
        this.maxCells,
      ),
      houseDoor: this.createInstances(
        "village-house-doors",
        new THREE.BoxGeometry(2.2, 3.4, 0.3),
        createMaterial(0x774326),
        this.maxCells,
      ),
      houseWindow: this.createInstances(
        "village-house-windows",
        new THREE.BoxGeometry(1.7, 1.5, 0.26),
        createMaterial(0x74c6db),
        this.maxCells * 2,
      ),
      treeTrunk: this.createInstances(
        "village-tree-trunks",
        new THREE.CylinderGeometry(0.72, 0.9, 3.4, 6),
        createMaterial(0x76502f),
        this.maxCells,
      ),
      treeLower: this.createInstances(
        "village-tree-lower-foliage",
        new THREE.ConeGeometry(3.5, 5.2, 8),
        createMaterial(0xffffff),
        this.maxCells,
      ),
      treeUpper: this.createInstances(
        "village-tree-upper-foliage",
        new THREE.ConeGeometry(2.55, 4.1, 8),
        createMaterial(0xffffff),
        this.maxCells,
      ),
      bush: this.createInstances(
        "village-bushes",
        new THREE.DodecahedronGeometry(2.4, 0),
        createMaterial(0xffffff),
        this.maxCells * 2,
      ),
      rock: this.createInstances(
        "village-rocks",
        new THREE.DodecahedronGeometry(1.8, 0),
        createMaterial(0xffffff),
        this.maxCells,
      ),
      groundShadow: this.createInstances(
        "village-contact-shadows",
        new THREE.CircleGeometry(1, 12).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({
          color: 0x214b28,
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
          toneMapped: false,
        }),
        this.maxCells,
      ),
    };
  }

  createInstances(name, geometry, material, count) {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.name = name;
    mesh.count = 0;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.propsRoot.add(mesh);
    return mesh;
  }

  setInstance(mesh, index, position, rotationY, scale, color) {
    this.dummy.position.copy(position);
    this.dummy.rotation.set(0, rotationY, 0);
    this.dummy.scale.copy(scale);
    this.dummy.updateMatrix();
    mesh.setMatrixAt(index, this.dummy.matrix);
    if (color !== undefined) {
      this.instanceColor.set(color);
      mesh.setColorAt(index, this.instanceColor);
    }
  }

  rotatedOffset(x, z, localX, localZ, rotationY) {
    const cos = Math.cos(rotationY);
    const sin = Math.sin(rotationY);
    return new THREE.Vector3(
      x + localX * cos + localZ * sin,
      0,
      z - localX * sin + localZ * cos,
    );
  }

  isNearRoad(x, z, clearance, solids) {
    for (const solid of solids) {
      if (
        Math.abs(x - solid.mesh.position.x) < clearance &&
        Math.abs(z - solid.mesh.position.z) < clearance
      ) {
        return true;
      }
    }
    return false;
  }

  rebuildProps(centerCellX, centerCellZ, solids) {
    const counts = {
      houseWall: 0,
      houseRoof: 0,
      houseChimney: 0,
      houseDoor: 0,
      houseWindow: 0,
      treeTrunk: 0,
      treeLower: 0,
      treeUpper: 0,
      bush: 0,
      rock: 0,
      groundShadow: 0,
    };
    const unitScale = new THREE.Vector3(1, 1, 1);

    for (let dz = -this.radius; dz <= this.radius; dz++) {
      for (let dx = -this.radius; dx <= this.radius; dx++) {
        const cellX = centerCellX + dx;
        const cellZ = centerCellZ + dz;
        const typeRoll = hashCell(cellX, cellZ, 1);
        const x = cellX * CELL_SIZE + (hashCell(cellX, cellZ, 2) - 0.5) * 14;
        const z = cellZ * CELL_SIZE + (hashCell(cellX, cellZ, 3) - 0.5) * 14;
        const rotation = hashCell(cellX, cellZ, 4) * Math.PI * 2;

        if (typeRoll < 0.18) {
          if (this.isNearRoad(x, z, 14, solids)) continue;

          // Keep a door/window facade facing the isometric camera.
          const houseRotation =
            hashCell(cellX, cellZ, 13) < 0.5 ? Math.PI : -Math.PI / 2;

          const wallColor =
            HOUSE_WALL_COLORS[
              Math.floor(hashCell(cellX, cellZ, 5) * HOUSE_WALL_COLORS.length)
            ];
          const roofColor =
            HOUSE_ROOF_COLORS[
              Math.floor(hashCell(cellX, cellZ, 6) * HOUSE_ROOF_COLORS.length)
            ];
          const base = new THREE.Vector3(x, GROUND_Y + 3.5, z);
          this.setInstance(
            this.instances.houseWall,
            counts.houseWall++,
            base,
            houseRotation,
            unitScale,
            wallColor,
          );
          this.setInstance(
            this.instances.houseRoof,
            counts.houseRoof++,
            new THREE.Vector3(x, GROUND_Y + 7, z),
            houseRotation,
            unitScale,
            roofColor,
          );

          const chimneyPosition = this.rotatedOffset(
            x,
            z,
            -3.2,
            0,
            houseRotation,
          );
          chimneyPosition.y = GROUND_Y + 8.4;
          this.setInstance(
            this.instances.houseChimney,
            counts.houseChimney++,
            chimneyPosition,
            houseRotation,
            unitScale,
          );

          const doorPosition = this.rotatedOffset(x, z, 0, 4.62, houseRotation);
          doorPosition.y = GROUND_Y + 1.7;
          this.setInstance(
            this.instances.houseDoor,
            counts.houseDoor++,
            doorPosition,
            houseRotation,
            unitScale,
          );

          for (const localX of [-2.7, 2.7]) {
            const windowPosition = this.rotatedOffset(
              x,
              z,
              localX,
              4.64,
              houseRotation,
            );
            windowPosition.y = GROUND_Y + 4.45;
            this.setInstance(
              this.instances.houseWindow,
              counts.houseWindow++,
              windowPosition,
              houseRotation,
              unitScale,
            );
          }
          this.setInstance(
            this.instances.groundShadow,
            counts.groundShadow++,
            new THREE.Vector3(x, GROUND_Y + 0.02, z),
            houseRotation,
            new THREE.Vector3(6.5, 1, 5.4),
          );
        } else if (typeRoll < 0.78) {
          if (this.isNearRoad(x, z, 8, solids)) continue;

          const treeColor =
            TREE_COLORS[
              Math.floor(hashCell(cellX, cellZ, 7) * TREE_COLORS.length)
            ];
          const scaleValue = 0.85 + hashCell(cellX, cellZ, 8) * 0.35;
          const treeScale = new THREE.Vector3(
            scaleValue,
            scaleValue,
            scaleValue,
          );
          this.setInstance(
            this.instances.treeTrunk,
            counts.treeTrunk++,
            new THREE.Vector3(x, GROUND_Y + 1.7 * scaleValue, z),
            rotation,
            treeScale,
          );
          this.setInstance(
            this.instances.treeLower,
            counts.treeLower++,
            new THREE.Vector3(x, GROUND_Y + 5.1 * scaleValue, z),
            rotation,
            treeScale,
            treeColor,
          );
          this.setInstance(
            this.instances.treeUpper,
            counts.treeUpper++,
            new THREE.Vector3(x, GROUND_Y + 8 * scaleValue, z),
            rotation + 0.25,
            treeScale,
            treeColor,
          );
          this.setInstance(
            this.instances.groundShadow,
            counts.groundShadow++,
            new THREE.Vector3(x, GROUND_Y + 0.02, z),
            rotation,
            new THREE.Vector3(3.2 * scaleValue, 1, 2.6 * scaleValue),
          );
        } else if (typeRoll < 0.92) {
          if (this.isNearRoad(x, z, 6, solids)) continue;

          const bushColor =
            BUSH_COLORS[
              Math.floor(hashCell(cellX, cellZ, 9) * BUSH_COLORS.length)
            ];
          const bushScaleValue = 0.7 + hashCell(cellX, cellZ, 10) * 0.6;
          const bushScale = new THREE.Vector3(
            bushScaleValue * 1.35,
            bushScaleValue * 0.8,
            bushScaleValue,
          );
          this.setInstance(
            this.instances.bush,
            counts.bush++,
            new THREE.Vector3(x, GROUND_Y + bushScale.y * 1.7, z),
            rotation,
            bushScale,
            bushColor,
          );
          const secondBushPosition = this.rotatedOffset(
            x,
            z,
            1.8,
            0.8,
            rotation,
          );
          secondBushPosition.y = GROUND_Y + bushScale.y * 1.4;
          this.setInstance(
            this.instances.bush,
            counts.bush++,
            secondBushPosition,
            rotation + 0.5,
            new THREE.Vector3(
              bushScale.x * 0.72,
              bushScale.y * 0.82,
              bushScale.z * 0.76,
            ),
            BUSH_COLORS[
              (BUSH_COLORS.indexOf(bushColor) + 1) % BUSH_COLORS.length
            ],
          );
          this.setInstance(
            this.instances.groundShadow,
            counts.groundShadow++,
            new THREE.Vector3(x, GROUND_Y + 0.02, z),
            rotation,
            new THREE.Vector3(2.6 * bushScaleValue, 1, 2.1 * bushScaleValue),
          );
        } else {
          if (this.isNearRoad(x, z, 6, solids)) continue;

          const rockColor =
            ROCK_COLORS[
              Math.floor(hashCell(cellX, cellZ, 9) * ROCK_COLORS.length)
            ];
          const rockScale = new THREE.Vector3(
            0.7 + hashCell(cellX, cellZ, 10) * 0.8,
            0.6 + hashCell(cellX, cellZ, 11) * 0.6,
            0.7 + hashCell(cellX, cellZ, 12) * 0.8,
          );
          this.setInstance(
            this.instances.rock,
            counts.rock++,
            new THREE.Vector3(x, GROUND_Y + rockScale.y * 1.3, z),
            rotation,
            rockScale,
            rockColor,
          );
          this.setInstance(
            this.instances.groundShadow,
            counts.groundShadow++,
            new THREE.Vector3(x, GROUND_Y + 0.02, z),
            rotation,
            new THREE.Vector3(2.1 * rockScale.x, 1, 2.1 * rockScale.z),
          );
        }
      }
    }

    Object.entries(this.instances).forEach(([key, mesh]) => {
      mesh.count = counts[key];
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
  }

  update(camera, gameState, solids = []) {
    const active = ACTIVE_STATES.has(gameState);
    this.ground.visible = active;
    this.propsRoot.visible = active;
    if (!active) return;

    const focusX = camera.position.x + 20;
    const focusZ = camera.position.z + 20;
    this.ground.position.x =
      Math.round(focusX / GROUND_TILE_SIZE) * GROUND_TILE_SIZE;
    this.ground.position.z =
      Math.round(focusZ / GROUND_TILE_SIZE) * GROUND_TILE_SIZE;

    const centerCellX = Math.floor(focusX / CELL_SIZE);
    const centerCellZ = Math.floor(focusZ / CELL_SIZE);
    const lastSolid = solids[solids.length - 1]?.mesh.position;
    const nextLayoutKey = `${centerCellX}:${centerCellZ}:${lastSolid?.x ?? 0}:${lastSolid?.z ?? 0}`;

    if (nextLayoutKey !== this.layoutKey) {
      this.layoutKey = nextLayoutKey;
      this.rebuildProps(centerCellX, centerCellZ, solids);
    }
  }
}
