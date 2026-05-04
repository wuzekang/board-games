import { useEffect, useRef, useMemo } from 'react';
import type { BoardState, Position, Move } from '@board-games/shared';
import { isDarkSquare, PieceColor, PieceType, MoveType } from '@board-games/shared';
import type { DraughtsAnimationState } from '../../types/draughtsAnimation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface PieceElementProps {
  piece: { id: string; type: PieceType; color: PieceColor; position: Position };
  moveInfo?: { from: Position; to: Position };
  isFading: boolean;
  isPromoting: boolean;
  isSelected: boolean;
  isMovable: boolean;
  isThreatened: boolean;
  showForcedTooltip: boolean;
  flipBoard: boolean;
  boardSize: number;
  onPieceClick: (pos: Position) => void;
}

function getDisplayPos(row: number, col: number, flipBoard: boolean, size: number) {
  const displayRow = flipBoard ? row : size - 1 - row;
  const displayCol = flipBoard ? size - 1 - col : col;
  return { displayRow, displayCol };
}

function PieceElement({
  piece,
  moveInfo,
  isFading,
  isPromoting,
  isSelected,
  isMovable,
  isThreatened,
  showForcedTooltip,
  flipBoard,
  boardSize,
  onPieceClick,
  isProcessing,
}: PieceElementProps & { isProcessing?: boolean }) {
  const prevMoveKey = useRef<string | null>(null);
  const outerRef = useRef<HTMLDivElement>(null);

  const { displayRow, displayCol } = getDisplayPos(piece.position.row, piece.position.col, flipBoard, boardSize);
  const leftPct = (displayCol / boardSize) * 100;
  const topPct = (displayRow / boardSize) * 100;

  const currentKey = moveInfo
    ? `${moveInfo.from.row},${moveInfo.from.col}-${moveInfo.to.row},${moveInfo.to.col}`
    : null;

  useEffect(() => {
    if (currentKey && currentKey !== prevMoveKey.current) {
      prevMoveKey.current = currentKey;

      const el = outerRef.current;
      if (!el) return;

      const { displayRow: fromRow, displayCol: fromCol } = getDisplayPos(
        moveInfo!.from.row,
        moveInfo!.from.col,
        flipBoard,
        boardSize,
      );
      const fromLeftPct = (fromCol / boardSize) * 100;
      const fromTopPct = (fromRow / boardSize) * 100;
      const dxPct = fromLeftPct - leftPct;
      const dyPct = fromTopPct - topPct;

      el.style.transition = 'none';
      el.style.transform = `translate(${dxPct}%, ${dyPct}%)`;

      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.transition = 'transform 250ms ease-in-out';
          el.style.transform = 'translate(0%, 0%)';
        });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [currentKey, leftPct, topPct, flipBoard, boardSize, moveInfo]);

  const isDark = piece.color === PieceColor.DARK;
  const isKing = piece.type === PieceType.KING;

  const outerStyle: React.CSSProperties = {
    left: `${leftPct}%`,
    top: `${topPct}%`,
    width: `${100 / boardSize}%`,
    height: `${100 / boardSize}%`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: isProcessing || !isMovable ? 'default' : 'pointer',
  };

  const movableRing = isMovable && !isSelected && (
    <div
      className="pointer-events-none absolute"
      style={{
        border: '2px dashed #f59e0b',
        opacity: 0.8,
        borderRadius: '50%',
        width: '84%',
        aspectRatio: '1',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        animation: 'draughts-movable-pulse 1.5s ease-in-out infinite',
      }}
    />
  );

  const pieceBody = (
    <div
      className={['draughts-piece-inner', isPromoting ? 'piece-promoting' : ''].filter(Boolean).join(' ')}
      style={{
        width: '76%',
        aspectRatio: '1',
        borderRadius: '50%',
        position: 'relative',
        containerType: 'inline-size',
        background: isDark
          ? 'radial-gradient(circle at 50% 45%, #2c2520 0%, #1a1612 80%, #12100d 100%)'
          : 'radial-gradient(circle at 50% 45%, #f5f0e8 0%, #e8dcc8 70%, #d4c4a8 100%)',
        border: `1px solid ${isDark ? '#3d3530' : '#b8a888'}`,
        boxShadow: isSelected
          ? '4px 5px 0 rgba(0,0,0,0.3), 0 0 0 2.5px #d97706'
          : '3px 4px 0 rgba(0,0,0,0.25)',
      }}
    >
      {isKing && (
        <>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: `1.2px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
              margin: '6.5%',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.06)',
              margin: '8%',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '50cqw',
              color: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)',
              filter: `drop-shadow(0 -0.5px 0 ${isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)'})`,
              userSelect: 'none',
            }}
          >
            ♛
          </div>
        </>
      )}
    </div>
  );

  const crosshair = isThreatened && (
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
        <div style={{ position: 'absolute', left: '50%', top: 0, width: '2px', height: '30%', background: '#ef4444', transform: 'translateX(-50%)', borderRadius: '1px' }} />
        <div style={{ position: 'absolute', left: '50%', bottom: 0, width: '2px', height: '30%', background: '#ef4444', transform: 'translateX(-50%)', borderRadius: '1px' }} />
        <div style={{ position: 'absolute', top: '50%', left: 0, height: '2px', width: '30%', background: '#ef4444', transform: 'translateY(-50%)', borderRadius: '1px' }} />
        <div style={{ position: 'absolute', top: '50%', right: 0, height: '2px', width: '30%', background: '#ef4444', transform: 'translateY(-50%)', borderRadius: '1px' }} />
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: '10%', height: '10%', background: '#ef4444', transform: 'translate(-50%, -50%)', borderRadius: '50%' }} />
      </div>
    </div>
  );

  const pieceDiv = (
    <div
      ref={outerRef}
      className={['absolute z-10', isFading ? 'draughts-piece-fading' : ''].filter(Boolean).join(' ')}
      style={outerStyle}
      onClick={() => onPieceClick(piece.position)}
    >
      {movableRing}
      {pieceBody}
      {crosshair}
    </div>
  );

  if (isMovable && !isSelected && showForcedTooltip) {
    return (
      <Tooltip open>
        <TooltipTrigger
          render={
            <div
              ref={outerRef}
              className={['absolute z-10', isFading ? 'draughts-piece-fading' : ''].filter(Boolean).join(' ')}
              style={outerStyle}
              onClick={() => onPieceClick(piece.position)}
            />
          }
        >
          {movableRing}
          {pieceBody}
          {crosshair}
        </TooltipTrigger>
        <TooltipContent side="top">必须吃子！请选择这颗棋子</TooltipContent>
      </Tooltip>
    );
  }

  return pieceDiv;
}

