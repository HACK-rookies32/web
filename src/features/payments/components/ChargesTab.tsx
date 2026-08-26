import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SetURLSearchParams } from 'react-router-dom';
import { Button, Column, RowActions, Select, StackedCell, StatusPill } from '@/shared/ui';
import { FundsTabLayout } from './FundsTabLayout';
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
  canManage: boolean;
  patchParams: (patch: Record<string, string | null>, resetPage?: boolean) => void;
  setSearchParams: SetURLSearchParams;
  onRefund: (charge: ChargeItem) => void;
}

/** 전체 회원의 지갑 충전 내역 (GET /admin/charges). */
export function ChargesTab({
  keyword,
  status,
  userId,
  page,
  canManage,
  patchParams,
  setSearchParams,
  onRefund,
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
              aria-label={`${maskName(row.userName)} 회원의 ${formatCurrency(row.amount)} 충전 취소`}
            >
              충전 취소
            </Button>
          </RowActions>
        ) : null,
    },
  ];

  return (
    <FundsTabLayout
      searchPlaceholder="회원명 또는 이메일 검색"
      searchLabel="충전 내역 검색"
      keyword={keyword}
      onSearch={handleSearch}
      filter={
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
      }
      caption="충전 내역"
      columns={columns}
      data={data}
      rowKey={(r) => r.chargeId}
      loading={isPending}
      error={isError}
      entityName="충전 내역"
      tab="charges"
      onResetFilters={(tab) => setSearchParams(new URLSearchParams({ tab }))}
      onPageChange={(next) => patchParams({ page: String(next) }, false)}
    />
  );
}
