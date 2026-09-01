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
  SlideOver,
  DetailBox,
  DetailRow,
  StackedCell,
  StatusPill,
  Table,
  useToast,
} from '@/shared/ui';
import { ROLE_LABEL, ROLE_OPTIONS } from '@/shared/lib/constants';
import { useAuth } from '@/shared/auth/AuthContext';
import { formatDateTime, maskEmail, maskPhone, memberRef } from '@/shared/lib/format';
import type { Role } from '@/shared/lib/types';
import { useAuditLogSync } from '@/shared/hooks/useAuditLogSync';
import { useListParams } from '@/shared/hooks/useListParams';
import { adminKeys, fetchAdmins, updateAdminRole } from '../api';
import type { AdminAccount, AdminRoleFilter } from '../types';
import './AdminsPage.css';

/**
 * 검색어가 관리자 한 명과 일치하는지 판정한다.
 *
 * [VULN-WEB-06] 민감정보 노출 — 검색을 통한 마스킹 역추론.
 *   화면에는 이메일·전화를 min***@…·010-****-8890 으로 가려 두면서, 검색은
 *   **원문 전체**를 부분일치시킨다. 가운데 번호·가린 로컬파트를 한 조각씩 질의해
 *   결과 유무로 되짚으면 가려 둔 값을 복원할 수 있다(CWE-200, ISMS-P 3.2.3
 *   "like 검색을 통한 과도한 정보 조회"). 대응: 검색 대상을 아이디·닉네임과
 *   이메일 앞 3자 시작·전체 일치, 전화 뒤 4자리 일치로만 제한.
 */
function matchesAdminKeyword(admin: AdminAccount, keyword: string): boolean {
  const needle = keyword.trim().toLocaleLowerCase();
  if (!needle) return true;

  return (
    admin.loginId.toLocaleLowerCase().includes(needle)
    || admin.nickname.toLocaleLowerCase().includes(needle)
    || admin.email.toLocaleLowerCase().includes(needle)
    || admin.phoneNumber.replace(/\D/g, '').includes(needle.replace(/\D/g, ''))
  );
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
  const [detail, setDetail] = useState<AdminAccount | null>(null);

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
      toast.success('관리자 권한을 변경했습니다', `${updated.loginId} · ${ROLE_LABEL[updated.role]}`);
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
      /*
       * 감사 로그는 권한 변경 대상을 `admin:5`(관리자 계정 #5)로 기록하고
       * 이 목록으로 링크를 건다. 목록에 계정 ID 가 없으면 링크를 타고 와도
       * 누구인지 찾을 수 없어 조사 동선이 끊긴다.
       */
      render: (row) => (
        <StackedCell
          primary={row.nickname || row.loginId}
          secondary={`${memberRef(row.id, '관리자')} · ${row.loginId}`}
        />
      ),
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
          {row.loginId === session?.username ? (
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
            placeholder="아이디 · 이름 · 이메일 전체 주소 · 전화번호 뒤 4자리"
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
          onRowClick={setDetail}
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

      {/* 관리자 계정 상세 — 행 클릭으로 연다. 목록이 이미 전체 필드를 주므로
          별도 조회 없이 그 데이터로 채운다(단일 관리자 조회 API 는 없다). */}
      <SlideOver
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={
          detail ? (
            <span className="admins__detail-title">
              {detail.nickname || detail.loginId}
              <StatusPill tone={roleTone(detail.role)} shape="pill">
                {ROLE_LABEL[detail.role]}
              </StatusPill>
            </span>
          ) : (
            ''
          )
        }
        subtitle={detail ? `${memberRef(detail.id, '관리자')} · ${detail.loginId}` : undefined}
        footer={
          detail && detail.loginId !== session?.username ? (
            <Button
              variant="primary"
              onClick={() => {
                openRoleModal(detail);
                setDetail(null);
              }}
            >
              권한 변경
            </Button>
          ) : undefined
        }
      >
        {detail ? (
          <DetailBox>
            <DetailRow
              label="권한"
              value={
                <StatusPill tone={roleTone(detail.role)} shape="pill">
                  {ROLE_LABEL[detail.role]}
                </StatusPill>
              }
            />
            <DetailRow label="로그인 ID" value={detail.loginId} />
            <DetailRow label="이메일" value={maskEmail(detail.email)} />
            <DetailRow label="휴대폰" value={maskPhone(detail.phoneNumber)} />
            <DetailRow label="생성일시" value={formatDateTime(detail.createdAt)} />
          </DetailBox>
        ) : null}
      </SlideOver>

      <Modal
        open={editing !== null}
        onClose={closeRoleModal}
        title="관리자 권한 변경"
        description={
          editing
            ? `${editing.nickname || editing.loginId} (${memberRef(editing.id, '관리자')} · ${editing.loginId})`
            : undefined
        }
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
