import type { InquiryDetail } from '@/features/inquiries/types';

function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 3_600_000).toISOString();
}

function daysAgo(n: number, hour = 13, minute = 40): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/**
 * 1:1 문의 목 데이터.
 * memberId 는 mocks/members.ts 의 회원과 맞춘다.
 */
export const MOCK_INQUIRIES: InquiryDetail[] = [
  {
    id: 101,
    memberId: 1001,
    memberNickname: '민수아빠',
    title: '비밀번호 찾기가 안됩니다.',
    content:
      '비밀번호 찾기를 누르면 인증번호가 오지 않습니다. 휴대폰 번호는 정상이고 스팸함도 확인했습니다.\n계정 아이디는 parent01 입니다.',
    attachments: [],
    linkUrl: null,
    answered: false,
    createdAt: hoursAgo(1),
    updatedAt: hoursAgo(1),
    answer: null,
  },
  {
    id: 102,
    memberId: 1002,
    memberNickname: '서진맘',
    title: '충전한 금액이 지갑에 안 들어왔어요',
    content:
      '어제 20,000원을 카드로 충전했는데 결제는 됐다고 나오고 지갑 잔액은 그대로입니다.\n확인 부탁드립니다.',
    attachments: ['/api/files/inquiry/7c1a_결제-영수증.png'],
    linkUrl: null,
    answered: false,
    createdAt: hoursAgo(4),
    updatedAt: hoursAgo(4),
    answer: null,
  },
  {
    id: 103,
    memberId: 1004,
    memberNickname: '혜원',
    title: '자녀 기기 3대까지 등록되나요?',
    content: '자녀가 셋인데 기기를 각각 등록할 수 있는지 궁금합니다.',
    attachments: [],
    linkUrl: null,
    answered: true,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1, 16),
    answer: {
      id: 501,
      content:
        '안녕하세요, 케어가드입니다.\n자녀 기기는 계정당 최대 5대까지 등록하실 수 있습니다. 마이페이지 > 자녀 관리에서 추가해 주세요.',
      createdAt: daysAgo(1, 16),
      updatedAt: daysAgo(1, 16),
    },
  },
  {
    id: 104,
    memberId: 1007,
    memberNickname: '상우',
    title: '위치가 실시간으로 갱신되지 않습니다',
    content: '자녀 위치가 30분 전 기준으로만 표시됩니다. 자녀 기기는 켜져 있는 상태입니다.',
    attachments: [],
    linkUrl: null,
    answered: false,
    createdAt: hoursAgo(9),
    updatedAt: hoursAgo(9),
    answer: null,
  },
  {
    id: 105,
    memberId: 1006,
    memberNickname: '유나맘',
    title: '유해 사이트가 차단되지 않아요',
    content: '특정 사이트가 차단 목록에 있는데도 접속이 됩니다. 차단 목록 갱신 주기가 어떻게 되나요?',
    attachments: [],
    linkUrl: 'https://example.com/blocked-test',
    answered: true,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2, 17),
    answer: {
      id: 502,
      content:
        '차단 목록은 앱 실행 시와 6시간 주기로 갱신됩니다.\n앱을 완전히 종료 후 재실행해 주시고, 그래도 동일하면 기기 정보와 함께 다시 문의 부탁드립니다.',
      createdAt: daysAgo(2, 17),
      updatedAt: daysAgo(2, 17),
    },
  },
  {
    id: 106,
    memberId: 1009,
    memberNickname: '태민',
    title: '용돈 이체 한도가 있나요?',
    content: '한 번에 보낼 수 있는 금액에 제한이 있는지 알고 싶습니다.',
    attachments: [],
    linkUrl: null,
    answered: true,
    createdAt: daysAgo(4),
    updatedAt: daysAgo(4, 15),
    answer: {
      id: 503,
      content: '1회 최대 50만원, 1일 최대 100만원까지 이체하실 수 있습니다.',
      createdAt: daysAgo(4, 15),
      updatedAt: daysAgo(3, 10),
    },
  },
  {
    id: 107,
    memberId: 1003,
    memberNickname: '준호',
    title: '계정 정지 사유를 알고 싶습니다',
    content: '갑자기 로그인이 되지 않습니다. 정지 사유와 해제 방법을 알려주세요.',
    attachments: [],
    linkUrl: null,
    answered: true,
    createdAt: daysAgo(8),
    updatedAt: daysAgo(7, 11),
    answer: {
      id: 504,
      content:
        '커뮤니티 이용약관 위반(욕설 및 비방)으로 계정이 정지되었습니다.\n이의가 있으시면 본 문의로 소명 자료를 보내주시면 재검토하겠습니다.',
      createdAt: daysAgo(7, 11),
      updatedAt: daysAgo(7, 11),
    },
  },
  {
    id: 108,
    memberId: 1010,
    memberNickname: '지우',
    title: '앱 알림이 오지 않습니다',
    content: '알림 설정은 모두 켜져 있는데 도착 알림이 오지 않습니다.',
    attachments: [],
    linkUrl: null,
    answered: false,
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
    answer: null,
  },
  {
    id: 109,
    memberId: 1011,
    memberNickname: '은지',
    title: '자녀 화면 캡처 주기를 바꿀 수 있나요?',
    content: '1시간 단위 말고 더 짧게 설정하고 싶습니다.',
    attachments: [],
    linkUrl: null,
    answered: true,
    createdAt: daysAgo(9),
    updatedAt: daysAgo(9, 14),
    answer: {
      id: 505,
      content: '현재는 1시간 고정이며, 필요 시 자녀 관리 화면에서 즉시 촬영을 요청하실 수 있습니다.',
      createdAt: daysAgo(9, 14),
      updatedAt: daysAgo(9, 14),
    },
  },
  {
    id: 110,
    memberId: 1012,
    memberNickname: '민재',
    title: '탈퇴하면 자녀 데이터도 삭제되나요?',
    content: '회원 탈퇴 시 자녀 위치 기록과 캡처 이미지가 어떻게 처리되는지 궁금합니다.',
    attachments: [],
    linkUrl: null,
    answered: false,
    createdAt: daysAgo(6),
    updatedAt: daysAgo(6),
    answer: null,
  },
  {
    id: 111,
    memberId: 1008,
    memberNickname: '나리',
    title: '결제 수단을 변경하고 싶어요',
    content: '등록한 카드를 다른 카드로 바꾸려면 어떻게 하나요?',
    attachments: [],
    linkUrl: null,
    answered: true,
    createdAt: daysAgo(12),
    updatedAt: daysAgo(12, 10),
    answer: {
      id: 506,
      content: '충전 시마다 결제 수단을 선택하실 수 있어 별도 변경 절차는 없습니다.',
      createdAt: daysAgo(12, 10),
      updatedAt: daysAgo(12, 10),
    },
  },
  {
    id: 112,
    memberId: 1001,
    memberNickname: '민수아빠',
    title: '자녀 스마트폰 시간 설정 관련',
    content: '앱 사용 시간 제한을 요일별로 다르게 설정할 수 있나요?',
    attachments: [],
    linkUrl: null,
    answered: false,
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
    answer: null,
  },
];
