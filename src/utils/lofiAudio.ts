/**
 * Luxury Cockpit Audio Synthesizer: Kenny G Smooth Saxophone & Lo-Fi Chill
 * High-fidelity, procedural Web Audio engine featuring 4 DISTINCT master compositions:
 * 1. 🎷 Kenny G - "Going Home" (Du dương, hoài niệm, sâu lắng - 63 BPM)
 * 2. 🎷 Kenny G - "Forever in Love" (Lãng mạn, tha thiết, bay bổng - 80 BPM)
 * 3. 🎷 Kenny G - "Songbird" (Rộn ràng, tươi vui, chim hót bình minh - 92 BPM)
 * 4. ☕ Lo-Fi Chill Hop - "Midnight Cockpit" (Hợp âm Rhodes điện tử & đĩa than cổ điển - 67 BPM)
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
    genre: 'Smooth Jazz Du Dương',
    icon: '🎷',
    desc: 'Giai điệu kinh điển ngọt ngào, thư thái (63 BPM), mang lại cảm giác bình yên ấm áp khi lái xe về nhà.',
  },
  {
    id: 'kennyg-forever-love',
    title: 'Forever in Love',
    artist: 'Kenny G (Saxophone Romantique)',
    genre: 'Romantic Saxophone',
    icon: '🎷',
    desc: 'Bản tình ca saxophone lãng mạn du dương (80 BPM), hòa âm Cmaj7 & Fmaj7 chuẩn khoang xe sang.',
  },
  {
    id: 'kennyg-songbird',
    title: 'Songbird',
    artist: 'Kenny G (Golden Melody)',
    genre: 'Signature Smooth Jazz',
    icon: '🎷',
    desc: 'Bản hòa tấu saxophone rộn ràng, tươi vui (92 BPM) tựa tiếng chim hót sớm mai đánh thức tinh thần sảng khoái.',
  },
  {
    id: 'lofi-midnight',
    title: 'Midnight Cockpit Chill',
    artist: 'Veo Soundscapes',
    genre: 'Lo-Fi Chillhop',
    icon: '☕',
    desc: 'Hợp âm Rhodes điện tử êm dịu, tiếng nổ lép bép của đĩa than cổ điển chống mỏi mắt đêm khuya.',
  },
];

let audioCtx: AudioContext | null = null;
let isPlaying = false;
let masterGain: GainNode | null = null;
let sequenceTimer: any = null;
let vinylNode: AudioNode | null = null;
let currentVolume = 0.35;

// Load preferred track or default to Going Home
let currentTrackId = (() => {
  try {
    const saved = localStorage.getItem('veo_lofi_track');
    if (saved && LUXURY_TRACKS.some((t) => t.id === saved)) return saved;
  } catch {}
  return 'kennyg-going-home';
})();

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
  vibratoDepth: number = 7.5,
  vibratoSpeed: number = 5.0
) {
  try {
    const osc1 = ctx.createOscillator(); // Fundamental body tone
    const osc2 = ctx.createOscillator(); // Bright upper harmonic
    const noteGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Vibrato LFO (giving Kenny G's signature singing vibrato)
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(vibratoSpeed, startTime);
    lfoGain.gain.setValueAtTime(0, startTime);
    // Vibrato blossoms naturally after breath attack
    lfoGain.gain.linearRampToValueAtTime(vibratoDepth, startTime + Math.min(0.25, duration * 0.4));

    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);

    // Warm reed oscillator mix
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, startTime);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq * 2.002, startTime); // 2nd harmonic for crisp brass sheen

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.24, startTime);
    osc2.connect(osc2Gain);

    // Formant filter (soprano saxophone bell resonance ~1450Hz - 2100Hz)
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, startTime);
    filter.Q.setValueAtTime(2.4, startTime);

    // Saxophone Envelope: Smooth breathy attack, singing sustain, gentle acoustic release
    const attackTime = 0.07;
    const releaseTime = 0.14;
    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.linearRampToValueAtTime(0.18, startTime + attackTime);
    noteGain.gain.setValueAtTime(0.15, startTime + duration - releaseTime);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(filter);
    osc2Gain.connect(filter);
    filter.connect(noteGain);
    noteGain.connect(dest);

    lfo.start(startTime);
    osc1.start(startTime);
    osc2.start(startTime);

    const stopTime = startTime + duration + 0.15;
    lfo.stop(stopTime);
    osc1.stop(stopTime);
    osc2.stop(stopTime);
  } catch {}
}

/**
 * Synthesizes a warm acoustic grand piano accompaniment note
 */
