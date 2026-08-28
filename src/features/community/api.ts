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
