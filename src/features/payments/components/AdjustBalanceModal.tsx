import { useEffect, useState, type FormEvent } from 'react';
import { Button, DetailBox, DetailRow, FormField, Modal, TextInput } from '@/shared/ui';
import { formatCurrency, maskName, memberRef } from '@/shared/lib/format';
import { formatSignedAmount, type WalletSummary } from '@/shared/lib/wallet';

interface AdjustBalanceModalProps {
  wallet: WalletSummary | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (amount: number, reason: string) => void;
}

/**
 * 잔액 수동 조정 모달 (POST /admin/wallets/{userId}/adjust).
 *
 * 명세상 amount 는 +/- 모두 허용되고 reason 은 필수다(누락 시 400 INVALID_PARAMETER).
 * 조정 후 잔액이 음수가 되는 입력은 보내기 전에 막는다.
 */
export function AdjustBalanceModal({ wallet, submitting, onClose, onSubmit }: AdjustBalanceModalProps) {
  const [sign, setSign] = useState<1 | -1>(1);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (wallet) {
      setSign(1);
      setAmount('');
      setReason('');
      setError(null);
    }
  }, [wallet]);

  const parsed = Number(amount.replace(/[^\d]/g, ''));
  const signed = Number.isFinite(parsed) ? parsed * sign : 0;
  const nextBalance = wallet ? wallet.balance + signed : 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!parsed || parsed <= 0) {
      setError('조정 금액을 입력해 주세요.');
      return;
    }
    if (!reason.trim()) {
      setError('조정 사유를 입력해 주세요. 사유는 필수이며 감사 로그에 기록됩니다.');
      return;
    }
    if (nextBalance < 0) {
      setError('조정 후 잔액이 음수가 될 수 없습니다.');
      return;
    }

    onSubmit(signed, reason.trim());
  }

  return (
    <Modal
      open={wallet !== null}
      onClose={onClose}
      title="지갑 잔액을 조정할까요?"
      description="예외 상황 보정용입니다. 사유는 필수이며 감사 로그에 자동 기록됩니다."
      footer={
        <>
          <Button onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button variant="primary" loading={submitting} onClick={handleSubmit}>
            잔액 조정
          </Button>
        </>
      }
    >
      {wallet ? (
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        >
          <DetailBox>
            <DetailRow
              label="대상"
              value={`${maskName(wallet.userName)} (${memberRef(wallet.userId, wallet.role === 'CHILD' ? '자녀' : '회원')})`}
            />
            <DetailRow label="현재 잔액" value={formatCurrency(wallet.balance)} />
            <DetailRow
              label="조정 후 잔액"
              value={
                <span style={{ color: nextBalance < 0 ? 'var(--danger)' : undefined }}>
                  {formatCurrency(nextBalance)}
                </span>
              }
            />
          </DetailBox>

          <FormField label="조정 방향">
            {() => (
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <Button
                  variant={sign === 1 ? 'primary' : 'secondary'}
                  onClick={() => setSign(1)}
                  aria-pressed={sign === 1}
                >
                  증액 (+)
                </Button>
                <Button
                  variant={sign === -1 ? 'danger' : 'secondary'}
                  onClick={() => setSign(-1)}
                  aria-pressed={sign === -1}
                >
                  차감 (−)
                </Button>
              </div>
            )}
          </FormField>

          <FormField
            label="조정 금액"
            required
            hint={parsed > 0 ? `${formatSignedAmount(signed)} 적용됩니다.` : '원 단위로 입력하세요.'}
          >
            {(p) => (
              <TextInput
                {...p}
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="예: 2000"
              />
            )}
          </FormField>

          <FormField label="조정 사유" required error={error}>
            {(p) => (
              <TextInput
                {...p}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="예: 결제 취소 건 잔액 보정"
              />
            )}
          </FormField>
        </form>
      ) : null}
    </Modal>
  );
}
