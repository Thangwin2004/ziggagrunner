import { LevelBuilder } from "../world/LevelBuilder.js";
import { EnvironmentManager } from "../world/EnvironmentManager.js";
import { PhysicsSystem } from "../world/PhysicsSystem.js";
import { Player } from "../entities/Player.js";
import { UIManager } from "../ui/UIManager.js";
import { InputManager } from "./InputManager.js";
import { getStats, saveStats } from "./Storage.js";
import { AudioManager } from "./AudioManager.js";
import { AdManager } from "./AdManager.js";
import { winkGame } from "../integrations/wink/wink-adapter.js";
import gsap from "gsap";

const MOVEMENT_SCORE_INTERVAL_SECONDS = 1;
const MOVEMENT_SCORE_PER_INTERVAL = 1;
const COIN_SCORE = 100;

export class GameManager {
  constructor(scene, camera, uiScene, uiCamera, bgScene, bgCamera, domElement) {
    this.scene = scene;
    this.camera = camera;

    this.state = "MAIN_MENU";

    this.environment = new EnvironmentManager(bgScene, bgCamera);
    this.levelBuilder = new LevelBuilder(scene);
    this.physics = new PhysicsSystem();
    this.player = new Player(scene);
    this.ui = new UIManager(uiScene, uiCamera, domElement);
    this.audio = new AudioManager(this.camera);

    this.ui.onPlayClick = () => this.audio.playClick();

    this.input = new InputManager(domElement, this.ui);
    this.input.onJump = () => this.handleInput();

    // Auto-play music on first interaction to bypass browser autoplay policies
    const firstInteractionHandler = () => {
      this.audio.playBGM();
      window.removeEventListener("pointerdown", firstInteractionHandler);
      window.removeEventListener("keydown", firstInteractionHandler);
    };
    window.addEventListener("pointerdown", firstInteractionHandler);
    window.addEventListener("keydown", firstInteractionHandler);

    this.score = 0;
    this.coinsThisRun = 0;
    this.movementScoreElapsed = 0;
    this.worldData = null;
    this.fallCameraForwardX = 0;
    this.fallCameraForwardZ = 1;
    this.fallCameraOutwardX = 1;
    this.fallCameraOutwardZ = 0;

    this.ui.onPlay = () => this.switchState("PLAYING");
    this.ui.onHome = () => this.switchState("MAIN_MENU");
    this.ui.onReplay = () => this.switchState("PLAYING");
    this.ui.onSettings = () => {
      if (this.state === "PLAYING") {
        this.state = "PAUSED";
        this.audio.stopRun();
      }
      this.ui.showSettings(this.state === "PAUSED");
    };
    this.ui.onContinue = () => {
      if (this.state === "PAUSED") {
        this.state = "PLAYING";
        this.audio.playRun();
      }
    };
    this.ui.onAchievements = () => this.ui.showAchievements(getStats());

    this.ui.onRevive = async () => {
      const success = await AdManager.showRewardedVideo();
      if (success) {
        this.player.isDead = false;

        // Find nearest solid block
        let closestSolid = null;
        let closestDist = Infinity;
        let closestIndex = 0;
        const solids = this.levelBuilder.solids;

        for (let i = 0; i < solids.length; i++) {
          const solid = solids[i];
          const dist =
            Math.abs(solid.mesh.position.x - this.player.x) +
            Math.abs(solid.mesh.position.z - this.player.z);
          if (dist < closestDist) {
            closestDist = dist;
            closestSolid = solid;
            closestIndex = i;
          }
        }

        if (closestSolid) {
          this.player.x = closestSolid.mesh.position.x;
          this.player.z = closestSolid.mesh.position.z;
          this.player.y = 1.0; // Place directly on the block for the landing animation

          // Determine correct direction by looking at the next block
          if (closestIndex + 1 < solids.length) {
            const nextSolid = solids[closestIndex + 1];
            if (nextSolid.mesh.position.x > closestSolid.mesh.position.x) {
              this.player.direction = "x";
              this.player.mesh.rotation.y = Math.PI / 2;
            } else {
              this.player.direction = "z";
              this.player.mesh.rotation.y = 0;
            }
          }
        }

        // Fix direction velocity based on current direction
        this.player.vx = this.player.direction === "x" ? this.player.speed : 0;
        this.player.vz = this.player.direction === "z" ? this.player.speed : 0;
        this.player.vy = 0;

        this.player.updateBounds();

        // Regenerate a straight path ahead so the player has time to react
        if (closestSolid) {
          this.levelBuilder.straightenPath(
            closestSolid,
            this.player.direction,
            8,
          );
        }

        this.state = "REVIVING";
        this.ui.clear();
        this.player.mesh.visible = true;

        // Ensure player starts high and falls down
        this.player.mesh.position.y = 20;

        // Fall animation using GSAP
        gsap.to(this.player.mesh.position, {
          y: 1.0, // Ground level
          duration: 0.5,
          ease: "power2.in",
          onComplete: () => {
            // Now they hit the ground!
            this.audio.playLand();
            this.player.playLanding(() => {
              this.state = "PLAYING";
              this.player.playRun();
              this.audio.playRun();
              this.ui.showHUD();
              this.ui.updateHUD(this.score, this.coinsThisRun);
            });
          },
        });

        // Background tasks that run immediately upon revive initiation
        this.audio.playBGM();
        this.player.mesh.visible = true;
      } else {
        // Show game over if ad fails or is cancelled
        this.ui.showGameOver(
          this.score,
          getStats().highScore || this.score,
          !this.hasDoubledThisRun,
        );
      }
    };

    this.ui.onDoubleReward = async () => {
      const success = await AdManager.showRewardedVideo();
      if (success) {
        this.hasDoubledThisRun = true;
        this.score *= 2;
        let stats = getStats();
        if (this.score > stats.highScore) {
          stats.highScore = this.score;
          saveStats(stats);
        }
        this.ui.showGameOver(this.score, stats.highScore, false); // Disable x2 button after using it
      }
    };

    this.ui.onToggleMusic = (state) => this.audio.setBGMEnabled(state);
    this.ui.onToggleSfx = (state) => this.audio.setSFXEnabled(state);

    this.switchState("MAIN_MENU");
  }

