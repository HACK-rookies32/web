import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Button,
  DetailBox,
  DetailRow,
  EmptyState,
  Icon,
  LoadingBlock,
  StatusPill,
} from '@/shared/ui';
import { formatCurrency, formatDate, formatDateTime, maskCard, maskEmail, maskName } from '@/shared/lib/format';
import { SUBSCRIPTION_STATUS } from '@/shared/lib/status';
import { fetchPaymentDetail, paymentKeys } from '../api';
import './PaymentDetailPanel.css';

interface PaymentDetailPanelProps {
  subscriptionId: number;
  /** 카드번호 원문. 마스킹 해제 상태일 때만 값이 있다. */
  unmaskedCard: string | null;
  canManage: boolean;
  unmasking: boolean;
  onUnmask: () => void;
  onRefund: () => void;
}

const HISTORY_TONE = {
  PAID: 'success',
  FAILED: 'danger',
  PLAN_CHANGE: 'neutral',
  REFUND: 'warning',
} as const;

/** 결제 상세 슬라이드오버의 본문. */
export function PaymentDetailPanel({
  subscriptionId,
  unmaskedCard,
  canManage,
  unmasking,
  onUnmask,
  onRefund,
}: PaymentDetailPanelProps) {
  const { data, isPending, isError } = useQuery({
    queryKey: paymentKeys.detail(subscriptionId),
    queryFn: () => fetchPaymentDetail(subscriptionId),
  });

  // 마스킹 해제 상태에서 30초가 지나면 자동으로 다시 가린다.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!unmaskedCard) return;
    const timer = window.setTimeout(() => setTick((t) => t + 1), 30_000);
    return () => window.clearTimeout(timer);
  }, [unmaskedCard]);

  if (isPending) return <LoadingBlock label="결제 정보를 불러오는 중" />;
  if (isError || !data) return <EmptyState tone="error" title="결제 정보를 불러오지 못했습니다" />;

  const cardText = unmaskedCard ? maskCard(unmaskedCard, true) : maskCard(data.cardNumber);

  return (
    <>
      {/* ---- 회원 요약 ---- */}
      <div className="payment-panel__member">
        <span className="payment-panel__avatar" aria-hidden="true">
          {maskName(data.memberName).charAt(0)}
        </span>
        <span className="payment-panel__member-body">
          <span className="payment-panel__member-top">
            <span className="payment-panel__name">{maskName(data.memberName)}</span>
            <StatusPill tone={SUBSCRIPTION_STATUS[data.status].tone}>
              {SUBSCRIPTION_STATUS[data.status].label}
            </StatusPill>
          </span>
          <span className="payment-panel__email">{maskEmail(data.memberEmail)}</span>
          <span className="payment-panel__joined">가입: {formatDate(data.joinedAt)}</span>
        </span>
      </div>

      {/* ---- 청구 정보 ---- */}
      <section className="payment-panel__section">
        <h3 className="payment-panel__heading">청구 정보</h3>
        <DetailBox>
          <DetailRow label="구독 플랜" value={data.planName} />
          <DetailRow label="결제 금액" value={formatCurrency(data.amount)} />
          <DetailRow
            label="결제수단"
            value={
              <span className="payment-panel__card">
                <span className="tabular">
                  {data.method} ({cardText})
                </span>
                {unmaskedCard ? <StatusPill tone="danger">원문 표시 중</StatusPill> : null}
              </span>
            }
          />
          <DetailRow label="청구 주소" value={data.billingAddress} />
          <DetailRow label="다음 결제일" value={formatDate(data.nextBillingDate)} />
          {data.refundedAt ? (
            <DetailRow label="환불 완료" value={formatDateTime(data.refundedAt)} />
          ) : null}
        </DetailBox>

        <Link className="payment-panel__link" to={`/members/${data.memberId}`}>
          회원 상세 보기
        </Link>
      </section>

      {/* ---- 결제 이력 ---- */}
      <section className="payment-panel__section">
        <h3 className="payment-panel__heading">결제 이력</h3>
        {data.history.length > 0 ? (
          <ul className="payment-panel__history">
            {data.history.map((h) => (
              <li key={h.paymentId} className="payment-panel__history-item">
                <span className={`payment-panel__dot payment-panel__dot--${HISTORY_TONE[h.type]}`} aria-hidden="true" />
                <span className="payment-panel__history-body">
                  <span className="payment-panel__history-label">{h.label}</span>
                  <span className="payment-panel__history-time">{formatDateTime(h.occurredAt)}</span>
                </span>
                {h.amount !== null ? (
                  <span className="payment-panel__history-amount tabular">{formatCurrency(h.amount)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="결제 이력이 없습니다" />
        )}
      </section>

      {/* ---- 액션 (SUPER_ADMIN 전용) ---- */}
      {canManage ? (
        <div className="payment-panel__actions">
          <Button
            onClick={onRefund}
            disabled={data.status === 'CANCELED' && data.refundedAt !== null}
          >
            환불 처리
          </Button>
          <Button
            variant="dark"
            className="payment-panel__unmask"
            loading={unmasking}
            onClick={onUnmask}
            iconLeft={<Icon name="eye-view" />}
            aria-pressed={unmaskedCard !== null}
          >
            {unmaskedCard ? '다시 가리기' : '마스킹 해제'}
            <span className="payment-panel__super" aria-hidden="true">
              SUPER
            </span>
          </Button>
        </div>
      ) : (
        <p className="payment-panel__note">
          환불 처리와 카드번호 마스킹 해제는 슈퍼 관리자만 사용할 수 있습니다.
        </p>
      )}
    </>
  );
}
