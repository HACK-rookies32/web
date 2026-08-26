import type {
  ChargeItem,
  FundStats,
  StorePayment,
  WalletSummary,
  WalletTransaction,
} from '@/features/payments/types';

function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 3_600_000).toISOString();
}

function daysAgo(n: number, hour = 14, minute = 20): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/**
 * 자금·결제 목 데이터.
 * 회원 ID 는 mocks/members.ts 의 memberId(부모 1001~) / childId(2001~) 와 맞춘다.
 */

/* ------------------------------------------------------------- 충전 ---- */

export const MOCK_CHARGES: ChargeItem[] = [
  {
    chargeId: 7001,
    userId: 1001,
    userName: '김민수',
    userEmail: 'minsu.kim@gmail.com',
    amount: 30000,
    status: 'PAID',
    method: '카드',
    createdAt: hoursAgo(3),
    canceledAt: null,
    cancelReason: null,
  },
  {
    chargeId: 7002,
    userId: 1004,
    userName: '최혜원',
    userEmail: 'hyewon.choi@gmail.com',
    amount: 50000,
    status: 'PAID',
    method: '카드',
    createdAt: hoursAgo(8),
    canceledAt: null,
    cancelReason: null,
  },
  {
    chargeId: 7003,
    userId: 1002,
    userName: '이서진',
    userEmail: 'seojin.lee@naver.com',
    amount: 20000,
    status: 'FAILED',
    method: '카드',
    createdAt: hoursAgo(11),
    canceledAt: null,
    cancelReason: null,
  },
  {
    chargeId: 7004,
    userId: 1007,
    userName: '한상우',
    userEmail: 'sangwoo.han@gmail.com',
    amount: 10000,
    status: 'PAID',
    method: '간편결제',
    createdAt: hoursAgo(26),
    canceledAt: null,
    cancelReason: null,
  },
  {
    chargeId: 7005,
    userId: 1001,
    userName: '김민수',
    userEmail: 'minsu.kim@gmail.com',
    amount: 30000,
    status: 'CANCELED',
    method: '카드',
    createdAt: daysAgo(3),
    canceledAt: daysAgo(3, 15),
    cancelReason: '잘못 충전',
  },
  {
    chargeId: 7006,
    userId: 1009,
    userName: '권태민',
    userEmail: 'taemin.kwon@gmail.com',
    amount: 100000,
    status: 'PAID',
    method: '카드',
    createdAt: daysAgo(4),
    canceledAt: null,
    cancelReason: null,
  },
  {
    chargeId: 7007,
    userId: 1010,
    userName: '양지우',
    userEmail: 'jiwoo.yang@naver.com',
    amount: 20000,
    status: 'READY',
    method: '카드',
    createdAt: hoursAgo(1),
    canceledAt: null,
    cancelReason: null,
  },
  {
    chargeId: 7008,
    userId: 1006,
    userName: '송유나',
    userEmail: 'yuna.song@naver.com',
    amount: 40000,
    status: 'PAID',
    method: '카드',
    createdAt: daysAgo(5),
    canceledAt: null,
    cancelReason: null,
  },
  {
    chargeId: 7009,
    userId: 1011,
    userName: '신은지',
    userEmail: 'eunji.shin@kakao.com',
    amount: 15000,
    status: 'PAID',
    method: '간편결제',
    createdAt: daysAgo(6),
    canceledAt: null,
    cancelReason: null,
  },
  {
    chargeId: 7010,
    userId: 1004,
    userName: '최혜원',
    userEmail: 'hyewon.choi@gmail.com',
    amount: 30000,
    status: 'PAID',
    method: '카드',
    createdAt: daysAgo(8),
    canceledAt: null,
    cancelReason: null,
  },
  {
    chargeId: 7011,
    userId: 1002,
    userName: '이서진',
    userEmail: 'seojin.lee@naver.com',
    amount: 20000,
    status: 'PAID',
    method: '카드',
    createdAt: daysAgo(10),
    canceledAt: null,
    cancelReason: null,
  },
];

/* --------------------------------------------------------- 매장 결제 ---- */

