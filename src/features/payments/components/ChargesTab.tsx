import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SetURLSearchParams } from 'react-router-dom';
import { Button, Column, RowActions, Select, StackedCell, StatusPill } from '@/shared/ui';
import { FundsTabLayout } from './FundsTabLayout';
import { formatCurrency, formatDateTime, maskEmail, maskName, memberRef } from '@/shared/lib/format';
import { chargeStatusMeta, type ChargeStatus } from '@/shared/lib/wallet';
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
  { value: 'REFUNDED', label: '환불' },
  { value: 'CANCELLED', label: '취소' },
  { value: 'EXPIRED', label: '만료' },
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
 * ⚠️ 검색어는 서버가 **주문자 실명 또는 이메일 부분일치**로 처리한다
 *    (`GET /admin/finance/charges`, 백엔드 회신 2026-08-29).
 *    이메일 부분일치는 4일차에 차단한 마스킹 우회 경로와 같은 형태다 —
 *    화면이 `min******@gmail.com` 로 가려 둔 값을 조각으로 질의해 되짚을 수 있다.
 *    클라이언트에서 막을 수 없어 이메일 검색을 유도하지 않도록 안내만 실명으로 바꿔 두고,
 *    서버 검색 대상에서 이메일을 빼 달라고 요청해야 한다.
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
            /* 실서버 거래 원장에는 이메일이 없다. 빈 값이면 구분점째로 뺀다. */
            secondary={[memberRef(row.userId), row.userEmail ? maskEmail(row.userEmail) : null]
              .filter(Boolean)
              .join(' · ')}
          />
        ) : (
          /*
           * 용돈 이동은 "누가 누구에게" 가 핵심이라 보낸 사람 → 받은 사람으로 적는다.
           * 다만 실서버 원장은 보내는 쪽 기록이라 받는 자녀를 알 수 없다.
           * 모르는 쪽을 "자녀 #0" 으로 찍으면 실제 회원처럼 보이므로 물음표로 둔다.
           */
          <StackedCell
            primary={`${maskName(row.fromUserName)} → ${row.toUserName ? maskName(row.toUserName) : '?'}`}
            secondary={`${memberRef(row.fromUserId)} → ${row.toUserId > 0 ? memberRef(row.toUserId, '자녀') : '자녀 미상'}`}
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
          <StatusPill tone={chargeStatusMeta(row.status).tone}>{chargeStatusMeta(row.status).label}</StatusPill>
        ) : (
          <StatusPill tone="neutral">완료</StatusPill>
        ),
    },
    {
      key: 'method',
      header: '수단',
      width: '112px',
      render: (row) =>
        row.kind === 'CHARGE' ? (
          row.method || <span className="muted">-</span>
        ) : (
          <span className="muted">지갑</span>
        ),
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
      /* 취소 사유가 길게 들어와도 좁은 칸에서 글자가 세로로 쌓이지 않게 폭을 주고
         단어 단위로 줄바꿈한다(cell-wrap). */
      width: '200px',
      cellClassName: 'cell-wrap',
      /*
       * 되돌린 건은 **누가 되돌렸는지**가 사유보다 먼저다. 관리자 취소와 부모 본인 환불이
       * status·refundedAt 으로는 구분되지 않아, 사유 유무로만 갈린다(refundedBy).
       * 구분 없이 사유만 보여주면 부모가 환불한 건이 "사유 없는 취소" 로 보인다.
       */
      render: (row) => {
        if (row.kind === 'TRANSFER') {
          return row.memo ? <span className="muted">{row.memo}</span> : <span className="muted">-</span>;
        }
        if (row.refundedBy === 'ADMIN') {
          return (
            <StackedCell primary="관리자 취소" secondary={row.cancelReason ?? '-'} />
          );
        }
        if (row.refundedBy === 'MEMBER') {
          return <span className="muted">본인 환불</span>;
        }
        return <span className="muted">-</span>;
      },
    },
    {
      key: 'actions',
      header: '액션',
      align: 'center',
      width: canManage ? '108px' : '48px',
      hoverOnly: true,
      render: (row) =>
        /*
         * 용돈 이동은 되돌리는 기능이 없다(명세 5.9 에도 없음). 충전만 취소할 수 있다.
         *
         * 취소는 PG 주문번호(merchantUid)를 대상으로 하는데, 「전체」·「용돈 이동」에서
         * 쓰는 거래 원장에는 그 값이 없다. 값이 없는 행에 버튼을 띄우면 눌러도 실패하므로
         * 「충전」 필터로 충전 목록을 볼 때만 버튼이 나온다.
         */
        canManage && row.kind === 'CHARGE' && row.status === 'PAID' && row.merchantUid ? (
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
      searchPlaceholder="회원명 검색"
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
