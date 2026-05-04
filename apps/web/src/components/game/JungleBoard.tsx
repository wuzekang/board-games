import type { Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import type { JungleBoardState, JunglePiece, JungleMove } from '@board-games/shared/jungle';
import { JUNGLE_PIECE_CHAR, JunglePieceType } from '@board-games/shared/jungle';

const COLS = 7;
const ROWS = 9;

const RIVER_CELLS = new Set<string>();
for (let r = 3; r <= 5; r++) {
  for (const c of [1, 2, 4, 5]) {
    RIVER_CELLS.add(`${r},${c}`);
  }
}

function isRiverCell(pos: Position): boolean {
  return RIVER_CELLS.has(`${pos.row},${pos.col}`);
}

const DARK_TRAPS: Position[] = [
  { row: 8, col: 2 },
  { row: 8, col: 4 },
  { row: 7, col: 3 },
];

const LIGHT_TRAPS: Position[] = [
  { row: 0, col: 2 },
  { row: 0, col: 4 },
  { row: 1, col: 3 },
];

const DARK_DEN: Position = { row: 8, col: 3 };
const LIGHT_DEN: Position = { row: 0, col: 3 };

const TRAP_SET = new Set<string>();
for (const t of [...DARK_TRAPS, ...LIGHT_TRAPS]) TRAP_SET.add(`${t.row},${t.col}`);

function isTrapCell(pos: Position): boolean {
  return TRAP_SET.has(`${pos.row},${pos.col}`);
}

function isDenCell(pos: Position): boolean {
  return (
    (pos.row === DARK_DEN.row && pos.col === DARK_DEN.col) ||
    (pos.row === LIGHT_DEN.row && pos.col === LIGHT_DEN.col)
  );
}

const CELL_SIZE = 56;

export function JungleBoard({
  board,
  selectedPieceId,
  validMoves,
  onCellClick,
  humanColor,
  lastMove,
  isFinished,
}: {
  board: JungleBoardState;
  selectedPieceId: string | null;
  validMoves: JungleMove[];
  onCellClick: (pos: Position) => void;
  humanColor: PieceColor;
  lastMove: { from: Position; to: Position } | null;
  isFinished: boolean;
}) {
  const flip = humanColor === PieceColor.LIGHT;

  const pieceMap = new Map<string, JunglePiece>();
  for (const p of board.pieces) {
    pieceMap.set(`${p.position.row},${p.position.col}`, p);
  }

  const validTargetSet = new Set<string>();
  const validCaptureSet = new Set<string>();
  for (const m of validMoves) {
    const key = `${m.to.row},${m.to.col}`;
    if (m.capturedPieceId) {
      validCaptureSet.add(key);
    } else {
      validTargetSet.add(key);
    }
  }

  const svgW = COLS * CELL_SIZE;
  const svgH = ROWS * CELL_SIZE;

  const toSvgRow = (r: number) => (flip ? ROWS - 1 - r : r);
  const toSvgCol = (c: number) => (flip ? COLS - 1 - c : c);

  const cellX = (col: number) => toSvgCol(col) * CELL_SIZE;
  const cellY = (row: number) => toSvgRow(row) * CELL_SIZE;
  const cellCX = (col: number) => cellX(col) + CELL_SIZE / 2;
  const cellCY = (row: number) => cellY(row) + CELL_SIZE / 2;

  const lastMoveFromKey = lastMove ? `${lastMove.from.row},${lastMove.from.col}` : null;
  const lastMoveToKey = lastMove ? `${lastMove.to.row},${lastMove.to.col}` : null;

  return (
    <div
      className="rounded-xl shadow-md overflow-hidden"
      style={{
        width: '100%',
        maxHeight: '100%',
        aspectRatio: `${COLS / ROWS}`,
        flexShrink: 0,
        position: 'relative',
      }}
    >
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <defs>
          <linearGradient id="jungle-piece-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f0dbb8" />
            <stop offset="100%" stopColor="#c0a070" />
          </linearGradient>
        </defs>

        {Array.from({ length: ROWS }, (_, r) =>
          Array.from({ length: COLS }, (_, c) => {
            const pos = { row: r, col: c };
            const key = `${r},${c}`;
            const river = isRiverCell(pos);
            const trap = isTrapCell(pos);
            const den = isDenCell(pos);
            const isLastFrom = key === lastMoveFromKey;
            const isLastTo = key === lastMoveToKey;
            const isSelected = pieceMap.has(key) && pieceMap.get(key)!.id === selectedPieceId;

            let fill = '#7cb342';
            if (river) fill = '#42a5f5';
            if (isLastFrom && !river) fill = '#fde68a';
            if (isLastTo && !river) fill = '#fde68a';
            if (isLastFrom && river) fill = '#64b5f6';
            if (isLastTo && river) fill = '#64b5f6';

            return (
              <g key={key}>
                <rect
                  x={cellX(c)}
                  y={cellY(r)}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  fill={fill}
                  stroke="#558b2f"
                  strokeWidth={0.5}
                />
                {trap && (
                  <text
                    x={cellCX(c)}
                    y={cellCY(r) + 4}
                    fontSize="16"
                    fill={r < 3 ? '#1c1917' : '#b91c1c'}
                    fontFamily="serif"
                    textAnchor="middle"
                    fontWeight="bold"
                    opacity={0.4}
                  >
                    ✕
                  </text>
                )}
                {den && (
                  <text
                    x={cellCX(c)}
                    y={cellCY(r) + 5}
                    fontSize="18"
                    fill={r < 1 ? '#1c1917' : '#b91c1c'}
                    fontFamily="serif"
                    textAnchor="middle"
                    fontWeight="bold"
                    opacity={0.5}
                  >
                    ★
                  </text>
                )}
                {isSelected && (
                  <rect
                    x={cellX(c)}
                    y={cellY(r)}
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                    fill="rgba(216,138,80,0.3)"
                    stroke="#d97706"
                    strokeWidth={2.5}
                    rx={4}
                  />
                )}
              </g>
            );
          }),
        )}

        {validMoves.map((m) => {
          const cx = cellCX(m.to.col);
          const cy = cellCY(m.to.row);
          if (m.capturedPieceId) {
            return (
              <g key={`vt-${m.to.row}-${m.to.col}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={CELL_SIZE * 0.38}
                  fill="none"
                  stroke="#d97706"
                  strokeWidth={2.5}
                  opacity={0.7}
                />
                <circle cx={cellX(m.to.col) + 6} cy={cellY(m.to.row) + 6} r={3} fill="#d97706" opacity={0.7} />
                <circle cx={cellX(m.to.col) + CELL_SIZE - 6} cy={cellY(m.to.row) + 6} r={3} fill="#d97706" opacity={0.7} />
                <circle cx={cellX(m.to.col) + 6} cy={cellY(m.to.row) + CELL_SIZE - 6} r={3} fill="#d97706" opacity={0.7} />
                <circle cx={cellX(m.to.col) + CELL_SIZE - 6} cy={cellY(m.to.row) + CELL_SIZE - 6} r={3} fill="#d97706" opacity={0.7} />
              </g>
            );
          }
          return (
            <circle
              key={`vt-${m.to.row}-${m.to.col}`}
              cx={cx}
              cy={cy}
              r={6}
              fill="#d97706"
              opacity={0.6}
            />
          );
        })}

        {board.pieces.map((piece) => {
          const cx = cellCX(piece.position.col);
          const cy = cellCY(piece.position.row);
          const isDark = piece.color === PieceColor.DARK;
          const textColor = isDark ? '#b91c1c' : '#1c1917';
          const strokeColor = isDark ? '#b91c1c' : '#1c1917';
          const char = JUNGLE_PIECE_CHAR[piece.type];
          const pieceR = CELL_SIZE * 0.38;

          return (
            <g key={piece.id} style={{ pointerEvents: 'none' }}>
              <circle
                cx={cx}
                cy={cy}
                r={pieceR}
                fill="url(#jungle-piece-grad)"
                stroke={strokeColor}
                strokeWidth={1.2}
              />
              <circle
                cx={cx}
                cy={cy}
                r={pieceR - 4}
                fill="none"
                stroke={strokeColor}
                strokeWidth={0.8}
                opacity={0.5}
              />
              <text
                x={cx}
                y={cy + 6}
                fontSize="18"
                fill={textColor}
                fontFamily="serif"
                textAnchor="middle"
                fontWeight="bold"
              >
                {char}
              </text>
            </g>
          );
        })}

        {Array.from({ length: ROWS }, (_, r) =>
          Array.from({ length: COLS }, (_, c) => (
            <rect
              key={`click-${r}-${c}`}
              x={cellX(c)}
              y={cellY(r)}
              width={CELL_SIZE}
              height={CELL_SIZE}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onClick={() => onCellClick({ row: r, col: c })}
            />
          )),
        )}
      </svg>
    </div>
  );
}
