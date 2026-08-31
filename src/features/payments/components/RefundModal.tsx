import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Button, DetailBox, DetailRow, FormField, Modal, TextInput } from '@/shared/ui';

interface RefundModalProps {
  open: boolean;
  title: string;
  /** 잔액이 어느 방향으로 움직이는지 반드시 적는다. 충전 취소와 매장 결제 환불은 방향이 반대다. */
  description: string;
  confirmLabel: string;
  /** 무엇을 되돌리는지 확인할 수 있는 요약. */
  details: { label: string; value: ReactNode }[];
  reasonPlaceholder: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

/**
 * 환불·취소 확인 모달.
 *
 * 매장 결제 강제 환불(POST /api/admin/finance/payments/{qrToken}/force-refund — 웹은 쓰지 않는다)과
 * 충전 취소 두 곳이 같은 절차를 쓴다 — 대상을 확인하고, 사유를 받고, 실행한다.
 * 사유는 요청 본문에 들어가 감사 로그에 남으므로 항상 필수다.
 */
export function RefundModal({
  open,
  title,
  description,
  confirmLabel,
  details,
  reasonPlaceholder,
  submitting,
  onClose,
  onSubmit,
}: RefundModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason('');
      setError(null);
    }
  }, [open]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError('사유를 입력해 주세요. 사유는 감사 로그에 기록됩니다.');
      return;
    }
    onSubmit(reason.trim());
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button variant="danger" loading={submitting} onClick={handleSubmit}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {open ? (
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        >
          <DetailBox>
            {details.map((row) => (
              <DetailRow key={row.label} label={row.label} value={row.value} />
            ))}
          </DetailBox>

          <FormField label="사유" required error={error}>
            {(p) => (
              <TextInput
                {...p}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={reasonPlaceholder}
              />
            )}
          </FormField>
        </form>
      ) : null}
    </Modal>
  );
}
