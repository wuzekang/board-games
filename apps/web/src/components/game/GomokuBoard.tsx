import type { Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import type { GomokuBoardState, GomokuStone } from '@board-games/shared/gomoku';

const BOARD_SIZE = 15;

const STAR_POINTS: Position[] = [
  { row: 3, col: 3 },
  { row: 3, col: 11 },
  { row: 11, col: 3 },
  { row: 11, col: 11 },
  { row: 7, col: 7 },
];

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

  const gridSvgSize = BOARD_SIZE - 1;

  const cells: { row: number; col: number }[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      cells.push({ row: r, col: c });
    }
  }

  return (
    <div
      className="rounded-xl shadow-md overflow-hidden"
      style={{ width: '100%', maxHeight: '100%', aspectRatio: '1 / 1', flexShrink: 0, position: 'relative', background: '#DCB468' }}
    >
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}
        viewBox={`0 0 ${gridSvgSize} ${gridSvgSize}`}
        preserveAspectRatio="none"
      >
        {Array.from({ length: BOARD_SIZE }, (_, i) => {
          const y = flip ? gridSvgSize - i : i;
          return <line key={`h${i}`} x1={0} y1={y} x2={gridSvgSize} y2={y} stroke="#8B6914" strokeWidth={0.04} />;
        })}
        {Array.from({ length: BOARD_SIZE }, (_, i) => {
          const x = flip ? gridSvgSize - i : i;
          return <line key={`v${i}`} x1={x} y1={0} x2={x} y2={gridSvgSize} stroke="#8B6914" strokeWidth={0.04} />;
        })}

        {STAR_POINTS.map((p) => {
          const cx = flip ? gridSvgSize - p.col : p.col;
          const cy = flip ? gridSvgSize - p.row : p.row;
          return <circle key={`star-${p.row}-${p.col}`} cx={cx} cy={cy} r={0.15} fill="#8B6914" />;
        })}
      </svg>

      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        {cells.map(({ row, col }) => {
          const key = `${row},${col}`;
          const isOccupied = stoneMap.has(key);
          const dr = flip ? BOARD_SIZE - 1 - row : row;
          const dc = flip ? BOARD_SIZE - 1 - col : col;

          return (
            <div
              key={key}
              onClick={isOccupied || !canInteract ? undefined : () => onIntersectionClick({ row, col })}
              style={{
                position: 'absolute',
                left: `${(dc / BOARD_SIZE) * 100}%`,
                top: `${(dr / BOARD_SIZE) * 100}%`,
                width: `${100 / BOARD_SIZE}%`,
                height: `${100 / BOARD_SIZE}%`,
                cursor: isOccupied ? 'default' : canInteract ? 'pointer' : 'default',
                boxSizing: 'border-box',
              }}
            />
          );
        })}

        {board.stones.map((stone) => {
          const dr = flip ? BOARD_SIZE - 1 - stone.position.row : stone.position.row;
          const dc = flip ? BOARD_SIZE - 1 - stone.position.col : stone.position.col;
          const isWinning = winningSet?.has(`${stone.position.row},${stone.position.col}`);
          const isLast = lastMove?.row === stone.position.row && lastMove?.col === stone.position.col;
          const isDark = stone.color === PieceColor.DARK;

          return (
            <div
              key={stone.id}
              style={{
                position: 'absolute',
                left: `${(dc / BOARD_SIZE) * 100}%`,
                top: `${(dr / BOARD_SIZE) * 100}%`,
                width: `${100 / BOARD_SIZE}%`,
                height: `${100 / BOARD_SIZE}%`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  width: '88%',
                  height: '88%',
                  borderRadius: '50%',
                  position: 'relative',
                  background: isDark
                    ? 'radial-gradient(circle at 38% 32%, #2c2520 0%, #1a1612 40%, #12100d 100%)'
                    : 'radial-gradient(circle at 38% 32%, #f5f0e8 0%, #e8dcc8 50%, #d4c4a8 100%)',
                  border: isDark ? 'none' : '0.5px solid #999',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                }}
              >
                {isWinning && (
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.45)' }} />
                )}
                {isLast && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: '20%',
                      height: '20%',
                      borderRadius: '50%',
                      background: isDark ? '#fff' : '#ef4444',
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
