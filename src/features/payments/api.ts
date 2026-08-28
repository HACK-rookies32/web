import { USE_MOCK, request } from '@/shared/api/client';
import { matchesKeyword, mockResponse, paginate } from '@/shared/api/mock';
import { appendAuditLog } from '@/mocks/auditLogs';
import {
  MOCK_CHARGES,
  MOCK_STORE_PAYMENTS,
  MOCK_TRANSFERS,
  MOCK_WALLETS,
} from '@/mocks/payments';
import type { Page } from '@/shared/lib/types';
import type {
  ChargeItem,
  FundsFlowParams,
  FundsFlowRow,
  RefundRequest,
  RefundResult,
  StorePayment,
  StorePaymentListParams,
  WalletListParams,
  WalletSummary,
} from './types';

/**
 * 자금·결제 관리 API (명세 5.9).
 *
 * 조회는 SUPER_ADMIN · GENERAL_ADMIN, 강제 환불과 잔액 조정은 SUPER_ADMIN 전용이다.
 * 두 예외 처리는 서버가 감사 로그를 자동 기록한다.
 */

export const fundKeys = {
  all: ['funds'] as const,
  flow: (p: FundsFlowParams) => ['funds', 'flow', p] as const,
  payments: (p: StorePaymentListParams) => ['funds', 'payments', p] as const,
  wallets: (p: WalletListParams) => ['funds', 'wallets', p] as const,
  wallet: (userId: number) => ['funds', 'wallet', userId] as const,
};

/* 목 모드에서 환불·조정 결과를 세션 동안 유지하기 위한 작업 사본. */
let chargeStore: ChargeItem[] = [...MOCK_CHARGES];
let paymentStore: StorePayment[] = [...MOCK_STORE_PAYMENTS];
let walletStore: WalletSummary[] = MOCK_WALLETS.map((w) => ({ ...w }));
let nextTxId = 91000;

/**
 * 충전 탭 목록 — 충전과 부모→자녀 용돈 이동을 한 흐름으로 합쳐 돌려준다.
 *
 * 부모가 카드로 넣은 돈과 그 돈이 자녀에게 건너간 것은 이어지는 하나의 흐름이라
 * 관리자가 한 화면에서 따라갈 수 있어야 한다. `flow` 로 한쪽만 볼 수도 있다.
 *
 * TODO(api): 명세 5.9 가 확정되면 `GET /finance/transactions?type=CHARGE|TRANSFER_OUT`
 *            한 번으로 대체된다. 그때 이 합치기는 서버로 넘어간다.
 */
