import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  ConfirmModal,
  type Column,
  EmptyState,
  FormField,
  ListToolbar,
  Modal,
  Pagination,
  RowActions,
  Select,
  SlideOver,
  Table,
  TextArea,
  useToast,
} from '@/shared/ui';
import { useAuth } from '@/shared/auth/AuthContext';
import { useAuditLogSync } from '@/shared/hooks/useAuditLogSync';
import { useListParams } from '@/shared/hooks/useListParams';
import { formatDateTime, formatNumber } from '@/shared/lib/format';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@/shared/lib/constants';
import {
  banCommunityMember,
  communityKeys,
  deleteCommunityPost,
  fetchCommunityPosts,
} from '../api';
import type { CommunityPostDetail, CommunityPostListItem, MemberBanRequest } from '../types';
import { CommunityDetailPanel } from '../components/CommunityDetailPanel';
import './CommunityPage.css';

export function CommunityPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const syncAuditLog = useAuditLogSync();
  const { hasRole, session } = useAuth();
  const { searchParams, patchParams, page } = useListParams();
  const sort = searchParams.get('sort') ?? 'id,desc';
  /* 표시 건수도 URL 로 관리해 새로고침·링크 공유에서 같은 목록이 나오게 한다. */
  const sizeParam = Number(searchParams.get('size') ?? DEFAULT_PAGE_SIZE);
  const size = PAGE_SIZE_OPTIONS.includes(sizeParam as (typeof PAGE_SIZE_OPTIONS)[number])
    ? sizeParam
    : DEFAULT_PAGE_SIZE;
  const selectedId = searchParams.get('id') ? Number(searchParams.get('id')) : null;
  /*
   * 명세 5.5 의 커뮤니티 API 별 요구 권한.
   *
   *   GET    /admin/community/posts        SUPER · GENERAL · COMMUNITY   ← 목록만 열려 있다
   *   GET    /admin/community/posts/{id}   SUPER · GENERAL · COMMUNITY   ← 문서 기준
   *   DELETE /admin/community/posts/{id}   SUPER · COMMUNITY
   *   POST   /admin/community/members/ban  SUPER · GENERAL · COMMUNITY   ← 문서 기준
   *
   * 여기서는 GENERAL_ADMIN 에게 목록만 열어 둔다. 상세·삭제·밴은 막는다.
   *
   * TODO(api): 상세 조회와 밴은 문서에 아직 GENERAL_ADMIN 이 적혀 있어 코드가 문서보다
   *            좁다. 삭제의 GENERAL_ADMIN 은 백엔드가 "잘못 들어간 것" 이라고 확인해
   *            문서에서 뺐는데, 나머지 둘도 같은 오기인지는 확인받지 못했다.
   *            **문서만 보고 넓히지 말 것.** 확인되면 이 주석과 함께 정리한다.
   *
   * ⚠️ 이 가드는 UX 용이며 실제 접근 통제는 서버가 담당한다.
   */
  const canModerate = hasRole(['SUPER_ADMIN', 'COMMUNITY_ADMIN']);
  const adminUsername = session?.username ?? 'unknown';

  const [deleteTarget, setDeleteTarget] = useState<CommunityPostListItem | null>(null);
  const [banTarget, setBanTarget] = useState<CommunityPostListItem | null>(null);
  const [banReason, setBanReason] = useState('');
  const [durationDays, setDurationDays] = useState(7);
  const [banError, setBanError] = useState('');

  const params = useMemo(() => ({ page, size, sort }), [page, size, sort]);
  const query = useQuery({
    queryKey: communityKeys.list(params),
    queryFn: () => fetchCommunityPosts(params),
  });

  const closeDeleteModal = useCallback(() => setDeleteTarget(null), []);

  const closeBanModal = useCallback(() => {
    setBanTarget(null);
    setBanReason('');
    setBanError('');
  }, []);

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

  const banMutation = useMutation({
    mutationFn: (vars: { memberId: number; body: MemberBanRequest }) =>
      banCommunityMember({ ...vars, adminUsername }),
    onSuccess: () => {
      const released = durationDays === 0;
      syncAuditLog();
      closeBanModal();
      toast.success(released ? '사용자 밴을 해제했습니다' : '사용자 밴을 적용했습니다');
    },
    onError: (error) => setBanError(error instanceof Error ? error.message : '처리에 실패했습니다.'),
  });

  function openBan(post: CommunityPostListItem | CommunityPostDetail) {
    setBanTarget(post);
    setBanReason('');
    setDurationDays(7);
    setBanError('');
  }

  function submitBan(event: FormEvent) {
    event.preventDefault();
    if (!banTarget || !banReason.trim()) {
      setBanError('처리 사유를 입력해 주세요.');
      return;
    }
    banMutation.mutate({
      memberId: banTarget.memberId,
      body: { reason: banReason.trim(), durationDays },
    });
  }

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
      width: '140px',
      render: (row) => <span className="muted community__muted">회원 #{row.memberId}</span>,
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

        <Select
          aria-label="게시글 정렬"
          value={sort}
          onChange={(event) => patchParams({ sort: event.target.value }, true)}
        >
          <option value="id,desc">최신순</option>
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
            canModerateMember={canModerate}
            deleting={deleteMutation.isPending}
            onDelete={setDeleteTarget}
            onBan={openBan}
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

      <Modal
        open={banTarget !== null}
        onClose={closeBanModal}
        title="커뮤니티 사용자 밴"
        description={`회원 #${banTarget?.memberId ?? ''}의 커뮤니티 활동을 제한합니다.`}
        size="sm"
        footer={
          <>
            <Button onClick={closeBanModal} disabled={banMutation.isPending}>취소</Button>
            <Button variant="dark" type="submit" form="community-ban-form" loading={banMutation.isPending}>{durationDays === 0 ? '밴 해제' : '밴 적용'}</Button>
          </>
        }
      >
        <form id="community-ban-form" className="community__ban-form" onSubmit={submitBan}>
          <FormField label="제한 기간" required>
            {(props) => (
              <Select {...props} value={durationDays} onChange={(event) => setDurationDays(Number(event.target.value))}>
                <option value={1}>1일</option>
                <option value={7}>7일</option>
                <option value={30}>30일</option>
                <option value={0}>밴 해제</option>
              </Select>
            )}
          </FormField>
          <FormField label="처리 사유" required error={banError || undefined}>
            {(props) => (
              <TextArea
                {...props}
                value={banReason}
                onChange={(event) => {
                  setBanReason(event.target.value);
                  if (banError) setBanError('');
                }}
                placeholder="예: 부적절 게시물 반복"
                maxLength={200}
              />
            )}
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
