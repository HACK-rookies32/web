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
import { formatCurrency, formatRelative, maskEmail, maskName } from '@/shared/lib/format';
import type { WalletSummary } from '@/shared/lib/wallet';
import { DEFAULT_PAGE_SIZE } from '@/shared/lib/constants';
import { fetchWallets, fundKeys } from '../api';

const ROLE_FILTERS: { value: 'ALL' | 'PARENT' | 'CHILD'; label: string }[] = [
  { value: 'ALL', label: '구분: 전체' },
  { value: 'PARENT', label: '보호자' },
  { value: 'CHILD', label: '자녀' },
];

interface WalletsTabProps {
  keyword: string;
  role: 'ALL' | 'PARENT' | 'CHILD';
  page: number;
  canManage: boolean;
  patchParams: (patch: Record<string, string | null>, resetPage?: boolean) => void;
  setSearchParams: SetURLSearchParams;
  onOpen: (wallet: WalletSummary) => void;
  onAdjust: (wallet: WalletSummary) => void;
}

/** 회원 지갑 목록 (GET /admin/wallets/{userId} 를 목록으로 확장). */
export function WalletsTab({
  keyword,
  role,
  page,
  canManage,
  patchParams,
  setSearchParams,
  onOpen,
  onAdjust,
}: WalletsTabProps) {
  const params = useMemo(
    () => ({ keyword, role, page, size: DEFAULT_PAGE_SIZE }),
    [keyword, role, page],
  );

  const { data, isPending, isError } = useQuery({
    queryKey: fundKeys.wallets(params),
    queryFn: () => fetchWallets(params),
  });

  const handleSearch = useCallback((value: string) => patchParams({ keyword: value }), [patchParams]);

  const columns: Column<WalletSummary>[] = [
    {
      key: 'user',
      header: '회원',
      width: '24%',
      render: (row) => (
        <StackedCell
          primary={maskName(row.userName)}
          secondary={row.userEmail === '-' ? '자녀 계정' : maskEmail(row.userEmail)}
        />
      ),
    },
    {
      key: 'role',
      header: '구분',
      width: '88px',
      render: (row) => (
        <StatusPill tone={row.role === 'PARENT' ? 'info' : 'accent'}>
          {row.role === 'PARENT' ? '보호자' : '자녀'}
        </StatusPill>
      ),
    },
    {
      key: 'related',
      header: '연결',
      render: (row) => (
        <span className="muted">{row.relatedNames.map(maskName).join(', ') || '-'}</span>
      ),
    },
    {
      key: 'balance',
      header: '잔액',
      align: 'right',
      numeric: true,
      width: '128px',
      render: (row) => <span className="funds__balance">{formatCurrency(row.balance)}</span>,
    },
    {
      key: 'updatedAt',
      header: '최근 변동',
      width: '112px',
      render: (row) => <span className="muted">{formatRelative(row.updatedAt)}</span>,
    },
    {
      key: 'actions',
      header: '액션',
      align: 'center',
      width: canManage ? '132px' : '56px',
      hoverOnly: true,
      render: (row) => (
        <RowActions>
          <Button
            variant="ghost"
            size="sm"
            className="btn--icon-only"
            aria-label={`${maskName(row.userName)} 지갑 상세`}
            onClick={() => onOpen(row)}
          >
            <Icon name="eye-view" />
          </Button>
          {canManage ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAdjust(row)}
              aria-label={`${maskName(row.userName)} 잔액 조정`}
            >
              잔액 조정
            </Button>
          ) : null}
        </RowActions>
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
            aria-label="지갑 검색"
          />
        }
      >
        <Select
          value={role}
          onChange={(e) => patchParams({ role: e.target.value === 'ALL' ? null : e.target.value })}
          aria-label="회원 구분 필터"
        >
          {ROLE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
      </ListToolbar>

      <Card flush>
        <Table
          caption="회원 지갑 목록"
          columns={columns}
          rows={data?.content ?? []}
          rowKey={(r) => r.walletId}
          loading={isPending}
          error={isError ? '지갑 목록을 불러오지 못했습니다.' : undefined}
          onRowClick={(row) => onOpen(row)}
          emptyState={
            <EmptyState
              title="조회된 지갑이 없습니다"
              description="검색어나 구분 필터를 바꿔보세요."
              icon={<Icon name="search" />}
              action={
                <Button size="sm" onClick={() => setSearchParams(new URLSearchParams({ tab: 'wallets' }))}>
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
