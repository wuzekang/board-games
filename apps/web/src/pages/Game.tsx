import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { orpc } from '../orpc-client';
import { addToast } from '../hooks/useToast';
import { Board } from '../components/game/Board';
import { ChessBoard } from '../components/game/ChessBoard';
import { XiangqiBoard } from '../components/game/XiangqiBoard';
import { GomokuBoard } from '../components/game/GomokuBoard';
import { GoBoard } from '../components/game/GoBoard';
import { LudoBoard } from '../components/game/LudoBoard';
import { JungleBoard } from '../components/game/JungleBoard';
import { LudoDicePanel } from '../components/game/LudoDicePanel';
import { PromotionDialog } from '../components/game/PromotionDialog';
import { GameResultOverlay } from '../components/game/GameResultOverlay';
import { GameStatus } from '../components/game/GameStatus';
import { GameControls } from '../components/game/GameControls';
import { MoveHistory } from '../components/game/MoveHistory';
import type { BoardState, Position } from '@board-games/shared';
import { PieceColor } from '@board-games/shared';
import type { ChessBoardState } from '@board-games/shared/chess';
import type { XiangqiBoardState } from '@board-games/shared/xiangqi';
import type { GomokuBoardState } from '@board-games/shared/gomoku';
import type { GoBoardState } from '@board-games/shared/go';
import type { LudoBoardState } from '@board-games/shared/ludo';
import type { JungleBoardState } from '@board-games/shared/jungle';
import type { DraughtsAnimationState } from '../types/draughtsAnimation';
import { useDraughtsGame } from '../hooks/useDraughtsGame';
import { useChessGame } from '../hooks/useChessGame';
import { useXiangqiGame } from '../hooks/useXiangqiGame';
import { useGomokuGame } from '../hooks/useGomokuGame';
import { useGoGame } from '../hooks/useGoGame';
import { useLudoGame } from '../hooks/useLudoGame';
import { useJungleGame } from '../hooks/useJungleGame';
import { playSound } from '../utils/sounds';

type AnyBoard = BoardState | ChessBoardState | XiangqiBoardState | GomokuBoardState | GoBoardState | LudoBoardState | JungleBoardState;

