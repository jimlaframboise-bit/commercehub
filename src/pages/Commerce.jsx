import { useState, useMemo } from 'react'
import { Kpi, KpiGrid, Pill, DataGrid, FilterBar, applyFilters, loadFilterModel, Btn, SearchBox, ExportMenu, scaleFields, fxUSD } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { digitalShelf, profileById } from '../data/mock.js'
import { compact, money, pct, cur, int } from '../lib/format.js'
import { useApp } from '../state.jsx'

const sym = (pid) => profileById[pid]?.currency || '$'
const symOfC = (rs) => sym(rs[0]?.profileId)
const cAvg = (rs, k) => (rs.length ? rs.reduce((a, b) => a + (b[k] || 0), 0) / rs.length : 0)
const cSum = (k) => (rs) => rs.reduce((a, b) => a + (b[k] || 0), 0)
const bbColor = (v) => (v >= 80 ? 'var(--green)' : v >= 50 ? 'var(--amber)' : 'var(--red)')

function CommerceHead({ title, sub, children }) {
  return <div className="page-head"><div><div className="page-title">{title}</div><div className="page-sub">{sub}</div></div><div className="page-actions">{children}</div></div>
}
function ScoreBar({ v }) {
  const c = v >= 85 ? 'var(--green)' : v >= 70 ? 'var(--amber)' : 'var(--red)'
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
    <div className="miniprog" style={{ width: 56 }}><span style={{ width: v + '%', background: c }} /></div>
    <b style={{ width: 28, textAlign: 'right', color: c }}>{v}</b>
  </span>
}
function BuyBoxBar({ v }) {
  return <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
    <div className="miniprog" style={{ width: 60 }}><span style={{ width: v + '%', background: bbColor(v) }} /></div>
    <b style={{ width: 38, textAlign: 'right' }}>{pct(v)}</b>
  </span>
}

/* Shared data prep: profile filter + scale cumulative metrics + derived string mirrors for enum filters. */
function useCommerceData() {
  const { profileId, rangeResolved } = useApp()
  return useMemo(() => {
    const base = profileId === 'all' ? digitalShelf : digitalShelf.filter((d) => d.profileId === profileId)
    const { rows, prev } = scaleFields(base, rangeResolved, ['glanceViews', 'orderedRevenue'])
    const decorate = (r) => ({
      ...r,
      availability: r.inStock ? 'In Stock' : 'Out of Stock',
      mapStatus: r.mapViolation ? 'Violation' : 'OK',
      aplusLabel: r.aplus ? 'Yes' : 'No',
      videoLabel: r.video ? 'Yes' : 'No',
    })
    return {
      rows: rows.map(decorate), prev, allTime: rangeResolved.label === 'All time', range: rangeResolved,
      profileId, noShelf: base.length === 0, marketName: profileById[profileId]?.market,
    }
  }, [profileId, rangeResolved])
}

/* Empty state shown when the selected profile has no shelf tracking (e.g. Amazon UK). */
function CmShelfEmpty({ market }) {
  return (
    <div className="card" style={{ padding: '44px 20px', textAlign: 'center' }}>
      <div className="icobox" style={{ margin: '0 auto 10px', background: 'var(--brand-soft)', color: 'var(--brand)' }}><Icon name="box" size={18} /></div>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Shelf tracking not enabled{market ? ` for ${market}` : ' for this profile'}</div>
      <div className="muted" style={{ fontSize: 12.5 }}>Enable retail data for this profile to monitor availability, Buy Box, pricing and content health.</div>
    </div>
  )
}

const CATEGORIES = ['Pet Treats', 'Snacks', 'Pet Food', 'Supplements']
const MARKETS = ['Amazon USA', 'Amazon Canada']

