import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, EmptyState, Icon, Spinner, StatusPill } from '@/shared/ui';
import { ROLE_LABEL } from '@/shared/lib/constants';
import { formatRelative } from '@/shared/lib/format';
import { inquiryStatus } from '@/shared/lib/status';
import { AUDIT_ACTIVITY_LABEL, parseAuditTarget } from '@/shared/lib/audit';
import { useAuth } from '@/shared/auth/AuthContext';
import type { Role } from '@/shared/lib/types';
import { fetchNotices, noticeKeys } from '@/features/notices/api';
import { auditLogKeys, fetchAuditLogs } from '@/features/audit-logs/api';
import { communityKeys, fetchCommunityPosts } from '@/features/community/api';
import { fetchInquiries, inquiryKeys } from '@/features/inquiries/api';
import './HomePage.css';

/**
 * 각 칸에 몇 건까지 보여줄지.
 * 네 칸이 2x2 로 놓이므로 3건이면 스크롤 없이 한 화면에 들어온다.
 * 더 보려면 각 칸의 바로가기로 넘어가면 된다.
 */
const PREVIEW_SIZE = 3;

/**
 * 홈 화면.
 *
 * 관리자가 자주 확인하는 네 가지를 한 화면에 모아 최근 몇 건만 보여주고,
 * 각 칸에서 해당 관리 화면으로 바로 넘어갈 수 있게 한다.
 *
 *   좌상 공지        우상 감사 로그
 *   좌하 커뮤니티     우하 1:1 문의
 *
 * 권한이 없는 칸은 아예 렌더하지 않는다. 사이드바와 같은 기준이다.
 */
export function HomePage() {
  const { session, hasRole } = useAuth();

  const canNotice = hasRole(['SUPER_ADMIN']);
  const canAudit = hasRole(['SUPER_ADMIN']);
  const canCommunity = hasRole(['SUPER_ADMIN', 'GENERAL_ADMIN', 'COMMUNITY_ADMIN']);
  const canInquiry = hasRole(['SUPER_ADMIN', 'INQUIRY_ADMIN']);

  const listParams = { page: 0, size: PREVIEW_SIZE };

  const notices = useQuery({
    queryKey: noticeKeys.list(listParams),
    queryFn: () => fetchNotices(listParams),
    enabled: canNotice,
  });

  const audits = useQuery({
    queryKey: auditLogKeys.list(listParams),
    queryFn: () => fetchAuditLogs(listParams),
    enabled: canAudit,
  });

  const posts = useQuery({
    queryKey: communityKeys.list(listParams),
    queryFn: () => fetchCommunityPosts(listParams),
    enabled: canCommunity,
  });

  const inquiries = useQuery({
    queryKey: inquiryKeys.list(listParams),
    queryFn: () => fetchInquiries(listParams),
    enabled: canInquiry,
  });

  return (
    <div className="home">
      <Card className="home__greeting">
        <p className="home__hello">
          <strong>{session?.displayName ?? session?.username ?? '관리자'}</strong>님, 안녕하세요.
        </p>
        <p className="home__role">
          {session ? ROLE_LABEL[session.role as Role] : '관리자'} 권한으로 접속했습니다.
        </p>
      </Card>

      <div className="home__grid">
        {/* ------------------------------------------------ 좌상 · 공지 -- */}
        {canNotice ? (
          <HomePanel title="공지 내역" to="/notices" query={notices} emptyText="등록된 공지가 없습니다">
            {(rows: NonNullable<typeof notices.data>) =>
              rows.content.map((n) => (
                <li key={n.noticeId} className="home__row">
                  <span className="home__row-main">{n.title}</span>
                  <span className="home__row-side">
                    <time className="home__row-time">{formatRelative(n.createdAt)}</time>
                  </span>
                </li>
              ))
            }
          </HomePanel>
        ) : null}

        {/* -------------------------------------------- 우상 · 감사 로그 -- */}
        {canAudit ? (
          <HomePanel title="감사 로그" to="/audit-logs" query={audits} emptyText="기록된 활동이 없습니다">
            {(rows: NonNullable<typeof audits.data>) =>
              rows.content.map((log) => {
                const target = parseAuditTarget(log.targetType, log.targetId);
                return (
                  <li key={log.id} className="home__row">
                    <span className="home__row-main">
                      <strong>{log.adminLoginId}</strong> ·{' '}
                      {log.activityLabel || AUDIT_ACTIVITY_LABEL[log.activityType] || log.activityType}
                      <span className="home__row-sub">
                        {log.targetId ? `${target.label} #${log.targetId}` : target.label}
                      </span>
                    </span>
                    <time className="home__row-time">{formatRelative(log.occurredAt)}</time>
                  </li>
                );
              })
            }
          </HomePanel>
        ) : null}

        {/* -------------------------------------------- 좌하 · 커뮤니티 -- */}
        {canCommunity ? (
          <HomePanel title="커뮤니티 글" to="/community" query={posts} emptyText="등록된 게시글이 없습니다">
            {(rows: NonNullable<typeof posts.data>) =>
              rows.content.map((p) => (
                <li key={p.id} className="home__row">
                  <span className="home__row-main">
                    {p.title}
                    <span className="home__row-sub">{p.authorNickname}</span>
                  </span>
                  <span className="home__row-side">
                    <time className="home__row-time">{formatRelative(p.createdAt)}</time>
                  </span>
                </li>
              ))
            }
          </HomePanel>
        ) : null}

        {/* ------------------------------------------- 우하 · 1:1 문의 -- */}
        {canInquiry ? (
          <HomePanel title="1:1 문의" to="/inquiries" query={inquiries} emptyText="접수된 문의가 없습니다">
            {(rows: NonNullable<typeof inquiries.data>) =>
              rows.content.map((q) => {
                const status = inquiryStatus(q.answered);
                return (
                  <li key={q.id} className="home__row">
                    <span className="home__row-main">
                      {q.title}
                      <span className="home__row-sub">{q.memberNickname}</span>
                    </span>
                    <span className="home__row-side">
                      <StatusPill tone={status.tone}>{status.label}</StatusPill>
                      <time className="home__row-time">{formatRelative(q.createdAt)}</time>
                    </span>
                  </li>
                );
              })
            }
          </HomePanel>
        ) : null}
      </div>
    </div>
  );
}

