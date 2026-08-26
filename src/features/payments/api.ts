import { USE_MOCK, request } from '@/shared/api/client';
import { matchesKeyword, mockResponse, paginate } from '@/shared/api/mock';
import { appendAuditLog } from '@/mocks/auditLogs';
import {
  MOCK_CHARGES,
  MOCK_FUND_STATS,
  MOCK_STORE_PAYMENTS,
  MOCK_WALLETS,
} from '@/mocks/payments';
import type { Page } from '@/shared/lib/types';
import type {
  ChargeItem,
  ChargeListParams,
  FundStats,
  StorePayment,
  StorePaymentListParams,
  WalletListParams,
  WalletSummary,
  WalletTransaction,
  WalletTxParams,
} from './types';

/**
 * 자금·결제 관리 API (명세 5.9).
 *
 * 조회는 SUPER_ADMIN · GENERAL_ADMIN, 강제 환불과 잔액 조정은 SUPER_ADMIN 전용이다.
 * 두 예외 처리는 서버가 감사 로그를 자동 기록한다.
 */

export const fundKeys = {
  all: ['funds'] as const,
  stats: ['funds', 'stats'] as const,
  charges: (p: ChargeListParams) => ['funds', 'charges', p] as const,
  payments: (p: StorePaymentListParams) => ['funds', 'payments', p] as const,
  wallets: (p: WalletListParams) => ['funds', 'wallets', p] as const,
  wallet: (userId: number) => ['funds', 'wallet', userId] as const,
  walletTx: (userId: number, p: WalletTxParams) => ['funds', 'wallet', userId, 'tx', p] as const,
};

/* 목 모드에서 환불·조정 결과를 세션 동안 유지하기 위한 작업 사본. */
let paymentStore: StorePayment[] = [...MOCK_STORE_PAYMENTS];
let walletStore: WalletSummary[] = MOCK_WALLETS.map((w) => ({ ...w }));
let nextTxId = 91000;

/* ------------------------------------------------------------- 통계 ---- */

/** GET /admin/stats */
export async function fetchFundStats(): Promise<FundStats> {
  if (USE_MOCK) return mockResponse(MOCK_FUND_STATS);
  return request<FundStats>({ url: '/admin/stats', method: 'GET', params: { groupBy: 'DAY' } });
}

/* ------------------------------------------------------------- 충전 ---- */

/** GET /admin/charges */
export async function fetchCharges(params: ChargeListParams): Promise<Page<ChargeItem>> {
  if (USE_MOCK) {
    const filtered = MOCK_CHARGES.filter((c) => (params.userId ? c.userId === params.userId : true))
      .filter((c) => (params.status && params.status !== 'ALL' ? c.status === params.status : true))
      .filter((c) => matchesKeyword(c, params.keyword, ['userName', 'userEmail', 'method']));

    return mockResponse(paginate(filtered, params));
  }
  return request<Page<ChargeItem>>({ url: '/admin/charges', method: 'GET', params });
}

/* --------------------------------------------------------- 매장 결제 ---- */

/** GET /admin/payments */
export async function fetchStorePayments(
  params: StorePaymentListParams,
): Promise<Page<StorePayment>> {
  if (USE_MOCK) {
    const filtered = paymentStore
      .filter((p) => (params.childId ? p.childId === params.childId : true))
      .filter((p) => (params.status && params.status !== 'ALL' ? p.status === params.status : true))
      .filter((p) =>
        params.merchant ? p.merchantName.toLowerCase().includes(params.merchant.toLowerCase()) : true,
      )
      .filter((p) => matchesKeyword(p, params.keyword, ['childName', 'parentName', 'merchantName']));

    return mockResponse(paginate(filtered, params));
  }
  return request<Page<StorePayment>>({ url: '/admin/payments', method: 'GET', params });
}

/**
 * POST /admin/payments/{paymentId}/refund — 강제 환불 (SUPER_ADMIN)
 * 자녀 잔액 원복 + wallet_transaction(REFUND) + 감사 로그를 서버가 기록한다.
 */
