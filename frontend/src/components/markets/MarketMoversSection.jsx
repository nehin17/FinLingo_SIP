import { TrendingUp, TrendingDown } from 'lucide-react'

function MoverRow({ item, type, rank }) {
  const isGainer = type === 'gainer'
  const change = Number(item.changePercent)
  const changeLabel = Number.isFinite(change)
    ? `${change > 0 ? '+' : ''}${change.toFixed(2)}%`
    : 'â€”'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '13px 22px',
        gap: '12px',
        borderBottom: '1px solid var(--border)',
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{
        width: '20px',
        fontSize: '11.5px',
        fontWeight: '700',
        color: 'var(--text-muted)',
        flexShrink: 0,
        fontVariantNumeric: 'tabular-nums',
      }}>
        #{rank}
      </span>

      <div style={{ flex:  1, minWidth: 0 }}>
        <div style={{
          fontSize: '13.5px',
          fontWeight: '700',
          color: 'var(--text)',
          letterSpacing: '0.01em',
        }}>
          {item.ticker}
        </div>
        <div style={{
          fontSize: '11.5px',
          color: 'var(--text-muted)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {item.name}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
        {isGainer
          ? <TrendingUp size={13} strokeWidth={2.5} style={{ color: 'var(--success)' }} />
          : <TrendingDown size={13} strokeWidth={2.5} style={{ color: 'var(--danger)' }} />}
        <span style={{
          fontSize: '14px',
          fontWeight: '700',
          color: isGainer ? 'var(--success)' : 'var(--danger)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.01em',
        }}>
          {changeLabel}
        </span>
      </div>
    </div>
  )
}

function MoverCard({ title, items, type, Icon, iconColor, loading }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '18px',
      overflow: 'hidden',
      flex: 1,
      minWidth: '260px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '9px',
        padding: '16px 22px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-hover)',
      }}>
        <Icon size={15} strokeWidth={2.5} style={{ color: iconColor }} />
        <span style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text)' }}>
          {title}
        </span>
        <span style={{
          fontSize: '10px',
          fontWeight: '600',
          color: 'var(--text-muted)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          padding: '2px 8px',
          marginLeft: 'auto',
        }}>
          Latest stored
        </span>
      </div>

      <div>
        {loading ? (
          <p className="px-5 py-6 text-sm" style={{ color: 'var(--text-muted)' }}>
            Loading market moversâ€¦
          </p>
        ) : items.length ? (
          items.map((item, index) => (
            <div key={item.ticker} style={{
              borderBottom: index < items.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <MoverRow item={item} type={type} rank={index + 1} />
            </div>
          ))
        ) : (
          <p className="px-5 py-6 text-sm" style={{ color: 'var(--text-muted)' }}>
            No price movement available yet. Stored price history is needed for comparison.
          </p>
        )}
      </div>
    </div>
  )
}

export default function MarketMoversSection({
  gainers = [],
  losers = [],
  loading = false,
}) {
  return (
    <section style={{
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '32px 28px 52px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '20px',
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: '800',
          color: 'var(--text)',
          margin: 0,
          letterSpacing: '-0.01em',
        }}>
          Market Movers
        </h2>
        <span style={{
          fontSize: '10px',
          fontWeight: '600',
          color: 'var(--text-muted)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          padding: '3px 9px',
        }}>
          Tracked companies
        </span>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <MoverCard
          title="Top Gainers"
          items={gainers}
          type="gainer"
          Icon={TrendingUp}
          iconColor="var(--success)"
          loading={loading}
        />
        <MoverCard
          title="Top Losers"
          items={losers}
          type="loser"
          Icon={TrendingDown}
          iconColor="var(--danger)"
          loading={loading}
        />
      </div>
    </section>
  )
}