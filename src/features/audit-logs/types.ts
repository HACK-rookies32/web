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
  /**
   * 조치 사유. 3일차에 "누가 무엇을 했는지는 알아도 왜 했는지 알 수 없다" 는
   * 문제로 신설을 요청했던 필드이고, 이후 서버 응답에 반영됐다.
   * 사유 없이 남는 활동(로그인 등)도 있어 비어 있을 수 있다.
   */
  description: string | null;
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
