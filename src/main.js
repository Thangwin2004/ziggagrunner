import * as THREE from "three";
import { GameManager } from "./core/GameManager.js";

// 1. Setup Three.js Scene, Camera, Renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Happy Sky Blue

const container = document.getElementById("pixi-container") || document.body;
const w = container.clientWidth || window.innerWidth;
const h = container.clientHeight || window.innerHeight;

const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
camera.position.z = 25;

const renderer = new THREE.WebGLRenderer({
  antialias: false,
  powerPreference: "high-performance",
});
renderer.setSize(w, h);
// Cap pixel ratio to 1.5 to prevent extreme lag on retina/mobile screens (which can be 3x or 4x)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = false; // Disabled to reduce lag on mobile
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

if (container.id === "pixi-container") {
  container.innerHTML = "";
  container.appendChild(renderer.domElement);
} else {
  document.body.appendChild(renderer.domElement);
}

// 2. Add Lighting & Effects
scene.fog = new THREE.Fog(0x87ceeb, 45, 120); // Linear fog: clear near player, foggy in background

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.9);
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
dirLight.position.set(20, 40, -20);
dirLight.castShadow = false; // Disabled to reduce lag
scene.add(dirLight);

// 3. Setup UI Scene (Dual Scene)
const uiScene = new THREE.Scene();
const uiCamera = new THREE.OrthographicCamera(
  -w / 2,
  w / 2,
  h / 2,
  -h / 2,
  0.1,
  10,
);
uiCamera.position.z = 5;

// 4. Init Game Manager (pass uiScene and uiCamera)
const game = new GameManager(
  scene,
  camera,
  uiScene,
  uiCamera,
  renderer.domElement,
);

// 5. Handle Resizing
const handleResize = () => {
  const newW = container.clientWidth || window.innerWidth;
  const newH = container.clientHeight || window.innerHeight;
  camera.aspect = newW / newH;
  camera.updateProjectionMatrix();

  uiCamera.left = -newW / 2;
  uiCamera.right = newW / 2;
  uiCamera.top = newH / 2;
  uiCamera.bottom = -newH / 2;
  uiCamera.updateProjectionMatrix();

  renderer.setSize(newW, newH);
  if (typeof game !== "undefined") {
    game.resize();
  }
};
window.addEventListener("resize", handleResize);

// 6. Game Loop
const clock = new THREE.Clock();
renderer.autoClear = false; // Important for dual scene

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();
  game.update(deltaTime);

  // Make sure light follows camera somewhat so shadows don't clip
  dirLight.position.x = camera.position.x + 10;
  dirLight.target.position.set(camera.position.x, camera.position.y, 0);
  dirLight.target.updateMatrixWorld();

  renderer.clear();
  renderer.render(scene, camera);
  renderer.clearDepth();
  renderer.render(uiScene, uiCamera);
}
animate();
