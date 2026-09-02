import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  Column,
  CsvDownloadModal,
  DownloadGlyph,
  EmptyState,
  Icon,
  ListToolbar,
  Pagination,
  Select,
  SlideOver,
  StackedCell,
  StatusPill,
  Table,
  useToast,
} from '@/shared/ui';
import { formatDateTime, formatNumber } from '@/shared/lib/format';
import { useAuth } from '@/shared/auth/AuthContext';
import { inquiryStatus } from '@/shared/lib/status';
import { DEFAULT_PAGE_SIZE } from '@/shared/lib/constants';
import { useListParams } from '@/shared/hooks/useListParams';
import {
  createAnswer,
  deleteAnswer,
  fetchInquiries,
  fetchInquiriesCsv,
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

  const { hasRole, session } = useAuth();
  /* 문의 CSV 는 문의 담당 권한까지 허용한다 (명세 5.7). 회원 CSV 와 가드가 다르다. */
  const canDownloadCsv = hasRole(['SUPER_ADMIN', 'INQUIRY_ADMIN']);
  const [csvOpen, setCsvOpen] = useState(false);

  const { searchParams, patchParams, resetParams, page } = useListParams();
  const answered = (searchParams.get('answered') as 'ALL' | 'OPEN' | 'ANSWERED' | null) ?? 'ALL';
  const selectedId = searchParams.get('id') ? Number(searchParams.get('id')) : null;

  const params = useMemo(
    () => ({ answered, page, size: DEFAULT_PAGE_SIZE }),
    [answered, page],
  );

  const { data, isPending, isError } = useQuery({
    queryKey: inquiryKeys.list(params),
    queryFn: () => fetchInquiries(params),
  });

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
      /*
       * 닉네임은 마스킹하지 않는다. 서비스 안에서 다른 사용자에게 그대로 보이는
       * 표시명이고, 문의·커뮤니티 응대에서는 이게 주 식별 수단이다. 가리면
       * "민**빠" 가 되어 상담이 불가능해진다. 보호 대상인 실명(username)은
       * 회원 화면에서 계속 마스킹하므로 실명 노출은 늘지 않는다.
       */
      render: (row) => (
        <StackedCell primary={row.memberNickname} secondary={`회원 #${row.memberId}`} />
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
      <ListToolbar>
        {canDownloadCsv ? (
          <Button iconLeft={<DownloadGlyph />} onClick={() => setCsvOpen(true)}>
            문의 내역 CSV
          </Button>
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
      </ListToolbar>

      <Card flush>
        <Table
          caption="1:1 문의 목록"
          columns={columns}
          rows={data?.content ?? []}
          rowKey={(r) => r.id}
          loading={isPending}
          error={isError ? '문의 목록을 불러오지 못했습니다.' : undefined}
          onRowClick={(row) => patchParams({ id: String(row.id) }, false)}
          rowLabel={(row) => `${row.title} 문의 상세 보기`}
          emptyState={
            <EmptyState
              title="조회된 문의가 없습니다"
              description="상태 필터를 바꿔보세요."
              icon={<Icon name="nav-inquiries" />}
              action={
                <Button size="sm" onClick={resetParams}>
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

      <CsvDownloadModal
        open={csvOpen}
        title="1:1 문의 내역 CSV 다운로드"
        targetLabel={`전체 문의 ${formatNumber(data?.totalElements ?? 0)}건`}
        columnsLabel="문의ID · 작성자ID · 작성자닉네임 · 제목 · 내용 · 첨부파일URL · 링크URL · 답변여부 · 작성일 · 수정일 · 답변내용 · 답변일"
        filenamePrefix="inquiries"
        fetchCsv={() => fetchInquiriesCsv({ adminUsername: session?.username ?? 'unknown' })}
        successDescription={`${formatNumber(data?.totalElements ?? 0)}건의 문의 내역이 저장되었습니다.`}
        onClose={() => setCsvOpen(false)}
      />

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
