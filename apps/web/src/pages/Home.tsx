import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { orpc } from '../orpc-client';
import { addToast } from '../hooks/useToast';

type GameType = 'draughts' | 'chinese_chess' | 'chess' | 'gomoku' | 'go' | 'ludo';

const GAMES: { type: GameType; name: string; icon: string; emoji: string; desc: string; gradient: string }[] = [
  { type: 'draughts', name: '国际跳棋', icon: '⛀', emoji: '🟤', desc: '跳跃吃子，越界成王', gradient: 'from-amber-400 to-orange-500' },
  { type: 'chinese_chess', name: '中国象棋', icon: '將', emoji: '🏯', desc: '楚河汉界，逐鹿中原', gradient: 'from-red-400 to-rose-500' },
  { type: 'chess', name: '国际象棋', icon: '♔', emoji: '👑', desc: '王后博弈，智者胜出', gradient: 'from-violet-400 to-purple-500' },
  { type: 'gomoku', name: '五子棋', icon: '⚫', emoji: '⬛', desc: '五子连珠，先到先赢', gradient: 'from-slate-400 to-zinc-500' },
  { type: 'go', name: '围棋', icon: '⚏', emoji: '🌀', desc: '天地之间，黑白对弈', gradient: 'from-teal-400 to-cyan-500' },
  { type: 'ludo', name: '飞行棋', icon: '✈', emoji: '🎲', desc: '4人竞速，骰子决定', gradient: 'from-pink-400 to-fuchsia-500' },
];

const DIFFICULTIES = [
  { key: 'easy' as const, label: '🌱 初学', desc: '轻松入门，不着急' },
  { key: 'medium' as const, label: '🔥 进阶', desc: '有点挑战，攻守兼备' },
  { key: 'hard' as const, label: '🏆 高手', desc: '深谋远虑，全力以赴' },
];

