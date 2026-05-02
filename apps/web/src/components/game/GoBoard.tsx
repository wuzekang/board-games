import type { Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import type { GoBoardState, GoStone, GoBoardSize } from '@board-games/shared/go';
import { STAR_POINTS } from '@board-games/shared/go';

const PADDING = 36;
const STONE_RADIUS = 17;

const GO_COL_LETTERS = 'ABCDEFGHJKLMNOPQRST';

function getCellSize(size: number): number {
  return size === 19 ? 32 : 40;
}

function getSvgSize(size: number): number {
  return PADDING * 2 + (size - 1) * getCellSize(size);
}

function toSvg(row: number, col: number, boardSize: number, flip: boolean) {
  const cellSize = getCellSize(boardSize);
  const dr = flip ? boardSize - 1 - row : row;
  const dc = flip ? boardSize - 1 - col : col;
  return {
    x: PADDING + dc * cellSize,
    y: PADDING + dr * cellSize,
  };
}

export function GoBoard({
  board,
  onIntersectionClick,
  humanColor,
  isHumanTurn,
  lastMove,
  isFinished,
}: {
  board: GoBoardState;
  onIntersectionClick: (pos: Position) => void;
  humanColor: PieceColor;
  isHumanTurn: boolean;
  lastMove: Position | null;
  isFinished: boolean;
}) {
  const { size } = board;
  const cellSize = getCellSize(size);
  const SVG_SIZE = getSvgSize(size);
  const flip = humanColor === PieceColor.LIGHT;
  const stoneRadius = size === 19 ? 14 : STONE_RADIUS;

  const stoneMap = new Map<string, GoStone>();
  for (const s of board.stones) {
    stoneMap.set(`${s.position.row},${s.position.col}`, s);
  }

  const starPoints = STAR_POINTS[size as GoBoardSize] || [];
  const canInteract = isHumanTurn && !isFinished;

  return (
    <svg
      viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
      className="max-w-full h-auto rounded-xl shadow-md"
    >
      <defs>
        <radialGradient id="go-black-stone" cx="38%" cy="32%" r="62%">
          <stop offset="0%" stopColor="#2c2520" />
          <stop offset="35%" stopColor="#1a1612" />
          <stop offset="100%" stopColor="#12100d" />
        </radialGradient>
        <radialGradient id="go-white-stone" cx="38%" cy="32%" r="62%">
          <stop offset="0%" stopColor="#f5f0e8" />
          <stop offset="45%" stopColor="#e8dcc8" />
          <stop offset="100%" stopColor="#d4c4a8" />
        </radialGradient>
        <filter id="go-stone-shadow">
          <feDropShadow dx="0" dy={size === 19 ? 1 : 1.5} stdDeviation={size === 19 ? 0.8 : 1.5} floodColor="#000" floodOpacity="0.35" />
        </filter>
      </defs>
      <rect width={SVG_SIZE} height={SVG_SIZE} fill="#DCB468" rx={8} />

      {Array.from({ length: size }, (_, i) => {
        const { x: x0, y: y0 } = toSvg(i, 0, size, flip);
        const { x: x1, y: y1 } = toSvg(i, size - 1, size, flip);
        return <line key={`h${i}`} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#8B6914" strokeWidth={0.8} />;
      })}
      {Array.from({ length: size }, (_, i) => {
        const { x: x0, y: y0 } = toSvg(0, i, size, flip);
        const { x: x1, y: y1 } = toSvg(size - 1, i, size, flip);
        return <line key={`v${i}`} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#8B6914" strokeWidth={0.8} />;
      })}

      {starPoints.map((p) => {
        const { x, y } = toSvg(p.row, p.col, size, flip);
        return <circle key={`star-${p.row}-${p.col}`} cx={x} cy={y} r={3} fill="#8B6914" />;
      })}

      {Array.from({ length: size }, (_, row) =>
        Array.from({ length: size }, (_, col) => {
          const key = `${row},${col}`;
          const { x, y } = toSvg(row, col, size, flip);
          if (stoneMap.has(key)) {
            return (
              <rect
                key={`click-${key}`}
                x={x - cellSize / 2}
                y={y - cellSize / 2}
                width={cellSize}
                height={cellSize}
                fill="transparent"
                style={{ cursor: 'default' }}
              />
            );
          }
          return (
            <rect
              key={`click-${key}`}
              x={x - cellSize / 2}
              y={y - cellSize / 2}
              width={cellSize}
              height={cellSize}
              fill="transparent"
              onClick={() => onIntersectionClick({ row, col })}
              style={{ cursor: canInteract ? 'pointer' : 'default' }}
            />
          );
        }),
      )}

      {board.stones.map((stone) => {
        const { x, y } = toSvg(stone.position.row, stone.position.col, size, flip);
        const isLast = lastMove?.row === stone.position.row && lastMove?.col === stone.position.col;
        const isDark = stone.color === PieceColor.DARK;

        return (
          <g key={stone.id} className="animate-stone-drop" style={{ filter: 'url(#go-stone-shadow)' }}>
            {isDark ? (
              <circle cx={x} cy={y} r={stoneRadius} fill="url(#go-black-stone)" />
            ) : (
              <circle cx={x} cy={y} r={stoneRadius} fill="url(#go-white-stone)" stroke="#999" strokeWidth={0.5} />
            )}
            <ellipse
              cx={x - stoneRadius * 0.18}
              cy={y - stoneRadius * 0.22}
              rx={stoneRadius * 0.38}
              ry={stoneRadius * 0.22}
              fill={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.45)'}
            />
            {isLast && (
              <circle cx={x} cy={y} r={size === 19 ? 3 : 4} fill={isDark ? '#fff' : '#ef4444'} />
            )}
          </g>
        );
      })}

      {Array.from({ length: size }, (_, i) => {
        const rowNum = flip ? i + 1 : size - i;
        const colChar = flip ? GO_COL_LETTERS[size - 1 - i] : GO_COL_LETTERS[i];
        const { y: yLabel } = toSvg(i, 0, size, flip);
        const { x: xLabel } = toSvg(0, i, size, flip);
        return (
          <g key={`lbl-${i}`}>
            <text
              x={PADDING - 18}
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
              y={SVG_SIZE - PADDING + 18}
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
