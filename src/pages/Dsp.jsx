import { useState, useMemo } from 'react'
import { Kpi, KpiGrid, Card, Pill, DataGrid, FilterBar, applyFilters, loadFilterModel, Btn, SearchBox, ExportMenu, scaleFields } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { dspOrders, audiences, amcQueries, profileById } from '../data/mock.js'
import { compact, money, pct, dec2, int } from '../lib/format.js'
import { useApp } from '../state.jsx'

const symD = (pid) => profileById[pid]?.currency || '$'
const symOfD = (rs) => symD(rs[0]?.profileId)
const dSum = (rs, k) => rs.reduce((a, b) => a + (b[k] || 0), 0)
const dAvg = (rs, k) => (rs.length ? dSum(rs, k) / rs.length : 0)

function DspHead({ title, sub, children }) {
  return <div className="page-head"><div><div className="page-title">{title}</div><div className="page-sub">{sub}</div></div><div className="page-actions">{children}</div></div>
}

/* Scale DSP cumulative metrics by date range, then recompute derived rates (cur + prev). */
function scaleDsp(rows, range) {
  const { rows: cur, prev } = scaleFields(rows, range, ['impr', 'clicks', 'spend', 'purchases', 'sales'])
  const fix = (r) => ({ ...r, roas: r.spend ? +(r.sales / r.spend).toFixed(1) : 0, cpm: r.impr ? (r.spend / r.impr) * 1000 : 0, ctr: r.impr ? (r.clicks / r.impr) * 100 : 0 })
  const prevF = {}; Object.keys(prev).forEach((k) => { prevF[k] = fix(prev[k]) })
  return { rows: cur.map(fix), prev: prevF }
}

const DSP_TACTICS = ['Remarketing', 'In-market audiences', 'Lifestyle audiences', 'Amazon Performance+', 'Amazon Brand+', 'Competitor conquest', 'High-LTV lookalike']
const DSP_FIELDS = [
  { key: 'name', label: 'Order', type: 'text' },
  { key: 'tactic', label: 'Tactic', type: 'enum', options: DSP_TACTICS },
  { key: 'status', label: 'Status', type: 'enum', options: ['Active', 'Paused'] },
  { key: 'budget', label: 'Budget', type: 'number' },
  { key: 'spend', label: 'Spend', type: 'number' },
  { key: 'impr', label: 'Impressions', type: 'number' },
  { key: 'clicks', label: 'Clicks', type: 'number' },
  { key: 'dpvr', label: 'DPVR %', type: 'number' },
  { key: 'purchases', label: 'Purchases', type: 'number' },
  { key: 'sales', label: 'Sales', type: 'number' },
  { key: 'roas', label: 'ROAS', type: 'number' },
  { key: 'ntbPct', label: 'NTB %', type: 'number' },
]

