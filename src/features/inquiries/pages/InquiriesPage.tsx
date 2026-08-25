import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  Column,
  EmptyState,
  Icon,
  Pagination,
  SearchInput,
  Select,
  SlideOver,
  StackedCell,
  StatusPill,
  Table,
  useToast,
} from '@/shared/ui';
import { formatDateTime, formatNumber, maskName } from '@/shared/lib/format';
import { inquiryStatus } from '@/shared/lib/status';
import { DEFAULT_PAGE_SIZE } from '@/shared/lib/constants';
import {
  createAnswer,
  deleteAnswer,
  fetchInquiries,
  inquiryKeys,
  updateAnswer,
} from '../api';
import type { InquiryListItem } from '../types';
import { InquiryDetailPanel } from '../components/InquiryDetailPanel';
import './InquiriesPage.css';

const ANSWER_FILTERS = [
  { value: 'ALL', label: '상태: 전체' },
  { value: 'OPEN', label: '답변 대기' },
  { value: 'ANSWERED', label: '답변 완료' },
] as const;

/**
 * 1:1 문의 (API 명세 5.4).
 *
 * 목록에서 문의를 고르면 슬라이드오버로 상세와 답변 폼이 열린다.
 * 선택한 문의는 ?id= 로 URL 에 남기므로 대시보드·회원 상세에서 딥링크로 바로 열 수 있다.
 */
export function InquiriesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = searchParams.get('keyword') ?? '';
  const answered = (searchParams.get('answered') as 'ALL' | 'OPEN' | 'ANSWERED' | null) ?? 'ALL';
  const page = Number(searchParams.get('page') ?? '0');
  const selectedId = searchParams.get('id') ? Number(searchParams.get('id')) : null;

  const params = useMemo(
    () => ({ keyword, answered, page, size: DEFAULT_PAGE_SIZE }),
    [keyword, answered, page],
  );

  const { data, isPending, isError } = useQuery({
    queryKey: inquiryKeys.list(params),
    queryFn: () => fetchInquiries(params),
  });

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

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: inquiryKeys.all });
    if (selectedId) queryClient.invalidateQueries({ queryKey: inquiryKeys.detail(selectedId) });
  }

  const createMutation = useMutation({
    mutationFn: (vars: { id: number; content: string }) =>
      createAnswer(vars.id, { content: vars.content }),
    onSuccess: () => {
      invalidate();
      toast.success('답변을 등록했습니다', '회원에게 답변 알림이 전송됩니다.');
    },
    onError: (e) => toast.error('답변 등록에 실패했습니다', e instanceof Error ? e.message : undefined),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; content: string }) =>
      updateAnswer(vars.id, { content: vars.content }),
    onSuccess: () => {
      invalidate();
      toast.success('답변을 수정했습니다');
    },
    onError: (e) => toast.error('답변 수정에 실패했습니다', e instanceof Error ? e.message : undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAnswer(id),
    onSuccess: () => {
      invalidate();
      toast.success('답변을 삭제했습니다', '문의가 다시 답변 대기 상태가 됩니다.');
    },
    onError: (e) => toast.error('답변 삭제에 실패했습니다', e instanceof Error ? e.message : undefined),
  });

  const openCount = data?.content.filter((i) => !i.answered).length ?? 0;

  const columns: Column<InquiryListItem>[] = [
    {
      key: 'status',
      header: '상태',
      width: '104px',
      render: (row) => {
        const s = inquiryStatus(row.answered);
        return <StatusPill tone={s.tone}>{s.label}</StatusPill>;
      },
    },
    {
      key: 'title',
      header: '제목',
      render: (row) => <span className="inquiries__title">{row.title}</span>,
    },
    {
      key: 'member',
      header: '작성자',
      width: '160px',
      render: (row) => (
        <StackedCell primary={maskName(row.memberNickname)} secondary={`회원 #${row.memberId}`} />
      ),
    },
    {
      key: 'createdAt',
      header: '작성일시',
      numeric: true,
      width: '168px',
      render: (row) => formatDateTime(row.createdAt),
    },
  ];

  return (
    <div className="inquiries">
      <div className="inquiries__toolbar">
        <SearchInput
          className="inquiries__search"
          value={keyword}
          onSearch={handleSearch}
          placeholder="제목 · 내용 · 작성자 검색"
          aria-label="문의 검색"
        />

        <div className="inquiries__filters">
          {openCount > 0 ? (
            <span className="inquiries__badge">
              이 페이지 답변 대기 <strong className="tabular">{formatNumber(openCount)}</strong>건
            </span>
          ) : null}

          <Select
            value={answered}
            onChange={(e) => patchParams({ answered: e.target.value === 'ALL' ? null : e.target.value })}
            aria-label="답변 상태 필터"
          >
            {ANSWER_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Card flush>
        <Table
          caption="1:1 문의 목록"
          columns={columns}
          rows={data?.content ?? []}
          rowKey={(r) => r.id}
          loading={isPending}
          error={isError ? '문의 목록을 불러오지 못했습니다.' : undefined}
          onRowClick={(row) => patchParams({ id: String(row.id) }, false)}
          emptyState={
            <EmptyState
              title="조회된 문의가 없습니다"
              description="검색어나 상태 필터를 바꿔보세요."
              icon={<Icon name="nav-inquiries" />}
              action={
                <Button size="sm" onClick={() => setSearchParams(new URLSearchParams())}>
                  필터 초기화
                </Button>
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

      <SlideOver
        open={selectedId !== null}
        onClose={() => patchParams({ id: null }, false)}
        title="문의 상세"
        width={460}
      >
        {selectedId !== null ? (
          <InquiryDetailPanel
            inquiryId={selectedId}
            submitting={createMutation.isPending || updateMutation.isPending}
            deleting={deleteMutation.isPending}
            onCreateAnswer={(content) => createMutation.mutateAsync({ id: selectedId, content })}
            onUpdateAnswer={(content) => updateMutation.mutateAsync({ id: selectedId, content })}
            onDeleteAnswer={() => deleteMutation.mutateAsync(selectedId)}
          />
        ) : null}
      </SlideOver>
    </div>
  );
}