export const MOCK_STORE_PAYMENTS: StorePayment[] = [
  {
    paymentId: 8801,
    childId: 2001,
    childName: '김하은',
    parentId: 1001,
    parentName: '김민수',
    merchantName: 'GS25 역삼점',
    amount: 3000,
    status: 'PAID',
    balanceAfter: 9000,
    paidAt: hoursAgo(2),
    refundedAt: null,
    refundReason: null,
  },
  {
    paymentId: 8802,
    childId: 2005,
    childName: '최지호',
    parentId: 1004,
    parentName: '최혜원',
    merchantName: 'CU 판교점',
    amount: 4500,
    status: 'PAID',
    balanceAfter: 15500,
    paidAt: hoursAgo(5),
    refundedAt: null,
    refundReason: null,
  },
  {
    paymentId: 8803,
    childId: 2003,
    childName: '이수아',
    parentId: 1002,
    parentName: '이서진',
    merchantName: '이디야커피 서현점',
    amount: 5800,
    status: 'REFUNDED',
    balanceAfter: 8200,
    paidAt: hoursAgo(30),
    refundedAt: hoursAgo(28),
    refundReason: '오결제 민원 처리',
  },
  {
    paymentId: 8804,
    childId: 2002,
    childName: '김도윤',
    parentId: 1001,
    parentName: '김민수',
    merchantName: '올리브영 강남점',
    amount: 12000,
    status: 'PAID',
    balanceAfter: 3000,
    paidAt: daysAgo(2),
    refundedAt: null,
    refundReason: null,
  },
  {
    paymentId: 8805,
    childId: 2009,
    childName: '한예준',
    parentId: 1007,
    parentName: '한상우',
    merchantName: 'GS25 상암점',
    amount: 2500,
    status: 'PAID',
    balanceAfter: 7500,
    paidAt: daysAgo(2, 18),
    refundedAt: null,
    refundReason: null,
  },
  {
    paymentId: 8806,
    childId: 2006,
    childName: '최지아',
    parentId: 1004,
    parentName: '최혜원',
    merchantName: '파리바게뜨 판교점',
    amount: 7800,
    status: 'PAID',
    balanceAfter: 12200,
    paidAt: daysAgo(3),
    refundedAt: null,
    refundReason: null,
  },
  {
    paymentId: 8807,
    childId: 2012,
    childName: '권서윤',
    parentId: 1009,
    parentName: '권태민',
    merchantName: '메가커피 삼산점',
    amount: 2000,
    status: 'CANCELLED',
    balanceAfter: 50000,
    paidAt: daysAgo(4),
    refundedAt: null,
    refundReason: null,
  },
  {
    paymentId: 8808,
    childId: 2008,
    childName: '송채원',
    parentId: 1006,
    parentName: '송유나',
    merchantName: 'CU 상무점',
    amount: 3400,
    status: 'PAID',
    balanceAfter: 16600,
    paidAt: daysAgo(5),
    refundedAt: null,
    refundReason: null,
  },
  {
    paymentId: 8809,
    childId: 2013,
    childName: '양준서',
    parentId: 1010,
    parentName: '양지우',
    merchantName: '세븐일레븐 제주점',
    amount: 6200,
    status: 'PAID',
    balanceAfter: 3800,
    paidAt: daysAgo(6),
    refundedAt: null,
    refundReason: null,
  },
  {
    paymentId: 8810,
    childId: 2015,
    childName: '신도현',
    parentId: 1011,
    parentName: '신은지',
    merchantName: '다이소 광교점',
    amount: 9000,
    status: 'PAID',
    balanceAfter: 6000,
    paidAt: daysAgo(7),
    refundedAt: null,
    refundReason: null,
  },
  {
    paymentId: 8811,
    childId: 2001,
    childName: '김하은',
    parentId: 1001,
    parentName: '김민수',
    merchantName: '문구나라 역삼점',
    amount: 4800,
    status: 'REFUNDED',
    balanceAfter: 12000,
    paidAt: daysAgo(9),
    refundedAt: daysAgo(8),
    refundReason: '중복 결제',
  },
  {
    paymentId: 8812,
    childId: 2010,
    childName: '한예린',
    parentId: 1007,
    parentName: '한상우',
    merchantName: 'GS25 상암점',
    amount: 1500,
    status: 'PAID',
    balanceAfter: 8500,
    paidAt: daysAgo(11),
    refundedAt: null,
    refundReason: null,
  },
];

/* ------------------------------------------------------------- 지갑 ---- */

