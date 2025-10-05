import { useToastStore } from '../store/toastStore'

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const remove = useToastStore((s) => s.remove)
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={[
            'min-w-[220px] max-w-[360px] rounded-md shadow border px-3 py-2 text-sm',
            'backdrop-blur bg-white/80 dark:bg-gray-900/80',
            t.type === 'success' ? 'border-emerald-300 text-emerald-900 dark:text-emerald-200' : '',
            t.type === 'error' ? 'border-rose-300 text-rose-900 dark:text-rose-200' : '',
            t.type === 'info' ? 'border-blue-300 text-blue-900 dark:text-blue-200' : '',
          ].join(' ')}
          onClick={() => remove(t.id)}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}

