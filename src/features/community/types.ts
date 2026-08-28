import type { PageParams } from '@/shared/lib/types';

export interface CommunityPostListItem {
  id: number;
  title: string;
  content: string;
  memberId: number;
  /** 작성자 닉네임. 서비스 안에서 서로에게 보이는 표시명이라 마스킹하지 않는다. */
  authorNickname: string;
  createdAt: string;
}

export interface CommunityComment {
  id: number;
  memberId: number;
  authorNickname: string;
  content: string;
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
