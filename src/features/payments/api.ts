import { USE_MOCK, request } from '@/shared/api/client';
import { matchesKeyword, mockResponse, paginate } from '@/shared/api/mock';
import { appendAuditLog } from '@/mocks/auditLogs';
import { MOCK_PAYMENTS, MOCK_PAYMENT_SUMMARY } from '@/mocks/payments';
import type { Page } from '@/shared/lib/types';
import type { PaymentDetail, PaymentListItem, PaymentListParams, PaymentSummary } from './types';

export const paymentKeys = {
  all: ['payments'] as const,
  list: (params: PaymentListParams) => ['payments', params] as const,
  summary: ['payments', 'summary'] as const,
  detail: (id: number) => ['payment', id] as const,
};

/* 목 모드에서 환불 결과를 세션 동안 유지하기 위한 작업 사본. */
let paymentStore: PaymentDetail[] = [...MOCK_PAYMENTS];

/**
 * 결제·구독 목록.
 *
 * TODO(api): 관리자용 목록 엔드포인트가 명세에 없다. 현재는 회원 단건 조회
 *            GET /admin/members/{id}/subscription 만 정의되어 있다.
 *            목록 API 가 생기기 전까지 목 데이터로 동작한다.
 */
export async function fetchPayments(params: PaymentListParams): Promise<Page<PaymentListItem>> {
  if (USE_MOCK) {
    const filtered = paymentStore
      .filter((p) => (params.memberId ? p.memberId === params.memberId : true))
      .filter((p) => (params.status && params.status !== 'ALL' ? p.status === params.status : true))
      .filter((p) => (params.method && params.method !== 'ALL' ? p.methodType === params.method : true))
      .filter((p) => matchesKeyword(p, params.keyword, ['memberName', 'memberEmail', 'planName']));

    return mockResponse(paginate(filtered, params));
  }

  return request<Page<PaymentListItem>>({ url: '/admin/subscriptions', method: 'GET', params });
}

/** 상단 KPI. */
export async function fetchPaymentSummary(): Promise<PaymentSummary> {
  if (USE_MOCK) return mockResponse(MOCK_PAYMENT_SUMMARY);
  return request<PaymentSummary>({ url: '/admin/subscriptions/summary', method: 'GET' });
}

/** 결제 상세 (슬라이드오버). */
export async function fetchPaymentDetail(subscriptionId: number): Promise<PaymentDetail> {
  if (USE_MOCK) {
    const found = paymentStore.find((p) => p.subscriptionId === subscriptionId);
    if (!found) throw new Error('결제 정보를 찾을 수 없습니다.');
    return mockResponse(found);
  }
  return request<PaymentDetail>({ url: `/admin/subscriptions/${subscriptionId}`, method: 'GET' });
}

/**
 * 환불 처리 — SUPER_ADMIN 전용.
 *
 * TODO(api): 환불 엔드포인트가 명세에 아직 없다 (백엔드에 요청 완료).
 *            서버가 붙으면 감사 로그도 서버가 자동 기록하므로 아래 appendAuditLog 는 제거한다.
 */
export async function refundPayment(vars: {
  subscriptionId: number;
  adminUsername: string;
}): Promise<PaymentDetail> {
  if (USE_MOCK) {
    const index = paymentStore.findIndex((p) => p.subscriptionId === vars.subscriptionId);
    if (index < 0) throw new Error('결제 정보를 찾을 수 없습니다.');

    const target = paymentStore[index];
    const now = new Date().toISOString();
    const next: PaymentDetail = {
      ...target,
      status: 'CANCELED',
      refundRequested: false,
      refundedAt: now,
      nextBillingDate: null,
      history: [
        {
          paymentId: Math.floor(Math.random() * 1000) + 9000,
          type: 'REFUND',
          label: '환불 처리',
          amount: target.amount,
          occurredAt: now,
        },
        ...target.history,
      ],
    };

    paymentStore = paymentStore.map((p, i) => (i === index ? next : p));

    appendAuditLog({
      adminUsername: vars.adminUsername,
      action: 'PAYMENT_REFUND',
      target: `subscription:${target.subscriptionId}`,
      description: `${target.memberName} 회원 ${target.planName} 구독 환불 (${target.amount.toLocaleString('ko-KR')}원)`,
    });

    return mockResponse(next, 700);
  }

  return request<PaymentDetail>({
    url: `/admin/subscriptions/${vars.subscriptionId}/refund`,
    method: 'POST',
  });
}

/**
 * 카드번호 마스킹 해제 — SUPER_ADMIN 전용, 감사 대상.
 *
 * 서버가 원문을 내려주고 그 조회 자체가 로그로 남는 구조여야 한다.
 * TODO(api): 전용 엔드포인트가 없다. 목에서는 이미 가진 값을 그대로 돌려주고
 *            감사 로그만 남긴다.
 */
export async function unmaskCard(vars: {
  subscriptionId: number;
  adminUsername: string;
}): Promise<string> {
  const target = paymentStore.find((p) => p.subscriptionId === vars.subscriptionId);
  if (!target) throw new Error('결제 정보를 찾을 수 없습니다.');

  if (USE_MOCK) {
    appendAuditLog({
      adminUsername: vars.adminUsername,
      action: 'CARD_UNMASK',
      target: `subscription:${target.subscriptionId}`,
      description: `${target.memberName} 회원의 카드번호 원문 조회`,
    });
    return mockResponse(target.cardNumber, 400);
  }

  return request<string>({
    url: `/admin/subscriptions/${vars.subscriptionId}/card`,
    method: 'GET',
  });
}

/** 목 데이터를 초기 상태로 되돌린다 (개발 편의용). */
export function resetPaymentStore(): void {
  paymentStore = [...MOCK_PAYMENTS];
}
