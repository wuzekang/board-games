import type { Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import type { GoBoardState, GoStone, GoBoardSize } from '@board-games/shared/go';
import { STAR_POINTS } from '@board-games/shared/go';

const GO_COL_LETTERS = 'ABCDEFGHJKLMNOPQRST';

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
  const flip = humanColor === PieceColor.LIGHT;
  const stoneMap = new Map<string, GoStone>();
  for (const s of board.stones) {
    stoneMap.set(`${s.position.row},${s.position.col}`, s);
  }

  const starPoints = STAR_POINTS[size as GoBoardSize] || [];
  const canInteract = isHumanTurn && !isFinished;

  const gridSvgSize = size - 1;

  const cells: { row: number; col: number }[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      cells.push({ row: r, col: c });
    }
  }

  const labels = Array.from({ length: size }, (_, i) => {
    const rowNum = flip ? i + 1 : size - i;
    const colChar = flip ? GO_COL_LETTERS[size - 1 - i] : GO_COL_LETTERS[i];
    const dr = flip ? size - 1 - i : i;
    const dc = flip ? size - 1 - i : i;
    return { rowNum, colChar, dr, dc, i };
  });

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
        {Array.from({ length: size }, (_, i) => {
          const y = flip ? gridSvgSize - i : i;
          return <line key={`h${i}`} x1={0} y1={y} x2={gridSvgSize} y2={y} stroke="#8B6914" strokeWidth={0.04} />;
        })}
        {Array.from({ length: size }, (_, i) => {
          const x = flip ? gridSvgSize - i : i;
          return <line key={`v${i}`} x1={x} y1={0} x2={x} y2={gridSvgSize} stroke="#8B6914" strokeWidth={0.04} />;
        })}

        {starPoints.map((p) => {
          const cx = flip ? gridSvgSize - p.col : p.col;
          const cy = flip ? gridSvgSize - p.row : p.row;
          return <circle key={`star-${p.row}-${p.col}`} cx={cx} cy={cy} r={size === 19 ? 0.12 : 0.15} fill="#8B6914" />;
        })}
      </svg>

      {labels.map(({ rowNum, colChar, dr, dc, i }) => (
        <div key={`lbl-${i}`} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}>
          <span
            style={{
              position: 'absolute',
              left: `${((dc + 0.5) / size) * 100}%`,
              bottom: `${(((size - 1) - dr) / size) * 100 + (100 / size) * 0.45}%`,
              transform: 'translate(-50%, 50%)',
              fontSize: size === 19 ? 'max(0.55rem, 0.7vw)' : 'max(0.6rem, 0.85vw)',
              color: '#8b7355',
              userSelect: 'none',
              lineHeight: 1,
            }}
          >
            {colChar}
          </span>
          <span
            style={{
              position: 'absolute',
              left: `${(100 / size) * 0.45}%`,
              top: `${((dr + 0.5) / size) * 100}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: size === 19 ? 'max(0.55rem, 0.7vw)' : 'max(0.6rem, 0.85vw)',
              color: '#8b7355',
              userSelect: 'none',
              lineHeight: 1,
            }}
          >
            {rowNum}
          </span>
        </div>
      ))}

      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        {cells.map(({ row, col }) => {
          const key = `${row},${col}`;
          const isOccupied = stoneMap.has(key);
          const dr = flip ? size - 1 - row : row;
          const dc = flip ? size - 1 - col : col;

          return (
            <div
              key={key}
              onClick={isOccupied || !canInteract ? undefined : () => onIntersectionClick({ row, col })}
              style={{
                position: 'absolute',
                left: `${(dc / size) * 100}%`,
                top: `${(dr / size) * 100}%`,
                width: `${100 / size}%`,
                height: `${100 / size}%`,
                cursor: isOccupied ? 'default' : canInteract ? 'pointer' : 'default',
                boxSizing: 'border-box',
              }}
            />
          );
        })}

        {board.stones.map((stone) => {
          const dr = flip ? size - 1 - stone.position.row : stone.position.row;
          const dc = flip ? size - 1 - stone.position.col : stone.position.col;
          const isLast = lastMove?.row === stone.position.row && lastMove?.col === stone.position.col;
          const isDark = stone.color === PieceColor.DARK;

          return (
            <div
              key={stone.id}
              style={{
                position: 'absolute',
                left: `${(dc / size) * 100}%`,
                top: `${(dr / size) * 100}%`,
                width: `${100 / size}%`,
                height: `${100 / size}%`,
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
                    ? 'radial-gradient(circle at 38% 32%, #2c2520 0%, #1a1612 35%, #12100d 100%)'
                    : 'radial-gradient(circle at 38% 32%, #f5f0e8 0%, #e8dcc8 45%, #d4c4a8 100%)',
                  border: isDark ? 'none' : '0.5px solid #999',
                  boxShadow: `0 ${size === 19 ? '1' : '1.5'}px ${size === 19 ? '1' : '2'}px rgba(0,0,0,0.35)`,
                }}
              >
                {isLast && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: '22%',
                      height: '22%',
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
