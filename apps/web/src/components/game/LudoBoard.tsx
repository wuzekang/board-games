import type { LudoBoardState, LudoPiece, LudoPlayerIndex, AnyLudoMove } from '@board-games/shared/ludo';
import {
  OUTER_TRACK_COORDS,
  HOME_STRETCH_COORDS,
  HANGAR_COORDS,
  HANGAR_ZONES,
  GOAL_COORDS,
  GRID_COLS,
  GRID_ROWS,
} from '@board-games/shared/ludo';
import { relativeToAbsolute, PLAYER_LAUNCH_ABSOLUTE } from '@board-games/shared/ludo';

const S = 32;
const PAD = 16;
const SVG_W = GRID_COLS * S + PAD * 2;
const SVG_H = GRID_ROWS * S + PAD * 2;
const PIECE_R = 12;

const PLAYER_HEX: Record<LudoPlayerIndex, string> = {
  0: '#DC2626',
  1: '#D97706',
  2: '#2563EB',
  3: '#16A34A',
};

const PLAYER_LIGHT: Record<LudoPlayerIndex, string> = {
  0: '#FEE2E2',
  1: '#FEF3C7',
  2: '#DBEAFE',
  3: '#DCFCE7',
};

const PLAYER_MED: Record<LudoPlayerIndex, string> = {
  0: '#FCA5A5',
  1: '#FCD34D',
  2: '#93C5FD',
  3: '#86EFAC',
};

function cellXY(row: number, col: number) {
  return { x: PAD + col * S + S / 2, y: PAD + row * S + S / 2 };
}

const launchAbsSet = new Set(Object.values(PLAYER_LAUNCH_ABSOLUTE));

function piecePosition(piece: LudoPiece, board: LudoBoardState): { x: number; y: number } {
  if (piece.trackIndex === -1) {
    const slots = HANGAR_COORDS[piece.playerIndex];
    const sameHangar = board.pieces.filter(
      (p) => p.playerIndex === piece.playerIndex && p.trackIndex === -1,
    );
    const slotIdx = sameHangar.indexOf(piece);
    const [row, col] = slots[Math.min(slotIdx, slots.length - 1)];
    return cellXY(row, col);
  }
  if (piece.trackIndex >= 52 && piece.trackIndex <= 57) {
    const [row, col] = HOME_STRETCH_COORDS[piece.playerIndex][piece.trackIndex - 52];
    return cellXY(row, col);
  }
  if (piece.trackIndex === 58) {
    return cellXY(...GOAL_COORDS[piece.playerIndex]);
  }
  const absIdx = relativeToAbsolute(piece.playerIndex, piece.trackIndex);
  const [row, col] = OUTER_TRACK_COORDS[absIdx];
  return cellXY(row, col);
}

function getStackOffset(idx: number): { dx: number; dy: number } {
  const offsets = [
    { dx: -6, dy: -6 },
    { dx: 6, dy: -6 },
    { dx: -6, dy: 6 },
    { dx: 6, dy: 6 },
  ];
  return offsets[idx % 4] ?? { dx: 0, dy: 0 };
}

