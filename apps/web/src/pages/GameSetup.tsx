import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orpc } from '../orpc-client';
import { addToast } from '../hooks/useToast';
import { playSound } from '../utils/sounds';
import { GAMES } from './Home';

const DIFFICULTIES = [
  { key: 'easy' as const, label: '🌱 初学', desc: '轻松入门，不着急' },
  { key: 'medium' as const, label: '🔥 进阶', desc: '有点挑战，攻守兼备' },
  { key: 'hard' as const, label: '🏆 高手', desc: '深谋远虑，全力以赴' },
];

export function GameSetup() {
  const { gameType } = useParams<{ gameType: string }>();
  const navigate = useNavigate();
  const game = GAMES.find((g) => g.type === gameType);

  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [humanColor, setHumanColor] = useState<'dark' | 'light'>('dark');
  const [goBoardSize, setGoBoardSize] = useState<9 | 13 | 19>(19);
  const [draughtsBoardSize, setDraughtsBoardSize] = useState<10 | 8>(10);
  const [loading, setLoading] = useState(false);

  if (!game) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-warm-500 font-bold">找不到这个游戏</p>
      </div>
    );
  }

  const colorLabel = (c: string) => {
    if (game!.type === 'xiangqi') return c === 'dark' ? '红方 (先手)' : '黑方 (后手)';
    if (game!.type === 'jungle') return c === 'dark' ? '红方 (先手)' : '蓝方 (后手)';
    if (game!.type === 'chess') return c === 'dark' ? '黑方 (后手)' : '白方 (先手)';
    if (game!.type === 'gomoku' || game!.type === 'go') return c === 'dark' ? '黑棋 (先手)' : '白棋 (后手)';
    return c === 'dark' ? '深色 (先手)' : '浅色 (后手)';
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      const result = await orpc.createGame({
        gameType: game!.type,
        boardSize: game!.type === 'draughts' ? draughtsBoardSize : game!.type === 'go' ? goBoardSize : undefined,
        difficulty,
        humanColor: game!.type === 'ludo' ? 'dark' : humanColor,
        humanGoesFirst: game!.type === 'go' || game!.type === 'gomoku' || game!.type === 'xiangqi' || game!.type === 'jungle' ? humanColor === 'dark' : true,
      });
      navigate(`/game/${result.game.id}`);
    } catch (err) {
      console.error(err);
      addToast('创建失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl h-full flex flex-col overflow-hidden px-4 sm:px-6 py-4 sm:py-6">
      <button
        onClick={() => { playSound('click'); navigate('/'); }}
        className="flex-none self-start flex items-center gap-1 text-sm font-bold text-warm-400 hover:text-warm-600 transition-colors mb-3 sm:mb-4"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        返回
      </button>

      <div className="flex-none flex items-center gap-4 sm:gap-5 mb-5 sm:mb-6">
        <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${game.gradient} flex items-center justify-center shadow-lg shrink-0`}>
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden">
            {game.boardPreview}
          </div>
        </div>
        <div>
          <h1
            className="text-2xl sm:text-3xl font-extrabold text-warm-800"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {game.name}
          </h1>
          <p className="text-sm sm:text-base font-semibold text-warm-400 mt-0.5">{game.desc}</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 space-y-5 sm:space-y-6 overflow-y-auto">
        {(game.type === 'go' || game.type === 'draughts') && (
          <section>
            <h2 className="text-sm sm:text-base font-extrabold text-warm-700 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              📐 棋盘大小
            </h2>
            {game.type === 'go' ? (
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {([19, 13, 9] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => { playSound('click'); setGoBoardSize(s); }}
                    className={`rounded-2xl py-3 sm:py-4 h-[52px] sm:h-[60px] flex items-center justify-center text-base sm:text-lg font-extrabold transition-colors border-2 ${
                      goBoardSize === s
                        ? 'bg-warm-500 text-white border-warm-600'
                        : 'bg-white border-warm-200 text-warm-500 hover:border-warm-300'
                    }`}
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {s}路
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {([10, 8] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => { playSound('click'); setDraughtsBoardSize(s); }}
                    className={`rounded-2xl py-3 sm:py-4 h-[52px] sm:h-[60px] flex items-center justify-center text-base sm:text-lg font-extrabold transition-colors border-2 ${
                      draughtsBoardSize === s
                        ? 'bg-warm-500 text-white border-warm-600'
                        : 'bg-white border-warm-200 text-warm-500 hover:border-warm-300'
                    }`}
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {s === 10 ? '100格' : '64格'}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {game.type === 'ludo' && (
          <section>
            <div className="rounded-2xl bg-gradient-to-r from-pink-50 to-fuchsia-50 p-4 sm:p-5 text-center text-sm sm:text-base font-bold text-warm-700 border-2 border-pink-200">
              🎲 1人(红方) vs 3 AI (黄/蓝/绿)，你执红棋先行
            </div>
          </section>
        )}

        <section>
          <h2 className="text-sm sm:text-base font-extrabold text-warm-700 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            🤖 AI 难度
          </h2>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.key}
                onClick={() => { playSound('click'); setDifficulty(d.key); }}
                className={`flex flex-col items-center justify-center rounded-2xl py-3 sm:py-4 h-[52px] sm:h-[60px] transition-colors border-2 ${
                  difficulty === d.key
                    ? 'bg-warm-500 text-white border-warm-600'
                    : 'bg-white border-warm-200 text-warm-600 hover:border-warm-300'
                }`}
              >
                <span className="text-sm sm:text-base font-extrabold">{d.label}</span>
                <span className={`text-[10px] sm:text-xs mt-0.5 font-semibold ${difficulty === d.key ? 'text-white/80' : 'text-warm-400'}`}>
                  {d.desc}
                </span>
              </button>
            ))}
          </div>
        </section>

        {game.type !== 'ludo' && (
          <section>
            <h2 className="text-sm sm:text-base font-extrabold text-warm-700 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              🎨 你执什么？
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <button
                onClick={() => { playSound('click'); setHumanColor('dark'); }}
                className={`flex items-center justify-center gap-2 sm:gap-3 rounded-2xl py-3 sm:py-4 h-[52px] sm:h-[60px] transition-colors border-2 ${
                  humanColor === 'dark'
                    ? 'bg-warm-500 text-white border-warm-600'
                    : 'bg-white border-warm-200 text-warm-600 hover:border-warm-300'
                }`}
              >
                <span className={`inline-block h-5 w-5 sm:h-6 sm:w-6 rounded-full shadow-inner ${humanColor === 'dark' ? 'bg-white' : 'bg-warm-800'}`} />
                <span className="text-sm sm:text-base font-extrabold whitespace-nowrap">{colorLabel('dark')}</span>
              </button>
              <button
                onClick={() => { playSound('click'); setHumanColor('light'); }}
                className={`flex items-center justify-center gap-2 sm:gap-3 rounded-2xl py-3 sm:py-4 h-[52px] sm:h-[60px] transition-colors border-2 ${
                  humanColor === 'light'
                    ? 'bg-warm-500 text-white border-warm-600'
                    : 'bg-white border-warm-200 text-warm-600 hover:border-warm-300'
                }`}
              >
                <span className={`inline-block h-5 w-5 sm:h-6 sm:w-6 rounded-full border-2 shadow-inner ${humanColor === 'light' ? 'bg-warm-700 border-warm-600' : 'bg-white border-warm-300'}`} />
                <span className="text-sm sm:text-base font-extrabold whitespace-nowrap">{colorLabel('light')}</span>
              </button>
            </div>
          </section>
        )}
      </div>

      <div className="flex-none pt-4 sm:pt-5">
        <button
          onClick={() => { playSound('click'); handleStart(); }}
          disabled={loading}
          className="w-full rounded-2xl bg-warm-500 border-2 border-warm-600 py-4 sm:py-5 text-lg sm:text-xl font-extrabold text-white shadow-lg shadow-warm-300/40 transition-colors hover:brightness-110 hover:scale-[1.01] active:scale-[0.97] disabled:opacity-50 animate-pulse-warm"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              正在开局...
            </span>
          ) : (
            '🎯 开始下棋'
          )}
        </button>
      </div>
    </div>
  );
}
