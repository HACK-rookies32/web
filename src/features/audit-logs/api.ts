import { USE_MOCK, request } from '@/shared/api/client';
import { mockResponse, paginate } from '@/shared/api/mock';
import { getAuditLogs } from '@/mocks/auditLogs';
import type { Page } from '@/shared/lib/types';
import { AUDIT_LOG_QUERY_KEY } from '@/shared/lib/audit';
import type { AuditLogItem, AuditLogListParams } from './types';

export const auditLogKeys = {
  all: AUDIT_LOG_QUERY_KEY,
  list: (params: AuditLogListParams) => [...AUDIT_LOG_QUERY_KEY, params] as const,
};

function startOfDay(value: string): number {
  return new Date(`${value}T00:00:00`).getTime();
}

function endOfDay(value: string): number {
  return new Date(`${value}T23:59:59.999`).getTime();
}

/** GET /admin/audit-logs?adminId&action&from&to&page&size — SUPER_ADMIN */
export async function fetchAuditLogs(params: AuditLogListParams): Promise<Page<AuditLogItem>> {
  if (USE_MOCK) {
    const filtered = getAuditLogs()
      .filter((log) => (params.adminId ? log.adminId === params.adminId : true))
      .filter((log) => (params.action ? log.action === params.action : true))
      .filter((log) => (params.from ? new Date(log.createdAt).getTime() >= startOfDay(params.from) : true))
      .filter((log) => (params.to ? new Date(log.createdAt).getTime() <= endOfDay(params.to) : true))
      .map<AuditLogItem>(({ logId, adminId, adminUsername, action, target, description, createdAt }) => ({
        logId,
        adminId,
        action,
        target,
        createdAt,
        description,
        adminUsername,
      }));

    return mockResponse(paginate(filtered, params));
  }

  return request<Page<AuditLogItem>>({
    url: '/admin/audit-logs',
    method: 'GET',
    params,
  });
}
