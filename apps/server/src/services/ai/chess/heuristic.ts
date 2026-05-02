import {
  type ChessBoardState,
  type ChessPiece,
  ChessPieceType,
  PieceColor,
} from '@board-games/shared/chess';

const PIECE_VALUES: Record<ChessPieceType, number> = {
  [ChessPieceType.PAWN]: 100,
  [ChessPieceType.KNIGHT]: 320,
  [ChessPieceType.BISHOP]: 330,
  [ChessPieceType.ROOK]: 500,
  [ChessPieceType.QUEEN]: 900,
  [ChessPieceType.KING]: 20000,
};

const PAWN_TABLE = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_TABLE = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const BISHOP_TABLE = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

const ROOK_TABLE = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 0, 5, 5, 0, 0, 0],
];

const QUEEN_TABLE = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

const KING_MID_TABLE = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

const KING_END_TABLE = [
  [-50, -40, -30, -20, -20, -30, -40, -50],
  [-30, -20, -10, 0, 0, -10, -20, -30],
  [-30, -10, 20, 30, 30, 20, -10, -30],
  [-30, -10, 30, 40, 40, 30, -10, -30],
  [-30, -10, 30, 40, 40, 30, -10, -30],
  [-30, -10, 20, 30, 30, 20, -10, -30],
  [-30, -30, 0, 0, 0, 0, -30, -30],
  [-50, -30, -30, -30, -30, -30, -30, -50],
];

const PST: Record<ChessPieceType, number[][]> = {
  [ChessPieceType.PAWN]: PAWN_TABLE,
  [ChessPieceType.KNIGHT]: KNIGHT_TABLE,
  [ChessPieceType.BISHOP]: BISHOP_TABLE,
  [ChessPieceType.ROOK]: ROOK_TABLE,
  [ChessPieceType.QUEEN]: QUEEN_TABLE,
  [ChessPieceType.KING]: KING_MID_TABLE,
};

function isEndgame(board: ChessBoardState): boolean {
  let majorMinor = 0;
  for (const p of board.pieces) {
    if (
      p.type === ChessPieceType.QUEEN ||
      p.type === ChessPieceType.ROOK ||
      p.type === ChessPieceType.BISHOP ||
      p.type === ChessPieceType.KNIGHT
    ) {
      majorMinor++;
    }
  }
  return majorMinor <= 4;
}

export function evaluateChessBoard(
  board: ChessBoardState,
  aiColor: PieceColor,
): number {
  let score = 0;
  const endgame = isEndgame(board);
  const humanColor =
    aiColor === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;

  for (const piece of board.pieces) {
    const val = PIECE_VALUES[piece.type];
    let table: number[][];

    if (piece.type === ChessPieceType.KING && endgame) {
      table = KING_END_TABLE;
    } else {
      table = PST[piece.type];
    }

    const row =
      piece.color === PieceColor.LIGHT ? piece.position.row : 7 - piece.position.row;
    const posBonus = table[row][piece.position.col];
    const total = val + posBonus;

    if (piece.color === aiColor) {
      score += total;
    } else {
      score -= total;
    }
  }

  return score;
}
