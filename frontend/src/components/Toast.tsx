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
}

let toastQueue: ToastItem[] = [];
let nextId = 0;
let setToastsExternal: ((toasts: ToastItem[]) => void) | null = null;

function showToast(message: string, duration = 2000) {
  const id = nextId++;
  toastQueue = [...toastQueue, { id, message }];
  setToastsExternal?.(toastQueue);
  setTimeout(() => {
    toastQueue = toastQueue.filter(t => t.id !== id);
    setToastsExternal?.(toastQueue);
  }, duration);
}

function showToastWithAction(message: string, actions: ToastAction[], duration = 5000) {
  const id = nextId++;
  const dismiss = () => {
    toastQueue = toastQueue.filter(t => t.id !== id);
    setToastsExternal?.(toastQueue);
  };
  toastQueue = [...toastQueue, {
    id,
    message,
    actions: actions.map(a => ({
      label: a.label,
      onClick: () => {
        a.onClick();
        dismiss();
      },
    })),
  }];
  setToastsExternal?.(toastQueue);
  setTimeout(dismiss, duration);
}

export { showToast, showToastWithAction };

function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  setToastsExternal = setToasts;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map(t => (
        <ToastMessage key={t.id} message={t.message} actions={t.actions} />
      ))}
    </div>
  );
}

function ToastMessage({ message, actions }: { message: string; actions?: ToastAction[] }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
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
            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
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
