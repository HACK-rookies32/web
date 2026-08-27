import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { DetailBox, DetailRow, EmptyState, LoadingBlock, StatusPill } from '@/shared/ui';
import { formatCurrency, formatDateTime, maskEmail, maskName, memberRef } from '@/shared/lib/format';
import { WALLET_TX, formatSignedAmount } from '@/shared/lib/wallet';
import { fetchWallet, fundKeys } from '../api';
import './WalletDetailPanel.css';

/** 회원 지갑 상세 슬라이드오버 본문. */
export function WalletDetailPanel({ userId }: { userId: number }) {
  const { data, isPending, isError } = useQuery({
    queryKey: fundKeys.wallet(userId),
    queryFn: () => fetchWallet(userId),
  });

  if (isPending) return <LoadingBlock label="지갑 정보를 불러오는 중" />;
  if (isError || !data) return <EmptyState tone="error" title="지갑 정보를 불러오지 못했습니다" />;

  return (
    <>
      <div className="wallet-panel__balance">
        <span className="wallet-panel__balance-label">현재 잔액</span>
        <span className="wallet-panel__balance-value tabular">{formatCurrency(data.balance)}</span>
        <span className="wallet-panel__balance-meta">최근 갱신 {formatDateTime(data.updatedAt)}</span>
      </div>

      <DetailBox>
        <DetailRow
          label="회원"
          value={`${maskName(data.userName)} (${memberRef(data.userId, data.role === 'CHILD' ? '자녀' : '회원')})`}
        />
        <DetailRow
          label="구분"
          value={
            <StatusPill tone={data.role === 'PARENT' ? 'info' : 'accent'}>
              {data.role === 'PARENT' ? '보호자' : '자녀'}
            </StatusPill>
          }
        />
        {data.userEmail !== '-' ? (
          <DetailRow label="이메일" value={maskEmail(data.userEmail)} />
        ) : null}
        <DetailRow
          label={data.role === 'PARENT' ? '연결 자녀' : '보호자'}
          value={data.relatedNames.map(maskName).join(', ') || '-'}
        />
        <DetailRow label="지갑 ID" value={<span className="tabular">{data.walletId}</span>} />
      </DetailBox>

      <section className="wallet-panel__section">
        <h3 className="wallet-panel__heading">거래 원장</h3>

        {data.recentTransactions.length > 0 ? (
          <ul className="wallet-panel__ledger">
            {data.recentTransactions.map((t) => (
              <li key={t.txId} className="wallet-panel__tx">
                <span className="wallet-panel__tx-top">
                  <StatusPill tone={WALLET_TX[t.type].tone}>{WALLET_TX[t.type].label}</StatusPill>
                  <span
                    className={
                      t.amount >= 0
                        ? 'wallet-panel__tx-amount is-plus tabular'
                        : 'wallet-panel__tx-amount is-minus tabular'
                    }
                  >
                    {formatSignedAmount(t.amount)}
                  </span>
                </span>
                <span className="wallet-panel__tx-meta">
                  {formatDateTime(t.createdAt)} · 잔액 {formatCurrency(t.balanceAfter)}
                </span>
                {t.memo ? <span className="wallet-panel__tx-memo">{t.memo}</span> : null}
                {t.refId ? <span className="wallet-panel__tx-ref tabular">{t.refId}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="거래 내역이 없습니다" />
        )}
      </section>

      {data.role === 'PARENT' ? (
        <Link className="wallet-panel__link" to={`/members/${data.userId}`}>
          회원 상세 보기
        </Link>
      ) : null}
    </>
  );
}
