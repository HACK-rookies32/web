import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  type Column,
  EmptyState,
  FormField,
  ListToolbar,
  Modal,
  PageHeader,
  RowActions,
  SearchInput,
  StatusPill,
  Table,
  TextInput,
  useToast,
} from '@/shared/ui';
import { formatDateTime } from '@/shared/lib/format';
import {
  createHarmfulKeyword,
  deleteHarmfulKeyword,
  fetchHarmfulKeywords,
  harmfulKeywordKeys,
} from '../api';
import type { HarmfulKeyword } from '../types';
import './HarmfulKeywordsPage.css';

export function HarmfulKeywordsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [keyword, setKeyword] = useState('');
  const search = searchParams.get('keyword') ?? '';
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HarmfulKeyword | null>(null);
  const [fieldError, setFieldError] = useState('');

  const query = useQuery({
    queryKey: harmfulKeywordKeys.all,
    queryFn: fetchHarmfulKeywords,
  });

  const visibleKeywords = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    if (!needle) return query.data ?? [];
    return (query.data ?? []).filter((item) =>
      item.keyword.toLocaleLowerCase().includes(needle),
    );
  }, [query.data, search]);

  const createMutation = useMutation({
    mutationFn: createHarmfulKeyword,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: harmfulKeywordKeys.all });
      setAddOpen(false);
      setKeyword('');
      setFieldError('');
      toast.success('차단 키워드를 추가했습니다', `“${created.keyword}”이 차단 목록에 반영되었습니다.`);
    },
    onError: (error) => {
      setFieldError(error instanceof Error ? error.message : '키워드를 추가하지 못했습니다.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHarmfulKeyword,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: harmfulKeywordKeys.all });
      setDeleteTarget(null);
      toast.success('차단 키워드를 제외했습니다');
    },
    onError: () => toast.error('삭제에 실패했습니다', '잠시 후 다시 시도해 주세요.'),
  });

  const handleSearch = useCallback(
    (value: string) => {
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous);
        const normalized = value.trim();
        if (normalized) next.set('keyword', normalized);
        else next.delete('keyword');
        return next;
      });
    },
    [setSearchParams],
  );

  function openAddModal() {
    setKeyword('');
    setFieldError('');
    setAddOpen(true);
  }

  function submitKeyword(event: FormEvent) {
    event.preventDefault();
    const normalized = keyword.trim();
    if (!normalized) {
      setFieldError('차단할 키워드를 입력해 주세요.');
      return;
    }
    if (!/^[A-Za-z]+$/.test(normalized)) {
      setFieldError('영어 한 단어만 입력할 수 있습니다.');
      return;
    }
    if (normalized.length > 50) {
      setFieldError('키워드는 50자 이내로 입력해 주세요.');
      return;
    }
    createMutation.mutate({ keyword: normalized });
  }

  const columns: Column<HarmfulKeyword>[] = [
    {
      key: 'keyword',
      header: '차단 키워드',
      render: (row) => (
        <div className="harmful__keyword-cell">
          <span className="harmful__keyword">{row.keyword}</span>
          <StatusPill tone="danger" shape="pill">차단 중</StatusPill>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: '등록일시',
      width: '220px',
      render: (row) => <span className="harmful__muted tabular">{formatDateTime(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: <span className="sr-only">관리</span>,
      width: '120px',
      align: 'right',
      render: (row) => (
        <RowActions>
          <Button variant="ghost" size="sm" className="harmful__delete" onClick={() => setDeleteTarget(row)}>
            제외
          </Button>
        </RowActions>
      ),
    },
  ];

  const totalCount = query.data?.length ?? 0;

  return (
    <div className="harmful">
      <PageHeader
        title="유해사이트 관리"
        description="유해 사이트 접근을 감지하는 차단 키워드를 등록하고 관리합니다."
        badge={<StatusPill tone="accent" shape="pill">총 {totalCount}개</StatusPill>}
        actions={<Button variant="primary" onClick={openAddModal}>키워드 추가</Button>}
      />

      <Card className="harmful__guide">
        <div className="harmful__guide-content">
          <span className="harmful__guide-mark" aria-hidden="true">!</span>
          <div>
            <strong>차단 키워드는 즉시 정책에 반영됩니다.</strong>
            <p>오탐 가능성을 줄이기 위해 너무 짧거나 일반적인 단어는 피해주세요.</p>
          </div>
        </div>
      </Card>

      <ListToolbar
        search={
          <SearchInput
            value={search}
            onSearch={handleSearch}
            placeholder="차단 키워드 검색"
            aria-label="차단 키워드 검색"
          />
        }
      >
        <span className="harmful__result-count">검색 결과 {visibleKeywords.length}개</span>
      </ListToolbar>

      <Card flush>
        <Table
          columns={columns}
          rows={visibleKeywords}
          rowKey={(row) => row.id}
          caption="차단 키워드 목록"
          loading={query.isPending}
          error={query.isError ? '차단 키워드 목록을 불러오지 못했습니다.' : undefined}
          emptyState={
            <EmptyState
              title={search ? '검색 결과가 없습니다' : '등록된 차단 키워드가 없습니다'}
              description={search ? '다른 검색어를 입력해 보세요.' : '키워드를 추가해 유해 사이트를 차단하세요.'}
              action={!search ? <Button variant="primary" size="sm" onClick={openAddModal}>키워드 추가</Button> : undefined}
            />
          }
        />
      </Card>

      <Modal
        open={addOpen}
        onClose={() => !createMutation.isPending && setAddOpen(false)}
        title="차단 키워드 추가"
        description="입력한 단어가 포함된 사이트 접근을 차단합니다."
        size="sm"
        footer={
          <>
            <Button onClick={() => setAddOpen(false)} disabled={createMutation.isPending}>취소</Button>
            <Button variant="primary" type="submit" form="harmful-keyword-form" loading={createMutation.isPending}>추가</Button>
          </>
        }
      >
        <form id="harmful-keyword-form" onSubmit={submitKeyword}>
          <FormField label="키워드" required error={fieldError || undefined} hint="예: gambling, 불법 베팅">
            {(props) => (
              <TextInput
                {...props}
                value={keyword}
                onChange={(event) => {
                  setKeyword(event.target.value);
                  if (fieldError) setFieldError('');
                }}
                placeholder="차단할 키워드를 입력하세요"
                maxLength={50}
                autoComplete="off"
              />
            )}
          </FormField>
        </form>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => !deleteMutation.isPending && setDeleteTarget(null)}
        title="차단 키워드 제외"
        description="제외한 키워드는 더 이상 유해 사이트 감지에 사용되지 않습니다."
        size="sm"
        footer={
          <>
            <Button onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>취소</Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              제외
            </Button>
          </>
        }
      >
        <p className="harmful__confirm">“{deleteTarget?.keyword}” 키워드를 차단 목록에서 제외할까요?</p>
      </Modal>
    </div>
  );
}
