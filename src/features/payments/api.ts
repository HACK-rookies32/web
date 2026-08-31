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
  AdjustResult,
  ChargeCancelRequest,
  ChargeCancelResult,
  ChargeItem,
  ChargeStatus,
  FundsFlowParams,
  FundsFlowRow,
  StorePayment,
  StorePaymentListParams,
  WalletListParams,
  WalletSummary,
  WalletTransaction,
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
 * 실서버에서는 `GET /admin/finance/transactions` 하나로 받는다. 요청해 둔
 * `userId` · `userName` · `method` 가 응답에 반영되어 회원·결제수단 컬럼을
 * 실제 값으로 채운다.
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

/**
 * 서버 거래 원장. `GET /admin/finance/transactions` 의 content 원소다.
 *
 * `userId` · `userName` · `method` 는 2일차에 신설을 요청해 이후 서버에 반영된
 * 필드다. 그 전에는 누구의 거래인지 알 수 없어 회원·결제수단 컬럼을 비워 뒀다.
 *
 * `storeName` 은 매장 결제(PAYMENT) 원장에만 값이 있다. 이 화면은 충전과 용돈
 * 이동만 다루므로 쓰지 않는다 — 매장 결제는 별도 탭에서 본다.
 */
interface AdminTxResponse {
  id: number;
  userId: number;
  userName: string;
  type: string;
  amount: number;
  balanceAfter: number;
  refUid: string | null;
  storeName: string | null;
  method: string | null;
  createdAt: string;
}

/**
 * 실서버 충전·용돈 조회.
 *
 * 화면의 「거래 종류」 필터를 서버 type 으로 옮긴다.
 *   충전   → /charges
 *   용돈   → /transactions?type=TRANSFER_OUT
 *   전체   → 위 둘을 각각 받아 시간순으로 병합 (서버가 다중 type 을 못 받는다)
 *
 * 이메일은 응답에 없다. 목 데이터로 채우지 않고 빈 값으로 둔다 —
 * 실서버 화면에 가상 회원이 뜨면 실제 거래로 오해한다.
 *
 * 용돈 이동(TRANSFER_OUT)은 보내는 쪽 원장이라 `userId`·`userName` 이 **보낸 사람**이다.
 * 받는 쪽은 `refUid` 에 **상대 회원 id 가 문자열로** 들어 있다(백엔드 회신 2026-08-29).
 * 이름까지는 없어 식별자만 채운다.
 */
async function fetchFundsFlowFromServer(params: FundsFlowParams): Promise<Page<FundsFlowRow>> {
  const flow = params.flow ?? 'ALL';

  /*
   * 「충전」만 볼 때는 충전 목록에서 받는다. 원장과 달리 PG 주문번호·이메일·상태·
   * 취소 사유가 모두 들어 있어 화면을 온전히 채울 수 있고, 취소도 여기서만 된다.
   * 「전체」·「용돈 이동」은 두 종류를 한 흐름으로 봐야 하므로 원장을 쓴다.
   */
  if (flow === 'CHARGE') return fetchChargesFromServer(params);
  if (flow === 'TRANSFER') return fetchTransfersFromServer(params);

  /*
   * flow === 'ALL' — 충전과 용돈 이동을 한 흐름으로 합쳐 보여준다.
   *
   * 예전에는 `GET /transactions` 를 type 없이 받아 화면에서 CHARGE·TRANSFER_OUT 만
   * 걸렀는데, 원장에는 매장 결제(PAYMENT)·용돈 받음(TRANSFER_IN) 등 다른 유형이 섞여
   * 있고 서버가 최신순으로 한 페이지만 준다. 첫 페이지가 전부 다른 유형이면 걸러낸
   * 결과가 **0건**이 돼 "내역 없음" 으로 보였다(실서버 확인: 46건 중 첫 20건이 전부
   * PAYMENT·TRANSFER_IN·PAYMENT_CANCEL). 게다가 원장의 CHARGE 는 「충전」 필터가 쓰는
   * `/charges` 보다 적다(완료분만 원장에 남음) — 같은 전체인데 개수가 달라진다.
   *
   * 그래서 「충전」 필터와 같은 `/charges`, 「용돈」 필터와 같은 `TRANSFER_OUT` 원장을
   * 각각 받아 합친다. 서버는 type 을 하나만 받아(다중 type 은 무시하거나 400) 한 번에
   * 못 준다. 두 목록은 각자 페이징되므로, 요청 페이지까지 채우는 데 필요한 만큼
   * ((page+1)*size)씩 양쪽에서 받으면 합친 상위 구간에 전역 상위가 모두 들어온다.
   * 그 구간을 시간순으로 잘라 쓴다.
   */
  const page = params.page ?? 0;
  const size = params.size ?? DEFAULT_PAGE_SIZE;
  const need = (page + 1) * size;

  /* 상태 필터가 걸리면 용돈 이동은 상태가 없어 자연히 빠진다(목 경로와 동일). */
  const statusActive = Boolean(params.status && params.status !== 'ALL');

  const [chargePage, transferPage] = await Promise.all([
    fetchChargesFromServer({ ...params, page: 0, size: need }),
    statusActive
      ? Promise.resolve<Page<FundsFlowRow>>({
          content: [],
          page: 0,
          size: 0,
          totalElements: 0,
          totalPages: 0,
        })
      : fetchTransfersFromServer({ ...params, page: 0, size: need }),
  ]);

  const merged = [...chargePage.content, ...transferPage.content].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  const totalElements = chargePage.totalElements + transferPage.totalElements;
  const start = page * size;
  return {
    content: merged.slice(start, start + size),
    page,
    size,
    totalElements,
    totalPages: Math.max(1, Math.ceil(totalElements / size)),
  };
}

