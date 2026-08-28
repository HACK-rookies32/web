import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  ConfirmModal,
  Column,
  CsvDownloadModal,
  DownloadGlyph,
  EmptyState,
  Icon,
  ListToolbar,
  Pagination,
  RowActions,
  SearchInput,
  StackedCell,
  Table,
  useToast,
} from '@/shared/ui';
import {
  formatDate,
  formatNumber,
  maskAddress,
  maskEmail,
  maskName,
  maskPhone,
  memberRef,
} from '@/shared/lib/format';
import { DEFAULT_PAGE_SIZE } from '@/shared/lib/constants';
import { useAuth } from '@/shared/auth/AuthContext';
import { useAuditLogSync } from '@/shared/hooks/useAuditLogSync';
import { useListParams } from '@/shared/hooks/useListParams';
import {
  deleteMember,
  fetchMember,
  fetchMembers,
  fetchMembersCsv,
  memberKeys,
  updateMember,
} from '../api';
import type { Member, MemberUpdateRequest } from '../types';
import { PencilGlyph } from '../components/Glyphs';
import { MemberQuickView } from '../components/MemberQuickView';
import { MemberFormModal } from '../components/MemberFormModal';
import './MembersPage.css';


/**
 * 회원 관리 목록.
 *
 * 검색어·상태·페이지를 URL 쿼리로 관리한다. 새로고침하거나 링크를 공유해도
 * 같은 목록이 나오고, 뒤로 가기도 자연스럽게 동작한다.
 */
