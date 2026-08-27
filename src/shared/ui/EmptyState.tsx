import type { ReactNode } from 'react';
import './EmptyState.css';

interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  /** 상태를 나타내는 아이콘/일러스트 */
  icon?: ReactNode;
  action?: ReactNode;
  /** 에러 상황이면 톤을 바꾼다. */
  tone?: 'empty' | 'error';
}

/** 목록이 비었을 때 / 조회에 실패했을 때 공통으로 쓰는 자리표시 블록. */
export function EmptyState({ title, description, icon, action, tone = 'empty' }: EmptyStateProps) {
  return (
    <div className={`empty empty--${tone}`} role={tone === 'error' ? 'alert' : undefined}>
      {icon ? <div className="empty__icon">{icon}</div> : null}
      <p className="empty__title">{title}</p>
      {description ? <p className="empty__description">{description}</p> : null}
      {action ? <div className="empty__action">{action}</div> : null}
    </div>
  );
}
