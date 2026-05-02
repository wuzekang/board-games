import type { LudoPlayerIndex, AnyLudoMove } from '@board-games/shared/ludo';

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

const PLAYER_HEX: Record<LudoPlayerIndex, string> = {
  0: '#DC2626',
  1: '#D97706',
  2: '#2563EB',
  3: '#16A34A',
};

const PLAYER_NAMES: Record<LudoPlayerIndex, string> = {
  0: '红',
  1: '黄',
  2: '蓝',
  3: '绿',
};

export function LudoDicePanel({
  phase,
  isHumanTurn,
  isFinished,
  currentPlayerIndex,
  onRollDice,
  isPending,
}: {
  phase: { type: string; diceValue?: number; validMoves?: AnyLudoMove[] };
  isHumanTurn: boolean;
  isFinished: boolean;
  currentPlayerIndex: LudoPlayerIndex;
  onRollDice: () => void;
  isPending: boolean;
}) {
  const diceValue = phase.type === 'rolled' ? phase.diceValue : undefined;

  return (
    <div className="rounded-xl bg-white px-5 py-3 ring-1 ring-warm-200">
      <div className="flex items-center gap-4">
        <div className="text-4xl leading-none shrink-0">
          {diceValue ? DICE_FACES[diceValue] : '🎲'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {([0, 1, 2, 3] as LudoPlayerIndex[]).map((i) => (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-full transition-all ${
                  i === currentPlayerIndex ? 'scale-125 ring-2 ring-warm-800' : 'opacity-40'
                }`}
                style={{ backgroundColor: PLAYER_HEX[i] }}
              />
            ))}
          </div>

          {isHumanTurn && !isFinished && phase.type === 'idle' && (
            <button
              onClick={onRollDice}
              disabled={isPending}
              className="w-full rounded-lg bg-coral-500 px-4 py-1.5 text-sm font-bold text-white transition-all hover:bg-coral-600 active:scale-[0.97] disabled:opacity-50"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              掷骰子
            </button>
          )}

          {phase.type === 'rolled' && (
            <p className="text-sm font-semibold text-warm-600">
              掷得 {diceValue}，请选择棋子
            </p>
          )}

          {!isHumanTurn && !isFinished && (
            <p className="text-sm text-warm-400 animate-pulse">
              {PLAYER_NAMES[currentPlayerIndex]}方 AI 思考中...
            </p>
          )}

          {isFinished && (
            <p className="text-sm font-bold text-warm-500">游戏结束</p>
          )}
        </div>
      </div>
    </div>
  );
}