export function Board({
  board,
  selectedPieceId,
  validTargets,
  onCellClick,
  humanColor,
  animState,
  movablePieceIds,
  hasForcedCapture,
  threatenedPieceIds,
  validMoves,
  isProcessing,
}: {
  board: BoardState;
  selectedPieceId: string | null;
  validTargets: Position[];
  onCellClick: (pos: Position) => void;
  humanColor: PieceColor;
  animState: DraughtsAnimationState | null;
  movablePieceIds: Set<string> | null;
  hasForcedCapture?: boolean;
  threatenedPieceIds?: Set<string>;
  validMoves?: Move[];
  isProcessing?: boolean;
}) {
  const size = board.size;
  const displayBoard = animState?.boardSnapshot ?? board;
  const flipBoard = humanColor === PieceColor.LIGHT;

  const validTargetSet = new Set(validTargets.map((p) => `${p.row},${p.col}`));

  const selectedPiece = selectedPieceId
    ? displayBoard.pieces.find((p) => p.id === selectedPieceId)
    : null;
  const selectedPos = selectedPiece
    ? `${selectedPiece.position.row},${selectedPiece.position.col}`
    : null;

  const cells: { row: number; col: number; isDark: boolean }[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      cells.push({ row, col, isDark: isDarkSquare(row, col) });
    }
  }

  return (
    <TooltipProvider>
      <div
        className="rounded-xl shadow-md overflow-hidden"
        style={{ width: '100%', maxHeight: '100%', aspectRatio: '1 / 1', flexShrink: 0, position: 'relative', opacity: isProcessing ? 0.6 : 1, transition: 'opacity 150ms ease' }}
      >
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          {cells.map(({ row, col, isDark }) => {
            const key = `${row},${col}`;
            const isValidTarget = validTargetSet.has(key);
            const isHighlighted = key === selectedPos;
            const hasMovablePiece =
              movablePieceIds != null &&
              displayBoard.pieces.some(
                (p) =>
                  p.position.row === row &&
                  p.position.col === col &&
                  p.color === humanColor &&
                  movablePieceIds.has(p.id),
              );

            const { displayRow, displayCol } = getDisplayPos(row, col, flipBoard, size);

            let bgColor: string;
            if (isHighlighted) {
              bgColor = isDark ? '#92400e' : '#fde68a';
            } else {
              bgColor = isDark ? '#78350f' : '#fef3c7';
            }

            return (
              <div
                key={key}
                onClick={() => onCellClick({ row, col })}
                className={hasMovablePiece ? 'draughts-movable-cell' : ''}
                style={{
                  position: 'absolute',
                  left: `${(displayCol / size) * 100}%`,
                  top: `${(displayRow / size) * 100}%`,
                  width: `${100 / size}%`,
                  height: `${100 / size}%`,
                  background: bgColor,
                  border: `0.5px solid ${isDark ? '#5c2d0a' : '#d9a84e'}`,
                  cursor: isProcessing ? 'default' : (hasMovablePiece ? 'pointer' : 'default'),
                  boxSizing: 'border-box',
                }}
              >
                {isValidTarget && (() => {
                  const hasEnemy = displayBoard.pieces.some(
                    (p) =>
                      p.position.row === row &&
                      p.position.col === col &&
                      selectedPiece &&
                      p.color !== selectedPiece.color,
                  );
                  return hasEnemy ? (
                    <>
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          pointerEvents: 'none',
                        }}
                      >
                        <div
                          style={{
                            width: '80%',
                            height: '80%',
                            borderRadius: '50%',
                            border: '2.5px solid #d97706',
                            opacity: 0.8,
                          }}
                        />
                      </div>
                      <div
                        style={{
                          position: 'absolute',
                          top: '12%',
                          right: '12%',
                          width: '12%',
                          height: '12%',
                          borderRadius: '50%',
                          background: '#d97706',
                          opacity: 0.8,
                          pointerEvents: 'none',
                        }}
                      />
                    </>
                  ) : (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                      }}
                    >
                      <div
                        style={{
                          width: '30%',
                          height: '30%',
                          borderRadius: '50%',
                          border: '2.5px solid #d97706',
                          opacity: 0.65,
                        }}
                      />
                    </div>
                  );
                })()}
              </div>
            );
          })}

          {displayBoard.pieces
            .filter((p) => !animState?.removedPieceIds.has(p.id))
            .map((piece) => (
              <PieceElement
                key={piece.id}
                piece={piece}
                moveInfo={animState?.movingPieces.get(piece.id)}
                isFading={animState?.fadingPieceIds.has(piece.id) ?? false}
                isPromoting={animState?.promotingPieceIds.has(piece.id) ?? false}
                isSelected={piece.id === selectedPieceId}
                isMovable={
                  movablePieceIds != null
                    ? movablePieceIds.has(piece.id) && piece.color === humanColor
                    : piece.color === humanColor
                }
                isThreatened={threatenedPieceIds?.has(piece.id) ?? false}
                showForcedTooltip={hasForcedCapture === true}
                flipBoard={flipBoard}
                boardSize={size}
                onPieceClick={onCellClick}
                isProcessing={isProcessing}
              />
            ))}

          {validMoves && validMoves.some((m) => m.type === MoveType.CHAIN_CAPTURE) && (
            <svg
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 4 }}
              viewBox={`0 0 ${size} ${size}`}
            >
              <defs>
                <marker id="chain-arrow" markerWidth="3" markerHeight="3" refX="2.5" refY="1.5" orient="auto">
                  <path d="M0,0 L3,1.5 L0,3" fill="#d97706" />
                </marker>
              </defs>
              {validMoves
                .filter((m) => m.type === MoveType.CHAIN_CAPTURE)
                .map((m, i) => {
                  const path = m.path.map((p) => {
                    const { displayRow, displayCol } = getDisplayPos(p.row, p.col, flipBoard, size);
                    return { x: displayCol + 0.5, y: displayRow + 0.5 };
                  });
                  const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];
                  for (let j = 0; j < path.length - 1; j++) {
                    segments.push({ x1: path[j].x, y1: path[j].y, x2: path[j + 1].x, y2: path[j + 1].y });
                  }
                  const capturedPositions = m.capturedPieceIds.map((cid) => {
                    const cp = displayBoard.pieces.find((p) => p.id === cid);
                    if (!cp) return null;
                    const { displayRow, displayCol } = getDisplayPos(cp.position.row, cp.position.col, flipBoard, size);
                    return { x: displayCol + 0.5, y: displayRow + 0.5 };
                  }).filter(Boolean) as { x: number; y: number }[];

                  return (
                    <g key={i} opacity={0.7}>
                      {segments.map((s, j) => (
                        <line
                          key={j}
                          x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
                          stroke="#d97706"
                          strokeWidth={0.08}
                          markerEnd="url(#chain-arrow)"
                        />
                      ))}
                      {capturedPositions.map((cp, j) => (
                        <circle
                          key={j}
                          cx={cp.x} cy={cp.y} r={0.18}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth={0.06}
                          strokeDasharray="0.12 0.08"
                        />
                      ))}
                    </g>
                  );
                })}
            </svg>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
