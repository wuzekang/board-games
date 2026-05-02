import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-warm-200 bg-white/90 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between px-5 py-3">
        <Link
          to="/"
          className="flex items-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <span className="text-2xl">🎲</span>
          <span className="text-xl font-bold bg-gradient-to-r from-warm-600 to-warm-800 bg-clip-text text-transparent">
            棋趣乐园
          </span>
        </Link>
        <nav>
          <Link
            to="/"
            className="rounded-xl px-4 py-2 text-sm font-bold text-warm-600 transition-all hover:bg-warm-100 hover:text-warm-800 active:scale-[0.97]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            🏠 首页
          </Link>
        </nav>
      </div>
    </header>
  );
}
