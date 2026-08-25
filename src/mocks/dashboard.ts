import type { DashboardSummary } from '@/features/dashboard/types';

/** 기준 시각으로부터 n분 전 ISO 문자열. */
function minutesAgo(n: number): string {
  return new Date(Date.now() - n * 60_000).toISOString();
}

/**
 * 대시보드 목 데이터.
 *
 * TODO(api): 통계 집계 엔드포인트가 아직 명세에 없다.
 *            백엔드 확정 시 GET /admin/dashboard/summary 등으로 교체한다.
 */
export const MOCK_DASHBOARD: DashboardSummary = {
  kpis: [
    {
      key: 'signups',
      label: '신규 가입',
      value: '1,248',
      delta: { text: '12.5%', direction: 'up', good: true },
      footnote: 'vs 지난주 1,109명',
      tone: 'accent',
      to: '/members',
    },
    {
      key: 'activeUsers',
      label: '활성 사용자 (DAU)',
      value: '45.2K',
      delta: { text: '3.2%', direction: 'up', good: true },
      footnote: '실시간 접속: 3,421명',
      tone: 'accent',
      to: '/members',
    },
    {
      key: 'openInquiries',
      label: '미처리 문의',
      value: '42',
      delta: { text: '5건 증가', direction: 'up', good: false },
      footnote: '당일 처리율 65%',
      progress: 65,
      tone: 'info',
      to: '/inquiries',
    },
    {
      key: 'pendingReports',
      label: '신고 대기',
      value: '18',
      delta: { text: '12건 감소', direction: 'down', good: true },
      footnote: '긴급 리뷰 필요: 3건',
      footnoteAlert: true,
      tone: 'danger',
      to: '/community',
    },
  ],

  signupTrend: [
    { label: '월', value: 142 },
    { label: '화', value: 186 },
    { label: '수', value: 168 },
    { label: '목', value: 220 },
    { label: '금', value: 194 },
    { label: '토', value: 128, muted: true },
    { label: '일', value: 112, muted: true },
  ],

  activities: [
    {
      id: 1,
      type: 'MEMBER_SUSPEND',
      text: '이관리님이 사용자 {박지성}의 계정을 정지했습니다.',
      meta: '사유: 욕설 및 비방',
      occurredAt: minutesAgo(0),
      to: '/audit-logs',
    },
    {
      id: 2,
      type: 'NOTICE_CREATE',
      text: '김슈퍼님이 새 공지사항을 등록했습니다.',
      meta: '제목: 시스템 점검 안내',
      occurredAt: minutesAgo(10),
      to: '/notices',
    },
    {
      id: 3,
      type: 'HARMFUL_BLOCK',
      text: '시스템 자동 필터링: {유해 사이트 접속 시도 3건} 차단됨.',
      meta: 'IP: 192.168.0.14',
      occurredAt: minutesAgo(45),
      to: '/harmful-keywords',
    },
    {
      id: 4,
      type: 'REPORT_DOWNLOAD',
      text: '최담당님이 월간 리포트를 다운로드했습니다.',
      meta: '',
      occurredAt: minutesAgo(120),
      to: '/audit-logs',
    },
  ],

  recentInquiries: [
    {
      id: 101,
      answered: false,
      title: '비밀번호 찾기가 안됩니다.',
      memberNickname: 'user123',
      createdAt: minutesAgo(35),
    },
    {
      id: 102,
      answered: false,
      title: '환불 요청합니다. 확인 부탁드려요.',
      memberNickname: 'kim_parent',
      createdAt: minutesAgo(230),
    },
    {
      id: 103,
      answered: true,
      title: '앱 연동 오류 문의',
      memberNickname: 'lee_dad',
      createdAt: minutesAgo(1500),
    },
    {
      id: 104,
      answered: true,
      title: '자녀 스마트폰 시간 설정 관련',
      memberNickname: 'park_mom',
      createdAt: minutesAgo(1700),
    },
  ],
};
