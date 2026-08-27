import type { PageParams } from '@/shared/lib/types';

export interface CommunityPostListItem {
  id: number;
  title: string;
  content: string;
  memberId: number;
  reportCount: number;
  createdAt: string;
}

export interface CommunityComment {
  id: number;
  memberId: number;
  content: string;
  reportCount: number;
  createdAt: string;
}

export interface CommunityPostDetail extends CommunityPostListItem {
  comments: CommunityComment[];
}

export type CommunityPostListParams = PageParams;

export interface SpringSort {
  empty: boolean;
  sorted: boolean;
  unsorted: boolean;
}

export interface SpringPage<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    offset: number;
    paged: boolean;
    unpaged: boolean;
    sort: SpringSort;
  };
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
  sort: SpringSort;
}