const SHELF_FIELDS = [
  { key: 'title', label: 'Product', type: 'text' },
  { key: 'asin', label: 'ASIN', type: 'text' },
  { key: 'brand', label: 'Brand', type: 'enum', options: ['Brightleaf'] },
  { key: 'category', label: 'Category', type: 'enum', options: CATEGORIES },
  { key: 'profile', label: 'Marketplace', type: 'enum', options: MARKETS },
  { key: 'availability', label: 'Availability', type: 'enum', options: ['In Stock', 'Out of Stock'] },
  { key: 'mapStatus', label: 'MAP', type: 'enum', options: ['OK', 'Violation'] },
  { key: 'buyBox', label: 'Buy Box %', type: 'number' },
  { key: 'price', label: 'Price', type: 'number' },
  { key: 'listingScore', label: 'Content Score', type: 'number' },
  { key: 'rating', label: 'Rating', type: 'number' },
  { key: 'reviews', label: 'Reviews', type: 'number' },
  { key: 'glanceViews', label: 'Glance Views', type: 'number' },
  { key: 'conversion', label: 'CVR %', type: 'number' },
  { key: 'orderedRevenue', label: 'Ordered Revenue', type: 'number' },
]
const BUYBOX_FIELDS = [
  { key: 'title', label: 'Product', type: 'text' },
  { key: 'asin', label: 'ASIN', type: 'text' },
  { key: 'profile', label: 'Marketplace', type: 'enum', options: MARKETS },
  { key: 'availability', label: 'Availability', type: 'enum', options: ['In Stock', 'Out of Stock'] },
  { key: 'repOos', label: 'Reported OOS days', type: 'number' },
  { key: 'buyBox', label: 'Buy Box %', type: 'number' },
  { key: 'price', label: 'Price', type: 'number' },
  { key: 'mapStatus', label: 'MAP', type: 'enum', options: ['OK', 'Violation'] },
]
const PRODUCT_FIELDS = [
  { key: 'title', label: 'Product', type: 'text' },
  { key: 'asin', label: 'ASIN', type: 'text' },
  { key: 'brand', label: 'Brand', type: 'enum', options: ['Brightleaf'] },
  { key: 'category', label: 'Category', type: 'enum', options: CATEGORIES },
  { key: 'images', label: 'Images', type: 'number' },
  { key: 'aplusLabel', label: 'A+ Content', type: 'enum', options: ['Yes', 'No'] },
  { key: 'videoLabel', label: 'Video', type: 'enum', options: ['Yes', 'No'] },
  { key: 'listingScore', label: 'Content Score', type: 'number' },
  { key: 'rating', label: 'Rating', type: 'number' },
  { key: 'reviews', label: 'Reviews', type: 'number' },
  { key: 'conversion', label: 'CVR %', type: 'number' },
  { key: 'orderedRevenue', label: 'Ordered Revenue', type: 'number' },
]

