import type { ReactNode } from 'react';
import { Button, type ButtonVariant } from './Button';
import { Modal } from './Modal';

interface ConfirmModalProps {
  open: boolean;
  title: ReactNode;
  /** 제목 아래 보조 설명 */
  description?: ReactNode;
  /** 확인 문구. 문자열이면 강조 스타일로 감싼다. */
  children?: ReactNode;
  /** 실행 버튼 문구 (기본 "삭제") */
  confirmLabel?: string;
  /** 실행 버튼 모양 (기본 danger) */
  confirmVariant?: ButtonVariant;
  /** 진행 중이면 버튼이 잠기고 모달을 닫을 수 없다. */
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * 되돌릴 수 없는 작업을 한 번 더 확인받는 모달.
 *
 * 회원 삭제 · 공지 삭제 · 키워드 제외 · 게시글 삭제처럼 같은 모양이 여러 화면에
 * 흩어져 있었는데, 진행 중 닫기를 막는지 여부가 화면마다 달랐다. 여기로 모으면서
 * **진행 중에는 ESC · 배경 클릭 · 취소가 모두 잠기도록** 통일했다.
 * 실수로 두 번 실행되거나, 요청이 날아간 채 모달만 닫히는 일을 막는다.
 */
export function ConfirmModal({
  open,
  title,
  description,
  children,
  confirmLabel = '삭제',
  confirmVariant = 'danger',
  pending = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  /** 진행 중에는 닫히지 않는다. */
  function handleClose() {
    if (pending) return;
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button onClick={handleClose} disabled={pending}>
            취소
          </Button>
          <Button variant={confirmVariant} loading={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {typeof children === 'string' ? <p className="confirm-modal__text">{children}</p> : children}
    </Modal>
  );
}
