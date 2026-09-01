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

  // BGM Engine State
  private currentBgmType: 'LOBBY' | 'RACING' | 'RACING_2' | null = null;
  private bgmIntervalId: number | null = null;
  private bgmGainNode: GainNode | null = null;
  private bgmMasterVolume: number = 0.22;
  private cachedSnareNoiseBuffer: AudioBuffer | null = null;

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
      try {
        this.ctx.suspend().catch(() => {});
      } catch {
        // ignore
      }
    }
  }

  public resumeAudio() {
    if (this.enabled && this.ctx && this.ctx.state === 'suspended') {
      try {
        this.ctx.resume().catch(() => {});
      } catch {
        // ignore
      }
    }
  }

  private initContext() {
    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      if (this.ctx && !this.cachedSnareNoiseBuffer) {
        const bufferLength = Math.floor(this.ctx.sampleRate * 0.15);
        this.cachedSnareNoiseBuffer = this.ctx.createBuffer(1, bufferLength, this.ctx.sampleRate);
        const data = this.cachedSnareNoiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.25));
        }
      }
    } catch {
      // ignore
    }
  }

  public setSoundEnabled(enabled: boolean) {
    this.enabled = enabled;
    try {
      if (this.bgmGainNode && this.ctx && this.ctx.state !== 'closed') {
        this.bgmGainNode.gain.setValueAtTime(enabled ? this.bgmMasterVolume : 0, this.ctx.currentTime);
      }
      if (!enabled && this.motorGain && this.ctx && this.ctx.state !== 'closed') {
        this.motorGain.gain.setValueAtTime(0, this.ctx.currentTime);
        if (this.jetNoiseGain) {
          this.jetNoiseGain.gain.setValueAtTime(0, this.ctx.currentTime);
        }
      }
    } catch {
      // ignore
    }
  }

  public setVoiceEnabled(_enabled: boolean) {
    // Disabled
  }

  public stopAllAudioImmediately() {
    this.stopBgm();
    this.stopMotorSound();
    if (this.ctx) {
      try {
        if (this.ctx.state !== 'closed') {
          this.ctx.close().catch(() => {});
        }
      } catch {
        // ignore
      }
      this.ctx = null;
    }
  }

  // ==========================================
  // BGM SYNTHESIS ENGINE
  // ==========================================

  private getBgmGain(): GainNode | null {
    if (!this.ctx || this.ctx.state === 'closed') return null;
    try {
      if (!this.bgmGainNode || this.bgmGainNode.context !== this.ctx) {
        this.bgmGainNode = this.ctx.createGain();
        this.bgmGainNode.connect(this.ctx.destination);
      }
      // Ensure target volume is set
      this.bgmGainNode.gain.cancelScheduledValues(this.ctx.currentTime);
      this.bgmGainNode.gain.setValueAtTime(this.enabled ? this.bgmMasterVolume : 0, this.ctx.currentTime);
      return this.bgmGainNode;
    } catch {
      return null;
    }
  }

  public stopBgm() {
    if (this.bgmIntervalId !== null) {
      window.clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
    this.currentBgmType = null;
    if (this.bgmGainNode && this.ctx && this.ctx.state !== 'closed') {
      try {
        this.bgmGainNode.gain.cancelScheduledValues(this.ctx.currentTime);
        this.bgmGainNode.gain.setValueAtTime(0, this.ctx.currentTime);
      } catch {
        // ignore
      }
    }
  }

  /**
   * 1. Lobby BGM: Bright, Cheerful & Uplifting Arcade Groove
   * 120 BPM upbeat groove with bouncy marimba/rhodes chords, cheerful melodies, warm slap bass & acoustic style drum groove
   */
  public playLobbyBgm() {
    if (!this.enabled || this.currentBgmType === 'LOBBY') return;
    try {
      this.initContext();
      if (!this.ctx || this.ctx.state === 'closed') return;

      this.stopBgm();
      this.currentBgmType = 'LOBBY';

      const masterGain = this.getBgmGain();
      if (!masterGain) return;
      masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      masterGain.gain.setValueAtTime(this.enabled ? 0.32 : 0, this.ctx.currentTime);

      // 120 BPM -> 1 beat = 0.5s, 8th note = 0.25s, 1 bar (4 beats) = 2.0s
      // Bright Pop Chord Progression: Cmaj7 -> G/B -> Am7 -> Fmaj7
      const chordProgression = [
        // Cmaj7
        { root: 130.81, notes: [261.63, 329.63, 392.0, 493.88, 523.25] },
        // G (with B in bass)
        { root: 123.47, notes: [246.94, 293.66, 392.0, 493.88, 587.33] },
        // Am7
        { root: 110.0, notes: [220.0, 261.63, 329.63, 392.0, 523.25] },
        // Fmaj7
        { root: 87.31, notes: [174.61, 261.63, 329.63, 349.23, 440.0] }
      ];

      // Cheerful Melody Hooks (played alternately)
      const melodyPatterns = [
        [523.25, 0, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25], // C -> D -> E -> G -> E -> D -> C
        [659.25, 783.99, 880.0, 0, 783.99, 659.25, 587.33, 659.25],
        [880.0, 0, 783.99, 659.25, 587.33, 523.25, 440.0, 523.25],
        [659.25, 587.33, 523.25, 0, 587.33, 659.25, 783.99, 1046.5]
      ];

      let barIdx = 0;
      let stepInLoop = 0;

      const playLobbyBeat = () => {
        if (this.currentBgmType !== 'LOBBY' || !this.ctx || this.ctx.state === 'closed' || !this.enabled) return;

        try {
          const now = this.ctx.currentTime;
          const currentBar = Math.floor(stepInLoop / 8) % chordProgression.length;
          const stepInBar = stepInLoop % 8; // 8th notes (0.25s each)
          stepInLoop++;

          const chord = chordProgression[currentBar];
          const melody = melodyPatterns[currentBar];

          // 1. Kick Drum on Beats 1 & 3 (steps 0, 4)
          if (stepInBar === 0 || stepInBar === 4) {
            const kickOsc = this.ctx.createOscillator();
            const kickGain = this.ctx.createGain();
            kickOsc.type = 'sine';
            kickOsc.frequency.setValueAtTime(120, now);
            kickOsc.frequency.exponentialRampToValueAtTime(45, now + 0.1);

            kickGain.gain.setValueAtTime(0.24, now);
            kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

            kickOsc.connect(kickGain);
            kickGain.connect(masterGain);
            kickOsc.start(now);
            kickOsc.stop(now + 0.15);
          }

          // 2. Snappy Finger-Snap / Rimshot on Beats 2 & 4 (steps 2, 6)
          if (stepInBar === 2 || stepInBar === 6) {
            const snapOsc = this.ctx.createOscillator();
            const snapGain = this.ctx.createGain();
            snapOsc.type = 'triangle';
            snapOsc.frequency.setValueAtTime(800, now);
            snapOsc.frequency.exponentialRampToValueAtTime(250, now + 0.04);

            snapGain.gain.setValueAtTime(0.14, now);
            snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

            snapOsc.connect(snapGain);
            snapGain.connect(masterGain);
            snapOsc.start(now);
            snapOsc.stop(now + 0.07);
          }

          // 3. Light Shaker / Hi-Hat on every 8th note
          const hatOsc = this.ctx.createOscillator();
          const hatGain = this.ctx.createGain();
          const hatFilter = this.ctx.createBiquadFilter();
          hatFilter.type = 'highpass';
          hatFilter.frequency.setValueAtTime(7000, now);

          hatOsc.type = 'square';
          hatOsc.frequency.setValueAtTime(9000, now);
          hatGain.gain.setValueAtTime(stepInBar % 2 === 0 ? 0.03 : 0.018, now);
          hatGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

          hatOsc.connect(hatFilter);
          hatFilter.connect(hatGain);
          hatGain.connect(masterGain);
          hatOsc.start(now);
          hatOsc.stop(now + 0.04);

          // 4. Bouncy Electric Bass Groove (steps 0, 3, 4, 6)
          if (stepInBar === 0 || stepInBar === 3 || stepInBar === 4 || stepInBar === 6) {
            const bassOsc = this.ctx.createOscillator();
            const bassGain = this.ctx.createGain();
            const bassFilter = this.ctx.createBiquadFilter();

            bassFilter.type = 'lowpass';
            bassFilter.frequency.setValueAtTime(450, now);

            bassOsc.type = 'triangle';
            const noteOffset = stepInBar === 3 ? 1.25 : (stepInBar === 6 ? 1.5 : 1.0);
            bassOsc.frequency.setValueAtTime(chord.root * noteOffset, now);

            bassGain.gain.setValueAtTime(0.18, now);
            bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

            bassOsc.connect(bassFilter);
            bassFilter.connect(bassGain);
            bassGain.connect(masterGain);
            bassOsc.start(now);
            bassOsc.stop(now + 0.24);
          }

          // 5. Warm Rhodes / Keyboard Stabs (Offbeat Syncopation: steps 1, 3, 5, 7)
          if (stepInBar % 2 === 1) {
            chord.notes.slice(0, 3).forEach((freq, idx) => {
              if (!this.ctx || this.ctx.state === 'closed') return;
              const keyOsc = this.ctx.createOscillator();
              const keyGain = this.ctx.createGain();
              keyOsc.type = 'sine';
              keyOsc.frequency.setValueAtTime(freq, now);

              keyGain.gain.setValueAtTime(0.06, now);
              keyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

              keyOsc.connect(keyGain);
              keyGain.connect(masterGain);
              keyOsc.start(now);
              keyOsc.stop(now + 0.2);
            });
          }

          // 6. Cheerful Bell / Marimba Melody Lead
          const melodyFreq = melody[stepInBar];
          if (melodyFreq > 0) {
            const bellOsc = this.ctx.createOscillator();
            const bellGain = this.ctx.createGain();
            const bellFilter = this.ctx.createBiquadFilter();

            bellFilter.type = 'bandpass';
            bellFilter.frequency.setValueAtTime(1500, now);
            bellFilter.Q.setValueAtTime(1.5, now);

            bellOsc.type = 'triangle';
            bellOsc.frequency.setValueAtTime(melodyFreq, now);

            bellGain.gain.setValueAtTime(0.10, now);
            bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

            bellOsc.connect(bellFilter);
            bellFilter.connect(bellGain);
            bellGain.connect(masterGain);
            bellOsc.start(now);
            bellOsc.stop(now + 0.3);
          }
        } catch {
          // ignore
        }
      };

      // Play immediately and schedule at 120 BPM 8th notes (~250ms)
      playLobbyBeat();
      this.bgmIntervalId = window.setInterval(playLobbyBeat, 248);
    } catch {
      // ignore
    }
  }

  /**
   * 2. Racing BGM: High-Octane Synthwave & Cyber Techno Circuit Theme
   * Fast BPM (136 BPM), Driving Kick & Snare, 16th-note Sawtooth Bassline & Melodic Lead
   */
  public playRacingBgm() {
    if (!this.enabled || this.currentBgmType === 'RACING') return;
    try {
      this.initContext();
      if (!this.ctx || this.ctx.state === 'closed') return;

      this.stopBgm();
      this.currentBgmType = 'RACING';

      // Use a dedicated high-impact volume for Racing BGM (Punchy Hot Drop EDM)
      const masterGain = this.getBgmGain();
      if (!masterGain) return;
      masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      masterGain.gain.setValueAtTime(this.enabled ? 0.38 : 0, this.ctx.currentTime);

      // 148 BPM Hard Trap / Hot Drop Cyber Bass Groove (Fast & Intense)
      // 1 beat = 0.4054s, 16th note = 0.1013s, 1 bar (4 beats) = 1.6216s
      const stepTime = 0.1013;
      let step = 0;

      // Heavy Phrygian Dominant & Industrial Bassline progression: F# -> G -> F# -> D
      const rootNotes = [92.5, 98.0, 92.5, 73.42]; // F#2, G2, F#2, D2
      
      // Brass / Synth Lead Riff (High Tension PUBG Hot Drop Stabs)
      const leadStabFreqs: { [step: number]: number[] } = {
        0: [370.0, 554.37, 739.99], // F# Major / Octaves
        2: [370.0, 554.37, 739.99],
        4: [392.0, 587.33, 783.99], // G tension stab
        6: [370.0, 554.37, 739.99],
        8: [493.88, 739.99, 987.77], // High B scream
        10: [440.0, 659.25, 880.0],  // A stab
        12: [392.0, 587.33, 783.99], // G stab
        14: [370.0, 493.88, 739.99]  // Rapid resolve
      };

      const playRacingStep = () => {
        if (this.currentBgmType !== 'RACING' || !this.ctx || this.ctx.state === 'closed' || !this.enabled) return;

        try {
          const now = this.ctx.currentTime;
          const barIdx = Math.floor(step / 16) % rootNotes.length;
          const stepInBar = step % 16;
          step++;

          const rootFreq = rootNotes[barIdx];

          // 1. Heavy 808 Kick Drum (Beats 1, 4, 7, 9, 11 - Syncopated Trap Rhythm)
          const isKick = stepInBar === 0 || stepInBar === 4 || stepInBar === 7 || stepInBar === 10 || stepInBar === 14;
          if (isKick) {
            const kickOsc = this.ctx.createOscillator();
            const kickGain = this.ctx.createGain();
            kickOsc.type = 'sine';
            // Hard transient pitch drop
            kickOsc.frequency.setValueAtTime(180, now);
            kickOsc.frequency.exponentialRampToValueAtTime(42, now + 0.08);
            kickOsc.frequency.exponentialRampToValueAtTime(32, now + 0.22);

            kickGain.gain.setValueAtTime(0.42, now);
            kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

            kickOsc.connect(kickGain);
            kickGain.connect(masterGain);
            kickOsc.start(now);
            kickOsc.stop(now + 0.24);
          }

          // 2. Punchy Snare / Trap Clap (Beats 4, 12 - with pre-roll roll on bar ends)
          const isSnare = stepInBar === 4 || stepInBar === 12 || (barIdx === 3 && stepInBar >= 13);
          if (isSnare) {
            // Tonal body
            const snareOsc = this.ctx.createOscillator();
            const snareGain = this.ctx.createGain();
            snareOsc.type = 'triangle';
            snareOsc.frequency.setValueAtTime(220, now);
            snareOsc.frequency.exponentialRampToValueAtTime(80, now + 0.12);

            snareGain.gain.setValueAtTime(0.26, now);
            snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

            snareOsc.connect(snareGain);
            snareGain.connect(masterGain);
            snareOsc.start(now);
            snareOsc.stop(now + 0.16);

            // Reusable Noise splash (Zero GC allocation)
            if (this.cachedSnareNoiseBuffer) {
              const noiseSrc = this.ctx.createBufferSource();
              noiseSrc.buffer = this.cachedSnareNoiseBuffer;
              const noiseFilter = this.ctx.createBiquadFilter();
              noiseFilter.type = 'highpass';
              noiseFilter.frequency.setValueAtTime(1200, now);
              const noiseGain = this.ctx.createGain();
              noiseGain.gain.setValueAtTime(0.18, now);
              noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

              noiseSrc.connect(noiseFilter);
              noiseFilter.connect(noiseGain);
              noiseGain.connect(masterGain);
              noiseSrc.start(now);
              noiseSrc.stop(now + 0.13);
            }
          }

          // 3. Fast Trap Hi-Hat Roll (16th notes & rapid triplets on steps 6, 14)
          const isRoll = stepInBar === 6 || stepInBar === 14;
          const hatCount = isRoll ? 2 : 1;
          for (let h = 0; h < hatCount; h++) {
            const hOffset = h * (stepTime * 0.45);
            const hatOsc = this.ctx.createOscillator();
            const hatGain = this.ctx.createGain();
            const hatFilter = this.ctx.createBiquadFilter();
            hatFilter.type = 'highpass';
            hatFilter.frequency.setValueAtTime(6000, now + hOffset);

            hatOsc.type = 'square';
            hatOsc.frequency.setValueAtTime(8500, now + hOffset);

            hatGain.gain.setValueAtTime(isRoll ? 0.08 : 0.05, now + hOffset);
            hatGain.gain.exponentialRampToValueAtTime(0.0001, now + hOffset + 0.035);

            hatOsc.connect(hatFilter);
            hatFilter.connect(hatGain);
            hatGain.connect(masterGain);
            hatOsc.start(now + hOffset);
            hatOsc.stop(now + hOffset + 0.04);
          }

          // 4. Distorted Reeses / 808 Sub-Bassline (Every step with dynamic slide)
          const bassOsc = this.ctx.createOscillator();
          const bassGain = this.ctx.createGain();
          const bassFilter = this.ctx.createBiquadFilter();

          bassFilter.type = 'lowpass';
          bassFilter.frequency.setValueAtTime(550, now);
          bassFilter.Q.setValueAtTime(2.5, now);

          bassOsc.type = 'sawtooth';
          // Syncopated pitch jump on 808
          const isBassGlide = stepInBar === 3 || stepInBar === 7 || stepInBar === 11 || stepInBar === 15;
          const pitch = isBassGlide ? rootFreq * 1.5 : rootFreq;
          bassOsc.frequency.setValueAtTime(pitch, now);
          if (isBassGlide) {
            bassOsc.frequency.exponentialRampToValueAtTime(rootFreq, now + stepTime * 0.8);
          }

          bassGain.gain.setValueAtTime(0.22, now);
          bassGain.gain.exponentialRampToValueAtTime(0.01, now + stepTime * 0.95);

          bassOsc.connect(bassFilter);
          bassFilter.connect(bassGain);
          bassGain.connect(masterGain);

          bassOsc.start(now);
          bassOsc.stop(now + stepTime * 0.98);

          // 5. Aggressive Cyber Brass / Lead Stabs (Hot Drop Battle Theme)
          if (leadStabFreqs[stepInBar]) {
            const freqs = leadStabFreqs[stepInBar];
            freqs.forEach((f, idx) => {
              if (!this.ctx || this.ctx.state === 'closed') return;
              const leadOsc = this.ctx.createOscillator();
              const leadGain = this.ctx.createGain();
              const leadFilter = this.ctx.createBiquadFilter();

              leadFilter.type = 'bandpass';
              leadFilter.frequency.setValueAtTime(1800 + idx * 300, now);
              leadFilter.Q.setValueAtTime(3.0, now);

              leadOsc.type = 'sawtooth';
              leadOsc.frequency.setValueAtTime(f, now);
              leadOsc.detune.setValueAtTime((idx - 1) * 12, now); // Wide detune for epic brass

              leadGain.gain.setValueAtTime(0.12, now);
              leadGain.gain.exponentialRampToValueAtTime(0.001, now + stepTime * 1.4);

              leadOsc.connect(leadFilter);
              leadFilter.connect(leadGain);
              leadGain.connect(masterGain);

              leadOsc.start(now);
              leadOsc.stop(now + stepTime * 1.5);
            });
          }
        } catch {
          // ignore
        }
      };

      // Trigger step sequence at 148 BPM (~101.3ms per 16th note)
      playRacingStep();
      this.bgmIntervalId = window.setInterval(playRacingStep, 101);
    } catch {
      // ignore
    }
  }

  /**
   * 3. Racing BGM Level 2: Cyber Overdrive Drum & Bass (162 BPM)
   * Super fast 162 BPM Breakbeat / Cyber DnB groove with aggressive Reese sub-bass,
   * blazing 16th-note arpeggiator synths, rapid syncopated breaks, and laser stabs!
   */
  public playRacingLevel2Bgm() {
    if (!this.enabled || this.currentBgmType === 'RACING_2') return;
    try {
      this.initContext();
      if (!this.ctx || this.ctx.state === 'closed') return;

      this.stopBgm();
      this.currentBgmType = 'RACING_2';

      const masterGain = this.getBgmGain();
      if (!masterGain) return;
      masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      masterGain.gain.setValueAtTime(this.enabled ? 0.38 : 0, this.ctx.currentTime);

      // 162 BPM Drum & Bass / Breakbeat tempo
      // 1 beat = 0.3703s, 16th note = 0.0925s, 1 bar (4 beats) = 1.481s
      const stepTime = 0.0925;
      let step = 0;

      // Dark, intense Cyber DnB Root progression: E2 (82.41) -> C2 (65.41) -> D2 (73.42) -> B1 (61.74)
      const rootNotes = [82.41, 65.41, 73.42, 61.74];
      
      // High-speed Cyber Arpeggio Sequences (16 notes per bar)
      const arpeggioChords = [
        // Em: E4, G4, B4, E5, D5, B4, G4, A4, B4, D5, E5, G5, E5, D5, B4, G4
        [329.63, 392.0, 493.88, 659.25, 587.33, 493.88, 392.0, 440.0, 493.88, 587.33, 659.25, 783.99, 659.25, 587.33, 493.88, 392.0],
        // Cmaj: C4, E4, G4, C5, B4, G4, E4, G4, C5, E5, G5, A5, G5, E5, C5, G4
        [261.63, 329.63, 392.0, 523.25, 493.88, 392.0, 329.63, 392.0, 523.25, 659.25, 783.99, 880.0, 783.99, 659.25, 523.25, 392.0],
        // D: D4, F#4, A4, D5, C5, A4, F#4, A4, D5, F#5, A5, B5, A5, F#5, D5, A4
        [293.66, 369.99, 440.0, 587.33, 523.25, 440.0, 369.99, 440.0, 587.33, 739.99, 880.0, 987.77, 880.0, 739.99, 587.33, 440.0],
        // Bm / B7 tension: B3, D#4, F#4, B4, A4, F#4, D#4, F#4, B4, D#5, F#5, G5, F#5, D#5, B4, A4
        [246.94, 311.13, 369.99, 493.88, 440.0, 369.99, 311.13, 369.99, 493.88, 622.25, 739.99, 783.99, 739.99, 622.25, 493.88, 440.0]
      ];

      const playLevel2Step = () => {
        if (this.currentBgmType !== 'RACING_2' || !this.ctx || this.ctx.state === 'closed' || !this.enabled) return;

        try {
          const now = this.ctx.currentTime;
          const barIdx = Math.floor(step / 16) % rootNotes.length;
          const stepInBar = step % 16;
          step++;

          const rootFreq = rootNotes[barIdx];
          const arpPattern = arpeggioChords[barIdx];

          // 1. Fast DnB Breakbeat Kick (Beat 1: step 0, Beat 3.5: step 10, Beat 4+: step 11)
          const isDnBKick = stepInBar === 0 || stepInBar === 10 || (barIdx === 3 && stepInBar === 14);
          if (isDnBKick) {
            const kickOsc = this.ctx.createOscillator();
            const kickGain = this.ctx.createGain();
            kickOsc.type = 'sine';
            kickOsc.frequency.setValueAtTime(200, now);
            kickOsc.frequency.exponentialRampToValueAtTime(46, now + 0.06);
            kickOsc.frequency.exponentialRampToValueAtTime(30, now + 0.18);

            kickGain.gain.setValueAtTime(0.44, now);
            kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

            kickOsc.connect(kickGain);
            kickGain.connect(masterGain);
            kickOsc.start(now);
            kickOsc.stop(now + 0.20);
          }

          // 2. Crisp DnB Snare on Beats 2 & 4 (steps 4, 12) + Quick Ghost Snare (step 7, 15)
          const isMainSnare = stepInBar === 4 || stepInBar === 12;
          const isGhostSnare = stepInBar === 7 || stepInBar === 15;
          if (isMainSnare || isGhostSnare) {
            const snareGainVol = isMainSnare ? 0.28 : 0.09;
            const snareOsc = this.ctx.createOscillator();
            const snareGain = this.ctx.createGain();
            snareOsc.type = 'triangle';
            snareOsc.frequency.setValueAtTime(isMainSnare ? 240 : 180, now);
            snareOsc.frequency.exponentialRampToValueAtTime(95, now + 0.08);

            snareGain.gain.setValueAtTime(snareGainVol, now);
            snareGain.gain.exponentialRampToValueAtTime(0.001, now + (isMainSnare ? 0.13 : 0.07));

            snareOsc.connect(snareGain);
            snareGain.connect(masterGain);
            snareOsc.start(now);
            snareOsc.stop(now + 0.14);

            // Reusable Noise snap (Zero GC allocation)
            if (this.cachedSnareNoiseBuffer) {
              const noiseSrc = this.ctx.createBufferSource();
              noiseSrc.buffer = this.cachedSnareNoiseBuffer;
              const noiseFilter = this.ctx.createBiquadFilter();
              noiseFilter.type = 'highpass';
              noiseFilter.frequency.setValueAtTime(isMainSnare ? 1600 : 2500, now);
              const noiseGain = this.ctx.createGain();
              noiseGain.gain.setValueAtTime(isMainSnare ? 0.20 : 0.06, now);
              noiseGain.gain.exponentialRampToValueAtTime(0.001, now + (isMainSnare ? 0.11 : 0.06));

              noiseSrc.connect(noiseFilter);
              noiseFilter.connect(noiseGain);
              noiseGain.connect(masterGain);
              noiseSrc.start(now);
              noiseSrc.stop(now + (isMainSnare ? 0.12 : 0.07));
            }
          }

          // 3. Ultra-fast Cyber 16th Hi-Hats / Shakers
          const hatOsc = this.ctx.createOscillator();
          const hatGain = this.ctx.createGain();
          const hatFilter = this.ctx.createBiquadFilter();
          hatFilter.type = 'highpass';
          hatFilter.frequency.setValueAtTime(7500, now);

          hatOsc.type = 'square';
          hatOsc.frequency.setValueAtTime(9500, now);
          const isAccent = stepInBar % 4 === 2;
          hatGain.gain.setValueAtTime(isAccent ? 0.06 : 0.035, now);
          hatGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.032);

          hatOsc.connect(hatFilter);
          hatFilter.connect(hatGain);
          hatGain.connect(masterGain);
          hatOsc.start(now);
          hatOsc.stop(now + 0.035);

          // 4. Heavy Distorted Reese Bass (Detuned Sawtooth Wave with moving cutoff)
          if (stepInBar % 2 === 0) {
            const reeseOsc1 = this.ctx.createOscillator();
            const reeseOsc2 = this.ctx.createOscillator();
            const reeseGain = this.ctx.createGain();
            const reeseFilter = this.ctx.createBiquadFilter();

            const cutoffFreq = 420 + Math.sin(step * 0.4) * 220;
            reeseFilter.type = 'lowpass';
            reeseFilter.frequency.setValueAtTime(cutoffFreq, now);
            reeseFilter.Q.setValueAtTime(3.2, now);

            reeseOsc1.type = 'sawtooth';
            reeseOsc2.type = 'sawtooth';

            const pitchShift = (stepInBar === 6 || stepInBar === 14) ? rootFreq * 1.33 : rootFreq;
            reeseOsc1.frequency.setValueAtTime(pitchShift, now);
            reeseOsc2.frequency.setValueAtTime(pitchShift, now);
            reeseOsc1.detune.setValueAtTime(-14, now);
            reeseOsc2.detune.setValueAtTime(14, now);

            reeseGain.gain.setValueAtTime(0.24, now);
            reeseGain.gain.exponentialRampToValueAtTime(0.01, now + stepTime * 1.9);

            reeseOsc1.connect(reeseFilter);
            reeseOsc2.connect(reeseFilter);
            reeseFilter.connect(reeseGain);
            reeseGain.connect(masterGain);

            reeseOsc1.start(now);
            reeseOsc2.start(now);
            reeseOsc1.stop(now + stepTime * 1.95);
            reeseOsc2.stop(now + stepTime * 1.95);
          }

          // 5. Blazing 16th-Note Cyber Arpeggiator Lead Synth
          const arpNote = arpPattern[stepInBar];
          if (arpNote) {
            const leadOsc = this.ctx.createOscillator();
            const leadGain = this.ctx.createGain();
            const leadFilter = this.ctx.createBiquadFilter();

            leadFilter.type = 'bandpass';
            leadFilter.frequency.setValueAtTime(2200 + (stepInBar % 4) * 400, now);
            leadFilter.Q.setValueAtTime(2.5, now);

            leadOsc.type = 'sawtooth';
            leadOsc.frequency.setValueAtTime(arpNote, now);

            leadGain.gain.setValueAtTime(0.11, now);
            leadGain.gain.exponentialRampToValueAtTime(0.001, now + stepTime * 0.9);

            leadOsc.connect(leadFilter);
            leadFilter.connect(leadGain);
            leadGain.connect(masterGain);

            leadOsc.start(now);
            leadOsc.stop(now + stepTime * 0.95);
          }

          // 6. Laser Impact Zap on Bar Downbeat (step 0 of every bar)
          if (stepInBar === 0) {
            const zapOsc = this.ctx.createOscillator();
            const zapGain = this.ctx.createGain();
            zapOsc.type = 'sawtooth';
            zapOsc.frequency.setValueAtTime(1600, now);
            zapOsc.frequency.exponentialRampToValueAtTime(120, now + 0.15);

            zapGain.gain.setValueAtTime(0.12, now);
            zapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

            zapOsc.connect(zapGain);
            zapGain.connect(masterGain);
            zapOsc.start(now);
            zapOsc.stop(now + 0.17);
          }
        } catch {
          // ignore
        }
      };

      // Trigger step sequence at 162 BPM (~92.5ms per 16th note)
      playLevel2Step();
      this.bgmIntervalId = window.setInterval(playLevel2Step, 92);
    } catch {
      // ignore
    }
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

