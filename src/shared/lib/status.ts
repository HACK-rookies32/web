import type { Tone } from './types';

/**
 * 여러 feature 에서 같이 쓰는 상태 표시 규칙.
 * feature 끼리 직접 import 할 수 없으므로 공용 규칙은 여기 둔다.
 */

/**
 * 1:1 문의 답변 여부.
 *
 * 명세 5.4 의 응답 필드는 status 문자열이 아니라 answered(Boolean) 이다.
 * 화면에서는 이 헬퍼를 거쳐 라벨과 톤을 얻는다.
 */
export function inquiryStatus(answered: boolean): { label: string; tone: Tone } {
  return answered
    ? { label: '답변 완료', tone: 'success' }
    : { label: '답변 대기', tone: 'danger' };
}

/** 회원 계정 상태. */
export type MemberStatus = 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN';

export const MEMBER_STATUS: Record<MemberStatus, { label: string; tone: Tone }> = {
  ACTIVE: { label: '활성', tone: 'success' },
  SUSPENDED: { label: '정지', tone: 'danger' },
  WITHDRAWN: { label: '탈퇴', tone: 'neutral' },
};
