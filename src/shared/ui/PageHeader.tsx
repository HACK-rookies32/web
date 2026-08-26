import type { ReactNode } from 'react';
import { formatNumber } from '@/shared/lib/format';
import { StatusPill } from './StatusPill';
import './PageHeader.css';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /**
   * 제목 옆 "총 N건" 배지. 목록 화면이 거의 다 쓰는 형태라 여기서 그린다.
   * 단위만 다르면 이걸 쓰고, 다른 모양이 필요하면 `badge` 로 직접 넘긴다.
   */
  count?: number;
  /** `count` 의 단위 (기본 "건") */
  countUnit?: string;
  /** 제목 옆 배지를 직접 지정한다. `count` 보다 우선한다. */
  badge?: ReactNode;
  /** 오른쪽 액션 버튼 묶음 */
  actions?: ReactNode;
  /** 뒤로 가기 링크 등 상단 보조 영역 */
  breadcrumb?: ReactNode;
}

/**
 * 콘텐츠 영역 상단 제목 블록.
 * 상단바(Topbar)의 페이지명과는 별개로, 상세 화면처럼 부가 정보가 필요할 때 쓴다.
 */
export function PageHeader({
  title,
  description,
  count,
  countUnit = '건',
  badge,
  actions,
  breadcrumb,
}: PageHeaderProps) {
  const countBadge =
    count === undefined ? null : (
      <StatusPill tone="accent" shape="pill">
        총 <span className="tabular">{formatNumber(count)}</span>
        {countUnit}
      </StatusPill>
    );

  return (
    <header className="page-header">
      {breadcrumb ? <div className="page-header__breadcrumb">{breadcrumb}</div> : null}
      <div className="page-header__main">
        <div className="page-header__heading">
          <div className="page-header__title-row">
            <h1 className="page-header__title">{title}</h1>
            {badge ?? countBadge}
          </div>
          {description ? <p className="page-header__description">{description}</p> : null}
        </div>
        {actions ? <div className="page-header__actions">{actions}</div> : null}
      </div>
    </header>
  );
}
