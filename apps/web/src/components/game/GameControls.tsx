import { playSound } from '../../utils/sounds';

export function GameControls({
  onNewGame,
  onUndo,
  onResign,
  onPass,
  canUndo,
  isFinished,
  isProcessing,
}: {
  onNewGame: () => void;
  onUndo: () => void;
  onResign: () => void;
  onPass?: () => void;
  canUndo: boolean;
  isFinished: boolean;
  isProcessing: boolean;
}) {
  const withClick = (fn: () => void, disabled = false) => () => {
    if (disabled) return;
    playSound('click');
    fn();
  };

  return (
    <div className="flex flex-col gap-2.5">
      <button
        onClick={withClick(onNewGame)}
        className="w-full rounded-2xl bg-gradient-to-r from-warm-500 to-warm-600 py-3.5 text-base font-extrabold text-white shadow-lg shadow-warm-200/40 transition-all hover:from-warm-600 hover:to-warm-700 active:scale-[0.97]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        🔄 新游戏
      </button>
      <div className="flex gap-2">
        {!isFinished && onPass && (
          <button
            onClick={withClick(onPass!, isProcessing)}
            disabled={isProcessing}
            className="flex-1 rounded-2xl bg-sky-50 py-3 text-sm font-extrabold text-sky-600 border-2 border-sky-200 transition-all hover:bg-sky-100 hover:border-sky-300 active:scale-[0.97] disabled:opacity-40"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            ✋ 虚手
          </button>
        )}
        {!isFinished && (
          <button
            onClick={withClick(onUndo, !canUndo || isProcessing)}
            disabled={!canUndo || isProcessing}
            className="flex-1 rounded-2xl bg-warm-50 py-3 text-sm font-extrabold text-warm-600 border-2 border-warm-200 transition-all hover:bg-warm-100 hover:border-warm-300 active:scale-[0.97] disabled:opacity-40"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            ↩️ 悔棋
          </button>
        )}
        {!isFinished && (
          <button
            onClick={withClick(onResign, isProcessing)}
            disabled={isProcessing}
            className="flex-1 rounded-2xl bg-coral-50 py-3 text-sm font-extrabold text-coral-500 border-2 border-coral-200 transition-all hover:bg-coral-100 hover:border-coral-300 active:scale-[0.97] disabled:opacity-40"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            🏳️ 认输
          </button>
        )}
      </div>
    </div>
  );
}