/* ============================ DSP CAMPAIGNS ============================ */
export function Dsp() {
  const { profileId, rangeResolved } = useApp()
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState(() => loadFilterModel('dsp-orders'))
  const base = useMemo(() => (profileId === 'all' ? dspOrders : dspOrders.filter((d) => d.profileId === profileId)), [profileId])
  const { rows: data, prev } = useMemo(() => scaleDsp(base, rangeResolved), [base, rangeResolved])
  const allTime = rangeResolved.label === 'All time'
  const searched = data.filter((d) => d.name.toLowerCase().includes(q.toLowerCase()))
  const filtered = applyFilters(searched, filters, DSP_FIELDS)
  const prevFiltered = filtered.map((r) => prev[r.id])

  const a = { spend: dSum(filtered, 'spend'), sales: dSum(filtered, 'sales'), impr: dSum(filtered, 'impr'), purchases: dSum(filtered, 'purchases'), ntb: dAvg(filtered, 'ntbPct') }
  const p = prevFiltered.length ? { spend: dSum(prevFiltered, 'spend'), sales: dSum(prevFiltered, 'sales'), impr: dSum(prevFiltered, 'impr'), purchases: dSum(prevFiltered, 'purchases') } : null
  const dl = (cur, prv) => (p && prv ? ((cur - prv) / Math.abs(prv)) * 100 : undefined)

  const columns = [
    { key: 'name', label: 'Order / Line Item', sticky: true, width: 280, sortVal: (r) => r.name, render: (r) => <div>{r.name}<small>{r.tactic} · {r.profileId.toUpperCase()}</small></div> },
    { key: 'status', label: 'Status', render: (r) => <Pill>{r.status}</Pill> },
    { key: 'budget', label: 'Budget', num: true, foot: (rs) => money(dSum(rs, 'budget'), symOfD(rs)), render: (r) => money(r.budget, symD(r.profileId)) },
    { key: 'spend', label: 'Spend', num: true, delta: true, foot: (rs) => money(dSum(rs, 'spend'), symOfD(rs)), render: (r) => money(r.spend, symD(r.profileId)) },
    { key: 'impr', label: 'Impressions', num: true, delta: true, foot: (rs) => compact(dSum(rs, 'impr')), render: (r) => compact(r.impr) },
    { key: 'clicks', label: 'Clicks', num: true, delta: true, foot: (rs) => int(dSum(rs, 'clicks')), render: (r) => int(r.clicks) },
    { key: 'ctr', label: 'CTR', num: true, foot: (rs) => pct(dSum(rs, 'impr') ? (dSum(rs, 'clicks') / dSum(rs, 'impr')) * 100 : 0, 2), render: (r) => pct(r.ctr, 2) },
    { key: 'cpm', label: 'CPM', num: true, foot: (rs) => money(dSum(rs, 'impr') ? (dSum(rs, 'spend') / dSum(rs, 'impr')) * 1000 : 0, symOfD(rs)), render: (r) => money(r.cpm, symD(r.profileId)) },
    { key: 'dpvr', label: 'DPVR', num: true, foot: (rs) => pct(dAvg(rs, 'dpvr'), 1), render: (r) => pct(r.dpvr, 1) },
    { key: 'purchases', label: 'Purchases', num: true, delta: true, foot: (rs) => int(dSum(rs, 'purchases')), render: (r) => int(r.purchases) },
    { key: 'sales', label: 'Sales', num: true, delta: true, foot: (rs) => money(dSum(rs, 'sales'), symOfD(rs)), render: (r) => money(r.sales, symD(r.profileId)) },
    { key: 'roas', label: 'ROAS', num: true, delta: true, foot: (rs) => dec2(dSum(rs, 'spend') ? dSum(rs, 'sales') / dSum(rs, 'spend') : 0), render: (r) => <b style={{ color: r.roas >= 5 ? 'var(--green)' : 'inherit' }}>{dec2(r.roas)}</b> },
    { key: 'ntbPct', label: 'NTB %', num: true, foot: (rs) => pct(dAvg(rs, 'ntbPct'), 0), render: (r) => pct(r.ntbPct, 0) },
  ]
  const presets = {
    Default: ['name', 'status', 'budget', 'spend', 'impr', 'clicks', 'ctr', 'cpm', 'dpvr', 'purchases', 'sales', 'roas', 'ntbPct'],
    Performance: ['name', 'status', 'spend', 'sales', 'roas', 'purchases', 'ntbPct'],
    Delivery: ['name', 'budget', 'spend', 'impr', 'clicks', 'ctr', 'cpm', 'dpvr'],
  }
  const dims = [{ key: 'tactic', label: 'Tactic' }, { key: 'status', label: 'Status' }, { key: 'profileId', label: 'Profile' }]
  return (
    <>
      <DspHead title="DSP Campaigns" sub={`Programmatic display & video · ${rangeResolved.label}`}>
        <ExportMenu name="dsp-campaigns" fields={DSP_FIELDS} rows={filtered} /><Btn icon="plus" primary>New DSP Order</Btn>
      </DspHead>
      <KpiGrid>
        <Kpi label="DSP Spend" value={money(a.spend)} delta={dl(a.spend, p?.spend)} deltaGood={(dl(a.spend, p?.spend) || 0) <= 0} />
        <Kpi label="DSP Sales" value={money(a.sales)} delta={dl(a.sales, p?.sales)} />
        <Kpi label="ROAS" value={dec2(a.spend ? a.sales / a.spend : 0)} delta={dl(a.spend ? a.sales / a.spend : 0, p ? (p.spend ? p.sales / p.spend : 0) : undefined)} />
        <Kpi label="Impressions" value={compact(a.impr)} delta={dl(a.impr, p?.impr)} />
        <Kpi label="Purchases" value={compact(a.purchases)} delta={dl(a.purchases, p?.purchases)} />
        <Kpi label="Avg NTB %" value={pct(a.ntb, 0)} />
      </KpiGrid>
      <DataGrid
        id="dsp-orders"
        columns={columns}
        rows={filtered}
        initialSort={{ key: 'spend', dir: 'desc' }}
        presets={presets}
        defaultPreset="Default"
        dimensions={dims}
        totals
        compare
        comparePrev={prev}
        compareDisabled={allTime}
        toolbarLeft={<>
          <SearchBox value={q} onChange={setQ} placeholder="Search DSP orders…" />
          <FilterBar id="dsp-orders" fields={DSP_FIELDS} value={filters} onChange={setFilters} />
        </>}
      />
      <div className="footnote">DPVR = Detail Page View Rate · CPM = cost per 1,000 impressions · NTB = New-to-Brand. Filter and save Plans, group by tactic, and export the current view. AMC audiences and DSP dayparting auto-apply from the Audience Builder & Rule Manager.</div>
    </>
  )
}

