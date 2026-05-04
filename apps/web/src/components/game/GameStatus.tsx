export function GameStatus({
  currentTurn,
  humanColor,
  winner,
  isFinished,
  isThinking,
  customResult,
  colorLabel,
  isInCheck,
  forcedCaptureHint,
  compact,
}: {
  currentTurn: string;
  humanColor: string;
  winner: string | null;
  isFinished: boolean;
  isThinking: boolean;
  customResult?: string | null;
  colorLabel?: string;
  isInCheck?: boolean;
  forcedCaptureHint?: string | null;
  compact?: boolean;
}) {
  const label = colorLabel || (humanColor === 'dark' ? '深色' : '浅色');

  if (compact) {
    if (isFinished && (winner || customResult)) {
      return (
        <div
          className={`flex items-center justify-center h-9 rounded-lg text-sm font-extrabold text-white ${
            winner === 'human'
              ? 'bg-gradient-to-r from-mint-500 to-emerald-500'
              : 'bg-gradient-to-r from-coral-500 to-rose-500'
          }`}
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {winner === 'human' ? '🎉 ' : ''}{customResult || (winner === 'human' ? '恭喜你赢了！' : 'AI 赢了，再试一次！')}
        </div>
      );
    }

    return (
      <div
        className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold ${
          isInCheck
            ? 'bg-red-50 text-red-600 border border-red-200 animate-wiggle'
            : 'bg-warm-100 text-warm-700 border border-warm-200'
        }`}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {isThinking ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-warm-400 animate-pulse" />
            🤖 AI 想想中...
          </span>
        ) : currentTurn === 'human' ? (
          isInCheck ? (
            <span>⚠️ 将军！该你了</span>
          ) : (
            <span>🧑 执{label} · 👉 该你下了</span>
          )
        ) : (
          <span>🤖 AI 回合</span>
        )}
        {forcedCaptureHint && (
          <>
            <span className={isInCheck ? 'text-red-300' : 'text-warm-300'}>·</span>
            <span className="text-amber-600">{forcedCaptureHint}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl px-5 py-3 text-center text-sm font-extrabold border-2 min-h-[52px] flex items-center justify-center ${
        isFinished && (winner || customResult)
          ? winner === 'human'
            ? 'bg-gradient-to-r from-mint-50 to-emerald-50 text-mint-700 border-mint-300 shadow-md shadow-mint-100/50'
            : 'bg-gradient-to-r from-coral-50 to-rose-50 text-coral-600 border-coral-300 shadow-md shadow-coral-100/50'
          : 'bg-white text-warm-600 border-warm-200 shadow-sm font-bold'
      }`}
      style={{ fontFamily: 'var(--font-display)' }}
    >
      {isFinished && (winner || customResult) ? (
        <>
          {winner === 'human' ? '🎉 ' : ''}
          {customResult ||
            (winner === 'human' ? '恭喜你赢了！' : 'AI 赢了，再试一次！')}
        </>
      ) : (
        <>
          <span className="font-extrabold text-warm-800">🧑 执{label}</span>
          <span className="mx-2 text-warm-300">·</span>
          {isThinking ? (
            <span className="inline-flex items-center gap-1.5 text-warm-500">
              <span className="inline-block h-2 w-2 rounded-full bg-warm-400 animate-pulse" />
              🤖 AI 想想中...
            </span>
          ) : currentTurn === 'human' ? (
            isInCheck ? (
              <span className="font-extrabold text-coral-600 animate-wiggle">
                ⚠️ 将军！该你了
              </span>
            ) : (
              <span className="font-extrabold text-warm-700">👉 该你下了</span>
            )
          ) : (
            <span className="text-warm-500">🤖 AI 回合</span>
          )}
        </>
      )}
    </div>
  );
}
