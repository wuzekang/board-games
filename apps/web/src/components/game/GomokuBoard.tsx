import type { Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import type { GomokuBoardState, GomokuStone } from '@board-games/shared/gomoku';

const BOARD_SIZE = 15;
const GRID_W = BOARD_SIZE - 1;
const GRID_H = BOARD_SIZE - 1;
const MX = `${(0.5 / BOARD_SIZE) * 100}%`;
const MY = `${(0.5 / BOARD_SIZE) * 100}%`;
const CELL_SIZE = `${100 / GRID_W}%`;

const STAR_POINTS: Position[] = [
  { row: 3, col: 3 },
  { row: 3, col: 11 },
  { row: 11, col: 3 },
  { row: 11, col: 11 },
  { row: 7, col: 7 },
];

const BOARD_COLOR = '#DCB468';
const LINE_COLOR = '#8B6914';
const STONE_R = 0.44;

export function GomokuBoard({
  board,
  onIntersectionClick,
  humanColor,
  isHumanTurn,
  lastMove,
  winningLine,
  isFinished,
  isProcessing,
}: {
  board: GomokuBoardState;
  onIntersectionClick: (pos: Position) => void;
  humanColor: PieceColor;
  isHumanTurn: boolean;
  lastMove: Position | null;
  winningLine: Position[] | null;
  isFinished: boolean;
  isProcessing?: boolean;
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

  function svgPos(row: number, col: number) {
    const dr = flip ? GRID_H - row : row;
    const dc = flip ? GRID_W - col : col;
    return { dr, dc };
  }

  function htmlPos(row: number, col: number) {
    const { dr, dc } = svgPos(row, col);
    return {
      left: `${(dc / GRID_W) * 100}%`,
      top: `${(dr / GRID_H) * 100}%`,
    };
  }

  const cells: { row: number; col: number }[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      cells.push({ row: r, col: c });
    }
  }

  return (
    <div
      className="rounded-xl shadow-md overflow-hidden"
      style={{ width: '100%', maxHeight: '100%', aspectRatio: '1 / 1', flexShrink: 0, position: 'relative', background: BOARD_COLOR, opacity: isProcessing ? 0.6 : 1, transition: 'opacity 150ms ease' }}
    >
      <div style={{ position: 'absolute', left: MX, top: MY, right: MX, bottom: MY }}>

        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}
          viewBox={`0 0 ${GRID_W} ${GRID_H}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="gomoku-stone-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx={0} dy={0.03} stdDeviation={0.04} floodColor="rgba(0,0,0,0.35)" />
            </filter>
          </defs>

          {Array.from({ length: BOARD_SIZE }, (_, i) => {
            const y = flip ? GRID_H - i : i;
            return <line key={`h${i}`} x1={0} y1={y} x2={GRID_W} y2={y} stroke={LINE_COLOR} strokeWidth={0.04} />;
          })}
          {Array.from({ length: BOARD_SIZE }, (_, i) => {
            const x = flip ? GRID_W - i : i;
            return <line key={`v${i}`} x1={x} y1={0} x2={x} y2={GRID_H} stroke={LINE_COLOR} strokeWidth={0.04} />;
          })}

          {STAR_POINTS.map((p) => {
            const cx = flip ? GRID_W - p.col : p.col;
            const cy = flip ? GRID_H - p.row : p.row;
            return <circle key={`star-${p.row}-${p.col}`} cx={cx} cy={cy} r={0.15} fill={LINE_COLOR} />;
          })}

          {board.stones.map((stone) => {
            const { dr, dc } = svgPos(stone.position.row, stone.position.col);
            const isLast = lastMove?.row === stone.position.row && lastMove?.col === stone.position.col;
            const isWinning = winningSet?.has(`${stone.position.row},${stone.position.col}`);
            const isDark = stone.color === PieceColor.DARK;
            const gradId = `gomoku-grad-${stone.id}`;
            return (
              <g key={stone.id}>
                <defs>
                  <radialGradient id={gradId} cx="38%" cy="32%" r="60%">
                    {isDark ? (
                      <>
                        <stop offset="0%" stopColor="#2c2520" />
                        <stop offset="35%" stopColor="#1a1612" />
                        <stop offset="100%" stopColor="#12100d" />
                      </>
                    ) : (
                      <>
                        <stop offset="0%" stopColor="#f5f0e8" />
                        <stop offset="50%" stopColor="#e8dcc8" />
                        <stop offset="100%" stopColor="#d4c4a8" />
                      </>
                    )}
                  </radialGradient>
                </defs>
                <circle cx={dc} cy={dr} r={STONE_R} fill={`url(#${gradId})`} filter="url(#gomoku-stone-shadow)" />
                {!isDark && <circle cx={dc} cy={dr} r={STONE_R} fill="none" stroke="#999" strokeWidth={0.006} />}
                {isWinning && (
                  <circle cx={dc} cy={dr} r={STONE_R} fill="rgba(239, 68, 68, 0.45)" />
                )}
                {isLast && (
                  <circle cx={dc} cy={dr} r={STONE_R * 0.22} fill={isDark ? '#fff' : '#ef4444'} />
                )}
              </g>
            );
          })}
        </svg>

        {cells.map(({ row, col }) => {
          const key = `${row},${col}`;
          const isOccupied = stoneMap.has(key);
          const { left, top } = htmlPos(row, col);

          return (
            <div
              key={key}
              onClick={isOccupied || !canInteract ? undefined : () => onIntersectionClick({ row, col })}
              style={{
                position: 'absolute',
                left,
                top,
                width: CELL_SIZE,
                height: CELL_SIZE,
                transform: 'translate(-50%, -50%)',
                cursor: isOccupied ? 'default' : canInteract ? 'pointer' : 'default',
                boxSizing: 'border-box',
                zIndex: 5,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
