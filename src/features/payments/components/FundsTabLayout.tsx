import type { ReactNode } from 'react';
import { Button, Card, EmptyState, Icon, Pagination, SearchInput, ListToolbar, Table, type Column } from '@/shared/ui';
import type { Page } from '@/shared/lib/types';

interface FundsTabLayoutProps<T> {
  /** 검색창 placeholder 와 aria-label */
  searchPlaceholder: string;
  searchLabel: string;
  keyword: string;
  onSearch: (value: string) => void;
  /** 검색창 오른쪽 필터 (보통 Select 하나) */
  filter: ReactNode;

  caption: string;
  columns: Column<T>[];
  data: Page<T> | undefined;
  rowKey: (row: T) => string | number;
  loading: boolean;
  error: boolean;
  /** 목록·오류 메시지에 쓸 대상 이름. 예: "충전 내역" */
  entityName: string;
  /** "필터 초기화" 가 되돌아갈 탭 */
  tab: 'charges' | 'payments' | 'wallets';
  onResetFilters: (tab: string) => void;
  onPageChange: (page: number) => void;
  onRowClick?: (row: T) => void;
  rowLabel?: (row: T) => string;
}

/**
 * 자금·결제 탭 3개(충전 내역 · 매장 결제 · 회원 지갑)의 공통 껍데기.
 *
 * 세 탭이 검색 → 필터 → 표 → 페이징을 같은 순서로 각자 조립하고 있었다.
 * 컬럼과 액션은 탭마다 다르므로 통짜로 합치지 않고, **뼈대만** 여기로 모은다.
 * 자금 화면 안에서만 쓰므로 shared/ui 가 아니라 feature 안에 둔다.
 */
export function FundsTabLayout<T>({
  searchPlaceholder,
  searchLabel,
  keyword,
  onSearch,
  filter,
  caption,
  columns,
  data,
  rowKey,
  loading,
  error,
  entityName,
  tab,
  onResetFilters,
  onPageChange,
  onRowClick,
  rowLabel,
}: FundsTabLayoutProps<T>) {
  return (
    <div className="funds__tab">
      <ListToolbar
        search={
          <SearchInput
            value={keyword}
            onSearch={onSearch}
            placeholder={searchPlaceholder}
            aria-label={searchLabel}
          />
        }
      >
        {filter}
      </ListToolbar>

      <Card flush>
        <Table
          caption={caption}
          columns={columns}
          rows={data?.content ?? []}
          rowKey={rowKey}
          loading={loading}
          error={error ? `${entityName}을 불러오지 못했습니다.` : undefined}
          onRowClick={onRowClick}
          rowLabel={rowLabel}
          emptyState={
            <EmptyState
              title={`조회된 ${entityName}이 없습니다`}
              description="검색어나 필터를 바꿔보세요."
              icon={<Icon name="search" />}
              action={
                <Button size="sm" onClick={() => onResetFilters(tab)}>
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
                onChange={onPageChange}
              />
            ) : undefined
          }
        />
      </Card>
    </div>
  );
}
