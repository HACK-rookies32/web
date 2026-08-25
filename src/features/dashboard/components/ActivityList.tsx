import { Link } from 'react-router-dom';
import { formatRelative } from '@/shared/lib/format';
import type { ActivityItem, ActivityType } from '../types';
import './ActivityList.css';

/** 활동 유형별 아이콘 배지 색. */
const TONE: Record<ActivityType, string> = {
  MEMBER_SUSPEND: 'accent',
  NOTICE_CREATE: 'info',
  HARMFUL_BLOCK: 'danger',
  REPORT_DOWNLOAD: 'accent',
};

function ActivityGlyph({ type }: { type: ActivityType }) {
  switch (type) {
    case 'MEMBER_SUSPEND':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="6.5" cy="5" r="2.75" stroke="currentColor" strokeWidth="1.4" />
          <path d="M1.75 14c0-2.5 2.1-4 4.75-4 1 0 1.9.2 2.6.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M10.5 11.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'NOTICE_CREATE':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M2 6.5v3h2.5l5 3V3.5l-5 3H2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M12 6c.7.6 1 1.3 1 2s-.3 1.4-1 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'HARMFUL_BLOCK':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.4" />
          <path d="m3.75 3.75 8.5 8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'REPORT_DOWNLOAD':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 2v8m0 0 3-3m-3 3L5 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M2.5 12.5h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
  }
}

/** {강조} 표기를 accent 색 span 으로 바꾼다. */
function renderText(text: string) {
  return text.split(/(\{[^}]*\})/g).map((part, i) =>
    part.startsWith('{') && part.endsWith('}') ? (
      <em key={i} className="activity__highlight">
        {part.slice(1, -1)}
      </em>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/** 최근 활동 내역 (Figma 131:1176). */
export function ActivityList({ items }: { items: ActivityItem[] }) {
  return (
    <ul className="activity">
      {items.map((item) => (
        <li key={item.id} className="activity__item">
          <span className={`activity__icon activity__icon--${TONE[item.type]}`}>
            <ActivityGlyph type={item.type} />
          </span>

          <span className="activity__body">
            <Link to={item.to} className="activity__text">
              {renderText(item.text)}
            </Link>
            <span className="activity__meta">
              {formatRelative(item.occurredAt)}
              {item.meta ? ` • ${item.meta}` : ''}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
