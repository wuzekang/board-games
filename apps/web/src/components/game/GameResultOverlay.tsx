import { useRef } from 'react';
import ReactConfetti from 'react-confetti';
import { playSound } from '../../utils/sounds';

type ResultOutcome = 'win' | 'lose' | 'draw';

const LOSE_TIPS = [
  '💡 多想一步，下次更强！',
  '💡 试试换一种开局方式？',
  '💡 每局棋都让你变得更厉害！',
  '💡 AI 也有失误的时候，坚持下去！',
];

const DRAW_REASON_LABELS: Record<string, string> = {
  stalemate: '逼和（无子可走）',
  fifty_move_rule: '50步规则',
  sixty_move_rule: '60步规则',
  insufficient_material: '子力不足',
  board_full: '棋盘下满了',
  'equal-score': '积分相同',
};

interface GameResultOverlayProps {
  outcome: ResultOutcome;
  resultText: string;
  drawReason?: string | null;
  onNewGame: () => void;
  onHome: () => void;
}

export function GameResultOverlay({
  outcome,
  resultText,
  drawReason,
  onNewGame,
  onHome,
}: GameResultOverlayProps) {
  const loseTip = useRef(LOSE_TIPS[(Math.random() * LOSE_TIPS.length) | 0]).current;

  const handleNewGame = () => {
    playSound('click');
    onNewGame();
  };

  const handleHome = () => {
    playSound('click');
    onHome();
  };

  const configs: Record<ResultOutcome, {
    backdrop: string;
    card: string;
    emoji: string;
    emojiAnim: string;
    title: string;
    titleStyle: React.CSSProperties;
    titleClass: string;
    subText: string;
    subColor: string;
    cardAnim: string;
  }> = {
    win: {
      backdrop: 'bg-warm-900/40',
      card: 'bg-white ring-2 ring-warm-200 shadow-2xl shadow-warm-400/20',
      emoji: '🏆',
      emojiAnim: 'animate-trophy-pulse',
      title: '你赢了！',
      titleStyle: {
        fontFamily: 'var(--font-display)',
        backgroundImage: 'linear-gradient(90deg, #c25a12 0%, #ff8c42 30%, #ffd700 50%, #ff8c42 70%, #c25a12 100%)',
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      },
      titleClass: 'text-4xl sm:text-5xl font-extrabold animate-shimmer',
      subText: '太棒了，继续保持！',
      subColor: 'text-warm-600',
      cardAnim: 'animate-bounce-in',
    },
    lose: {
      backdrop: 'bg-warm-800/30',
      card: 'bg-warm-50 ring-2 ring-warm-200 shadow-xl shadow-warm-200/30',
      emoji: '🎯',
      emojiAnim: 'animate-gentle-bob',
      title: '下次一定！',
      titleStyle: { fontFamily: 'var(--font-display)', color: 'var(--color-warm-700)' },
      titleClass: 'text-3xl sm:text-4xl font-extrabold',
      subText: 'AI 赢了这局，继续加油！',
      subColor: 'text-warm-500',
      cardAnim: 'animate-fade-in',
    },
    draw: {
      backdrop: 'bg-sky-900/25',
      card: 'bg-sky-50 ring-2 ring-sky-200 shadow-xl shadow-sky-200/30',
      emoji: '🤝',
      emojiAnim: 'animate-handshake',
      title: '和棋！',
      titleStyle: { fontFamily: 'var(--font-display)', color: 'var(--color-sky-700)' },
      titleClass: 'text-4xl sm:text-5xl font-extrabold',
      subText: '双方旗鼓相当！',
      subColor: 'text-sky-600',
      cardAnim: 'animate-bounce-in',
    },
  };

  const config = configs[outcome];
  const drawReasonLabel = drawReason ? DRAW_REASON_LABELS[drawReason] : null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm animate-overlay-in ${config.backdrop}`}
    >
      {outcome === 'win' && (
        <ReactConfetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={200}
          gravity={0.15}
          colors={['#ff8c42', '#ffc89a', '#ffd700', '#3dc864', '#38bdf8', '#f06595', '#a78bfa']}
          style={{ pointerEvents: 'none' }}
        />
      )}

      <div
        className={`relative mx-4 w-full max-w-sm rounded-3xl p-8 ${config.card} ${config.cardAnim}`}
      >
        {outcome === 'win' && (
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 20%, rgba(255,170,60,0.18) 0%, transparent 65%)' }}
          />
        )}

        <div className="relative flex flex-col items-center gap-4 text-center">
          <span className={`text-7xl select-none ${config.emojiAnim}`}>
            {config.emoji}
          </span>

          <h2 className={config.titleClass} style={config.titleStyle}>
            {config.title}
          </h2>

          <p className={`text-base font-bold ${config.subColor}`}>
            {config.subText}
          </p>

          {resultText && (
            <p className="text-sm font-semibold text-warm-400">
              {resultText}
            </p>
          )}

          {outcome === 'draw' && drawReasonLabel && (
            <span className="bg-sky-100 text-sky-600 text-xs font-bold px-3 py-1 rounded-full">
              {drawReasonLabel}
            </span>
          )}

          {outcome === 'lose' && (
            <p className="text-xs italic text-warm-400">
              {loseTip}
            </p>
          )}

          <div className="flex w-full gap-3 mt-2">
            <button
              onClick={handleNewGame}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-warm-400 to-warm-500 px-5 py-3 text-sm font-extrabold text-white shadow-md shadow-warm-300/40 transition-all hover:shadow-lg hover:shadow-warm-300/50 active:scale-[0.97]"
              style={{ fontFamily: 'var(--font-display)', minHeight: '44px' }}
            >
              🔄 再来一局
            </button>
            <button
              onClick={handleHome}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-warm-600 ring-2 ring-warm-200 transition-all hover:bg-warm-50 hover:ring-warm-300 active:scale-[0.97]"
              style={{ minHeight: '44px' }}
            >
              🏠 返回首页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
