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
export interface FundStats {
  totalCharged: number;
  totalPaid: number;
  chargeCount: number;
  paymentCount: number;
  refundCount: number;
  /** groupBy=DAY 결과 */
  daily: { date: string; charged: number; paid: number }[];
}

/* --------------------------------------------------------- 파라미터 ---- */

export interface ChargeListParams extends PageParams {
  userId?: number;
  status?: ChargeStatus | 'ALL';
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

export interface WalletTxParams extends PageParams {
  type?: WalletTxType | 'ALL';
}
