import { PieceColor } from '../types/board';
import type {
  LudoBoardState,
  LudoPiece,
  LudoPlayerIndex,
  LudoMove,
  LudoPassMove,
  AnyLudoMove,
  LudoGameResult,
} from './types';
import {
  PLAYER_LAUNCH_ABSOLUTE,
  SAFE_ABSOLUTE_SQUARES,
  SHORTCUT_ABSOLUTE,
} from './types';

export function createInitialLudoBoard(): LudoBoardState {
  const pieces: LudoPiece[] = [];
  for (let pi = 0; pi < 4; pi++) {
    for (let si = 0; si < 4; si++) {
      pieces.push({
        id: `lp_${pi}_${si}`,
        playerIndex: pi as LudoPlayerIndex,
        trackIndex: -1,
      });
    }
  }
  return {
    size: 15,
    pieces,
    currentPlayerIndex: 0,
    diceValue: null,
    consecutiveSixes: 0,
  };
}

export function cloneLudoBoard(board: LudoBoardState): LudoBoardState {
  return {
    ...board,
    pieces: board.pieces.map((p) => ({ ...p })),
  };
}

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function relativeToAbsolute(
  playerIndex: LudoPlayerIndex,
  relIdx: number,
): number {
  return (PLAYER_LAUNCH_ABSOLUTE[playerIndex] + relIdx) % 52;
}

export function absoluteToRelative(
  playerIndex: LudoPlayerIndex,
  absIdx: number,
): number {
  return (absIdx - PLAYER_LAUNCH_ABSOLUTE[playerIndex] + 52) % 52;
}

export function nextPlayerIndex(idx: LudoPlayerIndex): LudoPlayerIndex {
  return ((idx + 1) % 4) as LudoPlayerIndex;
}

function buildPieceMap(pieces: LudoPiece[]): Map<string, LudoPiece[]> {
  const m = new Map<string, LudoPiece[]>();
  for (const p of pieces) {
    if (p.trackIndex < 0 || p.trackIndex > 57) continue;
    let key: string;
    if (p.trackIndex >= 52) {
      key = `hs_${p.playerIndex}_${p.trackIndex}`;
    } else {
      const abs = relativeToAbsolute(p.playerIndex, p.trackIndex);
      key = `out_${abs}`;
    }
    if (!m.has(key)) m.set(key, []);
    m.get(key)!.push(p);
  }
  return m;
}

export function getAllValidLudoMoves(
  board: LudoBoardState,
  playerIndex: LudoPlayerIndex,
  diceValue: number,
): AnyLudoMove[] {
  if (board.currentPlayerIndex !== playerIndex) return [];
  if (board.diceValue !== null && board.diceValue !== diceValue) return [];

  const myPieces = board.pieces.filter((p) => p.playerIndex === playerIndex);
  const pieceMap = buildPieceMap(board.pieces);
  const moves: AnyLudoMove[] = [];

  for (const piece of myPieces) {
    if (piece.trackIndex === 58) continue;

    if (piece.trackIndex === -1) {
      if (diceValue === 6) {
        const launchAbs = PLAYER_LAUNCH_ABSOLUTE[playerIndex];
        const launchKey = `out_${launchAbs}`;
        const occupants = pieceMap.get(launchKey) ?? [];
        const hasOwn = occupants.some((p) => p.playerIndex === playerIndex);
        if (!hasOwn) {
          const captured = occupants.find(
            (p) =>
              p.playerIndex !== playerIndex &&
              !SAFE_ABSOLUTE_SQUARES.has(launchAbs),
          );
          moves.push({
            pieceId: piece.id,
            fromTrackIndex: -1,
            toTrackIndex: 0,
            diceValue: 6,
            capturedPieceId: captured?.id ?? null,
            enteredHomeStretch: false,
            reachedGoal: false,
          });
        }
      }
      continue;
    }

    let newTrackIndex = piece.trackIndex + diceValue;

    if (piece.trackIndex < 52) {
      const currentRel = piece.trackIndex;

      if (newTrackIndex <= 51) {
        const newAbs = relativeToAbsolute(playerIndex, newTrackIndex);
        const key = `out_${newAbs}`;
        const occupants = pieceMap.get(key) ?? [];
        const hasOwn = occupants.some((p) => p.playerIndex === playerIndex);

        if (!hasOwn) {
          const captured = occupants.find(
            (p) =>
              p.playerIndex !== playerIndex &&
              !SAFE_ABSOLUTE_SQUARES.has(newAbs),
          );
          const move: LudoMove = {
            pieceId: piece.id,
            fromTrackIndex: piece.trackIndex,
            toTrackIndex: newTrackIndex,
            diceValue,
            capturedPieceId: captured?.id ?? null,
            enteredHomeStretch: false,
            reachedGoal: false,
          };
          moves.push(move);

          if (SHORTCUT_ABSOLUTE[newAbs] !== undefined) {
            const shortcutAbs = SHORTCUT_ABSOLUTE[newAbs];
            const shortcutRel = absoluteToRelative(playerIndex, shortcutAbs);
            if (shortcutRel > newTrackIndex && shortcutRel <= 51) {
              const scKey = `out_${shortcutAbs}`;
              const scOccupants = pieceMap.get(scKey) ?? [];
              const scHasOwn = scOccupants.some(
                (p) => p.playerIndex === playerIndex,
              );
              if (!scHasOwn) {
                const scCaptured = scOccupants.find(
                  (p) =>
                    p.playerIndex !== playerIndex &&
                    !SAFE_ABSOLUTE_SQUARES.has(shortcutAbs),
                );
                moves.push({
                  pieceId: piece.id,
                  fromTrackIndex: piece.trackIndex,
                  toTrackIndex: shortcutRel,
                  diceValue,
                  capturedPieceId: scCaptured?.id ?? null,
                  enteredHomeStretch: false,
                  reachedGoal: false,
                });
              }
            }
          }
        }
      } else if (newTrackIndex === 58) {
        moves.push({
          pieceId: piece.id,
          fromTrackIndex: piece.trackIndex,
          toTrackIndex: 58,
          diceValue,
          capturedPieceId: null,
          enteredHomeStretch: true,
          reachedGoal: true,
        });
      } else if (newTrackIndex >= 52 && newTrackIndex <= 57) {
        const hsKey = `hs_${playerIndex}_${newTrackIndex}`;
        const hsOccupants = pieceMap.get(hsKey) ?? [];
        const hsHasOwn = hsOccupants.some(
          (p) => p.playerIndex === playerIndex,
        );
        if (!hsHasOwn) {
          moves.push({
            pieceId: piece.id,
            fromTrackIndex: piece.trackIndex,
            toTrackIndex: newTrackIndex,
            diceValue,
            capturedPieceId: null,
            enteredHomeStretch: true,
            reachedGoal: false,
          });
        }
      }
    } else {
      if (newTrackIndex <= 58) {
        const hsKey = `hs_${playerIndex}_${newTrackIndex}`;
        const hsOccupants = pieceMap.get(hsKey) ?? [];
        const hsHasOwn = hsOccupants.some(
          (p) => p.playerIndex === playerIndex,
        );
        if (!hsHasOwn) {
          moves.push({
            pieceId: piece.id,
            fromTrackIndex: piece.trackIndex,
            toTrackIndex: newTrackIndex,
            diceValue,
            capturedPieceId: null,
            enteredHomeStretch: false,
            reachedGoal: newTrackIndex === 58,
          });
        }
      }
    }
  }

  if (moves.length === 0) {
    return [
      {
        pieceId: '',
        fromTrackIndex: -1,
        toTrackIndex: -1,
        diceValue,
        capturedPieceId: null,
        enteredHomeStretch: false,
        reachedGoal: false,
      } as LudoPassMove,
    ];
  }

  return moves;
}

