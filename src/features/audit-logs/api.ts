import { USE_MOCK, request } from '@/shared/api/client';
import { mockResponse, paginate } from '@/shared/api/mock';
import { getAuditLogs } from '@/mocks/auditLogs';
import { toPage, type SpringPage } from '@/shared/api/page';
import type { Page } from '@/shared/lib/types';
import { AUDIT_LOG_QUERY_KEY } from '@/shared/lib/audit';
import type { AuditLogItem, AuditLogListParams } from './types';

export const auditLogKeys = {
  all: AUDIT_LOG_QUERY_KEY,
  list: (params: AuditLogListParams) => [...AUDIT_LOG_QUERY_KEY, params] as const,
};

/** 서버가 고정한 페이지 크기 (명세 5.8). size 를 보내도 무시된다. */
const AUDIT_PAGE_SIZE = 20;

function startOfDay(value: string): number {
  return new Date(`${value}T00:00:00`).getTime();
}

function endOfDay(value: string): number {
  return new Date(`${value}T23:59:59.999`).getTime();
}

/**
 * GET /admin/audit-logs?adminLoginId&activityType&from&to&page — SUPER_ADMIN
 *
 * 응답은 Spring Page 라 현재 페이지가 `page` 가 아니라 `number` 로 온다.
 */
export async function fetchAuditLogs(params: AuditLogListParams): Promise<Page<AuditLogItem>> {
  if (USE_MOCK) {
    const needle = params.adminLoginId?.trim().toLocaleLowerCase();
    const filtered = getAuditLogs()
      .filter((log) => (needle ? log.adminLoginId.toLocaleLowerCase().includes(needle) : true))
      .filter((log) => (params.activityType ? log.activityType === params.activityType : true))
      .filter((log) => (params.from ? new Date(log.occurredAt).getTime() >= startOfDay(params.from) : true))
      .filter((log) => (params.to ? new Date(log.occurredAt).getTime() <= endOfDay(params.to) : true));

    return mockResponse(paginate(filtered, { page: params.page, size: AUDIT_PAGE_SIZE }));
  }

  const data = await request<SpringPage<AuditLogItem>>({
    url: '/admin/audit-logs',
    method: 'GET',
    params,
  });
  return toPage(data);
}
