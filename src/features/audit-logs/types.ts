import type { PageParams } from '@/shared/lib/types';
import type { AuditAction } from '@/shared/lib/audit';

export interface AuditLogItem {
  logId: number;
  adminId: number;
  action: AuditAction;
  /** `"member:1001"` 형태의 `종류:식별자`. 화면에서는 parseAuditTarget 으로 푼다. */
  target: string;
  createdAt: string;
  /**
   * 사람이 읽을 수 있는 활동 내용. 조치 사유가 여기에 들어간다.
   * (`action` + `target` 만으로는 왜 그랬는지 알 수 없어 명세 5.8 에 추가했다)
   */
  description: string;
  /** 실행한 관리자 계정명. adminId 숫자만으로는 누구인지 알 수 없다. */
  adminUsername: string;
}

export interface AuditLogListParams extends PageParams {
  adminId?: number;
  action?: AuditAction;
  /** ISO 날짜(yyyy-MM-dd) */
  from?: string;
  /** ISO 날짜(yyyy-MM-dd) */
  to?: string;
}
