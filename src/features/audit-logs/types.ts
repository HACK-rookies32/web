import type { PageParams } from '@/shared/lib/types';
import type { AuditAction } from '@/shared/lib/audit';

export interface AuditLogItem {
  logId: number;
  action: AuditAction;
  /** `"member:1001"` 형태의 `종류:식별자`. 화면에서는 parseAuditTarget 으로 푼다. */
  target: string;
  createdAt: string;
  /**
   * 사람이 읽을 수 있는 활동 내용. 조치 사유가 여기에 들어간다.
   * (`action` + `target` 만으로는 왜 그랬는지 알 수 없어 명세 5.8 에 추가했다)
   */
  description: string;
  /** 실행한 관리자 계정명. 화면과 필터가 모두 이 값을 쓴다. */
  adminUsername: string;
}

export interface AuditLogListParams extends PageParams {
  /** 관리자 계정 아이디(부분 일치). 숫자 ID 가 아니라 admin01 같은 로그인 아이디다. */
  adminUsername?: string;
  action?: AuditAction;
  /** ISO 날짜(yyyy-MM-dd) */
  from?: string;
  /** ISO 날짜(yyyy-MM-dd) */
  to?: string;
}
