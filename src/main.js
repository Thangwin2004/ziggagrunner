import { t } from "./system/I18nManager.js";
import * as THREE from "three";
import { GameManager } from "./core/GameManager.js";
import { winkGame } from "./integrations/wink/wink-adapter.js";
import { waitForGameFonts } from "./utils/fontLoader.js";
import { installFocusPause } from "./utils/focusPause.js";
import { installInteractionGuard } from "./utils/interactionGuard.js";

installInteractionGuard();

// 1. Setup Three.js Scene, Camera, Renderer
const scene = new THREE.Scene();
scene.background = null;
scene.fog = new THREE.Fog(0xa9d9c3, 72, 190);

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
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

if (container.id === "pixi-container") {
  container.innerHTML = "";
  container.appendChild(renderer.domElement);
} else {
  document.body.appendChild(renderer.domElement);
}

// 2. Add Lighting
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x666666, 1.0);
hemiLight.position.set(0, 30, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
dirLight.position.set(20, 40, -20);
dirLight.castShadow = false;
scene.add(dirLight);

// 3. Setup Background & UI Scenes (3-Pass Rendering Pipeline)
const bgScene = new THREE.Scene();
const bgCamera = new THREE.OrthographicCamera(
  -w / 2,
  w / 2,
  h / 2,
  -h / 2,
  0.1,
  10,
);
bgCamera.position.z = 5;

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

// 4. Wait for fonts before init Game Manager
let game;
const clock = new THREE.Clock();

async function initializeGame() {
  await waitForGameFonts([
    "400 1em 'Be Vietnam Pro'",
    "500 1em 'Be Vietnam Pro'",
    "700 1em 'Be Vietnam Pro'",
    "800 1em 'Be Vietnam Pro'",
    "900 1em 'Be Vietnam Pro'",
    "700 1em 'Baloo 2'",
    "800 1em 'Baloo 2'",
  ]);

  game = new GameManager(
    scene,
    camera,
    uiScene,
    uiCamera,
    bgScene,
    bgCamera,
    renderer.domElement,
  );

  const focusPause = installFocusPause({
    isRunning: () => frameHandle !== null,
    pause: stopRenderLoop,
    resume: startRenderLoop,
    pauseAudio: () => game?.audio.pauseForFocus(),
    resumeAudio: () => game?.audio.resumeFromFocus(),
  });

  // ── Wink Bridge lifecycle binding ──
  winkGame.bindLifecycle({
    onPause: focusPause.pauseFromHost,
    onResume: focusPause.resumeFromHost,
    onMute: () => {
      if (game) game.audio.setBGMEnabled(false);
      game?.audio.setSFXEnabled(false);
    },
    onUnmute: () => {
      if (game) game.audio.setBGMEnabled(true);
      game?.audio.setSFXEnabled(true);
    },
  });

  winkGame.observe((state) => {
    console.log("[WinkBridge] phase:", state.phase);
  });
}

void initializeGame();

// 5. Handle Resizing
const handleResize = () => {
  const newW = container.clientWidth || window.innerWidth;
  const newH = container.clientHeight || window.innerHeight;
  camera.aspect = newW / newH;
  camera.updateProjectionMatrix();

  bgCamera.left = -newW / 2;
  bgCamera.right = newW / 2;
  bgCamera.top = newH / 2;
  bgCamera.bottom = -newH / 2;
  bgCamera.updateProjectionMatrix();

  uiCamera.left = -newW / 2;
  uiCamera.right = newW / 2;
  uiCamera.top = newH / 2;
  uiCamera.bottom = -newH / 2;
  uiCamera.updateProjectionMatrix();

  renderer.setSize(newW, newH);
  if (game) {
    game.resize(newW, newH);
  }
};
window.addEventListener("resize", handleResize);

// 6. Game Loop
renderer.autoClear = false; // Important for 3-pass rendering
let frameHandle = null;

function animate() {
  frameHandle = requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();
  if (game) game.update(deltaTime);

  // Make sure light follows camera somewhat so shadows don't clip
  dirLight.position.x = camera.position.x + 10;
  dirLight.target.position.set(camera.position.x, camera.position.y, 0);
  dirLight.target.updateMatrixWorld();

  renderer.clear();
  renderer.render(bgScene, bgCamera);
  renderer.clearDepth();
  renderer.render(scene, camera);
  renderer.clearDepth();
  renderer.render(uiScene, uiCamera);
}

function startRenderLoop() {
  if (frameHandle !== null) return;
  clock.getDelta();
  frameHandle = requestAnimationFrame(animate);
}

function stopRenderLoop() {
  if (frameHandle === null) return;
  cancelAnimationFrame(frameHandle);
  frameHandle = null;
}

animate();

// 7. Hide Splash Screen with fake loading progress
const splash = document.getElementById("splash-screen");
const splashProgress = document.getElementById("splash-progress");
const splashText = document.getElementById("splash-text");
if (splash && splashProgress && splashText) {
  let progress = 0;
  splashText.innerText = t("loading.progress", { progress });
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 15) + 5;
    if (progress > 90) progress = 90;
    splashProgress.style.width = progress + "%";
    splashText.innerText = t("loading.progress", { progress });
  }, 50);

  setTimeout(() => {
    clearInterval(interval);
    splashProgress.style.width = "100%";
    splashText.innerText = t("loading.progress", { progress: 100 });
    setTimeout(() => {
      splash.style.opacity = "0";
      setTimeout(() => {
        splash.style.display = "none";
      }, 500);
    }, 200);
  }, 600);
}
