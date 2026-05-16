import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  message: string;
  actions?: ToastAction[];
  dismiss: () => void;
}

let toastQueue: ToastItem[] = [];
let nextId = 0;
let setToastsExternal: ((toasts: ToastItem[]) => void) | null = null;

// Track remaining time for each toast (for hover-pause)
const toastTimers = new Map<number, { timer: ReturnType<typeof setTimeout>; remaining: number; start: number }>();

function dismissToast(id: number) {
  const t = toastTimers.get(id);
  if (t) { clearTimeout(t.timer); toastTimers.delete(id); }
  toastQueue = toastQueue.filter(t => t.id !== id);
  setToastsExternal?.(toastQueue);
}

function showToast(message: string, duration = 2000) {
  const id = nextId++;
  const item: ToastItem = { id, message, dismiss: () => dismissToast(id) };
  toastQueue = [...toastQueue, item];
  setToastsExternal?.(toastQueue);
  const start = Date.now();
  toastTimers.set(id, {
    timer: setTimeout(() => dismissToast(id), duration),
    remaining: duration,
    start,
  });
}

function showToastWithAction(message: string, actions: ToastAction[], duration = 5000) {
  const id = nextId++;
  const item: ToastItem = {
    id,
    message,
    actions: actions.map(a => ({
      label: a.label,
      onClick: () => { a.onClick(); dismissToast(id); },
    })),
    dismiss: () => dismissToast(id),
  };
  toastQueue = [...toastQueue, item];
  setToastsExternal?.(toastQueue);
  toastTimers.set(id, {
    timer: setTimeout(() => dismissToast(id), duration),
    remaining: duration,
    start: Date.now(),
  });
}

// Pause/resume timer for a specific toast (called on hover)
function pauseToast(id: number) {
  const t = toastTimers.get(id);
  if (!t) return;
  clearTimeout(t.timer);
  t.remaining -= (Date.now() - t.start);
  if (t.remaining < 0) t.remaining = 0;
}

function resumeToast(id: number) {
  const t = toastTimers.get(id);
  if (!t || t.remaining <= 0) { dismissToast(id); return; }
  t.start = Date.now();
  t.timer = setTimeout(() => dismissToast(id), t.remaining);
}

export { showToast, showToastWithAction };

function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  setToastsExternal = setToasts;

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map(t => (
        <ToastMessage key={t.id} message={t.message} actions={t.actions} onHoverChange={(hovering) => {
          if (hovering) pauseToast(t.id); else resumeToast(t.id);
        }} />
      ))}
    </div>
  );
}

function ToastMessage({ message, actions, onHoverChange }: { message: string; actions?: ToastAction[]; onHoverChange: (hovering: boolean) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      className={`
        px-4 py-2 rounded-lg bg-[#2f2f2f] text-white text-sm shadow-lg
        transition-all duration-300 ease-in-out pointer-events-auto
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
    >
      <div className="flex items-center gap-3">
        <span>{message}</span>
        {actions?.map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            className="text-white hover:text-white/80 font-medium transition-colors"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Mount the container once
let mounted = false;
function mountToastContainer() {
  if (mounted) return;
  mounted = true;
  const div = document.createElement('div');
  div.id = 'toast-root';
  document.body.appendChild(div);
  const root = createRoot(div);
  root.render(<ToastContainer />);
}

// Auto-mount on import
if (typeof document !== 'undefined') {
  mountToastContainer();
}
