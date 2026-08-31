/**
 * 감사 로그 목 저장소.
 *
 * 명세 5.8 기준으로 감사 로그는 생성·조회(C/R)만 허용되며, 실제로는 관리자 활동이
 * 발생할 때 서버가 자동으로 기록한다(별도 생성 API 없음).
 *
 * 목 단계에서는 프론트에서 어떤 활동이 로그로 남는지 눈으로 확인할 수 있도록
 * 여기에 항목을 쌓아 둔다. 백엔드가 붙으면 이 파일은 조회 전용 목으로만 남는다.
 *
 * 필드는 서버 AuditLogResponse 를 그대로 따른다. `description`(조치 사유)은
 * 서버 응답에 없어 두지 않는다 — 추가를 요청해 둔 상태다.
 *
 * feature 끼리 직접 import 할 수 없으므로 여러 화면이 공유하는 목은 mocks 에 둔다.
 */

import type { AuditActivityType } from '@/shared/lib/audit';

export interface AuditLog {
  id: number;
  adminId: number;
  adminLoginId: string;
  activityType: AuditActivityType;
  activityLabel: string;
  targetType: string;
  targetId: number;
  /** 조치 사유. 서버가 신설한 필드다. 사유 없이 남는 활동도 있어 비어 있을 수 있다. */
  description: string | null;
  occurredAt: string;
}

function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 3_600_000).toISOString();
}

let nextLogId = 40010;

const seed: AuditLog[] = [
  {
    id: 40001,
    adminId: 1,
    adminLoginId: 'admin01',
    activityType: 'MEMBER_DELETE',
    activityLabel: '회원 삭제',
    targetType: 'MEMBER',
    targetId: 1099,
    description: '휴면 계정 정리 요청',
    occurredAt: hoursAgo(3),
  },
  {
    id: 40002,
    adminId: 2,
    adminLoginId: 'general_lee',
    activityType: 'MEMBER_UPDATE',
    activityLabel: '회원 정보 수정',
    targetType: 'MEMBER',
    targetId: 1003,
    description: '연락처 오기 정정',
    occurredAt: hoursAgo(9),
  },
  {
    id: 40003,
    adminId: 1,
    adminLoginId: 'admin01',
    activityType: 'WALLET_BALANCE_ADJUST',
    activityLabel: '지갑 잔액 수동 조정',
    targetType: 'WALLET',
    targetId: 509,
    description: '결제 실패 건 보정',
    occurredAt: hoursAgo(26),
  },
  {
    id: 40004,
    adminId: 3,
    adminLoginId: 'minho_park',
    activityType: 'POST_DELETE',
    activityLabel: '게시글 삭제',
    targetType: 'POST',
    targetId: 5521,
    description: '커뮤니티 운영정책 위반',
    occurredAt: hoursAgo(31),
  },
  {
    id: 40005,
    adminId: 1,
    adminLoginId: 'admin01',
    activityType: 'NOTICE_CREATE',
    activityLabel: '공지사항 등록',
    targetType: 'NOTICE',
    targetId: 9001,
    description: null,
    occurredAt: hoursAgo(52),
  },
];

let logs: AuditLog[] = [...seed];

/** 최신순 감사 로그. */
export function getAuditLogs(): AuditLog[] {
  return [...logs].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}

/**
 * 감사 대상 활동을 기록한다.
 * 실제로는 서버가 기록하므로, 프론트에서 이 함수를 호출하는 것은 목 전용 동작이다.
 */
export function appendAuditLog(entry: {
  adminLoginId: string;
  activityType: AuditActivityType;
  activityLabel: string;
  targetType: string;
  targetId: number;
  description?: string | null;
}): AuditLog {
  const log: AuditLog = {
    id: (nextLogId += 1),
    adminId: 0,
    description: null,
    occurredAt: new Date().toISOString(),
    ...entry,
  };
  logs = [log, ...logs];
  return log;
}
