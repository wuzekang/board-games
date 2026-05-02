import { PieceColor } from '@board-games/shared';
import { ChessPieceType } from '@board-games/shared/chess';

const PROMOTION_CHOICES = [
  { type: ChessPieceType.QUEEN, symbol: { light: '♕', dark: '♛' }, label: '后', emoji: '👑' },
  { type: ChessPieceType.ROOK, symbol: { light: '♖', dark: '♜' }, label: '车', emoji: '🏰' },
  { type: ChessPieceType.BISHOP, symbol: { light: '♗', dark: '♝' }, label: '象', emoji: '🧭' },
  { type: ChessPieceType.KNIGHT, symbol: { light: '♘', dark: '♞' }, label: '马', emoji: '🐎' },
];

export function PromotionDialog({
  color,
  onSelect,
  onCancel,
}: {
  color: PieceColor;
  onSelect: (piece: ChessPieceType) => void;
  onCancel: () => void;
}) {
  const symbols = color === PieceColor.LIGHT ? 'light' : 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in" onClick={onCancel}>
      <div
        className="mx-4 w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-warm-200 animate-bounce-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 text-center text-lg font-extrabold text-warm-800" style={{ fontFamily: 'var(--font-display)' }}>
          ✨ 选择升变棋子
        </div>
        <div className="grid grid-cols-4 gap-3">
          {PROMOTION_CHOICES.map((choice) => (
            <button
              key={choice.type}
              onClick={() => onSelect(choice.type)}
              className="flex flex-col items-center rounded-2xl py-4 transition-all hover:bg-warm-50 hover:scale-105 active:scale-[0.95] border-2 border-transparent hover:border-warm-300"
            >
              <span className="text-4xl leading-none drop-shadow-sm">{choice.symbol[symbols]}</span>
              <span className="mt-2 text-xs font-extrabold text-warm-600" style={{ fontFamily: 'var(--font-display)' }}>
                {choice.emoji} {choice.label}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={onCancel}
          className="mt-4 w-full rounded-2xl py-2.5 text-sm font-bold text-warm-400 transition-all hover:text-warm-600 hover:bg-warm-50 active:scale-[0.97]"
        >
          取消
        </button>
      </div>
    </div>
  );
}