  resize(w, h) {
    if (this.environment && w && h) {
      this.environment.resize(w, h);
    }
    if (this.state === "MAIN_MENU") {
      this.ui.showMainMenu(getStats());
    } else if (this.state === "PLAYING") {
      this.ui.showHUD();
      this.ui.updateHUD(this.score, this.coinsThisRun);
    }
  }

  handleInput() {
    if (this.state === "PLAYING" && !this.player.isDead) {
      this.player.changeDirection();
      this.audio.playJump();
    }
  }

  switchState(newState) {
    this.state = newState;
    this.environment.setMode(newState === "MAIN_MENU" ? "menu" : "gameplay");
    if (newState !== "PLAYING") {
      this.audio.stopRun();
    }
    this.ui.clear();
    this.player.mesh.visible = false;

    // Try to play BGM in all states (Main Menu, Playing, etc.)
    // It will only actually start if the user has interacted with the document
    this.audio.playBGM();

    if (this.state === "MAIN_MENU") {
      this.ui.showMainMenu(getStats());
      this.levelBuilder.clear();
    } else if (this.state === "PLAYING") {
      this.loadLevel();
      this.audio.playRun();
      this.ui.showHUD();
      this.ui.updateHUD(this.score, this.coinsThisRun);
      this.audio.playBGM();
    }
  }

