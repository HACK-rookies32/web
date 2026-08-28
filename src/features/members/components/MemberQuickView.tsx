import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Button,
  buttonClass,
  DetailBox,
  DetailRow,
  EmptyState,
  SlideOver,
  Spinner,
  StatusPill,
} from '@/shared/ui';
import {
  formatCurrency,
  formatDate,
  formatRelative,
  maskAddress,
  maskEmail,
  maskName,
  maskPhone,
  memberRef,
} from '@/shared/lib/format';
import { WALLET_TX, formatSignedAmount } from '@/shared/lib/wallet';
import { fetchMemberDevices, fetchMemberWallet, memberKeys } from '../api';
import type { Member } from '../types';
import { DeviceGlyph } from './Glyphs';
import './MemberQuickView.css';

/** 기기 최근 이벤트 표시 문구 (명세 5.2 — POWER_OFF | GPS_OFF). */
const DEVICE_EVENT: Record<'POWER_OFF' | 'GPS_OFF', string> = {
  POWER_OFF: '전원 꺼짐',
  GPS_OFF: '위치 꺼짐',
};

interface MemberQuickViewProps {
  member: Member | null;
  onClose: () => void;
}

/**
 * 회원 빠른 보기 슬라이드오버.
 *
 * 계정 정보는 회원 목록의 컬럼과 같은 항목을, 기기는 회원 상세의 "연결 기기" 탭과
 * 같은 항목(기기·OS)을 보여준다. 같은 회원을 보는 화면끼리 기준이 달라지면
 * 어느 쪽이 맞는지 확인하러 화면을 옮겨다니게 된다.
 */
export function MemberQuickView({ member, onClose }: MemberQuickViewProps) {
  const memberId = member?.id ?? 0;

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
      title={member ? maskName(member.username) : ''}
      subtitle={
        member
          ? `${memberRef(member.id)} · ${member.email ? maskEmail(member.email) : '이메일 없음'}`
          : undefined
      }
      footer={
        member ? (
          <>
            <Button onClick={onClose}>닫기</Button>
            {/* Link 는 Button 컴포넌트로 감쌀 수 없어 클래스만 가져다 쓴다. */}
            <Link
              className={buttonClass({ variant: 'primary', className: 'quickview__cta' })}
              to={`/members/${member.id}`}
            >
              회원 상세 보기
            </Link>
          </>
        ) : undefined
      }
    >
      {member ? (
        <>
          {/* ---- 계정 정보 (회원 목록 컬럼과 동일) ---- */}
          <section className="quickview__section">
            <h3 className="quickview__heading">계정 정보</h3>
            <DetailBox>
              <DetailRow label="로그인 ID" value={member.loginId} />
              <DetailRow label="닉네임" value={member.nickname} />
              <DetailRow
                label="전화번호"
                value={<span className="tabular">{maskPhone(member.phoneNumber)}</span>}
              />
              <DetailRow label="주소" value={member.address ? maskAddress(member.address) : '-'} />
              <DetailRow label="구분" value={member.role === 'PARENT' ? '보호자' : '자녀'} />
              <DetailRow label="가입일" value={formatDate(member.createdAt)} />
            </DetailBox>
          </section>

          {/* ---- 연결 기기 (명세 5.2 — 기기 식별자와 최근 이벤트만 온다) ---- */}
          <section className="quickview__section">
            <h3 className="quickview__heading">연결 기기</h3>

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
                      <span className="quickview__device-name tabular">{d.deviceId}</span>
                      <span className="quickview__device-meta">
                        {DEVICE_EVENT[d.lastEventType]} · {formatRelative(d.lastEventAt)}
                      </span>
                    </span>
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

                <Link className="quickview__link" to={`/payments?tab=wallets&keyword=${encodeURIComponent(member.username)}`}>
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
