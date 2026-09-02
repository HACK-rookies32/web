import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  Column,
  DetailBox,
  DetailRow,
  EmptyState,
  Icon,
  LoadingBlock,
  PageHeader,
  StatusPill,
  Table,
  Tabs,
} from '@/shared/ui';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  maskAddress,
  maskEmail,
  maskName,
  maskPhone,
  memberRef,
} from '@/shared/lib/format';
import { inquiryStatus } from '@/shared/lib/status';
import { formatSignedAmount, walletTxMeta, walletTxSignedAmount } from '@/shared/lib/wallet';
import {
  fetchMember,
  fetchMemberDevices,
  fetchMemberInquiries,
  fetchMemberWallet,
  memberKeys,
} from '../api';
import type { MemberDevice, MemberInquiry } from '../types';
import './MemberDetailPage.css';

/** 기기 최근 이벤트 표시 문구 (명세 5.2 — POWER_OFF | GPS_OFF). */
const DEVICE_EVENT: Record<'POWER_OFF' | 'GPS_OFF', string> = {
  POWER_OFF: '전원 꺼짐',
  GPS_OFF: '위치 꺼짐',
};

type TabKey = 'basic' | 'devices' | 'inquiries';
const TAB_KEYS: TabKey[] = ['basic', 'devices', 'inquiries'];

/**
 * 회원 상세 (Figma 131:816 / 131:2761 / 131:2).
 * 탭 3개: 기본 정보 / 연결 기기 관리 / 1:1 문의 기록.
 * 자금 내역은 별도 "자금·결제 관리" 화면으로 뺀다 (확정 결정 1번).
 */
