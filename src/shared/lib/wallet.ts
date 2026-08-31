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
  | 'PAYMENT_CANCEL'
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

/**
 * 지갑 요약. 화면이 쓰는 모양이다.
 *
 * 서버 응답(AdminUserWalletResponse)은 userId · balance · recentTransactions 뿐이라
 * 나머지는 채워지지 않는다. features/payments/api.ts 의 fetchWallet 주석 참고.
 */
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
  PAYMENT_CANCEL: { label: '결제 취소', tone: 'info' },
  REFUND: { label: '환불', tone: 'warning' },
  RECLAIM: { label: '회수', tone: 'neutral' },
  ADJUST: { label: '수동 조정', tone: 'danger' },
};

/**
 * 충전 상태. 서버 `AdminChargeResponse.status` 값을 그대로 쓴다.
 *
 * 이전에는 취소를 `CANCELED`(L 하나)로 두고 있었는데 서버는 `CANCELLED` 다.
 * 매장 결제 상태는 처음부터 `CANCELLED` 였어서 웹 안에서 두 표기가 섞여 있었다.
 * `REFUNDED`(환불 완료)와 `EXPIRED`(결제 만료)는 서버에만 있던 값이라 추가했다.
 */
export type ChargeStatus =
  | 'READY'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'
  | 'CANCELLED'
  | 'EXPIRED';

export const CHARGE_STATUS: Record<ChargeStatus, { label: string; tone: Tone }> = {
  READY: { label: '대기', tone: 'warning' },
  PAID: { label: '완료', tone: 'success' },
  FAILED: { label: '실패', tone: 'danger' },
  REFUNDED: { label: '환불', tone: 'neutral' },
  CANCELLED: { label: '취소', tone: 'neutral' },
  EXPIRED: { label: '만료', tone: 'neutral' },
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

/*
 * 상수맵 안전 조회.
 *
 * 위 세 맵은 서버가 주는 문자열(type·status)로 인덱싱한다. 서버가 맵에 없는 값을
 * 보내면 `MAP[값]` 이 undefined 가 되고, 화면에서 `.tone`·`.label` 을 읽는 순간
 * 페이지가 통째로 크래시한다(감사 로그·지갑에서 겪은 것과 같은 유형). 서버가 새
 * 상태·거래 유형을 추가해도 화면이 죽지 않도록, 모르는 값은 값 그대로를 라벨로
 * 보여주고 tone 은 중립으로 떨어뜨린다.
 */
export function walletTxMeta(type: string): { label: string; tone: Tone } {
  return WALLET_TX[type as WalletTxType] ?? { label: type || '기타', tone: 'neutral' };
}
export function chargeStatusMeta(status: string): { label: string; tone: Tone } {
  return CHARGE_STATUS[status as ChargeStatus] ?? { label: status || '기타', tone: 'neutral' };
}
export function storePaymentStatusMeta(status: string): { label: string; tone: Tone } {
  return STORE_PAYMENT_STATUS[status as StorePaymentStatus] ?? { label: status || '기타', tone: 'neutral' };
}

/**
 * 원장 한 줄에 표시할 증감액(부호 포함).
 *
 * 서버는 금액을 **항상 양수**로 저장하고 방향은 `type` 으로 표현한다(백엔드 회신
 * 2026-08-31). 부호를 amount 값에서 읽으면 차감(PAYMENT·TRANSFER_OUT·충전취소
 * REFUND)이 "+" 로 잘못 뜬다. 그래서 type 으로 방향을 정한다.
 *
 *   증가(+): CHARGE · TRANSFER_IN · PAYMENT_CANCEL
 *   차감(−): PAYMENT · TRANSFER_OUT
 *   ADJUST : 금액 자체에 부호가 있으므로 그대로 (유일하게 음수가 올 수 있음)
 *   REFUND : 지갑 소유자에 따라 갈린다 — 부모 지갑은 충전 취소로 차감(−),
 *            자녀 지갑은 매장 결제 강제환불로 증가(+). 한 type 이 양쪽에 쓰여
 *            소유자 역할로 가른다(백엔드가 type 분리를 완료하면 role 인자는 뗀다).
 *   그 외(RECLAIM 등 서버가 방향을 확정 안 준 유형): 저장된 부호를 그대로 둔다.
 */
export function walletTxSignedAmount(type: string, amount: number, ownerRole?: string): number {
  const magnitude = Math.abs(amount);
  switch (type as WalletTxType) {
    case 'CHARGE':
    case 'TRANSFER_IN':
    case 'PAYMENT_CANCEL':
      return magnitude;
    case 'PAYMENT':
    case 'TRANSFER_OUT':
      return -magnitude;
    case 'REFUND':
      return ownerRole === 'CHILD' ? magnitude : -magnitude;
    case 'ADJUST':
      return amount;
    default:
      return amount;
  }
}

/** 부호를 붙인 금액 표시. 증가는 +, 차감은 -. */
export function formatSignedAmount(amount: number): string {
  const sign = amount > 0 ? '+' : amount < 0 ? '−' : '';
  return `${sign}₩${Math.abs(amount).toLocaleString('ko-KR')}`;
}
