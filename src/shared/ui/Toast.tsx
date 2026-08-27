import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import type { ToastMessage } from '@/shared/lib/types';
import { CloseGlyph } from './Modal';
import './Toast.css';

type ToastInput = Omit<ToastMessage, 'id'>;

interface ToastContextValue {
  /** 토스트를 띄운다. 4초 뒤 자동으로 사라진다. */
  showToast: (toast: ToastInput) => void;
  /** 성공 토스트 단축 함수 (CSV 생성 완료, 환불 처리 완료 등) */
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: ToastInput) => {
      const id = `toast-${(seq.current += 1)}`;
      setToasts((prev) => [...prev, { ...toast, id }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const success = useCallback(
    (title: string, description?: string) => showToast({ tone: 'success', title, description }),
    [showToast],
  );

  const error = useCallback(
    (title: string, description?: string) => showToast({ tone: 'danger', title, description }),
    [showToast],
  );

  const value = useMemo<ToastContextValue>(
    () => ({ showToast, success, error }),
    [showToast, success, error],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="toast-stack" role="region" aria-label="알림">
          {toasts.map((t) => (
            <output key={t.id} className={`toast toast--${t.tone}`}>
              <span className="toast__mark" aria-hidden="true" />
              <div className="toast__content">
                <p className="toast__title">{t.title}</p>
                {t.description ? <p className="toast__description">{t.description}</p> : null}
              </div>
              <button
                type="button"
                className="toast__close"
                onClick={() => dismiss(t.id)}
                aria-label="알림 닫기"
              >
                <CloseGlyph />
              </button>
            </output>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast 는 ToastProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}
