import type { ReactNode } from 'react';
import './Card.css';

interface CardProps {
  /** 카드 상단 제목. 없으면 헤더 영역 자체를 그리지 않는다. */
  title?: ReactNode;
  description?: ReactNode;
  /** 헤더 오른쪽 액션 (버튼, 필터 등) */
  action?: ReactNode;
  /** 본문 기본 여백을 없앤다. 표를 그대로 넣을 때 사용. */
  flush?: boolean;
  className?: string;
  children: ReactNode;
}

/** Figma 카드: bg surface, radius 12, shadow-card. */
export function Card({ title, description, action, flush = false, className, children }: CardProps) {
  return (
    <section className={['card', className ?? ''].filter(Boolean).join(' ')}>
      {(title || action) && (
        <header className="card__header">
          <div className="card__heading">
            {title ? <h2 className="card__title">{title}</h2> : null}
            {description ? <p className="card__description">{description}</p> : null}
          </div>
          {action ? <div className="card__action">{action}</div> : null}
        </header>
      )}
      <div className={flush ? 'card__body card__body--flush' : 'card__body'}>{children}</div>
    </section>
  );
}
