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
  RowActions,
  SearchInput,
  Select,
  StackedCell,
  StatusPill,
  Table,
} from '@/shared/ui';
import { formatCurrency, formatDateTime, maskName } from '@/shared/lib/format';
import { STORE_PAYMENT_STATUS, type StorePaymentStatus } from '@/shared/lib/wallet';
import { DEFAULT_PAGE_SIZE } from '@/shared/lib/constants';
import { fetchStorePayments, fundKeys } from '../api';
import type { StorePayment } from '../types';

const STATUS_FILTERS: { value: StorePaymentStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '결제 상태: 전체' },
  { value: 'PAID', label: '결제 완료' },
  { value: 'REFUNDED', label: '환불' },
  { value: 'CANCELLED', label: '취소' },
];

interface StorePaymentsTabProps {
  keyword: string;
  status: StorePaymentStatus | 'ALL';
  childId?: number;
  page: number;
  canManage: boolean;
  patchParams: (patch: Record<string, string | null>, resetPage?: boolean) => void;
  setSearchParams: SetURLSearchParams;
  onRefund: (payment: StorePayment) => void;
}

/** 자녀의 매장 QR 결제 내역 (GET /admin/payments). */
export function StorePaymentsTab({
  keyword,
  status,
  childId,
  page,
  canManage,
  patchParams,
  setSearchParams,
  onRefund,
}: StorePaymentsTabProps) {
  const params = useMemo(
    () => ({ keyword, status, childId, page, size: DEFAULT_PAGE_SIZE }),
    [keyword, status, childId, page],
  );

  const { data, isPending, isError } = useQuery({
    queryKey: fundKeys.payments(params),
    queryFn: () => fetchStorePayments(params),
  });

  const handleSearch = useCallback((value: string) => patchParams({ keyword: value }), [patchParams]);

  const columns: Column<StorePayment>[] = [
    {
      key: 'child',
      header: '자녀 / 보호자',
      width: '20%',
      render: (row) => (
        <StackedCell
          primary={maskName(row.childName)}
          secondary={`보호자 ${maskName(row.parentName)}`}
        />
      ),
    },
    { key: 'merchant', header: '매장', render: (row) => row.merchantName },
    {
      key: 'amount',
      header: '결제 금액',
      align: 'right',
      numeric: true,
      width: '112px',
      render: (row) => <span className="funds__amount">{formatCurrency(row.amount)}</span>,
    },
    {
      key: 'balanceAfter',
      header: '결제 후 잔액',
      align: 'right',
      numeric: true,
      width: '120px',
      render: (row) => <span className="funds__muted">{formatCurrency(row.balanceAfter)}</span>,
    },
    {
      key: 'status',
      header: '상태',
      width: '104px',
      render: (row) => (
        <StatusPill tone={STORE_PAYMENT_STATUS[row.status].tone}>
          {STORE_PAYMENT_STATUS[row.status].label}
        </StatusPill>
      ),
    },
    {
      key: 'paidAt',
      header: '결제 일시',
      numeric: true,
      width: '168px',
      render: (row) => formatDateTime(row.paidAt),
    },
    {
      key: 'actions',
      header: '액션',
      align: 'center',
      width: canManage ? '108px' : '48px',
      hoverOnly: true,
      render: (row) =>
        canManage && row.status === 'PAID' ? (
          <RowActions>
            <Button
              variant="ghost"
              size="sm"
              className="funds__refund-btn"
              onClick={() => onRefund(row)}
              aria-label={`${maskName(row.childName)} ${row.merchantName} 결제 강제 환불`}
            >
              강제 환불
            </Button>
          </RowActions>
        ) : null,
    },
  ];

  return (
    <div className="funds__tab">
      <ListToolbar
        search={
          <SearchInput
            value={keyword}
            onSearch={handleSearch}
            placeholder="자녀명 · 보호자명 · 매장명 검색"
            aria-label="매장 결제 검색"
          />
        }
      >
        <Select
          value={status}
          onChange={(e) => patchParams({ status: e.target.value === 'ALL' ? null : e.target.value })}
          aria-label="결제 상태 필터"
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
          caption="매장 결제 내역"
          columns={columns}
          rows={data?.content ?? []}
          rowKey={(r) => r.paymentId}
          loading={isPending}
          error={isError ? '결제 내역을 불러오지 못했습니다.' : undefined}
          emptyState={
            <EmptyState
              title="조회된 결제 내역이 없습니다"
              description="검색어나 상태 필터를 바꿔보세요."
              icon={<Icon name="search" />}
              action={
                <Button size="sm" onClick={() => setSearchParams(new URLSearchParams({ tab: 'payments' }))}>
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
