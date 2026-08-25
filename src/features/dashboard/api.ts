import { USE_MOCK, request } from '@/shared/api/client';
import { mockResponse } from '@/shared/api/mock';
import { MOCK_DASHBOARD } from '@/mocks/dashboard';
import type { DashboardSummary } from './types';

/**
 * 대시보드 요약 조회.
 *
 * TODO(api): 집계 엔드포인트가 API 명세 v0.2 에 아직 없다.
 *            백엔드와 경로 확정 후 아래 URL 을 교체할 것.
 */
export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  if (USE_MOCK) return mockResponse(MOCK_DASHBOARD);
  return request<DashboardSummary>({ url: '/admin/dashboard/summary', method: 'GET' });
}

/** TanStack Query 키. */
export const dashboardKeys = {
  summary: ['dashboard', 'summary'] as const,
};
