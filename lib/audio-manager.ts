// Phase 14: Audio System & Polish

export type SoundEffect = 
  | 'click'           // Button click
  | 'phase_start'     // Phase transition
  | 'role_reveal'     // Your role revealed
  | 'target_select'   // Mafia selects target
  | 'task_complete'   // Task finished
  | 'vote_cast'       // Vote submitted
  | 'player_eliminated' // Player voted out
  | 'mafia_wins'      // Mafia victory
  | 'village_wins'    // Village victory
  | 'round_complete'  // Round ends
  | 'notification';   // Generic notification

export interface AudioConfig {
  enabled: boolean;
  volume: number;        // 0-100
  masterVolume: number;  // 0-100
  soundVolumes: Record<SoundEffect, number>; // 0-100 per sound
}

export interface AudioAsset {
  id: SoundEffect;
  url: string;
  duration: number; // milliseconds
  category: 'ui' | 'game' | 'music';
}

class AudioManager {
  private static instance: AudioManager;
  private config: AudioConfig;
  private audioContext: AudioContext | null = null;
  private sounds: Map<SoundEffect, HTMLAudioElement> = new Map();
  private preloadedBuffers: Map<SoundEffect, AudioBuffer> = new Map();

  private constructor() {
    this.config = {
      enabled: true,
      volume: 100,
      masterVolume: 100,
      soundVolumes: {
        click: 70,
        phase_start: 80,
        role_reveal: 90,
        target_select: 80,
        task_complete: 85,
        vote_cast: 75,
        player_eliminated: 90,
        mafia_wins: 100,
        village_wins: 100,
        round_complete: 85,
        notification: 70,
      },
    };
  }

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  // Initialize audio context (requires user interaction)
  async initialize() {
    if (typeof window === 'undefined') return;
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      await this.preloadSounds();
    } catch (e) {
      console.warn('Audio initialization failed:', e);
    }
  }

  // Preload common sounds for responsive playback
  private async preloadSounds() {
    const sounds: AudioAsset[] = [
      { id: 'click', url: '/sounds/click.mp3', duration: 80, category: 'ui' },
      { id: 'phase_start', url: '/sounds/phase-start.mp3', duration: 300, category: 'game' },
      { id: 'role_reveal', url: '/sounds/role-reveal.mp3', duration: 800, category: 'game' },
      { id: 'target_select', url: '/sounds/target-select.mp3', duration: 500, category: 'game' },
      { id: 'task_complete', url: '/sounds/task-complete.mp3', duration: 600, category: 'game' },
      { id: 'vote_cast', url: '/sounds/vote-cast.mp3', duration: 400, category: 'ui' },
      { id: 'player_eliminated', url: '/sounds/eliminated.mp3', duration: 1000, category: 'game' },
      { id: 'mafia_wins', url: '/sounds/mafia-wins.mp3', duration: 2000, category: 'game' },
      { id: 'village_wins', url: '/sounds/village-wins.mp3', duration: 2000, category: 'game' },
      { id: 'round_complete', url: '/sounds/round-complete.mp3', duration: 1200, category: 'game' },
      { id: 'notification', url: '/sounds/notification.mp3', duration: 300, category: 'ui' },
    ];

    for (const sound of sounds) {
      try {
        const audio = new Audio(sound.url);
        audio.preload = 'auto';
        this.sounds.set(sound.id, audio);
      } catch (e) {
        console.warn(`Failed to preload ${sound.id}:`, e);
      }
    }
  }

  // Play a sound effect
  play(soundId: SoundEffect) {
    if (!this.config.enabled || typeof window === 'undefined') return;

    const audio = this.sounds.get(soundId);
    if (!audio) {
      console.warn(`Sound not found: ${soundId}`);
      return;
    }

    // Calculate volume
    const finalVolume =
      (this.config.soundVolumes[soundId] / 100) *
      (this.config.masterVolume / 100) *
      (this.config.volume / 100);

    // Reset and play
    audio.currentTime = 0;
    audio.volume = Math.max(0, Math.min(1, finalVolume));

    try {
      audio.play().catch(e => console.warn(`Failed to play ${soundId}:`, e));
    } catch (e) {
      console.warn(`Error playing ${soundId}:`, e);
    }
  }

  // Stop all sounds
  stopAll() {
    for (const audio of this.sounds.values()) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  // Update configuration
  setConfig(partial: Partial<AudioConfig>) {
    this.config = { ...this.config, ...partial };
    if (typeof window !== 'undefined') {
      localStorage.setItem('mafia:audio-config', JSON.stringify(this.config));
    }
  }

  // Get current configuration
  getConfig(): AudioConfig {
    return { ...this.config };
  }

  // Set master volume (0-100)
  setVolume(volume: number) {
    this.config.masterVolume = Math.max(0, Math.min(100, volume));
  }

  // Toggle audio on/off
  toggle() {
    this.config.enabled = !this.config.enabled;
  }

  // Load saved config from localStorage
  loadConfig() {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem('mafia:audio-config');
      if (saved) {
        this.config = { ...this.config, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load audio config:', e);
    }
  }
}

// Export singleton
export const audio = AudioManager.getInstance();

// Hook for React
export function useAudio() {
  return {
    play: (sound: SoundEffect) => audio.play(sound),
    toggle: () => audio.toggle(),
    setVolume: (v: number) => audio.setVolume(v),
    config: audio.getConfig(),
  };
}