export function Game() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: game, isLoading } = useQuery({
    queryKey: ['game', gameId],
    queryFn: () => orpc.getGame({ gameId: gameId! }),
    enabled: !!gameId,
    refetchInterval: false,
  });

  const undoMutation = useMutation({
    mutationFn: () => orpc.undoMove({ gameId: gameId! }),
    onSuccess: (data) => {
      queryClient.setQueryData(['game', gameId], data);
      queryClient.invalidateQueries({ queryKey: ['game', gameId] });
      queryClient.invalidateQueries({ queryKey: ['moveHistory', gameId] });
    },
    onError: () => {
      addToast('悔棋失败，请重试');
    },
  });

  const resignMutation = useMutation({
    mutationFn: () => orpc.resignGame({ gameId: gameId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game', gameId] });
    },
    onError: () => {
      addToast('认输失败，请重试');
    },
  });

  const isXiangqi = game?.gameType === 'xiangqi';
  const isChess = game?.gameType === 'chess';
  const isGomoku = game?.gameType === 'gomoku';
  const isGo = game?.gameType === 'go';
  const isLudo = game?.gameType === 'ludo';
  const isJungle = game?.gameType === 'jungle';

  const titleMap: Record<string, string> = {
    draughts: '国际跳棋',
    xiangqi: '中国象棋',
    chess: '国际象棋',
    gomoku: '五子棋',
    go: '围棋',
    ludo: '飞行棋',
    jungle: '斗兽棋',
  };

  useEffect(() => {
    if (game?.gameType) {
      document.title = titleMap[game.gameType] ?? '棋趣乐园';
    }
    return () => { document.title = '棋趣乐园'; };
  }, [game?.gameType]);
  const board: AnyBoard | null = useMemo(
    () => (game ? (JSON.parse(game.boardState) as AnyBoard) : null),
    [game?.boardState],
  );
  const humanColor: PieceColor = game?.humanColor === 'dark' ? PieceColor.DARK : PieceColor.LIGHT;
  const isHumanTurn = game?.currentPlayer === 'human';
  const isFinished = game?.status === 'finished';
  const isDraw = game?.winner === 'draw';

  const draughts = useDraughtsGame(
    gameId,
    !isXiangqi && !isChess && !isGomoku && !isGo && !isLudo && !isJungle ? (board as BoardState) : null,
    humanColor,
    isHumanTurn,
    isFinished,
  );

  const chess = useChessGame(
    gameId,
    isChess ? (board as ChessBoardState) : null,
    humanColor,
    isHumanTurn,
    isFinished,
  );

  const xiangqi = useXiangqiGame(
    gameId,
    isXiangqi ? (board as XiangqiBoardState) : null,
    humanColor,
    isHumanTurn,
    isFinished,
  );

  const gomoku = useGomokuGame(
    gameId,
    isGomoku ? (board as GomokuBoardState) : null,
    humanColor,
    isHumanTurn,
    isFinished,
  );

  const go = useGoGame(
    gameId,
    isGo ? (board as GoBoardState) : null,
    humanColor,
    isHumanTurn,
    isFinished,
  );

  const ludo = useLudoGame(
    gameId,
    isLudo ? (board as LudoBoardState) : null,
    isHumanTurn,
    isFinished,
  );

  const jungle = useJungleGame(
    gameId,
    isJungle ? (board as JungleBoardState) : null,
    humanColor,
    isHumanTurn,
    isFinished,
  );

  const hasPlayedGameEndSoundRef = useRef(false);

  useEffect(() => {
    if (!isFinished || hasPlayedGameEndSoundRef.current) return;
    hasPlayedGameEndSoundRef.current = true;
    if (isDraw) {
      playSound('draw');
    } else if (game.winner === 'human') {
      playSound('win');
    } else {
      playSound('lose');
    }
  }, [isFinished, isDraw, game?.winner]);

  useEffect(() => {
    hasPlayedGameEndSoundRef.current = false;
  }, [gameId]);

  if (isLoading || !game || !board) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-warm-200 border-t-warm-500" />
      </div>
    );
  }

  const colorLabel = isXiangqi
    ? humanColor === PieceColor.DARK ? '红方' : '黑方'
    : isGo
      ? humanColor === PieceColor.DARK ? '黑棋' : '白棋'
      : isGomoku
        ? humanColor === PieceColor.DARK ? '黑棋' : '白棋'
        : isChess
          ? humanColor === PieceColor.LIGHT ? '白方' : '黑方'
          : isLudo
            ? '红方'
            : isJungle
              ? humanColor === PieceColor.DARK ? '红方' : '蓝方'
              : humanColor === PieceColor.DARK ? '深色' : '浅色';

  const gameResult = isFinished
    ? isGo && go.goScore
      ? isDraw
        ? '🤝 和棋'
        : game.winner === 'human'
          ? `🎉 你赢了！(黑:${go.goScore.darkTotal.toFixed(1)} 白:${go.goScore.lightTotal.toFixed(1)})`
          : `AI 赢了 (黑:${go.goScore.darkTotal.toFixed(1)} 白:${go.goScore.lightTotal.toFixed(1)})`
      : isDraw
        ? game.drawReason === 'stalemate'
          ? '🤝 逼和'
          : game.drawReason === 'fifty_move_rule'
            ? '🤝 50步和棋'
            : game.drawReason === 'insufficient_material'
              ? '🤝 子力不足和棋'
              : game.drawReason === 'board_full'
                ? '🤝 棋盘满了，平局'
                : game.drawReason === 'equal-score'
                  ? '🤝 和棋'
                  : game.drawReason === 'sixty_move_rule'
                    ? '🤝 60步和棋'
                    : '🤝 和棋'
        : game.winner === 'human'
          ? '🎉 恭喜你赢了！'
          : 'AI 赢了，再试一次！'
    : null;

  const activeController =
    isChess ? chess :
    isXiangqi ? xiangqi :
    isGomoku ? gomoku :
    isGo ? go :
    isLudo ? ludo :
    isJungle ? jungle :
    draughts;

  const isProcessing = activeController.isPending || undoMutation.isPending || resignMutation.isPending;

  return (
    <div className="mx-auto flex min-h-full lg:h-full max-w-7xl animate-fade-in px-2 py-2 sm:px-3 sm:py-3">
      <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:gap-5 min-w-0 min-h-0">
        <div className="flex flex-1 flex-col items-center gap-2 min-w-0 min-h-0 lg:h-full lg:overflow-hidden">
          {isLudo && (
            <LudoDicePanel
              phase={ludo.phase}
              isHumanTurn={isHumanTurn}
              isFinished={isFinished}
              currentPlayerIndex={(board as LudoBoardState).currentPlayerIndex}
              onRollDice={ludo.handleRollDice}
              isPending={ludo.isPending}
            />
          )}
          {isGo ? (
            <GoBoard
              board={go.localBoard ?? (board as GoBoardState)}
              onIntersectionClick={go.handleIntersectionClick}
              humanColor={humanColor}
              isHumanTurn={isHumanTurn}
              lastMove={go.lastMove}
              isFinished={isFinished}
              isProcessing={isProcessing}
            />
          ) : isGomoku ? (
            <GomokuBoard
              board={gomoku.localBoard ?? (board as GomokuBoardState)}
              onIntersectionClick={gomoku.handleIntersectionClick}
              humanColor={humanColor}
              isHumanTurn={isHumanTurn}
              lastMove={gomoku.lastMove}
              winningLine={gomoku.winningLine}
              isFinished={isFinished}
              isProcessing={isProcessing}
            />
          ) : isXiangqi ? (
            <XiangqiBoard
              board={xiangqi.localBoard ?? (board as XiangqiBoardState)}
              selectedPieceId={xiangqi.selectedPieceId}
              validMoves={xiangqi.validMoves}
              onCellClick={xiangqi.handleCellClick}
              humanColor={humanColor}
              isInCheck={xiangqi.isInCheck}
              lastMove={xiangqi.lastMove}
              isProcessing={isProcessing}
            />
          ) : isChess ? (
            <ChessBoard
              board={chess.localBoard ?? (board as ChessBoardState)}
              selectedPieceId={chess.selectedPieceId}
              validMoves={chess.validMoves}
              onCellClick={chess.handleCellClick}
              humanColor={humanColor}
              isInCheck={chess.isInCheck}
              lastMove={chess.lastMove}
              threatenedPieceIds={chess.threatenedPieceIds}
              isProcessing={isProcessing}
            />
          ) : isLudo ? (
            <LudoBoard
              board={ludo.localBoard ?? (board as LudoBoardState)}
              phase={ludo.phase}
              onPieceClick={ludo.handlePieceClick}
            />
          ) : isJungle ? (
            <JungleBoard
              board={jungle.localBoard ?? (board as JungleBoardState)}
              selectedPieceId={jungle.selectedPieceId}
              validMoves={jungle.validMoves}
              onCellClick={jungle.handleCellClick}
              humanColor={humanColor}
              lastMove={jungle.lastMove}
              isFinished={isFinished}
              isProcessing={isProcessing}
            />
          ) : (
            <Board
              board={draughts.localBoard ?? (board as BoardState)}
              selectedPieceId={draughts.selectedPieceId}
              validTargets={draughts.validTargets}
              dangerousTargets={draughts.dangerousTargets}
              onCellClick={draughts.isAnimating ? () => {} : draughts.handleCellClick}
              humanColor={humanColor}
              animState={draughts.animState as DraughtsAnimationState | null}
              movablePieceIds={draughts.movablePieceIds}
              hasForcedCapture={draughts.forcedCaptureHint != null}
              threatenedPieceIds={draughts.threatenedPieceIds}
              validMoves={draughts.validMoves}
              isProcessing={isProcessing}
            />
          )}
          <div className="lg:hidden w-full">
            <GameStatus
              currentTurn={game.currentPlayer}
              humanColor={game.humanColor}
              winner={game.winner}
              isFinished={isFinished}
              isThinking={isProcessing}
              customResult={gameResult}
              colorLabel={colorLabel}
              isInCheck={chess.isInCheck || xiangqi.isInCheck}
              forcedCaptureHint={!isXiangqi && !isChess && !isGomoku && !isGo && !isLudo && !isJungle ? draughts.forcedCaptureHint : null}
              compact
            />
          </div>
        </div>

        <aside className="w-full flex-shrink-0 lg:w-[280px]">
          <div className="lg:sticky lg:top-4 space-y-3">
            <div className="hidden lg:block">
              <GameStatus
                currentTurn={game.currentPlayer}
                humanColor={game.humanColor}
                winner={game.winner}
                isFinished={isFinished}
                isThinking={isProcessing}
                customResult={gameResult}
                colorLabel={colorLabel}
                isInCheck={chess.isInCheck || xiangqi.isInCheck}
              />
            </div>
            {!isXiangqi && !isChess && !isGomoku && !isGo && !isLudo && !isJungle && (
              <div className="hidden lg:flex h-7 items-center justify-center">
                {draughts.forcedCaptureHint ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-700 animate-wiggle" style={{ fontFamily: 'var(--font-display)' }}>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
                    {draughts.forcedCaptureHint}
                  </span>
                ) : null}
              </div>
            )}
            <GameControls
              onNewGame={() => navigate('/')}
              onUndo={() => {
                undoMutation.mutate();
                activeController.reset?.();
              }}
              onResign={() => resignMutation.mutate()}
              onPass={isGo ? go.handlePass : undefined}
              canUndo={game.moveCount >= 2 && !isFinished && !isLudo}
              isFinished={isFinished}
              isProcessing={isProcessing}
            />
            <MoveHistory gameId={gameId!} />
          </div>
        </aside>
      </div>

      {chess.isAwaitingPromotion && (
        <PromotionDialog
          color={humanColor}
          onSelect={chess.handlePromotionSelect}
          onCancel={chess.cancelPromotion}
        />
      )}

      {isFinished && (
        <GameResultOverlay
          outcome={isDraw ? 'draw' : game.winner === 'human' ? 'win' : 'lose'}
          resultText={gameResult ?? ''}
          drawReason={game.drawReason}
          onNewGame={() => navigate('/')}
          onHome={() => navigate('/')}
        />
      )}
    </div>
  );
}
