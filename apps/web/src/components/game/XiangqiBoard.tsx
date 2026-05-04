import type { Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import type { XiangqiBoardState, XiangqiMove, XiangqiPiece } from '@board-games/shared/xiangqi';
import { XiangqiPieceType } from '@board-games/shared/xiangqi';

const ROWS = 10;
const COLS = 9;
const GRID_W = COLS - 1;
const GRID_H = ROWS - 1;
const MX = `${(0.5 / COLS) * 100}%`;
const MY = `${(0.5 / ROWS) * 100}%`;

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

function posToPercent(row: number, col: number) {
  return {
    left: `${(col / GRID_W) * 100}%`,
    top: `${(row / GRID_H) * 100}%`,
  };
}

function CrosshairOverlay() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      <div style={{ position: 'relative', width: '60%', height: '60%' }}>
        <div style={{ position: 'absolute', left: '50%', top: 0, width: 2, height: '30%', background: '#ef4444', transform: 'translateX(-50%)', borderRadius: 1 }} />
        <div style={{ position: 'absolute', left: '50%', bottom: 0, width: 2, height: '30%', background: '#ef4444', transform: 'translateX(-50%)', borderRadius: 1 }} />
        <div style={{ position: 'absolute', top: '50%', left: 0, height: 2, width: '30%', background: '#ef4444', transform: 'translateY(-50%)', borderRadius: 1 }} />
        <div style={{ position: 'absolute', top: '50%', right: 0, height: 2, width: '30%', background: '#ef4444', transform: 'translateY(-50%)', borderRadius: 1 }} />
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: '10%', height: '10%', background: '#ef4444', transform: 'translate(-50%, -50%)', borderRadius: '50%' }} />
      </div>
    </div>
  );
}

