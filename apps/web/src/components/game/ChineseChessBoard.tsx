import type { Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import type { ChineseChessBoardState, ChineseChessMove, ChineseChessPiece } from '@board-games/shared/chinese_chess';
import { ChineseChessPieceType } from '@board-games/shared/chinese_chess';

const ROWS = 10;
const COLS = 9;
const CELL_SIZE = 60;
const PADDING = 40;
const PIECE_RADIUS = 24;

const SVG_WIDTH = PADDING * 2 + (COLS - 1) * CELL_SIZE;
const SVG_HEIGHT = PADDING * 2 + (ROWS - 1) * CELL_SIZE;

const PIECE_CHARS: Record<ChineseChessPieceType, [string, string]> = {
  [ChineseChessPieceType.KING]: ['帥', '將'],
  [ChineseChessPieceType.ADVISOR]: ['仕', '士'],
  [ChineseChessPieceType.ELEPHANT]: ['相', '象'],
  [ChineseChessPieceType.HORSE]: ['傌', '馬'],
  [ChineseChessPieceType.ROOK]: ['俥', '車'],
  [ChineseChessPieceType.CANNON]: ['炮', '砲'],
  [ChineseChessPieceType.PAWN]: ['兵', '卒'],
};

const BOARD_COLOR = '#F0D9A0';
const LINE_COLOR = '#5C3A1E';

function toSvg(row: number, col: number, flip: boolean): { x: number; y: number } {
  const dr = flip ? ROWS - 1 - row : row;
  const dc = flip ? COLS - 1 - col : col;
  return {
    x: PADDING + dc * CELL_SIZE,
    y: PADDING + dr * CELL_SIZE,
  };
}

export function ChineseChessBoard({
  board,
  selectedPieceId,
  validMoves,
  onCellClick,
  humanColor,
  isInCheck,
  lastMove,
}: {
  board: ChineseChessBoardState;
  selectedPieceId: string | null;
  validMoves: ChineseChessMove[];
  onCellClick: (pos: Position) => void;
  humanColor: PieceColor;
  isInCheck: boolean;
  lastMove: { from: Position; to: Position } | null;
}) {
  const flip = humanColor === PieceColor.LIGHT;

  const pieceMap = new Map<string, ChineseChessPiece>();
  for (const p of board.pieces) {
    pieceMap.set(`${p.position.row},${p.position.col}`, p);
  }

  const validTargetSet = new Set(validMoves.map((m) => `${m.to.row},${m.to.col}`));
  const captureTargetSet = new Set(
    validMoves
      .filter((m) => m.capturedPieceId !== null)
      .map((m) => `${m.to.row},${m.to.col}`),
  );

  const kingInCheckPos = isInCheck
    ? board.pieces.find(
        (p) =>
          p.type === ChineseChessPieceType.KING &&
          p.color === humanColor,
      )?.position
    : undefined;

  const rows = Array.from({ length: ROWS }, (_, r) => r);
  const cols = Array.from({ length: COLS }, (_, c) => c);

  return (
    <svg
      width={SVG_WIDTH}
      height={SVG_HEIGHT}
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      className="rounded-xl shadow-md"
    >
      <defs>
        <linearGradient id="cc-piece-fill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f0dbb8" />
          <stop offset="30%" stopColor="#e8d0a8" />
          <stop offset="70%" stopColor="#d4b896" />
          <stop offset="100%" stopColor="#c0a070" />
        </linearGradient>
        <filter id="cc-piece-shadow">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000" floodOpacity="0.25" />
        </filter>
      </defs>
      <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill={BOARD_COLOR} rx={8} />

      {rows.map((r) => {
        const p1 = toSvg(r, 0, flip);
        const p2 = toSvg(r, COLS - 1, flip);
        return (
          <line key={`h-${r}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={LINE_COLOR} strokeWidth={1} />
        );
      })}

      {cols.map((c) => {
        const topP = toSvg(0, c, flip);
        const midTopP = toSvg(4, c, flip);
        const midBotP = toSvg(5, c, flip);
        const botP = toSvg(ROWS - 1, c, flip);
        return (
          <g key={`v-${c}`}>
            {c === 0 || c === COLS - 1 ? (
              <line x1={topP.x} y1={topP.y} x2={botP.x} y2={botP.y} stroke={LINE_COLOR} strokeWidth={1} />
            ) : (
              <>
                <line x1={topP.x} y1={topP.y} x2={midTopP.x} y2={midTopP.y} stroke={LINE_COLOR} strokeWidth={1} />
                <line x1={midBotP.x} y1={midBotP.y} x2={botP.x} y2={botP.y} stroke={LINE_COLOR} strokeWidth={1} />
              </>
            )}
          </g>
        );
      })}

      {[
        { r1: 0, c1: 3, r2: 2, c2: 5 },
        { r1: 0, c1: 5, r2: 2, c2: 3 },
        { r1: 7, c1: 3, r2: 9, c2: 5 },
        { r1: 7, c1: 5, r2: 9, c2: 3 },
      ].map(({ r1, c1, r2, c2 }, i) => {
        const pa = toSvg(r1, c1, flip);
        const pb = toSvg(r2, c2, flip);
        return (
          <line key={`palace-${i}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={LINE_COLOR} strokeWidth={1} />
        );
      })}

      {(() => {
        const markPositions = [
          [2, 1], [2, 7], [7, 1], [7, 7],
          [3, 0], [3, 2], [3, 4], [3, 6], [3, 8],
          [6, 0], [6, 2], [6, 4], [6, 6], [6, 8],
        ];
        const d = 5;
        const g = 3;
        return markPositions.map(([r, c], i) => {
          const { x, y } = toSvg(r, c, flip);
          const arms: string[] = [];
          const onLeft = c === 0;
          const onRight = c === COLS - 1;
          if (!onLeft) {
            arms.push(`M${x - g},${y - g - d} L${x - g},${y - g} L${x - g - d},${y - g}`);
            arms.push(`M${x - g},${y + g + d} L${x - g},${y + g} L${x - g - d},${y + g}`);
          }
          if (!onRight) {
            arms.push(`M${x + g},${y - g - d} L${x + g},${y - g} L${x + g + d},${y - g}`);
            arms.push(`M${x + g},${y + g + d} L${x + g},${y + g} L${x + g + d},${y + g}`);
          }
          return (
            <path
              key={`mark-${i}`}
              d={arms.join(' ')}
              fill="none"
              stroke={LINE_COLOR}
              strokeWidth={1}
            />
          );
        });
      })()}

      {(() => {
        const leftP = toSvg(4, 0, flip);
        const rightP = toSvg(4, COLS - 1, flip);
        const midY = (toSvg(4, 0, flip).y + toSvg(5, 0, flip).y) / 2;
        const midX = (leftP.x + rightP.x) / 2;
        return (
          <text
            x={midX - 80}
            y={midY}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={20}
            fill={LINE_COLOR}
            opacity={0.4}
            fontFamily="'Noto Serif SC', 'SimSun', serif"
            style={{ userSelect: 'none' }}
          >
            楚 河
          </text>
        );
      })()}
      {(() => {
        const leftP = toSvg(4, 0, flip);
        const rightP = toSvg(4, COLS - 1, flip);
        const midY = (toSvg(4, 0, flip).y + toSvg(5, 0, flip).y) / 2;
        const midX = (leftP.x + rightP.x) / 2;
        return (
          <text
            x={midX + 80}
            y={midY}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={20}
            fill={LINE_COLOR}
            opacity={0.4}
            fontFamily="'Noto Serif SC', 'SimSun', serif"
            style={{ userSelect: 'none' }}
          >
            漢 界
          </text>
        );
      })()}

      {rows.flatMap((r) =>
        cols.map((c) => {
          const key = `${r},${c}`;
          const { x, y } = toSvg(r, c, flip);

          return (
            <rect
              key={`hit-${key}`}
              x={x - CELL_SIZE / 2}
              y={y - CELL_SIZE / 2}
              width={CELL_SIZE}
              height={CELL_SIZE}
              fill="transparent"
              onClick={() => onCellClick({ row: r, col: c })}
              style={{ cursor: 'pointer' }}
            />
          );
        }),
      )}

      {rows.flatMap((r) =>
        cols.map((c) => {
          const key = `${r},${c}`;
          const piece = pieceMap.get(key);
          const isSelected = piece?.id === selectedPieceId;
          const isValidTarget = validTargetSet.has(key);
          const isCaptureTarget = captureTargetSet.has(key);
          const isLastMoveSquare =
            lastMove &&
            ((lastMove.from.row === r && lastMove.from.col === c) ||
              (lastMove.to.row === r && lastMove.to.col === c));
          const isCheckSquare =
            kingInCheckPos && kingInCheckPos.row === r && kingInCheckPos.col === c;

          const { x, y } = toSvg(r, c, flip);

          return (
            <g key={key} style={{ pointerEvents: 'none' }}>
              {isLastMoveSquare && !piece && (
                <rect
                  x={x - CELL_SIZE / 2}
                  y={y - CELL_SIZE / 2}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  fill="rgba(216, 138, 80, 0.15)"
                />
              )}
              {isCheckSquare && (
                <rect
                  x={x - CELL_SIZE / 2}
                  y={y - CELL_SIZE / 2}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  fill="rgba(220, 38, 38, 0.25)"
                />
              )}
              {isValidTarget && !piece && (
                <circle cx={x} cy={y} r={6} fill="rgba(0, 128, 0, 0.3)" />
              )}
              {isCaptureTarget && piece && (
                <circle
                  cx={x}
                  cy={y}
                  r={PIECE_RADIUS + 3}
                  fill="none"
                  stroke="rgba(220, 38, 38, 0.5)"
                  strokeWidth={3}
                />
              )}
              {isCaptureTarget && !piece && (
                <circle cx={x} cy={y} r={6} fill="rgba(220, 38, 38, 0.3)" />
              )}
            </g>
          );
        }),
      )}

      {board.pieces.map((piece) => {
        const isSelected = piece.id === selectedPieceId;
        const { x, y } = toSvg(piece.position.row, piece.position.col, flip);
        const isDark = piece.color === PieceColor.DARK;
        const charIdx = isDark ? 0 : 1;

        return (
          <g
            key={piece.id}
            onClick={() => onCellClick({ row: piece.position.row, col: piece.position.col })}
            style={{ cursor: 'pointer', filter: 'url(#cc-piece-shadow)' }}
          >
            <circle
              cx={x}
              cy={y}
              r={PIECE_RADIUS}
              fill="url(#cc-piece-fill)"
              stroke={isSelected ? '#d97706' : '#8B6914'}
              strokeWidth={isSelected ? 2.5 : 1.5}
            />
            <circle
              cx={x}
              cy={y}
              r={PIECE_RADIUS - 3}
              fill="none"
              stroke={isDark ? '#b91c1c' : '#1c1917'}
              strokeWidth={0.8}
              opacity={0.5}
            />
            <text
              x={x}
              y={y + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={PIECE_RADIUS * 0.85}
              fill={isDark ? '#b91c1c' : '#1c1917'}
              fontFamily="'Noto Serif SC', 'SimSun', serif"
              style={{
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              {PIECE_CHARS[piece.type][charIdx]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
