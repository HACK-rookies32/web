import type { PageParams } from '@/shared/lib/types';
import type { AuditActivityType } from '@/shared/lib/audit';

/**
 * GET /admin/audit-logs 의 content 원소 (서버 AuditLogResponse).
 * 필드명은 서버 응답 그대로다.
 */
export interface AuditLogItem {
  id: number;
  /** 활동을 수행한 관리자의 숫자 id. 화면에서는 쓰지 않는다. */
  adminId: number;
  /** 관리자 로그인 아이디. 표와 필터가 모두 이 값을 쓴다. */
  adminLoginId: string;
  activityType: AuditActivityType;
  /** 표시 문구. 서버가 확정해 내려준다. */
  activityLabel: string;
  targetType: string;
  targetId: number;
  occurredAt: string;
}

/**
 * 조회 조건.
 *
 * 페이지 크기는 서버가 20 으로 고정한다(명세 5.8). `size` 를 보내도 무시되므로
 * PageParams 를 그대로 쓰지 않고 필요한 것만 둔다.
 */
export interface AuditLogListParams extends Pick<PageParams, 'page'> {
  /** 관리자 로그인 아이디 (부분 일치) */
  adminLoginId?: string;
  activityType?: AuditActivityType;
  /** ISO 날짜(yyyy-MM-dd) */
  from?: string;
  /** ISO 날짜(yyyy-MM-dd) */
  to?: string;
}
