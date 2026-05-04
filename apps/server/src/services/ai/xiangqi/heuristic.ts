import {
  type XiangqiBoardState,
  XiangqiPieceType,
  PieceColor,
} from '@board-games/shared/xiangqi';

const PIECE_VALUES: Record<XiangqiPieceType, number> = {
  [XiangqiPieceType.KING]: 100000,
  [XiangqiPieceType.ROOK]: 900,
  [XiangqiPieceType.CANNON]: 450,
  [XiangqiPieceType.HORSE]: 400,
  [XiangqiPieceType.ELEPHANT]: 200,
  [XiangqiPieceType.ADVISOR]: 200,
  [XiangqiPieceType.PAWN]: 100,
};

const KING_PST = [
  [0, 0, 0, 3, 5, 3, 0, 0, 0],
  [0, 0, 0, 5, 6, 5, 0, 0, 0],
  [0, 0, 0, 5, 8, 5, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 5, 8, 5, 0, 0, 0],
  [0, 0, 0, 5, 6, 5, 0, 0, 0],
  [0, 0, 0, 3, 5, 3, 0, 0, 0],
];

const ADVISOR_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 4, 0, 4, 0, 0, 0],
  [0, 0, 0, 0, 6, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 6, 0, 0, 0, 0],
  [0, 0, 0, 4, 0, 4, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

const ELEPHANT_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 6, 0, 0, 0, 6, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 6, 0, 0, 0, 6, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

const HORSE_PST = [
  [0, -2, 2, 2, 2, 2, 2, -2, 0],
  [0, 2, 4, 6, 6, 6, 4, 2, 0],
  [2, 4, 8, 10, 10, 10, 8, 4, 2],
  [2, 6, 10, 12, 12, 12, 10, 6, 2],
  [2, 6, 10, 12, 12, 12, 10, 6, 2],
  [2, 6, 10, 12, 12, 12, 10, 6, 2],
  [2, 4, 8, 10, 10, 10, 8, 4, 2],
  [0, 2, 4, 6, 6, 6, 4, 2, 0],
  [0, -2, 2, 2, 2, 2, 2, -2, 0],
  [-2, 0, 0, 2, 2, 2, 0, 0, -2],
];

const ROOK_PST = [
  [2, 4, 4, 8, 8, 8, 4, 4, 2],
  [2, 6, 6, 10, 12, 10, 6, 6, 2],
  [2, 6, 8, 12, 14, 12, 8, 6, 2],
  [2, 6, 8, 12, 14, 12, 8, 6, 2],
  [2, 6, 8, 12, 14, 12, 8, 6, 2],
  [2, 6, 8, 12, 14, 12, 8, 6, 2],
  [2, 6, 8, 12, 14, 12, 8, 6, 2],
  [2, 6, 6, 10, 12, 10, 6, 6, 2],
  [2, 4, 4, 8, 8, 8, 4, 4, 2],
  [0, 2, 2, 4, 4, 4, 2, 2, 0],
];

const CANNON_PST = [
  [0, 0, 2, 6, 6, 6, 2, 0, 0],
  [0, 2, 4, 8, 8, 8, 4, 2, 0],
  [2, 4, 6, 10, 12, 10, 6, 4, 2],
  [0, 0, 2, 6, 8, 6, 2, 0, 0],
  [0, 0, 0, 2, 4, 2, 0, 0, 0],
  [0, 0, 0, 2, 4, 2, 0, 0, 0],
  [0, 0, 2, 6, 8, 6, 2, 0, 0],
  [2, 4, 6, 10, 12, 10, 6, 4, 2],
  [0, 2, 4, 8, 8, 8, 4, 2, 0],
  [0, 0, 2, 6, 6, 6, 2, 0, 0],
];

const PAWN_PST = [
  [0, 0, 0, 2, 4, 2, 0, 0, 0],
  [0, 0, 0, 4, 8, 4, 0, 0, 0],
  [0, 0, 0, 8, 12, 8, 0, 0, 0],
  [0, 0, 4, 10, 14, 10, 4, 0, 0],
  [0, 0, 8, 14, 20, 14, 8, 0, 0],
  [0, 0, 8, 14, 20, 14, 8, 0, 0],
  [0, 0, 4, 10, 14, 10, 4, 0, 0],
  [0, 0, 0, 8, 12, 8, 0, 0, 0],
  [0, 0, 0, 4, 8, 4, 0, 0, 0],
  [0, 0, 0, 2, 4, 2, 0, 0, 0],
];

const PST: Record<XiangqiPieceType, number[][]> = {
  [XiangqiPieceType.KING]: KING_PST,
  [XiangqiPieceType.ADVISOR]: ADVISOR_PST,
  [XiangqiPieceType.ELEPHANT]: ELEPHANT_PST,
  [XiangqiPieceType.HORSE]: HORSE_PST,
  [XiangqiPieceType.ROOK]: ROOK_PST,
  [XiangqiPieceType.CANNON]: CANNON_PST,
  [XiangqiPieceType.PAWN]: PAWN_PST,
};

function hasCrossedRiver(pos: { row: number; col: number }, color: PieceColor): boolean {
  if (color === PieceColor.DARK) return pos.row <= 4;
  return pos.row >= 5;
}

export function evaluateXiangqiBoard(
  board: XiangqiBoardState,
  aiColor: PieceColor,
): number {
  let score = 0;

  for (const piece of board.pieces) {
    const val = PIECE_VALUES[piece.type];
    const table = PST[piece.type];
    const row = piece.color === PieceColor.DARK ? 9 - piece.position.row : piece.position.row;
    let posBonus = table[row][piece.position.col];

    if (piece.type === XiangqiPieceType.PAWN && hasCrossedRiver(piece.position, piece.color)) {
      posBonus += 50;
    }

    const total = val + posBonus;

    if (piece.color === aiColor) {
      score += total;
    } else {
      score -= total;
    }
  }

  return score;
}
