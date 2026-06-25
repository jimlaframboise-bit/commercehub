import { Kpi, KpiGrid, Card, PerfChart, Pill, Btn, DualBar } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { Link } from 'react-router-dom'
import { campaigns, aggregate, timeseries, alerts, budgets, shareOfVoice, digitalShelf, dspOrders } from '../data/mock.js'
import { compact, money, pct, dec2, cur } from '../lib/format.js'
import { useApp } from '../state.jsx'

export default function Overview() {
  const { profileId } = useApp()
  const camps = profileId === 'all' ? campaigns : campaigns.filter((c) => c.profileId === profileId)
  const a = aggregate(camps)
  const dspSpend = dspOrders.reduce((s, d) => s + d.spend, 0)
  const dspSales = dspOrders.reduce((s, d) => s + d.sales, 0)
  const oosCount = digitalShelf.filter((d) => !d.inStock).length
  const buyBoxAvg = digitalShelf.reduce((s, d) => s + d.buyBox, 0) / digitalShelf.length
  const tacos = ((a.spend + dspSpend) / (a.sales + dspSales + 380000)) * 100

  const channelData = [
    { label: 'Sponsored Products', spend: 38200, sales: 119000, color: '#1a4fd6' },
    { label: 'Sponsored Brands', spend: 14800, sales: 41200, color: '#1a73e8' },
    { label: 'Sponsored Display', spend: 7400, sales: 18900, color: '#6b3fd6' },
    { label: 'DSP', spend: Math.round(dspSpend / 100) * 100, sales: Math.round(dspSales / 100) * 100, color: '#1aa260' },
  ]

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Commerce Overview</div>
          <div className="page-sub">Unified view across Sponsored Ads, DSP and Commerce · {profileId === 'all' ? 'All profiles' : camps[0]?.profileId.toUpperCase()}</div>
        </div>
        <div className="page-actions">
          <Btn icon="refresh" ghost>Refresh</Btn>
          <Btn icon="download">Export</Btn>
          <Btn icon="plus" primary>Create Campaign</Btn>
        </div>
      </div>

      <KpiGrid>
        <Kpi label="Ad Spend" value={money(a.spend)} delta={8.2} deltaGood={false} />
        <Kpi label="Ad Sales" value={money(a.sales)} delta={12.6} />
        <Kpi label="ACoS" value={pct(a.acos)} delta={-3.1} deltaGood />
        <Kpi label="ROAS" value={dec2(a.roas)} delta={4.4} />
        <Kpi label="TACoS" value={pct(tacos)} delta={-1.2} deltaGood />
        <Kpi label="Impressions" value={compact(a.impr)} delta={6.7} />
        <Kpi label="Orders" value={compact(a.orders)} delta={9.1} />
        <Kpi label="Avg Buy Box" value={pct(buyBoxAvg)} delta={-2.4} deltaGood={false} />
      </KpiGrid>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <Card title="Performance trend" sub="Spend vs Sales · last 30 days"
          actions={<Btn sm ghost icon="download">CSV</Btn>}>
          <PerfChart data={timeseries} />
        </Card>
        <Card title="Spend & sales by channel" sub="Full-funnel media mix">
          <DualBar data={channelData} keys={[{ key: 'spend', label: 'Spend', color: '#1a4fd6' }, { key: 'sales', label: 'Sales', color: '#1aa260' }]} />
        </Card>
      </div>

      <div className="grid-3">
        <Card title="Action center" sub={`${alerts.filter(x => !x.read).length} need attention`}
          actions={<Link to="/alerts" className="btn sm ghost">View all</Link>}>
          {alerts.slice(0, 4).map((al) => (
            <div key={al.id} className="lrow" style={{ padding: '11px 0', borderColor: 'var(--border)' }}>
              <div className="icobox" style={{ background: sevBg(al.sev), color: sevColor(al.sev) }}>
                <Icon name={al.icon} size={17} />
              </div>
              <div className="grow">
                <div className="title">{al.title}</div>
                <div className="desc">{al.body}</div>
              </div>
              <div className="muted" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{al.time}</div>
            </div>
          ))}
        </Card>

        <Card title="Budget pacing" sub="Month-to-date vs target"
          actions={<Link to="/budgets" className="btn sm ghost">Manage</Link>}>
          {budgets.map((b) => (
            <div key={b.profileId} style={{ marginBottom: 16 }}>
              <div className="flex between items-center" style={{ marginBottom: 6 }}>
                <b style={{ fontSize: 12.5 }}>{b.profile}</b>
                <Pill>{b.status}</Pill>
              </div>
              <div className="pace">
                <span style={{ width: Math.min(100, (b.spent / b.monthlyCap) * 100) + '%', background: ovPace(b.status) }} />
              </div>
              <div className="pacelabel">
                <span>{cur(b.spent, b.currency)} of {cur(b.monthlyCap, b.currency)}</span>
                <span>{pct(b.pacePct)} of pace</span>
              </div>
            </div>
          ))}
        </Card>

        <Card title="Digital shelf health" sub="Retail signals affecting ads"
          actions={<Link to="/commerce/shelf" className="btn sm ghost">Open</Link>}>
          <ShelfStat label="ASINs out of stock" value={oosCount} tone={oosCount ? 'red' : 'green'} icon="box" note="Ads auto-paused by Rule R5" />
          <ShelfStat label="Avg Buy Box ownership" value={pct(buyBoxAvg)} tone={buyBoxAvg > 70 ? 'green' : 'amber'} icon="shield" note="ASIN-level monitoring" />
          <ShelfStat label="Listings with content issues" value={digitalShelf.filter(d => d.contentIssues > 0).length} tone="amber" icon="file" note="Title / image / A+ gaps" />
          <ShelfStat label="Avg rating" value={(digitalShelf.reduce((s, d) => s + d.rating, 0) / digitalShelf.length).toFixed(2) + '★'} tone="green" icon="star" note="Across catalog" />
        </Card>
      </div>
    </>
  )
}

function ShelfStat({ label, value, tone, icon, note }) {
  return (
    <div className="lrow" style={{ padding: '11px 0' }}>
      <div className="icobox" style={{ background: sevBg(tone === 'red' ? 'high' : tone === 'amber' ? 'med' : 'low'), color: tone === 'red' ? 'var(--red)' : tone === 'amber' ? 'var(--amber)' : 'var(--green)' }}>
        <Icon name={icon} size={17} />
      </div>
      <div className="grow">
        <div className="title">{value}</div>
        <div className="desc">{label} · {note}</div>
      </div>
    </div>
  )
}
const sevBg = (s) => ({ high: 'var(--red-soft)', med: 'var(--amber-soft)', low: 'var(--green-soft)' }[s] || 'var(--brand-soft)')
const sevColor = (s) => ({ high: 'var(--red)', med: 'var(--amber)', low: 'var(--green)' }[s] || 'var(--brand)')
const ovPace = (s) => (s === 'Over pace' ? 'var(--red)' : s === 'Under pace' ? 'var(--amber)' : 'var(--green)')