export async function refundStorePayment(vars: {
  paymentId: number;
  reason: string;
  adminUsername: string;
}): Promise<StorePayment> {
  if (USE_MOCK) {
    const index = paymentStore.findIndex((p) => p.paymentId === vars.paymentId);
    if (index < 0) throw new Error('존재하지 않는 결제 건입니다.');

    const target = paymentStore[index];
    const now = new Date().toISOString();
    const next: StorePayment = {
      ...target,
      status: 'REFUNDED',
      refundedAt: now,
      refundReason: vars.reason,
      balanceAfter: target.balanceAfter + target.amount,
    };
    paymentStore = paymentStore.map((p, i) => (i === index ? next : p));

    // 자녀 지갑 잔액 원복 + REFUND 거래 기록
    walletStore = walletStore.map((w) => {
      if (w.userId !== target.childId) return w;
      const balance = w.balance + target.amount;
      return {
        ...w,
        balance,
        updatedAt: now,
        recentTransactions: [
          {
            txId: (nextTxId += 1),
            type: 'REFUND',
            amount: target.amount,
            balanceAfter: balance,
            refId: `payment:${target.paymentId}`,
            memo: vars.reason,
            createdAt: now,
          },
          ...w.recentTransactions,
        ],
      };
    });

    // 서버 연동 후에는 서버가 자동 기록하므로 이 블록은 제거한다.
    appendAuditLog({
      adminUsername: vars.adminUsername,
      action: 'PAYMENT_REFUND',
      target: `payment:${target.paymentId}`,
      description: `${target.childName} 자녀의 ${target.merchantName} 결제 ${target.amount.toLocaleString('ko-KR')}원 강제 환불 — ${vars.reason}`,
    });

    return mockResponse(next, 700);
  }

  return request<StorePayment>({
    url: `/admin/payments/${vars.paymentId}/refund`,
    method: 'POST',
    data: { reason: vars.reason },
  });
}

/* ------------------------------------------------------------- 지갑 ---- */

/**
 * 회원 지갑 목록.
 * TODO(api): 명세에는 단건 조회(GET /admin/wallets/{userId})만 있고 목록이 없다.
 *            관리 화면에서는 전체를 훑어야 하므로 목록 엔드포인트가 필요하다.
 */
export async function fetchWallets(params: WalletListParams): Promise<Page<WalletSummary>> {
  if (USE_MOCK) {
    const filtered = walletStore
      .filter((w) => (params.role && params.role !== 'ALL' ? w.role === params.role : true))
      .filter((w) => matchesKeyword(w, params.keyword, ['userName', 'userEmail']));

    return mockResponse(paginate(filtered, params));
  }
  return request<Page<WalletSummary>>({ url: '/admin/wallets', method: 'GET', params });
}

/** GET /admin/wallets/{userId} */
export async function fetchWallet(userId: number): Promise<WalletSummary> {
  if (USE_MOCK) {
    const found = walletStore.find((w) => w.userId === userId);
    if (!found) throw new Error('지갑을 찾을 수 없습니다.');
    return mockResponse(found);
  }
  return request<WalletSummary>({ url: `/admin/wallets/${userId}`, method: 'GET' });
}

/** GET /admin/wallets/{userId}/transactions */
export async function fetchWalletTransactions(
  userId: number,
  params: WalletTxParams,
): Promise<Page<WalletTransaction>> {
  if (USE_MOCK) {
    const wallet = walletStore.find((w) => w.userId === userId);
    const items = (wallet?.recentTransactions ?? []).filter((t) =>
      params.type && params.type !== 'ALL' ? t.type === params.type : true,
    );
    return mockResponse(paginate(items, params));
  }
  return request<Page<WalletTransaction>>({
    url: `/admin/wallets/${userId}/transactions`,
    method: 'GET',
    params,
  });
}

/**
 * POST /admin/wallets/{userId}/adjust — 잔액 수동 조정 (SUPER_ADMIN)
 * 사유 필수. wallet_transaction(ADJUST) + 감사 로그를 서버가 기록한다.
 */
export async function adjustWallet(vars: {
  userId: number;
  amount: number;
  reason: string;
  adminUsername: string;
}): Promise<WalletSummary> {
  if (USE_MOCK) {
    const index = walletStore.findIndex((w) => w.userId === vars.userId);
    if (index < 0) throw new Error('지갑을 찾을 수 없습니다.');

    const target = walletStore[index];
    const balance = target.balance + vars.amount;
    if (balance < 0) throw new Error('조정 후 잔액이 음수가 될 수 없습니다.');

    const now = new Date().toISOString();
    const next: WalletSummary = {
      ...target,
      balance,
      updatedAt: now,
      recentTransactions: [
        {
          txId: (nextTxId += 1),
          type: 'ADJUST',
          amount: vars.amount,
          balanceAfter: balance,
          refId: null,
          memo: vars.reason,
          createdAt: now,
        },
        ...target.recentTransactions,
      ],
    };
    walletStore = walletStore.map((w, i) => (i === index ? next : w));

    appendAuditLog({
      adminUsername: vars.adminUsername,
      action: 'WALLET_ADJUST',
      target: `wallet:${target.walletId}`,
      description: `${target.userName} 지갑 잔액 ${vars.amount > 0 ? '+' : ''}${vars.amount.toLocaleString('ko-KR')}원 조정 — ${vars.reason}`,
    });

    return mockResponse(next, 600);
  }

  return request<WalletSummary>({
    url: `/admin/wallets/${vars.userId}/adjust`,
    method: 'POST',
    data: { amount: vars.amount, reason: vars.reason },
  });
}

