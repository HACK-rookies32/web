import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CloseGlyph } from './Modal';
import './SlideOver.css';

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** 제목 아래 보조 정보 */
  subtitle?: ReactNode;
  /** 하단 고정 액션 영역 */
  footer?: ReactNode;
  /** Figma 결제 상세 패널 기준 400px */
  width?: number;
  children: ReactNode;
}

/**
 * 오른쪽에서 밀려 나오는 패널.
 * 회원 관리의 "빠른 보기", 자금·결제 관리의 "지갑 상세"에 쓴다.
 */
export function SlideOver({ open, onClose, title, subtitle, footer, width = 400, children }: SlideOverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  /*
   * Modal 과 같은 이유로 onClose 를 ref 로 들고 간다.
   * 인라인 화살표를 넘기면 렌더마다 정체성이 바뀌어, 패널 안에서 글자를 칠 때마다
   * effect 가 재실행되며 포커스를 빼앗는다.
   */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current();
    }
    document.addEventListener('keydown', onKeyDown);

    const timer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('button:not([disabled])')?.focus();
    }, 0);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(timer);
      restoreFocusRef.current?.focus();
    };
    // onClose 는 ref 로 참조한다. 의존성에 넣으면 렌더마다 포커스가 튄다.
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="slideover-root">
      <div className="slideover__backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        className="slideover"
        style={{ width: `${width}px` }}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        ref={panelRef}
      >
        <header className="slideover__header">
          <div className="slideover__heading">
            <h2 className="slideover__title">{title}</h2>
            {subtitle ? <p className="slideover__subtitle">{subtitle}</p> : null}
          </div>
          <button type="button" className="slideover__close" onClick={onClose} aria-label="닫기">
            <CloseGlyph />
          </button>
        </header>

        <div className="slideover__body">{children}</div>

        {footer ? <footer className="slideover__footer">{footer}</footer> : null}
      </aside>
    </div>,
    document.body,
  );
}

/* --------------------------------------------------------- 내부 보조 UI -- */

/** 라벨-값 한 줄. 결제 상세의 "청구 정보"처럼 정의형 목록에 쓴다. */
export function DetailRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="detail-row">
      <dt className="detail-row__label">{label}</dt>
      <dd className="detail-row__value">{value}</dd>
    </div>
  );
}

/** DetailRow 를 감싸는 박스. Figma: surface-tint 배경 + radius 8. */
export function DetailBox({ children }: { children: ReactNode }) {
  return <dl className="detail-box">{children}</dl>;
}
