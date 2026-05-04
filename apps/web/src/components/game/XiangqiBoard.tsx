import type { Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import type { XiangqiBoardState, XiangqiMove, XiangqiPiece } from '@board-games/shared/xiangqi';
import { XiangqiPieceType } from '@board-games/shared/xiangqi';

const ROWS = 10;
const COLS = 9;
const GRID_W = COLS - 1;
const GRID_H = ROWS - 1;

const PIECE_CHARS: Record<XiangqiPieceType, [string, string]> = {
  [XiangqiPieceType.KING]: ['帥', '將'],
  [XiangqiPieceType.ADVISOR]: ['仕', '士'],
  [XiangqiPieceType.ELEPHANT]: ['相', '象'],
  [XiangqiPieceType.HORSE]: ['傌', '馬'],
  [XiangqiPieceType.ROOK]: ['俥', '車'],
  [XiangqiPieceType.CANNON]: ['炮', '砲'],
  [XiangqiPieceType.PAWN]: ['兵', '卒'],
};

const BOARD_COLOR = '#F0D9A0';
const LINE_COLOR = '#5C3A1E';
const PIECE_R = 0.44;

export function XiangqiBoard({
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
  board: XiangqiBoardState;
  selectedPieceId: string | null;
  validMoves: XiangqiMove[];
  onCellClick: (pos: Position) => void;
  humanColor: PieceColor;
  isInCheck: boolean;
  lastMove: { from: Position; to: Position } | null;
  threatenedPieceIds?: Set<string>;
  isProcessing?: boolean;
}) {
  const flip = humanColor === PieceColor.LIGHT;

  const pieceMap = new Map<string, XiangqiPiece>();
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
          p.type === XiangqiPieceType.KING &&
          p.color === humanColor,
      )?.position
    : undefined;

  const canInteract = true;

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
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      cells.push({ row: r, col: c });
    }
  }

  const MX = `${(0.5 / COLS) * 100}%`;
  const MY = `${(0.5 / ROWS) * 100}%`;
  const CELL_W = `${100 / GRID_W}%`;
  const CELL_H = `${100 / GRID_H}%`;

  const SVG_VIEWBOX_W = GRID_W + 2 * 0.5;
  const SVG_VIEWBOX_H = GRID_H + 2 * 0.5;
  const SVG_PAD = 0.5;

  return (
    <div
      className="rounded-xl shadow-md overflow-hidden"
      style={{
        width: '100%',
        maxHeight: '100%',
        aspectRatio: `${COLS} / ${ROWS}`,
        flexShrink: 0,
        position: 'relative',
        background: BOARD_COLOR,
        opacity: isProcessing ? 0.6 : 1,
        transition: 'opacity 150ms ease',
      }}
    >
      <div style={{ position: 'absolute', left: MX, top: MY, right: MX, bottom: MY }}>

        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}
          viewBox={`${-SVG_PAD} ${-SVG_PAD} ${SVG_VIEWBOX_W} ${SVG_VIEWBOX_H}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="xiangqi-piece-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx={0} dy={0.03} stdDeviation={0.04} floodColor="rgba(0,0,0,0.25)" />
            </filter>
            <linearGradient id="xiangqi-piece-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f0dbb8" />
              <stop offset="30%" stopColor="#e8d0a8" />
              <stop offset="70%" stopColor="#d4b896" />
              <stop offset="100%" stopColor="#c0a070" />
            </linearGradient>
          </defs>

          <g transform={`translate(${SVG_PAD}, ${SVG_PAD})`}>
            {Array.from({ length: ROWS }, (_, r) => {
              const y = flip ? GRID_H - r : r;
              return <line key={`h-${r}`} x1={0} y1={y} x2={GRID_W} y2={y} stroke={LINE_COLOR} strokeWidth={0.03} />;
            })}

            {Array.from({ length: COLS }, (_, c) => {
              const x = flip ? GRID_W - c : c;
              if (c === 0 || c === COLS - 1) {
                return <line key={`v-${c}`} x1={x} y1={0} x2={x} y2={GRID_H} stroke={LINE_COLOR} strokeWidth={0.03} />;
              }
              return (
                <g key={`v-${c}`}>
                  <line x1={x} y1={0} x2={x} y2={flip ? GRID_H - 5 : 4} stroke={LINE_COLOR} strokeWidth={0.03} />
                  <line x1={x} y1={flip ? GRID_H - 4 : 5} x2={x} y2={GRID_H} stroke={LINE_COLOR} strokeWidth={0.03} />
                </g>
              );
            })}

            {[
              { r1: 0, c1: 3, r2: 2, c2: 5 },
              { r1: 0, c1: 5, r2: 2, c2: 3 },
              { r1: 7, c1: 3, r2: 9, c2: 5 },
              { r1: 7, c1: 5, r2: 9, c2: 3 },
            ].map(({ r1, c1, r2, c2 }, i) => {
              const ax = flip ? GRID_W - c1 : c1;
              const ay = flip ? GRID_H - r1 : r1;
              const bx = flip ? GRID_W - c2 : c2;
              const by = flip ? GRID_H - r2 : r2;
              return <line key={`palace-${i}`} x1={ax} y1={ay} x2={bx} y2={by} stroke={LINE_COLOR} strokeWidth={0.03} />;
            })}

            {(() => {
              const markPositions = [
                [2, 1], [2, 7], [7, 1], [7, 7],
                [3, 0], [3, 2], [3, 4], [3, 6], [3, 8],
                [6, 0], [6, 2], [6, 4], [6, 6], [6, 8],
              ];
              const d = 0.1;
              const g = 0.06;
              return markPositions.map(([r, c], i) => {
                const cx = flip ? GRID_W - c : c;
                const cy = flip ? GRID_H - r : r;
                const arms: string[] = [];
                const onLeft = c === 0;
                const onRight = c === COLS - 1;
                if (!onLeft) {
                  arms.push(`M${cx - g},${cy - g - d} L${cx - g},${cy - g} L${cx - g - d},${cy - g}`);
                  arms.push(`M${cx - g},${cy + g + d} L${cx - g},${cy + g} L${cx - g - d},${cy + g}`);
                }
                if (!onRight) {
                  arms.push(`M${cx + g},${cy - g - d} L${cx + g},${cy - g} L${cx + g + d},${cy - g}`);
                  arms.push(`M${cx + g},${cy + g + d} L${cx + g},${cy + g} L${cx + g + d},${cy + g}`);
                }
                return <path key={`mark-${i}`} d={arms.join(' ')} fill="none" stroke={LINE_COLOR} strokeWidth={0.02} />;
              });
            })()}

            {(() => {
              const riverY = flip ? GRID_H - 4.5 : 4.5;
              return (
                <text x={flip ? GRID_W - 2 : 2} y={riverY} textAnchor="middle" dominantBaseline="central" fontSize="0.65" fill={LINE_COLOR} opacity={0.4} fontFamily="'Noto Serif SC', 'SimSun', serif">
                  楚 河
                </text>
              );
            })()}
            {(() => {
              const riverY = flip ? GRID_H - 4.5 : 4.5;
              return (
                <text x={flip ? GRID_W - 6 : 6} y={riverY} textAnchor="middle" dominantBaseline="central" fontSize="0.65" fill={LINE_COLOR} opacity={0.4} fontFamily="'Noto Serif SC', 'SimSun', serif">
                  漢 界
                </text>
              );
            })()}

            {board.pieces.map((piece) => {
              const { dr, dc } = svgPos(piece.position.row, piece.position.col);
              const isSelected = piece.id === selectedPieceId;
              const isDark = piece.color === PieceColor.DARK;
              const charIdx = isDark ? 1 : 0;
              const isThreatened = threatenedPieceIds?.has(piece.id) ?? false;
              const isCheckSquare = kingInCheckPos && kingInCheckPos.row === piece.position.row && kingInCheckPos.col === piece.position.col;
              const isLastMoveSquare =
                lastMove &&
                ((lastMove.from.row === piece.position.row && lastMove.from.col === piece.position.col) ||
                  (lastMove.to.row === piece.position.row && lastMove.to.col === piece.position.col));

              return (
                <g key={piece.id}>
                  {isCheckSquare && (
                    <circle cx={dc} cy={dr} r={PIECE_R * 1.15} fill="rgba(220, 38, 38, 0.25)" />
                  )}
                  {isLastMoveSquare && !isSelected && (
                    <circle cx={dc} cy={dr} r={PIECE_R * 1.05} fill="rgba(216, 138, 80, 0.15)" />
                  )}
                  <circle
                    cx={dc}
                    cy={dr}
                    r={PIECE_R}
                    fill="url(#xiangqi-piece-grad)"
                    stroke={isSelected ? '#d97706' : '#8B6914'}
                    strokeWidth={isSelected ? 0.04 : 0.02}
                    filter="url(#xiangqi-piece-shadow)"
                  />
                  <circle
                    cx={dc}
                    cy={dr}
                    r={PIECE_R * 0.72}
                    fill="none"
                    stroke={isDark ? '#b91c1c' : '#1c1917'}
                    strokeWidth={0.012}
                    opacity={0.5}
                  />
                  <text
                    x={dc}
                    y={dr}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="0.52"
                    fill={isDark ? '#b91c1c' : '#1c1917'}
                    fontFamily="'Noto Serif SC', 'SimSun', serif"
                  >
                    {PIECE_CHARS[piece.type][charIdx]}
                  </text>
                  {isThreatened && (
                    <g opacity={0.8}>
                      <line x1={dc - 0.08} y1={dr - 0.22} x2={dc - 0.08} y2={dr - 0.08} stroke="#ef4444" strokeWidth={0.025} />
                      <line x1={dc - 0.15} y1={dr - 0.15} x2={dc - 0.08} y2={dr - 0.08} stroke="#ef4444" strokeWidth={0.025} />
                      <line x1={dc + 0.08} y1={dr - 0.22} x2={dc + 0.08} y2={dr - 0.08} stroke="#ef4444" strokeWidth={0.025} />
                      <line x1={dc + 0.15} y1={dr - 0.15} x2={dc + 0.08} y2={dr - 0.08} stroke="#ef4444" strokeWidth={0.025} />
                      <line x1={dc - 0.08} y1={dr + 0.22} x2={dc - 0.08} y2={dr + 0.08} stroke="#ef4444" strokeWidth={0.025} />
                      <line x1={dc - 0.15} y1={dr + 0.15} x2={dc - 0.08} y2={dr + 0.08} stroke="#ef4444" strokeWidth={0.025} />
                      <line x1={dc + 0.08} y1={dr + 0.22} x2={dc + 0.08} y2={dr + 0.08} stroke="#ef4444" strokeWidth={0.025} />
                      <line x1={dc + 0.15} y1={dr + 0.15} x2={dc + 0.08} y2={dr + 0.08} stroke="#ef4444" strokeWidth={0.025} />
                      <circle cx={dc} cy={dr} r={0.05} fill="#ef4444" />
                    </g>
                  )}
                </g>
              );
            })}

            {validMoves.map((m) => {
              const { dr, dc } = svgPos(m.to.row, m.to.col);
              const isCapture = m.capturedPieceId !== null;
              const hasPiece = pieceMap.has(`${m.to.row},${m.to.col}`);
              if (isCapture && hasPiece) {
                return (
                  <circle
                    key={`target-${m.to.row}-${m.to.col}`}
                    cx={dc}
                    cy={dr}
                    r={PIECE_R * 0.95}
                    fill="none"
                    stroke="rgba(220, 38, 38, 0.5)"
                    strokeWidth={0.04}
                  />
                );
              }
              return (
                <circle
                  key={`target-${m.to.row}-${m.to.col}`}
                  cx={dc}
                  cy={dr}
                  r={0.1}
                  fill={isCapture ? 'rgba(220, 38, 38, 0.3)' : 'rgba(0, 128, 0, 0.3)'}
                />
              );
            })}
          </g>
        </svg>

        {cells.map(({ row, col }) => {
          const key = `${row},${col}`;
          const { left, top } = htmlPos(row, col);

          return (
            <div
              key={key}
              onClick={canInteract ? () => onCellClick({ row, col }) : undefined}
              style={{
                position: 'absolute',
                left,
                top,
                width: CELL_W,
                height: CELL_H,
                transform: 'translate(-50%, -50%)',
                cursor: canInteract ? 'pointer' : 'default',
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
