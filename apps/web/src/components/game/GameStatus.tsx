export function GameStatus({
  currentTurn,
  humanColor,
  winner,
  isFinished,
  isThinking,
  customResult,
  colorLabel,
  isInCheck,
}: {
  currentTurn: string;
  humanColor: string;
  winner: string | null;
  isFinished: boolean;
  isThinking: boolean;
  customResult?: string | null;
  colorLabel?: string;
  isInCheck?: boolean;
}) {
  const label = colorLabel || (humanColor === 'dark' ? '深色' : '浅色');

  if (isFinished && (winner || customResult)) {
    const isWin = winner === 'human';
    return (
      <div
        className={`rounded-2xl px-5 py-3 text-center text-sm font-extrabold border-2 ${
          isWin
            ? 'bg-gradient-to-r from-mint-50 to-emerald-50 text-mint-700 border-mint-300 shadow-md shadow-mint-100/50'
            : 'bg-gradient-to-r from-coral-50 to-rose-50 text-coral-600 border-coral-300 shadow-md shadow-coral-100/50'
        }`}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {isWin ? '🎉 ' : ''}{customResult || (isWin ? '恭喜你赢了！' : 'AI 赢了，再试一次！')}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white px-5 py-3 text-center text-sm font-bold text-warm-600 border-2 border-warm-200 shadow-sm">
      <span className="font-extrabold text-warm-800" style={{ fontFamily: 'var(--font-display)' }}>
        🧑 执{label}
      </span>
      <span className="mx-2 text-warm-300">·</span>
      {isThinking
        ? <span className="inline-flex items-center gap-1.5 text-warm-500"><span className="inline-block h-2 w-2 rounded-full bg-warm-400 animate-pulse" />🤖 AI 想想中...</span>
        : currentTurn === 'human'
          ? isInCheck
            ? <span className="font-extrabold text-coral-600 animate-wiggle" style={{ fontFamily: 'var(--font-display)' }}>⚠️ 将军！该你了</span>
            : <span className="font-extrabold text-warm-700" style={{ fontFamily: 'var(--font-display)' }}>👉 该你下了</span>
          : <span className="text-warm-500">🤖 AI 回合</span>}
    </div>
  );
}
