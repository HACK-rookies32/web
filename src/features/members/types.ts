import type { PageParams } from '@/shared/lib/types';

/**
 * 회원 (명세 5.2 GET /admin/members/customers).
 *
 * 필드명은 명세 응답을 그대로 따른다. 특히 `username` 은 **실명**이고
 * 로그인 아이디는 `loginId` 다. 둘을 바꿔 쓰면 마스킹 대상이 뒤집히므로
 * 값을 꺼낼 때 주의할 것.
 *
 * 상세 조회(GET .../{id})는 명세상 "목록의 content[] 항목과 동일" 이라
 * 별도 타입을 두지 않는다.
 */
export interface Member {
  id: number;
  /** 로그인 아이디. 마스킹 대상이 아니다. */
  loginId: string;
  /** 실명. 화면에서는 maskName 을 거친다. */
  username: string;
  nickname: string;
  email: string | null;
  phoneNumber: string;
  address: string | null;
  role: 'PARENT' | 'CHILD';
  /** 자녀면 보호자 회원 id, 부모면 null */
  parentId: number | null;
  /** 탈퇴 여부. 목록에서는 탈퇴 회원을 걸러낸다. */
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * GET /admin/members/customers/{id}/devices 의 원소.
 *
 * DeviceEvent(전원·GPS 이벤트) 로그를 기기별로 묶어 가장 최근 1건만 돌려준다.
 * 모델명·OS·앱 버전은 응답에 없다.
 */
export interface MemberDevice {
  deviceId: string;
  lastEventType: 'POWER_OFF' | 'GPS_OFF';
  lastEventAt: string;
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
/** 회원 목록 정렬 (서버 신설 파라미터 ?sort=, 백엔드 회신 #173). */
export type MemberSort = 'RECENT' | 'OLDEST' | 'NAME' | 'NAME_DESC';

export interface MemberListParams extends PageParams {
  role?: 'PARENT' | 'CHILD';
  /** 정렬. 기본 RECENT(가입 최신순). 미전송 시 서버가 RECENT 로 처리. */
  sort?: MemberSort;
}

/**
 * PATCH /admin/members/customers/{id} 요청 본문.
 * 명세가 허용하는 항목은 넷뿐이다. 실명과 로그인 아이디는 수정할 수 없다.
 */
export interface MemberUpdateRequest {
  nickname?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
}
