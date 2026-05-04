export type SoundName =
  | 'move'
  | 'place'
  | 'capture'
  | 'check'
  | 'castle'
  | 'promote'
  | 'win'
  | 'lose'
  | 'draw'
  | 'click';

const DEFAULT_VOLUME: Record<SoundName, number> = {
  move: 1.0,
  place: 1.0,
  capture: 1.0,
  check: 1.0,
  castle: 1.0,
  promote: 1.0,
  win: 1.0,
  lose: 1.0,
  draw: 1.0,
  click: 0.7,
};

const SOUND_EXT: Record<SoundName, string> = {
  move: 'ogg',
  place: 'ogg',
  capture: 'ogg',
  check: 'ogg',
  castle: 'ogg',
  promote: 'ogg',
  win: 'mp3',
  lose: 'ogg',
  draw: 'ogg',
  click: 'ogg',
};

export function playSound(name: SoundName, volume?: number): void {
  try {
    const audio = new Audio(`/sounds/${name}.${SOUND_EXT[name]}`);
    audio.volume = volume ?? DEFAULT_VOLUME[name];
    audio.play().catch(() => {});
  } catch {}
}
