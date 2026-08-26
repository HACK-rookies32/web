import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SetURLSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  Column,
  EmptyState,
  Icon,
  ListToolbar,
  Pagination,
  SearchInput,
  Select,
  StackedCell,
  StatusPill,
  Table,
} from '@/shared/ui';
import { formatCurrency, formatDateTime, maskEmail, maskName } from '@/shared/lib/format';
import { CHARGE_STATUS, type ChargeStatus } from '@/shared/lib/wallet';
import { DEFAULT_PAGE_SIZE } from '@/shared/lib/constants';
import { fetchCharges, fundKeys } from '../api';
import type { ChargeItem } from '../types';

const STATUS_FILTERS: { value: ChargeStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '충전 상태: 전체' },
  { value: 'PAID', label: '완료' },
  { value: 'READY', label: '대기' },
  { value: 'FAILED', label: '실패' },
  { value: 'CANCELED', label: '취소' },
];

interface ChargesTabProps {
  keyword: string;
  status: ChargeStatus | 'ALL';
  userId?: number;
  page: number;
  patchParams: (patch: Record<string, string | null>, resetPage?: boolean) => void;
  setSearchParams: SetURLSearchParams;
}

/** 전체 회원의 지갑 충전 내역 (GET /admin/charges). */
export function ChargesTab({
  keyword,
  status,
  userId,
  page,
  patchParams,
  setSearchParams,
}: ChargesTabProps) {
  const params = useMemo(
    () => ({ keyword, status, userId, page, size: DEFAULT_PAGE_SIZE }),
    [keyword, status, userId, page],
  );

  const { data, isPending, isError } = useQuery({
    queryKey: fundKeys.charges(params),
    queryFn: () => fetchCharges(params),
  });

  const handleSearch = useCallback((value: string) => patchParams({ keyword: value }), [patchParams]);

  const columns: Column<ChargeItem>[] = [
    {
      key: 'user',
      header: '회원',
      width: '24%',
      render: (row) => <StackedCell primary={maskName(row.userName)} secondary={maskEmail(row.userEmail)} />,
    },
    {
      key: 'amount',
      header: '충전 금액',
      align: 'right',
      numeric: true,
      width: '120px',
      render: (row) => <span className="funds__amount">{formatCurrency(row.amount)}</span>,
    },
    {
      key: 'status',
      header: '상태',
      width: '96px',
      render: (row) => (
        <StatusPill tone={CHARGE_STATUS[row.status].tone}>{CHARGE_STATUS[row.status].label}</StatusPill>
      ),
    },
    { key: 'method', header: '결제수단', width: '112px', render: (row) => row.method },
    {
      key: 'createdAt',
      header: '충전 일시',
      numeric: true,
      width: '168px',
      render: (row) => formatDateTime(row.createdAt),
    },
    {
      key: 'note',
      header: '비고',
      render: (row) =>
        row.cancelReason ? (
          <span className="muted">{row.cancelReason}</span>
        ) : (
          <span className="muted">-</span>
        ),
    },
  ];

  return (
    <div className="funds__tab">
      <ListToolbar
        search={
          <SearchInput
            value={keyword}
            onSearch={handleSearch}
            placeholder="회원명 또는 이메일 검색"
            aria-label="충전 내역 검색"
          />
        }
      >
        <Select
          value={status}
          onChange={(e) => patchParams({ status: e.target.value === 'ALL' ? null : e.target.value })}
          aria-label="충전 상태 필터"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
      </ListToolbar>

      <Card flush>
        <Table
          caption="충전 내역"
          columns={columns}
          rows={data?.content ?? []}
          rowKey={(r) => r.chargeId}
          loading={isPending}
          error={isError ? '충전 내역을 불러오지 못했습니다.' : undefined}
          emptyState={
            <EmptyState
              title="조회된 충전 내역이 없습니다"
              description="검색어나 상태 필터를 바꿔보세요."
              icon={<Icon name="search" />}
              action={
                <Button size="sm" onClick={() => setSearchParams(new URLSearchParams({ tab: 'charges' }))}>
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
    </div>
  );
}
