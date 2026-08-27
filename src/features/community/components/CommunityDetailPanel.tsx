import { useQuery } from '@tanstack/react-query';
import { Button, EmptyState, LoadingBlock, StatusPill } from '@/shared/ui';
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
        <p className="community-detail__author">작성 회원 #{data.memberId}</p>
        <p className="community-detail__content">{data.content}</p>
        <div className="community-detail__status">
          <StatusPill tone={data.reportCount > 0 ? 'danger' : 'neutral'} shape="pill">
            신고 {formatNumber(data.reportCount)}건
          </StatusPill>
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
                  <strong>회원 #{comment.memberId}</strong>
                  <span>{formatDateTime(comment.createdAt)}</span>
                </div>
                <p>{comment.content}</p>
                {comment.reportCount > 0 ? (
                  <span className="community-detail__reported">신고 {comment.reportCount}건</span>
                ) : null}
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