function tx(
  txId: number,
  type: WalletTransaction['type'],
  amount: number,
  balanceAfter: number,
  createdAt: string,
  refId: string | null = null,
  memo: string | null = null,
): WalletTransaction {
  return { txId, type, amount, balanceAfter, refId, memo, createdAt };
}

export const MOCK_WALLETS: WalletSummary[] = [
  {
    walletId: 500,
    userId: 1001,
    userName: '김민수',
    userEmail: 'minsu.kim@gmail.com',
    role: 'PARENT',
    balance: 27000,
    updatedAt: hoursAgo(2),
    relatedNames: ['김하은', '김도윤'],
    recentTransactions: [
      tx(90010, 'TRANSFER_OUT', -10000, 27000, hoursAgo(2), 'child:2001', '주간 용돈'),
      tx(90009, 'CHARGE', 30000, 37000, hoursAgo(3), 'charge:7001'),
      tx(90008, 'RECLAIM', 5000, 7000, daysAgo(2), 'child:2002'),
    ],
  },
  {
    walletId: 501,
    userId: 2001,
    userName: '김하은',
    userEmail: '-',
    role: 'CHILD',
    balance: 9000,
    updatedAt: hoursAgo(2),
    relatedNames: ['김민수'],
    recentTransactions: [
      tx(90007, 'PAYMENT', -3000, 9000, hoursAgo(2), 'payment:8801'),
      tx(90006, 'TRANSFER_IN', 10000, 12000, hoursAgo(2), 'parent:1001', '주간 용돈'),
      tx(90005, 'REFUND', 4800, 2000, daysAgo(8), 'payment:8811'),
    ],
  },
  {
    walletId: 502,
    userId: 1002,
    userName: '이서진',
    userEmail: 'seojin.lee@naver.com',
    role: 'PARENT',
    balance: 4200,
    updatedAt: daysAgo(1),
    relatedNames: ['이수아'],
    recentTransactions: [
      tx(90004, 'TRANSFER_OUT', -15000, 4200, daysAgo(1), 'child:2003'),
      tx(90003, 'CHARGE', 20000, 19200, daysAgo(10), 'charge:7011'),
    ],
  },
  {
    walletId: 503,
    userId: 2003,
    userName: '이수아',
    userEmail: '-',
    role: 'CHILD',
    balance: 8200,
    updatedAt: hoursAgo(28),
    relatedNames: ['이서진'],
    recentTransactions: [
      tx(90002, 'REFUND', 5800, 8200, hoursAgo(28), 'payment:8803', '오결제 민원 처리'),
      tx(90001, 'PAYMENT', -5800, 2400, hoursAgo(30), 'payment:8803'),
    ],
  },
  {
    walletId: 504,
    userId: 1004,
    userName: '최혜원',
    userEmail: 'hyewon.choi@gmail.com',
    role: 'PARENT',
    balance: 62000,
    updatedAt: hoursAgo(8),
    relatedNames: ['최지호', '최지아', '최지민'],
    recentTransactions: [tx(90011, 'CHARGE', 50000, 62000, hoursAgo(8), 'charge:7002')],
  },
  {
    walletId: 505,
    userId: 2005,
    userName: '최지호',
    userEmail: '-',
    role: 'CHILD',
    balance: 15500,
    updatedAt: hoursAgo(5),
    relatedNames: ['최혜원'],
    recentTransactions: [tx(90012, 'PAYMENT', -4500, 15500, hoursAgo(5), 'payment:8802')],
  },
  {
    walletId: 506,
    userId: 1007,
    userName: '한상우',
    userEmail: 'sangwoo.han@gmail.com',
    role: 'PARENT',
    balance: 3000,
    updatedAt: hoursAgo(26),
    relatedNames: ['한예준', '한예린'],
    recentTransactions: [tx(90013, 'CHARGE', 10000, 3000, hoursAgo(26), 'charge:7004')],
  },
  {
    walletId: 507,
    userId: 2009,
    userName: '한예준',
    userEmail: '-',
    role: 'CHILD',
    balance: 7500,
    updatedAt: daysAgo(2, 18),
    relatedNames: ['한상우'],
    recentTransactions: [tx(90014, 'PAYMENT', -2500, 7500, daysAgo(2, 18), 'payment:8805')],
  },
  {
    walletId: 508,
    userId: 1009,
    userName: '권태민',
    userEmail: 'taemin.kwon@gmail.com',
    role: 'PARENT',
    balance: 100000,
    updatedAt: daysAgo(4),
    relatedNames: ['권서윤'],
    recentTransactions: [tx(90015, 'CHARGE', 100000, 100000, daysAgo(4), 'charge:7006')],
  },
  {
    walletId: 509,
    userId: 2012,
    userName: '권서윤',
    userEmail: '-',
    role: 'CHILD',
    balance: 50000,
    updatedAt: daysAgo(4),
    relatedNames: ['권태민'],
    recentTransactions: [
      tx(90016, 'ADJUST', 2000, 50000, daysAgo(4), null, '결제 취소 건 잔액 보정'),
    ],
  },
  {
    walletId: 510,
    userId: 1006,
    userName: '송유나',
    userEmail: 'yuna.song@naver.com',
    role: 'PARENT',
    balance: 21000,
    updatedAt: daysAgo(5),
    relatedNames: ['송채원'],
    recentTransactions: [tx(90017, 'CHARGE', 40000, 21000, daysAgo(5), 'charge:7008')],
  },
  {
    walletId: 511,
    userId: 2008,
    userName: '송채원',
    userEmail: '-',
    role: 'CHILD',
    balance: 16600,
    updatedAt: daysAgo(5),
    relatedNames: ['송유나'],
    recentTransactions: [tx(90018, 'PAYMENT', -3400, 16600, daysAgo(5), 'payment:8808')],
  },
];

