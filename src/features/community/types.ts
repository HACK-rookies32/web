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
