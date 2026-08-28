import { USE_MOCK, request } from '@/shared/api/client';
import { matchesKeyword, mockResponse, paginate } from '@/shared/api/mock';
import { appendAuditLog } from '@/mocks/auditLogs';
import { DEFAULT_PAGE_SIZE } from '@/shared/lib/constants';
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
 * 실서버에서는 `GET /admin/finance/transactions` 하나로 받는다. 다만 응답
 * content[] 가 id·type·amount·balanceAfter·refUid·createdAt 뿐이라 **누구의
 * 거래인지 알 수 없다.** 회원·결제수단 컬럼은 채울 값이 없어 비워 둔다.
 * userId·회원명·결제수단 추가를 요청해 둔 상태다.
 */
export async function fetchFundsFlow(params: FundsFlowParams): Promise<Page<FundsFlowRow>> {
  if (!USE_MOCK) return fetchFundsFlowFromServer(params);

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

/** 서버 거래 원장(TxResponse). 명세 5.9 GET /finance/transactions 의 content 원소. */
interface TxResponse {
  id: number;
  type: string;
  amount: number;
  balanceAfter: number;
  refUid: string | null;
  createdAt: string;
}

/**
 * 실서버 충전·용돈 조회.
 *
 * 화면의 「거래 종류」 필터를 서버 type 으로 옮긴다.
 *   충전   → CHARGE   (되돌린 건 REFUND 로 따로 남는다)
 *   용돈   → TRANSFER_OUT
 *   전체   → 서버 필터 없이 받아 두 종류만 남긴다
 *
 * 회원 정보가 응답에 없어 이름·이메일·결제수단은 빈 값으로 둔다.
 * 목 데이터로 채우지 않는다 — 실서버 화면에 가상 회원이 뜨면 실제 거래로 오해한다.
 */
async function fetchFundsFlowFromServer(params: FundsFlowParams): Promise<Page<FundsFlowRow>> {
  const flow = params.flow ?? 'ALL';
  const type = flow === 'CHARGE' ? 'CHARGE' : flow === 'TRANSFER' ? 'TRANSFER_OUT' : undefined;

  const data = await request<Page<TxResponse>>({
    url: '/admin/finance/transactions',
    method: 'GET',
    params: {
      type,
      userId: params.userId,
      page: params.page ?? 0,
      size: params.size ?? DEFAULT_PAGE_SIZE,
    },
  });

  const rows = (Array.isArray(data?.content) ? data.content : [])
    .filter((tx) => tx.type === 'CHARGE' || tx.type === 'TRANSFER_OUT')
    .map<FundsFlowRow>((tx) =>
      tx.type === 'CHARGE'
        ? {
            kind: 'CHARGE',
            chargeId: tx.id,
            userId: 0,
            userName: '',
            userEmail: '',
            amount: Math.abs(tx.amount),
            status: 'PAID',
            method: '',
            createdAt: tx.createdAt,
            canceledAt: null,
            cancelReason: null,
          }
        : {
            kind: 'TRANSFER',
            transferId: tx.id,
            fromUserId: 0,
            fromUserName: '',
            toUserId: 0,
            toUserName: '',
            amount: Math.abs(tx.amount),
            memo: null,
            createdAt: tx.createdAt,
          },
    );

  return {
    content: rows,
    page: data?.page ?? 0,
    size: data?.size ?? 0,
    totalElements: data?.totalElements ?? 0,
    totalPages: data?.totalPages ?? 0,
  };
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
 * POST /admin/wallets/refund — 충전 취소 (SUPER_ADMIN)
 *
 * TODO(api): 이 경로는 서버에 없다(500). 관리자용 충전 취소 엔드포인트 자체가
 *            없어서 신설 요청해 둔 상태다. 4장의 부모용
 *            `POST /wallet/charge/{merchantUid}/refund` 는 인증이 PARENT 라
 *            관리자가 쓰면 행위 주체가 사용자로 기록된다.
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
      adminLoginId: vars.adminUsername,
      activityType: 'PAYMENT_REFUND',
      activityLabel: '강제 환불',
      targetType: 'PAYMENT',
      targetId: target.chargeId,
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
 * TODO(api): 서버에 지갑 목록 엔드포인트가 없다(`/admin/wallets` 는 500).
 *            단건은 `/admin/members/customers/{id}/subscription` 으로 볼 수 있으나
 *            전체 회원 잔액을 훑을 방법이 없다. 신설 요청해 둔 상태다.
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

/**
 * GET /admin/members/customers/{userId}/subscription — 회원 지갑 요약
 *
 * 경로가 `/admin/wallets/{userId}` 가 아니다. 명세 5.9 에서 그 경로가 삭제되고
 * 이 엔드포인트로 통합됐다(이름은 subscription 이지만 내용은 지갑 잔액 요약이다).
 *
 * ⚠️ 응답 모양이 우리 WalletSummary 와 다르다. 목 모드에서는 드러나지 않는다.
 *    서버 AdminUserWalletResponse = { userId, balance, recentTransactions[] }
 *    TxResponse = { id, type, amount, balanceAfter, refUid, createdAt }
 *
 *    서버가 주지 않는 것: walletId · userName · userEmail · role · updatedAt · relatedNames
 *    이름이 다른 것: TxResponse.id → txId, refUid → refId (memo 는 없음)
 *
 *    WalletDetailPanel 과 회원 상세 지갑 요약이 위 필드를 읽으므로 실서버로 붙이기
 *    전에 매핑 계층이 필요하다. 지금은 경로만 맞춰 둔 상태다.
 */
export async function fetchWallet(userId: number): Promise<WalletSummary> {
  if (USE_MOCK) {
    const found = walletStore.find((w) => w.userId === userId);
    if (!found) throw new Error('지갑을 찾을 수 없습니다.');
    return mockResponse(found);
  }
  return request<WalletSummary>({
    url: `/admin/members/customers/${userId}/subscription`,
    method: 'GET',
  });
}

/**
 * POST /admin/finance/users/{userId}/adjust — 잔액 수동 조정 (SUPER_ADMIN)
 * 사유 필수. wallet_transaction(ADJUST) + 감사 로그를 서버가 기록한다.
 *
 * ⚠️ 응답이 우리 WalletSummary 가 아니다.
 *    서버 AdminActionResponse = { targetUserId, balance, transaction(TxResponse) }
 *    화면은 성공 토스트에 result.userName · result.balance 를 쓰는데 userName 이 없다.
 *    실서버 연동 시 호출부에서 이름을 넘기거나 매핑이 필요하다.
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
      adminLoginId: vars.adminUsername,
      activityType: 'WALLET_BALANCE_ADJUST',
      activityLabel: '지갑 잔액 수동 조정',
      targetType: 'WALLET',
      targetId: target.walletId,
    });

    return mockResponse(next, 600);
  }

  return request<WalletSummary>({
    url: `/admin/finance/users/${vars.userId}/adjust`,
    method: 'POST',
    data: { amount: vars.amount, reason: vars.reason },
  });
}

