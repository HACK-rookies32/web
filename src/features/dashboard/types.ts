/** 대시보드 KPI 한 장. */
export interface KpiStat {
  key: 'signups' | 'activeUsers' | 'openInquiries' | 'pendingReports';
  label: string;
  /** 화면에 그대로 찍는 값 (1,248 / 45.2K 처럼 이미 포맷된 문자열) */
  value: string;
  /** 증감 배지 */
  delta: {
    text: string;
    direction: 'up' | 'down';
    /** 이 지표에서 증가가 좋은 일인지. 신고 대기는 감소가 좋다. */
    good: boolean;
  };
  /** 하단 보조 문구 */
  footnote: string;
  /** 하단 문구를 위험 톤으로 강조할지 */
  footnoteAlert?: boolean;
  /** 0~100. 있으면 진행 막대를 그린다. */
  progress?: number;
  /** 아이콘 배경 톤 */
  tone: 'accent' | 'info' | 'danger';
  /** 클릭 시 이동할 경로 (위젯 딥링크) */
  to: string;
}

/** 일일 가입 추이 막대 하나. */
export interface SignupPoint {
  label: string;
  value: number;
  /** 주말 등 흐리게 표시할 막대 */
  muted?: boolean;
}

export type ActivityType = 'MEMBER_SUSPEND' | 'NOTICE_CREATE' | 'HARMFUL_BLOCK' | 'REPORT_DOWNLOAD';

/** 최근 활동 내역 한 줄. */
export interface ActivityItem {
  id: number;
  type: ActivityType;
  /** 본문. {강조} 로 감싼 부분은 accent 색으로 렌더한다. */
  text: string;
  meta: string;
  occurredAt: string;
  to: string;
}

/** 대시보드에 요약해 보여줄 1:1 문의. */
export interface DashboardInquiry {
  id: number;
  /** 명세 5.4 기준 답변 완료 여부 */
  answered: boolean;
  title: string;
  memberNickname: string;
  createdAt: string;
}

export interface DashboardSummary {
  kpis: KpiStat[];
  signupTrend: SignupPoint[];
  activities: ActivityItem[];
  recentInquiries: DashboardInquiry[];
}
