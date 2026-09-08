import { Icon } from './Icon';
import { formatNumber } from '@/shared/lib/format';
import './Pagination.css';

interface PaginationProps {
  /** 0-base 현재 페이지 (API 명세 3.5 와 동일) */
  page: number;
  totalPages: number;
  totalElements: number;
  size: number;
  onChange: (page: number) => void;
  /**
   * 'pages' — 왼쪽 요약 + 오른쪽 번호 버튼(Figma 131:3667). 기본값.
   * 'more'  — "더 보기 ( 1/12 )" 한 줄. 누르면 다음 페이지로 간다(이어 붙이기 아님).
   */
  variant?: 'more' | 'pages';
}

/** 현재 페이지 주변으로 최대 5개의 번호를 만든다. */
function pageWindow(page: number, totalPages: number): number[] {
  const max = 5;
  if (totalPages <= max) return Array.from({ length: totalPages }, (_, i) => i);

  const half = Math.floor(max / 2);
  const start = Math.min(Math.max(page - half, 0), totalPages - max);
  return Array.from({ length: max }, (_, i) => start + i);
}

/**
 * 목록 페이지네이션.
 *
 * ⚠️ 'more' 는 목록에 이어 붙이는(append) 방식이 아니라 다음 페이지로 **이동**한다.
 * 목록이 서버 페이지 단위로 조회되고 페이지 번호가 URL 에 있어, 뒤로 가기로 이전
 * 페이지에 돌아갈 수 있다. 진짜 이어 붙이기가 필요하면 useInfiniteQuery 로 바꿔야 한다.
 */
export function Pagination({
  page,
  totalPages,
  totalElements,
  size,
  onChange,
  variant = 'pages',
}: PaginationProps) {
  if (variant === 'more') {
    const isLast = page >= totalPages - 1;
    return (
      <nav className="pagination pagination--more" aria-label="페이지 이동">
        <button
          type="button"
          className="pagination__more"
          onClick={() => onChange(page + 1)}
          disabled={isLast}
          aria-label={isLast ? '마지막 페이지입니다' : '다음 페이지 보기'}
        >
          <Icon name="chevron-right" className="pagination__more-icon" />
          더 보기
          <span className="pagination__more-count" aria-hidden="true">
            ( <b>{formatNumber(page + 1)}</b>/{formatNumber(totalPages)} )
          </span>
        </button>
      </nav>
    );
  }

  const from = totalElements === 0 ? 0 : page * size + 1;
  const to = Math.min((page + 1) * size, totalElements);

  return (
    <nav className="pagination" aria-label="페이지 이동">
      <p className="pagination__summary">
        총 <span className="tabular">{formatNumber(totalElements)}</span>건 중{' '}
        <span className="tabular">
          {formatNumber(from)}-{formatNumber(to)}
        </span>
        건
      </p>

      <div className="pagination__controls">
        <button
          type="button"
          className="pagination__arrow"
          onClick={() => onChange(page - 1)}
          disabled={page <= 0}
          aria-label="이전 페이지"
        >
          <Icon name="chevron-left" />
        </button>

        {pageWindow(page, totalPages).map((p) => (
          <button
            key={p}
            type="button"
            className={p === page ? 'pagination__page is-active' : 'pagination__page'}
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            aria-label={`${p + 1}페이지`}
          >
            {p + 1}
          </button>
        ))}

        <button
          type="button"
          className="pagination__arrow"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages - 1}
          aria-label="다음 페이지"
        >
          <Icon name="chevron-right" />
        </button>
      </div>
    </nav>
  );
}
