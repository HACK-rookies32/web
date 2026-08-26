import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  /** 하단 버튼 영역 */
  footer?: ReactNode;
  /** 본문 최대 폭 */
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

/**
 * 가운데 정렬 모달.
 * ESC / 배경 클릭으로 닫히고, 열릴 때 첫 포커스 가능한 요소로 포커스를 옮긴다.
 * 열려 있는 동안 배경 스크롤을 막는다.
 */
/** 포커스를 줄 수 있는 요소 */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** 열릴 때 포커스를 받을 요소 — 닫기(×) 버튼은 제외한다. */
const FIRST_FIELD =
  'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])';

export function Modal({ open, onClose, title, description, footer, size = 'md', children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  /*
   * onClose 를 ref 로 들고 간다.
   *
   * 호출부가 onClose={() => setOpen(false)} 처럼 인라인 화살표를 넘기면 렌더마다
   * 함수 정체성이 바뀐다. 이걸 아래 effect 의 의존성에 그대로 두면, 모달 안에서
   * 글자를 한 자 칠 때마다 effect 가 정리·재실행되면서 포커스를 빼앗아 간다.
   * (실제로 유해사이트 키워드 추가에서 한 글자마다 포커스가 × 버튼으로 튀었다)
   */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }

      // 간단한 포커스 트랩 — 모달 밖으로 탭이 새지 않게 한다.
      if (e.key !== 'Tab' || !panelRef.current) return;

      const focusables = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);

    /*
     * 본문의 첫 입력 요소로 포커스를 옮긴다.
     * 패널 전체에서 찾으면 헤더의 닫기(×) 버튼이 DOM 상 가장 앞이라 늘 거기로 갔다.
     * 폼 모달은 첫 입력칸에, 확인용 모달은 본문 버튼 → 없으면 푸터 버튼 순으로 간다.
     */
    const timer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      /*
       * 쉼표로 나열한 선택자에 `.modal__body ` 를 앞에 붙이면 첫 항목에만 적용되고
       * 나머지는 패널 전체에서 잡힌다. 그래서 영역 요소를 먼저 찾아 그 안에서 검색한다.
       */
      const body = panel.querySelector<HTMLElement>('.modal__body');
      const modalFooter = panel.querySelector<HTMLElement>('.modal__footer');
      const target =
        body?.querySelector<HTMLElement>(FIRST_FIELD) ??
        modalFooter?.querySelector<HTMLElement>(FIRST_FIELD) ??
        panel.querySelector<HTMLElement>(FIRST_FIELD);
      target?.focus();
    }, 0);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      window.clearTimeout(timer);
      restoreFocusRef.current?.focus();
    };
    // onClose 는 위 ref 로 참조한다. 여기 넣으면 렌더마다 재실행돼 포커스를 빼앗는다.
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="modal-root">
      <div className="modal__backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className={`modal modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        ref={panelRef}
      >
        <header className="modal__header">
          <div className="modal__heading">
            <h2 className="modal__title">{title}</h2>
            {description ? <p className="modal__description">{description}</p> : null}
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="닫기">
            <CloseGlyph />
          </button>
        </header>

        <div className="modal__body">{children}</div>

        {footer ? <footer className="modal__footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}

/** 닫기(×) 글리프. 토큰 색을 따르도록 currentColor 로 그린다. */
export function CloseGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M1 1L13 13M13 1L1 13"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
