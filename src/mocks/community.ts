import type { CommunityPostDetail } from '@/features/community/types';

function daysAgo(days: number, hour: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 20, 0, 0);
  return date.toISOString();
}

export const MOCK_COMMUNITY_POSTS: CommunityPostDetail[] = [
  {
    id: 5208,
    title: '자녀 스마트폰 사용 규칙을 어떻게 정하시나요?',
    content: '평일과 주말 사용 시간을 다르게 정하려고 합니다. 다른 가정의 기준도 궁금해요.',
    memberId: 1008,
    authorNickname: '나리맘',
    createdAt: daysAgo(0, 18),
    comments: [
      { id: 801, memberId: 1012, authorNickname: '규현아빠', content: '저희는 평일 1시간, 주말 2시간으로 정했어요.', createdAt: daysAgo(0, 19) },
      { id: 802, memberId: 1031, authorNickname: '준서맘', content: '숙제를 마친 뒤 사용하는 방식도 괜찮았습니다.', createdAt: daysAgo(0, 20) },
    ],
  },
  {
    id: 5207,
    title: '유해 사이트 차단 알림이 자주 발생합니다',
    content: '학습 사이트를 이용하는 중에도 알림이 발생하는데 확인 방법이 있을까요?',
    memberId: 1024,
    authorNickname: '해든이네',
    createdAt: daysAgo(1, 15),
    comments: [
      { id: 803, memberId: 1003, authorNickname: '준호아빠', content: '차단 기록에서 URL을 확인해 보세요.', createdAt: daysAgo(1, 17) },
    ],
  },
  {
    id: 5206,
    title: '무료 포인트 지급 링크 공유합니다',
    content: '외부 링크에 접속하면 포인트를 받을 수 있습니다.',
    memberId: 1092,
    authorNickname: '이벤트왕',
    createdAt: daysAgo(2, 11),
    comments: [
      { id: 804, memberId: 1044, authorNickname: '수아맘', content: '광고성 게시물로 보입니다. 확인 부탁드립니다.', createdAt: daysAgo(2, 12) },
      { id: 805, memberId: 1072, authorNickname: '민준파파', content: '링크를 누르지 마세요.', createdAt: daysAgo(2, 12) },
    ],
  },
  {
    id: 5205,
    title: '위치 알림 설정 팁',
    content: '학교와 학원 반경을 조금 넓게 설정하니 알림이 안정적으로 옵니다.',
    memberId: 1017,
    authorNickname: '지호맘',
    createdAt: daysAgo(3, 9),
    comments: [],
  },
  {
    id: 5204,
    title: '앱 업데이트 이후 사용 시간 표시',
    content: '오늘 사용 시간이 어제보다 늦게 반영되는 것 같습니다.',
    memberId: 1065,
    authorNickname: '태이네',
    createdAt: daysAgo(4, 16),
    comments: [],
  },
  {
    id: 5203,
    title: '가족끼리 규칙을 정하는 방법',
    content: '자녀와 함께 사용 규칙을 정할 때 활용한 체크리스트를 공유합니다.',
    memberId: 1052,
    authorNickname: '가온맘',
    createdAt: daysAgo(5, 14),
    comments: [],
  },
];
