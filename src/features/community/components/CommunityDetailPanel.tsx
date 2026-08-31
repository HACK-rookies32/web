import { useQuery } from '@tanstack/react-query';
import { Button, EmptyState, LoadingBlock } from '@/shared/ui';
import { formatDateTime, formatNumber } from '@/shared/lib/format';
import { communityKeys, fetchCommunityPost } from '../api';
import type { CommunityPostDetail } from '../types';
import './CommunityDetailPanel.css';

interface CommunityDetailPanelProps {
  postId: number;
  deleting: boolean;
  onDelete: (post: CommunityPostDetail) => void;
}

export function CommunityDetailPanel({ postId, deleting, onDelete }: CommunityDetailPanelProps) {
  const { data, isPending, isError } = useQuery({
    queryKey: communityKeys.detail(postId),
    queryFn: () => fetchCommunityPost(postId),
  });

  if (isPending) return <LoadingBlock label="게시글을 불러오는 중" />;
  if (isError || !data) return <EmptyState tone="error" title="게시글을 불러오지 못했습니다" />;

  return (
    <div className="community-detail">
      <section className="community-detail__section">
        <div className="community-detail__meta-row">
          <span>게시글 #{data.id}</span>
          <span>{formatDateTime(data.createdAt)}</span>
        </div>
        <h3 className="community-detail__title">{data.title}</h3>
        <p className="community-detail__author">
          {data.authorNickname} · 회원 #{data.memberId}
        </p>
        {/*
          [VULN-WEB-02] 저장형 XSS — 회원이 작성한 게시글 본문을 HTML 로 렌더한다.
            공격자가 게시글에 스크립트를 심으면 관리자가 열람할 때 실행된다(CWE-79).
            아래 댓글도 같다. 대응: 텍스트 렌더 + CSP.
        */}
        <p className="community-detail__content" dangerouslySetInnerHTML={{ __html: data.content }} />
        <div className="community-detail__status">
          <span>댓글 {formatNumber(data.comments.length)}개</span>
        </div>
      </section>

      <section className="community-detail__section">
        <h3 className="community-detail__heading">댓글</h3>
        {data.comments.length > 0 ? (
          <ul className="community-detail__comments">
            {data.comments.map((comment) => (
              <li key={comment.id} className="community-detail__comment">
                <div className="community-detail__comment-head">
                  <strong>
                    {comment.authorNickname} · 회원 #{comment.memberId}
                  </strong>
                  <span>{formatDateTime(comment.createdAt)}</span>
                </div>
                {/* [VULN-WEB-02] 저장형 XSS — 회원 댓글을 HTML 로 렌더(위 본문과 동일). */}
                <p dangerouslySetInnerHTML={{ __html: comment.content }} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="작성된 댓글이 없습니다" description="이 게시글에는 아직 댓글이 없습니다." />
        )}
      </section>

      <div className="community-detail__actions">
        <Button variant="danger" loading={deleting} onClick={() => onDelete(data)}>게시글 삭제</Button>
      </div>
    </div>
  );
}
