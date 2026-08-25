import { useNavigate } from 'react-router-dom';
import type { KpiStat } from '../types';
import './KpiCard.css';

/** KPI 아이콘. Figma 아이콘 에셋을 아직 내려받지 못해 동일 형태로 작성했다. */
function KpiGlyph({ kind }: { kind: KpiStat['key'] }) {
  switch (kind) {
    case 'signups':
      return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <circle cx="7" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.5" />
          <path d="M1.5 15.5c0-2.8 2.5-4.5 5.5-4.5s5.5 1.7 5.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M14.5 5v5M12 7.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'activeUsers':
      return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M2.5 15.5V9M6.5 15.5V5M10.5 15.5v-4M14.5 15.5V2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'openInquiries':
      return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M3 12V8a6 6 0 0 1 12 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <rect x="1.5" y="10" width="3.5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <rect x="13" y="10" width="3.5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case 'pendingReports':
      return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <circle cx="9" cy="9" r="7.25" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9 5.5v4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="9" cy="12.5" r="0.9" fill="currentColor" />
        </svg>
      );
  }
}

/** 증감 화살표. */
function DeltaArrow({ direction }: { direction: 'up' | 'down' }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      {direction === 'up' ? (
        <path d="M1.5 8.5 4.5 5l2 2 4-4.5M7.5 2.5h3v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M1.5 3.5 4.5 7l2-2 4 4.5M7.5 9.5h3v-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

/**
 * 대시보드 KPI 카드 (Figma 131:1045~1095).
 * 위젯 전체가 해당 관리 화면으로 가는 딥링크다.
 */
export function KpiCard({ stat }: { stat: KpiStat }) {
  const navigate = useNavigate();

  return (
    <button type="button" className="kpi" onClick={() => navigate(stat.to)}>
      <span className="kpi__top">
        <span className="kpi__label">{stat.label}</span>
        <span className={`kpi__icon kpi__icon--${stat.tone}`}>
          <KpiGlyph kind={stat.key} />
        </span>
      </span>

      <span className="kpi__value-row">
        <span className="kpi__value tabular">{stat.value}</span>
        <span className={stat.delta.good ? 'kpi__delta is-good' : 'kpi__delta is-bad'}>
          <DeltaArrow direction={stat.delta.direction} />
          {stat.delta.text}
        </span>
      </span>

      {typeof stat.progress === 'number' ? (
        <span
          className="kpi__progress"
          role="progressbar"
          aria-valuenow={stat.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${stat.label} 처리율`}
        >
          <span className="kpi__progress-fill" style={{ width: `${stat.progress}%` }} />
        </span>
      ) : null}

      <span className={stat.footnoteAlert ? 'kpi__footnote is-alert' : 'kpi__footnote'}>
        {stat.footnote}
      </span>
    </button>
  );
}