/* ------------------------------------------------------------- 통계 ---- */

/**
 * 자금 지표.
 *
 * 예전에는 합계를 손으로 적어 뒀는데 원장과 맞지 않았다.
 * (`totalCharged: 335,000` 은 전체 합 365,000 도, 완료분 합 295,000 도 아니었고
 *  `totalPaid` 만 취소·환불까지 포함한 전체 합이라 기준도 서로 달랐다.)
 *
 * 이제 충전·결제 목에서 직접 합산한다. 기준은 **완료(PAID)된 건만** 이다.
 * 화면의 "미사용 잔액 = 충전액 − 결제액" 이 성립하려면 실제로 오간 돈만 세야 한다.
 */
function sumPaid(items: { amount: number; status: string }[]): number {
  return items.filter((item) => item.status === 'PAID').reduce((acc, item) => acc + item.amount, 0);
}

function countPaid(items: { status: string }[]): number {
  return items.filter((item) => item.status === 'PAID').length;
}

/** 명세 5.9 의 `groupBy=DAY` 집계. 완료된 건만 요일별로 모은다. */
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function dailyTotals(charges: ChargeItem[], payments: StorePayment[]): FundStats['daily'] {
  const buckets = WEEKDAYS.map((date) => ({ date, charged: 0, paid: 0 }));

  charges
    .filter((c) => c.status === 'PAID')
    .forEach((charge) => {
      buckets[new Date(charge.createdAt).getDay()].charged += charge.amount;
    });
  payments
    .filter((p) => p.status === 'PAID')
    .forEach((payment) => {
      buckets[new Date(payment.paidAt).getDay()].paid += payment.amount;
    });

  // 월요일부터 보이도록 앞으로 당긴다.
  return [...buckets.slice(1), buckets[0]];
}

/**
 * 현재 충전·결제 목록으로 지표를 계산한다.
 *
 * 고정 상수로 두면 화면에서 환불·충전 취소를 해도 위쪽 KPI 만 옛날 값으로 남아
 * 바로 아래 표와 어긋난다. 그래서 api 층이 **지금 저장소**를 넘겨 매번 계산한다.
 * 환불 건수는 매장 결제 환불 + 충전 취소를 함께 센다.
 */
export function computeFundStats(charges: ChargeItem[], payments: StorePayment[]): FundStats {
  return {
    totalCharged: sumPaid(charges),
    totalPaid: sumPaid(payments),
    chargeCount: countPaid(charges),
    paymentCount: countPaid(payments),
    refundCount:
      payments.filter((payment) => payment.status === 'REFUNDED').length +
      charges.filter((charge) => charge.status === 'CANCELED').length,
    daily: dailyTotals(charges, payments),
  };
}