export function XiangqiBoard({
  board,
  selectedPieceId,
  validMoves,
  onCellClick,
  humanColor,
  isInCheck,
  lastMove,
  threatenedPieceIds,
}: {
  board: XiangqiBoardState;
  selectedPieceId: string | null;
  validMoves: XiangqiMove[];
  onCellClick: (pos: Position) => void;
  humanColor: PieceColor;
  isInCheck: boolean;
  lastMove: { from: Position; to: Position } | null;
  threatenedPieceIds?: Set<string>;
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

  const cells: { row: number; col: number }[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      cells.push({ row: r, col: c });
    }
  }

  function displayPos(row: number, col: number) {
    const dr = flip ? ROWS - 1 - row : row;
    const dc = flip ? COLS - 1 - col : col;
    return posToPercent(dr, dc);
  }

  const CELL_SIZE = `${100 / GRID_W}%`;

  return (
    <div
      className="rounded-xl shadow-md"
      style={{
        width: '100%',
        maxHeight: '100%',
        aspectRatio: `${COLS} / ${ROWS}`,
        flexShrink: 0,
        position: 'relative',
        background: BOARD_COLOR,
      }}
    >
      {/* Grid area — single coordinate reference for SVG + HTML */}
      <div style={{ position: 'absolute', left: MX, top: MY, right: MX, bottom: MY }}>

        {/* SVG board lines */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}
          viewBox={`0 0 ${GRID_W} ${GRID_H}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Horizontal lines */}
          {Array.from({ length: ROWS }, (_, r) => {
            const y = flip ? GRID_H - r : r;
            return <line key={`h-${r}`} x1={0} y1={y} x2={GRID_W} y2={y} stroke={LINE_COLOR} strokeWidth={0.03} />;
          })}

          {/* Vertical lines (split at river for inner columns) */}
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

          {/* Palace diagonals */}
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

          {/* Cross marks at cannon/pawn positions */}
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
        </svg>

        {/* River text */}
        {(() => {
          const pos = posToPercent(flip ? GRID_H - 4.5 : 4.5, flip ? GRID_W - 4 : 4);
          const posL = posToPercent(flip ? GRID_H - 4.5 : 4.5, flip ? GRID_W - 2 : 2);
          const posR = posToPercent(flip ? GRID_H - 4.5 : 4.5, flip ? GRID_W - 6 : 6);
          const riverStyle: React.CSSProperties = {
            position: 'absolute',
            transform: 'translate(-50%, -50%)',
            fontSize: 'max(0.9rem, 1.6vw)',
            color: LINE_COLOR,
            opacity: 0.4,
            fontFamily: "'Noto Serif SC', 'SimSun', serif",
            userSelect: 'none',
            pointerEvents: 'none',
            zIndex: 2,
          };
          return (
            <>
              <span style={{ ...riverStyle, ...posL }}>楚 河</span>
              <span style={{ ...riverStyle, ...posR }}>漢 界</span>
            </>
          );
        })()}

        {/* Click targets + indicators */}
        {cells.map(({ row, col }) => {
          const key = `${row},${col}`;
          const piece = pieceMap.get(key);
          const isValidTarget = validTargetSet.has(key);
          const isCaptureTarget = captureTargetSet.has(key);
          const isLastMoveSquare =
            lastMove &&
            ((lastMove.from.row === row && lastMove.from.col === col) ||
              (lastMove.to.row === row && lastMove.to.col === col));
          const isCheckSquare =
            kingInCheckPos && kingInCheckPos.row === row && kingInCheckPos.col === col;

          const { left, top } = displayPos(row, col);

          return (
            <div
              key={key}
              onClick={() => onCellClick({ row, col })}
              style={{
                position: 'absolute',
                left,
                top,
                width: CELL_SIZE,
                height: CELL_SIZE,
                transform: 'translate(-50%, -50%)',
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              {isCheckSquare && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(220, 38, 38, 0.25)', pointerEvents: 'none' }} />
              )}
              {isLastMoveSquare && !piece && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(216, 138, 80, 0.15)', pointerEvents: 'none' }} />
              )}
              {isValidTarget && !piece && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div style={{ width: '22%', height: '22%', borderRadius: '50%', background: 'rgba(0, 128, 0, 0.3)' }} />
                </div>
              )}
              {isCaptureTarget && piece && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div style={{ width: '90%', height: '90%', borderRadius: '50%', border: '3px solid rgba(220, 38, 38, 0.5)' }} />
                </div>
              )}
              {isCaptureTarget && !piece && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div style={{ width: '22%', height: '22%', borderRadius: '50%', background: 'rgba(220, 38, 38, 0.3)' }} />
                </div>
              )}
            </div>
          );
        })}

        {/* Pieces */}
        {board.pieces.map((piece) => {
          const { left, top } = displayPos(piece.position.row, piece.position.col);
          const isSelected = piece.id === selectedPieceId;
          const isDark = piece.color === PieceColor.DARK;
          const charIdx = isDark ? 1 : 0;
          const isThreatened = threatenedPieceIds?.has(piece.id) ?? false;

          return (
            <div
              key={piece.id}
              onClick={() => onCellClick({ row: piece.position.row, col: piece.position.col })}
              style={{
                position: 'absolute',
                left,
                top,
                width: CELL_SIZE,
                height: CELL_SIZE,
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10,
              }}
            >
              <div
                style={{
                  width: '88%',
                  height: '88%',
                  borderRadius: '50%',
                  position: 'relative',
                  background: 'linear-gradient(to bottom, #f0dbb8 0%, #e8d0a8 30%, #d4b896 70%, #c0a070 100%)',
                  border: isSelected ? '2.5px solid #d97706' : '1.5px solid #8B6914',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: '12%',
                    borderRadius: '50%',
                    border: `0.8px solid ${isDark ? '#b91c1c' : '#1c1917'}`,
                    opacity: 0.5,
                    pointerEvents: 'none',
                  }}
                />
                <span
                  style={{
                    fontSize: '1.4em',
                    color: isDark ? '#b91c1c' : '#1c1917',
                    fontFamily: "'Noto Serif SC', 'SimSun', serif",
                    pointerEvents: 'none',
                    userSelect: 'none',
                    lineHeight: 1,
                    position: 'relative',
                    zIndex: 2,
                  }}
                >
                  {PIECE_CHARS[piece.type][charIdx]}
                </span>
              </div>
              {isThreatened && <CrosshairOverlay />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
