import type { ReactNode } from 'react';
import './PageHeader.css';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** 제목 옆 배지 (상태, 건수 등) */
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
export function PageHeader({ title, description, badge, actions, breadcrumb }: PageHeaderProps) {
  return (
    <header className="page-header">
      {breadcrumb ? <div className="page-header__breadcrumb">{breadcrumb}</div> : null}
      <div className="page-header__main">
        <div className="page-header__heading">
          <div className="page-header__title-row">
            <h1 className="page-header__title">{title}</h1>
            {badge}
          </div>
          {description ? <p className="page-header__description">{description}</p> : null}
        </div>
        {actions ? <div className="page-header__actions">{actions}</div> : null}
      </div>
    </header>
  );
}
