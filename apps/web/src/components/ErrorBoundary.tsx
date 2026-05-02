import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 animate-bounce-in">
          <div className="mb-5 text-6xl select-none">😵</div>
          <h1
            className="mb-1 text-2xl font-extrabold text-warm-700"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            出错了
          </h1>
          <p className="mb-8 text-sm text-warm-400 font-semibold">
            {this.state.error?.message ?? '发生了未知错误'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
            className="rounded-2xl bg-gradient-to-r from-warm-500 to-warm-600 px-8 py-3 text-sm font-extrabold text-white shadow-lg shadow-warm-200/40 transition-all hover:from-warm-600 hover:to-warm-700 active:scale-[0.97]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            🏠 回到首页
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
