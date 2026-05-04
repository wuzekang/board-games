import type { Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import type { ChessBoardState, ChessMove, ChessPiece } from '@board-games/shared/chess';
import { ChessPieceType } from '@board-games/shared/chess';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const PIECE_SYMBOL: Record<ChessPieceType, string> = {
  [ChessPieceType.KING]: '♚',
  [ChessPieceType.QUEEN]: '♛',
  [ChessPieceType.ROOK]: '♜',
  [ChessPieceType.BISHOP]: '♝',
  [ChessPieceType.KNIGHT]: '♞',
  [ChessPieceType.PAWN]: '♟',
};

const SIZE = 8;

function getDisplayPos(row: number, col: number, flipBoard: boolean) {
  const displayRow = flipBoard ? row : 7 - row;
  const displayCol = flipBoard ? 7 - col : col;
  return { displayRow, displayCol };
}

function CrosshairOverlay() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      <div style={{ position: 'relative', width: '60%', height: '60%' }}>
        <div style={{ position: 'absolute', left: '50%', top: 0, width: 2, height: '30%', background: '#ef4444', transform: 'translateX(-50%)', borderRadius: 1 }} />
        <div style={{ position: 'absolute', left: '50%', bottom: 0, width: 2, height: '30%', background: '#ef4444', transform: 'translateX(-50%)', borderRadius: 1 }} />
        <div style={{ position: 'absolute', top: '50%', left: 0, height: 2, width: '30%', background: '#ef4444', transform: 'translateY(-50%)', borderRadius: 1 }} />
        <div style={{ position: 'absolute', top: '50%', right: 0, height: 2, width: '30%', background: '#ef4444', transform: 'translateY(-50%)', borderRadius: 1 }} />
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: '10%', height: '10%', background: '#ef4444', transform: 'translate(-50%, -50%)', borderRadius: '50%' }} />
      </div>
    </div>
  );
}

