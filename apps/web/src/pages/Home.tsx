import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { playSound } from '../utils/sounds';

export type GameType = 'draughts' | 'xiangqi' | 'chess' | 'gomoku' | 'go' | 'ludo' | 'jungle';

export interface GameDef {
  type: GameType;
  name: string;
  desc: string;
  emoji: string;
  gradient: string;
  boardPreview: ReactNode;
}

function range(n: number) {
  return Array.from({ length: n }, (_, i) => i);
}

function GridBoard({
  size,
  padding,
  boardColor,
  lineColor,
  children,
  defs,
}: {
  size: number;
  padding: number;
  boardColor: string;
  lineColor: string;
  children?: ReactNode;
  defs?: ReactNode;
}) {
  const v = padding * 2 + (size - 1) * 8;
  const step = (v - padding * 2) / (size - 1);
  const cellCenter = (i: number) => padding + i * step;
  return (
    <svg viewBox={`0 0 ${v} ${v}`} className="w-full h-full">
      {defs}
      <rect width={v} height={v} fill={boardColor} rx="4" />
      {range(size).map((i) => (
        <line key={`h${i}`} x1={padding} y1={cellCenter(i)} x2={v - padding} y2={cellCenter(i)} stroke={lineColor} strokeWidth="0.5" />
      ))}
      {range(size).map((i) => (
        <line key={`v${i}`} x1={cellCenter(i)} y1={padding} x2={cellCenter(i)} y2={v - padding} stroke={lineColor} strokeWidth="0.5" />
      ))}
      {children}
    </svg>
  );
}

