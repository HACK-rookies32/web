import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  type Column,
  EmptyState,
  FormField,
  Icon,
  ListToolbar,
  Modal,
  RowActions,
  SearchInput,
  Select,
  StackedCell,
  StatusPill,
  Table,
  useToast,
} from '@/shared/ui';
import { ROLE_LABEL, ROLE_OPTIONS } from '@/shared/lib/constants';
import { useAuth } from '@/shared/auth/AuthContext';
import { formatDateTime, maskEmail, maskPhone } from '@/shared/lib/format';
import type { Role } from '@/shared/lib/types';
import { useAuditLogSync } from '@/shared/hooks/useAuditLogSync';
import { useListParams } from '@/shared/hooks/useListParams';
import { adminKeys, fetchAdmins, updateAdminRole } from '../api';
import type { AdminAccount, AdminRoleFilter } from '../types';
import './AdminsPage.css';

const PHONE_SUFFIX_SEARCH_DIGITS = 4;

function matchesAdminKeyword(admin: AdminAccount, keyword: string): boolean {
  const needle = keyword.trim().toLocaleLowerCase();
  if (!needle) return true;

  // 아이디와 닉네임은 짧은 검색어도 의미가 있으므로 항상 부분 일치를 허용한다.
  if (
    admin.username.toLocaleLowerCase().includes(needle)
    || admin.nickname.toLocaleLowerCase().includes(needle)
  ) {
    return true;
  }

  // 도메인의 공통 문자열(example.com) 때문에 전 계정이 노출되지 않도록 제한한다.
  const email = admin.email.toLocaleLowerCase();
  const emailMatches = needle.includes('@')
    ? email.includes(needle)
    : /^[a-z0-9._%+-]+$/i.test(needle) && needle.length >= 3
      ? email.split('@')[0].includes(needle)
      : false;
  if (emailMatches) return true;

  // 화면에서 마스킹한 가운데 번호를 검색 결과로 역추론할 수 없도록 공개된 뒤 4자리만 검색한다.
  const phoneDigits = needle.replace(/\D/g, '');
  const isPhoneSearch = /^[\d\s-]+$/.test(needle)
    && phoneDigits.length === PHONE_SUFFIX_SEARCH_DIGITS;
  const phoneSuffix = admin.phoneNumber.replace(/\D/g, '').slice(-PHONE_SUFFIX_SEARCH_DIGITS);
  return isPhoneSearch && phoneSuffix === phoneDigits;
}

function roleTone(role: Role): 'accent' | 'info' | 'success' | 'warning' {
  if (role === 'SUPER_ADMIN') return 'accent';
  if (role === 'GENERAL_ADMIN') return 'info';
  if (role === 'COMMUNITY_ADMIN') return 'success';
  return 'warning';
}

