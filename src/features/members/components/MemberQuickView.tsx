import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button, DetailBox, DetailRow, EmptyState, SlideOver, Spinner, StatusPill } from '@/shared/ui';
import { formatCurrency, formatDate, formatRelative, maskEmail, maskName } from '@/shared/lib/format';
import { MEMBER_STATUS } from '@/shared/lib/status';
import { WALLET_TX, formatSignedAmount } from '@/shared/lib/wallet';
import { fetchMemberDevices, fetchMemberWallet, memberKeys } from '../api';
import type { MemberListItem } from '../types';
import { DeviceGlyph } from './Glyphs';
import './MemberQuickView.css';

interface MemberQuickViewProps {
  member: MemberListItem | null;
  onClose: () => void;
}

/**
 * 회원 빠른 보기 슬라이드오버.
 * 자녀 기기와 결제 요약만 간단히 보여주고, 자세한 내용은 각 화면으로 넘긴다.
 */
export function MemberQuickView({ member, onClose }: MemberQuickViewProps) {
  const memberId = member?.memberId ?? 0;

  const devices = useQuery({
    queryKey: memberKeys.devices(memberId),
    queryFn: () => fetchMemberDevices(memberId),
    enabled: member !== null,
  });

  const wallet = useQuery({
    queryKey: memberKeys.wallet(memberId),
    queryFn: () => fetchMemberWallet(memberId),
    enabled: member !== null,
  });

  return (
    <SlideOver
      open={member !== null}
      onClose={onClose}
      title={member ? maskName(member.name) : ''}
      subtitle={member ? maskEmail(member.email) : undefined}
      footer={
        member ? (
          <>
            <Button onClick={onClose}>닫기</Button>
            <Link className="quickview__cta" to={`/members/${member.memberId}`}>
              회원 상세 보기
            </Link>
          </>
        ) : undefined
      }
    >
      {member ? (
        <>
          <div className="quickview__summary">
            <StatusPill tone={MEMBER_STATUS[member.status].tone}>
              {MEMBER_STATUS[member.status].label}
            </StatusPill>
            <span className="quickview__meta">가입 {formatDate(member.createdAt)}</span>
            <span className="quickview__meta">최근 접속 {formatRelative(member.lastLoginAt)}</span>
          </div>

          {/* ---- 연결 자녀 기기 ---- */}
          <section className="quickview__section">
            <h3 className="quickview__heading">연결 자녀 기기</h3>

            {devices.isPending ? (
              <div className="quickview__loading">
                <Spinner size={18} />
              </div>
            ) : devices.data && devices.data.length > 0 ? (
              <ul className="quickview__devices">
                {devices.data.map((d) => (
                  <li key={d.deviceId} className="quickview__device">
                    <span className="quickview__device-icon">
                      <DeviceGlyph />
                    </span>
                    <span className="quickview__device-body">
                      <span className="quickview__device-name">{d.childName ?? '본인 기기'}</span>
                      <span className="quickview__device-meta">
                        {d.model} · {d.os}
                      </span>
                    </span>
                    <StatusPill tone={d.status === 'ONLINE' ? 'success' : d.status === 'BLOCKED' ? 'danger' : 'neutral'}>
                      {d.status === 'ONLINE' ? '온라인' : d.status === 'BLOCKED' ? '차단' : '오프라인'}
                    </StatusPill>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="등록된 기기가 없습니다" />
            )}
          </section>

          {/* ---- 지갑 요약 ---- */}
          <section className="quickview__section">
            <h3 className="quickview__heading">지갑 요약</h3>

            {wallet.isPending ? (
              <div className="quickview__loading">
                <Spinner size={18} />
              </div>
            ) : wallet.data ? (
              <>
                <DetailBox>
                  <DetailRow label="현재 잔액" value={formatCurrency(wallet.data.balance)} />
                  <DetailRow
                    label="최근 변동"
                    value={formatRelative(wallet.data.updatedAt)}
                  />
                  <DetailRow
                    label="연결 자녀 지갑"
                    value={wallet.data.relatedNames.map(maskName).join(', ') || '-'}
                  />
                </DetailBox>

                {wallet.data.recentTransactions.length > 0 ? (
                  <ul className="quickview__ledger">
                    {wallet.data.recentTransactions.slice(0, 3).map((t) => (
                      <li key={t.txId} className="quickview__tx">
                        <StatusPill tone={WALLET_TX[t.type].tone}>{WALLET_TX[t.type].label}</StatusPill>
                        <span
                          className={
                            t.amount >= 0
                              ? 'quickview__tx-amount is-plus tabular'
                              : 'quickview__tx-amount is-minus tabular'
                          }
                        >
                          {formatSignedAmount(t.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <Link className="quickview__link" to={`/payments?tab=wallets&keyword=${encodeURIComponent(member.name)}`}>
                  자금·결제 내역 전체 보기
                </Link>
              </>
            ) : (
              <EmptyState title="지갑 정보가 없습니다" description="아직 생성된 지갑이 없습니다." />
            )}
          </section>
        </>
      ) : null}
    </SlideOver>
  );
}
