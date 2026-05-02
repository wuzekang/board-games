import {
  type BoardState,
  type Piece,
  PieceColor,
  PieceType,
  type Position,
} from '@board-games/shared';

export function evaluateBoard(board: BoardState, aiColor: PieceColor): number {
  let score = 0;
  const size = board.size;
  const humanColor = aiColor === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;

  for (const piece of board.pieces) {
    const val = pieceValue(piece, size);
    const posBonus = positionBonus(piece, size);
    if (piece.color === aiColor) {
      score += val + posBonus;
    } else {
      score -= val + posBonus;
    }
  }

  return score;
}

function pieceValue(piece: Piece, size: number): number {
  if (piece.type === PieceType.KING) return 300;

  const promoRow = piece.color === PieceColor.DARK ? size - 1 : 0;
  const distance = Math.abs(piece.position.row - promoRow);
  const progress = (size - distance) / size;

  return 100 + Math.round(progress * 30);
}

function positionBonus(piece: Piece, size: number): number {
  const center = (size - 1) / 2;
  const colDist = Math.abs(piece.position.col - center);
  const rowDist = Math.abs(piece.position.row - center);
  const centerBonus = Math.max(0, 5 - Math.round(colDist + rowDist));

  let advanceBonus = 0;
  if (piece.color === PieceColor.DARK) {
    advanceBonus = piece.position.row;
  } else {
    advanceBonus = size - 1 - piece.position.row;
  }

  return centerBonus + advanceBonus;
}
