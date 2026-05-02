import type { Position } from './board';

export enum MoveType {
  STEP = 'step',
  CAPTURE = 'capture',
  CHAIN_CAPTURE = 'chain_capture',
}

export interface Move {
  pieceId: string;
  from: Position;
  to: Position;
  type: MoveType;
  capturedPieceIds: string[];
  path: Position[];
  promoted: boolean;
}