function CheckeredBoard({
  rows,
  cols,
  lightColor,
  darkColor,
  children,
  defs,
}: {
  rows: number;
  cols: number;
  lightColor: string;
  darkColor: string;
  children?: (cc: (row: number, col: number) => { cx: number; cy: number }) => ReactNode;
  defs?: ReactNode;
}) {
  const cellSize = 8;
  const w = cols * cellSize;
  const h = rows * cellSize;
  const cellCenter = (row: number, col: number) => ({
    cx: col * cellSize + cellSize / 2,
    cy: row * cellSize + cellSize / 2,
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
      {defs}
      <rect width={w} height={h} fill={lightColor} rx="4" />
      {range(rows).map((r) =>
        range(cols).map((c) => (
          <rect
            key={`${r}-${c}`}
            x={c * cellSize}
            y={r * cellSize}
            width={cellSize}
            height={cellSize}
            fill={(r + c) % 2 === 1 ? darkColor : lightColor}
          />
        ))
      )}
      {children?.(cellCenter)}
    </svg>
  );
}

export const GAMES: GameDef[] = [
  {
    type: 'draughts',
    name: '国际跳棋',
    desc: '跳跃吃子，越界成王',
    emoji: '🏁',
    gradient: 'from-amber-400 to-orange-500',
    boardPreview: (
      <CheckeredBoard rows={4} cols={4} lightColor="#f0d9b5" darkColor="#b58863" defs={
        <pattern id="dp" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="#f0d9b5" />
          <rect x="10" width="10" height="10" fill="#b58863" />
          <rect y="10" width="10" height="10" fill="#b58863" />
          <rect x="10" y="10" width="10" height="10" fill="#f0d9b5" />
        </pattern>
      }>
        {(cc) => (
          <>
            <circle {...cc(0, 1)} r="2.8" fill="#2c2520" />
            <circle {...cc(0, 3)} r="2.8" fill="#2c2520" />
            <circle {...cc(1, 2)} r="2.8" fill="#2c2520" />
            <circle {...cc(2, 1)} r="2.8" fill="#f5f0e8" stroke="#b8a888" strokeWidth="0.6" />
            <circle {...cc(2, 3)} r="2.8" fill="#f5f0e8" stroke="#b8a888" strokeWidth="0.6" />
            <circle {...cc(3, 0)} r="2.8" fill="#f5f0e8" stroke="#b8a888" strokeWidth="0.6" />
          </>
        )}
      </CheckeredBoard>
    ),
  },
  {
    type: 'xiangqi',
    name: '中国象棋',
    desc: '楚河汉界，逐鹿中原',
    emoji: '🏛️',
    gradient: 'from-red-400 to-rose-600',
    boardPreview: (() => {
      const cols = 9;
      const rows = 10;
      const pad = 3;
      const step = 7.4;
      const w = pad * 2 + (cols - 1) * step;
      const h = pad * 2 + (rows - 1) * step;
      const c = (i: number) => pad + i * step;
      const r = (i: number) => pad + i * step;
      const stoneR = step * 0.44;
      const midY = (r(4) + r(5)) / 2;
      return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
          <rect width={w} height={h} fill="#F0D9A0" rx="3" />
          {range(rows).map((i) => (
            <line key={`h${i}`} x1={pad} y1={r(i)} x2={w - pad} y2={r(i)} stroke="#8B6914" strokeWidth="0.35" />
          ))}
          {range(cols).map((i) => (
            <line key={`vt${i}`} x1={c(i)} y1={pad} x2={c(i)} y2={r(4)} stroke="#8B6914" strokeWidth="0.35" />
          ))}
          {range(cols).map((i) => (
            <line key={`vb${i}`} x1={c(i)} y1={r(5)} x2={c(i)} y2={h - pad} stroke="#8B6914" strokeWidth="0.35" />
          ))}
          <line x1={c(3)} y1={pad} x2={c(5)} y2={r(2)} stroke="#8B6914" strokeWidth="0.25" />
          <line x1={c(5)} y1={pad} x2={c(3)} y2={r(2)} stroke="#8B6914" strokeWidth="0.25" />
          <line x1={c(3)} y1={r(7)} x2={c(5)} y2={h - pad} stroke="#8B6914" strokeWidth="0.25" />
          <line x1={c(5)} y1={r(7)} x2={c(3)} y2={h - pad} stroke="#8B6914" strokeWidth="0.25" />
          <text x={c(1)} y={midY + 1.5} fontSize="3" fill="#8B6914" fontFamily="serif" textAnchor="middle">楚 河</text>
          <text x={c(7)} y={midY + 1.5} fontSize="3" fill="#8B6914" fontFamily="serif" textAnchor="middle">漢 界</text>
          {[
            { col: 1, row: 0, text: '車', color: '#b91c1c' },
            { col: 7, row: 0, text: '車', color: '#1c1917' },
            { col: 2, row: 0, text: '馬', color: '#b91c1c' },
            { col: 4, row: 0, text: '將', color: '#1c1917' },
            { col: 1, row: 2, text: '炮', color: '#b91c1c' },
            { col: 7, row: 2, text: '炮', color: '#1c1917' },
            { col: 0, row: 3, text: '卒', color: '#1c1917' },
            { col: 2, row: 3, text: '卒', color: '#1c1917' },
            { col: 4, row: 9, text: '帥', color: '#b91c1c' },
            { col: 7, row: 9, text: '馬', color: '#b91c1c' },
            { col: 0, row: 6, text: '兵', color: '#b91c1c' },
            { col: 4, row: 6, text: '兵', color: '#b91c1c' },
          ].map((p) => (
            <g key={`${p.text}-${p.col}-${p.row}`}>
              <circle cx={c(p.col)} cy={r(p.row)} r={stoneR} fill="#f0dbb8" stroke={p.color} strokeWidth="0.35" />
              <text x={c(p.col)} y={r(p.row) + 1.2} fontSize="3.2" fill={p.color} fontFamily="serif" textAnchor="middle" fontWeight="bold">{p.text}</text>
            </g>
          ))}
        </svg>
      );
    })(),
  },
  {
    type: 'chess',
    name: '国际象棋',
    desc: '王后博弈，智者胜出',
    emoji: '👑',
    gradient: 'from-violet-400 to-purple-600',
    boardPreview: (() => {
      const cs = 8;
      const w = cs * 4;
      const cc = (row: number, col: number) => ({
        cx: col * cs + cs / 2,
        cy: row * cs + cs / 2,
      });
      const pieces = [
        { row: 3, col: 0, sym: '♜', white: true },
        { row: 3, col: 1, sym: '♛', white: true },
        { row: 3, col: 2, sym: '♚', white: false },
        { row: 2, col: 2, sym: '♞', white: false },
        { row: 0, col: 0, sym: '♟', white: false },
        { row: 0, col: 1, sym: '♟', white: false },
        { row: 0, col: 2, sym: '♟', white: false },
        { row: 0, col: 3, sym: '♟', white: false },
      ];
      return (
        <svg viewBox={`0 0 ${w} ${w}`} className="w-full h-full">
          <rect width={w} height={w} rx="4" fill="#f0d9b5" />
          {range(4).map((r) =>
            range(4).map((c) => (
              <rect key={`${r}-${c}`} x={c * cs} y={r * cs} width={cs} height={cs} fill={(r + c) % 2 === 1 ? '#b58863' : '#f0d9b5'} />
            ))
          )}
          {pieces.map((p, i) => {
            const { cx, cy } = cc(p.row, p.col);
            return (
              <text
                key={i}
                x={cx}
                y={cy + 3}
                fontSize="6"
                textAnchor="middle"
                fontFamily="serif"
                fill={p.white ? '#fff' : '#1a1a1a'}
                stroke={p.white ? '#666' : 'none'}
                strokeWidth={p.white ? '0.2' : '0'}
              >
                {p.sym}
              </text>
            );
          })}
        </svg>
      );
    })(),
  },
  {
    type: 'gomoku',
    name: '五子棋',
    desc: '五子连珠，先到先赢',
    emoji: '⚫',
    gradient: 'from-slate-500 to-zinc-700',
    boardPreview: (
      <GridBoard size={5} padding={8} boardColor="#DCB468" lineColor="#8B6914" defs={
        <>
          <radialGradient id="gmbs" cx="0.35" cy="0.35" r="0.65">
            <stop offset="0%" stopColor="#5a4a3a" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#12100d" />
          </radialGradient>
          <radialGradient id="gmws" cx="0.35" cy="0.35" r="0.65">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="80%" stopColor="#d4c4a8" />
          </radialGradient>
        </>
      }>
        <GomokuGoStones size={5} padding={8} stones={[
          { row: 0, col: 1, dark: true },
          { row: 1, col: 0, dark: false },
          { row: 1, col: 2, dark: true },
          { row: 2, col: 1, dark: false },
          { row: 2, col: 3, dark: true },
        ]} />
      </GridBoard>
    ),
  },
  {
    type: 'go',
    name: '围棋',
    desc: '天地之间，黑白对弈',
    emoji: '🌀',
    gradient: 'from-emerald-400 to-teal-600',
    boardPreview: (
      <GridBoard size={5} padding={8} boardColor="#DCB468" lineColor="#8B6914" defs={
        <>
          <radialGradient id="gobs" cx="0.35" cy="0.35" r="0.65">
            <stop offset="0%" stopColor="#5a4a3a" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#12100d" />
          </radialGradient>
          <radialGradient id="gows" cx="0.35" cy="0.35" r="0.65">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="80%" stopColor="#d4c4a8" />
          </radialGradient>
        </>
      }>
        <GomokuGoStones size={5} padding={8} stones={[
          { row: 1, col: 2, dark: true },
          { row: 2, col: 1, dark: false },
          { row: 2, col: 3, dark: true },
          { row: 3, col: 2, dark: false },
        ]} starPoints />
      </GridBoard>
    ),
  },
  {
    type: 'ludo',
    name: '飞行棋',
    desc: '4人竞速，骰子决定',
    emoji: '✈️',
    gradient: 'from-sky-400 to-blue-600',
    boardPreview: (() => {
      const s = 80;
      const baseSize = s * 0.38;
      const centerStart = baseSize;
      const centerEnd = s - baseSize;
      const centerSize = centerEnd - centerStart;
      return (
        <svg viewBox={`0 0 ${s} ${s}`} className="w-full h-full">
          <rect width={s} height={s} fill="#f8f0e0" rx="4" />
          <rect x="0" y="0" width={baseSize} height={baseSize} fill="#fecaca" rx="4" />
          <rect x={s - baseSize} y="0" width={baseSize} height={baseSize} fill="#bfdbfe" rx="4" />
          <rect x="0" y={s - baseSize} width={baseSize} height={baseSize} fill="#d9f99d" rx="4" />
          <rect x={s - baseSize} y={s - baseSize} width={baseSize} height={baseSize} fill="#fde68a" rx="4" />
          <rect x={centerStart} y={centerStart} width={centerSize} height={centerSize} fill="#fff" stroke="#ccc" strokeWidth="0.5" />
          <path d={`M${centerStart} ${s / 2}H${4}M${centerEnd} ${s / 2}H${s - 4}M${s / 2} ${centerStart}V4M${s / 2} ${centerEnd}V${s - 4}`} stroke="#999" strokeWidth="2" strokeLinecap="round" />
          <circle cx={baseSize * 0.3} cy={baseSize * 0.3} r="4" fill="#ef4444" />
          <circle cx={s - baseSize * 0.3} cy={baseSize * 0.3} r="4" fill="#3b82f6" />
          <circle cx={baseSize * 0.3} cy={s - baseSize * 0.3} r="4" fill="#22c55e" />
          <circle cx={s - baseSize * 0.3} cy={s - baseSize * 0.3} r="4" fill="#eab308" />
        </svg>
      );
    })(),
  },
  {
    type: 'jungle',
    name: '斗兽棋',
    desc: '象狮虎豹，鼠克巨象',
    emoji: '🐘',
    gradient: 'from-lime-400 to-green-600',
    boardPreview: (() => {
      const cols = 7;
      const rows = 9;
      const pad = 3;
      const step = 7;
      const w = pad * 2 + (cols - 1) * step;
      const h = pad * 2 + (rows - 1) * step;
      const c = (i: number) => pad + i * step;
      const r = (i: number) => pad + i * step;
      const riverCells = [
        { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 4 }, { row: 3, col: 5 },
        { row: 4, col: 1 }, { row: 4, col: 2 }, { row: 4, col: 4 }, { row: 4, col: 5 },
        { row: 5, col: 1 }, { row: 5, col: 2 }, { row: 5, col: 4 }, { row: 5, col: 5 },
      ];
      const cellW = step * 0.9;
      const cellH = step * 0.9;
      return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
          <rect width={w} height={h} fill="#a5d6a7" rx="3" />
          {range(rows).map((i) => (
            <line key={`h${i}`} x1={pad} y1={r(i)} x2={w - pad} y2={r(i)} stroke="#66bb6a" strokeWidth="0.3" />
          ))}
          {range(cols).map((i) => (
            <line key={`v${i}`} x1={c(i)} y1={pad} x2={c(i)} y2={h - pad} stroke="#66bb6a" strokeWidth="0.3" />
          ))}
          {riverCells.map((rc) => (
            <rect key={`r${rc.row}-${rc.col}`}
              x={c(rc.col) - cellW / 2} y={r(rc.row) - cellH / 2}
              width={cellW} height={cellH} fill="#42a5f5" rx="1.5" opacity="0.7" />
          ))}
          {[
            { col: 3, row: 0, text: '★', color: '#1c1917' },
            { col: 3, row: 8, text: '★', color: '#b91c1c' },
          ].map((p) => (
            <text key={p.text + p.col + p.row} x={c(p.col)} y={r(p.row) + 1.5} fontSize="3" fill={p.color} fontFamily="serif" textAnchor="middle" fontWeight="bold">{p.text}</text>
          ))}
          {[
            { col: 2, row: 0, text: '✕', color: '#1c1917' },
            { col: 4, row: 0, text: '✕', color: '#1c1917' },
            { col: 3, row: 1, text: '✕', color: '#1c1917' },
            { col: 2, row: 8, text: '✕', color: '#b91c1c' },
            { col: 4, row: 8, text: '✕', color: '#b91c1c' },
            { col: 3, row: 7, text: '✕', color: '#b91c1c' },
          ].map((p) => (
            <text key={p.text + p.col + p.row} x={c(p.col)} y={r(p.row) + 1.5} fontSize="3" fill={p.color} fontFamily="serif" textAnchor="middle" fontWeight="bold">{p.text}</text>
          ))}
          {[
            { col: 0, row: 0, text: '虎', color: '#1c1917' },
            { col: 6, row: 0, text: '狮', color: '#1c1917' },
            { col: 0, row: 8, text: '狮', color: '#b91c1c' },
            { col: 6, row: 8, text: '虎', color: '#b91c1c' },
            { col: 0, row: 6, text: '象', color: '#b91c1c' },
            { col: 2, row: 6, text: '豹', color: '#b91c1c' },
            { col: 2, row: 2, text: '豹', color: '#1c1917' },
            { col: 6, row: 2, text: '象', color: '#1c1917' },
          ].map((p) => (
            <g key={p.text + p.col + p.row}>
              <circle cx={c(p.col)} cy={r(p.row)} r={step * 0.38} fill="#f0dbb8" stroke={p.color} strokeWidth="0.3" />
              <text x={c(p.col)} y={r(p.row) + 1.2} fontSize="2.8" fill={p.color} fontFamily="serif" textAnchor="middle" fontWeight="bold">{p.text}</text>
            </g>
          ))}
        </svg>
      );
    })(),
  },
];

