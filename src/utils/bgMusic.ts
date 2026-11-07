/**
 * Background Music Service (High-Fidelity MP3 Audio Engine)
 * Replaces synthetic Kenny G / Jazz with user's MP3 track:
 * "Forever Tonight" - Peter Cetera & Julie
 */

export interface BgMusicTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  src: string;
  duration?: number;
}

export interface BgMusicState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  loop: boolean;
  track: BgMusicTrack;
}

// Compute base-aware URL for Vite & GitHub Pages
const getTrackSrc = (): string => {
  const base = (import.meta as any).env?.BASE_URL || './';
  const cleanBase = base.endsWith('/') ? base : base + '/';
  return `${cleanBase}assets/aistudio/Forever_tonight__PETER_CATERA___JULIE__6db7d2e3.mp3`;
};

export const DEFAULT_TRACK: BgMusicTrack = {
  id: 'forever-tonight',
  title: 'Forever Tonight',
  artist: 'Peter Cetera & Julie',
  album: 'World Classic Duet Ballad',
  src: getTrackSrc(),
  duration: 277,
};

let audioInstance: HTMLAudioElement | null = null;
let isAudioPlaying = false;
let currentVolume = (() => {
  try {
    const saved = localStorage.getItem('veo_bgm_vol');
    if (saved) {
      const v = parseFloat(saved);
      if (!isNaN(v) && v >= 0 && v <= 1) return v;
    }
  } catch {}
  return 0.45;
})();

let isLoop = true;
const listeners = new Set<(state: BgMusicState) => void>();

function notifyListeners() {
  const state = getBgMusicState();
  listeners.forEach((l) => {
    try {
      l(state);
    } catch (e) {
      console.warn('BgMusic listener error:', e);
    }
  });
}

function getOrCreateAudio(): HTMLAudioElement {
  if (audioInstance) return audioInstance;

  const audio = new Audio();
  audio.preload = 'auto';
  audio.loop = isLoop;
  audio.volume = currentVolume;
  audio.src = DEFAULT_TRACK.src;

  audio.onplay = () => {
    isAudioPlaying = true;
    try {
      localStorage.setItem('veo_bgm_enabled', '1');
    } catch {}
    notifyListeners();
  };

  audio.onpause = () => {
    isAudioPlaying = false;
    notifyListeners();
  };

  audio.ontimeupdate = () => {
    notifyListeners();
  };

  audio.onloadedmetadata = () => {
    notifyListeners();
  };

  audio.onended = () => {
    if (!audio.loop) {
      isAudioPlaying = false;
      notifyListeners();
    }
  };

  audio.onerror = () => {
    // Try fallback root path if relative failed
    const fallbackPath = '/assets/aistudio/Forever_tonight__PETER_CATERA___JULIE__6db7d2e3.mp3';
    if (audio.src && !audio.src.endsWith(fallbackPath)) {
      audio.src = fallbackPath;
      if (isAudioPlaying) {
        audio.play().catch(() => {});
      }
    }
  };

  audioInstance = audio;
  return audio;
}

export function getBgMusicState(): BgMusicState {
  const audio = audioInstance;
  return {
    isPlaying: isAudioPlaying,
    currentTime: audio?.currentTime || 0,
    duration: audio?.duration || DEFAULT_TRACK.duration || 277,
    volume: currentVolume,
    loop: isLoop,
    track: DEFAULT_TRACK,
  };
}

export async function playBgMusic(): Promise<boolean> {
  const audio = getOrCreateAudio();
  try {
    audio.volume = currentVolume;
    audio.loop = isLoop;
    await audio.play();
    isAudioPlaying = true;
    try {
      localStorage.setItem('veo_bgm_enabled', '1');
    } catch {}
    notifyListeners();
    return true;
  } catch (err) {
    console.warn('Autoplay blocked or audio load error:', err);
    return false;
  }
}

export function pauseBgMusic(): void {
  if (audioInstance) {
    try {
      audioInstance.pause();
    } catch {}
    isAudioPlaying = false;
    try {
      localStorage.setItem('veo_bgm_enabled', '0');
    } catch {}
    notifyListeners();
  }
}

export async function toggleBgMusic(): Promise<boolean> {
  if (isAudioPlaying) {
    pauseBgMusic();
    return false;
  } else {
    return await playBgMusic();
  }
}

export function setBgMusicVolume(vol: number): void {
  const clamped = Math.max(0, Math.min(1, vol));
  currentVolume = clamped;
  if (audioInstance) {
    audioInstance.volume = clamped;
  }
  try {
    localStorage.setItem('veo_bgm_vol', clamped.toFixed(2));
  } catch {}
  notifyListeners();
}

export function seekBgMusic(seconds: number): void {
  if (audioInstance && !isNaN(seconds)) {
    try {
      audioInstance.currentTime = Math.max(0, Math.min(audioInstance.duration || 300, seconds));
      notifyListeners();
    } catch {}
  }
}

export function setBgMusicLoop(loop: boolean): void {
  isLoop = loop;
  if (audioInstance) {
    audioInstance.loop = loop;
  }
  notifyListeners();
}

export function isBgMusicPlaying(): boolean {
  return isAudioPlaying;
}

export function subscribeBgMusic(listener: (state: BgMusicState) => void): () => void {
  listeners.add(listener);
  listener(getBgMusicState());
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Automatically triggers background music on first user gesture if previously enabled or user interacts
 */
export function initAutoPlayOnUserGesture(): void {
  const shouldAutoPlay = (() => {
    try {
      return localStorage.getItem('veo_bgm_enabled') !== '0';
    } catch {
      return true;
    }
  })();

  if (!shouldAutoPlay) return;

  const onGesture = () => {
    window.removeEventListener('pointerdown', onGesture);
    window.removeEventListener('keydown', onGesture);
    window.removeEventListener('click', onGesture);

    if (!isAudioPlaying) {
      playBgMusic().catch(() => {});
    }
  };

  window.addEventListener('pointerdown', onGesture, { once: true, passive: true });
  window.addEventListener('keydown', onGesture, { once: true, passive: true });
  window.addEventListener('click', onGesture, { once: true, passive: true });
}
