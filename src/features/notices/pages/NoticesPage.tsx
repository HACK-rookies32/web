import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  ConfirmModal,
  Column,
  EmptyState,
  Icon,
  ListToolbar,
  Modal,
  Pagination,
  RowActions,
  SearchInput,
  Select,
  StatusPill,
  Table,
  useToast,
} from '@/shared/ui';
import { formatDateTime, formatRelative } from '@/shared/lib/format';
import { DEFAULT_PAGE_SIZE } from '@/shared/lib/constants';
import { useAuth } from '@/shared/auth/AuthContext';
import { useListParams } from '@/shared/hooks/useListParams';
import {
  broadcastNotification,
  createNotice,
  deleteNotice,
  fetchNotice,
  fetchNotices,
  noticeKeys,
  updateNotice,
} from '../api';
import type { NoticeDetail, NoticeListItem, NoticeRequest } from '../types';
import { NoticeFormModal } from '../components/NoticeFormModal';
import { BroadcastModal } from '../components/BroadcastModal';
import './NoticesPage.css';

const EXPOSE_FILTERS = [
  { value: 'ALL', label: '노출: 전체' },
  { value: 'EXPOSED', label: '모바일 노출' },
  { value: 'HIDDEN', label: '내부 전용' },
] as const;

/**
 * 공지 관리 (API 명세 5.3).
 * 목록 CRUD + 작성/수정 모달 + 전체 알림 발송.
 * 작성·수정·삭제·발송은 모두 SUPER_ADMIN 전용이다.
 */
