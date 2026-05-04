import { Outlet } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/ui/ToastContainer';

export function App() {
  return (
    <div className="h-[100dvh] bg-warm-50 bg-pattern-warm">
      <div className="flex h-full flex-col lg:flex-row">
        <Header />
        <main className="flex-1 min-h-0 min-w-0 overflow-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
