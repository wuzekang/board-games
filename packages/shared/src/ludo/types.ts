import { PieceColor } from '../types/board';
export { PieceColor };

export type LudoPlayerIndex = 0 | 1 | 2 | 3;

export interface LudoPiece {
  id: string;
  playerIndex: LudoPlayerIndex;
  trackIndex: number;
}

export interface LudoBoardState {
  size: 15;
  pieces: LudoPiece[];
  currentPlayerIndex: LudoPlayerIndex;
  diceValue: number | null;
  consecutiveSixes: number;
}

export interface LudoMove {
  pieceId: string;
  fromTrackIndex: number;
  toTrackIndex: number;
  diceValue: number;
  capturedPieceId: string | null;
  enteredHomeStretch: boolean;
  reachedGoal: boolean;
}

export interface LudoPassMove {
  pieceId: '';
  fromTrackIndex: -1;
  toTrackIndex: -1;
  diceValue: number;
  capturedPieceId: null;
  enteredHomeStretch: false;
  reachedGoal: false;
}

export type AnyLudoMove = LudoMove | LudoPassMove;

export interface LudoGameResult {
  winner: LudoPlayerIndex | null;
}

export const PLAYER_COLORS: Record<LudoPlayerIndex, string> = {
  0: 'red',
  1: 'yellow',
  2: 'blue',
  3: 'green',
};

export const PLAYER_LAUNCH_ABSOLUTE: Record<LudoPlayerIndex, number> = {
  0: 0,
  1: 13,
  2: 26,
  3: 39,
};

export const SAFE_ABSOLUTE_SQUARES = new Set([
  0, 8, 13, 21, 26, 34, 39, 47,
]);

export const SHORTCUT_ABSOLUTE: Record<number, number> = {
  8: 24,
  21: 37,
  34: 50,
  47: 11,
};
