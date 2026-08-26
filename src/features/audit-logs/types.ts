import type { PageParams } from '@/shared/lib/types';
import type { AuditAction } from '@/shared/lib/audit';

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
