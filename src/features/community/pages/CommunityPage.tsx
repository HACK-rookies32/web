import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  ConfirmModal,
  type Column,
  EmptyState,
  ListToolbar,
  Pagination,
  RowActions,
  Select,
  SlideOver,
  StackedCell,
  Table,
  useToast,
} from '@/shared/ui';
import { useAuth } from '@/shared/auth/AuthContext';
import { useAuditLogSync } from '@/shared/hooks/useAuditLogSync';
import { useListParams } from '@/shared/hooks/useListParams';
import { formatDateTime, formatNumber } from '@/shared/lib/format';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@/shared/lib/constants';
import { communityKeys, deleteCommunityPost, fetchCommunityPosts } from '../api';
import type { CommunityPostListItem } from '../types';
import { CommunityDetailPanel } from '../components/CommunityDetailPanel';
import './CommunityPage.css';

export function CommunityPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const syncAuditLog = useAuditLogSync();
  const { hasRole, session } = useAuth();
  const { searchParams, patchParams, page } = useListParams();
  /* 표시 건수도 URL 로 관리해 새로고침·링크 공유에서 같은 목록이 나오게 한다. */
  const sizeParam = Number(searchParams.get('size') ?? DEFAULT_PAGE_SIZE);
  const size = PAGE_SIZE_OPTIONS.includes(sizeParam as (typeof PAGE_SIZE_OPTIONS)[number])
    ? sizeParam
    : DEFAULT_PAGE_SIZE;
  const selectedId = searchParams.get('id') ? Number(searchParams.get('id')) : null;
  /*
   * 커뮤니티 API 의 실제 요구 권한(서버 시큐리티 체인 확인, 2026-08-31).
   *
   *   /api/admin/community/**   SUPER_ADMIN · COMMUNITY_ADMIN
   *
   * 목록·상세·삭제가 한 체인으로 묶여 있어 **조회까지 두 역할 전용**이다.
   * 명세 5.5 는 목록·상세에 GENERAL_ADMIN 도 적어 두었으나 코드가 그렇지 않다 —
   * 문서만 보고 넓히면 목록부터 403 이 난다(메뉴 노출도 같은 기준으로 맞춰 두었다).
   *
   * ⚠️ 이 가드는 UX 용이며 실제 접근 통제는 서버가 담당한다.
   */
  const canModerate = hasRole(['SUPER_ADMIN', 'COMMUNITY_ADMIN']);
  const adminUsername = session?.username ?? 'unknown';

  const [deleteTarget, setDeleteTarget] = useState<CommunityPostListItem | null>(null);

  const params = useMemo(() => ({ page, size }), [page, size]);
  const query = useQuery({
    queryKey: communityKeys.list(params),
    queryFn: () => fetchCommunityPosts(params),
  });

  const closeDeleteModal = useCallback(() => setDeleteTarget(null), []);

  const deleteMutation = useMutation({
    mutationFn: (postId: number) => deleteCommunityPost({ postId, adminUsername }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all });
      syncAuditLog();
      patchParams({ id: null }, false);
      setDeleteTarget(null);
      toast.success('게시글을 삭제했습니다', '삭제 활동은 감사 로그에 기록됩니다.');
    },
    onError: (error) => toast.error('게시글 삭제에 실패했습니다', error instanceof Error ? error.message : undefined),
  });

  const columns: Column<CommunityPostListItem>[] = [
    {
      key: 'post',
      header: '게시글',
      render: (row) => (
        <div className="community__post-cell">
          <strong>{row.title}</strong>
          <span>{row.content}</span>
        </div>
      ),
    },
    {
      key: 'member',
      header: '작성자',
      width: '160px',
      /* 닉네임은 마스킹하지 않는다. 서비스 안에서 다른 사용자에게 그대로 보이는
         표시명이고, 응대에서는 이게 주 식별 수단이다(문의 화면과 같은 기준). */
      render: (row) => (
        <StackedCell primary={row.authorNickname} secondary={`회원 #${row.memberId}`} />
      ),
    },
    {
      key: 'createdAt',
      header: '작성일시',
      width: '168px',
      numeric: true,
      render: (row) => <span className="muted community__muted">{formatDateTime(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: <span className="sr-only">관리</span>,
      width: '96px',
      align: 'right',
      render: (row) => (
        <RowActions>
          {canModerate ? (
            <Button variant="ghost" size="sm" className="community__danger" onClick={() => setDeleteTarget(row)}>삭제</Button>
          ) : null}
        </RowActions>
      ),
    },
  ];

  return (
    <div className="community">
      <ListToolbar summary={`총 ${formatNumber(query.data?.totalElements ?? 0)}건`}>
        <Select
          aria-label="페이지당 표시 건수"
          value={size}
          onChange={(event) => patchParams({ size: event.target.value }, true)}
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}건씩 보기
            </option>
          ))}
        </Select>
      </ListToolbar>

      <Card flush>
        <Table
          caption="커뮤니티 게시글 목록"
          columns={columns}
          rows={query.data?.content ?? []}
          rowKey={(row) => row.id}
          loading={query.isPending}
          error={query.isError ? '게시글 목록을 불러오지 못했습니다.' : undefined}
          onRowClick={canModerate ? (row) => patchParams({ id: String(row.id) }, false) : undefined}
          rowLabel={(row) => `${row.title} 게시글 상세 보기`}
          emptyState={<EmptyState title="게시글이 없습니다" description="조회된 커뮤니티 게시글이 없습니다." />}
          footer={
            query.data && query.data.totalElements > 0 ? (
              <Pagination
                page={query.data.page}
                size={query.data.size}
                totalElements={query.data.totalElements}
                totalPages={query.data.totalPages}
                onChange={(next) => patchParams({ page: String(next) }, false)}
              />
            ) : undefined
          }
        />
      </Card>

      <SlideOver
        open={selectedId !== null && canModerate}
        onClose={() => patchParams({ id: null }, false)}
        title="게시글 상세"
        width={500}
      >
        {selectedId !== null && canModerate ? (
          <CommunityDetailPanel
            postId={selectedId}
            deleting={deleteMutation.isPending}
            onDelete={setDeleteTarget}
          />
        ) : null}
      </SlideOver>

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={closeDeleteModal}
        title="게시글 삭제"
        description="삭제된 게시글과 댓글은 관리자 화면에서 복구할 수 없습니다."
        pending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      >
        {`“${deleteTarget?.title}” 게시글을 삭제할까요?`}
      </ConfirmModal>

    </div>
  );
}
