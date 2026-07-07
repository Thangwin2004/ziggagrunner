import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import gsap from "gsap";

export class Player {
  constructor(scene) {
    this.scene = scene;

    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.vx = 0;
    this.vz = 0;
    this.vy = 0;

    this.isDead = false;
    this.speed = 0.45;
    this.direction = "z";

    const width = 1.6;

    this.bounds = {
      x: 0,
      z: 0,
      width,
      depth: width,
    };

    // Animation state
    this.modelLoaded = false;
    this.animTime = 0;
    this.isRunning = false;

    // Bone references
    this.bones = {};

    // Container group
    this.mesh = new THREE.Group();
    this.bodyMesh = null;
    this.mixer = null;
    this.scene.add(this.mesh);

    this._loadModel();
  }

  _loadModel() {
    const loader = new FBXLoader();
    loader.load(
      "/models/character_long.fbx",
      (object) => {
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const targetHeight = 3.5; // Make it significantly larger
        const scaleFactor = targetHeight / size.y;
        object.scale.setScalar(scaleFactor);

        object.position.x = -center.x * scaleFactor;
        object.position.y = -box.min.y * scaleFactor;
        object.position.z = -center.z * scaleFactor;

        // Fix materials: FrontSide only to prevent geometry poking through
        object.traverse((child) => {
          if (child.isMesh) {
            console.log("Mesh name in FBX:", child.name);
            child.castShadow = true;
            child.receiveShadow = true;

            // Hide helper geometry or STATIC meshes (which cause the "2 layers" overlapping bug)
            const lowerName = child.name.toLowerCase();
            if (
              lowerName.includes("helper") ||
              lowerName.includes("collider") ||
              lowerName.includes("physic") ||
              !child.isSkinnedMesh // HIDE any mesh that is not skinned! This fixes the rigid duplicate character bug!
            ) {
              child.visible = false;
              console.log("Hidden static/helper mesh:", child.name);
            } else {
              // Fix materials for SkinnedMeshes: FrontSide only
              if (child.material) {
                const mats = Array.isArray(child.material)
                  ? child.material
                  : [child.material];
                mats.forEach((mat) => {
                  mat.side = THREE.FrontSide;
                  mat.depthWrite = true;
                  // FIX FBXLoader transparent sorting bug!
                  // FBXLoader often incorrectly flags solid materials as transparent,
                  // causing inner mouth/teeth to render ON TOP of the back of the head!
                  mat.transparent = false;
                  mat.alphaTest = 0.5; // Keeps transparency for cutout textures (like hair/eyelashes)
                });
              }
            }
          }
        });

        this.bodyMesh = object;
        this.mesh.add(object);

        this.mixer = new THREE.AnimationMixer(this.bodyMesh);

        this._loadMixamoAnimation("/models/Goofy Running.fbx", (anim) => {
          this.runAction = this.mixer.clipAction(anim);
          if (this.isRunning && !this.isDead) this.runAction.play();
          console.log("Goofy Running animation loaded!");
        });

        this._loadMixamoAnimation("/models/Falling.fbx", (anim) => {
          this.fallAction = this.mixer.clipAction(anim);
          this.fallAction.loop = THREE.LoopOnce;
          this.fallAction.clampWhenFinished = true;
          console.log("Falling animation loaded!");
        });

        this._loadMixamoAnimation("/models/Hard Landing.fbx", (anim) => {
          this.landingAction = this.mixer.clipAction(anim);
          this.landingAction.loop = THREE.LoopOnce;
          this.landingAction.clampWhenFinished = true;
          console.log("Hard Landing animation loaded!");
        });

        this.modelLoaded = true;
      },
      undefined,
      (error) => {
        console.error("Error loading player FBX:", error);
        this._createFallbackMesh();
      },
    );
  }

