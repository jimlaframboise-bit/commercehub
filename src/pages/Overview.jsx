import { useMemo } from 'react'
import { Kpi, KpiGrid, Card, PerfChart, Pill, Btn, DualBar, scaleForRange } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { Link } from 'react-router-dom'
import { campaigns, aggregate, timeseries, alerts, budgets, shareOfVoice, digitalShelf, dspOrders } from '../data/mock.js'
import { compact, money, pct, dec2, cur } from '../lib/format.js'
import { useApp } from '../state.jsx'

export default function Overview() {
  const { profileId, rangeResolved } = useApp()
  const campsRaw = profileId === 'all' ? campaigns : campaigns.filter((c) => c.profileId === profileId)
  const { rows: camps, prev } = useMemo(() => scaleForRange(campsRaw, rangeResolved), [campsRaw, rangeResolved])
  const prevRows = useMemo(() => camps.map((r) => prev[r.id]).filter(Boolean), [camps, prev])
  const a = aggregate(camps)
  const p = prevRows.length ? aggregate(prevRows) : null
  const dl = (curV, prvV) => (p && prvV ? ((curV - prvV) / Math.abs(prvV)) * 100 : undefined)

  const dspRaw = profileId === 'all' ? dspOrders : dspOrders.filter((d) => d.profileId === profileId)
  const dspScaled = useMemo(() => scaleForRange(dspRaw, rangeResolved).rows, [dspRaw, rangeResolved])
  const dspSpend = dspScaled.reduce((s, d) => s + d.spend, 0)
  const dspSales = dspScaled.reduce((s, d) => s + d.sales, 0)
  const shelf = profileId === 'all' ? digitalShelf : digitalShelf.filter((d) => d.profileId === profileId)
  const shelfRows = shelf.length ? shelf : digitalShelf
  const oosCount = shelfRows.filter((d) => !d.inStock).length
  const buyBoxAvg = shelfRows.reduce((s, d) => s + d.buyBox, 0) / shelfRows.length
  const organicBase = 380000 * (rangeResolved.days / 30)
  const tacos = ((a.spend + dspSpend) / (a.sales + dspSales + organicBase)) * 100
  const pTacos = p ? ((p.spend + dspSpend) / (p.sales + dspSales + organicBase)) * 100 : null

  const chanSum = (match) => {
    const rows = camps.filter((c) => match(c.type || ''))
    return { spend: rows.reduce((s, c) => s + c.spend, 0), sales: rows.reduce((s, c) => s + c.sales, 0) }
  }
  const sp = chanSum((t) => t.startsWith('SP') || t === 'PAT')
  const sb = chanSum((t) => t.startsWith('SB'))
  const sd = chanSum((t) => t.startsWith('SD'))
  const channelData = [
    { label: 'Sponsored Products', spend: Math.round(sp.spend), sales: Math.round(sp.sales), color: '#1a4fd6' },
    { label: 'Sponsored Brands', spend: Math.round(sb.spend), sales: Math.round(sb.sales), color: '#1a73e8' },
    { label: 'Sponsored Display', spend: Math.round(sd.spend), sales: Math.round(sd.sales), color: '#6b3fd6' },
    { label: 'DSP', spend: Math.round(dspSpend / 100) * 100, sales: Math.round(dspSales / 100) * 100, color: '#1aa260' },
  ]
  const trendData = useMemo(() => timeseries.slice(-Math.max(2, Math.min(30, rangeResolved.days))), [rangeResolved])

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
        <Kpi label="Ad Spend" value={money(a.spend)} delta={dl(a.spend, p?.spend)} deltaGood={(dl(a.spend, p?.spend) || 0) <= 0} />
        <Kpi label="Ad Sales" value={money(a.sales)} delta={dl(a.sales, p?.sales)} />
        <Kpi label="ACoS" value={pct(a.acos)} delta={dl(a.acos, p?.acos)} deltaGood={(dl(a.acos, p?.acos) || 0) <= 0} />
        <Kpi label="ROAS" value={dec2(a.roas)} delta={dl(a.roas, p?.roas)} />
        <Kpi label="TACoS" value={pct(tacos)} delta={pTacos ? ((tacos - pTacos) / Math.abs(pTacos)) * 100 : undefined} deltaGood={pTacos ? tacos <= pTacos : undefined} />
        <Kpi label="Impressions" value={compact(a.impr)} delta={dl(a.impr, p?.impr)} />
        <Kpi label="Orders" value={compact(a.orders)} delta={dl(a.orders, p?.orders)} />
        <Kpi label="Avg Buy Box" value={pct(buyBoxAvg)} />
      </KpiGrid>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <Card title="Performance trend" sub={`Spend vs Sales · ${rangeResolved.label}`}
          actions={<Btn sm ghost icon="download">CSV</Btn>}>
          <PerfChart data={trendData} />
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
