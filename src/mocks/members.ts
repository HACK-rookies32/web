import type { Member, MemberDevice, MemberInquiry } from '@/features/members/types';
import { MOCK_INQUIRIES } from './inquiries';

/** n일 전 ISO 문자열. */
function daysAgo(n: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 24, 0, 0);
  return d.toISOString();
}

/** n분 전 ISO 문자열. */
function minutesAgo(n: number): string {
  return new Date(Date.now() - n * 60_000).toISOString();
}

/**
 * 회원 목 데이터.
 * 이름·이메일·전화번호는 실제 개인정보가 아닌 가상의 값이다.
 * 화면에서는 반드시 shared/lib/format 의 마스킹 유틸을 거쳐 표시한다.
 */
export const MOCK_MEMBERS: Member[] = [
  {
    id: 1001,
    loginId: 'parent01',
    username: '김민수',
    nickname: '민수아빠',
    email: 'minsu.kim@gmail.com',
    phoneNumber: '010-2431-8890',
    role: 'PARENT',
    parentId: null,
    isDeleted: false,
    address: '서울시 강남구 테헤란로 123 위워크 4층',
    createdAt: daysAgo(412),
    updatedAt: daysAgo(12),
  },
  {
    id: 1002,
    loginId: 'seojin_lee',
    username: '이서진',
    nickname: '서진맘',
    email: 'seojin.lee@naver.com',
    phoneNumber: '010-7712-3345',
    role: 'PARENT',
    parentId: null,
    isDeleted: false,
    address: '경기도 성남시 분당구 판교역로 235',
    createdAt: daysAgo(298),
    updatedAt: daysAgo(30),
  },
  {
    id: 1003,
    loginId: 'junho_park',
    username: '박준호',
    nickname: '준호',
    email: 'junho.park@daum.net',
    phoneNumber: '010-3320-1187',
    role: 'PARENT',
    parentId: null,
    isDeleted: false,
    address: '부산시 해운대구 센텀중앙로 90',
    createdAt: daysAgo(520),
    updatedAt: daysAgo(9),
  },
  {
    id: 1004,
    loginId: 'hyewon_choi',
    username: '최혜원',
    nickname: '혜원',
    email: 'hyewon.choi@gmail.com',
    phoneNumber: '010-9981-2204',
    role: 'PARENT',
    parentId: null,
    isDeleted: false,
    address: '대전시 유성구 대학로 291',
    createdAt: daysAgo(155),
    updatedAt: daysAgo(2),
  },
  {
    id: 1005,
    loginId: 'dongho_jung',
    username: '정동호',
    nickname: '동호',
    email: 'dongho.jung@kakao.com',
    phoneNumber: '010-4432-7761',
    role: 'PARENT',
    parentId: null,
    isDeleted: true,
    address: '인천시 연수구 송도과학로 123',
    createdAt: daysAgo(610),
    updatedAt: daysAgo(74),
  },
  {
    id: 1006,
    loginId: 'yuna_song',
    username: '송유나',
    nickname: '유나맘',
    email: 'yuna.song@naver.com',
    phoneNumber: '010-6654-9902',
    role: 'PARENT',
    parentId: null,
    isDeleted: false,
    address: '광주시 서구 상무중앙로 58',
    createdAt: daysAgo(88),
    updatedAt: daysAgo(5),
  },
  {
    id: 1007,
    loginId: 'sangwoo_han',
    username: '한상우',
    nickname: '상우',
    email: 'sangwoo.han@gmail.com',
    phoneNumber: '010-1123-4456',
    role: 'PARENT',
    parentId: null,
    isDeleted: false,
    address: '서울시 마포구 월드컵북로 400',
    createdAt: daysAgo(233),
    updatedAt: daysAgo(18),
  },
  {
    id: 1008,
    loginId: 'nari_oh',
    username: '오나리',
    nickname: '나리',
    email: 'nari.oh@daum.net',
    phoneNumber: '010-8890-3312',
    role: 'PARENT',
    parentId: null,
    isDeleted: false,
    address: '대구시 수성구 동대구로 400',
    createdAt: daysAgo(47),
    updatedAt: daysAgo(3),
  },
  {
    id: 1009,
    loginId: 'taemin_kwon',
    username: '권태민',
    nickname: '태민',
    email: 'taemin.kwon@gmail.com',
    phoneNumber: '010-2245-6678',
    role: 'PARENT',
    parentId: null,
    isDeleted: false,
    address: '울산시 남구 삼산로 200',
    createdAt: daysAgo(365),
    updatedAt: daysAgo(41),
  },
  {
    id: 1010,
    loginId: 'jiwoo_yang',
    username: '양지우',
    nickname: '지우',
    email: 'jiwoo.yang@naver.com',
    phoneNumber: '010-5567-1123',
    role: 'PARENT',
    parentId: null,
    isDeleted: false,
    address: '제주시 첨단로 242',
    createdAt: daysAgo(19),
    updatedAt: daysAgo(1),
  },
  {
    id: 1011,
    loginId: 'eunji_shin',
    username: '신은지',
    nickname: '은지',
    email: 'eunji.shin@kakao.com',
    phoneNumber: '010-3378-9910',
    role: 'PARENT',
    parentId: null,
    isDeleted: false,
    address: '경기도 수원시 영통구 광교중앙로 145',
    createdAt: daysAgo(129),
    updatedAt: daysAgo(7),
  },
  {
    id: 1012,
    loginId: 'minjae_go',
    username: '고민재',
    nickname: '민재',
    email: 'minjae.go@gmail.com',
    phoneNumber: '010-7743-2201',
    role: 'PARENT',
    parentId: null,
    isDeleted: false,
    address: '강원도 춘천시 중앙로 1',
    createdAt: daysAgo(6),
    updatedAt: daysAgo(6),
  },
];

