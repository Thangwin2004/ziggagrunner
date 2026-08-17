import * as THREE from "three";
import { GameManager } from "./core/GameManager.js";
import { winkGame } from "./integrations/wink/wink-adapter.js";
import { waitForGameFonts } from "./utils/fontLoader.js";

// 1. Setup Three.js Scene, Camera, Renderer
const scene = new THREE.Scene();
const bgTexture = new THREE.TextureLoader().load("/assest/image/bg.png");
bgTexture.colorSpace = THREE.SRGBColorSpace;
scene.background = bgTexture;

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

// 4. Wait for fonts before init Game Manager
let game;
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

  game = new GameManager(scene, camera, uiScene, uiCamera, renderer.domElement);

  // ── Wink Bridge lifecycle binding ──
  winkGame.bindLifecycle({
    onPause: () => {
      // The game loop uses THREE.Clock, so we pause updating if needed
      // but GameManager has its own pause state. We can force it to PAUSED
      if (game && game.state === "PLAYING") {
        game.state = "PAUSED";
        game.audio.stopRun();
        game.ui.showSettings(true);
      }
    },
    onResume: () => {
      // The UI will handle resuming, but if we need to force it:
      if (game && game.state === "PAUSED") {
        game.state = "PLAYING";
        game.audio.playRun();
        game.ui.clear();
        game.ui.showHUD();
        game.ui.updateHUD(game.score, game.coinsThisRun);
      }
    },
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

  uiCamera.left = -newW / 2;
  uiCamera.right = newW / 2;
  uiCamera.top = newH / 2;
  uiCamera.bottom = -newH / 2;
  uiCamera.updateProjectionMatrix();

  renderer.setSize(newW, newH);
  if (game) {
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
  if (game) game.update(deltaTime);

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

// 7. Hide Splash Screen with fake loading progress
const splash = document.getElementById("splash-screen");
const splashProgress = document.getElementById("splash-progress");
const splashText = document.getElementById("splash-text");
if (splash && splashProgress && splashText) {
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 15) + 5;
    if (progress > 90) progress = 90;
    splashProgress.style.width = progress + "%";
    splashText.innerText = `Loading ${progress}%`;
  }, 50);

  setTimeout(() => {
    clearInterval(interval);
    splashProgress.style.width = "100%";
    splashText.innerText = `Loading 100%`;
    setTimeout(() => {
      splash.style.opacity = "0";
      setTimeout(() => {
        splash.style.display = "none";
      }, 500);
    }, 200);
  }, 600);
}
