/**
 * Lofi Chill Instrumental Procedural Music Synthesizer
 * Generates an endless, relaxing Lo-Fi chill beat with warm electric piano chords,
 * gentle vinyl crackle, subtle heartbeat kick, and soft jazz harmonies.
 * 100% offline, zero external asset dependencies, zero network requests.
 */

let audioCtx: AudioContext | null = null;
let isPlaying = false;
let masterGain: GainNode | null = null;
let sequenceTimer: any = null;
let vinylNode: AudioNode | null = null;
let currentVolume = 0.35; // Comfortable, relaxing background level

// Lo-Fi Chord Progressions (Frequencies in Hz)
// 1. Dm9: D3, F3, A3, C4, E4
// 2. G13: G2, F3, B3, E4, A4
// 3. Cmaj9: C3, E3, G3, B3, D4
// 4. Am9: A2, G3, C4, E4, B4
const CHORD_PROGRESSION = [
  [146.83, 174.61, 220.0, 261.63, 329.63], // Dm9
  [98.0, 174.61, 246.94, 329.63, 440.0],   // G13
  [130.81, 164.81, 196.0, 246.94, 293.66], // Cmaj9
  [110.0, 196.0, 261.63, 329.63, 493.88],  // Am9
];

const BASS_NOTES = [73.42, 49.0, 65.41, 55.0]; // D2, G1, C2, A1

function getAudioContext(): AudioContext | null {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Creates continuous soft vinyl crackle and analog room warmth
 */
function startVinylCrackle(ctx: AudioContext, destination: GainNode): AudioNode | null {
  try {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink noise smoothing filter
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      // Occasional gentle vinyl pop / click
      if (Math.random() < 0.0008) {
        output[i] += (Math.random() - 0.5) * 0.4;
      }
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, ctx.currentTime);
    filter.Q.setValueAtTime(1.2, ctx.currentTime);

    const vinylGain = ctx.createGain();
    vinylGain.gain.setValueAtTime(0.025, ctx.currentTime); // Very subtle, soothing

    whiteNoise.connect(filter);
    filter.connect(vinylGain);
    vinylGain.connect(destination);

    whiteNoise.start();
    return whiteNoise;
  } catch {
    return null;
  }
}

/**
 * Synthesizes a warm Lo-Fi Rhodes / Electric Piano chord note
 */
function playWarmNote(ctx: AudioContext, freq: number, startTime: number, duration: number, dest: GainNode) {
  try {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const noteGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, startTime);

    // Second oscillator slightly detuned for lush Lo-Fi chorus width
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 1.002, startTime);

    // Warm low-pass filter with gentle roll-off
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, startTime);
    filter.frequency.exponentialRampToValueAtTime(380, startTime + duration);

    // Velvety Lo-Fi envelope: Soft attack, slow mellow decay
    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.linearRampToValueAtTime(0.08, startTime + 0.08);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(noteGain);
    noteGain.connect(dest);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration + 0.1);
    osc2.stop(startTime + duration + 0.1);
  } catch {}
}

/**
 * Soft Sub-Kick Drum (Muffled Lo-Fi Heartbeat)
 */
function playLofiKick(ctx: AudioContext, time: number, dest: GainNode) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.16);

    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(time);
    osc.stop(time + 0.25);
  } catch {}
}

/**
 * Soft Lo-Fi Snare / Rim Click (Subtle brush sound)
 */
function playLofiSnare(ctx: AudioContext, time: number, dest: GainNode) {
  try {
    const bufferSize = ctx.sampleRate * 0.12;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.035));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, time);
    filter.Q.setValueAtTime(1.5, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.09, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    noise.start(time);
    noise.stop(time + 0.14);
  } catch {}
}

/**
 * Starts the continuous Lo-Fi chill beat loop
 */
export function startLofiMusic(): boolean {
  if (isPlaying) return true;
  const ctx = getAudioContext();
  if (!ctx) return false;

  try {
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(currentVolume, ctx.currentTime);
    masterGain.connect(ctx.destination);

    // Start background vinyl crackle
    vinylNode = startVinylCrackle(ctx, masterGain);

    let step = 0;
    const stepDuration = 3.6; // 3.6 seconds per chord (relaxed ~67 BPM)

    const scheduleMeasure = () => {
      if (!isPlaying || !ctx || !masterGain) return;
      const now = ctx.currentTime;
      const chordIndex = step % CHORD_PROGRESSION.length;
      const chord = CHORD_PROGRESSION[chordIndex];
      const bassFreq = BASS_NOTES[chordIndex];

      // 1. Play Electric Piano Chord Notes with slight strum delay
      chord.forEach((freq, idx) => {
        playWarmNote(ctx, freq, now + idx * 0.03, stepDuration * 0.95, masterGain!);
      });

      // 2. Deep warm Bass
      playWarmNote(ctx, bassFreq, now, stepDuration * 0.9, masterGain!);

      // 3. Gentle Drum groove
      // Beat 1: Kick
      playLofiKick(ctx, now, masterGain!);
      // Beat 2: Soft Snare / Rim Click
      playLofiSnare(ctx, now + stepDuration * 0.25, masterGain!);
      // Beat 3: Second Kick
      playLofiKick(ctx, now + stepDuration * 0.5, masterGain!);
      // Beat 4: Snare
      playLofiSnare(ctx, now + stepDuration * 0.75, masterGain!);

      step++;
      sequenceTimer = setTimeout(scheduleMeasure, stepDuration * 1000 - 40);
    };

    isPlaying = true;
    scheduleMeasure();

    try {
      localStorage.setItem('veo_lofi_enabled', '1');
    } catch {}

    return true;
  } catch (err) {
    console.error('Failed to start Lo-Fi Chill:', err);
    isPlaying = false;
    return false;
  }
}

/**
 * Stops the Lo-Fi chill beat
 */
export function stopLofiMusic() {
  isPlaying = false;
  if (sequenceTimer) {
    clearTimeout(sequenceTimer);
    sequenceTimer = null;
  }

  if (vinylNode) {
    try {
      (vinylNode as any).stop?.();
      vinylNode.disconnect();
    } catch {}
    vinylNode = null;
  }

  if (masterGain && audioCtx) {
    try {
      masterGain.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3);
      setTimeout(() => {
        masterGain?.disconnect();
        masterGain = null;
      }, 350);
    } catch {}
  }

  try {
    localStorage.setItem('veo_lofi_enabled', '0');
  } catch {}
}

export function toggleLofiMusic(): boolean {
  if (isPlaying) {
    stopLofiMusic();
    return false;
  } else {
    return startLofiMusic();
  }
}

export function isLofiPlaying(): boolean {
  return isPlaying;
}

export function setLofiVolume(vol: number) {
  currentVolume = Math.max(0, Math.min(1, vol));
  if (masterGain && audioCtx) {
    masterGain.gain.setValueAtTime(currentVolume, audioCtx.currentTime);
  }
}
