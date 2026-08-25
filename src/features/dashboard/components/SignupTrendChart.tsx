import { useState } from 'react';
import { formatNumber } from '@/shared/lib/format';
import type { SignupPoint } from '../types';
import './SignupTrendChart.css';

interface SignupTrendChartProps {
  points: SignupPoint[];
}

/**
 * 일일 가입 추이 막대 차트 (Figma 131:1126).
 *
 * 차트 라이브러리를 쓰지 않고 div 막대로 그린다. 값은 표로도 읽을 수 있도록
 * 각 막대에 aria-label 을 달고, 전체를 role="img" + 요약 설명으로 감싼다.
 */
export function SignupTrendChart({ points }: SignupTrendChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...points.map((p) => p.value), 1);
  const peakIndex = points.reduce((best, p, i) => (p.value > points[best].value ? i : best), 0);
  const active = hovered ?? peakIndex;

  const summary = points.map((p) => `${p.label} ${p.value}명`).join(', ');

  return (
    <div className="chart">
      <div className="chart__grid" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="chart__gridline" />
        ))}
      </div>

      <ul className="chart__bars" role="img" aria-label={`최근 7일 일일 가입 추이. ${summary}`}>
        {points.map((point, i) => (
          <li
            key={point.label}
            className="chart__item"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            {active === i ? (
              <span className="chart__tooltip tabular">{formatNumber(point.value)}</span>
            ) : null}

            <span className="chart__bar-track">
              <span
                className={point.muted ? 'chart__bar is-muted' : 'chart__bar'}
                style={{ height: `${(point.value / max) * 100}%` }}
              />
            </span>

            <span className="chart__label">{point.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