export function LudoBoard({
  board,
  phase,
  onPieceClick,
}: {
  board: LudoBoardState;
  phase: { type: string; validMoves?: AnyLudoMove[] };
  onPieceClick: (pieceId: string) => void;
}) {
  const clickableIds = new Set<string>(
    phase.type === 'rolled' && phase.validMoves
      ? phase.validMoves.filter((m) => m.pieceId !== '').map((m) => m.pieceId)
      : [],
  );

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full max-h-[70vh] rounded-xl shadow-md"
      style={{ touchAction: 'manipulation' }}
    >
      <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="#FFF8EE" rx={12} />

      {(() => {
        const zones: React.ReactNode[] = [];
        for (let pi = 0; pi < 4; pi++) {
          const z = HANGAR_ZONES[pi as LudoPlayerIndex];
          const x = PAD + z.colStart * S;
          const y = PAD + z.rowStart * S;
          const w = (z.colEnd - z.colStart + 1) * S;
          const h = (z.rowEnd - z.rowStart + 1) * S;
          zones.push(
            <rect
              key={`hz-${pi}`}
              x={x}
              y={y}
              width={w}
              height={h}
              rx={10}
              fill={PLAYER_LIGHT[pi as LudoPlayerIndex]}
              stroke={PLAYER_HEX[pi as LudoPlayerIndex]}
              strokeWidth={2}
              strokeDasharray="8 4"
              opacity={0.5}
            />,
          );
          const cx = x + w / 2;
          const cy = y + h / 2;
          zones.push(
            <text
              key={`hz-label-${pi}`}
              x={cx}
              y={cy - 20}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={13}
              fill={PLAYER_HEX[pi as LudoPlayerIndex]}
              fontWeight="bold"
              opacity={0.6}
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {['红', '黄', '蓝', '绿'][pi]}营
            </text>,
          );
        }
        return zones;
      })()}

      {(() => {
        const slots: React.ReactNode[] = [];
        for (let pi = 0; pi < 4; pi++) {
          const coords = HANGAR_COORDS[pi as LudoPlayerIndex];
          coords.forEach(([r, c], si) => {
            const { x, y } = cellXY(r, c);
            slots.push(
              <circle
                key={`hs-${pi}-${si}`}
                cx={x}
                cy={y}
                r={PIECE_R}
                fill="none"
                stroke={PLAYER_MED[pi as LudoPlayerIndex]}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                opacity={0.4}
              />,
            );
          });
        }
        return slots;
      })()}

      {(() => {
        const rects: React.ReactNode[] = [];
        OUTER_TRACK_COORDS.forEach(([r, c], absIdx) => {
          const { x, y } = cellXY(r, c);
          const isLaunch = launchAbsSet.has(absIdx);
          let launchOwner: LudoPlayerIndex | null = null;
          if (isLaunch) {
            for (let pi = 0; pi < 4; pi++) {
              if (PLAYER_LAUNCH_ABSOLUTE[pi as LudoPlayerIndex] === absIdx) {
                launchOwner = pi as LudoPlayerIndex;
              }
            }
          }
          const isSafe = new Set([8, 21, 34, 47]).has(absIdx);

          let fill = '#FFFFFF';
          let stroke = '#E2D8CC';
          let sw = 1;
          let label = '';

          if (launchOwner !== null) {
            fill = PLAYER_MED[launchOwner];
            stroke = PLAYER_HEX[launchOwner];
            sw = 2;
            label = '⭐';
          } else if (isSafe) {
            fill = '#F1F5F9';
            stroke = '#94A3B8';
            label = '🛡';
          }

          rects.push(
            <rect
              key={`ot-${absIdx}`}
              x={x - S / 2 + 1}
              y={y - S / 2 + 1}
              width={S - 2}
              height={S - 2}
              rx={4}
              fill={fill}
              stroke={stroke}
              strokeWidth={sw}
            />,
          );
          if (label) {
            rects.push(
              <text
                key={`ot-l-${absIdx}`}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={10}
              >
                {label}
              </text>,
            );
          }
        });
        return rects;
      })()}

      {(() => {
        const points = OUTER_TRACK_COORDS.map(([r, c]) => {
          const { x, y } = cellXY(r, c);
          return `${x},${y}`;
        });
        const first = cellXY(...OUTER_TRACK_COORDS[0]);
        points.push(`${first.x},${first.y}`);
        return (
          <polyline
            points={points.join(' ')}
            fill="none"
            stroke="#C4B5A0"
            strokeWidth={1}
            strokeDasharray="4 3"
            strokeLinejoin="round"
            opacity={0.4}
          />
        );
      })()}

      {(() => {
        const rects: React.ReactNode[] = [];
        for (let pi = 0; pi < 4; pi++) {
          const coords = HOME_STRETCH_COORDS[pi as LudoPlayerIndex];
          coords.forEach(([r, c], hi) => {
            const { x, y } = cellXY(r, c);
            const isLast = hi === 5;
            rects.push(
              <rect
                key={`hs-${pi}-${hi}`}
                x={x - S / 2 + 1}
                y={y - S / 2 + 1}
                width={S - 2}
                height={S - 2}
                rx={6}
                fill={isLast ? PLAYER_MED[pi as LudoPlayerIndex] : PLAYER_LIGHT[pi as LudoPlayerIndex]}
                stroke={PLAYER_HEX[pi as LudoPlayerIndex]}
                strokeWidth={2}
                opacity={0.6}
              />,
            );
            if (isLast) {
              rects.push(
                <text
                  key={`hs-arrow-${pi}`}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={10}
                >
                  🏠
                </text>,
              );
            }
          });
        }
        return rects;
      })()}

      {(() => {
        const zone: React.ReactNode[] = [];
        const centerR = 7.5;
        const centerC = 4.5;
        const cx = PAD + centerC * S;
        const cy = PAD + centerR * S;

        zone.push(
          <rect
            key="goal-bg"
            x={cx - 3 * S}
            y={cy - 1.5 * S}
            width={6 * S}
            height={3 * S}
            rx={10}
            fill="#FFFBF5"
            stroke="#E2D8CC"
            strokeWidth={1}
          />,
        );

        zone.push(
          <text
            key="goal-star"
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={20}
          >
            ✈
          </text>,
        );

        for (let pi = 0; pi < 4; pi++) {
          const [r, c] = GOAL_COORDS[pi as LudoPlayerIndex];
          const { x, y } = cellXY(r, c);
          zone.push(
            <circle
              key={`goal-${pi}`}
              cx={x}
              cy={y}
              r={7}
              fill={PLAYER_LIGHT[pi as LudoPlayerIndex]}
              stroke={PLAYER_HEX[pi as LudoPlayerIndex]}
              strokeWidth={1}
            />,
          );
        }
        return zone;
      })()}

      {(() => {
        const posMap = new Map<string, LudoPiece[]>();
        for (const piece of board.pieces) {
          const pos = piecePosition(piece, board);
          const key = `${pos.x},${pos.y}`;
          if (!posMap.has(key)) posMap.set(key, []);
          posMap.get(key)!.push(piece);
        }

        const elements: React.ReactNode[] = [];
        for (const piece of board.pieces) {
          const pos = piecePosition(piece, board);
          const key = `${pos.x},${pos.y}`;
          const stack = posMap.get(key)!;
          const stackIdx = stack.indexOf(piece);
          const off = piece.trackIndex !== -1 && stack.length > 1 ? getStackOffset(stackIdx) : { dx: 0, dy: 0 };
          const px = pos.x + off.dx;
          const py = pos.y + off.dy;
          const clickable = clickableIds.has(piece.id);

          elements.push(
            <g
              key={piece.id}
              onClick={() => clickable && onPieceClick(piece.id)}
              style={{ cursor: clickable ? 'pointer' : 'default' }}
            >
              {clickable && (
                <circle
                  cx={px}
                  cy={py}
                  r={PIECE_R + 5}
                  fill="none"
                  stroke="#FFD700"
                  strokeWidth={2}
                  opacity={0.4}
                  className="animate-ping"
                  style={{ transformOrigin: `${px}px ${py}px` }}
                />
              )}
              <ellipse cx={px + 1} cy={py + 3} rx={PIECE_R * 0.9} ry={PIECE_R * 0.5} fill="rgba(0,0,0,0.2)" />
              <path
                d={`M${px - PIECE_R * 0.75},${py + PIECE_R * 0.15} Q${px},${py - PIECE_R * 1.1} ${px + PIECE_R * 0.75},${py + PIECE_R * 0.15} A${PIECE_R * 0.75},${PIECE_R * 0.35} 0 0,1 ${px - PIECE_R * 0.75},${py + PIECE_R * 0.15} Z`}
                fill={PLAYER_MED[piece.playerIndex]}
                stroke={PLAYER_HEX[piece.playerIndex]}
                strokeWidth={0.8}
              />
              <ellipse
                cx={px}
                cy={py + PIECE_R * 0.15}
                rx={PIECE_R * 0.75}
                ry={PIECE_R * 0.35}
                fill={PLAYER_HEX[piece.playerIndex]}
                stroke={clickable ? '#FFD700' : PLAYER_HEX[piece.playerIndex]}
                strokeWidth={clickable ? 2.5 : 0.8}
              />
              <ellipse
                cx={px - PIECE_R * 0.15}
                cy={py - PIECE_R * 0.15}
                rx={PIECE_R * 0.25}
                ry={PIECE_R * 0.12}
                fill="rgba(255,255,255,0.4)"
              />
              <text
                x={px}
                y={py + PIECE_R * 0.18}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={9}
                fill="white"
                fontWeight="bold"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                ✈
              </text>
            </g>,
          );
        }
        return elements;
      })()}
    </svg>
  );
}
