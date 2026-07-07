export class AudioManager {
  constructor() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    this.bgmGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();

    this.bgmGain.connect(this.ctx.destination);
    this.sfxGain.connect(this.ctx.destination);

    // States
    this.isBgmEnabled = true;
    this.isSfxEnabled = true;

    this.buffers = {};
    this.runSource = null;

    this.initBGM();
    this.loadSFX();
  }

  resumeContext() {
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  initBGM() {
    this.bgm = new Audio("/assest/music/IngameMusic1.wav");
    this.bgm.loop = true;

    const source = this.ctx.createMediaElementSource(this.bgm);
    const localGain = this.ctx.createGain();
    localGain.gain.value = 0.2; // Base volume for BGM reduced
    source.connect(localGain);
    localGain.connect(this.bgmGain);
  }

  async loadAudioBuffer(url, name) {
    try {
      const response = await window.fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.buffers[name] = audioBuffer;
    } catch (e) {
      console.error("Error loading audio", url, e);
    }
  }

  loadSFX() {
    this.loadAudioBuffer("/assest/music/Bounce1.mp3", "jump");
    this.loadAudioBuffer("/assest/music/LabelCollect.mp3", "coin");
    this.loadAudioBuffer("/assest/music/Button1.mp3", "click");
    this.loadAudioBuffer("/assest/music/SurfMud1.mp3", "run");
    this.loadAudioBuffer("/assest/music/CharKnockDown.mp3", "fall");
    this.loadAudioBuffer("/assest/music/Chest_Drop.mp3", "land");
  }

  playSound(name, loop = false, volume = 1.0) {
    this.resumeContext();
    if (!this.buffers[name]) return null;

    const source = this.ctx.createBufferSource();
    source.buffer = this.buffers[name];
    source.loop = loop;

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(this.sfxGain);

    source.start(0);
    return source;
  }

  playBGM() {
    this.resumeContext();
    // Only call play if it's currently paused
    if (this.bgm.paused) {
      this.bgm.play().catch((e) => console.log("BGM play deferred", e));
    }
  }

  stopBGM() {
    // We NEVER pause the HTML Audio element to avoid iOS Safari AudioContext suspension
    // Instead we just mute it via GainNode if needed, or let it play silently
  }

  setBGMEnabled(enabled) {
    this.isBgmEnabled = enabled;
    this.bgmGain.gain.value = enabled ? 1 : 0;
    if (enabled) {
      this.playBGM();
    }
  }

  setSFXEnabled(enabled) {
    this.isSfxEnabled = enabled;
    this.sfxGain.gain.value = enabled ? 1 : 0;
  }

  playJump() { this.playSound("jump", false, 0.8); }
  playCoin() { this.playSound("coin", false, 1.0); }
  playClick() { this.playSound("click", false, 1.0); }

  playRun() {
    if (this.runSource) return;
    this.runSource = this.playSound("run", true, 0.4);
  }

  stopRun() {
    if (this.runSource) {
      try {
        this.runSource.stop();
      } catch (e) {
        console.warn("Failed to stop run source", e);
      }
      this.runSource = null;
    }
  }

  playFall() {
    this.playSound("fall", false, 1.0);
  }
  playLand() {
    this.playSound("land", false, 1.0);
  }
}