export function MembersPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { hasRole, session } = useAuth();
  const syncAuditLog = useAuditLogSync();
  const canManage = hasRole(['SUPER_ADMIN']); // 수정·삭제는 SUPER_ADMIN 전용 (명세 5.2)

  const { searchParams, patchParams, resetParams, page } = useListParams();
  const keyword = searchParams.get('keyword') ?? '';

  const [quickView, setQuickView] = useState<Member | null>(null);
  const [editing, setEditing] = useState<Member | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);

  const params = useMemo(() => ({ keyword, page, size: DEFAULT_PAGE_SIZE }), [keyword, page]);

  const { data, isPending, isError, error } = useQuery({
    queryKey: memberKeys.list(params),
    queryFn: () => fetchMembers(params),
  });

  const handleSearch = useCallback((value: string) => patchParams({ keyword: value }), [patchParams]);

  const updateMutation = useMutation({
    mutationFn: (vars: { memberId: number; body: MemberUpdateRequest }) =>
      updateMember({ ...vars, adminUsername: session?.username ?? 'unknown' }),
    onSuccess: (member) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all });
      syncAuditLog();
      setFormOpen(false);
      setEditing(null);
      toast.success('회원 정보를 수정했습니다', `${maskName(member.username)} 회원의 정보가 갱신되었습니다.`);
    },
    onError: () => toast.error('수정에 실패했습니다', '잠시 후 다시 시도해 주세요.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (memberId: number) =>
      deleteMember({ memberId, adminUsername: session?.username ?? 'unknown' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all });
      syncAuditLog();
      const name = deleteTarget ? maskName(deleteTarget.username) : '회원';
      setDeleteTarget(null);
      toast.success('회원을 삭제했습니다', `${name} 회원이 삭제되었으며 감사 로그에 기록되었습니다.`);
    },
    onError: () => toast.error('삭제에 실패했습니다', '잠시 후 다시 시도해 주세요.'),
  });

  async function openEdit(member: Member) {
    try {
      const detail = await fetchMember(member.id);
      setEditing(detail);
      setFormOpen(true);
    } catch {
      toast.error('회원 정보를 불러오지 못했습니다');
    }
  }

  const columns: Column<Member>[] = [
    {
      key: 'member',
      header: '회원',
      width: '22%',
      render: (row) => (
        <StackedCell
          primary={maskName(row.username)}
          secondary={`${memberRef(row.id)} · ${row.email ? maskEmail(row.email) : '이메일 없음'}`}
        />
      ),
    },
    {
      key: 'loginId',
      header: '로그인 ID',
      width: '132px',
      /* 로그인 아이디는 마스킹 대상이 아니다. */
      render: (row) => row.loginId,
    },
    {
      key: 'phone',
      header: '전화번호',
      width: '148px',
      render: (row) => <span className="tabular">{maskPhone(row.phoneNumber)}</span>,
    },
    {
      key: 'address',
      header: '주소',
      render: (row) =>
        row.address ? maskAddress(row.address) : <span className="muted">-</span>,
    },
    {
      key: 'role',
      header: '구분',
      align: 'center',
      width: '88px',
      render: (row) => (row.role === 'PARENT' ? '보호자' : '자녀'),
    },
    {
      key: 'createdAt',
      header: '가입일',
      numeric: true,
      width: '104px',
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: 'actions',
      header: '액션',
      align: 'center',
      width: canManage ? '116px' : '56px',
      hoverOnly: true,
      render: (row) => (
        <RowActions>
          <Button
            variant="ghost"
            size="sm"
            className="btn--icon-only"
            aria-label={`${maskName(row.username)} 빠른 보기`}
            onClick={() => setQuickView(row)}
          >
            <Icon name="eye-view" />
          </Button>

          {canManage ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="btn--icon-only"
                aria-label={`${maskName(row.username)} 정보 수정`}
                onClick={() => void openEdit(row)}
              >
                <PencilGlyph />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="btn--icon-only members__danger"
                aria-label={`${maskName(row.username)} 삭제`}
                onClick={() => setDeleteTarget(row)}
              >
                <Icon name="trash" />
              </Button>
            </>
          ) : null}
        </RowActions>
      ),
    },
  ];

  return (
    <div className="members">
      <ListToolbar
        search={
          <SearchInput
            value={keyword}
            onSearch={handleSearch}
            /* 검색 대상은 명세 5.2 기준 실명·아이디다. 마스킹한 이메일·전화번호는
               검색으로 되짚을 수 있어 대상에서 뺐다(api.ts 주석 참고). */
            placeholder="회원명(실명) · 아이디 검색"
            aria-label="회원 검색"
          />
        }
      >
        {/* 전체 회원 목록을 CSV 로 내려받는다. 개별 회원 리포트가 아니라 목록 전체다. */}
        <Button iconLeft={<DownloadGlyph />} onClick={() => setCsvOpen(true)}>
          회원 목록 CSV
        </Button>
      </ListToolbar>

      <Card flush>
        <Table
          caption="회원 목록"
          columns={columns}
          rows={data?.content ?? []}
          rowKey={(r) => r.id}
          loading={isPending}
          error={isError ? (error instanceof Error ? error.message : '알 수 없는 오류') : undefined}
          onRowClick={(row) => navigate(`/members/${row.id}`)}
          emptyState={
            <EmptyState
              title="조회된 회원이 없습니다"
              description={keyword ? '검색어를 바꿔보세요.' : '아직 등록된 회원이 없습니다.'}
              icon={<Icon name="search" />}
              action={
                keyword ? (
                  <Button size="sm" onClick={resetParams}>
                    필터 초기화
                  </Button>
                ) : undefined
              }
            />
          }
          footer={
            data && data.totalElements > 0 ? (
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                totalElements={data.totalElements}
                size={data.size}
                onChange={(next) => patchParams({ page: String(next) }, false)}
              />
            ) : undefined
          }
        />
      </Card>

      <MemberQuickView member={quickView} onClose={() => setQuickView(null)} />

      <MemberFormModal
        open={formOpen}
        member={editing}
        submitting={updateMutation.isPending}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        /* 이 모달은 수정 전용이다. 목록에 회원 추가 진입점이 없다. */
        onSubmit={(values) =>
          editing && updateMutation.mutate({ memberId: editing.id, body: values })
        }
      />

      <CsvDownloadModal
        open={csvOpen}
        title="회원 목록 CSV 다운로드"
        targetLabel={`전체 회원 ${formatNumber(data?.totalElements ?? 0)}명`}
        columnsLabel="회원ID · 로그인ID · 이름 · 닉네임 · 이메일 · 전화번호 · 주소 · 권한 · 부모ID · 탈퇴여부 · 가입일 · 수정일"
        filenamePrefix="members"
        fetchCsv={() => fetchMembersCsv({ adminUsername: session?.username ?? 'unknown' })}
        successDescription={`${formatNumber(data?.totalElements ?? 0)}명의 회원 정보가 저장되었습니다.`}
        onClose={() => setCsvOpen(false)}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="회원을 삭제할까요?"
        description="삭제한 회원은 되돌릴 수 없으며, 이 작업은 감사 로그에 기록됩니다."
        pending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      >
        {deleteTarget ? (
          <p className="members__confirm">
            <strong>{maskName(deleteTarget.username)}</strong> ({memberRef(deleteTarget.id)} ·{' '}
            {deleteTarget.loginId}) 회원을 삭제합니다. 이 회원에게 연결된 자녀 계정과 기기 정보도
            함께 정리됩니다.
          </p>
        ) : null}
      </ConfirmModal>
    </div>
  );
}
