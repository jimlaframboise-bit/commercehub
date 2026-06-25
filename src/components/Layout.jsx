import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import Icon from './Icon.jsx'
import { ToastHost } from './ui.jsx'
import { useApp } from '../state.jsx'
import { alerts } from '../data/mock.js'

const NAV = [
  { section: null, items: [{ to: '/', label: 'Overview', icon: 'dashboard', end: true }] },
  {
    section: 'Sponsored Ads', module: true,
    items: [
      { to: '/ads/campaigns', label: 'Campaigns', icon: 'ads' },
      { to: '/ads/adgroups', label: 'Ad Groups', icon: 'layers' },
      { to: '/ads/targeting', label: 'Targeting', icon: 'target' },
      { to: '/ads/search-terms', label: 'Search Terms', icon: 'search' },
      { to: '/ads/sov', label: 'Share of Voice', icon: 'bars' },
      { to: '/ads/dayparting', label: 'Dayparting', icon: 'clock' },
    ],
  },
  {
    section: 'DSP', module: true,
    items: [
      { to: '/dsp', label: 'DSP Campaigns', icon: 'globe', end: true },
      { to: '/dsp/audiences', label: 'Audience Builder', icon: 'users' },
      { to: '/dsp/amc', label: 'AMC', icon: 'database' },
    ],
  },
  {
    section: 'Commerce', module: true,
    items: [
      { to: '/commerce/shelf', label: 'Digital Shelf', icon: 'store' },
      { to: '/commerce/buybox', label: 'Buy Box & Inventory', icon: 'shield' },
      { to: '/commerce/products', label: 'Product Center', icon: 'box' },
    ],
  },
  {
    section: 'Automation',
    items: [
      { to: '/rules', label: 'Rule Manager', icon: 'sliders' },
      { to: '/budgets', label: 'Budget Manager', icon: 'wallet' },
    ],
  },
  {
    section: 'Insights',
    items: [
      { to: '/reports', label: 'Report Center', icon: 'file' },
      { to: '/alerts', label: 'Alerts', icon: 'bell' },
    ],
  },
]

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">C</div>
        <div className="brand-name">Commerce<span>Hub</span></div>
      </div>
      <nav className="nav-section">
        {NAV.map((grp, i) => (
          <div key={i}>
            {grp.section && (
              <div className="nav-section-title">{grp.module ? '◆ ' : ''}{grp.section}</div>
            )}
            {grp.items.map((it) => (
              <NavLink key={it.to} to={it.to} end={it.end}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Icon name={it.icon} size={16} />{it.label}
                {it.badge && <span className="nav-badge">{it.badge}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="avatar">JL</div>
        <div className="who">Jim Laframboise<small>Brightleaf · Agency</small></div>
        <span className="app-version" title="CommerceHub build">v0.11.0</span>
      </div>
    </aside>
  )
}

const CRUMBS = {
  '/': 'Overview', '/ads/campaigns': 'Sponsored Ads · Campaigns', '/ads/adgroups': 'Sponsored Ads · Ad Groups',
  '/ads/targeting': 'Sponsored Ads · Targeting', '/ads/search-terms': 'Sponsored Ads · Search Terms',
  '/ads/sov': 'Sponsored Ads · Share of Voice', '/ads/dayparting': 'Sponsored Ads · Dayparting',
  '/dsp': 'DSP · Campaigns', '/dsp/audiences': 'DSP · Audience Builder', '/dsp/amc': 'DSP · Amazon Marketing Cloud',
  '/commerce/shelf': 'Commerce · Digital Shelf', '/commerce/buybox': 'Commerce · Buy Box & Inventory',
  '/commerce/products': 'Commerce · Product Center', '/rules': 'Automation · Rule Manager',
  '/budgets': 'Automation · Budget Manager', '/reports': 'Insights · Report Center', '/alerts': 'Insights · Alerts',
  '/settings': 'Settings',
}

function todayISO() { return new Date().toISOString().slice(0, 10) }
function CustomRangePanel({ initial, onApply, onClose }) {
  const [start, setStart] = useState(initial?.start || (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10) })())
  const [end, setEnd] = useState(initial?.end || todayISO())
  const valid = start && end
  return (
    <div style={{ padding: 4 }}>
      <div className="cm-head" style={{ padding: '2px 6px 8px' }}>Custom date range</div>
      <label className="fld" style={{ marginBottom: 8 }}>Start<input type="date" value={start} max={end || todayISO()} onChange={(e) => setStart(e.target.value)} /></label>
      <label className="fld" style={{ marginBottom: 10 }}>End<input type="date" value={end} min={start} max={todayISO()} onChange={(e) => setEnd(e.target.value)} /></label>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn ghost sm" onClick={onClose}>Cancel</button>
        <button className="btn primary sm" disabled={!valid} onClick={() => onApply({ start, end })}>Apply</button>
      </div>
    </div>
  )
}
function Topbar() {
  const { profileId, setProfileId, profiles, range, setRange, customRange, setCustomRange, rangeResolved } = useApp()
  const loc = useLocation()
  const [pOpen, setPOpen] = useState(false)
  const [rOpen, setROpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const unread = alerts.filter((a) => !a.read).length
  const crumb = CRUMBS[loc.pathname] || ''
  const [main, sub] = crumb.includes('·') ? crumb.split('·').map((s) => s.trim()) : [crumb, null]
  const selProfile = profileId === 'all' ? 'All Profiles' : profiles.find((p) => p.id === profileId)?.market
  const ranges = ['Today', 'Yesterday', 'Last 7 days', 'Last 30 days', 'This month', 'Last month', 'All time', 'Custom…']
  return (
    <div className="topbar">
      <div className="crumb">
        {sub ? <><span>{main}</span><span className="sep">/</span><b>{sub}</b></> : <b>{main}</b>}
      </div>
      <div className="topbar-spacer" />

      <div style={{ position: 'relative' }}>
        <button className="topbar-ctrl" onClick={() => { setPOpen(!pOpen); setROpen(false) }}>
          <Icon name="store" size={15} />{selProfile}<Icon name="chevDown" size={13} />
        </button>
        {pOpen && (
          <Dropdown onClose={() => setPOpen(false)}>
            <DItem active={profileId === 'all'} onClick={() => { setProfileId('all'); setPOpen(false) }}>All Profiles</DItem>
            {profiles.map((p) => (
              <DItem key={p.id} active={profileId === p.id} onClick={() => { setProfileId(p.id); setPOpen(false) }}>
                {p.market} <span className="tag" style={{ marginLeft: 6 }}>{p.type}</span>
              </DItem>
            ))}
          </Dropdown>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        <button className="topbar-ctrl" onClick={() => { setROpen(!rOpen); setCustomOpen(false); setPOpen(false) }}>
          <Icon name="calendar" size={15} />{rangeResolved.label}<Icon name="chevDown" size={13} />
        </button>
        {rOpen && (
          <Dropdown onClose={() => setROpen(false)}>
            {ranges.map((r) => <DItem key={r} active={range === r} onClick={() => {
              if (r === 'Custom…') { setROpen(false); setCustomOpen(true) }
              else { setRange(r); setROpen(false) }
            }}>{r}</DItem>)}
          </Dropdown>
        )}
        {customOpen && (
          <Dropdown onClose={() => setCustomOpen(false)}>
            <CustomRangePanel
              initial={customRange}
              onClose={() => setCustomOpen(false)}
              onApply={({ start, end }) => { setCustomRange({ start, end }); setRange('Custom…'); setCustomOpen(false) }}
            />
          </Dropdown>
        )}
      </div>

      <button className="topbar-ctrl"><Icon name="filter" size={15} />Filters<span className="badge">2</span></button>
      <NavLink to="/alerts" className="topbar-ctrl" style={{ position: 'relative' }}>
        <Icon name="bell" size={16} />
        {unread > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--red)', color: '#fff', borderRadius: 9, fontSize: 9, padding: '1px 5px', fontWeight: 700 }}>{unread}</span>}
      </NavLink>
      <NavLink to="/settings" className="topbar-ctrl"><Icon name="gear" size={16} /></NavLink>
    </div>
  )
}

function Dropdown({ children, onClose }) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={onClose} />
      <div style={{ position: 'absolute', right: 0, top: 38, minWidth: 200, background: '#fff', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', padding: 6, zIndex: 41 }}>
        {children}
      </div>
    </>
  )
}
function DItem({ children, active, onClick }) {
  return (
    <div onClick={onClick} style={{ padding: '8px 10px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', color: active ? 'var(--brand)' : 'var(--text)', background: active ? 'var(--brand-soft)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--surface-2)' }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}>
      <span style={{ display: 'flex', alignItems: 'center' }}>{children}</span>
      {active && <Icon name="check" size={14} />}
    </div>
  )
}

export default function Layout({ children }) {
  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar />
        <div className="content">{children}</div>
      </div>
      <ToastHost />
    </div>
  )
}