function GomokuGoStones({
  size,
  padding,
  stones,
  starPoints,
}: {
  size: number;
  padding: number;
  stones: { row: number; col: number; dark: boolean }[];
  starPoints?: boolean;
}) {
  const v = padding * 2 + (size - 1) * 8;
  const step = (v - padding * 2) / (size - 1);
  const pos = (i: number) => padding + i * step;
  const stoneR = step * 0.34;
  return (
    <>
      {starPoints && <circle cx={pos(2)} cy={pos(2)} r="1.5" fill="#8B6914" />}
      {stones.map((s, i) => (
        <circle
          key={i}
          cx={pos(s.col)}
          cy={pos(s.row)}
          r={stoneR}
          fill={s.dark ? 'url(#gobs)' : 'url(#gows)'}
        />
      ))}
    </>
  );
}

export function Home() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-5xl flex flex-col px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="flex-none flex items-center justify-center gap-3 px-4 pt-6 sm:pt-8 pb-2">
        <span className="text-4xl sm:text-5xl animate-float select-none">🎲</span>
        <h1
          className="text-4xl sm:text-5xl font-bold tracking-wide text-warm-800"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          棋趣乐园
        </h1>
      </div>

      <p
        className="flex-none text-center text-sm sm:text-base font-bold text-warm-400 pb-4 sm:pb-6"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        选一个棋，开始玩吧！
      </p>

      <div className="flex-1 min-h-0 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 content-start px-4 sm:px-6 lg:px-8 pb-6">
        {GAMES.map((game, idx) => (
          <button
            key={game.type}
            onClick={() => { playSound('click'); navigate(`/setup/${game.type}`); }}
            className="game-card-enter group relative flex flex-col items-center rounded-3xl border-2 border-warm-200 bg-white/70 p-4 sm:p-5 lg:p-6 transition-all duration-300 hover:bg-white hover:shadow-xl hover:scale-[1.03] active:scale-[0.97] hover:border-warm-300"
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br opacity-0 group-hover:opacity-[0.04] transition-opacity" style={{ backgroundImage: `linear-gradient(135deg, var(--tw-gradient-stops))` }} />
            <div className={`w-14 h-14 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-2xl bg-gradient-to-br ${game.gradient} flex items-center justify-center mb-2 sm:mb-3 shadow-md`}>
              <div className="w-10 h-10 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl overflow-hidden">
                {game.boardPreview}
              </div>
            </div>
            <span
              className="text-sm sm:text-base lg:text-lg font-extrabold text-warm-800 text-center whitespace-nowrap"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {game.name}
            </span>
            <span
              className="text-[10px] sm:text-xs lg:text-sm mt-0.5 font-semibold text-warm-400 text-center whitespace-nowrap"
            >
              {game.desc}
            </span>
          </button>
        ))}
      </div>

      <footer className="flex-none text-center py-4 text-xs font-semibold text-warm-300">
        每一步，都算数
      </footer>
    </div>
  );
}