/**
 * 홈의 칸 하나. 제목 · 바로가기 · 최근 목록의 틀과 로딩/에러/빈 상태를 맡는다.
 * 네 칸이 같은 모양이라 여기서 한 번만 처리한다.
 */
function HomePanel<T>({
  title,
  to,
  query,
  emptyText,
  children,
}: {
  title: string;
  to: string;
  query: { data?: T; isPending: boolean; isError: boolean };
  emptyText: string;
  children: (data: T) => React.ReactNode;
}) {
  /*
   * 응답 모양이 예상과 다르면 children 안에서 터진다. 그대로 두면 라우트 전체가
   * 오류 화면으로 바뀌어 "데이터가 없다" 와 구분이 안 된다 — 실제로 감사 로그
   * 필드명이 바뀌었을 때 홈 화면 전체가 죽었다. 여기서 잡아 이 칸만 오류로 둔다.
   */
  let rows: React.ReactNode = null;
  let renderFailed = false;
  if (query.data) {
    try {
      rows = children(query.data);
    } catch {
      renderFailed = true;
    }
  }
  const isEmpty = Array.isArray(rows) && rows.length === 0;

  return (
    <Card
      className="home__panel"
      title={title}
      action={
        <Link className="home__more" to={to}>
          바로가기
          <Icon name="arrow-right" />
        </Link>
      }
    >
      {query.isPending ? (
        <div className="home__loading">
          <Spinner size={18} />
        </div>
      ) : query.isError || renderFailed ? (
        <EmptyState tone="error" title="목록을 불러오지 못했습니다" />
      ) : isEmpty ? (
        <EmptyState title={emptyText} />
      ) : (
        <ul className="home__rows">{rows}</ul>
      )}
    </Card>
  );
}