/* ============================ DIGITAL SHELF ============================ */
export function DigitalShelf() {
  const { rows: data, prev, allTime, range, noShelf, marketName } = useCommerceData()
  const kv = (v) => (noShelf ? '—' : v)
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState(() => loadFilterModel('commerce-shelf'))
  const searched = data.filter((d) => d.title.toLowerCase().includes(q.toLowerCase()) || d.asin.toLowerCase().includes(q.toLowerCase()))
  const filtered = applyFilters(searched, filters, SHELF_FIELDS)

  const oos = filtered.filter((d) => !d.inStock).length
  const lowBB = filtered.filter((d) => d.buyBox < 80).length
  const contentGaps = filtered.filter((d) => d.contentIssues > 0).length

  const columns = [
    { key: 'title', label: 'Product', sticky: true, width: 300, sortVal: (r) => r.title, render: (r) => <div>{r.title}<small>{r.asin} · {r.profile}</small></div> },
    { key: 'availability', label: 'Availability', render: (r) => <Pill tone={r.inStock ? 'green' : 'red'}>{r.availability}</Pill> },
    { key: 'buyBox', label: 'Buy Box', num: true, foot: (rs) => <span style={{ color: bbColor(cAvg(rs, 'buyBox')) }}>{pct(cAvg(rs, 'buyBox'))}</span>, render: (r) => <span style={{ color: bbColor(r.buyBox), fontWeight: 700 }}>{pct(r.buyBox)}</span> },
    { key: 'price', label: 'Price', num: true, foot: (rs) => cur(cAvg(rs, 'price'), symOfC(rs), 2), render: (r) => <span>{cur(r.price, sym(r.profileId), 2)}{r.mapViolation && <span className="pill red" style={{ marginLeft: 6, borderRadius: 5 }}>MAP</span>}</span> },
    { key: 'listingScore', label: 'Content Score', num: true, foot: (rs) => Math.round(cAvg(rs, 'listingScore')), render: (r) => <ScoreBar v={r.listingScore} /> },
    { key: 'rating', label: 'Rating', num: true, foot: (rs) => cAvg(rs, 'rating').toFixed(2) + '★', render: (r) => <span>{r.rating.toFixed(1)}★ <span className="muted">({compact(r.reviews)})</span></span> },
    { key: 'glanceViews', label: 'Glance Views', num: true, delta: true, foot: (rs) => compact(cSum('glanceViews')(rs)), render: (r) => compact(r.glanceViews) },
    { key: 'conversion', label: 'CVR', num: true, foot: (rs) => pct(cAvg(rs, 'conversion')), render: (r) => pct(r.conversion) },
    { key: 'orderedRevenue', label: 'Ordered Rev.', num: true, delta: true, foot: (rs) => money(cSum('orderedRevenue')(rs), symOfC(rs)), render: (r) => money(r.orderedRevenue, sym(r.profileId)) },
  ]
  const presets = {
    Default: ['title', 'availability', 'buyBox', 'price', 'listingScore', 'rating', 'glanceViews', 'conversion', 'orderedRevenue'],
    'Content health': ['title', 'listingScore', 'rating', 'conversion'],
    'Availability & price': ['title', 'availability', 'buyBox', 'price'],
    Performance: ['title', 'glanceViews', 'conversion', 'orderedRevenue'],
  }
  const dims = [{ key: 'category', label: 'Category' }, { key: 'profile', label: 'Marketplace' }, { key: 'availability', label: 'Availability' }, { key: 'brand', label: 'Brand' }]
  return (
    <>
      <CommerceHead title="Digital Shelf" sub={`Content, availability, Buy Box, pricing & ratings · ${range.label}`}>
        <ExportMenu name="digital-shelf" fields={SHELF_FIELDS} rows={filtered} /><Btn icon="refresh" ghost>Recrawl</Btn>
      </CommerceHead>
      <KpiGrid>
        <Kpi label="ASINs Monitored" value={kv(filtered.length)} />
        <Kpi label="Out of Stock" value={kv(oos)} />
        <Kpi label="Buy Box < 80%" value={kv(lowBB)} />
        <Kpi label="Content Issues" value={kv(contentGaps)} />
        <Kpi label="Avg Content Score" value={kv(filtered.length ? Math.round(cAvg(filtered, 'listingScore')) : 0)} />
        <Kpi label="Avg Rating" value={kv(cAvg(filtered, 'rating').toFixed(2) + '★')} />
      </KpiGrid>
      <div className="hint" style={{ marginBottom: 14 }}>
        <Icon name="link" size={16} />
        <div>Retail signals are wired into advertising automation: out-of-stock or Buy Box loss triggers <b>auto-pause</b> (Rule R5) to stop wasted ad spend on unavailable products.</div>
      </div>
      {noShelf ? <CmShelfEmpty market={marketName} /> : <DataGrid
        id="commerce-shelf"
        columns={columns}
        rows={filtered}
        initialSort={{ key: 'glanceViews', dir: 'desc' }}
        presets={presets}
        defaultPreset="Default"
        dimensions={dims}
        totals
        compare
        comparePrev={prev}
        compareDisabled={allTime}
        toolbarLeft={<>
          <SearchBox value={q} onChange={setQ} placeholder="Search products / ASIN…" />
          <FilterBar id="commerce-shelf" fields={SHELF_FIELDS} value={filters} onChange={setFilters} />
        </>}
      />}
      <div className="footnote">Build multi-condition filters across content score, Buy Box, availability and pricing, save them as <b>Plans</b>, group by category or marketplace, and export the current view.</div>
    </>
  )
}

