import type { AdminUser, Role } from '@/shared/lib/types';

export type AdminAccount = AdminUser;

export interface AdminRoleUpdateRequest {
  role: Role;
}

export type AdminRoleFilter = Role | 'ALL';
