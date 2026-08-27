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


/** GET /admin/charges 의 content 원소. */
export interface ChargeItem {
  chargeId: number;
  userId: number;
  /**
   * 화면 표시용 회원 정보.
   * TODO(api): 명세의 충전 응답 필드는 chargeId/amount/status/method/createdAt 뿐이다.
   *            관리자 목록에서는 회원을 식별해야 하므로 join 된 값이 필요하다.
   */
  userName: string;
  userEmail: string;
  amount: number;
  status: ChargeStatus;
  /** 결제수단 표시명 (예: "카드", "간편결제") */
  method: string;
  createdAt: string;
  canceledAt: string | null;
  cancelReason: string | null;
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
  paymentId: number;
  childId: number;
  childName: string;
  parentId: number;
  parentName: string;
  /** 매장명. 필터 쿼리는 merchant */
  merchantName: string;
  amount: number;
  status: StorePaymentStatus;
  /** 결제 직후 자녀 지갑 잔액 */
  balanceAfter: number;
  paidAt: string;
  refundedAt: string | null;
  refundReason: string | null;
}

/* ------------------------------------------------------------- 통계 ---- */

/** GET /admin/stats 의 data. */
/* ------------------------------------------------------------- 환불 ---- */

/**
 * 환불 대상 종류 (명세 5.9 POST /admin/wallets/refund).
 *
 * 명세는 PAYMENT(매장 결제 강제 환불)도 정의하지만 관리자 웹에서는 쓰지 않는다.
 * 매장 결제 내역은 조회 전용이고, 웹에서 되돌리는 건 충전뿐이다.
 *   CHARGE — 부모 카드로 돈이 되돌아간다 → 지갑 잔액 차감
 */
export type RefundTargetType = 'CHARGE';

/** POST /admin/wallets/refund 의 요청 본문. */
export interface RefundRequest {
  targetType: RefundTargetType;
  /** targetType 이 CHARGE 면 chargeId, PAYMENT 면 paymentId. */
  targetId: number;
  /** 필수. 감사 로그에 그대로 남는다. */
  reason: string;
}

/** POST /admin/wallets/refund 의 data. */
export interface RefundResult {
  targetType: RefundTargetType;
  targetId: number;
  /** 잔액이 움직인 지갑의 주인. */
  userId: number;
  userName: string;
  walletId: number;
  /** 환불 금액. 방향과 무관하게 항상 양수다. */
  amount: number;
  /** 지갑에 실제로 반영된 증감. PAYMENT 는 +amount, CHARGE 는 -amount. */
  delta: number;
  balanceAfter: number;
  refundedAt: string;
  reason: string;
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
