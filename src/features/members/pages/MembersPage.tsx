import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  Column,
  EmptyState,
  Icon,
  ListToolbar,
  Modal,
  Pagination,
  RowActions,
  SearchInput,
  Select,
  StackedCell,
  StatusPill,
  Table,
  useToast,
} from '@/shared/ui';
import { formatDate, formatNumber, formatRelative, maskEmail, maskName } from '@/shared/lib/format';
import { MEMBER_STATUS, type MemberStatus } from '@/shared/lib/status';
import { DEFAULT_PAGE_SIZE } from '@/shared/lib/constants';
import { useAuth } from '@/shared/auth/AuthContext';
import { deleteMember, fetchMember, fetchMembers, memberKeys, updateMember } from '../api';
import type { MemberDetail, MemberListItem, MemberUpdateRequest } from '../types';
import { ChevronGlyph, PencilGlyph, PlusGlyph } from '../components/Glyphs';
import { ExpandedDevices } from '../components/ExpandedDevices';
import { MemberQuickView } from '../components/MemberQuickView';
import { MemberFormModal } from '../components/MemberFormModal';
import './MembersPage.css';

const STATUS_FILTERS: { value: MemberStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '상태: 전체' },
  { value: 'ACTIVE', label: '활성' },
  { value: 'SUSPENDED', label: '정지' },
  { value: 'WITHDRAWN', label: '탈퇴' },
];

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
  const { hasRole } = useAuth();
  const canManage = hasRole(['SUPER_ADMIN']); // 수정·삭제는 SUPER_ADMIN 전용 (명세 5.2)

  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = searchParams.get('keyword') ?? '';
  const status = (searchParams.get('status') as MemberStatus | 'ALL' | null) ?? 'ALL';
  const page = Number(searchParams.get('page') ?? '0');

  const [expanded, setExpanded] = useState<number[]>([]);
  const [quickView, setQuickView] = useState<MemberListItem | null>(null);
  const [editing, setEditing] = useState<MemberDetail | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MemberListItem | null>(null);

  const params = useMemo(
    () => ({ keyword, status, page, size: DEFAULT_PAGE_SIZE }),
    [keyword, status, page],
  );

  const { data, isPending, isError, error } = useQuery({
    queryKey: memberKeys.list(params),
    queryFn: () => fetchMembers(params),
  });

  /** 쿼리 파라미터를 부분 갱신한다. 필터가 바뀌면 페이지는 0으로 되돌린다. */
  const patchParams = useCallback(
    (patch: Record<string, string | null>, resetPage = true) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(patch).forEach(([k, v]) => {
          if (v === null || v === '') next.delete(k);
          else next.set(k, v);
        });
        if (resetPage) next.delete('page');
        return next;
      });
    },
    [setSearchParams],
  );

  const handleSearch = useCallback((value: string) => patchParams({ keyword: value }), [patchParams]);

  const updateMutation = useMutation({
    mutationFn: (vars: { memberId: number; body: MemberUpdateRequest }) =>
      updateMember(vars.memberId, vars.body),
    onSuccess: (member) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all });
      setFormOpen(false);
      setEditing(null);
      toast.success('회원 정보를 수정했습니다', `${maskName(member.name)} 회원의 정보가 갱신되었습니다.`);
    },
    onError: () => toast.error('수정에 실패했습니다', '잠시 후 다시 시도해 주세요.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (memberId: number) => deleteMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all });
      const name = deleteTarget ? maskName(deleteTarget.name) : '회원';
      setDeleteTarget(null);
      toast.success('회원을 삭제했습니다', `${name} 회원이 삭제되었으며 감사 로그에 기록되었습니다.`);
    },
    onError: () => toast.error('삭제에 실패했습니다', '잠시 후 다시 시도해 주세요.'),
  });

  async function openEdit(member: MemberListItem) {
    try {
      const detail = await fetchMember(member.memberId);
      setEditing(detail);
      setFormOpen(true);
    } catch {
      toast.error('회원 정보를 불러오지 못했습니다');
    }
  }

  function toggleExpand(memberId: number) {
    setExpanded((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId],
    );
  }

  const columns: Column<MemberListItem>[] = [
    {
      key: 'expand',
      header: <span className="sr-only">기기 목록 펼치기</span>,
      width: '44px',
      align: 'center',
      render: (row) => (
        <button
          type="button"
          className="members__expand"
          onClick={(e) => {
            e.stopPropagation();
            toggleExpand(row.memberId);
          }}
          aria-expanded={expanded.includes(row.memberId)}
          aria-label={`${maskName(row.name)} 연결 기기 ${expanded.includes(row.memberId) ? '접기' : '펼치기'}`}
        >
          <ChevronGlyph open={expanded.includes(row.memberId)} />
        </button>
      ),
    },
    {
      key: 'member',
      header: '회원',
      width: '22%',
      render: (row) => <StackedCell primary={maskName(row.name)} secondary={maskEmail(row.email)} />,
    },
    {
      key: 'children',
      header: '연결 자녀',
      render: (row) =>
        row.children.length > 0 ? (
          <span className="members__children">
            <span className="members__children-count tabular">{row.children.length}명</span>
            <span className="members__children-names">
              {row.children.map((c) => maskName(c.name)).join(', ')}
            </span>
          </span>
        ) : (
          <span className="members__muted">-</span>
        ),
    },
    {
      key: 'devices',
      header: '등록 기기',
      align: 'center',
      numeric: true,
      width: '88px',
      render: (row) => (row.deviceCount > 0 ? `${row.deviceCount}대` : <span className="members__muted">-</span>),
    },
    {
      key: 'status',
      header: '상태',
      width: '88px',
      render: (row) => (
        <StatusPill tone={MEMBER_STATUS[row.status].tone}>{MEMBER_STATUS[row.status].label}</StatusPill>
      ),
    },
    {
      key: 'createdAt',
      header: '가입일',
      numeric: true,
      width: '104px',
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: 'lastLoginAt',
      header: '최근 접속',
      width: '104px',
      render: (row) => <span className="members__muted">{formatRelative(row.lastLoginAt)}</span>,
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
            aria-label={`${maskName(row.name)} 빠른 보기`}
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
                aria-label={`${maskName(row.name)} 정보 수정`}
                onClick={() => void openEdit(row)}
              >
                <PencilGlyph />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="btn--icon-only members__danger"
                aria-label={`${maskName(row.name)} 삭제`}
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
            placeholder="회원명 · 이메일 · 아이디 검색"
            aria-label="회원 검색"
          />
        }
      >
        <Select
          value={status}
          onChange={(e) => patchParams({ status: e.target.value === 'ALL' ? null : e.target.value })}
          aria-label="계정 상태 필터"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>

        {canManage ? (
          <Button
            variant="primary"
            iconLeft={<PlusGlyph />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            회원 추가
          </Button>
        ) : null}
      </ListToolbar>

      <Card flush>
        <Table
          caption="회원 목록"
          columns={columns}
          rows={data?.content ?? []}
          rowKey={(r) => r.memberId}
          loading={isPending}
          error={isError ? (error instanceof Error ? error.message : '알 수 없는 오류') : undefined}
          onRowClick={(row) => navigate(`/members/${row.memberId}`)}
          renderExpanded={(row) => <ExpandedDevices memberId={row.memberId} />}
          expandedKeys={expanded}
          emptyState={
            <EmptyState
              title="조회된 회원이 없습니다"
              description={
                keyword || status !== 'ALL'
                  ? '검색어나 상태 필터를 바꿔보세요.'
                  : '아직 등록된 회원이 없습니다.'
              }
              icon={<Icon name="search" />}
              action={
                keyword || status !== 'ALL' ? (
                  <Button size="sm" onClick={() => setSearchParams(new URLSearchParams())}>
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
        onSubmit={(values) => {
          if (editing) {
            updateMutation.mutate({ memberId: editing.memberId, body: values });
          } else {
            // TODO(api): 관리자 전용 회원 생성 엔드포인트가 아직 없다.
            setFormOpen(false);
            toast.showToast({
              tone: 'info',
              title: '회원 추가는 백엔드 연동 후 제공됩니다',
              description: '관리자 전용 생성 API 가 준비되면 연결합니다.',
            });
          }
        }}
      />

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        size="sm"
        title="회원을 삭제할까요?"
        description="삭제한 회원은 되돌릴 수 없으며, 이 작업은 감사 로그에 기록됩니다."
        footer={
          <>
            <Button onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>
              취소
            </Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.memberId)}
            >
              삭제
            </Button>
          </>
        }
      >
        {deleteTarget ? (
          <p className="members__confirm">
            <strong>{maskName(deleteTarget.name)}</strong> ({maskEmail(deleteTarget.email)}) 회원과
            연결된 자녀 {formatNumber(deleteTarget.children.length)}명의 정보가 함께 삭제됩니다.
          </p>
        ) : null}
      </Modal>
    </div>
  );
}
