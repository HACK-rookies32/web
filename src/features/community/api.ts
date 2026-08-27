import { USE_MOCK, request } from '@/shared/api/client';
import { mockResponse, paginate } from '@/shared/api/mock';
import { appendAuditLog } from '@/mocks/auditLogs';
import { MOCK_COMMUNITY_POSTS } from '@/mocks/community';
import type { Page } from '@/shared/lib/types';
import type {
  CommunityPostDetail,
  CommunityPostListItem,
  CommunityPostListParams,
  SpringPage,
} from './types';

export const communityKeys = {
  all: ['community-posts'] as const,
  list: (params: CommunityPostListParams) => ['community-posts', params] as const,
  detail: (id: number) => ['community-post', id] as const,
};

let postStore: CommunityPostDetail[] = MOCK_COMMUNITY_POSTS.map((post) => ({
  ...post,
  comments: [...post.comments],
}));

function toListItem(post: CommunityPostDetail): CommunityPostListItem {
  const { comments: _comments, ...item } = post;
  return item;
}

/** GET /admin/community/posts — 최신순 고정 (화면에 정렬 선택이 없다) */
export async function fetchCommunityPosts(
  params: CommunityPostListParams,
): Promise<Page<CommunityPostListItem>> {
  if (USE_MOCK) {
    const sorted = [...postStore].sort((a, b) => b.id - a.id);
    return mockResponse(paginate(sorted.map(toListItem), params));
  }

  const data = await request<SpringPage<CommunityPostListItem>>({
    url: '/admin/community/posts',
    method: 'GET',
    params: { page: params.page ?? 0, size: params.size ?? 10, sort: 'id,desc' },
  });

  return {
    content: data.content,
    page: data.number,
    size: data.size,
    totalElements: data.totalElements,
    totalPages: data.totalPages,
  };
}

/** GET /admin/community/posts/{id} */
export async function fetchCommunityPost(id: number): Promise<CommunityPostDetail> {
  if (USE_MOCK) {
    const post = postStore.find((item) => item.id === id);
    if (!post) throw new Error('존재하지 않는 게시글입니다.');
    return mockResponse(post);
  }
  return request<CommunityPostDetail>({ url: `/admin/community/posts/${id}`, method: 'GET' });
}

/** DELETE /admin/community/posts/{id} */
export async function deleteCommunityPost(vars: {
  postId: number;
  adminUsername: string;
}): Promise<void> {
  if (USE_MOCK) {
    postStore = postStore.filter((post) => post.id !== vars.postId);
    appendAuditLog({
      adminUsername: vars.adminUsername,
      action: 'POST_DELETE',
      target: `post:${vars.postId}`,
      description: '커뮤니티 게시글 삭제',
    });
    return mockResponse(undefined, 500);
  }
  return request<void>({ url: `/admin/community/posts/${vars.postId}`, method: 'DELETE' });
}

/**
 * 커뮤니티 사용자 밴.
 *
 * TODO(api): 명세 5.5 가 갱신되어 대상 식별자가 정해졌으나 아직 연동할 수 없다.
 *   명세: POST /admin/community/members/ban, body = { loginId, reason, durationDays }
 *         응답 = { memberId, loginId, banned, reason, bannedUntil }
 *   문제: 밴 대상을 `loginId` 로 지정해야 하는데, 게시글 목록·상세 응답
 *         (5.5 의 CommunityPostListItem)에는 `memberId` 만 있고 loginId 가 없다.
 *         화면에서 loginId 를 알 방법이 없어 명세대로 호출이 불가능하다.
 *   요청 대기: 커뮤니티 응답에 loginId 추가 또는 밴 API 가 memberId 도 수용.
 *   그때까지 임시 경로를 유지한다.
 */
