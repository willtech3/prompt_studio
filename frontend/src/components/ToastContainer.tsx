import { useToastStore } from '../store/toastStore'

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const remove = useToastStore((s) => s.remove)
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`toast ${t.type}`}
          onClick={() => remove(t.id)}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
