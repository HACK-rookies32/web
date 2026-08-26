/** 여러 관리자 feature와 목 저장소가 함께 사용하는 감사 로그 활동 규격. */
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

/** 여러 feature가 감사 로그 조회 캐시를 함께 갱신할 때 사용하는 공통 Query key. */
export const AUDIT_LOG_QUERY_KEY = ['audit-logs'] as const;

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
