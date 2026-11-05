/**
 * Luxury Cockpit Audio Synthesizer: Kenny G Smooth Saxophone & Lo-Fi Chill
 * High-fidelity, procedural Web Audio engine featuring:
 * 1. 🎷 Kenny G - "Going Home" (Soprano Saxophone & Luxury Piano)
 * 2. 🎷 Kenny G - "Forever in Love" (Romantic Smooth Jazz)
 * 3. 🎷 Kenny G - "Songbird" (Morning Breeze Saxophone)
 * 4. ☕ Lo-Fi Chill Hop (Midnight Beats & Vinyl Warmth)
 * 100% offline, zero asset dependencies, zero network latency.
 */

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  genre: string;
  icon: string;
  desc: string;
}

export const LUXURY_TRACKS: MusicTrack[] = [
  {
    id: 'kennyg-going-home',
    title: 'Going Home',
    artist: 'Kenny G (Soprano Saxophone)',
    genre: 'Smooth Jazz Sang Trọng',
    icon: '🎷',
    desc: 'Giai điệu kinh điển ngọt ngào, thư thái, mang lại cảm giác bình yên ấm áp khi lái xe về nhà.',
  },
  {
    id: 'kennyg-forever-love',
    title: 'Forever in Love',
    artist: 'Kenny G (Saxophone Romantique)',
    genre: 'Romantic Saxophone',
    icon: '🎷',
    desc: 'Giai điệu saxophone lãng mạn du dương, sang trọng chuẩn khoang lái xe sang.',
  },
  {
    id: 'kennyg-songbird',
    title: 'Songbird',
    artist: 'Kenny G (Golden Melody)',
    genre: 'Signature Smooth Jazz',
    icon: '🎷',
    desc: 'Bản hòa tấu saxophone rộn ràng, thư giãn và đánh thức tinh thần sảng khoái trên cao tốc.',
  },
  {
    id: 'lofi-midnight',
    title: 'Midnight Cockpit Chill',
    artist: 'Veo Soundscapes',
    genre: 'Lo-Fi Chillhop',
    icon: '☕',
    desc: 'Hợp âm Rhodes điện tử êm dịu, tiếng nổ lép bép của đĩa than cổ điển chống mệt mỏi.',
  },
];

let audioCtx: AudioContext | null = null;
let isPlaying = false;
let masterGain: GainNode | null = null;
let sequenceTimer: any = null;
let vinylNode: AudioNode | null = null;
let currentVolume = 0.35;
let currentTrackId = 'kennyg-going-home';
const trackListeners = new Set<(track: MusicTrack) => void>();

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
 * Procedural Soprano Saxophone Note Synthesizer
 * Models the acoustic warmth, reed harmonics, air breath, and singing vibrato of Kenny G's soprano sax.
 */
function playSaxophoneNote(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  dest: GainNode,
  vibratoDepth: number = 7,
  vibratoSpeed: number = 5.0
) {
  try {
    const osc1 = ctx.createOscillator(); // Fundamental body tone
    const osc2 = ctx.createOscillator(); // Bright upper harmonic
    const noteGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Vibrato LFO (giving Kenny G's signature soulful vibrato)
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(vibratoSpeed, startTime);
    lfoGain.gain.setValueAtTime(0, startTime);
    // Vibrato starts slightly after attack (natural human breath)
    lfoGain.gain.linearRampToValueAtTime(vibratoDepth, startTime + Math.min(0.2, duration * 0.4));

    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);

    // Warm reed oscillator mix
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, startTime);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq * 2.001, startTime); // 2nd harmonic for crisp brass sheen

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.22, startTime);
    osc2.connect(osc2Gain);

    // Formant filter (soprano saxophone bell frequency ~1400Hz - 2200Hz)
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1550, startTime);
    filter.Q.setValueAtTime(2.2, startTime);

    // Saxophone Envelope: Smooth breathy attack, singing sustain, gentle release
    const attackTime = 0.06;
    const releaseTime = 0.12;
    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.linearRampToValueAtTime(0.16, startTime + attackTime);
    noteGain.gain.setValueAtTime(0.14, startTime + duration - releaseTime);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(filter);
    osc2Gain.connect(filter);
    filter.connect(noteGain);
    noteGain.connect(dest);

    lfo.start(startTime);
    osc1.start(startTime);
    osc2.start(startTime);

    const stopTime = startTime + duration + 0.1;
    lfo.stop(stopTime);
    osc1.stop(stopTime);
    osc2.stop(stopTime);
  } catch {}
}

