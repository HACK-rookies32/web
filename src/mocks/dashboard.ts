import type { DashboardInquiry, DashboardSummary } from '@/features/dashboard/types';
import { MOCK_INQUIRIES } from './inquiries';

/**
 * 최근 문의는 문의 목록에서 가져온다.
 *
 * 예전에는 여기에 문의를 따로 적어 뒀는데 문의 목록과 어긋나 있었다.
 * (101 은 작성자가 `user123` vs `민수아빠`, 102 는 제목이 「환불 요청합니다」 vs
 *  「충전한 금액이 지갑에 안 들어왔어요」 로 달랐다.)
 * 대시보드에서 클릭하면 `/inquiries?id=` 로 이동하므로 같은 데이터를 봐야 한다.
 */
function recentInquiries(count: number): DashboardInquiry[] {
  return [...MOCK_INQUIRIES]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, count)
    .map((inquiry) => ({
      id: inquiry.id,
      answered: inquiry.answered,
      title: inquiry.title,
      memberNickname: inquiry.memberNickname,
      createdAt: inquiry.createdAt,
    }));
}

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

  /*
   * TODO: 최근 활동도 mocks/auditLogs 에서 뽑는 게 맞다. 다만 ActivityType 이
   * 4종(MEMBER_SUSPEND · NOTICE_CREATE · HARMFUL_BLOCK · REPORT_DOWNLOAD)뿐이고
   * 각각 직접 그린 아이콘이 붙어 있는데, 감사 로그 action 은 10종이고
   * HARMFUL_BLOCK 에 대응하는 값이 없다. 아이콘 세트를 다시 정한 뒤에 옮긴다.
   */
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

  recentInquiries: recentInquiries(4),
};
