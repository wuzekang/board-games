import type { Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import type { GomokuBoardState, GomokuStone } from '@board-games/shared/gomoku';

const BOARD_SIZE = 15;
const CELL_SIZE = 40;
const PADDING = 30;
const STONE_RADIUS = 17;
const SVG_SIZE = PADDING * 2 + (BOARD_SIZE - 1) * CELL_SIZE;

const STAR_POINTS: Position[] = [
  { row: 3, col: 3 },
  { row: 3, col: 11 },
  { row: 11, col: 3 },
  { row: 11, col: 11 },
  { row: 7, col: 7 },
];

function toSvg(row: number, col: number, flip: boolean) {
  const dr = flip ? BOARD_SIZE - 1 - row : row;
  const dc = flip ? BOARD_SIZE - 1 - col : col;
  return {
    x: PADDING + dc * CELL_SIZE,
    y: PADDING + dr * CELL_SIZE,
  };
}

export function GomokuBoard({
  board,
  onIntersectionClick,
  humanColor,
  isHumanTurn,
  lastMove,
  winningLine,
  isFinished,
}: {
  board: GomokuBoardState;
  onIntersectionClick: (pos: Position) => void;
  humanColor: PieceColor;
  isHumanTurn: boolean;
  lastMove: Position | null;
  winningLine: Position[] | null;
  isFinished: boolean;
}) {
  const flip = humanColor === PieceColor.LIGHT;
  const stoneMap = new Map<string, GomokuStone>();
  for (const s of board.stones) {
    stoneMap.set(`${s.position.row},${s.position.col}`, s);
  }
  const winningSet = winningLine
    ? new Set(winningLine.map((p) => `${p.row},${p.col}`))
    : null;

  const canInteract = isHumanTurn && !isFinished;

  return (
    <svg
      viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
      className="max-w-full h-auto rounded-xl shadow-md"
    >
      <defs>
        <radialGradient id="gomoku-black-stone" cx="38%" cy="32%" r="62%">
          <stop offset="0%" stopColor="#2c2520" />
          <stop offset="40%" stopColor="#1a1612" />
          <stop offset="100%" stopColor="#12100d" />
        </radialGradient>
        <radialGradient id="gomoku-white-stone" cx="38%" cy="32%" r="62%">
          <stop offset="0%" stopColor="#f5f0e8" />
          <stop offset="50%" stopColor="#e8dcc8" />
          <stop offset="100%" stopColor="#d4c4a8" />
        </radialGradient>
        <filter id="gomoku-stone-shadow">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000" floodOpacity="0.25" />
        </filter>
      </defs>
      <rect width={SVG_SIZE} height={SVG_SIZE} fill="#DCB468" rx={8} />

      {Array.from({ length: BOARD_SIZE }, (_, i) => {
        const { x: x0, y: y0 } = toSvg(i, 0, flip);
        const { x: x1, y: y1 } = toSvg(i, BOARD_SIZE - 1, flip);
        return (
          <line key={`h${i}`} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#8B6914" strokeWidth={0.8} />
        );
      })}
      {Array.from({ length: BOARD_SIZE }, (_, i) => {
        const { x: x0, y: y0 } = toSvg(0, i, flip);
        const { x: x1, y: y1 } = toSvg(BOARD_SIZE - 1, i, flip);
        return (
          <line key={`v${i}`} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#8B6914" strokeWidth={0.8} />
        );
      })}

      {STAR_POINTS.map((p) => {
        const { x, y } = toSvg(p.row, p.col, flip);
        return <circle key={`star-${p.row}-${p.col}`} cx={x} cy={y} r={3} fill="#8B6914" />;
      })}

      {Array.from({ length: BOARD_SIZE }, (_, row) =>
        Array.from({ length: BOARD_SIZE }, (_, col) => {
          const key = `${row},${col}`;
          const isOccupied = stoneMap.has(key);
          const { x, y } = toSvg(row, col, flip);
          if (isOccupied) {
            return (
              <rect
                key={`click-${key}`}
                x={x - CELL_SIZE / 2}
                y={y - CELL_SIZE / 2}
                width={CELL_SIZE}
                height={CELL_SIZE}
                fill="transparent"
                style={{ cursor: 'default' }}
              />
            );
          }
          return (
            <rect
              key={`click-${key}`}
              x={x - CELL_SIZE / 2}
              y={y - CELL_SIZE / 2}
              width={CELL_SIZE}
              height={CELL_SIZE}
              fill="transparent"
              onClick={() => onIntersectionClick({ row, col })}
              style={{ cursor: canInteract ? 'pointer' : 'default' }}
            />
          );
        }),
      )}

      {board.stones.map((stone) => {
        const { x, y } = toSvg(stone.position.row, stone.position.col, flip);
        const isWinning = winningSet?.has(`${stone.position.row},${stone.position.col}`);
        const isLast = lastMove?.row === stone.position.row && lastMove?.col === stone.position.col;
        const isDark = stone.color === PieceColor.DARK;

        return (
          <g key={stone.id} className="animate-stone-drop" style={{ filter: 'url(#gomoku-stone-shadow)' }}>
            {isDark ? (
              <circle cx={x} cy={y} r={STONE_RADIUS} fill="url(#gomoku-black-stone)" />
            ) : (
              <>
                <circle cx={x} cy={y} r={STONE_RADIUS} fill="url(#gomoku-white-stone)" stroke="#999" strokeWidth={0.5} />
              </>
            )}
            <ellipse
              cx={x - STONE_RADIUS * 0.18}
              cy={y - STONE_RADIUS * 0.22}
              rx={STONE_RADIUS * 0.38}
              ry={STONE_RADIUS * 0.22}
              fill={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.45)'}
            />
            {isWinning && (
              <circle cx={x} cy={y} r={STONE_RADIUS} fill="rgba(239, 68, 68, 0.45)" />
            )}
            {isLast && (
              <circle cx={x} cy={y} r={4} fill={isDark ? '#fff' : '#ef4444'} />
            )}
          </g>
        );
      })}

      {Array.from({ length: BOARD_SIZE }, (_, i) => {
        const rowNum = flip ? BOARD_SIZE - i : i + 1;
        const colChar = flip
          ? String.fromCharCode(97 + (BOARD_SIZE - 1 - i))
          : String.fromCharCode(97 + i);
        const { y: yLabel } = toSvg(i, 0, flip);
        const { x: xLabel } = toSvg(0, i, flip);
        return (
          <g key={`lbl-${i}`}>
            <text
              x={PADDING - 16}
              y={yLabel}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={9}
              fill="#8b7355"
            >
              {rowNum}
            </text>
            <text
              x={xLabel}
              y={SVG_SIZE - PADDING + 16}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={9}
              fill="#8b7355"
            >
              {colChar}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