export function Home() {
  const navigate = useNavigate();
  const [gameType, setGameType] = useState<GameType>('draughts');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [humanColor, setHumanColor] = useState<'dark' | 'light'>('dark');
  const [goBoardSize, setGoBoardSize] = useState<9 | 13 | 19>(19);
  const [draughtsBoardSize, setDraughtsBoardSize] = useState<10 | 8>(10);
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      const result = await orpc.createGame({
        gameType,
        boardSize: gameType === 'draughts' ? draughtsBoardSize : gameType === 'go' ? goBoardSize : undefined,
        difficulty,
        humanColor: gameType === 'ludo' ? 'dark' : humanColor,
        humanGoesFirst: gameType === 'go' || gameType === 'gomoku' || gameType === 'chinese_chess' ? humanColor === 'dark' : gameType === 'ludo' ? true : true,
      });
      navigate(`/game/${result.game.id}`);
    } catch (err) {
      console.error(err);
      addToast('创建失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const colorLabel = (c: string) => {
    if (gameType === 'chinese_chess') return c === 'dark' ? '红方 (先手)' : '黑方 (后手)';
    if (gameType === 'chess') return c === 'dark' ? '黑方 (后手)' : '白方 (先手)';
    if (gameType === 'gomoku' || gameType === 'go') return c === 'dark' ? '黑棋 (先手)' : '白棋 (后手)';
    return c === 'dark' ? '深色 (先手)' : '浅色 (后手)';
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6 sm:py-10">
      <div className="mb-8 text-center animate-bounce-in">
        <div className="mb-3 text-6xl animate-float select-none">🎲</div>
        <h1
          className="text-4xl font-bold tracking-tight text-warm-800 sm:text-5xl"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          棋趣乐园
        </h1>
        <p className="mt-2 text-sm font-semibold text-warm-500">
          没有广告，不要会员，专心下棋
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-extrabold text-warm-700" style={{ fontFamily: 'var(--font-display)' }}>
            🎮 选择棋类
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {GAMES.map((game, idx) => (
              <button
                key={game.type}
                onClick={() => setGameType(game.type)}
                className={`game-card-enter flex flex-col items-center rounded-2xl py-3 px-2 border-2 transition-all ${
                  gameType === game.type
                    ? 'border-warm-500 bg-white shadow-lg shadow-warm-200/50 scale-[1.01] animate-rainbow-border'
                    : 'border-warm-200 bg-white/80 hover:border-warm-300 hover:bg-white active:scale-[0.97]'
                }`}
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <div className="relative">
                  <div className={`text-2xl w-10 h-10 rounded-full bg-gradient-to-br ${game.gradient} flex items-center justify-center text-white shadow-sm`}>
                    {game.emoji}
                  </div>
                  {gameType === game.type && (
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-warm-500 text-white text-[9px] font-black flex items-center justify-center shadow-sm ring-2 ring-white">✓</div>
                  )}
                </div>
                <div className="text-[13px] font-extrabold leading-tight text-warm-800">{game.name}</div>
                <div className={`text-[10px] mt-0.5 font-semibold ${gameType === game.type ? 'text-warm-600' : 'text-warm-400'}`}>
                  {game.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {gameType === 'go' && (
          <div className="animate-fade-in">
            <label className="mb-2 block text-sm font-extrabold text-warm-700" style={{ fontFamily: 'var(--font-display)' }}>
              📐 棋盘大小
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {([19, 13, 9] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setGoBoardSize(s)}
                  className={`rounded-2xl py-3 text-center text-base font-extrabold transition-all border-2 ${
                    goBoardSize === s
                      ? 'bg-gradient-to-r from-ink-400 to-ink-500 text-white shadow-md shadow-ink-200/40 border-ink-500'
                      : 'bg-white border-warm-200 text-warm-500 hover:border-warm-300 active:scale-[0.97]'
                  }`}
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {s}路
                </button>
              ))}
            </div>
          </div>
        )}

        {gameType === 'draughts' && (
          <div className="animate-fade-in">
            <label className="mb-2 block text-sm font-extrabold text-warm-700" style={{ fontFamily: 'var(--font-display)' }}>
              📐 棋盘大小
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {([10, 8] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setDraughtsBoardSize(s)}
                  className={`rounded-2xl py-3 text-center text-base font-extrabold transition-all border-2 ${
                    draughtsBoardSize === s
                      ? 'bg-gradient-to-r from-warm-500 to-warm-600 text-white shadow-md shadow-warm-200/40 border-warm-600'
                      : 'bg-white border-warm-200 text-warm-500 hover:border-warm-300 active:scale-[0.97]'
                  }`}
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {s === 10 ? '100格' : '64格'}
                </button>
              ))}
            </div>
          </div>
        )}

        {gameType === 'ludo' && (
          <div className="animate-fade-in rounded-2xl bg-gradient-to-r from-pink-50 to-fuchsia-50 p-4 text-center text-sm font-bold text-warm-700 border-2 border-pink-200">
            🎲 1人(红方) vs 3 AI (黄/蓝/绿)，你执红棋先行
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-extrabold text-warm-700" style={{ fontFamily: 'var(--font-display)' }}>
            🤖 AI 难度
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.key}
                onClick={() => setDifficulty(d.key)}
                className={`flex flex-col items-center rounded-2xl py-3.5 transition-all border-2 ${
                  difficulty === d.key
                    ? 'bg-gradient-to-r from-warm-500 to-warm-600 text-white shadow-md shadow-warm-200/40 border-warm-600'
                    : 'bg-white border-warm-200 text-warm-600 hover:border-warm-300 active:scale-[0.97]'
                }`}
              >
                <span className="text-sm font-extrabold">{d.label}</span>
                <span className={`text-[10px] mt-0.5 font-semibold ${difficulty === d.key ? 'text-white/80' : 'text-warm-400'}`}>
                  {d.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {gameType !== 'ludo' && (
          <div>
            <label className="mb-2 block text-sm font-extrabold text-warm-700" style={{ fontFamily: 'var(--font-display)' }}>
              🎨 你执什么？
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setHumanColor('dark')}
                className={`flex items-center justify-center gap-3 rounded-2xl py-4 transition-all border-2 ${
                  humanColor === 'dark'
                    ? 'bg-gradient-to-r from-warm-500 to-warm-600 text-white shadow-md shadow-warm-200/40 border-warm-600'
                    : 'bg-white border-warm-200 text-warm-600 hover:border-warm-300 active:scale-[0.97]'
                }`}
              >
                <span className={`inline-block h-6 w-6 rounded-full shadow-inner ${humanColor === 'dark' ? 'bg-white' : 'bg-warm-800'}`} />
                <span className="text-sm font-extrabold">{colorLabel('dark')}</span>
              </button>
              <button
                onClick={() => setHumanColor('light')}
                className={`flex items-center justify-center gap-3 rounded-2xl py-4 transition-all border-2 ${
                  humanColor === 'light'
                    ? 'bg-gradient-to-r from-warm-500 to-warm-600 text-white shadow-md shadow-warm-200/40 border-warm-600'
                    : 'bg-white border-warm-200 text-warm-600 hover:border-warm-300 active:scale-[0.97]'
                }`}
              >
                <span className={`inline-block h-6 w-6 rounded-full border-2 shadow-inner ${humanColor === 'light' ? 'bg-warm-700 border-warm-600' : 'bg-white border-warm-300'}`} />
                <span className="text-sm font-extrabold">{colorLabel('light')}</span>
              </button>
            </div>
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full rounded-2xl bg-gradient-to-r from-warm-500 to-warm-600 py-4 text-lg font-extrabold text-white shadow-lg shadow-warm-300/40 transition-all hover:brightness-110 active:scale-[0.97] disabled:opacity-50 animate-pulse-warm"
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
