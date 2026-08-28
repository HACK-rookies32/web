import type { Tone } from './types';

/**
 * 지갑 도메인의 공용 타입·표시 규칙.
 *
 * 회원 관리와 자금·결제 관리 두 feature 가 함께 쓰므로 shared 에 둔다.
 * (feature 끼리 직접 import 하지 않는다)
 *
 * 기준: API 명세 4.11 지갑/용돈 이체 + 5.9 자금/결제 관리.
 */

/** 지갑 거래 원장 타입. */
export type WalletTxType =
  | 'CHARGE'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'PAYMENT'
  | 'REFUND'
  | 'RECLAIM'
  | 'ADJUST';

export interface WalletTransaction {
  txId: number;
  type: WalletTxType;
  /** 증감액. 차감이면 음수. */
  amount: number;
  balanceAfter: number;
  /** 연관 리소스 식별자 (예: "payment:8801") */
  refId: string | null;
  memo: string | null;
  createdAt: string;
}

/** GET /admin/wallets/{userId} 의 data. */
export interface WalletSummary {
  walletId: number;
  userId: number;
  userName: string;
  userEmail: string;
  role: 'PARENT' | 'CHILD';
  balance: number;
  updatedAt: string;
  /** 부모면 연결 자녀 이름, 자녀면 부모 이름 */
  relatedNames: string[];
  recentTransactions: WalletTransaction[];
}

export const WALLET_TX: Record<WalletTxType, { label: string; tone: Tone }> = {
  CHARGE: { label: '충전', tone: 'success' },
  TRANSFER_IN: { label: '용돈 받음', tone: 'info' },
  TRANSFER_OUT: { label: '용돈 보냄', tone: 'neutral' },
  PAYMENT: { label: '매장 결제', tone: 'accent' },
  REFUND: { label: '환불', tone: 'warning' },
  RECLAIM: { label: '회수', tone: 'neutral' },
  ADJUST: { label: '수동 조정', tone: 'danger' },
};

/** 충전 상태. */
export type ChargeStatus = 'READY' | 'PAID' | 'FAILED' | 'CANCELED';

export const CHARGE_STATUS: Record<ChargeStatus, { label: string; tone: Tone }> = {
  READY: { label: '대기', tone: 'warning' },
  PAID: { label: '완료', tone: 'success' },
  FAILED: { label: '실패', tone: 'danger' },
  CANCELED: { label: '취소', tone: 'neutral' },
};

/**
 * 매장 결제 상태.
 *
 * 환불(REFUNDED)은 두지 않는다. 관리자 강제 환불을 쓰지 않기로 하면서 웹에서
 * 결제를 환불로 바꿀 경로가 없어졌다. 취소는 앱의 부모 결제 취소로 생긴다.
 */
export type StorePaymentStatus = 'PAID' | 'CANCELLED';

export const STORE_PAYMENT_STATUS: Record<StorePaymentStatus, { label: string; tone: Tone }> = {
  PAID: { label: '결제 완료', tone: 'success' },
  CANCELLED: { label: '취소', tone: 'neutral' },
};

/** 부호를 붙인 금액 표시. 증가는 +, 차감은 -. */
export function formatSignedAmount(amount: number): string {
  const sign = amount > 0 ? '+' : amount < 0 ? '−' : '';
  return `${sign}₩${Math.abs(amount).toLocaleString('ko-KR')}`;
}