export function ChessBoard({
  board,
  selectedPieceId,
  validMoves,
  onCellClick,
  humanColor,
  isInCheck,
  lastMove,
  threatenedPieceIds,
  isProcessing,
}: {
  board: ChessBoardState;
  selectedPieceId: string | null;
  validMoves: ChessMove[];
  onCellClick: (pos: Position) => void;
  humanColor: PieceColor;
  isInCheck: boolean;
  lastMove: { from: Position; to: Position } | null;
  threatenedPieceIds?: Set<string>;
  isProcessing?: boolean;
}) {
  const flipBoard = humanColor === PieceColor.DARK;

  const pieceMap = new Map<string, ChessPiece>();
  for (const p of board.pieces) {
    pieceMap.set(`${p.position.row},${p.position.col}`, p);
  }

  const validTargetSet = new Set(validMoves.map((m) => `${m.to.row},${m.to.col}`));
  const captureTargetSet = new Set(
    validMoves
      .filter((m) => m.capturedPieceId !== null || m.type === 'en_passant')
      .map((m) => `${m.to.row},${m.to.col}`),
  );

  const kingInCheckPos = isInCheck
    ? board.pieces.find(
        (p) =>
          p.type === ChessPieceType.KING &&
          p.color === humanColor,
      )?.position
    : undefined;

  const cells: { row: number; col: number }[] = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      cells.push({ row, col });
    }
  }

  return (
    <div
      className="rounded-xl shadow-md overflow-hidden"
      style={{ width: '100%', maxHeight: '100%', aspectRatio: '1 / 1', flexShrink: 0, position: 'relative' }}
    >
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        {cells.map(({ row, col }) => {
          const key = `${row},${col}`;
          const piece = pieceMap.get(key);
          const isSelected = piece?.id === selectedPieceId;
          const isValidTarget = validTargetSet.has(key);
          const isCaptureTarget = captureTargetSet.has(key);
          const isLight = (row + col) % 2 === 0;
          const isLastMoveSquare =
            lastMove &&
            ((lastMove.from.row === row && lastMove.from.col === col) ||
              (lastMove.to.row === row && lastMove.to.col === col));
          const isCheckSquare =
            kingInCheckPos && kingInCheckPos.row === row && kingInCheckPos.col === col;

          const { displayRow, displayCol } = getDisplayPos(row, col, flipBoard);

          let bgColor: string;
          if (isCheckSquare) {
            bgColor = '#ef4444';
          } else if (isLastMoveSquare) {
            bgColor = isLight ? '#f6f669' : '#baca2b';
          } else {
            bgColor = isLight ? '#f0d9b5' : '#b58863';
          }

          const isLeftCol = displayCol === 0;
          const isBottomRow = displayRow === 7;

          return (
            <div
              key={key}
              onClick={() => onCellClick({ row, col })}
              style={{
                position: 'absolute',
                left: `${(displayCol / SIZE) * 100}%`,
                top: `${(displayRow / SIZE) * 100}%`,
                width: `${100 / SIZE}%`,
                height: `${100 / SIZE}%`,
                background: bgColor,
                boxSizing: 'border-box',
                cursor: 'pointer',
              }}
            >
              {isSelected && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(216, 138, 80, 0.35)',
                    pointerEvents: 'none',
                  }}
                />
              )}
              {isValidTarget && !piece && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      width: '30%',
                      height: '30%',
                      borderRadius: '50%',
                      background: 'rgba(0, 0, 0, 0.2)',
                    }}
                  />
                </div>
              )}
              {isCaptureTarget && piece && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      width: '85%',
                      height: '85%',
                      borderRadius: '50%',
                      border: '4px solid rgba(0, 0, 0, 0.2)',
                    }}
                  />
                </div>
              )}
              {isCaptureTarget && !piece && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      width: '30%',
                      height: '30%',
                      borderRadius: '50%',
                      background: 'rgba(0, 0, 0, 0.2)',
                    }}
                  />
                </div>
              )}
              {isLeftCol && (
                <span
                  style={{
                    position: 'absolute',
                    left: 2,
                    top: 1,
                    fontSize: '0.55em',
                    fontWeight: 'bold',
                    color: isLight ? '#b58863' : '#f0d9b5',
                    lineHeight: 1,
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                >
                  {8 - (flipBoard ? row : 7 - row)}
                </span>
              )}
              {isBottomRow && (
                <span
                  style={{
                    position: 'absolute',
                    right: 2,
                    bottom: 0,
                    fontSize: '0.55em',
                    fontWeight: 'bold',
                    color: isLight ? '#b58863' : '#f0d9b5',
                    lineHeight: 1,
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                >
                  {FILES[flipBoard ? 7 - col : col]}
                </span>
              )}
            </div>
          );
        })}

        {board.pieces.map((piece) => {
          const { displayRow, displayCol } = getDisplayPos(piece.position.row, piece.position.col, flipBoard);
          const isThreatened = threatenedPieceIds?.has(piece.id) ?? false;

          return (
            <div
              key={piece.id}
              onClick={() => onCellClick({ row: piece.position.row, col: piece.position.col })}
              style={{
                position: 'absolute',
                left: `${(displayCol / SIZE) * 100}%`,
                top: `${(displayRow / SIZE) * 100}%`,
                width: `${100 / SIZE}%`,
                height: `${100 / SIZE}%`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10,
              }}
            >
              <span
                style={{
                  fontSize: '4em',
                  lineHeight: 1,
                  userSelect: 'none',
                  filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))',
                  pointerEvents: 'none',
                  color: piece.color === PieceColor.LIGHT ? '#ffffff' : '#1a1a1a',
                  WebkitTextStroke: piece.color === PieceColor.LIGHT ? '0.5px #666' : '0.5px #999',
                }}
              >
                {PIECE_SYMBOL[piece.type]}
              </span>
              {isThreatened && <CrosshairOverlay />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
