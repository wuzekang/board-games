import { Outlet } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/ui/ToastContainer';

export function App() {
  return (
    <div className="min-h-screen bg-warm-50 bg-pattern-warm">
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="container mx-auto flex-1 px-4 py-4 sm:px-5 sm:py-5">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
        <footer className="border-t-2 border-warm-200 py-3 text-center text-xs font-bold text-warm-400" style={{ fontFamily: 'var(--font-display)' }}>
          棋趣乐园 · 没有广告，不要会员，专心下棋 🎲
        </footer>
      </div>
      <ToastContainer />
    </div>
  );
}