export function NoticesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { hasRole, session } = useAuth();
  const canManage = hasRole(['SUPER_ADMIN']);
  const adminUsername = session?.username ?? 'unknown';

  const { searchParams, patchParams, page } = useListParams();
  const keyword = searchParams.get('keyword') ?? '';
  const exposeMobile = (searchParams.get('expose') as 'ALL' | 'EXPOSED' | 'HIDDEN' | null) ?? 'ALL';

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<NoticeDetail | null>(null);
  const [preview, setPreview] = useState<NoticeDetail | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NoticeListItem | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  const params = useMemo(
    () => ({ keyword, exposeMobile, page, size: DEFAULT_PAGE_SIZE }),
    [keyword, exposeMobile, page],
  );

  const { data, isPending, isError } = useQuery({
    queryKey: noticeKeys.list(params),
    queryFn: () => fetchNotices(params),
  });

  const handleSearch = useCallback((value: string) => patchParams({ keyword: value }), [patchParams]);

  const saveMutation = useMutation({
    mutationFn: (vars: { noticeId?: number; body: NoticeRequest }) =>
      vars.noticeId
        ? updateNotice({ noticeId: vars.noticeId, body: vars.body, adminUsername })
        : createNotice({ body: vars.body, adminUsername }),
    onSuccess: (notice, vars) => {
      queryClient.invalidateQueries({ queryKey: noticeKeys.all });
      setFormOpen(false);
      setEditing(null);
      toast.success(
        vars.noticeId ? '공지를 수정했습니다' : '공지를 등록했습니다',
        notice.exposeMobile ? '모바일 공지 페이지에도 표시됩니다.' : '관리자 콘솔에서만 보입니다.',
      );
    },
    onError: () => toast.error('저장에 실패했습니다', '잠시 후 다시 시도해 주세요.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (target: NoticeListItem) =>
      deleteNotice({ noticeId: target.noticeId, title: target.title, adminUsername }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noticeKeys.all });
      setDeleteTarget(null);
      toast.success('공지를 삭제했습니다', '이 작업은 감사 로그에 기록되었습니다.');
    },
    onError: () => toast.error('삭제에 실패했습니다', '잠시 후 다시 시도해 주세요.'),
  });

  const broadcastMutation = useMutation({
    mutationFn: (body: Parameters<typeof broadcastNotification>[0]['body']) =>
      broadcastNotification({ body, adminUsername }),
    onSuccess: () => {
      setBroadcastOpen(false);
      toast.success('전체 알림을 발송했습니다', '모든 회원에게 푸시 전송이 접수되었습니다.');
    },
    onError: () => toast.error('알림 발송에 실패했습니다', '잠시 후 다시 시도해 주세요.'),
  });

  async function openDetail(noticeId: number, mode: 'view' | 'edit') {
    try {
      const detail = await fetchNotice(noticeId);
      if (mode === 'edit') {
        setEditing(detail);
        setFormOpen(true);
      } else {
        setPreview(detail);
      }
    } catch {
      toast.error('공지를 불러오지 못했습니다');
    }
  }

  const columns: Column<NoticeListItem>[] = [
    {
      key: 'title',
      header: '제목',
      render: (row) => (
        <span className="notices__title">
          <span className="notices__title-text">{row.title}</span>
          {row.attachmentCount > 0 ? (
            <span className="notices__chip">첨부 {row.attachmentCount}</span>
          ) : null}
          {row.linkCount > 0 ? <span className="notices__chip">링크 {row.linkCount}</span> : null}
        </span>
      ),
    },
    {
      key: 'expose',
      header: '모바일 노출',
      width: '116px',
      render: (row) => (
        <StatusPill tone={row.exposeMobile ? 'success' : 'neutral'}>
          {row.exposeMobile ? '노출' : '내부 전용'}
        </StatusPill>
      ),
    },
    { key: 'author', header: '작성자', width: '96px', render: (row) => row.authorName },
    {
      key: 'createdAt',
      header: '작성일',
      numeric: true,
      width: '160px',
      render: (row) => formatDateTime(row.createdAt),
    },
    {
      key: 'updatedAt',
      header: '최근 수정',
      width: '104px',
      render: (row) => <span className="muted">{formatRelative(row.updatedAt)}</span>,
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
            aria-label={`${row.title} 내용 보기`}
            onClick={() => void openDetail(row.noticeId, 'view')}
          >
            <Icon name="eye-view" />
          </Button>
          {canManage ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void openDetail(row.noticeId, 'edit')}
                aria-label={`${row.title} 수정`}
              >
                수정
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="btn--icon-only notices__danger"
                aria-label={`${row.title} 삭제`}
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
    <div className="notices">
      <ListToolbar
        search={
          <SearchInput
            value={keyword}
            onSearch={handleSearch}
            placeholder="제목 · 본문 · 작성자 검색"
            aria-label="공지 검색"
          />
        }
      >
        <Select
          value={exposeMobile}
          onChange={(e) => patchParams({ expose: e.target.value === 'ALL' ? null : e.target.value })}
          aria-label="모바일 노출 필터"
        >
          {EXPOSE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>

        {canManage ? (
          <>
            <Button onClick={() => setBroadcastOpen(true)}>전체 알림 발송</Button>
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              공지 작성
            </Button>
          </>
        ) : null}
      </ListToolbar>

      <Card flush>
        <Table
          caption="공지 목록"
          columns={columns}
          rows={data?.content ?? []}
          rowKey={(r) => r.noticeId}
          loading={isPending}
          error={isError ? '공지 목록을 불러오지 못했습니다.' : undefined}
          onRowClick={(row) => void openDetail(row.noticeId, 'view')}
          emptyState={
            <EmptyState
              title="등록된 공지가 없습니다"
              description={keyword ? '검색어를 바꿔보세요.' : '첫 공지를 작성해 보세요.'}
              icon={<Icon name="nav-notices" />}
              action={
                canManage && !keyword ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                  >
                    공지 작성
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

      {/* ---- 내용 보기 ---- */}
      <Modal
        open={preview !== null}
        onClose={() => setPreview(null)}
        size="lg"
        title={preview?.title ?? ''}
        description={
          preview
            ? `${preview.authorName} · ${formatDateTime(preview.createdAt)}${preview.exposeMobile ? ' · 모바일 노출' : ' · 내부 전용'}`
            : undefined
        }
        footer={
          <>
            <Button onClick={() => setPreview(null)}>닫기</Button>
            {canManage && preview ? (
              <Button
                variant="primary"
                onClick={() => {
                  setEditing(preview);
                  setPreview(null);
                  setFormOpen(true);
                }}
              >
                수정
              </Button>
            ) : null}
          </>
        }
      >
        {preview ? (
          <div className="notices__preview">
            <p className="notices__preview-body">{preview.content}</p>

            {preview.links.length > 0 ? (
              <div className="notices__preview-block">
                <h3 className="notices__preview-heading">링크</h3>
                <ul className="notices__preview-list">
                  {preview.links.map((l) => (
                    <li key={l}>
                      {/* 외부 링크는 새 탭으로 열고 referrer 를 넘기지 않는다. */}
                      <a href={l} target="_blank" rel="noreferrer noopener">
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {preview.attachments.length > 0 ? (
              <div className="notices__preview-block">
                <h3 className="notices__preview-heading">첨부파일</h3>
                <ul className="notices__preview-list">
                  {preview.attachments.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <NoticeFormModal
        open={formOpen}
        notice={editing}
        submitting={saveMutation.isPending}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={(body) => saveMutation.mutate({ noticeId: editing?.noticeId, body })}
      />

      <BroadcastModal
        open={broadcastOpen}
        submitting={broadcastMutation.isPending}
        onClose={() => setBroadcastOpen(false)}
        onSubmit={(body) => broadcastMutation.mutate(body)}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="공지를 삭제할까요?"
        description="삭제한 공지는 되돌릴 수 없으며, 이 작업은 감사 로그에 기록됩니다."
        pending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
      >
        {deleteTarget ? <p className="notices__confirm">{deleteTarget.title}</p> : null}
      </ConfirmModal>
    </div>
  );
}
