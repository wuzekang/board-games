import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header className="sticky top-0 z-[60] flex items-center justify-between border-b-2 border-warm-200 bg-white/90 backdrop-blur-md lg:sticky lg:left-0 lg:top-0 lg:h-full lg:w-[72px] lg:flex-col lg:items-center lg:justify-between lg:border-b-0 lg:border-r-2 lg:py-4 lg:shrink-0">
      <Link
        to="/"
        className="flex items-center gap-2.5 px-5 py-3 transition-all hover:scale-[1.02] active:scale-[0.98] lg:flex-col lg:gap-1 lg:px-0 lg:py-0"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        <span className="text-2xl">🎲</span>
        <span className="text-xl font-bold bg-gradient-to-r from-warm-600 to-warm-800 bg-clip-text text-transparent lg:text-sm">
          棋趣乐园
        </span>
      </Link>
      <nav className="px-5 py-3 lg:px-0 lg:py-0">
        <Link
          to="/"
          className="rounded-xl px-4 py-2 text-sm font-bold text-warm-600 transition-all hover:bg-warm-100 hover:text-warm-800 active:scale-[0.97] lg:rounded-xl lg:px-3 lg:py-2 lg:text-lg"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          🏠
        </Link>
      </nav>
    </header>
  );
}
