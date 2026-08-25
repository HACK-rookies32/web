import { useEffect, useState, type FormEvent } from 'react';
import { Button, DetailBox, DetailRow, FormField, Modal, TextInput } from '@/shared/ui';
import { formatCurrency, formatDateTime, maskName } from '@/shared/lib/format';
import type { StorePayment } from '../types';

interface RefundModalProps {
  payment: StorePayment | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

/**
 * 강제 환불 확인 모달 (POST /admin/payments/{paymentId}/refund).
 * 사유가 요청 본문에 들어가고 감사 로그에 남으므로 필수로 받는다.
 */
export function RefundModal({ payment, submitting, onClose, onSubmit }: RefundModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (payment) {
      setReason('');
      setError(null);
    }
  }, [payment]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError('환불 사유를 입력해 주세요. 사유는 감사 로그에 기록됩니다.');
      return;
    }
    onSubmit(reason.trim());
  }

  return (
    <Modal
      open={payment !== null}
      onClose={onClose}
      title="강제 환불을 처리할까요?"
      description="자녀 지갑 잔액이 원복되며, 이 작업은 감사 로그에 자동 기록됩니다."
      footer={
        <>
          <Button onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button variant="danger" loading={submitting} onClick={handleSubmit}>
            강제 환불
          </Button>
        </>
      }
    >
      {payment ? (
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        >
          <DetailBox>
            <DetailRow label="자녀" value={maskName(payment.childName)} />
            <DetailRow label="보호자" value={maskName(payment.parentName)} />
            <DetailRow label="매장" value={payment.merchantName} />
            <DetailRow label="결제 일시" value={formatDateTime(payment.paidAt)} />
            <DetailRow label="환불 금액" value={formatCurrency(payment.amount)} />
          </DetailBox>

          <FormField label="환불 사유" required error={error}>
            {(p) => (
              <TextInput
                {...p}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="예: 오결제 민원 처리"
              />
            )}
          </FormField>
        </form>
      ) : null}
    </Modal>
  );
}