/** 회원별 등록 기기. key 는 memberId. */
export const MOCK_DEVICES: Record<number, MemberDevice[]> = {
  1001: [
    { deviceId: 'A1B2-30001', lastEventType: 'GPS_OFF', lastEventAt: minutesAgo(3) },
    { deviceId: 'A1B2-30002', lastEventType: 'POWER_OFF', lastEventAt: minutesAgo(400) },
  ],
  1002: [{ deviceId: 'C3D4-30003', lastEventType: 'GPS_OFF', lastEventAt: minutesAgo(12) }],
  1003: [{ deviceId: 'E5F6-30004', lastEventType: 'POWER_OFF', lastEventAt: daysAgo(9) }],
  1004: [
    { deviceId: 'G7H8-30005', lastEventType: 'GPS_OFF', lastEventAt: minutesAgo(2) },
    { deviceId: 'G7H8-30006', lastEventType: 'GPS_OFF', lastEventAt: minutesAgo(6) },
    { deviceId: 'G7H8-30007', lastEventType: 'POWER_OFF', lastEventAt: minutesAgo(880) },
  ],
};

/**
 * 회원별 1:1 문의 기록.
 *
 * 예전에는 여기에 문의를 따로 적어 뒀는데 문의 목록(MOCK_INQUIRIES)과 id·제목이
 * 어긋나 있었다. 회원 상세의 문의 탭은 `/inquiries?id={id}` 로 이동하는데
 * 205·312·288 은 문의 목록에 없는 id 라 슬라이드오버가 열려도 문의를 찾지 못했다.
 * (102 는 양쪽에 있었지만 제목이 서로 달랐다.)
 *
 * 이제 문의 목록에서 memberId 로 뽑아 쓴다. 한 곳만 고치면 양쪽이 같이 움직인다.
 */
export function getMemberInquiries(memberId: number): MemberInquiry[] {
  return MOCK_INQUIRIES.filter((inquiry) => inquiry.memberId === memberId)
    .map((inquiry) => ({
      id: inquiry.id,
      answered: inquiry.answered,
      title: inquiry.title,
      createdAt: inquiry.createdAt,
      answeredAt: inquiry.answer?.createdAt ?? null,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