/**
 * Synthesizes a warm acoustic piano accompaniment note
 */
function playPianoNote(ctx: AudioContext, freq: number, startTime: number, duration: number, dest: GainNode) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, startTime);
    filter.frequency.exponentialRampToValueAtTime(280, startTime + duration);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.07, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  } catch {}
}

/**
 * Vinyl crackle for vintage warmth
 */
function startVinylCrackle(ctx: AudioContext, destination: GainNode): AudioNode | null {
  try {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      if (Math.random() < 0.0006) {
        output[i] += (Math.random() - 0.5) * 0.3;
      }
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, ctx.currentTime);
    filter.Q.setValueAtTime(1.5, ctx.currentTime);

    const vinylGain = ctx.createGain();
    vinylGain.gain.setValueAtTime(0.018, ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(vinylGain);
    vinylGain.connect(destination);

    whiteNoise.start();
    return whiteNoise;
  } catch {
    return null;
  }
}

// -------------------------------------------------------------
// MELODIES & CHORD SHEETS FOR LUXURY TRACKS
// -------------------------------------------------------------

// Note Frequencies in Hz
const N = {
  G3: 196.0, A3: 220.0, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
  Fs4: 369.99, G4: 392.0, A4: 440.0, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25,
  Fs5: 739.99, G5: 783.99, A5: 880.0,
};

// 1. Kenny G - Going Home
const GOING_HOME_PHRASES = [
  // Measure 1: D4 -> G4 -> A4 -> B4 (Về nhà...)
  {
    chords: [N.G3, N.B3, N.D4],
    bass: 98.0,
    saxNotes: [
      { f: N.D4, d: 0.6, o: 0.0 },
      { f: N.G4, d: 0.8, o: 0.6 },
      { f: N.A4, d: 0.6, o: 1.4 },
      { f: N.B4, d: 1.4, o: 2.0 },
    ],
  },
  // Measure 2: B4 -> A4 -> G4 -> E4
  {
    chords: [N.E4, N.G4, N.B4],
    bass: 82.41,
    saxNotes: [
      { f: N.B4, d: 0.8, o: 0.0 },
      { f: N.A4, d: 0.6, o: 0.8 },
      { f: N.G4, d: 0.8, o: 1.4 },
      { f: N.E4, d: 1.2, o: 2.2 },
    ],
  },
  // Measure 3: G4 -> A4 -> D5 -> B4
  {
    chords: [N.C4, N.E4, N.G4],
    bass: 65.41,
    saxNotes: [
      { f: N.G4, d: 0.6, o: 0.0 },
      { f: N.A4, d: 0.6, o: 0.6 },
      { f: N.D5, d: 1.2, o: 1.2 },
      { f: N.B4, d: 1.4, o: 2.4 },
    ],
  },
  // Measure 4: A4 (long singing resolution)
  {
    chords: [N.D4, N.Fs4, N.A4],
    bass: 73.42,
    saxNotes: [
      { f: N.A4, d: 2.8, o: 0.0 },
    ],
  },
];

