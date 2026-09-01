/**
 * Web Audio API based sound synthesizer & Speech synthesizer for Drone Simulator
 * 100% offline capable without external audio files.
 */

import { DroneModelType } from '../types';

/**
 * Web Audio API based sound synthesizer & Speech synthesizer for Drone Simulator
 * 100% offline capable without external audio files.
 * Generates unique acoustic profiles for each drone skin model.
 */

class SoundController {
  private ctx: AudioContext | null = null;
  private currentModelType: DroneModelType = 'QUAD_PROBE';

  // Primary oscillator & filter
  private motorOsc: OscillatorNode | null = null;
  private motorOsc2: OscillatorNode | null = null; // Secondary harmonic / sub-oscillator
  private motorGain: GainNode | null = null;
  private motorFilter: BiquadFilterNode | null = null;
  private jetNoiseNode: AudioBufferSourceNode | null = null;
  private jetNoiseGain: GainNode | null = null;
  private jetNoiseFilter: BiquadFilterNode | null = null;

  private enabled: boolean = true;
  private isMotorRunning: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Auto-mute all sounds when app goes to background or is closed
      const handleVisibilityChange = () => {
        if (document.hidden) {
          this.pauseAllAudio();
        } else {
          this.resumeAudio();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('pagehide', () => this.stopAllAudioImmediately());
      window.addEventListener('beforeunload', () => this.stopAllAudioImmediately());

      // Unlock mobile audio on first touch/click
      const unlockAudio = () => {
        this.initContext();
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        window.removeEventListener('touchstart', unlockAudio);
        window.removeEventListener('click', unlockAudio);
      };
      window.addEventListener('touchstart', unlockAudio, { passive: true });
      window.addEventListener('click', unlockAudio, { passive: true });
    }
  }