function playPianoNote(ctx: AudioContext, freq: number, startTime: number, duration: number, dest: GainNode) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, startTime);
    filter.frequency.exponentialRampToValueAtTime(260, startTime + duration);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.08, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  } catch {}
}

/**
 * Vinyl crackle for vintage luxury cabin warmth
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
      if (Math.random() < 0.0007) {
        output[i] += (Math.random() - 0.5) * 0.35;
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
    vinylGain.gain.setValueAtTime(0.016, ctx.currentTime);

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
// MUSICAL FREQUENCIES IN HZ
// -------------------------------------------------------------
const N = {
  F3: 174.61, G3: 196.0, A3: 220.0, Bb3: 233.08, B3: 246.94,
  C4: 261.63, Cs4: 277.18, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, Fs4: 369.99, G4: 392.0, Ab4: 415.3, A4: 440.0, Bb4: 466.16, B4: 493.88,
  C5: 523.25, Cs5: 554.37, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46, Fs5: 739.99, G5: 783.99, A5: 880.0, B5: 987.77,
};

// =============================================================
// TRACK 1: KENNY G - "GOING HOME"
// Key: G Major / E minor. Tempo: 63 BPM (Phrase Duration: 3.8s)
// Character: Sâu lắng, hoài niệm, tha thiết, du dương
// =============================================================
const GOING_HOME_PHRASES = [
  // Measure 1: D4 -> G4 -> A4 -> B4 (Going Home intro)
  {
    chords: [N.G3, N.B3, N.D4],
    bass: 98.0,
    saxNotes: [
      { f: N.D4, d: 0.6, o: 0.0 },
      { f: N.G4, d: 0.9, o: 0.6 },
      { f: N.A4, d: 0.6, o: 1.5 },
      { f: N.B4, d: 1.6, o: 2.1 },
    ],
  },
  // Measure 2: B4 -> A4 -> G4 -> E4 (Sâu lắng)
  {
    chords: [N.E4, N.G4, N.B4],
    bass: 82.41,
    saxNotes: [
      { f: N.B4, d: 0.8, o: 0.0 },
      { f: N.A4, d: 0.6, o: 0.8 },
      { f: N.G4, d: 0.8, o: 1.4 },
      { f: N.E4, d: 1.4, o: 2.2 },
    ],
  },
  // Measure 3: G4 -> A4 -> B4 -> D5 -> B4 (Bay bổng ấm áp)
  {
    chords: [N.C4, N.E4, N.G4],
    bass: 65.41,
    saxNotes: [
      { f: N.G4, d: 0.6, o: 0.0 },
      { f: N.A4, d: 0.6, o: 0.6 },
      { f: N.B4, d: 0.6, o: 1.2 },
      { f: N.D5, d: 1.1, o: 1.8 },
      { f: N.B4, d: 0.8, o: 2.9 },
    ],
  },
  // Measure 4: A4 (Ngân dài tha thiết)
  {
    chords: [N.D4, N.Fs4, N.A4],
    bass: 73.42,
    saxNotes: [
      { f: N.A4, d: 3.1, o: 0.0 },
    ],
  },
  // Measure 5: D5 -> B4 -> G4 -> A4 -> G4 (Về bến đỗ)
  {
    chords: [N.C4, N.E4, N.G4],
    bass: 65.41,
    saxNotes: [
      { f: N.D5, d: 0.9, o: 0.0 },
      { f: N.B4, d: 0.8, o: 0.9 },
      { f: N.G4, d: 0.7, o: 1.7 },
      { f: N.A4, d: 0.6, o: 2.4 },
      { f: N.G4, d: 0.7, o: 3.0 },
    ],
  },
  // Measure 6: E4 -> G4 -> G4 (Kết trọn vẹn bình yên)
  {
    chords: [N.G3, N.B3, N.D4],
    bass: 98.0,
    saxNotes: [
      { f: N.E4, d: 0.8, o: 0.0 },
      { f: N.G4, d: 2.8, o: 0.8 },
    ],
  },
];

// =============================================================
// TRACK 2: KENNY G - "FOREVER IN LOVE"
// Key: C Major / F Major. Tempo: 80 BPM (Phrase Duration: 3.0s)
// Character: Lãng mạn, tha thiết, giai điệu ngọt ngào thăng hoa
// =============================================================
const FOREVER_IN_LOVE_PHRASES = [
  // Measure 1: E4 -> G4 -> C5 -> B4 -> A4 -> G4 (Cmaj7)
  {
    chords: [N.C4, N.E4, N.G4, N.B4],
    bass: 65.41,
    saxNotes: [
      { f: N.E4, d: 0.4, o: 0.0 },
      { f: N.G4, d: 0.5, o: 0.4 },
      { f: N.C5, d: 0.9, o: 0.9 },
      { f: N.B4, d: 0.4, o: 1.8 },
      { f: N.A4, d: 0.4, o: 2.2 },
      { f: N.G4, d: 0.4, o: 2.6 },
    ],
  },
  // Measure 2: F4 -> A4 -> C5 -> D5 -> C5 (Fmaj7)
  {
    chords: [N.F3, N.A3, N.C4, N.E4],
    bass: 87.31,
    saxNotes: [
      { f: N.F4, d: 0.4, o: 0.0 },
      { f: N.A4, d: 0.5, o: 0.4 },
      { f: N.C5, d: 0.7, o: 0.9 },
      { f: N.D5, d: 0.8, o: 1.6 },
      { f: N.C5, d: 0.6, o: 2.4 },
    ],
  },
  // Measure 3: D4 -> F4 -> A4 -> C5 -> B4 (Dm7 -> G7)
  {
    chords: [N.D4, N.F4, N.A4, N.C5],
    bass: 73.42,
    saxNotes: [
      { f: N.D4, d: 0.4, o: 0.0 },
      { f: N.F4, d: 0.4, o: 0.4 },
      { f: N.A4, d: 0.6, o: 0.8 },
      { f: N.C5, d: 0.7, o: 1.4 },
      { f: N.B4, d: 0.8, o: 2.1 },
    ],
  },
  // Measure 4: G4 -> B4 -> D5 -> E5 -> D5 (Em7 -> Am7 cao trào)
  {
    chords: [N.E4, N.G4, N.B4, N.D5],
    bass: 82.41,
    saxNotes: [
      { f: N.G4, d: 0.4, o: 0.0 },
      { f: N.B4, d: 0.5, o: 0.4 },
      { f: N.D5, d: 0.8, o: 0.9 },
      { f: N.E5, d: 0.9, o: 1.7 },
      { f: N.D5, d: 0.4, o: 2.6 },
    ],
  },
  // Measure 5: C5 -> D5 -> E5 -> G5 -> E5 (Bay bổng lãng mạn)
  {
    chords: [N.F3, N.A3, N.C4, N.E4],
    bass: 87.31,
    saxNotes: [
      { f: N.C5, d: 0.4, o: 0.0 },
      { f: N.D5, d: 0.4, o: 0.4 },
      { f: N.E5, d: 0.7, o: 0.8 },
      { f: N.G5, d: 1.0, o: 1.5 },
      { f: N.E5, d: 0.5, o: 2.5 },
    ],
  },
  // Measure 6: C5 (Ngân dài ngọt ngào với vibrato sâu)
  {
    chords: [N.C4, N.E4, N.G4, N.B4],
    bass: 65.41,
    saxNotes: [
      { f: N.C5, d: 2.7, o: 0.0 },
    ],
  },
];

// =============================================================
// TRACK 3: KENNY G - "SONGBIRD"
// Key: D Major / G Major. Tempo: 92 BPM (Phrase Duration: 2.6s)
// Character: Nhanh, rộn ràng tươi vui, tiếng chim hót sớm mai khoáng đạt
// =============================================================
const SONGBIRD_PHRASES = [
  // Measure 1: Fs4 -> A4 -> D5 -> Fs5 -> E5 (Tiếng chim vút cao)
  {
    chords: [N.D4, N.Fs4, N.A4],
    bass: 73.42,
    saxNotes: [
      { f: N.Fs4, d: 0.3, o: 0.0 },
      { f: N.A4, d: 0.3, o: 0.3 },
      { f: N.D5, d: 0.6, o: 0.6 },
      { f: N.Fs5, d: 0.9, o: 1.2 },
      { f: N.E5, d: 0.5, o: 2.1 },
    ],
  },
  // Measure 2: D5 -> B4 -> A4 -> Fs4 -> A4 -> B4 (Rộn ràng ngón chạy)
  {
    chords: [N.G3, N.B3, N.D4],
    bass: 98.0,
    saxNotes: [
      { f: N.D5, d: 0.4, o: 0.0 },
      { f: N.B4, d: 0.4, o: 0.4 },
      { f: N.A4, d: 0.4, o: 0.8 },
      { f: N.Fs4, d: 0.3, o: 1.2 },
      { f: N.A4, d: 0.4, o: 1.5 },
      { f: N.B4, d: 0.7, o: 1.9 },
    ],
  },
  // Measure 3: D5 -> E5 -> Fs5 -> A5 -> Fs5 -> E5 -> D5 (Lên đỉnh cao ngút ngàn)
  {
    chords: [N.A3, N.Cs4, N.E4],
    bass: 110.0,
    saxNotes: [
      { f: N.D5, d: 0.3, o: 0.0 },
      { f: N.E5, d: 0.3, o: 0.3 },
      { f: N.Fs5, d: 0.5, o: 0.6 },
      { f: N.A5, d: 0.7, o: 1.1 },
      { f: N.Fs5, d: 0.3, o: 1.8 },
      { f: N.E5, d: 0.25, o: 2.1 },
      { f: N.D5, d: 0.25, o: 2.35 },
    ],
  },
  // Measure 4: B4 -> D5 -> E5 -> D5 -> B4 (Vui tươi lượn sóng)
  {
    chords: [N.B3, N.D4, N.Fs4],
    bass: 123.47,
    saxNotes: [
      { f: N.B4, d: 0.4, o: 0.0 },
      { f: N.D5, d: 0.4, o: 0.4 },
      { f: N.E5, d: 0.6, o: 0.8 },
      { f: N.D5, d: 0.6, o: 1.4 },
      { f: N.B4, d: 0.5, o: 2.0 },
    ],
  },
  // Measure 5: A4 -> B4 -> D5 -> Fs5 -> D5 (Sáng rực rỡ)
  {
    chords: [N.G3, N.B3, N.D4],
    bass: 98.0,
    saxNotes: [
      { f: N.A4, d: 0.3, o: 0.0 },
      { f: N.B4, d: 0.4, o: 0.3 },
      { f: N.D5, d: 0.6, o: 0.7 },
      { f: N.Fs5, d: 0.8, o: 1.3 },
      { f: N.D5, d: 0.5, o: 2.1 },
    ],
  },
  // Measure 6: D5 (Ngân dài hoan ca)
  {
    chords: [N.D4, N.Fs4, N.A4],
    bass: 73.42,
    saxNotes: [
      { f: N.D5, d: 2.3, o: 0.0 },
    ],
  },
];

// =============================================================
// TRACK 4: "MIDNIGHT COCKPIT CHILL" (LO-FI CHILLHOP)
// Tempo: 67 BPM (Phrase Duration: 3.6s)
// Character: Hợp âm Rhodes 9th & 11th êm dịu, không kèn, chống mệt mỏi
// =============================================================
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

    // Warm vinyl crackle for luxury cabin ambience
    vinylNode = startVinylCrackle(ctx, masterGain);

    let step = 0;

    // Track specific tempo and phrase duration
    let phraseDuration = 3.8; // default 63 BPM for Going Home
    if (currentTrackId === 'kennyg-forever-love') {
      phraseDuration = 3.0; // 80 BPM
    } else if (currentTrackId === 'kennyg-songbird') {
      phraseDuration = 2.6; // 92 BPM
    } else if (currentTrackId === 'lofi-midnight') {
      phraseDuration = 3.6; // 67 BPM
    }

    const currentGainNode = masterGain;

    const scheduleMeasure = () => {
      if (!isPlaying || !ctx || !currentGainNode || currentGainNode !== masterGain) return;
      const now = ctx.currentTime;

      if (currentTrackId === 'kennyg-going-home') {
        const phrase = GOING_HOME_PHRASES[step % GOING_HOME_PHRASES.length];
        // Piano Arpeggio
        phrase.chords.forEach((freq, idx) => {
          playPianoNote(ctx, freq, now + idx * 0.14, phraseDuration * 0.9, currentGainNode);
        });
        playPianoNote(ctx, phrase.bass, now, phraseDuration * 0.95, currentGainNode);
        // Soprano Saxophone Lead (Du dương, hoài niệm)
        phrase.saxNotes.forEach((sn) => {
          playSaxophoneNote(ctx, sn.f, now + sn.o, sn.d, currentGainNode, 7.5, 4.8);
        });
      } else if (currentTrackId === 'kennyg-forever-love') {
        const phrase = FOREVER_IN_LOVE_PHRASES[step % FOREVER_IN_LOVE_PHRASES.length];
        // Romantic Piano Chords
        phrase.chords.forEach((freq, idx) => {
          playPianoNote(ctx, freq, now + idx * 0.08, phraseDuration * 0.9, currentGainNode);
        });
        playPianoNote(ctx, phrase.bass, now, phraseDuration * 0.95, currentGainNode);
        // Soprano Saxophone Lead (Lãng mạn tha thiết)
        phrase.saxNotes.forEach((sn) => {
          playSaxophoneNote(ctx, sn.f, now + sn.o, sn.d, currentGainNode, 8.5, 5.2);
        });
      } else if (currentTrackId === 'kennyg-songbird') {
        const phrase = SONGBIRD_PHRASES[step % SONGBIRD_PHRASES.length];
        // Cheerful Staccato Piano
        phrase.chords.forEach((freq, idx) => {
          playPianoNote(ctx, freq, now + idx * 0.06, phraseDuration * 0.7, currentGainNode);
        });
        playPianoNote(ctx, phrase.bass, now, phraseDuration * 0.85, currentGainNode);
        // Soprano Saxophone Lead (Rộn ràng tươi vui chim hót)
        phrase.saxNotes.forEach((sn) => {
          playSaxophoneNote(ctx, sn.f, now + sn.o, sn.d, currentGainNode, 9.2, 5.8);
        });
      } else {
        // Classic Lo-Fi Midnight (No saxophone, pure cozy Rhodes piano)
        const cIdx = step % LOFI_PROGRESSION.length;
        const chord = LOFI_PROGRESSION[cIdx];
        chord.forEach((freq, idx) => {
          playPianoNote(ctx, freq, now + idx * 0.04, phraseDuration * 0.95, currentGainNode);
        });
        playPianoNote(ctx, LOFI_BASS[cIdx], now, phraseDuration * 0.9, currentGainNode);
      }

      step++;
      sequenceTimer = setTimeout(scheduleMeasure, phraseDuration * 1000 - 30);
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
    const oldGain = masterGain;
    masterGain = null;
    try {
      oldGain.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + 0.15);
      setTimeout(() => {
        try {
          oldGain.disconnect();
        } catch {}
      }, 200);
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
  notifyTrackChange();
  // Always immediately start playing the chosen track
  return startLofiMusic(trackId);
}

export function toggleLofiMusic(): boolean {
  if (isPlaying) {
    stopLofiMusic();
    return false;
  } else {
    return startLofiMusic(currentTrackId);
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
