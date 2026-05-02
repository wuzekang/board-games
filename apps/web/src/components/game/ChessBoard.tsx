import type { Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import type { ChessBoardState, ChessMove, ChessPiece } from '@board-games/shared/chess';
import { ChessPieceType } from '@board-games/shared/chess';

const CELL_SIZE = 72;
const LABEL_WIDTH = 24;

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const PIECE_SYMBOL: Record<ChessPieceType, string> = {
  [ChessPieceType.KING]: '♚',
  [ChessPieceType.QUEEN]: '♛',
  [ChessPieceType.ROOK]: '♜',
  [ChessPieceType.BISHOP]: '♝',
  [ChessPieceType.KNIGHT]: '♞',
  [ChessPieceType.PAWN]: '♟',
};

export function ChessBoard({
  board,
  selectedPieceId,
  validMoves,
  onCellClick,
  humanColor,
  isInCheck,
  lastMove,
}: {
  board: ChessBoardState;
  selectedPieceId: string | null;
  validMoves: ChessMove[];
  onCellClick: (pos: Position) => void;
  humanColor: PieceColor;
  isInCheck: boolean;
  lastMove: { from: Position; to: Position } | null;
}) {
  const flipBoard = humanColor === PieceColor.DARK;

  const validTargetSet = new Set(validMoves.map((m) => `${m.to.row},${m.to.col}`));
  const captureTargetSet = new Set(
    validMoves
      .filter(
        (m) =>
          m.capturedPieceId !== null ||
          m.type === 'en_passant',
      )
      .map((m) => `${m.to.row},${m.to.col}`),
  );

  const pieceMap = new Map<string, ChessPiece>();
  for (const p of board.pieces) {
    pieceMap.set(`${p.position.row},${p.position.col}`, p);
  }

  const svgWidth = 8 * CELL_SIZE + LABEL_WIDTH;
  const svgHeight = 8 * CELL_SIZE + LABEL_WIDTH;

  const getDisplayPos = (row: number, col: number) => {
    const displayRow = flipBoard ? row : 7 - row;
    const displayCol = flipBoard ? 7 - col : col;
    return { displayRow, displayCol };
  };

  const kingInCheckPos = isInCheck
    ? board.pieces.find(
        (p) =>
          p.type === ChessPieceType.KING &&
          p.color === (humanColor === PieceColor.LIGHT ? PieceColor.LIGHT : PieceColor.DARK),
      )?.position
    : undefined;

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="max-w-full h-auto rounded-xl shadow-md"
    >
      <defs>
        <filter id="chess-piece-shadow">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.3" />
        </filter>
      </defs>
      {Array.from({ length: 8 }, (_, row) =>
        Array.from({ length: 8 }, (_, col) => {
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
            kingInCheckPos &&
            kingInCheckPos.row === row &&
            kingInCheckPos.col === col;

          const { displayRow, displayCol } = getDisplayPos(row, col);
          const cx = displayCol * CELL_SIZE + LABEL_WIDTH + CELL_SIZE / 2;
          const cy = displayRow * CELL_SIZE + CELL_SIZE / 2;

          return (
            <g
              key={key}
              onClick={() => onCellClick({ row, col })}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={displayCol * CELL_SIZE + LABEL_WIDTH}
                y={displayRow * CELL_SIZE}
                width={CELL_SIZE}
                height={CELL_SIZE}
                fill={
                  isCheckSquare
                    ? '#ef4444'
                    : isLastMoveSquare
                      ? isLight
                        ? '#f6f669'
                        : '#baca2b'
                      : isLight
                        ? '#f0d9b5'
                        : '#b58863'
                }
              />
              {isSelected && (
                <rect
                  x={displayCol * CELL_SIZE + LABEL_WIDTH}
                  y={displayRow * CELL_SIZE}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  fill="rgba(216, 138, 80, 0.35)"
                />
              )}
              {isValidTarget && !piece && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={CELL_SIZE * 0.15}
                  fill="rgba(0, 0, 0, 0.2)"
                />
              )}
              {isCaptureTarget && piece && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={CELL_SIZE * 0.45}
                  fill="none"
                  stroke="rgba(0, 0, 0, 0.2)"
                  strokeWidth={4}
                />
              )}
              {isCaptureTarget && !piece && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={CELL_SIZE * 0.15}
                  fill="rgba(0, 0, 0, 0.2)"
                />
              )}
              {piece && (
                <text
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={CELL_SIZE * 0.75}
                  fill={piece.color === PieceColor.LIGHT ? '#ffffff' : '#1a1a1a'}
                  stroke={piece.color === PieceColor.LIGHT ? '#666' : '#999'}
                  strokeWidth={0.5}
                  style={{ filter: 'url(#chess-piece-shadow)', pointerEvents: 'none', userSelect: 'none' }}
                >
                  {PIECE_SYMBOL[piece.type]}
                </text>
              )}
            </g>
          );
        }),
      )}
      {Array.from({ length: 8 }, (_, i) => {
        const row = flipBoard ? i : 7 - i;
        const col = flipBoard ? 7 - i : i;
        return (
          <g key={`label-${i}`}>
            <text
              x={4}
              y={i * CELL_SIZE + CELL_SIZE / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={11}
              fill="#737373"
              fontWeight="bold"
            >
              {8 - row}
            </text>
            <text
              x={LABEL_WIDTH + col * CELL_SIZE + CELL_SIZE / 2}
              y={8 * CELL_SIZE + LABEL_WIDTH / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={11}
              fill="#737373"
              fontWeight="bold"
            >
              {FILES[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