/* ============================ BUY BOX & INVENTORY ============================ */
export function BuyBox() {
  const { rows: data, range, noShelf, marketName } = useCommerceData()
  const kv = (v) => (noShelf ? '—' : v)
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState(() => loadFilterModel('commerce-buybox'))
  const searched = data.filter((d) => d.title.toLowerCase().includes(q.toLowerCase()) || d.asin.toLowerCase().includes(q.toLowerCase()))
  const filtered = applyFilters(searched, filters, BUYBOX_FIELDS)
  const columns = [
    { key: 'title', label: 'Product', sticky: true, width: 300, sortVal: (r) => r.title, render: (r) => <div>{r.title}<small>{r.asin} · {r.profile}</small></div> },
    { key: 'availability', label: 'Stock', render: (r) => <Pill tone={r.inStock ? 'green' : 'red'}>{r.availability}</Pill> },
    { key: 'repOos', label: 'Rep. OOS days', num: true, foot: (rs) => int(cSum('repOos')(rs)), render: (r) => r.repOos ? <span style={{ color: 'var(--red)' }}>{r.repOos}</span> : <span className="muted">0</span> },
    { key: 'buyBox', label: 'Buy Box %', num: true, foot: (rs) => <span style={{ color: bbColor(cAvg(rs, 'buyBox')) }}>{pct(cAvg(rs, 'buyBox'))}</span>, render: (r) => <BuyBoxBar v={r.buyBox} /> },
    { key: 'price', label: 'Your Price', num: true, foot: (rs) => cur(cAvg(rs, 'price'), symOfC(rs), 2), render: (r) => cur(r.price, sym(r.profileId), 2) },
    { key: 'mapStatus', label: 'MAP', sortVal: (r) => r.mapStatus, render: (r) => r.mapViolation ? <Pill tone="red">Violation</Pill> : <span className="muted">OK</span> },
    { key: 'adImpact', label: 'Ad Action', sort: false, render: (r) => (!r.inStock || r.buyBox < 50) ? <Pill tone="amber">Ads paused</Pill> : <Pill tone="green">Serving</Pill> },
  ]
  const dims = [{ key: 'availability', label: 'Availability' }, { key: 'mapStatus', label: 'MAP status' }, { key: 'profile', label: 'Marketplace' }]
  return (
    <>
      <CommerceHead title="Buy Box & Inventory" sub={`ASIN-level Buy Box ownership, stock status & ad impact · ${range.label}`}>
        <ExportMenu name="buy-box-inventory" fields={BUYBOX_FIELDS} rows={filtered} /><Btn icon="sliders" primary>Automation Rules</Btn>
      </CommerceHead>
      <KpiGrid>
        <Kpi label="Avg Buy Box" value={kv(pct(cAvg(filtered, 'buyBox')))} />
        <Kpi label="ASINs Losing BB" value={kv(filtered.filter((d) => d.buyBox < 80).length)} />
        <Kpi label="Out of Stock" value={kv(filtered.filter((d) => !d.inStock).length)} />
        <Kpi label="MAP Violations" value={kv(filtered.filter((d) => d.mapViolation).length)} />
        <Kpi label="Ads Auto-Paused" value={kv(filtered.filter((d) => !d.inStock || d.buyBox < 50).length)} />
      </KpiGrid>
      {noShelf ? <CmShelfEmpty market={marketName} /> : <DataGrid
        id="commerce-buybox"
        columns={columns}
        rows={filtered}
        initialSort={{ key: 'buyBox', dir: 'asc' }}
        dimensions={dims}
        totals
        toolbarLeft={<>
          <SearchBox value={q} onChange={setQ} placeholder="Search products / ASIN…" />
          <FilterBar id="commerce-buybox" fields={BUYBOX_FIELDS} value={filters} onChange={setFilters} />
        </>}
      />}
      <div className="footnote">When Buy Box drops below threshold or stock runs out, advertising is automatically paused for that ASIN and resumed on recovery.</div>
    </>
  )
}

