import type { Tone } from './types';

/**
 * 여러 feature 에서 같이 쓰는 상태 표시 규칙.
 * feature 끼리 직접 import 할 수 없으므로 공용 규칙은 여기 둔다.
 */

/**
 * 1:1 문의 상태. API 명세 5.4 의 status 쿼리(OPEN/ANSWERED)를 그대로 따른다.
 *
 * NOTE: Figma 시안에는 대기중/처리중/완료 3단계로 그려져 있으나,
 *       명세가 2단계이므로 명세를 기준으로 삼는다.
 */
export type InquiryStatus = 'OPEN' | 'ANSWERED';

export const INQUIRY_STATUS: Record<InquiryStatus, { label: string; tone: Tone }> = {
  OPEN: { label: '대기중', tone: 'danger' },
  ANSWERED: { label: '답변완료', tone: 'neutral' },
};

/** 구독 상태. 명세 5.2 GET /admin/members/{id}/subscription 의 status. */
export type SubscriptionStatus = 'ACTIVE' | 'OVERDUE' | 'CANCELED';

export const SUBSCRIPTION_STATUS: Record<SubscriptionStatus, { label: string; tone: Tone }> = {
  ACTIVE: { label: '활성', tone: 'success' },
  OVERDUE: { label: '연체', tone: 'danger' },
  CANCELED: { label: '해지', tone: 'neutral' },
};

/** 회원 계정 상태. */
export type MemberStatus = 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN';

export const MEMBER_STATUS: Record<MemberStatus, { label: string; tone: Tone }> = {
  ACTIVE: { label: '활성', tone: 'success' },
  SUSPENDED: { label: '정지', tone: 'danger' },
  WITHDRAWN: { label: '탈퇴', tone: 'neutral' },
};