// 2. Kenny G - Forever in Love
const FOREVER_IN_LOVE_PHRASES = [
  {
    chords: [N.G4, N.B4, N.D5],
    bass: 98.0,
    saxNotes: [
      { f: N.B4, d: 0.5, o: 0.0 },
      { f: N.D5, d: 0.8, o: 0.5 },
      { f: N.E5, d: 0.8, o: 1.3 },
      { f: N.D5, d: 1.2, o: 2.1 },
    ],
  },
  {
    chords: [N.E4, N.G4, N.B4],
    bass: 82.41,
    saxNotes: [
      { f: N.B4, d: 0.5, o: 0.0 },
      { f: N.A4, d: 0.5, o: 0.5 },
      { f: N.G4, d: 1.0, o: 1.0 },
      { f: N.A4, d: 1.4, o: 2.0 },
    ],
  },
  {
    chords: [N.C4, N.E4, N.G4],
    bass: 65.41,
    saxNotes: [
      { f: N.G4, d: 0.4, o: 0.0 },
      { f: N.A4, d: 0.4, o: 0.4 },
      { f: N.B4, d: 0.8, o: 0.8 },
      { f: N.D5, d: 1.6, o: 1.6 },
    ],
  },
  {
    chords: [N.D4, N.Fs4, N.A4],
    bass: 73.42,
    saxNotes: [
      { f: N.G4, d: 2.8, o: 0.0 },
    ],
  },
];

// 3. Kenny G - Songbird
const SONGBIRD_PHRASES = [
  {
    chords: [N.G4, N.B4, N.D5],
    bass: 98.0,
    saxNotes: [
      { f: N.D5, d: 0.4, o: 0.0 },
      { f: N.E5, d: 0.4, o: 0.4 },
      { f: N.G5, d: 1.2, o: 0.8 },
      { f: N.Fs5, d: 1.0, o: 2.0 },
    ],
  },
  {
    chords: [N.E4, N.G4, N.B4],
    bass: 82.41,
    saxNotes: [
      { f: N.E5, d: 0.8, o: 0.0 },
      { f: N.D5, d: 0.8, o: 0.8 },
      { f: N.B4, d: 1.6, o: 1.6 },
    ],
  },
  {
    chords: [N.C4, N.E4, N.G4],
    bass: 65.41,
    saxNotes: [
      { f: N.C5, d: 0.5, o: 0.0 },
      { f: N.D5, d: 0.5, o: 0.5 },
      { f: N.E5, d: 1.0, o: 1.0 },
      { f: N.D5, d: 1.2, o: 2.0 },
    ],
  },
  {
    chords: [N.D4, N.Fs4, N.A4],
    bass: 73.42,
    saxNotes: [
      { f: N.B4, d: 2.6, o: 0.0 },
    ],
  },
];

// 4. Lo-Fi Chill Midnight
const LOFI_PROGRESSION = [
  [146.83, 174.61, 220.0, 261.63, 329.63], // Dm9
  [98.0, 174.61, 246.94, 329.63, 440.0],   // G13
  [130.81, 164.81, 196.0, 246.94, 293.66], // Cmaj9
  [110.0, 196.0, 261.63, 329.63, 493.88],  // Am9
];
const LOFI_BASS = [73.42, 49.0, 65.41, 55.0];

/**
 * Main Audio Loop scheduler
 */
