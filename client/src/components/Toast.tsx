import type { JSX } from 'react';
import { useToastStore, type ToastType } from '../store/useToastStore';

const toastStyles: Record<ToastType, string> = {
  success: 'bg-white border-green-500 text-gray-900',
  error: 'bg-white border-red-500 text-gray-900',
  info: 'bg-white border-blue-500 text-gray-900',
};

const icons: Record<ToastType, JSX.Element> = {
  success: (
    <div className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-green-100 text-green-600">
      <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    </div>
  ),
  error: (
    <div className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-600">
      <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    </div>
  ),
  info: (
    <div className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-600">
      <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    </div>
  ),
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none w-full max-w-sm px-4 sm:px-0">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start p-4 border-l-4 rounded-lg shadow-lg transition-all duration-300 transform translate-y-0 opacity-100 ${toastStyles[toast.type]}`}
        >
          {icons[toast.type]}
          <div className="ml-3 flex-1 pt-1">
            <h3 className="text-sm font-semibold">{toast.title}</h3>
            {toast.message && (
              <p className="mt-1 text-sm text-gray-500">{toast.message}</p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-4 shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}