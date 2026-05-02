import {
  type ChineseChessBoardState,
  ChineseChessPieceType,
  PieceColor,
} from '@board-games/shared/chinese_chess';

const PIECE_VALUES: Record<ChineseChessPieceType, number> = {
  [ChineseChessPieceType.KING]: 100000,
  [ChineseChessPieceType.ROOK]: 900,
  [ChineseChessPieceType.CANNON]: 450,
  [ChineseChessPieceType.HORSE]: 400,
  [ChineseChessPieceType.ELEPHANT]: 200,
  [ChineseChessPieceType.ADVISOR]: 200,
  [ChineseChessPieceType.PAWN]: 100,
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

const PST: Record<ChineseChessPieceType, number[][]> = {
  [ChineseChessPieceType.KING]: KING_PST,
  [ChineseChessPieceType.ADVISOR]: ADVISOR_PST,
  [ChineseChessPieceType.ELEPHANT]: ELEPHANT_PST,
  [ChineseChessPieceType.HORSE]: HORSE_PST,
  [ChineseChessPieceType.ROOK]: ROOK_PST,
  [ChineseChessPieceType.CANNON]: CANNON_PST,
  [ChineseChessPieceType.PAWN]: PAWN_PST,
};

function hasCrossedRiver(pos: { row: number; col: number }, color: PieceColor): boolean {
  if (color === PieceColor.DARK) return pos.row <= 4;
  return pos.row >= 5;
}

export function evaluateChineseChessBoard(
  board: ChineseChessBoardState,
  aiColor: PieceColor,
): number {
  let score = 0;

  for (const piece of board.pieces) {
    const val = PIECE_VALUES[piece.type];
    const table = PST[piece.type];
    const row = piece.color === PieceColor.DARK ? 9 - piece.position.row : piece.position.row;
    let posBonus = table[row][piece.position.col];

    if (piece.type === ChineseChessPieceType.PAWN && hasCrossedRiver(piece.position, piece.color)) {
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
