import * as THREE from "three";
import { GameManager } from "./core/GameManager.js";
import { winkGame } from "./integrations/wink/wink-adapter.js";
import { ParallaxBackground } from "./world/ParallaxBackground.js";

// 1. Setup Three.js Scene, Camera, Renderer
const scene = new THREE.Scene();
const container = document.getElementById("pixi-container") || document.body;
const w = container.clientWidth || window.innerWidth;
const h = container.clientHeight || window.innerHeight;
scene.background = new THREE.Color(0x78b982);

const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
camera.position.z = 25;

const isCoarsePointer = window.matchMedia?.("(pointer: coarse)").matches;
const deviceMemory = window.navigator.deviceMemory ?? 4;
const cpuCores = window.navigator.hardwareConcurrency ?? 4;
const isLowEndDevice = isCoarsePointer && (deviceMemory <= 4 || cpuCores <= 4);
const maxPixelRatio = isLowEndDevice ? 1 : isCoarsePointer ? 1.25 : 1.5;
const parallaxBackground = new ParallaxBackground(scene, {
  lowEnd: isLowEndDevice,
});

const renderer = new THREE.WebGLRenderer({
  antialias: false,
  powerPreference: "high-performance",
});
renderer.setSize(w, h);
// Retina phones can otherwise render 4-9x more pixels than their CSS size.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
renderer.shadowMap.enabled = false; // Disabled to reduce lag on mobile
renderer.toneMapping = isLowEndDevice
  ? THREE.NoToneMapping
  : THREE.ACESFilmicToneMapping;
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

// 4. Wait for the Vietnamese font faces before creating CanvasTextures.
let game;
const FONT_SAMPLE =
  "HÀNH TRÌNH ZIGZAG VÔ CỰC · CHƠI NGAY · KỶ LỤC ĐIỂM · CÀI ĐẶT";
const FONT_LOAD_TIMEOUT_MS = 8000;

function waitForFontStylesheet() {
  const stylesheet = document.getElementById("game-font-stylesheet");
  if (!stylesheet || stylesheet.sheet) return Promise.resolve();

  return new Promise((resolve) => {
    let timeoutId;
    const finish = () => {
      window.clearTimeout(timeoutId);
      stylesheet.removeEventListener("load", finish);
      stylesheet.removeEventListener("error", finish);
      resolve();
    };

    stylesheet.addEventListener("load", finish, { once: true });
    stylesheet.addEventListener("error", finish, { once: true });
    timeoutId = window.setTimeout(finish, FONT_LOAD_TIMEOUT_MS);
  });
}

async function loadGameFonts() {
  if (!document.fonts?.load) return false;

  const fontRequests = [
    ["800 32px 'Baloo 2'", FONT_SAMPLE],
    ["900 32px 'Be Vietnam Pro'", FONT_SAMPLE],
    ["700 32px 'Outfit'", FONT_SAMPLE],
  ];

  try {
    await waitForFontStylesheet();
    await Promise.race([
      Promise.all(
        fontRequests.map(([font, sample]) => document.fonts.load(font, sample)),
      ),
      new Promise((_, reject) => {
        window.setTimeout(
          () => reject(new Error("Font loading timed out")),
          FONT_LOAD_TIMEOUT_MS,
        );
      }),
    ]);
    await document.fonts.ready;

    return fontRequests.every(([font, sample]) =>
      document.fonts.check(font, sample),
    );
  } catch (error) {
    console.warn(
      "Game fonts unavailable; using the stable system fallback.",
      error,
    );
    return false;
  }
}

async function initializeGame() {
  const customFontsReady = await loadGameFonts();
  document.documentElement.dataset.gameDisplayFont = customFontsReady
    ? "baloo"
    : "system";

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

  completeSplashScreen();
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
  parallaxBackground.update(camera, game?.state, game?.levelBuilder?.solids);

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

// 7. Keep the splash visible until fonts and the initial UI are ready.
const splash = document.getElementById("splash-screen");
const splashProgress = document.getElementById("splash-progress");
const splashText = document.getElementById("splash-text");
let splashInterval;

if (splash && splashProgress && splashText) {
  let progress = 0;
  splashInterval = window.setInterval(() => {
    progress += Math.floor(Math.random() * 15) + 5;
    if (progress > 90) progress = 90;
    splashProgress.style.width = progress + "%";
    splashText.innerText = `Loading ${progress}%`;
  }, 50);
}

function completeSplashScreen() {
  if (!splash || !splashProgress || !splashText) return;

  window.clearInterval(splashInterval);
  splashProgress.style.width = "100%";
  splashText.innerText = "Loading 100%";
  window.setTimeout(() => {
    splash.style.opacity = "0";
    window.setTimeout(() => {
      splash.style.display = "none";
    }, 500);
  }, 200);
}
