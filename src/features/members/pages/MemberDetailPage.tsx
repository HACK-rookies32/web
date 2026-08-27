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
} from '@/shared/lib/format';
import { MEMBER_STATUS, inquiryStatus } from '@/shared/lib/status';
import { WALLET_TX, formatSignedAmount } from '@/shared/lib/wallet';
import {
  fetchMember,
  fetchMemberDevices,
  fetchMemberInquiries,
  fetchMemberWallet,
  memberKeys,
} from '../api';
import type { MemberDevice, MemberInquiry } from '../types';
import './MemberDetailPage.css';

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
   * 이 탭은 회원 본인이 접속한 기기 목록이다. 자녀 기기 관리 화면이 아니다.
   * 기기명과 OS 만 보여준다.
   */
  const deviceColumns: Column<MemberDevice>[] = [
    { key: 'model', header: '기기', render: (d) => <span className="detail__strong">{d.model}</span> },
    { key: 'os', header: 'OS', render: (d) => d.os },
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
        title={maskName(m.name)}
        badge={
          <StatusPill tone={MEMBER_STATUS[m.status].tone} shape="pill">
            {MEMBER_STATUS[m.status].label}
          </StatusPill>
        }
        description={
          <>
            연결 자녀 <strong className="tabular">{m.children.length}</strong>명 · 등록 기기{' '}
            <strong className="tabular">{devices.data?.length ?? m.deviceCount}</strong>대 · 가입{' '}
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
                <DetailRow label="회원 ID" value={<span className="tabular">{m.memberId}</span>} />
                <DetailRow label="아이디" value={m.username} />
                <DetailRow label="이름" value={maskName(m.name)} />
                <DetailRow label="닉네임" value={m.nickname} />
                <DetailRow label="이메일" value={maskEmail(m.email)} />
                <DetailRow label="휴대폰" value={<span className="tabular">{maskPhone(m.phoneNumber)}</span>} />
                <DetailRow label="주소" value={maskAddress(m.address)} />
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
                  <Link className="detail__link" to={`/payments?tab=wallets&keyword=${encodeURIComponent(m.name)}`}>
                    자금·결제 내역 보기
                  </Link>
                }
              >
                {wallet.isPending ? (
                  <LoadingBlock label="지갑 정보를 불러오는 중" />
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
                        {wallet.data.recentTransactions.slice(0, 4).map((t) => (
                          <li key={t.txId} className="detail__tx">
                            <StatusPill tone={WALLET_TX[t.type].tone}>{WALLET_TX[t.type].label}</StatusPill>
                            <span className="detail__tx-time">{formatDateTime(t.createdAt)}</span>
                            <span
                              className={
                                t.amount >= 0
                                  ? 'detail__tx-amount is-plus tabular'
                                  : 'detail__tx-amount is-minus tabular'
                              }
                            >
                              {formatSignedAmount(t.amount)}
                            </span>
                          </li>
                        ))}
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
            description="이 회원이 접속한 기기 목록입니다."
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
                  description="이 회원은 아직 자녀 기기를 연결하지 않았습니다."
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
              emptyState={<EmptyState title="문의 기록이 없습니다" />}
            />
          </Card>
        ) : null}
      </Tabs>

    </div>
  );
}