export function AdminsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const syncAuditLog = useAuditLogSync();
  const { searchParams, patchParams, resetParams } = useListParams();
  const keyword = searchParams.get('keyword') ?? '';
  const role = (searchParams.get('role') as AdminRoleFilter | null) ?? 'ALL';
  const [editing, setEditing] = useState<AdminAccount | null>(null);
  const [nextRole, setNextRole] = useState<Role>('GENERAL_ADMIN');

  const query = useQuery({ queryKey: adminKeys.all, queryFn: fetchAdmins });

  const closeRoleModal = useCallback(() => setEditing(null), []);

  const visibleAdmins = useMemo(() => {
    const needle = keyword.trim().toLocaleLowerCase();
    return (query.data ?? [])
      .filter((admin) => (role === 'ALL' ? true : admin.role === role))
      .filter((admin) => {
        if (!needle) return true;
        return matchesAdminKeyword(admin, needle);
      });
  }, [query.data, keyword, role]);

  const roleMutation = useMutation({
    mutationFn: (vars: { id: number; role: Role }) =>
      updateAdminRole({
        id: vars.id,
        body: { role: vars.role },
        adminUsername: session?.username ?? 'unknown',
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData<AdminAccount[]>(adminKeys.all, (current) =>
        (current ?? []).map((admin) => (admin.id === updated.id ? updated : admin)),
      );
      syncAuditLog();
      setEditing(null);
      toast.success('관리자 권한을 변경했습니다', `${updated.username} · ${ROLE_LABEL[updated.role]}`);
    },
    onError: (error) => toast.error('권한 변경에 실패했습니다', error instanceof Error ? error.message : undefined),
  });

  function openRoleModal(admin: AdminAccount) {
    setEditing(admin);
    setNextRole(admin.role);
  }

  const columns: Column<AdminAccount>[] = [
    {
      key: 'account',
      header: '관리자 계정',
      render: (row) => <StackedCell primary={row.nickname || row.username} secondary={row.username} />,
    },
    {
      key: 'contact',
      header: '연락처',
      width: '240px',
      render: (row) => <StackedCell primary={maskEmail(row.email)} secondary={maskPhone(row.phoneNumber)} />,
    },
    {
      key: 'role',
      header: '권한',
      width: '150px',
      render: (row) => <StatusPill tone={roleTone(row.role)} shape="pill">{ROLE_LABEL[row.role]}</StatusPill>,
    },
    {
      key: 'createdAt',
      header: '생성일시',
      width: '168px',
      numeric: true,
      render: (row) => <span className="muted">{formatDateTime(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: <span className="sr-only">관리</span>,
      width: '112px',
      align: 'right',
      render: (row) => (
        <RowActions>
          {row.username === session?.username ? (
            <span className="muted">현재 계정</span>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => openRoleModal(row)}>권한 변경</Button>
          )}
        </RowActions>
      ),
    },
  ];

  return (
    <div className="admins">
      <ListToolbar
        search={
          <SearchInput
            value={keyword}
            onSearch={(value) => patchParams({ keyword: value })}
            placeholder="아이디 · 이름 · 이메일 · 전화번호 뒤 4자리"
            aria-label="관리자 검색"
          />
        }
      >
        <span className="muted">총 {query.data?.length ?? 0}명</span>
        <Select aria-label="관리자 권한 필터" value={role} onChange={(event) => patchParams({ role: event.target.value === 'ALL' ? null : event.target.value })}>
          <option value="ALL">권한: 전체</option>
          {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </ListToolbar>

      <Card flush>
        <Table
          caption="관리자 계정 목록"
          columns={columns}
          rows={visibleAdmins}
          rowKey={(row) => row.id}
          loading={query.isPending}
          error={query.isError ? '관리자 계정 목록을 불러오지 못했습니다.' : undefined}
          emptyState={
            <EmptyState
              title="조회된 관리자 계정이 없습니다"
              description="검색어나 권한 필터를 바꿔보세요."
              icon={<Icon name="nav-admins" />}
              action={<Button size="sm" onClick={resetParams}>필터 초기화</Button>}
            />
          }
        />
      </Card>

      <Modal
        open={editing !== null}
        onClose={closeRoleModal}
        title="관리자 권한 변경"
        description={editing ? `${editing.nickname || editing.username} (${editing.username})` : undefined}
        size="sm"
        footer={
          <>
            <Button onClick={closeRoleModal} disabled={roleMutation.isPending}>취소</Button>
            <Button
              variant="primary"
              loading={roleMutation.isPending}
              disabled={!editing || editing.role === nextRole}
              onClick={() => editing && roleMutation.mutate({ id: editing.id, role: nextRole })}
            >
              변경 저장
            </Button>
          </>
        }
      >
        <div className="admins__role-form">
          <FormField label="변경할 권한" required hint="저장 즉시 해당 관리자의 접근 가능한 메뉴와 API 권한이 달라집니다.">
            {(props) => (
              <Select {...props} value={nextRole} onChange={(event) => setNextRole(event.target.value as Role)}>
                {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label} — {option.hint}</option>)}
              </Select>
            )}
          </FormField>
          {editing ? (
            <div className="admins__role-change" aria-live="polite">
              <span>{ROLE_LABEL[editing.role]}</span>
              <span aria-hidden="true">→</span>
              <strong>{ROLE_LABEL[nextRole]}</strong>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
