import { Fragment, type ReactNode } from 'react';
import { LoadingBlock } from './Spinner';
import { EmptyState } from './EmptyState';
import './Table.css';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
  /** CSS 너비 (예: '120px', '20%'). 생략하면 내용에 맞춘다. */
  width?: string;
  /** 숫자 칸 — tabular-nums 로 자릿수를 고정한다. */
  numeric?: boolean;
  /** 본문 셀에 덧붙일 클래스 (예: 긴 텍스트를 단어 단위로 줄바꿈하는 'cell-wrap'). */
  cellClassName?: string;
  /**
   * 행에 마우스를 올렸을 때만 보이는 칸.
   * Figma 액션 칸이 기본 opacity 0 으로 되어 있는 것을 반영한다.
   */
  hoverOnly?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  /** 스크린리더용 표 설명. */
  caption: string;
  loading?: boolean;
  /** 조회 실패 메시지. 있으면 에러 상태를 그린다. */
  error?: ReactNode;
  /** 결과가 없을 때 보여줄 내용. 생략하면 기본 문구. */
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
  /**
   * 클릭 가능한 행의 접근성 이름. onRowClick 이 있을 때 각 행 <tr> 의 aria-label 로
   * 들어간다. 스크린리더 사용자가 포커스했을 때 "무엇을 여는 행인지" 를 듣게 한다.
   * (role="button" 은 표 구조 시맨틱을 깨므로 쓰지 않고, 행 시맨틱은 유지한다.)
   */
  rowLabel?: (row: T) => string;
  /** 표 하단에 붙일 요소 (보통 Pagination) */
  footer?: ReactNode;
}

/**
 * 목록 표.
 * Figma 131:3583 기준 — 헤더 bg surface-subtle, 행 구분선 border-subtle,
 * 헤더 13px/18 medium, 본문 14px/20.
 *
 * 로딩 / 에러 / 빈 상태를 표 안에서 모두 처리한다 (화면 DoD 요구사항).
 */
export function Table<T>({
  columns,
  rows,
  rowKey,
  caption,
  loading = false,
  error,
  emptyState,
  onRowClick,
  rowLabel,
  footer,
}: TableProps<T>) {
  const showBody = !loading && !error && rows.length > 0;

  return (
    <div className="table-wrap">
      <div className="table-scroll">
        <table className="table">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  style={col.width ? { width: col.width } : undefined}
                  className={[
                    col.align ? `is-${col.align}` : '',
                    col.hoverOnly ? 'is-hover-only' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          {showBody ? (
            <tbody>
              {rows.map((row) => {
                const key = rowKey(row);

                return (
                  <Fragment key={key}>
                    <tr
                      className={onRowClick ? 'table__row is-clickable' : 'table__row'}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      tabIndex={onRowClick ? 0 : undefined}
                      aria-label={onRowClick && rowLabel ? rowLabel(row) : undefined}
                      onKeyDown={
                        onRowClick
                          ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onRowClick(row);
                              }
                            }
                          : undefined
                      }
                    >
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={[
                            col.align ? `is-${col.align}` : '',
                            col.numeric ? 'tabular' : '',
                            col.hoverOnly ? 'is-hover-only' : '',
                            col.cellClassName ?? '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          {col.render(row)}
                        </td>
                      ))}
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          ) : null}
        </table>

        {loading ? <LoadingBlock /> : null}

        {!loading && error ? (
          <EmptyState
            tone="error"
            title="목록을 불러오지 못했습니다"
            description={typeof error === 'string' ? error : undefined}
          />
        ) : null}

        {!loading && !error && rows.length === 0
          ? (emptyState ?? <EmptyState title="조회된 내용이 없습니다" description="검색 조건을 바꿔보세요." />)
          : null}
      </div>

      {footer ? <div className="table-wrap__footer">{footer}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------- 셀 보조 컴포넌트 -- */

/** 이름 + 이메일처럼 두 줄로 쌓는 셀. */
export function StackedCell({ primary, secondary }: { primary: ReactNode; secondary?: ReactNode }) {
  return (
    <div className="cell-stack">
      <span className="cell-stack__primary">{primary}</span>
      {secondary ? <span className="cell-stack__secondary">{secondary}</span> : null}
    </div>
  );
}

/** 행 액션 버튼 묶음. */
export function RowActions({ children }: { children: ReactNode }) {
  return (
    <div className="row-actions" onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  );
}