  loadLevel() {
    this.score = 0;
    this.coinsThisRun = 0;
    this.movementScoreElapsed = 0;
    this.hasRevivedThisRun = false;
    this.hasDoubledThisRun = false;

    // ── Wink: start a new round ──
    this._winkRound = winkGame.startRound();

    this.levelBuilder.clear();
    this.worldData = this.levelBuilder.buildLevel(0);

    this.player.spawn(
      this.worldData.spawnPoint.x,
      this.worldData.spawnPoint.z,
      0.08, // Start much slower
    );

    // Callbacks for physics
    this.worldData.onCoinCollected = (coin) => {
      this.audio.playCoin();
      const amount = this.hasDoubledThisRun ? 2 : 1;
      const scoreAward = COIN_SCORE * amount;
      this.coinsThisRun += amount;
      this.score += scoreAward;

      this.ui.updateHUD(this.score, this.coinsThisRun);

      if (coin && coin.mesh) {
        this.levelBuilder.spawnCoinVFX(
          coin.mesh.position.x,
          coin.mesh.position.y,
          coin.mesh.position.z,
          scoreAward,
        );
      }
    };

    this.worldData.onPlayerHit = () => {
      // Player falls
      if (this.state !== "GAME_OVER") {
        const fallSpeed = Math.hypot(this.player.vx, this.player.vz) || 1;
        this.fallCameraForwardX = this.player.vx / fallSpeed;
        this.fallCameraForwardZ = this.player.vz / fallSpeed;

        // Find which side of the road the character missed. The cinematic
        // camera uses that outside direction so the road stays out of frame.
        let nearestRoadX = this.player.x;
        let nearestRoadZ = this.player.z;
        let nearestRoadDistanceSq = Infinity;
        for (const solid of this.levelBuilder.solids) {
          const dx = this.player.x - solid.mesh.position.x;
          const dz = this.player.z - solid.mesh.position.z;
          const distanceSq = dx * dx + dz * dz;
          if (distanceSq < nearestRoadDistanceSq) {
            nearestRoadDistanceSq = distanceSq;
            nearestRoadX = solid.mesh.position.x;
            nearestRoadZ = solid.mesh.position.z;
          }
        }
        const outwardX = this.player.x - nearestRoadX;
        const outwardZ = this.player.z - nearestRoadZ;
        const outwardLength = Math.hypot(outwardX, outwardZ);
        if (outwardLength > 0.01) {
          this.fallCameraOutwardX = outwardX / outwardLength;
          this.fallCameraOutwardZ = outwardZ / outwardLength;
        } else {
          this.fallCameraOutwardX = -this.fallCameraForwardZ;
          this.fallCameraOutwardZ = this.fallCameraForwardX;
        }
        this.state = "GAME_OVER";
        this.audio.stopBGM();
        this.audio.stopRun();
        this.audio.playFall();
        this.player.playFall();

        // Delay before showing game over UI (give time for fall animation)
        setTimeout(() => {
          let stats = getStats();
          if (this.score > stats.highScore) {
            stats.highScore = this.score;
          }
          stats.totalCoins = (stats.totalCoins || 0) + this.coinsThisRun;
          saveStats(stats);

          this.ui.clear();

          if (!this.hasRevivedThisRun) {
            this.ui.showReviveOffer(
              () => {
                this.hasRevivedThisRun = true;
                if (this.ui.onRevive) this.ui.onRevive();
              },
              () => {
                // ── Wink: complete round + submit score ──
                if (this._winkRound) {
                  winkGame.completeRound(this._winkRound, {
                    metadata: {
                      outcome: "game_over",
                      score: Math.floor(this.score),
                    },
                  });
                  if (winkGame.canSubmitScore) {
                    winkGame
                      .submitFinalScore({
                        score: Math.floor(this.score),
                        playTime: Math.round(
                          (Date.now() - this._winkRound.startedAtMs) / 1000,
                        ),
                        gameMode: "classic",
                      })
                      .catch(() => {});
                  }
                }

                // ON REVIVE SKIP
                this.ui.showGameOver(
                  this.score,
                  stats.highScore || this.score,
                  !this.hasDoubledThisRun,
                );
              },
            );
          } else {
            // ── Wink: complete round + submit score ──
            if (this._winkRound) {
              winkGame.completeRound(this._winkRound, {
                metadata: {
                  outcome: "game_over",
                  score: Math.floor(this.score),
                },
              });
              if (winkGame.canSubmitScore) {
                winkGame
                  .submitFinalScore({
                    score: Math.floor(this.score),
                    playTime: Math.round(
                      (Date.now() - this._winkRound.startedAtMs) / 1000,
                    ),
                    gameMode: "classic",
                  })
                  .catch(() => {});
              }
            }

            // Already revived once, go straight to game over
            this.ui.showGameOver(
              this.score,
              stats.highScore || this.score,
              !this.hasDoubledThisRun,
            );
          }
        }, 2000);
      }
    };

    // Reset camera instantly to player
    this.camera.position.set(this.player.x - 20, 30, this.player.z - 20);
    this.camera.lookAt(this.player.x, 0, this.player.z);
  }

