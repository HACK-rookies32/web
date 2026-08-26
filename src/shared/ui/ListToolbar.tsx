import type { ReactNode } from 'react';
import './ListToolbar.css';

interface ListToolbarProps {
  /** 왼쪽 검색 입력. 보통 `<SearchInput />` 을 넣는다. */
  search?: ReactNode;
  /** 검색이 없는 목록에서 왼쪽에 표시할 건수·요약 정보. */
  summary?: ReactNode;
  /** 오른쪽 필터·액션. `Select` · `Button` 등을 순서대로 넣는다. */
  children?: ReactNode;
  className?: string;
}

/**
 * 목록 화면 상단 툴바 — 왼쪽 검색 + 오른쪽 필터·액션.
 *
 * 회원 · 공지 · 문의 · 자금(충전/매장 결제/지갑) 6개 목록이 같은 모양을 각자
 * 복제하고 있었다. 복제되는 동안 값도 갈렸었다(select min-width 148/160px,
 * 액션 gap 8/12px). 하나로 모으면서 각각 160px · 8px 로 통일했다.
 *
 * 오른쪽 `<select>` 는 내용 폭에 맞추되 너무 좁아지지 않도록 CSS 에서 함께 처리한다.
 * 개별 화면에서 폭·배경을 다시 지정할 필요가 없다.
 */
export function ListToolbar({ search, summary, children, className }: ListToolbarProps) {
  const classes = [
    'list-toolbar',
    search || summary ? '' : 'list-toolbar--no-leading',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      {search ? <div className="list-toolbar__search">{search}</div> : null}
      {!search && summary ? <div className="list-toolbar__summary">{summary}</div> : null}
      {children ? <div className="list-toolbar__actions">{children}</div> : null}
    </div>
  );
}
