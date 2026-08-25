/**
 * 감사 로그 목 저장소.
 *
 * 명세 5.8 기준으로 감사 로그는 생성·조회(C/R)만 허용되며, 실제로는 관리자 활동이
 * 발생할 때 서버가 자동으로 기록한다(별도 생성 API 없음).
 *
 * 목 단계에서는 프론트에서 어떤 활동이 로그로 남는지 눈으로 확인할 수 있도록
 * 여기에 항목을 쌓아 둔다. 백엔드가 붙으면 이 파일은 조회 전용 목으로만 남는다.
 *
 * feature 끼리 직접 import 할 수 없으므로 여러 화면이 공유하는 목은 mocks 에 둔다.
 */

export type AuditAction =
  | 'MEMBER_UPDATE'
  | 'MEMBER_DELETE'
  | 'MEMBER_SUSPEND'
  | 'PAYMENT_REFUND'
  | 'WALLET_ADJUST'
  | 'NOTICE_CREATE'
  | 'NOTICE_DELETE'
  | 'POST_DELETE'
  | 'MEMBER_BAN'
  | 'REPORT_DOWNLOAD';

export interface AuditLog {
  logId: number;
  adminId: number;
  adminUsername: string;
  action: AuditAction;
  /** 대상 식별자. 예: "member:1001", "payment:7001" */
  target: string;
  /** 사람이 읽을 수 있는 설명 */
  description: string;
  createdAt: string;
}

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  MEMBER_UPDATE: '회원 정보 수정',
  MEMBER_DELETE: '회원 삭제',
  MEMBER_SUSPEND: '계정 정지',
  PAYMENT_REFUND: '환불 처리',
  WALLET_ADJUST: '지갑 잔액 수동 조정',
  NOTICE_CREATE: '공지 작성',
  NOTICE_DELETE: '공지 삭제',
  POST_DELETE: '게시글 삭제',
  MEMBER_BAN: '사용자 밴',
  REPORT_DOWNLOAD: '리포트 다운로드',
};

function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 3_600_000).toISOString();
}

let nextLogId = 40010;

const seed: AuditLog[] = [
  {
    logId: 40001,
    adminId: 1,
    adminUsername: 'admin01',
    action: 'MEMBER_DELETE',
    target: 'member:1099',
    description: '탈퇴 요청 회원 삭제',
    createdAt: hoursAgo(3),
  },
  {
    logId: 40002,
    adminId: 2,
    adminUsername: 'cs_lee',
    action: 'MEMBER_SUSPEND',
    target: 'member:1003',
    description: '욕설 및 비방 신고 누적',
    createdAt: hoursAgo(9),
  },
  {
    logId: 40003,
    adminId: 1,
    adminUsername: 'admin01',
    action: 'WALLET_ADJUST',
    target: 'wallet:509',
    description: '결제 취소 건 잔액 보정 (+2,000원)',
    createdAt: hoursAgo(26),
  },
  {
    logId: 40004,
    adminId: 3,
    adminUsername: 'community_park',
    action: 'POST_DELETE',
    target: 'post:5521',
    description: '광고성 게시글 삭제',
    createdAt: hoursAgo(31),
  },
  {
    logId: 40005,
    adminId: 1,
    adminUsername: 'admin01',
    action: 'PAYMENT_REFUND',
    target: 'payment:7002',
    description: '중복 결제 환불',
    createdAt: hoursAgo(52),
  },
];

let logs: AuditLog[] = [...seed];

/** 최신순 감사 로그. */
export function getAuditLogs(): AuditLog[] {
  return [...logs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/**
 * 감사 대상 활동을 기록한다.
 * 실제로는 서버가 기록하므로, 프론트에서 이 함수를 호출하는 것은 목 전용 동작이다.
 */
export function appendAuditLog(entry: {
  adminUsername: string;
  action: AuditAction;
  target: string;
  description: string;
}): AuditLog {
  const log: AuditLog = {
    logId: (nextLogId += 1),
    adminId: 1,
    createdAt: new Date().toISOString(),
    ...entry,
  };
  logs = [log, ...logs];
  return log;
}