export function MemberDetailPage() {
  const { memberId: rawId } = useParams();
  const memberId = Number(rawId);
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as TabKey | null;
  const tab: TabKey = tabParam && TAB_KEYS.includes(tabParam) ? tabParam : 'basic';

  const member = useQuery({
    queryKey: memberKeys.detail(memberId),
    queryFn: () => fetchMember(memberId),
    enabled: Number.isFinite(memberId),
  });

  const devices = useQuery({
    queryKey: memberKeys.devices(memberId),
    queryFn: () => fetchMemberDevices(memberId),
    enabled: Number.isFinite(memberId),
  });

  const wallet = useQuery({
    queryKey: memberKeys.wallet(memberId),
    queryFn: () => fetchMemberWallet(memberId),
    enabled: Number.isFinite(memberId),
  });

  const inquiries = useQuery({
    queryKey: memberKeys.inquiries(memberId),
    queryFn: () => fetchMemberInquiries(memberId),
    enabled: Number.isFinite(memberId),
  });


  function changeTab(next: TabKey) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set('tab', next);
      return params;
    });
  }

  if (member.isPending) return <LoadingBlock label="회원 정보를 불러오는 중" />;

  if (member.isError || !member.data) {
    return (
      <EmptyState
        tone="error"
        title="회원 정보를 불러오지 못했습니다"
        description={member.error instanceof Error ? member.error.message : undefined}
        action={<Button onClick={() => navigate('/members')}>목록으로</Button>}
      />
    );
  }

  const m = member.data;

  /*
   * 명세 5.2 의 등록 기기 응답은 기기 식별자와 "가장 최근 이벤트 1건" 뿐이다.
   * 모델명·OS·앱 버전은 오지 않으므로 화면에도 두지 않는다.
   */
  const deviceColumns: Column<MemberDevice>[] = [
    {
      key: 'deviceId',
      header: '기기 식별자',
      render: (d) => <span className="detail__strong tabular">{d.deviceId}</span>,
    },
    {
      key: 'lastEventType',
      header: '최근 이벤트',
      width: '140px',
      render: (d) => (
        <StatusPill tone={d.lastEventType === 'POWER_OFF' ? 'danger' : 'warning'}>
          {DEVICE_EVENT[d.lastEventType]}
        </StatusPill>
      ),
    },
    {
      key: 'lastEventAt',
      header: '발생 시각',
      numeric: true,
      width: '180px',
      align: 'right',
      render: (d) => formatDateTime(d.lastEventAt),
    },
  ];

  const inquiryColumns: Column<MemberInquiry>[] = [
    {
      key: 'status',
      header: '상태',
      width: '104px',
      render: (i) => (
        <StatusPill tone={inquiryStatus(i.answered).tone}>{inquiryStatus(i.answered).label}</StatusPill>
      ),
    },
    { key: 'title', header: '제목', render: (i) => <span className="detail__strong">{i.title}</span> },
    {
      key: 'createdAt',
      header: '등록일',
      numeric: true,
      width: '140px',
      render: (i) => formatDate(i.createdAt),
    },
    {
      key: 'answeredAt',
      header: '답변일',
      numeric: true,
      width: '140px',
      align: 'right',
      render: (i) =>
        i.answeredAt ? formatDate(i.answeredAt) : <span className="muted">-</span>,
    },
  ];

  return (
    <div className="detail">
      <PageHeader
        breadcrumb={
          <Link to="/members" className="detail__back">
            <Icon name="chevron-left" />
            회원 관리
          </Link>
        }
        title={maskName(m.username)}
        badge={
          <StatusPill tone={m.role === 'PARENT' ? 'accent' : 'neutral'} shape="pill">
            {m.role === 'PARENT' ? '보호자' : '자녀'}
          </StatusPill>
        }
        description={
          <>
            등록 기기 <strong className="tabular">{devices.data?.length ?? 0}</strong>대 · 가입{' '}
            {formatDate(m.createdAt)}
          </>
        }
      />

      <Tabs
        aria-label="회원 상세 탭"
        value={tab}
        onChange={changeTab}
        items={[
          { key: 'basic', label: '기본 정보' },
          { key: 'devices', label: '연결 기기 관리', count: devices.data?.length },
          { key: 'inquiries', label: '1:1 문의 기록', count: inquiries.data?.length },
        ]}
      >
        {/* ---------------------------------------------------- 기본 정보 -- */}
        {tab === 'basic' ? (
          <div className="detail__grid">
            <Card title="계정 정보">
              <DetailBox>
                <DetailRow label="회원 ID" value={<span className="tabular">{m.id}</span>} />
                <DetailRow label="로그인 ID" value={m.loginId} />
                <DetailRow label="이름" value={maskName(m.username)} />
                <DetailRow label="닉네임" value={m.nickname} />
                <DetailRow label="이메일" value={m.email ? maskEmail(m.email) : '-'} />
                <DetailRow label="휴대폰" value={<span className="tabular">{maskPhone(m.phoneNumber)}</span>} />
                <DetailRow label="주소" value={m.address ? maskAddress(m.address) : '-'} />
                {m.parentId !== null ? (
                  <DetailRow
                    label="보호자"
                    value={<Link to={`/members/${m.parentId}`}>{memberRef(m.parentId)}</Link>}
                  />
                ) : null}
              </DetailBox>

              <p className="detail__note">
                개인정보는 마스킹된 상태로 표시됩니다. 원문 조회는 별도 권한과 감사 로그가 필요합니다.
              </p>
            </Card>

            <div className="detail__side">
              <Card title="활동">
                <DetailBox>
                  <DetailRow label="가입일" value={formatDateTime(m.createdAt)} />
                  <DetailRow label="최근 수정" value={formatDateTime(m.updatedAt)} />
                </DetailBox>
              </Card>

              <Card
                title="지갑 요약"
                action={
                  <Link className="detail__link" to={`/payments?tab=wallets&keyword=${encodeURIComponent(m.username)}`}>
                    자금·결제 내역 보기
                  </Link>
                }
              >
                {wallet.isPending ? (
                  <LoadingBlock label="지갑 정보를 불러오는 중" />
                ) : wallet.isError ? (
                  <EmptyState tone="error" title="지갑 정보를 불러오지 못했습니다" />
                ) : wallet.data ? (
                  <>
                    <DetailBox>
                      <DetailRow label="현재 잔액" value={formatCurrency(wallet.data.balance)} />
                      <DetailRow label="최근 변동" value={formatDateTime(wallet.data.updatedAt)} />
                      <DetailRow
                        label="연결 자녀 지갑"
                        value={wallet.data.relatedNames.map(maskName).join(', ') || '-'}
                      />
                    </DetailBox>

                    {wallet.data.recentTransactions.length > 0 ? (
                      <ul className="detail__ledger">
                        {wallet.data.recentTransactions.slice(0, 4).map((t) => {
                          /* 증감 부호는 금액이 아니라 type 으로 정한다(REFUND 는 회원 역할로 방향 결정). */
                          const signed = walletTxSignedAmount(t.type, t.amount, m.role);
                          return (
                          <li key={t.txId} className="detail__tx">
                            <StatusPill tone={walletTxMeta(t.type).tone}>{walletTxMeta(t.type).label}</StatusPill>
                            <span className="detail__tx-time">{formatDateTime(t.createdAt)}</span>
                            <span
                              className={
                                signed >= 0
                                  ? 'detail__tx-amount is-plus tabular'
                                  : 'detail__tx-amount is-minus tabular'
                              }
                            >
                              {formatSignedAmount(signed)}
                            </span>
                          </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </>
                ) : (
                  <EmptyState title="지갑 정보가 없습니다" />
                )}
              </Card>
            </div>
          </div>
        ) : null}

        {/* ---------------------------------------------- 연결 기기 관리 -- */}
        {tab === 'devices' ? (
          <Card
            title="연결 기기"
            description="회원 기기의 전원·위치 이벤트 중 가장 최근 1건입니다."
            flush
          >
            <Table
              caption="연결 기기 목록"
              columns={deviceColumns}
              rows={devices.data ?? []}
              rowKey={(d) => d.deviceId}
              loading={devices.isPending}
              error={devices.isError ? '기기 목록을 불러오지 못했습니다.' : undefined}
              emptyState={
                <EmptyState
                  title="등록된 기기가 없습니다"
                  description="이 회원 앞으로 기록된 기기 이벤트가 없습니다."
                />
              }
            />
          </Card>
        ) : null}

        {/* ---------------------------------------------- 1:1 문의 기록 -- */}
        {tab === 'inquiries' ? (
          <Card title="1:1 문의 기록" description="이 회원이 남긴 문의 내역입니다." flush>
            <Table
              caption="회원 문의 기록"
              columns={inquiryColumns}
              rows={inquiries.data ?? []}
              rowKey={(i) => i.id}
              loading={inquiries.isPending}
              error={inquiries.isError ? '문의 기록을 불러오지 못했습니다.' : undefined}
              onRowClick={(i) => navigate(`/inquiries?id=${i.id}`)}
              rowLabel={(i) => `${i.title} 문의 상세 보기`}
              emptyState={<EmptyState title="문의 기록이 없습니다" />}
            />
          </Card>
        ) : null}
      </Tabs>

    </div>
  );
}
