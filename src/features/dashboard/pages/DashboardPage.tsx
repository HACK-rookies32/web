import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Column, EmptyState, LoadingBlock, PageHeader, StatusPill, Table } from '@/shared/ui';
import { formatRelative } from '@/shared/lib/format';
import { inquiryStatus } from '@/shared/lib/status';
import { dashboardKeys, fetchDashboardSummary } from '../api';
import { KpiCard } from '../components/KpiCard';
import { SignupTrendChart } from '../components/SignupTrendChart';
import { ActivityList } from '../components/ActivityList';
import type { DashboardInquiry } from '../types';
import './DashboardPage.css';

/**
 * 대시보드 (Figma 131:1042).
 * KPI 4개 · 일일 가입 추이 · 최근 활동 · 최근 1:1 문의.
 * 각 위젯은 해당 관리 화면으로 가는 딥링크다.
 */
export function DashboardPage() {
  const navigate = useNavigate();
  const { data, isPending, isError, error } = useQuery({
    queryKey: dashboardKeys.summary,
    queryFn: fetchDashboardSummary,
  });

  const inquiryColumns: Column<DashboardInquiry>[] = [
    {
      key: 'status',
      header: '상태',
      width: '92px',
      render: (row) => (
        <StatusPill tone={inquiryStatus(row.answered).tone}>
          {inquiryStatus(row.answered).label}
        </StatusPill>
      ),
    },
    {
      key: 'title',
      header: '제목',
      render: (row) => <span className="dashboard__inquiry-title">{row.title}</span>,
    },
    { key: 'author', header: '작성자', width: '112px', render: (row) => row.memberNickname },
    {
      key: 'createdAt',
      header: '등록일',
      width: '88px',
      align: 'right',
      render: (row) => <span className="muted dashboard__muted">{formatRelative(row.createdAt)}</span>,
    },
  ];

  if (isPending) return <LoadingBlock label="대시보드를 불러오는 중" />;

  if (isError || !data) {
    return (
      <EmptyState
        tone="error"
        title="대시보드를 불러오지 못했습니다"
        description={error instanceof Error ? error.message : undefined}
      />
    );
  }

  return (
    <div className="dashboard">
      <PageHeader
        title="대시보드"
        description="케어가드 서비스의 주요 운영 현황을 한눈에 확인합니다."
      />

      <section className="dashboard__kpis" aria-label="주요 지표">
        {data.kpis.map((stat) => (
          <KpiCard key={stat.key} stat={stat} />
        ))}
      </section>

      {/*
        TODO(api): 가입 추이는 기간을 바꿀 수 있어야 하지만 집계 API 가 명세에 없다.
        예전에는 7일/30일/1년 버튼이 있었는데 onClick 이 없어 눌러도 아무 일이
        일어나지 않았고 "7일" 에 활성 표시만 박혀 있었다. 고를 수 없는 것을
        고를 수 있는 것처럼 보이지 않게 지금 기간만 글로 알린다.
      */}
      <Card
        title="일일 사용자 가입 추이"
        description="최근 7일간의 신규 가입자 추이"
        action={<span className="dashboard__range-label">최근 7일</span>}
      >
        <SignupTrendChart points={data.signupTrend} />
      </Card>

      <div className="dashboard__columns">
        <Card
          title="최근 활동 내역"
          action={
            <Link className="dashboard__more" to="/audit-logs">
              모두 보기
            </Link>
          }
        >
          {data.activities.length > 0 ? (
            <ActivityList items={data.activities} />
          ) : (
            <EmptyState title="최근 활동이 없습니다" />
          )}
        </Card>

        <Card
          title="최근 1:1 문의"
          action={
            <Link className="dashboard__more" to="/inquiries">
              모두 보기
            </Link>
          }
          flush
        >
          <Table
            caption="최근 1:1 문의 목록"
            columns={inquiryColumns}
            rows={data.recentInquiries}
            rowKey={(r) => r.id}
            onRowClick={(r) => navigate(`/inquiries?id=${r.id}`)}
            emptyState={<EmptyState title="접수된 문의가 없습니다" />}
          />
        </Card>
      </div>
    </div>
  );
}
