import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-bounce-in">
      <div className="mb-5 text-7xl animate-float select-none">🙈</div>
      <h1
        className="mb-1 text-5xl font-extrabold text-warm-300"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        404
      </h1>
      <p className="mb-8 text-sm font-bold text-warm-400">这个页面找不到啦～</p>
      <Link
        to="/"
        className="rounded-2xl bg-gradient-to-r from-warm-500 to-warm-600 px-8 py-3 text-sm font-extrabold text-white shadow-lg shadow-warm-200/40 transition-all hover:from-warm-600 hover:to-warm-700 active:scale-[0.97]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        🏠 回到首页
      </Link>
    </div>
  );
}
