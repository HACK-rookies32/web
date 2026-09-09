import { USE_MOCK, request } from '@/shared/api/client';
import { toPage, type SpringPage } from '@/shared/api/page';
import { mockResponse, paginate } from '@/shared/api/mock';
import { appendAuditLog } from '@/mocks/auditLogs';
import { MOCK_COMMUNITY_POSTS } from '@/mocks/community';
import type { Page } from '@/shared/lib/types';
import type {
  CommunityPostDetail,
  CommunityPostListItem,
  CommunityPostListParams,
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

/**
 * GET /admin/community/posts — 작성일시 최신순 고정 (화면에 정렬 선택이 없다).
 *
 * 정렬 기준은 `createdAt,desc` 다. 한때 `id,desc` 였는데, 그러면 신규 글이
 * 목록 뒤로 사라진다 — DB 시드 데이터가 id 를 수동으로 큰 값(990055~)으로
 * 박아 넣은 반면, 실제 신규 글은 auto-increment 로 작은 id(1,2,3…)를 받기
 * 때문이다. id 순으로는 시드가 늘 위에 깔리고 실사용자 글이 맨 뒤 페이지로
 * 밀려, 관리자가 새 글을 못 본다. id 순 = 시간 순이라는 가정이 깨진 상태라
 * 시간 자체로 정렬한다(모바일 부모 피드 GET /community/posts 도 시간순이다).
 */
export async function fetchCommunityPosts(
  params: CommunityPostListParams,
): Promise<Page<CommunityPostListItem>> {
  if (USE_MOCK) {
    const sorted = [...postStore].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return mockResponse(paginate(sorted.map(toListItem), params));
  }

  const data = await request<SpringPage<CommunityPostListItem>>({
    url: '/admin/community/posts',
    method: 'GET',
    params: { page: params.page ?? 0, size: params.size ?? 10, sort: 'createdAt,desc' },
  });

  return toPage(data);
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
      adminLoginId: vars.adminUsername,
      activityType: 'POST_DELETE',
      activityLabel: '게시글 삭제',
      targetType: 'POST',
      targetId: vars.postId,
    });
    return mockResponse(undefined, 500);
  }
  return request<void>({ url: `/admin/community/posts/${vars.postId}`, method: 'DELETE' });
}