/* ============================ PRODUCT CENTER ============================ */
export function Products() {
  const { rows: data, prev, allTime, range, profileId, noShelf, marketName } = useCommerceData()
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState(() => loadFilterModel('commerce-products'))
  const kv = (v) => (noShelf ? '—' : v)
  // de-dupe by ASIN (catalog-level content view): sum cumulative metrics across
  // marketplaces (converting revenue to USD when profiles differ); keep the first
  // row's state/quality fields (price, rating, Buy Box, content score…).
  const cmMixed = profileId === 'all'
  const cmFx = (pid) => (cmMixed ? fxUSD(pid) : 1)
  const byAsin = Object.values(data.reduce((m, d) => {
    const t = m[d.asin]
    if (!t) m[d.asin] = { ...d, orderedRevenue: d.orderedRevenue * cmFx(d.profileId) }
    else { t.glanceViews += d.glanceViews; t.orderedRevenue += d.orderedRevenue * cmFx(d.profileId); t.reviews += d.reviews }
    return m
  }, {}))
  const prevByAsin = {}
  data.forEach((d) => {
    const pr = prev[d.id]; if (!pr) return
    const t = prevByAsin[d.asin]
    if (!t) prevByAsin[d.asin] = { ...pr, orderedRevenue: pr.orderedRevenue * cmFx(d.profileId) }
    else { t.glanceViews += pr.glanceViews; t.orderedRevenue += pr.orderedRevenue * cmFx(d.profileId); t.reviews += pr.reviews }
  })
  const searched = byAsin.filter((d) => d.title.toLowerCase().includes(q.toLowerCase()) || d.asin.toLowerCase().includes(q.toLowerCase()))
  const filtered = applyFilters(searched, filters, PRODUCT_FIELDS)
  const columns = [
    { key: 'title', label: 'Product', sticky: true, width: 320, sortVal: (r) => r.title, render: (r) => <div>{r.title}<small>{r.asin} · {r.brand} · {r.category}</small></div> },
    { key: 'images', label: 'Images', num: true, foot: (rs) => cAvg(rs, 'images').toFixed(1), render: (r) => <span style={{ color: r.images >= 6 ? 'var(--green)' : 'var(--amber)' }}>{r.images}</span> },
    { key: 'aplusLabel', label: 'A+ Content', sortVal: (r) => r.aplusLabel, render: (r) => r.aplus ? <Pill tone="green">Yes</Pill> : <Pill tone="amber">Missing</Pill> },
    { key: 'videoLabel', label: 'Video', sortVal: (r) => r.videoLabel, render: (r) => r.video ? <Pill tone="green">Yes</Pill> : <Pill tone="gray">No</Pill> },
    { key: 'listingScore', label: 'Content Score', num: true, foot: (rs) => Math.round(cAvg(rs, 'listingScore')), render: (r) => <ScoreBar v={r.listingScore} /> },
    { key: 'rating', label: 'Rating', num: true, foot: (rs) => cAvg(rs, 'rating').toFixed(2) + '★', render: (r) => `${r.rating.toFixed(1)}★` },
    { key: 'reviews', label: 'Reviews', num: true, foot: (rs) => compact(cSum('reviews')(rs)), render: (r) => compact(r.reviews) },
    { key: 'conversion', label: 'CVR', num: true, foot: (rs) => pct(cAvg(rs, 'conversion')), render: (r) => pct(r.conversion) },
    { key: 'orderedRevenue', label: 'Ordered Rev.', num: true, delta: true, foot: (rs) => money(cSum('orderedRevenue')(rs), cmMixed ? '$' : symOfC(rs)), render: (r) => money(r.orderedRevenue, cmMixed ? '$' : sym(r.profileId)) },
  ]
  const presets = {
    Default: ['title', 'images', 'aplusLabel', 'videoLabel', 'listingScore', 'rating', 'reviews', 'conversion', 'orderedRevenue'],
    'Content gaps': ['title', 'images', 'aplusLabel', 'videoLabel', 'listingScore'],
    'Reviews & CVR': ['title', 'rating', 'reviews', 'conversion', 'orderedRevenue'],
  }
  const dims = [{ key: 'category', label: 'Category' }, { key: 'aplusLabel', label: 'A+ Content' }, { key: 'videoLabel', label: 'Video' }]
  return (
    <>
      <CommerceHead title="Product Center" sub={`Catalog content health — images, A+, video, reviews & conversion · ${range.label}`}>
        <ExportMenu name="product-center" fields={PRODUCT_FIELDS} rows={filtered} /><Btn icon="plus" primary>Bulk Edit Content</Btn>
      </CommerceHead>
      <KpiGrid>
        <Kpi label="Products" value={kv(filtered.length)} />
        <Kpi label="Missing A+" value={kv(filtered.filter((d) => !d.aplus).length)} />
        <Kpi label="No Video" value={kv(filtered.filter((d) => !d.video).length)} />
        <Kpi label="Content Score < 75" value={kv(filtered.filter((d) => d.listingScore < 75).length)} />
        <Kpi label="Avg Rating" value={kv(cAvg(filtered, 'rating').toFixed(2) + '★')} />
      </KpiGrid>
      {noShelf ? <CmShelfEmpty market={marketName} /> : <DataGrid
        id="commerce-products"
        columns={columns}
        rows={filtered}
        rowKey="asin"
        initialSort={{ key: 'orderedRevenue', dir: 'desc' }}
        presets={presets}
        defaultPreset="Default"
        dimensions={dims}
        totals
        compare
        comparePrev={prevByAsin}
        compareDisabled={allTime}
        toolbarLeft={<>
          <SearchBox value={q} onChange={setQ} placeholder="Search products / ASIN…" />
          <FilterBar id="commerce-products" fields={PRODUCT_FIELDS} value={filters} onChange={setFilters} />
        </>}
      />}
    </>
  )
}
