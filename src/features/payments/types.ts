import type { SubscriptionStatus } from '@/shared/lib/status';
import type { PageParams } from '@/shared/lib/types';

/** 결제수단 구분. */
export type PaymentMethodType = 'CARD' | 'EASY_PAY';

/** 결제·구독 목록의 한 행. */
export interface PaymentListItem {
  subscriptionId: number;
  memberId: number;
  memberName: string;
  memberEmail: string;
  planName: string;
  status: SubscriptionStatus;
  methodType: PaymentMethodType;
  /** 화면 표시용 결제수단 이름 (예: "카드", "간편결제 (카카오페이)") */
  method: string;
  /** 카드 원본 번호. 화면에서는 반드시 maskCard 를 거쳐 표시한다. */
  cardNumber: string;
  nextBillingDate: string | null;
  amount: number;
  /** 환불 요청이 접수된 건인지 */
  refundRequested: boolean;
  refundedAt: string | null;
}

/** 결제 이력 한 줄 (상세 패널의 타임라인). */
export interface PaymentHistoryItem {
  paymentId: number;
  type: 'PAID' | 'FAILED' | 'PLAN_CHANGE' | 'REFUND';
  label: string;
  amount: number | null;
  occurredAt: string;
}

/** 결제 상세 패널 데이터. */
export interface PaymentDetail extends PaymentListItem {
  joinedAt: string;
  billingAddress: string;
  history: PaymentHistoryItem[];
}

/** 상단 KPI. */
export interface PaymentSummary {
  activeSubscriptions: number;
  monthlyRevenue: number;
  failedPayments: number;
  refundRequests: number;
}

/** 목록 조회 파라미터. */
export interface PaymentListParams extends PageParams {
  status?: SubscriptionStatus | 'ALL';
  method?: PaymentMethodType | 'ALL';
  /** 회원 컨텍스트. /payments?memberId= 로 들어온 경우 해당 회원만 본다. */
  memberId?: number;
}
