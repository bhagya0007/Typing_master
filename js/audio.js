/**
 * TYPE//TANK - Web Audio API Procedural Sound Synthesizer
 * 100% Procedural Audio - Zero External Audio Files
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.masterGain = null;
    this.noiseBuffer = null;
    this.initialized = false;
  }

  /**
   * Lazily initialize AudioContext on first user interaction
   */
  init() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn("Web Audio API not supported on this browser.");
        return;
      }

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.35, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Pre-create 1-second white noise buffer for crisp explosions & clicks
      const bufferSize = this.ctx.sampleRate * 1.0;
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      this.initialized = true;
    } catch (e) {
      console.warn("Failed to initialize Web Audio:", e);
    }
  }

  /**
   * Toggle mute state
   * @returns {boolean} Current muted state
   */
  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /**
   * Set specific mute state
   * @param {boolean} isMuted 
   */
  setMuted(isMuted) {
    this.muted = isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.35, this.ctx.currentTime);
    }
  }

  /**
   * Ensure audio context is ready
   */
  ensureContext() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * High-frequency laser shot on correct keystroke
   * Crisp downward exponential pitch drop with harmonic snap
   */
  playLaser() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    // Frequency sweep from 1100Hz down to 120Hz in 0.08s
    osc.frequency.setValueAtTime(1100, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.08);

    // Filter to give punchy retro arcade edge
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, t);
    filter.frequency.exponentialRampToValueAtTime(800, t + 0.08);

    // Envelope
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.085);
  }

  /**
   * Heavy metallic thump / explosion on word elimination
   */
  playExplosion(isBonus = false) {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const duration = isBonus ? 0.65 : 0.45;

    // 1. Low sub-bass sine drop for metallic shockwave punch
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(isBonus ? 220 : 160, t);
    subOsc.frequency.exponentialRampToValueAtTime(28, t + duration * 0.8);

    subGain.gain.setValueAtTime(isBonus ? 0.8 : 0.55, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(t);
    subOsc.stop(t + duration);

    // 2. Filtered noise burst for explosive blast
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(isBonus ? 1600 : 1100, t);
      noiseFilter.frequency.exponentialRampToValueAtTime(180, t + duration);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(isBonus ? 0.6 : 0.4, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      noise.start(t);
      noise.stop(t + duration);
    }
  }

  /**
   * High-pitched dual-tone chime on red bonus word spawn
   */
  playRedSpawn() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [1046.5, 1318.5, 1567.98]; // C6, E6, G6 rapid alert arpeggio

    notes.forEach((freq, idx) => {
      const noteTime = t + idx * 0.06;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.2, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.19);
    });
  }

  /**
   * Low crunch / screen shake buzz on damage impact
   */
  playDamage() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const duration = 0.35;

    // Distorted low buzz
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.linearRampToValueAtTime(45, t + duration);

    // Overdrive distortion curve
    const distortion = this.ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = ((Math.PI + 4) * x) / (Math.PI + 4 * Math.abs(x));
    }
    distortion.curve = curve;

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(distortion);
    distortion.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + duration);
  }

  /**
   * Multi-tone triumphant fanfare for new personal records
   */
  playFanfare() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Classic 8-bit victory arpeggio: C4, G4, C5, E5, G5, C6 (sustained)
    const melody = [
      { freq: 261.63, start: 0.00, dur: 0.12 },
      { freq: 392.00, start: 0.11, dur: 0.12 },
      { freq: 523.25, start: 0.22, dur: 0.12 },
      { freq: 659.25, start: 0.33, dur: 0.14 },
      { freq: 783.99, start: 0.46, dur: 0.16 },
      { freq: 1046.50, start: 0.62, dur: 0.70 } // Grand finale
    ];

    melody.forEach(note => {
      const noteTime = t + note.start;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, noteTime);

      gain.gain.setValueAtTime(0.35, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + note.dur);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(noteTime);
      osc.stop(noteTime + note.dur + 0.02);
    });
  }

  /**
   * Soft retro terminal click on UI buttons and menus
   */
  playClick() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.02);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.022);
  }

  /**
   * Subtle error blip when mistyping
   */
  playError() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(130, t);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.075);
  }
}

// Global instance
window.SoundEngine = new SoundEngine();