/**
 * 용돈 이동(TRANSFER_OUT) 원장.
 *
 * 서버가 type 으로 걸러 주므로 이 응답에는 TRANSFER_OUT 만 온다. 보내는 쪽 원장이라
 * `userId`·`userName` 은 **보낸 사람**이고, 받는 자녀는 `refUid` 에 회원 id 가 문자열로
 * 들어 있다(백엔드 회신 2026-08-29). 이름까지는 없어 식별자만 채운다.
 */
async function fetchTransfersFromServer(params: FundsFlowParams): Promise<Page<FundsFlowRow>> {
  const data = await request<Page<AdminTxResponse>>({
    url: '/admin/finance/transactions',
    method: 'GET',
    params: {
      type: 'TRANSFER_OUT',
      userId: params.userId,
      page: params.page ?? 0,
      size: params.size ?? DEFAULT_PAGE_SIZE,
    },
  });

  const content = (Array.isArray(data?.content) ? data.content : [])
    .filter((tx) => tx.type === 'TRANSFER_OUT')
    .map<FundsFlowRow>((tx) => ({
      kind: 'TRANSFER',
      transferId: tx.id,
      fromUserId: tx.userId,
      fromUserName: tx.userName ?? '',
      toUserId: toMemberId(tx.refUid),
      toUserName: '',
      amount: Math.abs(tx.amount),
      memo: null,
      createdAt: tx.createdAt,
    }));

  return {
    content,
    page: data?.page ?? 0,
    size: data?.size ?? 0,
    totalElements: data?.totalElements ?? 0,
    totalPages: data?.totalPages ?? 0,
  };
}

/**
 * 용돈 이동 원장의 `refUid` 에서 상대 회원 id 를 꺼낸다.
 *
 * 이 값은 유형마다 의미가 다르다 — 충전·환불은 merchantUid, 매장 결제는 qrToken,
 * 조정은 사유 텍스트다. 숫자로 읽히지 않으면 0 을 돌려 "미상" 으로 표시하게 둔다.
 */