export async function fetchFundsFlow(params: FundsFlowParams): Promise<Page<FundsFlowRow>> {
  const flow = params.flow ?? 'ALL';

  const charges: FundsFlowRow[] =
    flow === 'TRANSFER'
      ? []
      : chargeStore
          .filter((c) => (params.userId ? c.userId === params.userId : true))
          .filter((c) => (params.status && params.status !== 'ALL' ? c.status === params.status : true))
          .filter((c) => matchesKeyword(c, params.keyword, ['userName', 'userEmail', 'method']))
          .map((c) => ({ kind: 'CHARGE' as const, ...c }));

  // 용돈 이동에는 충전 상태가 없다. 상태 필터가 걸리면 자연히 빠진다.
  const transfers: FundsFlowRow[] =
    flow === 'CHARGE' || (params.status && params.status !== 'ALL')
      ? []
      : MOCK_TRANSFERS.filter((t) =>
          params.userId ? t.fromUserId === params.userId || t.toUserId === params.userId : true,
        )
          .filter((t) => matchesKeyword(t, params.keyword, ['fromUserName', 'toUserName', 'memo']))
          .map((t) => ({ kind: 'TRANSFER' as const, ...t }));

  const merged = [...charges, ...transfers].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return mockResponse(paginate(merged, params));
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

/* ------------------------------------------------------------- 환불 ---- */

/**
 * POST /admin/wallets/refund — 강제 환불 · 충전 취소 (SUPER_ADMIN)
 *
 * 대상마다 경로를 따로 두지 않고 `targetType` + `targetId` 로 구분한다.
 * 어느 쪽이든 결국 하는 일은 같다 — 지갑 잔액을 되돌리고
 * `wallet_transaction(REFUND)` 과 감사 로그를 남긴다. 다만 **방향이 반대**다.
 *
 *   CHARGE — 부모 카드로 충전액이 되돌아간다 → 부모 지갑 **차감**
 *
 * 이미 써버려 잔액이 모자라면 취소할 수 없다(명세상 409 CONFLICT).
 * 명세의 PAYMENT(매장 결제 강제 환불)는 관리자 웹에서 쓰지 않는다.
 */
export async function refund(
  vars: RefundRequest & { adminUsername: string },
): Promise<RefundResult> {
  if (USE_MOCK) {
    const now = new Date().toISOString();

    const index = chargeStore.findIndex((c) => c.chargeId === vars.targetId);
    if (index < 0) throw new Error('존재하지 않는 충전 건입니다.');

    const target = chargeStore[index];
    if (target.status !== 'PAID') {
      throw new Error('완료된 충전 건만 환불할 수 있습니다.');
    }

    const before = walletStore.find((w) => w.userId === target.userId);
    if (before && before.balance < target.amount) {
      throw new Error(
        `잔액이 부족해 취소할 수 없습니다. 현재 잔액 ${before.balance.toLocaleString('ko-KR')}원 · 취소 금액 ${target.amount.toLocaleString('ko-KR')}원`,
      );
    }

    chargeStore = chargeStore.map((c, i) =>
      i === index ? { ...c, status: 'CANCELED', canceledAt: now, cancelReason: vars.reason } : c,
    );

    const wallet = applyRefundToWallet({
      userId: target.userId,
      delta: -target.amount,
      refId: `charge:${target.chargeId}`,
      reason: vars.reason,
      at: now,
    });

    appendAuditLog({
      adminUsername: vars.adminUsername,
      action: 'PAYMENT_REFUND',
      target: `charge:${target.chargeId}`,
      description: `${target.userName} 회원의 ${target.method} 충전 ${target.amount.toLocaleString('ko-KR')}원 취소 — ${vars.reason}`,
    });

    return mockResponse(
      {
        targetType: 'CHARGE',
        targetId: target.chargeId,
        userId: target.userId,
        userName: wallet?.userName ?? target.userName,
        walletId: wallet?.walletId ?? 0,
        amount: target.amount,
        delta: -target.amount,
        balanceAfter: wallet?.balance ?? 0,
        refundedAt: now,
        reason: vars.reason,
      },
      700,
    );
  }

  return request<RefundResult>({
    url: '/admin/wallets/refund',
    method: 'POST',
    data: { targetType: vars.targetType, targetId: vars.targetId, reason: vars.reason },
  });
}

/** 목 전용 — 지갑 잔액을 옮기고 REFUND 원장을 남긴 뒤 갱신된 지갑을 돌려준다. */
function applyRefundToWallet(input: {
  userId: number;
  /** 증가면 양수, 차감이면 음수. */
  delta: number;
  refId: string;
  reason: string;
  at: string;
}): WalletSummary | undefined {
  let updated: WalletSummary | undefined;

  walletStore = walletStore.map((w) => {
    if (w.userId !== input.userId) return w;
    const balance = w.balance + input.delta;
    updated = {
      ...w,
      balance,
      updatedAt: input.at,
      recentTransactions: [
        {
          txId: (nextTxId += 1),
          type: 'REFUND',
          amount: input.delta,
          balanceAfter: balance,
          refId: input.refId,
          memo: input.reason,
          createdAt: input.at,
        },
        ...w.recentTransactions,
      ],
    };
    return updated;
  });

  return updated;
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

