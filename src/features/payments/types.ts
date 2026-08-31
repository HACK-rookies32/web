import type { PageParams } from '@/shared/lib/types';
import type {
  ChargeStatus,
  StorePaymentStatus,
  WalletSummary,
  WalletTransaction,
  WalletTxType,
} from '@/shared/lib/wallet';

export type { ChargeStatus, StorePaymentStatus, WalletSummary, WalletTransaction, WalletTxType };

/**
 * 자금·결제 도메인 타입.
 *
 * 기준: API 명세 5.9 "자금 / 결제 관리" + 4.10~4.12(충전 · 지갑 · QR 결제).
 * 구독/PG 대행 모델은 폐기되었고, 자체 지갑 기반으로 대체되었다.
 *
 *   부모: 카드로 지갑 충전(CHARGE) → 자녀에게 용돈 이체(TRANSFER)
 *   자녀: 지갑 잔액으로 매장 QR 결제(PAYMENT)
 */

/* ------------------------------------------------------------- 충전 ---- */


/** GET /admin/finance/charges 의 content 원소. */
export interface ChargeItem {
  chargeId: number;
  /**
   * PG 주문번호. 충전 취소가 이 값을 대상으로 받는다.
   *
   * 거래 원장(`/finance/transactions`)에는 이 값이 없어, 그쪽에서 만든 행은
   * null 이고 취소 버튼이 뜨지 않는다. 취소하려면 「충전」 필터를 선택해
   * 충전 목록(`/finance/charges`)에서 봐야 한다.
   */
  merchantUid: string | null;
  userId: number;
  userName: string;
  userEmail: string;
  amount: number;
  status: ChargeStatus;
  /** 결제수단 표시명 (예: "카드", "간편결제") */
  method: string;
  createdAt: string;
  canceledAt: string | null;
  cancelReason: string | null;
  /**
   * 되돌린 주체.
   *
   * `status` 는 관리자 취소와 부모 본인 환불이 **둘 다 `REFUNDED`** 라 구분되지 않고,
   * `refundedAt` 도 양쪽 모두 값이 있다. 서버가 사유를 받는 쪽은 관리자 취소뿐이라
   * **`refundReason` 유무가 유일한 구분 근거**다(백엔드 회신 2026-08-29).
   * 되돌리지 않은 건은 null. 소급 데이터는 사유가 없어 MEMBER 로 보인다.
   */
  refundedBy: 'ADMIN' | 'MEMBER' | null;
}

/**
 * 부모 → 자녀 용돈 이동 1건.
 *
 * 지갑 원장에는 보내는 쪽 `TRANSFER_OUT` 과 받는 쪽 `TRANSFER_IN` 두 줄로 남지만,
 * 관리자 화면에서는 "누가 누구에게 얼마를" 이 한 눈에 보여야 하므로 한 줄로 합친다.
 *
 * TODO(api): 명세 5.9 확정 후 `GET /finance/transactions?type=TRANSFER_OUT` 로 옮긴다.
 *            현재 5.9 는 회신 대기 중이라 목으로만 동작한다.
 */
export interface TransferItem {
  transferId: number;
  /** 보낸 사람 (보호자) */
  fromUserId: number;
  fromUserName: string;
  /** 받은 사람 (자녀) */
  toUserId: number;
  toUserName: string;
  amount: number;
  /** 보낼 때 남긴 메모 (예: "주간 용돈") */
  memo: string | null;
  createdAt: string;
}

/**
 * 충전 탭에서 함께 보여줄 거래 종류.
 *
 * 부모가 카드로 넣은 돈(CHARGE)과 그 돈이 자녀에게 건너간 것(TRANSFER)은
 * 이어지는 하나의 흐름이라, 관리자가 한 화면에서 따라갈 수 있어야 한다.
 */
export type FundsFlowFilter = 'ALL' | 'CHARGE' | 'TRANSFER';

/** 충전 탭의 행. 충전과 용돈 이동을 한 목록에 섞어 보여주기 위한 합집합. */
export type FundsFlowRow =
  | ({ kind: 'CHARGE' } & ChargeItem)
  | ({ kind: 'TRANSFER' } & TransferItem);

/* --------------------------------------------------------- 매장 결제 ---- */


/** GET /admin/payments 의 content 원소. */
export interface StorePayment {
  id: number;
  childId: number;
  childName: string;
  parentId: number;
  parentName: string;
  /** 매장명. 필터 쿼리는 merchant */
  storeName: string;
  amount: number;
  status: StorePaymentStatus;
  /** 결제 직후 자녀 지갑 잔액 */
  balanceAfter: number;
  paidAt: string;
}

/* ------------------------------------------------------------- 통계 ---- */

/** GET /admin/stats 의 data. */
/* ------------------------------------------------------------- 환불 ---- */

/**
 * 충전 취소 요청 (POST /admin/finance/charges/{merchantUid}/cancel).
 *
 * 대상은 숫자 chargeId 가 아니라 **PG 주문번호(merchantUid)** 다. 매장 결제 환불은
 * 별도 경로이고 관리자 웹에서는 쓰지 않는다 — 매장 결제 내역은 조회 전용이다.
 */
export interface ChargeCancelRequest {
  merchantUid: string;
  /** 필수. 감사 로그에 그대로 남는다. */
  reason: string;
}

/**
 * 충전 취소 결과.
 *
 * 서버는 `{ merchantUid, refundedAmount, balance, transaction }` 을 준다.
 * 회원 이름은 응답에 없으므로 안내 문구는 화면이 들고 있던 대상 정보를 쓴다.
 */
export interface AdjustResult {
  /** 잔액이 조정된 회원. 서버 응답의 `targetUserId` 다. */
  targetUserId: number;
  /** 조정 후 잔액. */
  balance: number;
}

export interface ChargeCancelResult {
  merchantUid: string;
  /** 되돌린 금액. 항상 양수다. */
  refundedAmount: number;
  /** 취소 후 지갑 잔액. 충전 취소이므로 잔액은 차감된다. */
  balance: number;
}

/* --------------------------------------------------------- 파라미터 ---- */

/** 충전 탭(충전 + 용돈 이동) 조회 파라미터. */
export interface FundsFlowParams extends PageParams {
  flow?: FundsFlowFilter;
  status?: ChargeStatus | 'ALL';
  userId?: number;
}

export interface StorePaymentListParams extends PageParams {
  childId?: number;
  /** 매장명 필터 (명세 쿼리명: merchant) */
  merchant?: string;
  status?: StorePaymentStatus | 'ALL';
}

export interface WalletListParams extends PageParams {
  role?: 'PARENT' | 'CHILD' | 'ALL';
}
