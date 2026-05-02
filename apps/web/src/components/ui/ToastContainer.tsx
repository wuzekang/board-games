import { useToasts } from '../../hooks/useToast';

export function ToastContainer() {
  const toasts = useToasts();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 z-50 flex flex-col gap-2 sm:left-auto">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-coral-600 shadow-lg ring-2 ring-coral-200 animate-slide-up"
        >
          😅 {t.message}
        </div>
      ))}
    </div>
  );
}
