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
 * Figma 131:3667 — 왼쪽에 "총 N건 중 x-y건", 오른쪽에 번호 버튼(32×32, radius 4).
 * 활성 버튼은 accent 배경 + accent-on-fill 글자.
 */
export function Pagination({ page, totalPages, totalElements, size, onChange }: PaginationProps) {
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
