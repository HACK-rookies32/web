import { USE_MOCK, request } from '@/shared/api/client';
import { mockResponse } from '@/shared/api/mock';
import { appendAuditLog } from '@/mocks/auditLogs';
import { MOCK_ADMINS } from '@/mocks/admins';
import { ROLE_LABEL } from '@/shared/lib/constants';
import type { AdminAccount, AdminRoleUpdateRequest } from './types';

export const adminKeys = {
  all: ['admins'] as const,
};

let adminStore: AdminAccount[] = MOCK_ADMINS.map((admin) => ({ ...admin }));

/** GET /admin/admins — SUPER_ADMIN, 배열 응답(페이징 아님). */
export async function fetchAdmins(): Promise<AdminAccount[]> {
  if (USE_MOCK) {
    return mockResponse([...adminStore].sort((a, b) => a.id - b.id));
  }

  return request<AdminAccount[]>({ url: '/admin/admins', method: 'GET' });
}

/** PATCH /admin/admins/{id} — SUPER_ADMIN. */
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
      adminUsername: vars.adminUsername,
      action: 'ADMIN_ROLE_UPDATE',
      target: `admin:${vars.id}`,
      description: `${updated.username} 권한 ${ROLE_LABEL[before.role]} → ${ROLE_LABEL[vars.body.role]}`,
    });

    return mockResponse(updated, 550);
  }

  return request<AdminAccount>({
    url: `/admin/admins/${vars.id}`,
    method: 'PATCH',
    data: vars.body,
  });
}