export function startLofiMusic(trackId?: string): boolean {
  if (trackId && LUXURY_TRACKS.some((t) => t.id === trackId)) {
    currentTrackId = trackId;
  }
  const ctx = getAudioContext();
  if (!ctx) return false;

  stopLofiMusic();

  try {
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(currentVolume, ctx.currentTime);
    masterGain.connect(ctx.destination);

    // Warm vinyl crackle for luxury lounge ambience
    vinylNode = startVinylCrackle(ctx, masterGain);

    let step = 0;
    const phraseDuration = 3.6; // ~67 BPM relaxing tempo

    const scheduleMeasure = () => {
      if (!isPlaying || !ctx || !masterGain) return;
      const now = ctx.currentTime;

      if (currentTrackId === 'kennyg-going-home') {
        const phrase = GOING_HOME_PHRASES[step % GOING_HOME_PHRASES.length];
        // Piano Arpeggio
        phrase.chords.forEach((freq, idx) => {
          playPianoNote(ctx, freq, now + idx * 0.12, phraseDuration * 0.9, masterGain!);
        });
        playPianoNote(ctx, phrase.bass, now, phraseDuration * 0.95, masterGain!);
        // Soprano Saxophone Lead
        phrase.saxNotes.forEach((sn) => {
          playSaxophoneNote(ctx, sn.f, now + sn.o, sn.d, masterGain!);
        });
      } else if (currentTrackId === 'kennyg-forever-love') {
        const phrase = FOREVER_IN_LOVE_PHRASES[step % FOREVER_IN_LOVE_PHRASES.length];
        phrase.chords.forEach((freq, idx) => {
          playPianoNote(ctx, freq, now + idx * 0.15, phraseDuration * 0.9, masterGain!);
        });
        playPianoNote(ctx, phrase.bass, now, phraseDuration * 0.95, masterGain!);
        phrase.saxNotes.forEach((sn) => {
          playSaxophoneNote(ctx, sn.f, now + sn.o, sn.d, masterGain!, 8, 4.8);
        });
      } else if (currentTrackId === 'kennyg-songbird') {
        const phrase = SONGBIRD_PHRASES[step % SONGBIRD_PHRASES.length];
        phrase.chords.forEach((freq, idx) => {
          playPianoNote(ctx, freq, now + idx * 0.1, phraseDuration * 0.85, masterGain!);
        });
        playPianoNote(ctx, phrase.bass, now, phraseDuration * 0.9, masterGain!);
        phrase.saxNotes.forEach((sn) => {
          playSaxophoneNote(ctx, sn.f, now + sn.o, sn.d, masterGain!, 9, 5.2);
        });
      } else {
        // Classic Lo-Fi Midnight
        const cIdx = step % LOFI_PROGRESSION.length;
        const chord = LOFI_PROGRESSION[cIdx];
        chord.forEach((freq, idx) => {
          playPianoNote(ctx, freq, now + idx * 0.04, phraseDuration * 0.95, masterGain!);
        });
        playPianoNote(ctx, LOFI_BASS[cIdx], now, phraseDuration * 0.9, masterGain!);
      }

      step++;
      sequenceTimer = setTimeout(scheduleMeasure, phraseDuration * 1000 - 40);
    };

    isPlaying = true;
    scheduleMeasure();

    try {
      localStorage.setItem('veo_lofi_enabled', '1');
      localStorage.setItem('veo_lofi_track', currentTrackId);
    } catch {}

    notifyTrackChange();
    return true;
  } catch (err) {
    console.error('Failed to start luxury music:', err);
    isPlaying = false;
    return false;
  }
}

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
      masterGain.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
      setTimeout(() => {
        masterGain?.disconnect();
        masterGain = null;
      }, 300);
    } catch {}
  }

  try {
    localStorage.setItem('veo_lofi_enabled', '0');
  } catch {}
}

export function switchTrack(trackId: string): boolean {
  currentTrackId = trackId;
  try {
    localStorage.setItem('veo_lofi_track', trackId);
  } catch {}
  if (isPlaying) {
    return startLofiMusic(trackId);
  } else {
    notifyTrackChange();
    return false;
  }
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

export function getCurrentTrack(): MusicTrack {
  return LUXURY_TRACKS.find((t) => t.id === currentTrackId) || LUXURY_TRACKS[0];
}

export function subscribeTrackChange(cb: (track: MusicTrack) => void): () => void {
  trackListeners.add(cb);
  return () => trackListeners.delete(cb);
}

function notifyTrackChange() {
  const cur = getCurrentTrack();
  trackListeners.forEach((fn) => fn(cur));
}

export function setLofiVolume(vol: number) {
  currentVolume = Math.max(0, Math.min(1, vol));
  if (masterGain && audioCtx) {
    masterGain.gain.setValueAtTime(currentVolume, audioCtx.currentTime);
  }
}
