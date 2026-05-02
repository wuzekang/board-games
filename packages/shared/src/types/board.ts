export interface Position {
  row: number;
  col: number;
}

export enum PieceType {
  MAN = 'man',
  KING = 'king',
}

export enum PieceColor {
  DARK = 'dark',
  LIGHT = 'light',
}

export interface Piece {
  id: string;
  type: PieceType;
  color: PieceColor;
  position: Position;
}

export interface BoardState {
  size: 10 | 8;
  pieces: Piece[];
}

export function posKey(pos: Position): string {
  return `${pos.row},${pos.col}`;
}

export function buildPieceMap(pieces: Piece[]): Map<string, Piece> {
  const map = new Map<string, Piece>();
  for (const p of pieces) map.set(posKey(p.position), p);
  return map;
}

export function isDarkSquare(row: number, col: number): boolean {
  return (row + col) % 2 === 1;
}
