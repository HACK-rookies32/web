import { USE_MOCK, request } from '@/shared/api/client';
import { mockResponse } from '@/shared/api/mock';
import { appendAuditLog } from '@/mocks/auditLogs';
import { MOCK_ADMINS } from '@/mocks/admins';
import type { AdminAccount, AdminRoleUpdateRequest } from './types';

export const adminKeys = {
  all: ['admins'] as const,
};

let adminStore: AdminAccount[] = MOCK_ADMINS.map((admin) => ({ ...admin }));

/**
 * GET /admin/members — 관리자 계정 목록. SUPER_ADMIN, 배열 응답(페이징 아님).
 *
 * 경로가 `/admin/admins` 가 아니다. 서버는 관리자도 회원 테이블에 두고
 * `/admin/members` 로 관리자 계정만 걸러 준다. (`/admin/admins` 는 500)
 *
 * 응답 AdminMemberResponse 는 우리 AdminAccount 보다 `username`(실명)이 하나 더 온다.
 * 지금은 쓰지 않아 무시한다.
 */
export async function fetchAdmins(): Promise<AdminAccount[]> {
  if (USE_MOCK) {
    return mockResponse([...adminStore].sort((a, b) => a.id - b.id));
  }

  return request<AdminAccount[]>({ url: '/admin/members', method: 'GET' });
}

/**
 * PATCH /admin/members/{id}/role — 관리자 역할 변경. SUPER_ADMIN.
 *
 * 요청 본문 `{ role }`, 응답은 갱신된 AdminMemberResponse 로 우리 타입과 맞는다.
 *
 * NOTE: 서버의 role enum 에는 PARENT · CHILD 도 들어 있어 관리자를 일반 회원으로
 *       내릴 수 있다. 화면 드롭다운은 관리자 4종만 노출한다.
 */
export async function updateAdminRole(vars: {
  id: number;
  body: AdminRoleUpdateRequest;
  adminUsername: string;
}): Promise<AdminAccount> {
  if (USE_MOCK) {
    const index = adminStore.findIndex((admin) => admin.id === vars.id);
    if (index < 0) throw new Error('존재하지 않는 계정입니다.');

    const before = adminStore[index];
    const updated: AdminAccount = {
      ...before,
      role: vars.body.role,
      updatedAt: new Date().toISOString(),
    };
    adminStore = adminStore.map((admin, current) => (current === index ? updated : admin));

    appendAuditLog({
      adminLoginId: vars.adminUsername,
      activityType: 'MEMBER_ROLE_UPDATE',
      activityLabel: '관리자 권한 변경',
      targetType: 'MEMBER',
      targetId: vars.id,
    });

    return mockResponse(updated, 550);
  }

  return request<AdminAccount>({
    url: `/admin/members/${vars.id}/role`,
    method: 'PATCH',
    data: vars.body,
  });
}