/* ============================ AUDIENCE BUILDER ============================ */
const AUDIENCE_FIELDS = [
  { key: 'name', label: 'Audience', type: 'text' },
  { key: 'type', label: 'Type', type: 'enum', options: ['Remarketing', 'In-market', 'Conquest', 'Lifestyle', 'Modeled'] },
  { key: 'source', label: 'Source', type: 'text' },
  { key: 'status', label: 'Status', type: 'enum', options: ['Active', 'Draft'] },
  { key: 'size', label: 'Reach', type: 'number' },
  { key: 'usedIn', label: 'Used in orders', type: 'number' },
]
export function Audiences() {
  const [q, setQ] = useState('')
  const [seedType, setSeedType] = useState('ASINs')
  const [filters, setFilters] = useState(() => loadFilterModel('dsp-audiences'))
  const searched = audiences.filter((a) => a.name.toLowerCase().includes(q.toLowerCase()))
  const filtered = applyFilters(searched, filters, AUDIENCE_FIELDS)
  const toneByType = { Remarketing: 'blue', 'In-market': 'purple', Conquest: 'amber', Lifestyle: 'green', Modeled: 'purple' }
  const columns = [
    { key: 'name', label: 'Audience', sticky: true, width: 300, sortVal: (r) => r.name, render: (r) => <div>{r.name}<small>{r.source}</small></div> },
    { key: 'type', label: 'Type', render: (r) => <Pill tone={toneByType[r.type] || 'gray'}>{r.type}</Pill> },
    { key: 'size', label: 'Reach', num: true, foot: (rs) => compact(dSum(rs, 'size')), render: (r) => compact(r.size) },
    { key: 'status', label: 'Status', render: (r) => <Pill>{r.status}</Pill> },
    { key: 'usedIn', label: 'Used in', num: true, foot: (rs) => int(dSum(rs, 'usedIn')), render: (r) => `${r.usedIn} orders` },
    { key: 'act', label: '', sort: false, render: () => <Btn sm icon="link">Apply to DSP</Btn> },
  ]
  return (
    <>
      <DspHead title="Audience Builder" sub="Create custom audiences from ASINs or keywords · prebuilt segments & AMC-modeled lookalikes"><Btn icon="plus" primary>Create Audience</Btn></DspHead>
      <div className="grid-3" style={{ marginBottom: 16 }}>
        <Card title="Build from seeds" sub="Deep Intelligence audience creation">
          <div className="viewtabs" style={{ marginBottom: 12 }}>
            {['ASINs', 'Keywords'].map((t) => <div key={t} className={`viewtab ${seedType === t ? 'active' : ''}`} onClick={() => setSeedType(t)}>{t}</div>)}
          </div>
          <div className="search" style={{ maxWidth: '100%', marginBottom: 10 }}>
            <Icon name="search" size={15} /><input placeholder={seedType === 'ASINs' ? 'Paste ASINs (e.g. B0CFREEZE1)…' : 'Enter seed keywords…'} />
          </div>
          <div className="legend" style={{ marginBottom: 12 }}>
            <span className="tag">Your buyers</span><span className="tag">Competitor viewers</span><span className="tag">Category in-market</span>
          </div>
          <Btn primary icon="spark">Generate Audience</Btn>
        </Card>
        <Card title="Prebuilt templates" sub="One-click segments">
          {['Awareness — broad reach', 'Retargeting — viewed not purchased', 'Repeat purchase / replenishment', 'Competitor conquest', 'High-LTV lookalike'].map((t) => (
            <div key={t} className="lrow" style={{ padding: '9px 0' }}>
              <div className="icobox" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}><Icon name="users" size={16} /></div>
              <div className="grow"><div className="title" style={{ fontSize: 12.5 }}>{t}</div></div>
              <Btn sm ghost icon="plus">Use</Btn>
            </div>
          ))}
        </Card>
        <Card title="Audience overlap" sub="SP + DSP exposure (AMC)">
          <div style={{ display: 'grid', placeItems: 'center', padding: '10px 0' }}>
            <svg width="180" height="120" viewBox="0 0 180 120">
              <circle cx="72" cy="60" r="46" fill="#1a4fd6" opacity="0.35" />
              <circle cx="108" cy="60" r="46" fill="#1aa260" opacity="0.35" />
              <text x="50" y="64" fontSize="11" fill="#1a4fd6" fontWeight="700">SP</text>
              <text x="120" y="64" fontSize="11" fill="#1aa260" fontWeight="700">DSP</text>
              <text x="84" y="64" fontSize="10" fill="#333" fontWeight="700">28%</text>
            </svg>
            <div className="footnote" style={{ textAlign: 'center' }}>28% of converters were exposed to both SP and DSP — incremental reach from layering channels.</div>
          </div>
        </Card>
      </div>
      <DataGrid
        id="dsp-audiences"
        columns={columns}
        rows={filtered}
        initialSort={{ key: 'size', dir: 'desc' }}
        dimensions={[{ key: 'type', label: 'Type' }, { key: 'status', label: 'Status' }]}
        totals
        toolbarLeft={<>
          <SearchBox value={q} onChange={setQ} placeholder="Search audiences…" />
          <FilterBar id="dsp-audiences" fields={AUDIENCE_FIELDS} value={filters} onChange={setFilters} />
        </>}
      />
    </>
  )
}