  update(deltaTime) {
    // Always update player animations (even during game over for death anim)
    this.player.update(deltaTime);

    // Update parallax background
    if (this.environment) {
      this.environment.update(this.player);
    }

    if (this.state === "PLAYING") {
      this.physics.update(deltaTime, this.player, this.worldData);

      if (!this.player.isDead) {
        // Endless Generation
        this.levelBuilder.update(this.player);

        // Award survival points on a time interval, rather than every frame.
        // This keeps the result stable across refresh rates and makes coins valuable.
        this.movementScoreElapsed += deltaTime;
        const movementAwards = Math.floor(
          this.movementScoreElapsed / MOVEMENT_SCORE_INTERVAL_SECONDS,
        );
        if (movementAwards > 0) {
          this.score += movementAwards * MOVEMENT_SCORE_PER_INTERVAL;
          this.movementScoreElapsed -=
            movementAwards * MOVEMENT_SCORE_INTERVAL_SECONDS;
          this.ui.updateHUD(this.score, this.coinsThisRun);
        }

        // Increase speed slightly over time (scaled for new speed)
        this.player.speed += 0.0001;
      }

      // Camera Isometric Follow (Zoomed out for 6x6 tiles)
      const targetX = this.player.x - 20;
      const targetY = 30;
      const targetZ = this.player.z - 20;

      this.camera.position.x += (targetX - this.camera.position.x) * 0.1;
      this.camera.position.y += (targetY - this.camera.position.y) * 0.1;
      this.camera.position.z += (targetZ - this.camera.position.z) * 0.1;

      this.camera.lookAt(this.player.x, 0, this.player.z);
    } else if (this.state === "REVIVING") {
      // Just update the camera to follow the player while they perform the landing animation
      const targetX = this.player.x - 20;
      const targetY = 30;
      const targetZ = this.player.z - 20;

      this.camera.position.x += (targetX - this.camera.position.x) * 0.1;
      this.camera.position.y += (targetY - this.camera.position.y) * 0.1;
      this.camera.position.z += (targetZ - this.camera.position.z) * 0.1;

      this.camera.lookAt(this.player.x, 0, this.player.z);
    } else if (this.state === "GAME_OVER") {
      // Allow player to visually fall off the screen in a slow cartoonish way
      if (this.player.isDead && this.player.y > -30) {
        this.player.vy -= 0.015; // Slow Gravity
        this.player.y += this.player.vy;
        this.player.x += this.player.vx;
        this.player.z += this.player.vz;
        this.player.updateBounds();

        // Stay behind the running direction (the familiar player view) and
        // shift outside the missed edge so the road cannot block the subject.
        const fallTrail = 6;
        const fallSide = 7;
        const targetX =
          this.player.x -
          this.fallCameraForwardX * fallTrail +
          this.fallCameraOutwardX * fallSide;
        const targetY = this.player.y + 10;
        const targetZ =
          this.player.z -
          this.fallCameraForwardZ * fallTrail +
          this.fallCameraOutwardZ * fallSide;
        const fallFollow = 1 - Math.exp(-10 * deltaTime);

        this.camera.position.x +=
          (targetX - this.camera.position.x) * fallFollow;
        this.camera.position.y +=
          (targetY - this.camera.position.y) * fallFollow;
        this.camera.position.z +=
          (targetZ - this.camera.position.z) * fallFollow;

        // Focus near the torso so the character remains the visual anchor.
        this.camera.lookAt(this.player.x, this.player.y + 1.2, this.player.z);

        this.player.mesh.position.x = this.player.x;
        this.player.mesh.position.y = this.player.y;
        this.player.mesh.position.z = this.player.z;
      }
    }
  }
}
