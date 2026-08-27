import type { MemberStatus } from '@/shared/lib/status';
import type { PageParams } from '@/shared/lib/types';

/** 회원 목록 행에 딸려 오는 자녀 요약 (명세 5.2 — 부모 검색 시 자녀도 함께 반환). */
export interface ChildSummary {
  childId: number;
  name: string;
}

/** GET /admin/members 의 content 원소. */
export interface MemberListItem {
  memberId: number;
  /** 로그인 아이디. 마스킹 대상이 아니다. */
  username: string;
  name: string;
  email: string;
  phoneNumber: string;
  /** 목록에도 표시하므로 상세가 아니라 여기에 둔다. 화면에서는 maskAddress 를 거친다. */
  address: string;
  role: 'PARENT' | 'CHILD';
  status: MemberStatus;
  children: ChildSummary[];
  /** 등록 기기 수 */
  deviceCount: number;
  createdAt: string;
}

/**
 * GET /admin/members/{id} 의 data. 목록 항목에 상세 필드를 더한 형태.
 *
 * 생년월일은 두지 않는다. 명세 5.2 의 목록·상세 응답 어디에도 없고
 * (등장하는 곳은 회원가입 요청 본문뿐이다) 관리 화면에서 쓸 일도 없다.
 * 받지 않는 항목은 화면에 두지 않는 것이 개인정보 최소 수집에 맞다.
 */
export interface MemberDetail extends MemberListItem {
  nickname: string;
  updatedAt: string;
}

/** GET /admin/members/{id}/devices 의 원소. */
export interface MemberDevice {
  deviceId: number;
  /** 이 기기를 쓰는 자녀. 부모 본인 기기면 null */
  childId: number | null;
  childName: string | null;
  model: string;
  os: string;
  appVersion: string;
  status: 'ONLINE' | 'OFFLINE' | 'BLOCKED';
  lastSeenAt: string;
}

/** 회원 상세의 "1:1 문의 기록" 탭에 쓰는 요약. */
export interface MemberInquiry {
  id: number;
  answered: boolean;
  title: string;
  createdAt: string;
  answeredAt: string | null;
}

/** 회원 목록 조회 파라미터 (명세 5.2 — keyword/role/page/size). */
export type MemberListParams = PageParams;

/** PATCH /admin/members/{id} 요청 본문. */
export interface MemberUpdateRequest {
  name?: string;
  nickname?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
}