  public pauseAllAudio() {
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {});
    }
  }

  public resumeAudio() {
    if (this.enabled && this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public stopAllAudioImmediately() {
    this.stopMotorSound();
    if (this.ctx) {
      try {
        this.ctx.close().catch(() => {});
      } catch {
        // ignore
      }
      this.ctx = null;
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setSoundEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled && this.motorGain && this.ctx) {
      this.motorGain.gain.setValueAtTime(0, this.ctx.currentTime);
      if (this.jetNoiseGain) {
        this.jetNoiseGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
    }
  }

  public setVoiceEnabled(_enabled: boolean) {
    // Disabled
  }

  public setDroneModel(modelType: DroneModelType) {
    if (this.currentModelType === modelType) return;
    this.currentModelType = modelType;
    if (this.isMotorRunning) {
      // Re-initialize sound with new model acoustic parameters
      this.stopMotorSound();
      this.startMotorSound();
    }
  }

  public startMotorSound() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx || this.isMotorRunning) return;

    try {
      const now = this.ctx.currentTime;
      this.motorGain = this.ctx.createGain();
      this.motorFilter = this.ctx.createBiquadFilter();

      // Configure oscillators based on Drone Model Type
      switch (this.currentModelType) {
        case 'TWIN_RACER': {
          // 1. High-frequency Screaming FPV Racer Drone (High-pitch sawtooth with screeching bandpass resonance)
          this.motorOsc = this.ctx.createOscillator();
          this.motorOsc.type = 'sawtooth';
          this.motorOsc.frequency.setValueAtTime(180, now);

          this.motorOsc2 = this.ctx.createOscillator();
          this.motorOsc2.type = 'square';
          this.motorOsc2.frequency.setValueAtTime(360, now);

          this.motorFilter.type = 'bandpass';
          this.motorFilter.frequency.setValueAtTime(650, now);
          this.motorFilter.Q.setValueAtTime(3.5, now);

          const subGain = this.ctx.createGain();
          subGain.gain.setValueAtTime(0.3, now);
          this.motorOsc2.connect(subGain);
          subGain.connect(this.motorFilter);

          this.motorGain.gain.setValueAtTime(0.045, now);
          break;
        }

        case 'HEXA_RESCUE': {
          // 2. Heavy 6-Rotor Ambulance Hexacopter (Deep, throbbing, heavy bass rumble)
          this.motorOsc = this.ctx.createOscillator();
          this.motorOsc.type = 'triangle';
          this.motorOsc.frequency.setValueAtTime(65, now);

          this.motorOsc2 = this.ctx.createOscillator();
          this.motorOsc2.type = 'sawtooth';
          this.motorOsc2.frequency.setValueAtTime(130, now);

          this.motorFilter.type = 'lowpass';
          this.motorFilter.frequency.setValueAtTime(260, now);
          this.motorFilter.Q.setValueAtTime(1.8, now);

          const subGain = this.ctx.createGain();
          subGain.gain.setValueAtTime(0.5, now);
          this.motorOsc2.connect(subGain);
          subGain.connect(this.motorFilter);

          this.motorGain.gain.setValueAtTime(0.06, now);
          break;
        }

        case 'OCTA_EXPLORER': {
          // 3. 8-Rotor Coaxial Titan (Dual counter-rotating mechanical beating rotor chop)
          this.motorOsc = this.ctx.createOscillator();
          this.motorOsc.type = 'sawtooth';
          this.motorOsc.frequency.setValueAtTime(75, now);

          this.motorOsc2 = this.ctx.createOscillator();
          this.motorOsc2.type = 'sawtooth';
          this.motorOsc2.frequency.setValueAtTime(79, now); // 4Hz acoustic beating phase chop!

          this.motorFilter.type = 'lowpass';
          this.motorFilter.frequency.setValueAtTime(300, now);
          this.motorFilter.Q.setValueAtTime(2.2, now);

          const subGain = this.ctx.createGain();
          subGain.gain.setValueAtTime(0.4, now);
          this.motorOsc2.connect(subGain);
          subGain.connect(this.motorFilter);

          this.motorGain.gain.setValueAtTime(0.055, now);
          break;
        }

        case 'CYBER_JET': {
          // 4. Futuristic Delta-Wing Cyber Jet (Ion Turbine Roar with Whooshing Jet Exhaust)
          this.motorOsc = this.ctx.createOscillator();
          this.motorOsc.type = 'sawtooth';
          this.motorOsc.frequency.setValueAtTime(110, now);

          this.motorOsc2 = this.ctx.createOscillator();
          this.motorOsc2.type = 'sine';
          this.motorOsc2.frequency.setValueAtTime(440, now); // Turbine whistle

          this.motorFilter.type = 'lowpass';
          this.motorFilter.frequency.setValueAtTime(500, now);

          const subGain = this.ctx.createGain();
          subGain.gain.setValueAtTime(0.35, now);
          this.motorOsc2.connect(subGain);
          subGain.connect(this.motorFilter);

          // White noise generator for jet exhaust hiss
          const bufferSize = this.ctx.sampleRate * 2;
          const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const output = noiseBuffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
          }
          this.jetNoiseNode = this.ctx.createBufferSource();
          this.jetNoiseNode.buffer = noiseBuffer;
          this.jetNoiseNode.loop = true;

          this.jetNoiseFilter = this.ctx.createBiquadFilter();
          this.jetNoiseFilter.type = 'bandpass';
          this.jetNoiseFilter.frequency.setValueAtTime(800, now);
          this.jetNoiseFilter.Q.setValueAtTime(1.5, now);

          this.jetNoiseGain = this.ctx.createGain();
          this.jetNoiseGain.gain.setValueAtTime(0.02, now);

          this.jetNoiseNode.connect(this.jetNoiseFilter);
          this.jetNoiseFilter.connect(this.jetNoiseGain);
          this.jetNoiseGain.connect(this.ctx.destination);
          this.jetNoiseNode.start();

          this.motorGain.gain.setValueAtTime(0.045, now);
          break;
        }

        case 'STEALTH_ACE': {
          // 5. Radar-Evading Stealth Phantom (Ultra-quiet electromagnetic whisper hum)
          this.motorOsc = this.ctx.createOscillator();
          this.motorOsc.type = 'sine';
          this.motorOsc.frequency.setValueAtTime(90, now);

          this.motorFilter.type = 'lowpass';
          this.motorFilter.frequency.setValueAtTime(200, now);
          this.motorFilter.Q.setValueAtTime(0.5, now);

          this.motorGain.gain.setValueAtTime(0.025, now);
          break;
        }

        case 'QUAD_PROBE':
        default: {
          // 6. Classic Quad Probe X-4 (Balanced, crisp quadcopter motor hum)
          this.motorOsc = this.ctx.createOscillator();
          this.motorOsc.type = 'sawtooth';
          this.motorOsc.frequency.setValueAtTime(95, now);

          this.motorOsc2 = this.ctx.createOscillator();
          this.motorOsc2.type = 'triangle';
          this.motorOsc2.frequency.setValueAtTime(190, now);

          this.motorFilter.type = 'lowpass';
          this.motorFilter.frequency.setValueAtTime(340, now);

          const subGain = this.ctx.createGain();
          subGain.gain.setValueAtTime(0.25, now);
          this.motorOsc2.connect(subGain);
          subGain.connect(this.motorFilter);

          this.motorGain.gain.setValueAtTime(0.04, now);
          break;
        }
      }

      this.motorOsc.connect(this.motorFilter);
      this.motorFilter.connect(this.motorGain);
      this.motorGain.connect(this.ctx.destination);

      this.motorOsc.start();
      if (this.motorOsc2) {
        this.motorOsc2.start();
      }
      this.isMotorRunning = true;
    } catch {
      // Audio might be blocked by autoplay policies
    }
  }

  public updateMotorSound(throttlePct: number, speedKmh: number, isGrounded: boolean) {
    if (!this.enabled || !this.ctx || !this.isMotorRunning || !this.motorOsc || !this.motorGain || !this.motorFilter) {
      return;
    }

    try {
      const now = this.ctx.currentTime;
      const tNorm = Math.max(0, Math.min(throttlePct / 100, 1.0));
      const spdNorm = Math.min(speedKmh / 80, 1.0);

      switch (this.currentModelType) {
        case 'TWIN_RACER': {
          // High-frequency scream, responsive to throttle
          const baseFreq = isGrounded && throttlePct < 5 ? 120 : 180 + tNorm * 280 + spdNorm * 60;
          this.motorOsc.frequency.setTargetAtTime(baseFreq, now, 0.05);
          if (this.motorOsc2) {
            this.motorOsc2.frequency.setTargetAtTime(baseFreq * 1.8, now, 0.05);
          }
          this.motorFilter.frequency.setTargetAtTime(450 + tNorm * 1100, now, 0.05);
          const targetGain = isGrounded && throttlePct < 5 ? 0.02 : 0.04 + tNorm * 0.05;
          this.motorGain.gain.setTargetAtTime(targetGain, now, 0.05);
          break;
        }

        case 'HEXA_RESCUE': {
          // Deep heavy rotor throb
          const baseFreq = isGrounded && throttlePct < 5 ? 50 : 65 + tNorm * 85 + spdNorm * 25;
          this.motorOsc.frequency.setTargetAtTime(baseFreq, now, 0.09);
          if (this.motorOsc2) {
            this.motorOsc2.frequency.setTargetAtTime(baseFreq * 2.0, now, 0.09);
          }
          this.motorFilter.frequency.setTargetAtTime(200 + tNorm * 250, now, 0.09);
          const targetGain = isGrounded && throttlePct < 5 ? 0.03 : 0.05 + tNorm * 0.06;
          this.motorGain.gain.setTargetAtTime(targetGain, now, 0.09);
          break;
        }

        case 'OCTA_EXPLORER': {
          // Dual counter-rotating chop with beating
          const baseFreq = isGrounded && throttlePct < 5 ? 60 : 75 + tNorm * 105 + spdNorm * 30;
          this.motorOsc.frequency.setTargetAtTime(baseFreq, now, 0.08);
          if (this.motorOsc2) {
            this.motorOsc2.frequency.setTargetAtTime(baseFreq + (4 + tNorm * 6), now, 0.08);
          }
          this.motorFilter.frequency.setTargetAtTime(250 + tNorm * 350, now, 0.08);
          const targetGain = isGrounded && throttlePct < 5 ? 0.025 : 0.045 + tNorm * 0.05;
          this.motorGain.gain.setTargetAtTime(targetGain, now, 0.08);
          break;
        }

        case 'CYBER_JET': {
          // Ion turbine roar & exhaust hiss
          const baseFreq = isGrounded && throttlePct < 5 ? 80 : 110 + tNorm * 180 + spdNorm * 90;
          this.motorOsc.frequency.setTargetAtTime(baseFreq, now, 0.07);
          if (this.motorOsc2) {
            this.motorOsc2.frequency.setTargetAtTime(380 + tNorm * 520, now, 0.07);
          }
          this.motorFilter.frequency.setTargetAtTime(350 + tNorm * 800, now, 0.07);
          const targetGain = isGrounded && throttlePct < 5 ? 0.02 : 0.04 + tNorm * 0.05;
          this.motorGain.gain.setTargetAtTime(targetGain, now, 0.07);

          if (this.jetNoiseGain && this.jetNoiseFilter) {
            const noiseGainVal = isGrounded && throttlePct < 5 ? 0.005 : 0.015 + tNorm * 0.04;
            this.jetNoiseGain.gain.setTargetAtTime(noiseGainVal, now, 0.07);
            this.jetNoiseFilter.frequency.setTargetAtTime(600 + tNorm * 1200, now, 0.07);
          }
          break;
        }

        case 'STEALTH_ACE': {
          // Ultra quiet whisper hum
          const baseFreq = isGrounded && throttlePct < 5 ? 70 : 90 + tNorm * 95 + spdNorm * 20;
          this.motorOsc.frequency.setTargetAtTime(baseFreq, now, 0.1);
          this.motorFilter.frequency.setTargetAtTime(160 + tNorm * 180, now, 0.1);
          const targetGain = isGrounded && throttlePct < 5 ? 0.01 : 0.02 + tNorm * 0.025;
          this.motorGain.gain.setTargetAtTime(targetGain, now, 0.1);
          break;
        }

        case 'QUAD_PROBE':
        default: {
          // Classic quadcopter whine
          const baseFreq = isGrounded && throttlePct < 5 ? 75 : 95 + tNorm * 150 + spdNorm * 45;
          this.motorOsc.frequency.setTargetAtTime(baseFreq, now, 0.08);
          if (this.motorOsc2) {
            this.motorOsc2.frequency.setTargetAtTime(baseFreq * 2, now, 0.08);
          }
          this.motorFilter.frequency.setTargetAtTime(280 + tNorm * 420, now, 0.08);
          const targetGain = isGrounded && throttlePct < 5 ? 0.02 : 0.04 + tNorm * 0.045;
          this.motorGain.gain.setTargetAtTime(targetGain, now, 0.08);
          break;
        }
      }
    } catch {
      // ignore
    }
  }

  public stopMotorSound() {
    if (this.motorOsc && this.isMotorRunning) {
      try {
        this.motorOsc.stop();
        this.motorOsc.disconnect();
      } catch {
        // ignore
      }
    }
    if (this.motorOsc2) {
      try {
        this.motorOsc2.stop();
        this.motorOsc2.disconnect();
      } catch {
        // ignore
      }
      this.motorOsc2 = null;
    }
    if (this.jetNoiseNode) {
      try {
        this.jetNoiseNode.stop();
        this.jetNoiseNode.disconnect();
      } catch {
        // ignore
      }
      this.jetNoiseNode = null;
    }
    this.isMotorRunning = false;
  }

  public playCoin() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // Primary Bright Chime (B5 -> E6 sparkling arpeggio)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(987.77, now); // B5
      osc1.frequency.setValueAtTime(1318.51, now + 0.07); // E6
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.38);

      // Harmonic Crystal Sparkle (G#6 -> B6 overtone)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1661.22, now + 0.05); // G#6
      osc2.frequency.setValueAtTime(1975.53, now + 0.12); // B6
      gain2.gain.setValueAtTime(0.22, now + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.05);
      osc2.stop(now + 0.42);
    } catch {
      // ignore
    }
  }

  public playRingPass() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.06); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.12); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.18); // C6

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch {
      // ignore
    }
  }

  public playRescuePickup() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.25);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {
      // ignore
    }
  }

  public playRescueDelivered() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const startTime = this.ctx!.currentTime + idx * 0.08;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.3);
      });
    } catch {
      // ignore
    }
  }

  public playCrash() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // White noise for crash impact
      const bufferSize = this.ctx.sampleRate * 0.3;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.linearRampToValueAtTime(100, now + 0.3);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
    } catch {
      // ignore
    }
  }

  public playSparkImpact(speed: number = 5) {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const volume = Math.min(0.35, Math.max(0.08, (speed / 15) * 0.35));

      // 1. Low Metallic Thud (Carbon fiber / aluminum frame deflection)
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);

      oscGain.gain.setValueAtTime(volume * 0.8, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);

      // 2. High Spark Crackle & Friction Noise Burst
      const noiseBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.12), this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(3200, now);
      bandpass.Q.setValueAtTime(2.5, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(volume, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      noiseSource.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noiseSource.start(now);
    } catch {
      // ignore
    }
  }

  public playCountdownBeep(isGo: boolean = false) {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      if (!isGo) {
        // Crisp 3, 2, 1 Preparation Beep (F5 ~698.46 Hz)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(698.46, now);

        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.18);
      } else {
        // High Energetic Dual-Harmonic GO Launch Fanfare (C6 1046.5 Hz + G6 1567.98 Hz)
        [1046.5, 1567.98].forEach((freq) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now);

          const filter = this.ctx!.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(2500, now);

          gain.gain.setValueAtTime(0.24, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.ctx!.destination);

          osc.start(now);
          osc.stop(now + 0.55);
        });
      }
    } catch {
      // ignore
    }
  }

  public playVictory() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const fanfare = [
        { f: 523.25, d: 0.15 }, // C5
        { f: 523.25, d: 0.15 }, // C5
        { f: 523.25, d: 0.15 }, // C5
        { f: 659.25, d: 0.35 }, // E5
        { f: 783.99, d: 0.25 }, // G5
        { f: 1046.5, d: 0.60 }, // C6
      ];

      let delay = 0;
      fanfare.forEach((n) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const startTime = this.ctx!.currentTime + delay;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.f, startTime);

        gain.gain.setValueAtTime(0.18, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + n.d);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(startTime);
        osc.stop(startTime + n.d);

        delay += n.d * 0.9;
      });
    } catch {
      // ignore
    }
  }

  public playRadioChime() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.setValueAtTime(1174.66, now + 0.04); // D6
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // ignore
    }
  }

  public async speakGuide(_text: string) {
    // Completely disabled as requested
  }
}

export const soundManager = new SoundController();