/* ============================ AMC ============================ */
const AMC_FIELDS = [
  { key: 'name', label: 'Query', type: 'text' },
  { key: 'template', label: 'Template', type: 'enum', options: ['Customer Journey', 'NTB Analysis', 'Audience Overlap', 'Frequency Analysis', 'Custom SQL'] },
  { key: 'schedule', label: 'Schedule', type: 'enum', options: ['Daily', 'Weekly', 'Monthly', 'Ad hoc'] },
  { key: 'status', label: 'Status', type: 'enum', options: ['Ready', 'Running'] },
  { key: 'rows', label: 'Rows', type: 'number' },
]
export function Amc() {
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState(() => loadFilterModel('dsp-amc'))
  const searched = amcQueries.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
  const filtered = applyFilters(searched, filters, AMC_FIELDS)
  const columns = [
    { key: 'name', label: 'Query / Analysis', sticky: true, width: 300, sortVal: (r) => r.name, render: (r) => <div>{r.name}<small>{r.template}</small></div> },
    { key: 'schedule', label: 'Schedule', render: (r) => <span className="tag">{r.schedule}</span> },
    { key: 'lastRun', label: 'Last Run', sort: false, render: (r) => <span className="muted">{r.lastRun}</span> },
    { key: 'rows', label: 'Rows', num: true, foot: (rs) => int(dSum(rs, 'rows')), render: (r) => int(r.rows) },
    { key: 'status', label: 'Status', render: (r) => <Pill>{r.status}</Pill> },
    { key: 'act', label: '', sort: false, render: () => <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}><Btn sm ghost icon="eye">View</Btn><Btn sm icon="users">Build Audience</Btn></span> },
  ]
  return (
    <>
      <DspHead title="Amazon Marketing Cloud" sub="Run instructional queries, schedule refreshes, and activate AMC audiences into DSP"><Btn icon="refresh" ghost>Refresh All</Btn><Btn icon="plus" primary>New Query</Btn></DspHead>
      <KpiGrid>
        <Kpi label="Saved Queries" value={amcQueries.length} />
        <Kpi label="AMC Audiences" value={2} />
        <Kpi label="Scheduled Refreshes" value={amcQueries.filter((x) => x.schedule !== 'Ad hoc').length} />
        <Kpi label="Avg Conversion Lift" value="+18%" delta={4.0} />
      </KpiGrid>
      <div className="hint" style={{ marginBottom: 14 }}>
        <Icon name="database" size={16} />
        <div>AMC connects clean-room signals — full shopper journey, new-to-brand, audience overlap, and optimal frequency — then activates modeled audiences into DSP. <b>AMC Activate</b> removes manual querying.</div>
      </div>
      <Card title="Templates" sub="Prebuilt instructional queries">
        <div className="grid-3">
          {['Customer Journey', 'New-to-Brand Analysis', 'Audience Overlap', 'Frequency Analysis', 'Path to Conversion', 'Custom SQL'].map((t) => (
            <div key={t} className="lrow" style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
              <div className="icobox" style={{ background: 'var(--purple-soft)', color: 'var(--purple)' }}><Icon name="database" size={16} /></div>
              <div className="grow"><div className="title" style={{ fontSize: 12.5 }}>{t}</div></div>
            </div>
          ))}
        </div>
      </Card>
      <div style={{ height: 16 }} />
      <DataGrid
        id="dsp-amc"
        columns={columns}
        rows={filtered}
        initialSort={{ key: 'rows', dir: 'desc' }}
        dimensions={[{ key: 'template', label: 'Template' }, { key: 'schedule', label: 'Schedule' }, { key: 'status', label: 'Status' }]}
        totals
        toolbarLeft={<>
          <SearchBox value={q} onChange={setQ} placeholder="Search queries…" />
          <FilterBar id="dsp-amc" fields={AMC_FIELDS} value={filters} onChange={setFilters} />
        </>}
      />
    </>
  )
}
