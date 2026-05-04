import type { Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import type { GoBoardState, GoStone, GoBoardSize } from '@board-games/shared/go';
import { STAR_POINTS } from '@board-games/shared/go';

const GO_COL_LETTERS = 'ABCDEFGHJKLMNOPQRST';

const BOARD_COLOR = '#DCB468';
const LINE_COLOR = '#8B6914';
const LABEL_COLOR = '#8b7355';
const STONE_R = 0.44;

export function GoBoard({
  board,
  onIntersectionClick,
  humanColor,
  isHumanTurn,
  lastMove,
  isFinished,
  isProcessing,
}: {
  board: GoBoardState;
  onIntersectionClick: (pos: Position) => void;
  humanColor: PieceColor;
  isHumanTurn: boolean;
  lastMove: Position | null;
  isFinished: boolean;
  isProcessing?: boolean;
}) {
  const { size } = board;
  const flip = humanColor === PieceColor.LIGHT;
  const stoneMap = new Map<string, GoStone>();
  for (const s of board.stones) {
    stoneMap.set(`${s.position.row},${s.position.col}`, s);
  }

  const starPoints = STAR_POINTS[size as GoBoardSize] || [];
  const canInteract = isHumanTurn && !isFinished;

  const GRID_W = size - 1;
  const GRID_H = size - 1;
  const MX = `${(0.5 / size) * 100}%`;
  const MY = `${(0.5 / size) * 100}%`;
  const CELL_SIZE = `${100 / GRID_W}%`;

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
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
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
            <filter id="go-stone-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx={0} dy={0.03} stdDeviation={0.04} floodColor="rgba(0,0,0,0.35)" />
            </filter>
          </defs>

          {Array.from({ length: size }, (_, i) => {
            const y = flip ? GRID_H - i : i;
            return <line key={`h${i}`} x1={0} y1={y} x2={GRID_W} y2={y} stroke={LINE_COLOR} strokeWidth={0.04} />;
          })}
          {Array.from({ length: size }, (_, i) => {
            const x = flip ? GRID_W - i : i;
            return <line key={`v${i}`} x1={x} y1={0} x2={x} y2={GRID_H} stroke={LINE_COLOR} strokeWidth={0.04} />;
          })}

          {starPoints.map((p) => {
            const cx = flip ? GRID_W - p.col : p.col;
            const cy = flip ? GRID_H - p.row : p.row;
            return <circle key={`star-${p.row}-${p.col}`} cx={cx} cy={cy} r={size === 19 ? 0.12 : 0.15} fill={LINE_COLOR} />;
          })}

          {board.stones.map((stone) => {
            const { dr, dc } = svgPos(stone.position.row, stone.position.col);
            const isLast = lastMove?.row === stone.position.row && lastMove?.col === stone.position.col;
            const isDark = stone.color === PieceColor.DARK;
            const gradId = `go-grad-${stone.id}`;
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
                        <stop offset="45%" stopColor="#e8dcc8" />
                        <stop offset="100%" stopColor="#d4c4a8" />
                      </>
                    )}
                  </radialGradient>
                </defs>
                <circle cx={dc} cy={dr} r={STONE_R} fill={`url(#${gradId})`} filter="url(#go-stone-shadow)" />
                {!isDark && <circle cx={dc} cy={dr} r={STONE_R} fill="none" stroke="#999" strokeWidth={0.006} />}
                {isLast && (
                  <circle cx={dc} cy={dr} r={STONE_R * 0.24} fill={isDark ? '#fff' : '#ef4444'} />
                )}
              </g>
            );
          })}
        </svg>

        {Array.from({ length: size }, (_, i) => {
          const rowNum = flip ? i + 1 : size - i;
          const colChar = flip ? GO_COL_LETTERS[size - 1 - i] : GO_COL_LETTERS[i];
          const { dr, dc } = svgPos(i, i);
          const colPos = { left: `${(dc / GRID_W) * 100}%`, top: '100%' };
          const rowPos = { left: 0, top: `${(dr / GRID_H) * 100}%` };
          const fs = size === 19 ? 'max(0.55rem, 0.7vw)' : 'max(0.6rem, 0.85vw)';
          return (
            <div key={`lbl-${i}`} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}>
              <span
                style={{
                  position: 'absolute',
                  left: colPos.left,
                  top: '100%',
                  transform: `translate(-50%, ${size === 19 ? '2' : '3'}px)`,
                  fontSize: fs,
                  color: LABEL_COLOR,
                  userSelect: 'none',
                  lineHeight: 1,
                }}
              >
                {colChar}
              </span>
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  top: rowPos.top,
                  transform: `translate(calc(-100% - ${size === 19 ? '2' : '3'}px), -50%)`,
                  fontSize: fs,
                  color: LABEL_COLOR,
                  userSelect: 'none',
                  lineHeight: 1,
                }}
              >
                {rowNum}
              </span>
            </div>
          );
        })}

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