export function isValidLudoMove(
  board: LudoBoardState,
  move: AnyLudoMove,
  playerIndex: LudoPlayerIndex,
): boolean {
  if (board.currentPlayerIndex !== playerIndex) return false;
  const validMoves = getAllValidLudoMoves(
    board,
    playerIndex,
    move.diceValue,
  );
  return validMoves.some(
    (m) =>
      m.pieceId === move.pieceId &&
      m.toTrackIndex === move.toTrackIndex &&
      m.capturedPieceId === move.capturedPieceId,
  );
}

export function applyLudoMove(
  board: LudoBoardState,
  move: AnyLudoMove,
): LudoBoardState {
  const newBoard = cloneLudoBoard(board);

  if (move.pieceId === '') {
    newBoard.diceValue = null;
    newBoard.consecutiveSixes = 0;
    newBoard.currentPlayerIndex = nextPlayerIndex(newBoard.currentPlayerIndex);
    return newBoard;
  }

  const pieceIdx = newBoard.pieces.findIndex((p) => p.id === move.pieceId);
  if (pieceIdx === -1) return newBoard;

  newBoard.pieces[pieceIdx] = {
    ...newBoard.pieces[pieceIdx],
    trackIndex: move.toTrackIndex,
  };

  if (move.capturedPieceId) {
    const capturedIdx = newBoard.pieces.findIndex(
      (p) => p.id === move.capturedPieceId,
    );
    if (capturedIdx !== -1) {
      newBoard.pieces[capturedIdx] = {
        ...newBoard.pieces[capturedIdx],
        trackIndex: -1,
      };
    }
  }

  if (move.diceValue === 6 && newBoard.consecutiveSixes < 3) {
    newBoard.consecutiveSixes += 1;
    if (newBoard.consecutiveSixes >= 3) {
      newBoard.diceValue = null;
      newBoard.consecutiveSixes = 0;
      newBoard.currentPlayerIndex = nextPlayerIndex(newBoard.currentPlayerIndex);
    } else {
      newBoard.diceValue = null;
    }
  } else {
    newBoard.diceValue = null;
    newBoard.consecutiveSixes = 0;
    newBoard.currentPlayerIndex = nextPlayerIndex(newBoard.currentPlayerIndex);
  }

  return newBoard;
}

export function getLudoGameResult(
  board: LudoBoardState,
): LudoGameResult | null {
  for (let pi = 0; pi < 4; pi++) {
    const playerPieces = board.pieces.filter(
      (p) => p.playerIndex === (pi as LudoPlayerIndex),
    );
    if (playerPieces.length === 4 && playerPieces.every((p) => p.trackIndex === 58)) {
      return { winner: pi as LudoPlayerIndex };
    }
  }
  return null;
}
