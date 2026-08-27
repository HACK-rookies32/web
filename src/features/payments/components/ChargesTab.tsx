import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SetURLSearchParams } from 'react-router-dom';
import { Button, Column, RowActions, Select, StackedCell, StatusPill } from '@/shared/ui';
import { FundsTabLayout } from './FundsTabLayout';
import { formatCurrency, formatDateTime, maskEmail, maskName, memberRef } from '@/shared/lib/format';
import { CHARGE_STATUS, type ChargeStatus } from '@/shared/lib/wallet';
import { DEFAULT_PAGE_SIZE } from '@/shared/lib/constants';
import { fetchFundsFlow, fundKeys } from '../api';
import type { ChargeItem, FundsFlowFilter, FundsFlowRow } from '../types';

const FLOW_FILTERS: { value: FundsFlowFilter; label: string }[] = [
  { value: 'ALL', label: '거래: 전체' },
  { value: 'CHARGE', label: '충전' },
  { value: 'TRANSFER', label: '용돈 이동' },
];

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
  flow: FundsFlowFilter;
  userId?: number;
  page: number;
  canManage: boolean;
  patchParams: (patch: Record<string, string | null>, resetPage?: boolean) => void;
  setSearchParams: SetURLSearchParams;
  onRefund: (charge: ChargeItem) => void;
}

/**
 * 지갑에 돈이 들어오고 자녀에게 건너가는 흐름.
 *
 * 부모가 카드로 넣은 충전(CHARGE)과 그 돈이 자녀에게 간 용돈 이동(TRANSFER)을
 * 한 목록에 시간순으로 섞어 보여준다. 둘은 이어지는 하나의 흐름이라 따로 보면
 * "충전은 됐는데 자녀에게 안 갔다" 같은 상황을 관리자가 알아채기 어렵다.
 */
export function ChargesTab({
  keyword,
  status,
  flow,
  userId,
  page,
  canManage,
  patchParams,
  setSearchParams,
  onRefund,
}: ChargesTabProps) {
  const params = useMemo(
    () => ({ keyword, status, flow, userId, page, size: DEFAULT_PAGE_SIZE }),
    [keyword, status, flow, userId, page],
  );

  const { data, isPending, isError } = useQuery({
    queryKey: fundKeys.flow(params),
    queryFn: () => fetchFundsFlow(params),
  });

  const handleSearch = useCallback((value: string) => patchParams({ keyword: value }), [patchParams]);

  const columns: Column<FundsFlowRow>[] = [
    {
      key: 'kind',
      header: '구분',
      width: '104px',
      render: (row) =>
        row.kind === 'CHARGE' ? (
          <StatusPill tone="success">충전</StatusPill>
        ) : (
          <StatusPill tone="info">용돈 이동</StatusPill>
        ),
    },
    {
      key: 'user',
      header: '회원',
      width: '24%',
      render: (row) =>
        row.kind === 'CHARGE' ? (
          <StackedCell
            primary={maskName(row.userName)}
            secondary={`${memberRef(row.userId)} · ${maskEmail(row.userEmail)}`}
          />
        ) : (
          /* 용돈 이동은 "누가 누구에게" 가 핵심이라 보낸 사람 → 받은 사람으로 적는다. */
          <StackedCell
            primary={`${maskName(row.fromUserName)} → ${maskName(row.toUserName)}`}
            secondary={`${memberRef(row.fromUserId)} → ${memberRef(row.toUserId, '자녀')}`}
          />
        ),
    },
    {
      key: 'amount',
      header: '금액',
      align: 'right',
      numeric: true,
      width: '120px',
      render: (row) => <span className="funds__amount">{formatCurrency(row.amount)}</span>,
    },
    {
      key: 'status',
      header: '상태',
      width: '96px',
      render: (row) =>
        row.kind === 'CHARGE' ? (
          <StatusPill tone={CHARGE_STATUS[row.status].tone}>{CHARGE_STATUS[row.status].label}</StatusPill>
        ) : (
          <StatusPill tone="neutral">완료</StatusPill>
        ),
    },
    {
      key: 'method',
      header: '수단',
      width: '112px',
      render: (row) => (row.kind === 'CHARGE' ? row.method : <span className="muted">지갑</span>),
    },
    {
      key: 'createdAt',
      header: '일시',
      numeric: true,
      width: '168px',
      render: (row) => formatDateTime(row.createdAt),
    },
    {
      key: 'note',
      header: '비고',
      render: (row) => {
        const note = row.kind === 'CHARGE' ? row.cancelReason : row.memo;
        return note ? <span className="muted">{note}</span> : <span className="muted">-</span>;
      },
    },
    {
      key: 'actions',
      header: '액션',
      align: 'center',
      width: canManage ? '108px' : '48px',
      hoverOnly: true,
      render: (row) =>
        /* 용돈 이동은 되돌리는 기능이 없다(명세 5.9 에도 없음). 충전만 취소할 수 있다. */
        canManage && row.kind === 'CHARGE' && row.status === 'PAID' ? (
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
      searchLabel="충전·용돈 내역 검색"
      keyword={keyword}
      onSearch={handleSearch}
      filter={
        <>
          <Select
            value={flow}
            onChange={(e) => patchParams({ flow: e.target.value === 'ALL' ? null : e.target.value })}
            aria-label="거래 종류 필터"
          >
            {FLOW_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>

          {/* 용돈 이동에는 충전 상태가 없어서, 상태를 고르면 충전만 남는다. */}
          <Select
            value={status}
            onChange={(e) => patchParams({ status: e.target.value === 'ALL' ? null : e.target.value })}
            aria-label="충전 상태 필터"
            disabled={flow === 'TRANSFER'}
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
        </>
      }
      caption="충전·용돈 내역"
      columns={columns}
      data={data}
      rowKey={(r) => (r.kind === 'CHARGE' ? `c${r.chargeId}` : `t${r.transferId}`)}
      loading={isPending}
      error={isError}
      entityName="충전·용돈 내역"
      tab="charges"
      onResetFilters={(tab) => setSearchParams(new URLSearchParams({ tab }))}
      onPageChange={(next) => patchParams({ page: String(next) }, false)}
    />
  );
}
