import { useQuery } from '@tanstack/react-query';
import { orpc } from '../../orpc-client';

export function MoveHistory({ gameId }: { gameId: string }) {
  const { data: history = [] } = useQuery({
    queryKey: ['moveHistory', gameId],
    queryFn: () => orpc.getMoveHistory({ gameId }),
  });

  const promoteLabel = (m: any) => {
    if (m.promotionTo) {
      const labels: Record<string, string> = { queen: '后', rook: '车', bishop: '象', knight: '马' };
      return `↑${labels[m.promotionTo] || m.promotionTo}`;
    }
    if (m.promoted) return '↑王';
    return null;
  };

  return (
    <div className="rounded-2xl bg-white border-2 border-warm-200 overflow-hidden shadow-sm">
      <div className="border-b border-warm-100 px-4 py-2.5 text-xs font-extrabold text-warm-500" style={{ fontFamily: 'var(--font-display)' }}>
        📜 走法记录
      </div>
      <div className="max-h-64 lg:max-h-[calc(100vh-240px)] overflow-y-auto p-2 text-sm">
        {history.length === 0 ? (
          <div className="py-5 text-center text-warm-300 text-xs font-semibold">还没有走棋</div>
        ) : (
          history.map((m: any, idx: number) => (
            <div
              key={m.moveNumber}
              className="flex items-center gap-1.5 py-1 px-2 rounded-xl hover:bg-warm-50 transition-colors"
              style={{ animationDelay: `${idx * 20}ms` }}
            >
              <span className="w-7 text-right font-mono text-[11px] text-warm-300 tabular-nums font-bold">{m.moveNumber}.</span>
              <span className={`font-extrabold text-xs ${m.player === 'human' ? 'text-warm-700' : 'text-ink-400'}`}>
                {m.player === 'human' ? '🧑你' : '🤖AI'}
              </span>
              <span className="text-warm-600 text-xs font-semibold">
                {m.from.row === -1 && m.moveType === 'pass'
                  ? '✋虚手'
                  : m.from.row === -1
                    ? `(${m.to.row},${m.to.col})`
                    : `(${m.from.row},${m.from.col})→(${m.to.row},${m.to.col})`}
              </span>
              {m.capturedCount > 0 && (
                <span className="text-coral-500 font-extrabold text-xs">×{m.capturedCount}</span>
              )}
              {promoteLabel(m) && (
                <span className="text-warm-600 font-extrabold text-xs">{promoteLabel(m)}</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
