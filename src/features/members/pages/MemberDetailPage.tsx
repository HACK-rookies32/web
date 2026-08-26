import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  Modal,
  PageHeader,
  StatusPill,
  Table,
  Tabs,
  useToast,
} from '@/shared/ui';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRelative,
  maskAddress,
  maskEmail,
  maskName,
  maskPhone,
} from '@/shared/lib/format';
import { MEMBER_STATUS, inquiryStatus } from '@/shared/lib/status';
import { WALLET_TX, formatSignedAmount } from '@/shared/lib/wallet';
import { useAuth } from '@/shared/auth/AuthContext';
import { useAuditLogSync } from '@/shared/hooks/useAuditLogSync';
import {
  fetchMember,
  fetchMemberDevices,
  fetchMemberInquiries,
  fetchMemberWallet,
  memberKeys,
  updateMember,
} from '../api';
import type { MemberDevice, MemberInquiry } from '../types';
import { BanGlyph, DownloadGlyph } from '../components/Glyphs';
import { CsvReportModal } from '../components/CsvReportModal';
import './MemberDetailPage.css';

type TabKey = 'basic' | 'devices' | 'inquiries';
const TAB_KEYS: TabKey[] = ['basic', 'devices', 'inquiries'];

const DEVICE_STATUS = {
  ONLINE: { label: '온라인', tone: 'success' },
  OFFLINE: { label: '오프라인', tone: 'neutral' },
  BLOCKED: { label: '차단', tone: 'danger' },
} as const;

/**
 * 회원 상세 (Figma 131:816 / 131:2761 / 131:2).
 * 탭 3개: 기본 정보 / 연결 기기 관리 / 1:1 문의 기록.
 * 자금 내역은 별도 "자금·결제 관리" 화면으로 뺀다 (확정 결정 1번).
 */
export function MemberDetailPage() {
  const { memberId: rawId } = useParams();
  const memberId = Number(rawId);
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { hasRole, session } = useAuth();
  const syncAuditLog = useAuditLogSync();
  const canManage = hasRole(['SUPER_ADMIN']);

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as TabKey | null;
  const tab: TabKey = tabParam && TAB_KEYS.includes(tabParam) ? tabParam : 'basic';

  const [csvOpen, setCsvOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);

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

  const suspendMutation = useMutation({
    mutationFn: () =>
      updateMember({
        memberId,
        body: { status: 'SUSPENDED' },
        adminUsername: session?.username ?? 'unknown',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all });
      queryClient.invalidateQueries({ queryKey: memberKeys.detail(memberId) });
      syncAuditLog();
      setSuspendOpen(false);
      toast.success('계정을 정지했습니다', '이 작업은 감사 로그에 기록되었습니다.');
    },
    onError: () => toast.error('계정 정지에 실패했습니다', '잠시 후 다시 시도해 주세요.'),
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

  const deviceColumns: Column<MemberDevice>[] = [
    {
      key: 'child',
      header: '사용 자녀',
      render: (d) => (
        <span className="detail__strong">{d.childName ? maskName(d.childName) : '본인 기기'}</span>
      ),
    },
    { key: 'model', header: '기기', render: (d) => d.model },
    { key: 'os', header: 'OS', render: (d) => d.os },
    { key: 'appVersion', header: '앱 버전', numeric: true, render: (d) => `v${d.appVersion}` },
    {
      key: 'status',
      header: '상태',
      width: '96px',
      render: (d) => (
        <StatusPill tone={DEVICE_STATUS[d.status].tone}>{DEVICE_STATUS[d.status].label}</StatusPill>
      ),
    },
    {
      key: 'lastSeenAt',
      header: '최근 접속',
      align: 'right',
      width: '120px',
      render: (d) => <span className="muted">{formatRelative(d.lastSeenAt)}</span>,
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
        actions={
          <Button iconLeft={<DownloadGlyph />} onClick={() => setCsvOpen(true)}>
            회원 리포트 CSV 다운로드
          </Button>
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
                <DetailRow label="생년월일" value={<span className="tabular">{m.birthDate}</span>} />
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
                  <DetailRow label="최근 접속" value={formatRelative(m.lastLoginAt)} />
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
            description="자녀 기기의 연결 상태와 앱 버전을 확인합니다."
            action={
              canManage && m.status !== 'SUSPENDED' ? (
                <Button variant="danger" iconLeft={<BanGlyph />} onClick={() => setSuspendOpen(true)}>
                  계정 정지
                </Button>
              ) : canManage ? (
                <StatusPill tone="danger">정지된 계정</StatusPill>
              ) : undefined
            }
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

      <CsvReportModal open={csvOpen} member={m} onClose={() => setCsvOpen(false)} />

      <Modal
        open={suspendOpen}
        onClose={() => setSuspendOpen(false)}
        size="sm"
        title="계정을 정지할까요?"
        description="정지하면 해당 회원과 연결된 자녀 기기의 앱 사용이 제한됩니다."
        footer={
          <>
            <Button onClick={() => setSuspendOpen(false)} disabled={suspendMutation.isPending}>
              취소
            </Button>
            <Button
              variant="danger"
              loading={suspendMutation.isPending}
              onClick={() => suspendMutation.mutate()}
            >
              계정 정지
            </Button>
          </>
        }
      >
        <p className="detail__confirm">
          <strong>{maskName(m.name)}</strong> ({maskEmail(m.email)}) 회원의 계정을 정지합니다. 이
          작업은 감사 로그에 기록됩니다.
        </p>
      </Modal>
    </div>
  );
}
