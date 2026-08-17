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

    this.bgmBufferName = "bgm";
    this.bgmSource = null;
    this.bgmGain.gain.value = 0.08; // Base volume for BGM

    this.loadBGM();
    this.loadSFX();
  }

  resumeContext() {
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  async loadBGM() {
    try {
      const response = await window.fetch("/assest/music/IngameMusic1.m4a");
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.buffers[this.bgmBufferName] = audioBuffer;

      if (this.isBgmEnabled && !this.bgmSource) {
        this.playBGM();
      }
    } catch (e) {
      console.error("Error loading BGM", e);
    }
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
    this.loadAudioBuffer("/assest/music/Bounce2.mp3", "jump");
    this.loadAudioBuffer("/assest/music/LabelCollect.mp3", "coin");
    this.loadAudioBuffer("/assest/music/Button1.mp3", "click");
    // this.loadAudioBuffer("/assest/music/SurfMud2.mp3", "run"); // Disabled due to noise and out-of-sync
    this.loadAudioBuffer("/assest/music/CharKnockDown.mp3", "fall");
    this.loadAudioBuffer("/assest/music/CharSpawn.mp3", "land");
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
    if (!this.buffers[this.bgmBufferName]) return; // Not loaded yet
    if (this.bgmSource) return; // Already playing

    this.bgmSource = this.ctx.createBufferSource();
    this.bgmSource.buffer = this.buffers[this.bgmBufferName];
    this.bgmSource.loop = true;

    this.bgmSource.connect(this.bgmGain);
    this.bgmSource.start(0);
  }

  stopBGM() {
    if (this.bgmSource) {
      try {
        this.bgmSource.stop();
      } catch (e) {
        console.warn("Failed to stop BGM", e);
      }
      this.bgmSource = null;
    }
  }

  setBGMEnabled(enabled) {
    this.isBgmEnabled = enabled;
    this.bgmGain.gain.value = enabled ? 0.08 : 0;
    if (enabled) {
      this.playBGM();
    } else {
      this.stopBGM();
    }
  }

  setSFXEnabled(enabled) {
    this.isSfxEnabled = enabled;
    this.sfxGain.gain.value = enabled ? 1 : 0;
  }

  async pauseForFocus() {
    this.wasContextRunningBeforeFocus = this.ctx?.state === "running";
    if (this.wasContextRunningBeforeFocus) await this.ctx.suspend();
  }

  async resumeFromFocus() {
    if (this.wasContextRunningBeforeFocus && this.ctx) await this.ctx.resume();
    this.wasContextRunningBeforeFocus = false;
  }

  playJump() {
    this.playSound("jump", false, 0.8);
  }
  playCoin() {
    this.playSound("coin", false, 1.0);
  }
  playClick() {
    this.playSound("click", false, 1.0);
  }

  playRun() {
    // Disabled: running footstep sounds were too noisy and out of sync with animation
  }

  stopRun() {
    // Disabled
  }

  playFall() {
    this.playSound("fall", false, 1.0);
  }
  playLand() {
    this.playSound("land", false, 1.0);
  }
}
