import { useState, useEffect, useRef } from 'react';
import type { BoardState, Position } from '@board-games/shared';
import { isDarkSquare, PieceColor, PieceType } from '@board-games/shared';
import type { DraughtsAnimationState } from '../../types/draughtsAnimation';

const CELL_SIZE = 56;

function toPixel(pos: Position, size: number): { x: number; y: number } {
  return {
    x: pos.col * CELL_SIZE + CELL_SIZE / 2,
    y: (size - 1 - pos.row) * CELL_SIZE + CELL_SIZE / 2,
  };
}

interface PieceElementProps {
  piece: { id: string; type: PieceType; color: PieceColor; position: Position };
  toPixelFn: (pos: Position) => { x: number; y: number };
  moveInfo?: { from: Position; to: Position };
  isFading: boolean;
  isPromoting: boolean;
  isSelected: boolean;
  isMovable: boolean;
  humanColor: PieceColor;
}

function PieceElement({ piece, toPixelFn, moveInfo, isFading, isPromoting, isSelected, isMovable, humanColor }: PieceElementProps) {
  const [offsetApplied, setOffsetApplied] = useState(false);
  const prevMoveKey = useRef<string | null>(null);

  const currentKey = moveInfo ? `${moveInfo.from.row},${moveInfo.from.col}-${moveInfo.to.row},${moveInfo.to.col}` : null;

  useEffect(() => {
    if (currentKey && currentKey !== prevMoveKey.current) {
      prevMoveKey.current = currentKey;
      setOffsetApplied(false);
      const rafId = requestAnimationFrame(() => {
        requestAnimationFrame(() => setOffsetApplied(true));
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [currentKey]);

  const targetPixel = toPixelFn(piece.position);
  let offsetX = 0;
  let offsetY = 0;

  if (moveInfo && !offsetApplied) {
    const fromPixel = toPixelFn(moveInfo.from);
    offsetX = fromPixel.x - targetPixel.x;
    offsetY = fromPixel.y - targetPixel.y;
  }

  const transformStr = `translate(${targetPixel.x}px, ${targetPixel.y}px) translate(${offsetX}px, ${offsetY}px)`;
  let transitionStr = 'none';
  if (moveInfo && offsetApplied) {
    transitionStr = 'transform 250ms ease-in-out';
  }
  if (isFading) {
    transitionStr = 'opacity 0.2s ease-out, transform 0.2s ease-out';
  }

  const className = isPromoting ? 'piece-promoting' : isFading ? 'piece-fading' : '';

  const r = CELL_SIZE * 0.38;
  const isDark = piece.color === PieceColor.DARK;
  const isKing = piece.type === PieceType.KING;
  const gradId = `dg-${piece.id}`;
  const shadowOx = isSelected ? 2 : 1.5;
  const shadowOy = isSelected ? 4 : 3;
  const shadowOpacity = isSelected ? 0.3 : 0.25;

  return (
    <g
      style={{
        transform: transformStr,
        transition: transitionStr,
        transformOrigin: `${targetPixel.x}px ${targetPixel.y}px`,
        pointerEvents: 'none',
      }}
      className={className}
    >
      <defs>
        <radialGradient id={`${gradId}-top`} cx="50%" cy="45%" r="55%">
          {isDark ? (
            <>
              <stop offset="0%" stopColor="#2c2520" />
              <stop offset="80%" stopColor="#1a1612" />
              <stop offset="100%" stopColor="#12100d" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#f5f0e8" />
              <stop offset="70%" stopColor="#e8dcc8" />
              <stop offset="100%" stopColor="#d4c4a8" />
            </>
          )}
        </radialGradient>
      </defs>
      <circle cx={shadowOx} cy={shadowOy} r={r} fill={`rgba(0,0,0,${shadowOpacity})`} />
      {isKing && (
        <circle cx={0.5} cy={1.5} r={r} fill={isDark ? '#12100d' : '#d4c4a8'} stroke={isDark ? '#3d3530' : '#b8a888'} strokeWidth={0.8} />
      )}
      <circle cx={0} cy={isKing ? 0.5 : 0} r={isKing ? r - 1 : r} fill={`url(#${gradId}-top)`} stroke={isDark ? '#3d3530' : '#b8a888'} strokeWidth={1} />
      <circle cx={0} cy={isKing ? 0.5 : 0} r={isKing ? r - 3 : r - 2} fill="none" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeWidth={0.6} />
      {isKing && (
        <text
          x={0}
          y={0.5}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={CELL_SIZE * 0.3}
          fill={isDark ? '#7a6e62' : '#5c4a2a'}
          style={{ filter: 'drop-shadow(0 1px 0 rgba(0,0,0,0.2))' }}
        >
          ♛
        </text>
      )}
    </g>
  );
}

export function Board({
  board,
  selectedPieceId,
  validTargets,
  onCellClick,
  humanColor,
  animState,
  movablePieceIds,
}: {
  board: BoardState;
  selectedPieceId: string | null;
  validTargets: Position[];
  onCellClick: (pos: Position) => void;
  humanColor: PieceColor;
  animState: DraughtsAnimationState | null;
  movablePieceIds: Set<string> | null;
}) {
  const size = board.size;
  const svgSize = size * CELL_SIZE;
  const displayBoard = animState?.boardSnapshot ?? board;
  const flipBoard = humanColor === PieceColor.LIGHT;

  const validTargetSet = new Set(validTargets.map((p) => `${p.row},${p.col}`));

  const getDisplayPos = (row: number, col: number) => {
    const displayRow = flipBoard ? row : size - 1 - row;
    const displayCol = flipBoard ? size - 1 - col : col;
    return { displayRow, displayCol };
  };

  function toPixel(pos: Position): { x: number; y: number } {
    const { displayRow, displayCol } = getDisplayPos(pos.row, pos.col);
    return {
      x: displayCol * CELL_SIZE + CELL_SIZE / 2,
      y: displayRow * CELL_SIZE + CELL_SIZE / 2,
    };
  }

  const selectedPiece = selectedPieceId ? displayBoard.pieces.find(p => p.id === selectedPieceId) : null;
  const selectedPos = selectedPiece ? `${selectedPiece.position.row},${selectedPiece.position.col}` : null;

  const cells: { row: number; col: number; isDark: boolean }[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      cells.push({ row, col, isDark: isDarkSquare(row, col) });
    }
  }

  return (
    <svg
      viewBox={`0 0 ${svgSize} ${svgSize}`}
      className="max-w-full h-auto rounded-xl shadow-md"
    >
      <defs>
        <filter id="draughts-board-shadow" x="-2%" y="-2%" width="104%" height="104%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#78350f" floodOpacity="0.15" />
        </filter>
      </defs>
      {cells.map(({ row, col, isDark }) => {
        const key = `${row},${col}`;
        const isValidTarget = validTargetSet.has(key);
        const isHighlighted = key === selectedPos;
        const hasMovablePiece = movablePieceIds && displayBoard.pieces.some(
          p => p.position.row === row && p.position.col === col && p.color === humanColor && movablePieceIds.has(p.id)
        );
          const { displayRow, displayCol } = getDisplayPos(row, col);

          return (
            <g key={key} onClick={() => onCellClick({ row, col })}>
              <rect
                x={displayCol * CELL_SIZE}
                y={displayRow * CELL_SIZE}
              width={CELL_SIZE}
              height={CELL_SIZE}
              fill={isHighlighted
                ? (isDark ? '#92400e' : '#fde68a')
                : (isDark ? '#78350f' : '#fef3c7')}
              stroke={isDark ? '#5c2d0a' : '#d9a84e'}
              strokeWidth={0.5}
              className={hasMovablePiece ? 'draughts-movable-cell' : ''}
              style={{ cursor: hasMovablePiece ? 'pointer' : 'default' }}
            />
            {isValidTarget && (() => {
              const selPiece = displayBoard.pieces.find(sp => sp.id === selectedPieceId);
              const hasEnemy = displayBoard.pieces.some(p =>
                p.position.row === row && p.position.col === col && selPiece && p.color !== selPiece.color
              );
              const cx = displayCol * CELL_SIZE + CELL_SIZE / 2;
              const cy = displayRow * CELL_SIZE + CELL_SIZE / 2;
              const pr = CELL_SIZE * 0.38;
              return hasEnemy ? (
                <>
                  <circle cx={cx} cy={cy} r={pr * 1.05} fill="none" stroke="#d97706" strokeWidth={2.5} opacity={0.8} />
                  <circle cx={cx + pr * 0.65} cy={cy - pr * 0.65} r={3.5} fill="#d97706" opacity={0.8} />
                </>
              ) : (
                <circle cx={cx} cy={cy} r={CELL_SIZE * 0.15} fill="none" stroke="#d97706" strokeWidth={2.5} opacity={0.65} />
              );
            })()}
          </g>
        );
      })}

      {displayBoard.pieces
        .filter((p: { id: string }) => !animState?.removedPieceIds.has(p.id))
        .map((piece: { id: string; type: PieceType; color: PieceColor; position: Position }) => (
          <PieceElement
            key={piece.id}
            piece={piece}
            toPixelFn={toPixel}
            moveInfo={animState?.movingPieces.get(piece.id)}
            isFading={animState?.fadingPieceIds.has(piece.id) ?? false}
            isPromoting={animState?.promotingPieceIds.has(piece.id) ?? false}
            isSelected={piece.id === selectedPieceId}
            isMovable={movablePieceIds ? movablePieceIds.has(piece.id) : true}
            humanColor={humanColor}
          />
        ))}
    </svg>
  );
}
