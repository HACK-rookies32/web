import type { PageParams } from '@/shared/lib/types';

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

export interface AuditLogItem {
  logId: number;
  adminId: number;
  action: AuditAction;
  target: string;
  createdAt: string;
}

export interface AuditLogListParams extends PageParams {
  adminId?: number;
  action?: AuditAction;
  /** ISO 날짜(yyyy-MM-dd) */
  from?: string;
  /** ISO 날짜(yyyy-MM-dd) */
  to?: string;
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