  _loadMixamoAnimation(url, onLoad) {
    const loader = new FBXLoader();
    loader.load(
      url,
      (animObject) => {
        if (animObject.animations && animObject.animations.length > 0) {
          const anim = animObject.animations[0];

          // Retarget Mixamo animation to CC_Base skeleton
          const boneMap = {
            Hips: "CC_Base_Hip",
            Spine: "CC_Base_Waist",
            Spine1: "CC_Base_Spine01",
            Spine2: "CC_Base_Spine02",
            Neck: "CC_Base_NeckTwist01",
            Head: "CC_Base_Head",
            LeftShoulder: "CC_Base_L_Clavicle",
            LeftArm: "CC_Base_L_Upperarm",
            LeftForeArm: "CC_Base_L_Forearm",
            LeftHand: "CC_Base_L_Hand",
            RightShoulder: "CC_Base_R_Clavicle",
            RightArm: "CC_Base_R_Upperarm",
            RightForeArm: "CC_Base_R_Forearm",
            RightHand: "CC_Base_R_Hand",
            LeftUpLeg: "CC_Base_L_Thigh",
            LeftLeg: "CC_Base_L_Calf",
            LeftFoot: "CC_Base_L_Foot",
            LeftToeBase: "CC_Base_L_ToeBase",
            RightUpLeg: "CC_Base_R_Thigh",
            RightLeg: "CC_Base_R_Calf",
            RightFoot: "CC_Base_R_Foot",
            RightToeBase: "CC_Base_R_ToeBase",
          };

          anim.tracks.forEach((track) => {
            const trackNameParts = track.name.split(".");
            let boneName = trackNameParts[0];
            boneName = boneName
              .replace("mixamorig:", "")
              .replace("mixamorig", "");

            if (boneMap[boneName]) {
              track.name = boneMap[boneName] + "." + trackNameParts[1];
            }
          });

          // Fix Mixamo snapping and flipping by removing position tracks and root quaternion
          anim.tracks = anim.tracks.filter((track) => {
            if (track.name.endsWith(".position")) return false; // Removes forward translation that causes snapping
            if (track.name === "CC_Base_Hip.quaternion") return false; // Prevents 90 degree flip
            return true;
          });

          onLoad(anim);
        }
      },
      undefined,
      (err) => console.error("Error loading " + url + ":", err),
    );
  }

  spawn(x, z, speed) {
    this.x = x;
    this.y = 1.0;
    this.z = z;
    this.speed = speed;
    this.vx = 0;
    this.vz = this.speed;
    this.vy = 0;
    this.direction = "z";
    this.isDead = false;
    this.isRunning = true;
    this.animTime = 0;
    this.updateBounds();
    this.mesh.visible = true;
    this.mesh.rotation.y = 0;
    this.mesh.scale.set(1, 1, 1);

    if (this.runAction && !this.runAction.isRunning()) {
      this.runAction.reset();
      this.runAction.play();
    }
    if (this.fallAction) {
      this.fallAction.stop();
    }
  }

  playFall() {
    this.isDead = true;
    this.isRunning = false;
    if (this.runAction) this.runAction.stop();
    if (this.landingAction) this.landingAction.stop();
    if (this.fallAction) {
      this.fallAction.reset();
      this.fallAction.play();
    }
  }

  playLanding(onFinished) {
    this.isDead = false;
    this.isRunning = false;
    if (this.runAction) this.runAction.stop();
    if (this.fallAction) this.fallAction.stop();

    if (this.landingAction) {
      this.landingAction.reset();
      this.landingAction.play();

      const onMixerFinish = (e) => {
        if (e.action === this.landingAction) {
          this.mixer.removeEventListener("finished", onMixerFinish);
          if (onFinished) onFinished();
        }
      };
      this.mixer.addEventListener("finished", onMixerFinish);
    } else {
      if (onFinished) onFinished();
    }
  }

  playRun() {
    this.isRunning = true;
    if (this.landingAction) this.landingAction.stop();
    if (this.fallAction) this.fallAction.stop();
    if (this.runAction) {
      this.runAction.reset();
      this.runAction.play();
    }
  }

  updateBounds() {
    this.bounds.x = this.x - this.bounds.width / 2;
    this.bounds.z = this.z - this.bounds.depth / 2;

    this.mesh.position.x = this.x;
    this.mesh.position.y = this.y;
    this.mesh.position.z = this.z;
  }

  changeDirection() {
    if (this.direction === "z") {
      this.direction = "x";
      this.vx = this.speed;
      this.vz = 0;
      gsap.to(this.mesh.rotation, {
        y: Math.PI / 2,
        duration: 0.15,
        ease: "power2.out",
      });
    } else {
      this.direction = "z";
      this.vx = 0;
      this.vz = this.speed;
      gsap.to(this.mesh.rotation, {
        y: 0,
        duration: 0.15,
        ease: "power2.out",
      });
    }
    this.squashAndStretch(0.85); // Uniform scale to avoid distortion
  }

  squashAndStretch(scaleVal) {
    if (!this.bodyMesh) return;
    gsap.killTweensOf(this.mesh.scale);
    this.mesh.scale.setScalar(scaleVal);
    gsap.to(this.mesh.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.3,
      ease: "elastic.out(1, 0.3)",
    });
  }

  update(deltaTime) {
    if (!this.modelLoaded) return;

    if (this.mixer) {
      this.mixer.update(deltaTime);
    }
  }

  destroy() {
    this.scene.remove(this.mesh);
  }
}
