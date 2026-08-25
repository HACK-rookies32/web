import type { ReactNode } from 'react';
import type { Tone } from '@/shared/lib/types';
import './StatusPill.css';

interface StatusPillProps {
  tone?: Tone;
  /** 형태 구분 — 색각 이상 사용자를 위해 색 외의 단서를 준다. */
  shape?: 'tag' | 'pill';
  children: ReactNode;
}

/**
 * 상태 배지. Figma 테이블 Pill(131:3607 등) 기준:
 * radius 4px, padding 2px 8px, 12px/20px medium.
 *
 * 상태는 색뿐 아니라 형태(tag/pill)로도 구분되도록 사용한다.
 */
export function StatusPill({ tone = 'neutral', shape = 'tag', children }: StatusPillProps) {
  return <span className={`pill pill--${tone} pill--${shape}`}>{children}</span>;
}