function toMemberId(refUid: string | null): number {
  const parsed = Number(refUid);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

/** `GET /admin/finance/charges` 의 content 원소. */
interface AdminChargeResponse {
  id: number;
  merchantUid: string;
  userId: number;
  /** 탈퇴 회원이면 null 이다. 충전 이력 자체는 남는다. */
  userName: string | null;
  userEmail: string | null;
  amount: number;
  status: ChargeStatus;
  /** MockPG 라 서버가 결제수단을 저장하지 않는다 — 현재는 고정 "카드". */
  method: string | null;
  pgTransactionId: string | null;
  createdAt: string;
  refundedAt: string | null;
  refundReason: string | null;
}

/**
 * 실서버 충전 목록. `GET /admin/finance/charges`
 *
 * 상태·검색어·회원 필터를 서버에 그대로 넘긴다. 되돌린 건은 `refundedAt` ·
 * `refundReason` 으로 오는데 화면은 `canceledAt` · `cancelReason` 으로 부른다.
 */
async function fetchChargesFromServer(params: FundsFlowParams): Promise<Page<FundsFlowRow>> {
  const data = await request<Page<AdminChargeResponse>>({
    url: '/admin/finance/charges',
    method: 'GET',
    params: {
      userId: params.userId,
      status: params.status && params.status !== 'ALL' ? params.status : undefined,
      keyword: params.keyword || undefined,
      page: params.page ?? 0,
      size: params.size ?? DEFAULT_PAGE_SIZE,
    },
  });

  return {
    content: (Array.isArray(data?.content) ? data.content : []).map<FundsFlowRow>((c) => ({
      kind: 'CHARGE',
      chargeId: c.id,
      merchantUid: c.merchantUid,
      userId: c.userId,
      userName: c.userName ?? '',
      userEmail: c.userEmail ?? '',
      amount: Math.abs(c.amount),
      status: c.status,
      method: c.method ?? '',
      createdAt: c.createdAt,
      canceledAt: c.refundedAt,
      cancelReason: c.refundReason,
      /* 사유가 있으면 관리자 취소, 되돌렸는데 사유가 없으면 부모 본인 환불이다. */
      refundedBy: c.refundReason ? 'ADMIN' : c.refundedAt ? 'MEMBER' : null,
    })),
    page: data?.page ?? 0,
    size: data?.size ?? 0,
    totalElements: data?.totalElements ?? 0,
    totalPages: data?.totalPages ?? 0,
  };
}

/* --------------------------------------------------------- 매장 결제 ---- */

/** GET /admin/finance/payments — 매장 결제 목록 */
export async function fetchStorePayments(
  params: StorePaymentListParams,
): Promise<Page<StorePayment>> {
  if (USE_MOCK) {
    const filtered = paymentStore
      .filter((p) => (params.childId ? p.childId === params.childId : true))
      .filter((p) => (params.status && params.status !== 'ALL' ? p.status === params.status : true))
      .filter((p) =>
        params.merchant ? p.storeName.toLowerCase().includes(params.merchant.toLowerCase()) : true,
      )
      .filter((p) => matchesKeyword(p, params.keyword, ['childName', 'parentName', 'storeName']));

    return mockResponse(paginate(filtered, params));
  }
  /*
   * `status` 는 화면에서 「전체」일 때 'ALL' 이라는 값이 들어온다. 이걸 그대로 서버에
   * 넘기면 서버가 `status = 'ALL'` 로 걸러 **0건**을 준다(실서버 확인). 실제 상태값이
   * 아니면 파라미터에서 빼야 전체가 나온다. merchant·keyword 도 빈 값이면 뺀다.
   */
  return request<Page<StorePayment>>({
    url: '/admin/finance/payments',
    method: 'GET',
    params: {
      status: params.status && params.status !== 'ALL' ? params.status : undefined,
      childId: params.childId,
      merchant: params.merchant || undefined,
      keyword: params.keyword || undefined,
      page: params.page ?? 0,
      size: params.size ?? DEFAULT_PAGE_SIZE,
    },
  });
}

/* ------------------------------------------------------------- 환불 ---- */

/**
 * 충전 취소. `POST /admin/finance/charges/{merchantUid}/cancel` (SUPER_ADMIN)
 *
 * 오래 비어 있던 관리자용 충전 취소 경로가 서버에 신설됐다. 이전에는 부모용
 * `POST /wallet/charge/{merchantUid}/refund` 밖에 없었는데, 그건 인증이 PARENT 라
 * 관리자가 쓰면 **행위 주체가 사용자로 기록**된다.
 *
 * 대상은 숫자 id 가 아니라 PG 주문번호(merchantUid)다. 그래서 취소는 그 값을 주는
 * 충전 목록(`/finance/charges`)에서 온 행에서만 할 수 있다 — 거래 원장에는
 * merchantUid 가 없다.
 *
 * 방향에 주의한다. 매장 결제 환불은 자녀 지갑이 **증가**하지만, 충전 취소는
 * 부모 카드로 돈이 되돌아가므로 부모 지갑이 **차감**된다. 이미 써버려 잔액이
 * 모자라면 서버가 409 로 막는다.
 *
 * 사유는 필수이며 감사 로그에 그대로 남는다.
 */
export async function cancelCharge(
  vars: ChargeCancelRequest & { adminUsername: string },
): Promise<ChargeCancelResult> {
  if (USE_MOCK) {
    const now = new Date().toISOString();

    const index = chargeStore.findIndex((c) => c.merchantUid === vars.merchantUid);
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
      i === index
        ? {
            ...c,
            /* 관리자 취소는 결제된 건을 되돌리는 것이라 REFUNDED 다(CANCELLED 는 결제 전 취소). */
            status: 'REFUNDED',
            canceledAt: now,
            cancelReason: vars.reason,
            refundedBy: 'ADMIN',
          }
        : c,
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
      activityType: 'CHARGE_CANCEL',
      activityLabel: '충전 취소',
      targetType: 'WALLET',
      targetId: wallet?.walletId ?? 0,
      description: vars.reason,
    });

    return mockResponse(
      {
        merchantUid: vars.merchantUid,
        refundedAmount: target.amount,
        balance: wallet?.balance ?? 0,
      },
      700,
    );
  }

  return request<ChargeCancelResult>({
    url: `/admin/finance/charges/${encodeURIComponent(vars.merchantUid)}/cancel`,
    method: 'POST',
    data: { reason: vars.reason },
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

/** `GET /admin/finance/wallets` 의 content 원소. */
interface AdminWalletResponse {
  userId: number;
  userName: string | null;
  role: 'PARENT' | 'CHILD';
  balance: number;
  /** 지갑이 아직 없는 회원(충전·이체 이력 0)은 null 이다. 잔액은 0 으로 온다. */
  updatedAt: string | null;
}

/**
 * 회원 지갑 목록. `GET /admin/finance/wallets` (신설 요청분이 반영된 엔드포인트)
 *
 * 응답이 화면의 WalletSummary 보다 좁다. 서버가 주지 않는 것은 **빈 값으로 둔다** —
 * 목으로 채우면 실서버 화면에 가상 정보가 뜬다.
 *
 *   walletId          없음 → 0. 목록 key 는 userId 를 쓴다(지갑은 회원당 하나)
 *   userEmail         없음 → '' (이메일 칸은 표시하지 않음)
 *   relatedNames      없음 → [] ("연결" 칸은 '-')
 *   recentTransactions 없음 → [] (상세는 fetchWallet 이 따로 가져온다)
 */
export async function fetchWallets(params: WalletListParams): Promise<Page<WalletSummary>> {
  if (USE_MOCK) {
    const filtered = walletStore
      .filter((w) => (params.role && params.role !== 'ALL' ? w.role === params.role : true))
      .filter((w) => matchesKeyword(w, params.keyword, ['userName', 'userEmail']));

    return mockResponse(paginate(filtered, params));
  }

  const data = await request<Page<AdminWalletResponse>>({
    url: '/admin/finance/wallets',
    method: 'GET',
    params: {
      role: params.role && params.role !== 'ALL' ? params.role : undefined,
      keyword: params.keyword || undefined,
      page: params.page ?? 0,
      size: params.size ?? DEFAULT_PAGE_SIZE,
    },
  });

  return {
    content: (Array.isArray(data?.content) ? data.content : []).map<WalletSummary>((w) => ({
      walletId: 0,
      userId: w.userId,
      userName: w.userName ?? '',
      userEmail: '',
      role: w.role,
      balance: w.balance,
      updatedAt: w.updatedAt ?? '',
      relatedNames: [],
      recentTransactions: [],
    })),
    page: data?.page ?? 0,
    size: data?.size ?? 0,
    totalElements: data?.totalElements ?? 0,
    totalPages: data?.totalPages ?? 0,
  };
}

/**
 * GET /admin/members/customers/{userId}/subscription — 회원 지갑 요약
 *
 * 경로가 `/admin/wallets/{userId}` 가 아니다. 명세 5.9 에서 그 경로가 삭제되고
 * 이 엔드포인트로 통합됐다(이름은 subscription 이지만 내용은 지갑 잔액 요약이다).
 *
 * 응답 모양이 화면의 WalletSummary 와 달라 매핑 계층을 둔다. 목 모드에서는
 * 드러나지 않던 차이다.
 *
 *   서버 = { userId, balance, recentTransactions[] }
 *   원장 = { id, type, amount, balanceAfter, refUid, createdAt }
 *          → txId · refId 로 이름이 다르고 memo 는 없다
 *
 * 회원 이름·구분은 지갑 응답에 없어 **회원 상세를 함께 조회해 채운다.** 목 값으로
 * 채우면 실서버 화면에 가상 회원이 뜬다. 회원 조회가 실패해도 잔액·원장은 보여야
 * 하므로 이름 쪽만 비우고 넘어간다.
 *
 * walletId 와 relatedNames 는 어느 응답에도 없어 빈 값으로 둔다.
 */
interface AdminUserWalletResponse {
  userId: number;
  balance: number;
  recentTransactions: AdminTxResponse[] | null;
}

/** 회원 상세 응답 중 지갑 화면이 쓰는 부분. */
interface MemberBrief {
  username: string;
  email: string | null;
  role: 'PARENT' | 'CHILD';
}

export async function fetchWallet(userId: number): Promise<WalletSummary> {
  if (USE_MOCK) {
    const found = walletStore.find((w) => w.userId === userId);
    if (!found) throw new Error('지갑을 찾을 수 없습니다.');
    return mockResponse(found);
  }

  const [wallet, member] = await Promise.all([
    request<AdminUserWalletResponse>({
      url: `/admin/members/customers/${userId}/subscription`,
      method: 'GET',
    }),
    request<MemberBrief>({ url: `/admin/members/customers/${userId}`, method: 'GET' }).catch(
      () => null,
    ),
  ]);

  const transactions = (Array.isArray(wallet?.recentTransactions) ? wallet.recentTransactions : [])
    .map<WalletTransaction>((tx) => ({
      txId: tx.id,
      type: tx.type as WalletTransaction['type'],
      amount: tx.amount,
      balanceAfter: tx.balanceAfter,
      refId: tx.refUid,
      memo: null,
      createdAt: tx.createdAt,
    }));

  return {
    walletId: 0,
    userId: wallet?.userId ?? userId,
    userName: member?.username ?? '',
    userEmail: member?.email ?? '',
    role: member?.role ?? 'PARENT',
    balance: wallet?.balance ?? 0,
    /* 지갑에 갱신 시각이 없어 가장 최근 원장의 시각을 쓴다. */
    updatedAt: transactions[0]?.createdAt ?? '',
    relatedNames: [],
    recentTransactions: transactions,
  };
}

/**
 * POST /admin/finance/users/{userId}/adjust — 잔액 수동 조정 (SUPER_ADMIN)
 * 사유 필수. wallet_transaction(ADJUST) + 감사 로그를 서버가 기록한다.
 *
 * 서버는 `{ targetUserId, balance, transaction }` 만 준다 — 회원 이름이 없다.
 * 그래서 지갑 전체가 아니라 조정 결과만 돌려주고, 안내 문구에 쓸 이름은 화면이
 * 이미 들고 있는 대상에서 가져온다. 목 값으로 이름을 지어내지 않는다.
 */
export async function adjustWallet(vars: {
  userId: number;
  amount: number;
  reason: string;
  adminUsername: string;
}): Promise<AdjustResult> {
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
      description: vars.reason,
    });

    return mockResponse({ targetUserId: vars.userId, balance }, 600);
  }

  return request<AdjustResult>({
    url: `/admin/finance/users/${vars.userId}/adjust`,
    method: 'POST',
    data: { amount: vars.amount, reason: vars.reason },
  });
}

