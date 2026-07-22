import { useState, useMemo, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Kpi, KpiGrid, Card, Pill, Toggle, Check, DataGrid, FilterBar, applyFilters, loadFilterModel, Btn, SearchBox, EditableNum, StateSelect, Modal, toast, createdStore, usePersistentOverrides, ExportMenu, exportCSV, scaleForRange, fxUSD, Popover } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import {
  campaigns as ALL_CAMPAIGNS, keywords, searchTerms, shareOfVoice, dayparting, DAYS,
  aggregate, profileById, budgets, rules as RULES, campaignTags, keywordTags, asinTags,
} from '../data/mock.js'
import { compact, money, pct, dec2, cur, int } from '../lib/format.js'
import { useApp } from '../state.jsx'

const symA = (pid) => profileById[pid]?.currency || '$'
const typeTone = (t) => (t.startsWith('SP') ? 'blue' : t.startsWith('SB') ? 'purple' : 'amber')
const symOf = (rs) => (rs[0] ? symA(rs[0].profileId) : '$')
const sumKey = (k) => (rs) => rs.reduce((a, b) => a + (b[k] || 0), 0)
/* SA-R7: mixed-currency money aggregates — when rows span currencies (profile = All),
   convert to USD via fxUSD() and flag the figure as an estimate. */
const adsMixedCur = (rs) => new Set(rs.map((r) => symA(r.profileId))).size > 1
const adsUsdSum = (rs, k) => rs.reduce((a, r) => a + (r[k] || 0) * fxUSD(r.profileId), 0)
const adsMoneyFoot = (k, dec = 0) => (rs) => (adsMixedCur(rs)
  ? `${cur(adsUsdSum(rs, k), '$', dec)} (USD est.)`
  : cur(sumKey(k)(rs), symOf(rs), dec))

const CAMPAIGN_FIELDS = [
  { key: 'name', label: 'Campaign Name', type: 'text' },
  { key: 'asin', label: 'ASIN', type: 'text' },
  { key: 'campaignType', label: 'Type', type: 'enum', options: ['SP-Auto', 'SP-Manual', 'SB', 'SBV', 'SD-Product', 'SD-Audience'] },
  { key: 'status', label: 'Status', type: 'enum', options: ['Enabled', 'Paused', 'Out of Budget', 'Archived'] },
  { key: 'state', label: 'State', type: 'enum', options: ['Enabled', 'Paused', 'Archived'] },
  { key: 'portfolio', label: 'Portfolio', type: 'enum', options: ['Always-On', 'New Launch', 'Brand Defense', 'Competitor Conquest', 'Seasonal'] },
  { key: 'bidStrategy', label: 'Bid Strategy', type: 'enum', options: ['Dynamic - down only', 'Dynamic - up & down', 'Fixed bids'] },
  { key: 'dailyBudget', label: 'Daily Budget', type: 'number' },
  { key: 'spend', label: 'Spend', type: 'number' },
  { key: 'sales', label: 'Sales', type: 'number' },
  { key: 'acos', label: 'ACoS %', type: 'number' },
  { key: 'roas', label: 'ROAS', type: 'number' },
  { key: 'cpc', label: 'CPC', type: 'number' },
  { key: 'ctr', label: 'CTR %', type: 'number' },
  { key: 'cvr', label: 'CVR %', type: 'number' },
  { key: 'orders', label: 'Orders', type: 'number' },
  { key: 'impr', label: 'Impressions', type: 'number' },
  { key: 'clk', label: 'Clicks', type: 'number' },
]

const ADGROUP_FIELDS = [
  { key: 'name', label: 'Ad Group', type: 'text' },
  { key: 'campaign', label: 'Campaign', type: 'text' },
  { key: 'state', label: 'State', type: 'enum', options: ['Enabled', 'Paused'] },
  { key: 'defaultBid', label: 'Default Bid', type: 'number' },
  { key: 'targets', label: 'Targets', type: 'number' },
  { key: 'spend', label: 'Spend', type: 'number' },
  { key: 'sales', label: 'Sales', type: 'number' },
  { key: 'acos', label: 'ACoS %', type: 'number' },
  { key: 'roas', label: 'ROAS', type: 'number' },
  { key: 'ctr', label: 'CTR %', type: 'number' },
  { key: 'orders', label: 'Orders', type: 'number' },
  { key: 'impr', label: 'Impressions', type: 'number' },
  { key: 'clk', label: 'Clicks', type: 'number' },
]

const TARGETING_FIELDS = [
  { key: 'keyword', label: 'Targeting', type: 'text' },
  { key: 'campaign', label: 'Campaign', type: 'text' },
  { key: 'matchType', label: 'Match Type', type: 'enum', options: ['Broad', 'Phrase', 'Exact', 'PAT', 'Negative Exact'] },
  { key: 'state', label: 'State', type: 'enum', options: ['Enabled', 'Paused', 'Archived'] },
  { key: 'bid', label: 'Bid', type: 'number' },
  { key: 'sugBid', label: 'Suggested Bid', type: 'number' },
  { key: 'topOfSearchIS', label: 'Top-of-Search IS %', type: 'number' },
  { key: 'spend', label: 'Spend', type: 'number' },
  { key: 'sales', label: 'Sales', type: 'number' },
  { key: 'acos', label: 'ACoS %', type: 'number' },
  { key: 'roas', label: 'ROAS', type: 'number' },
  { key: 'orders', label: 'Orders', type: 'number' },
  { key: 'impr', label: 'Impressions', type: 'number' },
  { key: 'clk', label: 'Clicks', type: 'number' },
]

const SEARCHTERM_FIELDS = [
  { key: 'term', label: 'Search Term', type: 'text' },
  { key: 'campaign', label: 'Campaign', type: 'text' },
  { key: 'matchedTarget', label: 'Matched Target', type: 'text' },
  { key: 'spend', label: 'Spend', type: 'number' },
  { key: 'sales', label: 'Sales', type: 'number' },
  { key: 'acos', label: 'ACoS %', type: 'number' },
  { key: 'orders', label: 'Orders', type: 'number' },
  { key: 'clk', label: 'Clicks', type: 'number' },
  { key: 'impr', label: 'Impressions', type: 'number' },
]

const SOV_FIELDS = [
  { key: 'keyword', label: 'Keyword', type: 'text' },
  { key: 'topCompetitor', label: 'Top Competitor', type: 'enum', options: ['Pawthentic', 'NorthernPack', 'TrueNature', 'AlphaPet', 'WildHarvest'] },
  { key: 'searchVolume', label: 'Search Volume', type: 'number' },
  { key: 'paidShare', label: 'Paid SOV %', type: 'number' },
  { key: 'organicShare', label: 'Organic SOV %', type: 'number' },
  { key: 'totalShare', label: 'Total SOV %', type: 'number' },
  { key: 'yourRank', label: 'Your Avg Rank', type: 'number' },
  { key: 'competitorShare', label: 'Competitor SOV %', type: 'number' },
  { key: 'trend', label: '7d Trend', type: 'number' },
]

function useProfileFilter(rows) {
  const { profileId } = useApp()
  return useMemo(() => (profileId === 'all' ? rows : rows.filter((r) => r.profileId === profileId)), [rows, profileId])
}

/* ---- bulk bid / budget math (results floored: bids ≥ $0.02, budgets ≥ $1) ---- */
const round2 = (n) => Math.round(n * 100) / 100
const MIN_BID = 0.02
const MIN_BUDGET = 1
const applyBidOp = (cur, suggested, mode, amt) => {
  let n = cur
  if (mode === 'set') n = amt
  else if (mode === 'inc') n = cur * (1 + amt / 100)
  else if (mode === 'dec') n = cur * (1 - amt / 100)
  else if (mode === 'suggested') n = suggested
  else if (mode === 'ceiling') n = Math.min(cur, amt)
  else if (mode === 'floor') n = Math.max(cur, amt)
  return Math.max(MIN_BID, round2(n))
}
const applyBudgetOp = (cur, mode, amt) => {
  let n = cur
  if (mode === 'set') n = amt
  else if (mode === 'inc') n = cur * (1 + amt / 100)
  else if (mode === 'dec') n = cur * (1 - amt / 100)
  return Math.max(MIN_BUDGET, round2(n))
}

function BulkBidModal({ count, currency, onApply, onClose, suggestedLabel = 'suggested', initialMode = 'set' }) {
  const [mode, setMode] = useState(initialMode)
  const [amt, setAmt] = useState('')
  const modes = [['set', 'Set to value'], ['inc', 'Increase by %'], ['dec', 'Decrease by %'], ['suggested', `Set to ${suggestedLabel}`], ['ceiling', 'Set ceiling (max)'], ['floor', 'Set floor (min)']]
  const needsAmt = mode !== 'suggested'
  const isPct = mode === 'inc' || mode === 'dec'
  return (
    <Modal title="Adjust bids" sub={`${count} line item${count === 1 ? '' : 's'} selected`} onClose={onClose} footer={<>
      <Btn ghost onClick={onClose}>Cancel</Btn>
      <Btn primary disabled={needsAmt && amt === ''} onClick={() => onApply(mode, Number(amt))}>Apply to {count}</Btn>
    </>}>
      <label className="fld">Action
        <select value={mode} onChange={(e) => setMode(e.target.value)}>{modes.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </label>
      {needsAmt && (
        <label className="fld">{isPct ? 'Percent (%)' : `Amount (${currency})`}
          <input type="number" value={amt} autoFocus placeholder={isPct ? 'e.g. 10' : `e.g. 1.20`} onChange={(e) => setAmt(e.target.value)} />
        </label>
      )}
      <div className="modal-note"><Icon name="bulb" size={14} />Applies to the actual bid on each selected line. Bids are floored at the account minimum on save.</div>
    </Modal>
  )
}

function BulkBudgetModal({ count, currency, onApply, onClose }) {
  const [mode, setMode] = useState('set')
  const [amt, setAmt] = useState('')
  const modes = [['set', 'Set to value'], ['inc', 'Increase by %'], ['dec', 'Decrease by %']]
  const isPct = mode === 'inc' || mode === 'dec'
  return (
    <Modal title="Adjust daily budget" sub={`${count} campaign${count === 1 ? '' : 's'} selected`} onClose={onClose} footer={<>
      <Btn ghost onClick={onClose}>Cancel</Btn>
      <Btn primary disabled={amt === ''} onClick={() => onApply(mode, Number(amt))}>Apply to {count}</Btn>
    </>}>
      <label className="fld">Action
        <select value={mode} onChange={(e) => setMode(e.target.value)}>{modes.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </label>
      <label className="fld">{isPct ? 'Percent (%)' : `Amount (${currency})`}
        <input type="number" value={amt} autoFocus placeholder={isPct ? 'e.g. 15' : 'e.g. 50'} onChange={(e) => setAmt(e.target.value)} />
      </label>
    </Modal>
  )
}

function BulkTagModal({ count, onApply, onClose }) {
  const [tag, setTag] = useState('')
  return (
    <Modal title="Apply tag" sub={`${count} campaign${count === 1 ? '' : 's'} selected`} onClose={onClose} footer={<>
      <Btn ghost onClick={onClose}>Cancel</Btn>
      <Btn primary disabled={!tag.trim()} onClick={() => onApply(tag.trim())}>Tag {count}</Btn>
    </>}>
      <label className="fld">Tag name
        <input value={tag} autoFocus placeholder="e.g. Q3 Push" onChange={(e) => setTag(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && tag.trim()) onApply(tag.trim()) }} />
      </label>
    </Modal>
  )
}

const DAYPART_PRESETS = ['Current saved schedule', 'Always-on (24/7)', 'Business hours (9am–6pm)', 'Evenings & weekends', 'Prime Day boost (12pm–11pm)']
function BulkDaypartModal({ count, onApply, onClose }) {
  const [sched, setSched] = useState(DAYPART_PRESETS[0])
  return (
    <Modal title="Apply dayparting" sub={`${count} campaign${count === 1 ? '' : 's'} selected`} onClose={onClose} footer={<>
      <Btn ghost onClick={onClose}>Cancel</Btn><div style={{ flex: 1 }} /><Btn primary icon="clock" onClick={() => onApply(sched)}>Apply schedule</Btn>
    </>}>
      <label className="fld">Dayparting schedule
        <select value={sched} autoFocus onChange={(e) => setSched(e.target.value)}>{DAYPART_PRESETS.map((s) => <option key={s}>{s}</option>)}</select>
      </label>
      <div className="modal-note"><Icon name="bulb" size={14} />Bid multipliers from this schedule will apply to the selected campaigns. Edit the curve on the Dayparting page.</div>
    </Modal>
  )
}
function ApplyRuleModal({ count, rules, onApply, onClose }) {
  const [rid, setRid] = useState(rules[0]?.id || '')
  const sel = rules.find((r) => r.id === rid)
  return (
    <Modal title="Apply automation rule" sub={`${count} campaign${count === 1 ? '' : 's'} selected`} onClose={onClose} footer={<>
      <Btn ghost onClick={onClose}>Cancel</Btn><div style={{ flex: 1 }} /><Btn primary disabled={!sel} icon="sliders" onClick={() => onApply(sel)}>Apply rule</Btn>
    </>}>
      <label className="fld">Rule
        <select value={rid} autoFocus onChange={(e) => setRid(e.target.value)}>{rules.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
      </label>
      {sel && <div className="modal-note"><Icon name="bulb" size={14} />IF {sel.trigger} → THEN {sel.action}.</div>}
    </Modal>
  )
}

function AdsHead({ title, sub, children }) {
  return (
    <div className="page-head">
      <div><div className="page-title">{title}</div><div className="page-sub">{sub}</div></div>
      <div className="page-actions">{children}</div>
    </div>
  )
}

/* ---- Create-Campaign Super Wizard ---- */
// NOTE: computed lazily (function, not module-const) because in the single-file
// build the `ALL_CAMPAIGNS` alias is injected at the end — a top-level const here
// would hit a temporal-dead-zone error.
const getProductList = () => [...new Map(ALL_CAMPAIGNS.map((c) => [c.asin, { asin: c.asin, title: c.product, brand: (c.product || 'Brightleaf').split(' ')[0] }])).values()]
const WIZ_TYPES = [
  { v: 'SP-Auto', t: 'Sponsored Products — Auto', s: 'Amazon matches your ASINs to relevant shopper searches.' },
  { v: 'SP-Manual', t: 'Sponsored Products — Manual', s: 'You choose keywords and match types.' },
  { v: 'PAT', t: 'Product Targeting (PAT)', s: 'Target specific ASINs or categories directly.' },
]
const WIZ_MATCHES = ['Broad', 'Phrase', 'Exact']
const WIZ_THEMES = [
  { v: 'Branded', s: 'Your own brand terms — defend & convert.' },
  { v: 'Category', s: 'Generic category terms — reach new shoppers.' },
  { v: 'Competitor', s: 'Competitor brand / ASIN terms — conquest.' },
]

function CreateCampaignWizard({ products, profileId, onClose, onLaunch }) {
  const currency = symA(profileId)
  const [step, setStep] = useState(0)
  const today = new Date().toISOString().slice(0, 10)
  const [f, setF] = useState({
    products: [], dailyBudget: '50', startDate: today, endDate: '',
    type: 'SP-Auto', matches: ['Exact'], themes: ['Branded'],
    naming: '{brand}-{asin}-{type}-{theme}',
    ai: false, aiTarget: 'ACoS', aiValue: '25', maxBid: '1.20', priority: 'Balanced',
  })
  const set = (patch) => setF((x) => ({ ...x, ...patch }))
  const toggleIn = (key, val) => set({ [key]: f[key].includes(val) ? f[key].filter((v) => v !== val) : [...f[key], val] })
  const isManual = f.type === 'SP-Manual'
  const groupCount = (isManual ? Math.max(1, f.matches.length) : 1) * Math.max(1, f.themes.length)
  const steps = ['Products', 'Daily budget', 'Schedule', 'Campaign type', 'Ad groups', 'Targeting themes', 'Naming', 'Optimization', 'Review']
  const last = steps.length - 1
  const canNext = () => {
    if (step === 0) return f.products.length > 0
    if (step === 1) return Number(f.dailyBudget) > 0
    if (step === 2) return !!f.startDate
    if (step === 4) return isManual ? f.matches.length > 0 : true
    if (step === 5) return f.themes.length > 0
    if (step === 6) return f.naming.trim().length > 0
    return true
  }
  const sampleName = (asin) => {
    const p = products.find((x) => x.asin === asin) || products[0] || { brand: 'Brand', asin: 'ASIN' }
    return f.naming
      .replaceAll('{brand}', p.brand || 'Brand').replaceAll('{asin}', asin || p.asin)
      .replaceAll('{type}', f.type).replaceAll('{theme}', f.themes[0] || 'General')
      .replaceAll('{match}', isManual ? (f.matches[0] || 'Exact') : (f.type === 'PAT' ? 'PAT' : 'Auto'))
  }
  const launch = () => {
    const tgt = { 'SP-Auto': 'Auto', 'SP-Manual': 'Manual', PAT: 'Product' }[f.type]
    const zero = { impr: 0, clk: 0, ctr: 0, cpc: 0, spend: 0, cvr: 0, orders: 0, asp: 0, aov: 0, sales: 0, units: 0, ntb: 0, atc: 0, acos: 0, roas: 0, cpa: 0 }
    const camps = f.products.map((asin, i) => {
      const p = products.find((x) => x.asin === asin) || {}
      return {
        id: 'CNEW' + (Date.now() + i).toString().slice(-7),
        name: sampleName(asin), asin, product: p.title || asin, profileId,
        state: 'Enabled', status: 'Enabled', campaignType: f.type, targetingType: tgt,
        adGroups: { active: groupCount, total: groupCount }, dailyBudget: Math.max(MIN_BUDGET, Number(f.dailyBudget)),
        actlBid: Math.max(MIN_BID, Number(f.maxBid) || 1), avlBid: round2(Math.max(MIN_BID, Number(f.maxBid) || 1) * 1.3),
        portfolio: 'New Launch', bidStrategy: 'Dynamic - down only',
        tag: 'NEW', startDate: f.startDate, endDate: f.endDate, ai: f.ai, ...zero,
      }
    })
    onLaunch(camps)
  }
  const renderStep = () => {
    if (step === 0) return (
      <>
        <div className="wiz-hint">Choose the products to advertise. One campaign is created per product.</div>
        <div className="prodlist">
          {products.map((p) => {
            const on = f.products.includes(p.asin)
            return (
              <div key={p.asin} className="prodrow" onClick={() => toggleIn('products', p.asin)}>
                <Check on={on} onClick={() => {}} />
                <div style={{ flex: 1 }}>{p.title}<div className="pr-asin">{p.asin} · {p.brand}</div></div>
              </div>
            )
          })}
        </div>
      </>
    )
    if (step === 1) return (
      <>
        <label className="fld">Daily budget ({currency}) per campaign<input type="number" autoFocus value={f.dailyBudget} onChange={(e) => set({ dailyBudget: e.target.value })} /></label>
        <div className="modal-note"><Icon name="bulb" size={14} />Applies to each of the {f.products.length} campaign{f.products.length === 1 ? '' : 's'} you're creating.</div>
      </>
    )
    if (step === 2) return (
      <div className="rb-grid2">
        <label className="fld">Start date<input type="date" value={f.startDate} onChange={(e) => set({ startDate: e.target.value })} /></label>
        <label className="fld">End date (optional)<input type="date" value={f.endDate} onChange={(e) => set({ endDate: e.target.value })} /></label>
      </div>
    )
    if (step === 3) return (
      <div className="opt-grid">
        {WIZ_TYPES.map((o) => (
          <div key={o.v} className={`opt-card ${f.type === o.v ? 'on' : ''}`} onClick={() => set({ type: o.v })}>
            <span className="opt-radio" /><div><div className="oc-title">{o.t}</div><div className="oc-sub">{o.s}</div></div>
          </div>
        ))}
      </div>
    )
    if (step === 4) return isManual ? (
      <>
        <div className="wiz-hint">Split into one ad group per match type.</div>
        <div className="chip-pick">{WIZ_MATCHES.map((m) => <span key={m} className={`chip ${f.matches.includes(m) ? 'on' : ''}`} onClick={() => toggleIn('matches', m)}>{m}</span>)}</div>
      </>
    ) : (
      <div className="modal-note"><Icon name="bulb" size={14} />{f.type === 'SP-Auto' ? 'Auto campaigns use a single auto-targeting ad group.' : 'PAT campaigns target products/categories in one ad group.'}</div>
    )
    if (step === 5) return (
      <>
        <div className="wiz-hint">Group targets by intent — creates a themed ad group for each.</div>
        <div className="opt-grid">
          {WIZ_THEMES.map((o) => {
            const on = f.themes.includes(o.v)
            return (
              <div key={o.v} className={`opt-card ${on ? 'on' : ''}`} onClick={() => toggleIn('themes', o.v)}>
                <Check on={on} onClick={() => {}} /><div><div className="oc-title">{o.v}</div><div className="oc-sub">{o.s}</div></div>
              </div>
            )
          })}
        </div>
      </>
    )
    if (step === 6) return (
      <>
        <label className="fld">Naming template<input value={f.naming} onChange={(e) => set({ naming: e.target.value })} /></label>
        <div style={{ marginBottom: 10 }}>{['{brand}', '{asin}', '{type}', '{theme}', '{match}'].map((v) => <span key={v} className="varchip" onClick={() => set({ naming: f.naming + v })}>{v}</span>)}</div>
        <div className="wiz-hint">Preview</div>
        <div className="namepreview">{sampleName(f.products[0])}</div>
      </>
    )
    if (step === 7) return (
      <>
        <label className="rb-check" style={{ marginBottom: 14 }}><Toggle on={f.ai} onClick={() => set({ ai: !f.ai })} /> Enable Campaign AI (automated bidding + pacing)</label>
        {f.ai ? (
          <>
            <div className="rb-grid2">
              <label className="fld">Optimize for<select value={f.aiTarget} onChange={(e) => set({ aiTarget: e.target.value })}><option>ACoS</option><option>ROAS</option></select></label>
              <label className="fld">Target {f.aiTarget}{f.aiTarget === 'ACoS' ? ' (%)' : ''}<input type="number" value={f.aiValue} onChange={(e) => set({ aiValue: e.target.value })} /></label>
            </div>
            <div className="rb-grid2">
              <label className="fld">Max bid ({currency})<input type="number" value={f.maxBid} onChange={(e) => set({ maxBid: e.target.value })} /></label>
              <label className="fld">Priority<select value={f.priority} onChange={(e) => set({ priority: e.target.value })}><option>Balanced</option><option>Spend</option><option>Performance</option></select></label>
            </div>
          </>
        ) : (
          <div className="modal-note"><Icon name="bulb" size={14} />Without AI, bids start at your max-bid default — attach Rules later for automation.</div>
        )}
      </>
    )
    return (
      <table className="review-tbl"><tbody>
        <tr><td>Products</td><td>{f.products.length} selected</td></tr>
        <tr><td>Daily budget</td><td>{currency}{f.dailyBudget} each</td></tr>
        <tr><td>Schedule</td><td>{f.startDate}{f.endDate ? ` → ${f.endDate}` : ' → no end date'}</td></tr>
        <tr><td>Type</td><td>{f.type}</td></tr>
        <tr><td>Ad groups</td><td>{groupCount} per campaign{isManual ? ` · ${f.matches.join(', ')}` : ''}</td></tr>
        <tr><td>Themes</td><td>{f.themes.join(', ')}</td></tr>
        <tr><td>Campaign AI</td><td>{f.ai ? `On · Target ${f.aiTarget} ${f.aiValue}${f.aiTarget === 'ACoS' ? '%' : ''} · Max bid ${currency}${f.maxBid}` : 'Off'}</td></tr>
        <tr><td>Example name</td><td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11.5 }}>{sampleName(f.products[0])}</td></tr>
      </tbody></table>
    )
  }
  return (
    <Modal width={640} title="Create Campaign" sub="Super Wizard — build one or many campaigns" onClose={onClose} confirmClose
      footer={<>
        {step > 0 && <Btn ghost onClick={() => setStep(step - 1)}>Back</Btn>}
        <div style={{ flex: 1 }} />
        <span className="muted" style={{ fontSize: 11 }}>Step {step + 1} of {steps.length}</span>
        {step < last
          ? <Btn primary disabled={!canNext()} onClick={() => setStep(step + 1)}>Next</Btn>
          : <Btn primary icon="check" onClick={launch}>Launch {f.products.length} campaign{f.products.length === 1 ? '' : 's'}</Btn>}
      </>}>
      <div className="wiz-steps">
        {steps.map((s, i) => (
          <span key={s} className={`wiz-step ${i === step ? 'on' : i < step ? 'done' : ''}`}><span className="num">{i < step ? '✓' : i + 1}</span>{s}</span>
        ))}
      </div>
      <div className="wiz-progress"><span style={{ width: ((step + 1) / steps.length * 100) + '%' }} /></div>
      <div className="wiz-body"><div className="wiz-title">{steps[step]}</div>{renderStep()}</div>
    </Modal>
  )
}

/* ---- Choose Campaign Type modal + single 5-step Create flow (live parity — §9.3) ---- */
const CC_TYPES = [
  { v: 'SP', t: 'Sponsored Products', s: 'Promote individual listings in shopping results and product pages.' },
  { v: 'SB', t: 'Sponsored Brands', s: 'Showcase your brand and product portfolio with custom creative.' },
  { v: 'SD', t: 'Sponsored Display', s: 'Reach audiences on and off Amazon with display placements.' },
  { v: 'STV', t: 'Sponsored TV', s: 'Streaming-TV ads that put your brand on the biggest screen.' },
]
const CC_SITES = ['Amazon and beyond', 'Amazon Business']

function ChooseCampaignType({ onClose, onContinue }) {
  const [sel, setSel] = useState(null) // 'SP'|'SB'|'SD'|'STV'|'super'
  const [sites, setSites] = useState(CC_SITES[0])
  return (
    <Modal width={620} title="Create Campaign" sub="Choose Campaign Type" onClose={onClose}
      footer={<>
        <div style={{ flex: 1 }} />
        <Btn ghost onClick={onClose}>Cancel</Btn>
        <Btn primary disabled={!sel} onClick={() => onContinue(sel, sites)}>Continue</Btn>
      </>}>
      <div className="opt-grid">
        {CC_TYPES.map((o) => (
          <div key={o.v} className={`opt-card ${sel === o.v ? 'on' : ''}`} onClick={() => setSel(o.v)}>
            <span className="opt-radio" /><div><div className="oc-title">{o.t}</div><div className="oc-sub">{o.s}</div></div>
          </div>
        ))}
        <div className={`opt-card ${sel === 'super' ? 'on' : ''}`} onClick={() => setSel('super')}>
          <span className="opt-radio" />
          <div style={{ flex: 1 }}>
            <div className="oc-title">Sponsored Products Super Wizard</div>
            <div className="oc-sub">Build one or many SP campaigns from a product list in a single pass.</div>
            {sel === 'super' && (
              <div className="chip-pick" style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                {CC_SITES.map((s) => <span key={s} className={`chip ${sites === s ? 'on' : ''}`} onClick={() => setSites(s)}>{s}</span>)}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

const AUTO_GROUPS = ['Close match', 'Loose match', 'Substitutes', 'Complements']
function SingleCampaignFlow({ type, products, profiles, profileId, onClose, onLaunch }) {
  const [step, setStep] = useState(0)
  const today = new Date().toISOString().slice(0, 10)
  const typeLabel = CC_TYPES.find((t) => t.v === type)?.t || type
  const [f, setF] = useState({
    profile: profileId, name: '', state: 'Enabled', dateMode: 'Any Date Range', startDate: today, endDate: '',
    dailyBudget: '50', sites: CC_SITES[0], targeting: 'Automatic',
    adgroupName: 'Ad Group 1', defaultBid: '1.20', ads: [],
    autoGroups: { 'Close match': true, 'Loose match': true, 'Substitutes': true, 'Complements': true },
    autoBids: { 'Close match': '1.20', 'Loose match': '0.95', 'Substitutes': '0.85', 'Complements': '0.75' },
    keywords: [], kwInput: '', kwMatch: 'Exact', kwBid: '1.20',
    negatives: [], negInput: '', negMatch: 'Negative Exact',
  })
  const set = (patch) => setF((x) => ({ ...x, ...patch }))
  const currency = symA(f.profile === 'all' ? 'us' : f.profile)
  const steps = ['Campaign', 'Adgroup and Ads', 'Targeting', 'Negative Targeting', 'Complete']
  const last = steps.length - 1
  const canNext = () => {
    if (step === 0) return f.name.trim().length > 0 && f.name.length <= 128 && Number(f.dailyBudget) > 0 && (f.dateMode === 'Any Date Range' || !!f.startDate)
    if (step === 1) return f.adgroupName.trim().length > 0 && f.ads.length > 0
    // Only SP campaigns have an Automatic mode — every other type must add ≥1 keyword/target.
    if (step === 2) return (type === 'SP' && f.targeting === 'Automatic') ? AUTO_GROUPS.some((g) => f.autoGroups[g]) : f.keywords.length > 0
    return true
  }
  const addKw = () => { const t = f.kwInput.trim(); if (!t) return; set({ keywords: [...f.keywords, { text: t, match: f.kwMatch, bid: f.kwBid }], kwInput: '' }) }
  const addNeg = () => { const t = f.negInput.trim(); if (!t) return; set({ negatives: [...f.negatives, { text: t, match: f.negMatch }], negInput: '' }) }
  const launch = () => {
    const zero = { impr: 0, clk: 0, ctr: 0, cpc: 0, spend: 0, cvr: 0, orders: 0, asp: 0, aov: 0, sales: 0, units: 0, ntb: 0, atc: 0, acos: 0, roas: 0, cpa: 0 }
    const campaignType = type === 'SP' ? (f.targeting === 'Automatic' ? 'SP-Auto' : 'SP-Manual') : type === 'SD' ? 'SD-Product' : type
    const targetingType = type === 'SP' ? f.targeting : type === 'SD' ? 'Product' : 'Manual'
    const firstAd = products.find((p) => p.asin === f.ads[0]) || {}
    onLaunch([{
      id: 'CNEW' + Date.now().toString().slice(-7),
      name: f.name.trim(), asin: f.ads[0], product: firstAd.title || f.ads[0], profileId: f.profile === 'all' ? 'us' : f.profile,
      state: f.state, status: f.state, campaignType, targetingType,
      adGroups: { active: 1, total: 1 }, dailyBudget: Math.max(MIN_BUDGET, Number(f.dailyBudget)),
      actlBid: Math.max(MIN_BID, Number(f.defaultBid) || 1), avlBid: round2(Math.max(MIN_BID, Number(f.defaultBid) || 1) * 1.3),
      portfolio: 'New Launch', bidStrategy: 'Dynamic - down only', tag: 'NEW',
      startDate: f.dateMode === 'Any Date Range' ? today : f.startDate,
      endDate: f.dateMode === 'Any Date Range' ? '' : f.endDate, ...zero,
    }])
  }
  const renderStep = () => {
    if (step === 0) return (
      <>
        <div className="rb-grid2">
          <label className="fld">Profile<select value={f.profile} onChange={(e) => set({ profile: e.target.value })}>{profiles.map((p) => <option key={p.id} value={p.id}>{p.market}</option>)}</select></label>
          <label className="fld">Campaign State<select value={f.state} onChange={(e) => set({ state: e.target.value })}><option>Enabled</option><option>Paused</option></select></label>
        </div>
        <label className="fld">Campaign Name<input autoFocus maxLength={128} value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder={`${typeLabel} campaign name (max 128 characters)`} /></label>
        <div className="rb-grid2">
          <label className="fld">Date Range<select value={f.dateMode} onChange={(e) => set({ dateMode: e.target.value })}><option>Any Date Range</option><option>Select a Date Range</option></select></label>
          <label className="fld">Daily Budget ({currency})<input type="number" value={f.dailyBudget} onChange={(e) => set({ dailyBudget: e.target.value })} /></label>
        </div>
        {f.dateMode === 'Select a Date Range' && (
          <div className="rb-grid2">
            <label className="fld">Start date<input type="date" value={f.startDate} onChange={(e) => set({ startDate: e.target.value })} /></label>
            <label className="fld">End date (optional)<input type="date" value={f.endDate} onChange={(e) => set({ endDate: e.target.value })} /></label>
          </div>
        )}
        <div className="rb-grid2">
          <label className="fld">Sites<select value={f.sites} onChange={(e) => set({ sites: e.target.value })}>{CC_SITES.map((s) => <option key={s}>{s}</option>)}</select></label>
          {type === 'SP' && <label className="fld">Targeting<select value={f.targeting} onChange={(e) => set({ targeting: e.target.value })}><option>Automatic</option><option>Manual</option></select></label>}
        </div>
      </>
    )
    if (step === 1) return (
      <>
        <div className="rb-grid2">
          <label className="fld">Adgroup Name<input value={f.adgroupName} onChange={(e) => set({ adgroupName: e.target.value })} /></label>
          <label className="fld">Default Bid ({currency})<input type="number" value={f.defaultBid} onChange={(e) => set({ defaultBid: e.target.value })} /></label>
        </div>
        <div className="wiz-hint">Ads — choose the products to advertise in this adgroup.</div>
        <div className="prodlist">
          {products.map((p) => {
            const on = f.ads.includes(p.asin)
            return (
              <div key={p.asin} className="prodrow" onClick={() => set({ ads: on ? f.ads.filter((a) => a !== p.asin) : [...f.ads, p.asin] })}>
                <Check on={on} onClick={() => {}} />
                <div style={{ flex: 1 }}>{p.title}<div className="pr-asin">{p.asin} · {p.brand}</div></div>
              </div>
            )
          })}
        </div>
      </>
    )
    if (step === 2) return f.targeting === 'Automatic' && type === 'SP' ? (
      <>
        <div className="wiz-hint">Automatic targeting groups — enable and bid per match group.</div>
        {AUTO_GROUPS.map((g) => (
          <div key={g} className="rb-grid2" style={{ alignItems: 'center', marginBottom: 6 }}>
            <label className="rb-check"><Toggle on={f.autoGroups[g]} onClick={() => set({ autoGroups: { ...f.autoGroups, [g]: !f.autoGroups[g] } })} /> {g}</label>
            <label className="fld">Bid ({currency})<input type="number" disabled={!f.autoGroups[g]} value={f.autoBids[g]} onChange={(e) => set({ autoBids: { ...f.autoBids, [g]: e.target.value } })} /></label>
          </div>
        ))}
      </>
    ) : (
      <>
        <div className="wiz-hint">{type === 'SP' ? 'Add keywords with match type and bid.' : `Add ${typeLabel} targets (keywords) with bid.`}</div>
        <div className="rb-grid2" style={{ gridTemplateColumns: '2fr 1fr 1fr auto', display: 'grid', gap: 8 }}>
          <input placeholder="keyword" value={f.kwInput} onChange={(e) => set({ kwInput: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addKw()} />
          <select value={f.kwMatch} onChange={(e) => set({ kwMatch: e.target.value })}><option>Exact</option><option>Phrase</option><option>Broad</option></select>
          <input type="number" value={f.kwBid} onChange={(e) => set({ kwBid: e.target.value })} />
          <Btn onClick={addKw}>Add</Btn>
        </div>
        <div style={{ marginTop: 10 }}>
          {f.keywords.map((k, i) => (
            <span key={i} className="chip on" style={{ marginRight: 6, marginBottom: 6 }} onClick={() => set({ keywords: f.keywords.filter((_, j) => j !== i) })}>
              {k.text} · {k.match} · {currency}{k.bid} ✕
            </span>
          ))}
          {!f.keywords.length && <div className="modal-note"><Icon name="bulb" size={14} />No keywords yet — add at least one to continue.</div>}
        </div>
      </>
    )
    if (step === 3) return (
      <>
        <div className="wiz-hint">Negative targeting (optional) — block irrelevant queries.</div>
        <div className="rb-grid2" style={{ gridTemplateColumns: '2fr 1fr auto', display: 'grid', gap: 8 }}>
          <input placeholder="negative keyword" value={f.negInput} onChange={(e) => set({ negInput: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addNeg()} />
          <select value={f.negMatch} onChange={(e) => set({ negMatch: e.target.value })}><option>Negative Exact</option><option>Negative Phrase</option></select>
          <Btn onClick={addNeg}>Add</Btn>
        </div>
        <div style={{ marginTop: 10 }}>
          {f.negatives.map((k, i) => (
            <span key={i} className="chip on" style={{ marginRight: 6, marginBottom: 6 }} onClick={() => set({ negatives: f.negatives.filter((_, j) => j !== i) })}>
              {k.text} · {k.match} ✕
            </span>
          ))}
          {!f.negatives.length && <div className="modal-note"><Icon name="bulb" size={14} />None added — you can skip this step.</div>}
        </div>
      </>
    )
    return (
      <table className="review-tbl"><tbody>
        <tr><td>Type</td><td>{typeLabel}</td></tr>
        <tr><td>Campaign</td><td>{f.name} · {f.state}</td></tr>
        <tr><td>Profile</td><td>{profiles.find((p) => p.id === f.profile)?.market || f.profile}</td></tr>
        <tr><td>Schedule</td><td>{f.dateMode === 'Any Date Range' ? 'Any date range' : `${f.startDate}${f.endDate ? ` → ${f.endDate}` : ' → no end date'}`}</td></tr>
        <tr><td>Daily Budget</td><td>{currency}{f.dailyBudget}</td></tr>
        <tr><td>Sites</td><td>{f.sites}</td></tr>
        <tr><td>Adgroup</td><td>{f.adgroupName} · default bid {currency}{f.defaultBid} · {f.ads.length} ad{f.ads.length === 1 ? '' : 's'}</td></tr>
        <tr><td>Targeting</td><td>{type === 'SP' && f.targeting === 'Automatic' ? AUTO_GROUPS.filter((g) => f.autoGroups[g]).join(', ') : `${f.keywords.length} keyword${f.keywords.length === 1 ? '' : 's'}`}</td></tr>
        <tr><td>Negatives</td><td>{f.negatives.length ? f.negatives.map((n) => n.text).join(', ') : 'None'}</td></tr>
      </tbody></table>
    )
  }
  return (
    <Modal width={640} title={`Create Campaign — ${typeLabel}`} sub="Single campaign flow" onClose={onClose} confirmClose
      footer={<>
        {step > 0 && <Btn ghost onClick={() => setStep(step - 1)}>Previous</Btn>}
        <div style={{ flex: 1 }} />
        <span className="muted" style={{ fontSize: 11 }}>Step {step + 1} of {steps.length}</span>
        {step < last
          ? <Btn primary disabled={!canNext()} onClick={() => setStep(step + 1)}>Next</Btn>
          : <Btn primary icon="check" onClick={launch}>Launch campaign</Btn>}
      </>}>
      <div className="wiz-steps">
        {steps.map((s, i) => (
          <span key={s} className={`wiz-step ${i === step ? 'on' : i < step ? 'done' : ''}`}><span className="num">{i < step ? '✓' : i + 1}</span>{s}</span>
        ))}
      </div>
      <div className="wiz-progress"><span style={{ width: ((step + 1) / steps.length * 100) + '%' }} /></div>
      <div className="wiz-body"><div className="wiz-title">{steps[step]}</div>{renderStep()}</div>
    </Modal>
  )
}

/* ---- Edit a user-created campaign (lightweight; the wizard is for creation) ---- */
const EC_TYPES = ['SP-Auto', 'SP-Manual', 'PAT', 'SB', 'SBV', 'SD-Product', 'SD-Audience', 'STV']
const EC_BIDSTRAT = ['Dynamic - down only', 'Dynamic - up & down', 'Fixed bids']
function EditCampaignModal({ camp, currency = '$', onClose, onSave }) {
  const [f, setF] = useState({
    name: camp.name, dailyBudget: String(camp.dailyBudget ?? ''), state: camp.state || 'Enabled',
    campaignType: camp.campaignType || 'SP-Auto', bidStrategy: camp.bidStrategy || 'Dynamic - down only',
  })
  const upd = (patch) => setF((x) => ({ ...x, ...patch }))
  const canSave = f.name.trim() && Number(f.dailyBudget) > 0
  const save = () => onSave({
    id: camp.id, name: f.name.trim(), dailyBudget: Number(f.dailyBudget),
    state: f.state, status: f.state, campaignType: f.campaignType, bidStrategy: f.bidStrategy,
  })
  return (
    <Modal width={520} title="Edit Campaign" sub="Update settings for this campaign" onClose={onClose}
      footer={<><Btn ghost onClick={onClose}>Cancel</Btn><div style={{ flex: 1 }} /><Btn primary disabled={!canSave} icon="check" onClick={save}>Save changes</Btn></>}>
      <label className="fld">Campaign name<input autoFocus value={f.name} onChange={(e) => upd({ name: e.target.value })} /></label>
      <div className="rb-grid2">
        <label className="fld">Daily budget ({currency})<input type="number" value={f.dailyBudget} onChange={(e) => upd({ dailyBudget: e.target.value })} /></label>
        <label className="fld">State<select value={f.state} onChange={(e) => upd({ state: e.target.value })}>{['Enabled', 'Paused', 'Archived'].map((s) => <option key={s}>{s}</option>)}</select></label>
      </div>
      <div className="rb-grid2">
        <label className="fld">Type<select value={f.campaignType} onChange={(e) => upd({ campaignType: e.target.value })}>{EC_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
        <label className="fld">Bid strategy<select value={f.bidStrategy} onChange={(e) => upd({ bidStrategy: e.target.value })}>{EC_BIDSTRAT.map((b) => <option key={b}>{b}</option>)}</select></label>
      </div>
    </Modal>
  )
}

const ZERO_METRICS = { impr: 0, clk: 0, ctr: 0, spend: 0, sales: 0, orders: 0, acos: 0, roas: 0 }
const MATCH_TYPES = ['Broad', 'Phrase', 'Exact']

function NewAdGroupModal({ camps, defaultCampId, currency = '$', onClose, onCreate }) {
  const [f, setF] = useState({ name: '', campaignId: defaultCampId || (camps[0] && camps[0].id) || '', defaultBid: '0.75', state: 'Enabled' })
  const upd = (patch) => setF((x) => ({ ...x, ...patch }))
  const canSave = f.name.trim() && f.campaignId && Number(f.defaultBid) > 0
  const save = () => { const c = camps.find((x) => x.id === f.campaignId) || {}; onCreate({ name: f.name.trim(), campaignId: f.campaignId, campaign: c.name || '', profileId: c.profileId, defaultBid: Number(f.defaultBid), state: f.state }) }
  return (
    <Modal width={520} title="New Ad Group" sub="Add an ad group to a campaign" onClose={onClose}
      footer={<><Btn ghost onClick={onClose}>Cancel</Btn><div style={{ flex: 1 }} /><Btn primary disabled={!canSave} icon="plus" onClick={save}>Create ad group</Btn></>}>
      <label className="fld">Ad group name<input autoFocus value={f.name} onChange={(e) => upd({ name: e.target.value })} placeholder="e.g. Brand Defense · Exact" /></label>
      <label className="fld">Campaign<select value={f.campaignId} onChange={(e) => upd({ campaignId: e.target.value })}>{camps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <div className="rb-grid2">
        <label className="fld">Default bid ({currency})<input type="number" step="0.05" value={f.defaultBid} onChange={(e) => upd({ defaultBid: e.target.value })} /></label>
        <label className="fld">State<select value={f.state} onChange={(e) => upd({ state: e.target.value })}>{['Enabled', 'Paused'].map((s) => <option key={s}>{s}</option>)}</select></label>
      </div>
    </Modal>
  )
}

function AddKeywordsModal({ camps, currency = '$', onClose, onCreate }) {
  const [f, setF] = useState({ text: '', matchType: 'Exact', bid: '0.85', campaignId: (camps[0] && camps[0].id) || '' })
  const upd = (patch) => setF((x) => ({ ...x, ...patch }))
  const parsed = f.text.split('\n').map((s) => s.trim()).filter(Boolean)
  const canSave = parsed.length > 0 && f.campaignId && Number(f.bid) > 0
  const save = () => { const c = camps.find((x) => x.id === f.campaignId) || {}; onCreate(parsed.map((kw) => ({ keyword: kw, matchType: f.matchType, bid: Number(f.bid), campaignId: f.campaignId, campaign: c.name || '', profileId: c.profileId }))) }
  return (
    <Modal width={540} title="Add Keywords" sub="Add one or more keyword targets" onClose={onClose}
      footer={<><Btn ghost onClick={onClose}>Cancel</Btn><span className="muted" style={{ fontSize: 12 }}>{parsed.length} keyword{parsed.length === 1 ? '' : 's'}</span><div style={{ flex: 1 }} /><Btn primary disabled={!canSave} icon="plus" onClick={save}>Add keyword{parsed.length === 1 ? '' : 's'}</Btn></>}>
      <label className="fld">Keywords (one per line)<textarea autoFocus rows={5} value={f.text} onChange={(e) => upd({ text: e.target.value })} placeholder={'grain free dog food\nlarge breed puppy food'} style={{ resize: 'vertical', font: 'inherit' }} /></label>
      <label className="fld">Campaign<select value={f.campaignId} onChange={(e) => upd({ campaignId: e.target.value })}>{camps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <div className="rb-grid2">
        <label className="fld">Match type<select value={f.matchType} onChange={(e) => upd({ matchType: e.target.value })}>{MATCH_TYPES.map((m) => <option key={m}>{m}</option>)}</select></label>
        <label className="fld">Bid ({currency})<input type="number" step="0.05" value={f.bid} onChange={(e) => upd({ bid: e.target.value })} /></label>
      </div>
    </Modal>
  )
}

function TrackKeywordModal({ onClose, onCreate }) {
  const [f, setF] = useState({ keyword: '', searchVolume: '', topCompetitor: '' })
  const upd = (patch) => setF((x) => ({ ...x, ...patch }))
  const canSave = f.keyword.trim()
  const save = () => onCreate({ keyword: f.keyword.trim(), searchVolume: Number(f.searchVolume) || 0, topCompetitor: f.topCompetitor.trim() || '—' })
  return (
    <Modal width={500} title="Track Keyword" sub="Monitor paid + organic share of voice" onClose={onClose}
      footer={<><Btn ghost onClick={onClose}>Cancel</Btn><div style={{ flex: 1 }} /><Btn primary disabled={!canSave} icon="plus" onClick={save}>Track keyword</Btn></>}>
      <label className="fld">Keyword<input autoFocus value={f.keyword} onChange={(e) => upd({ keyword: e.target.value })} placeholder="e.g. grain free dog food" /></label>
      <div className="rb-grid2">
        <label className="fld">Est. monthly search volume<input type="number" value={f.searchVolume} onChange={(e) => upd({ searchVolume: e.target.value })} placeholder="optional" /></label>
        <label className="fld">Top competitor<input value={f.topCompetitor} onChange={(e) => upd({ topCompetitor: e.target.value })} placeholder="optional" /></label>
      </div>
    </Modal>
  )
}

function KpiRow({ rows, prev }) {
  // SA-R7: when the row set spans currencies, aggregate money in USD estimates.
  const mixed = adsMixedCur(rows)
  const toUsd = (rs) => (mixed ? rs.map((r) => ({ ...r, spend: (r.spend || 0) * fxUSD(r.profileId), sales: (r.sales || 0) * fxUSD(r.profileId) })) : rs)
  const a = aggregate(toUsd(rows))
  const prevRows = (prev || []).filter(Boolean)
  const p = prevRows.length ? aggregate(toUsd(prevRows)) : null
  const est = (v) => (mixed ? `${v} (USD est.)` : v)
  const dl = (cur, prv) => (p && prv ? ((cur - prv) / Math.abs(prv)) * 100 : undefined)
  return (
    <KpiGrid>
      <Kpi label="Impressions" value={compact(a.impr)} delta={dl(a.impr, p?.impr)} />
      <Kpi label="Clicks" value={compact(a.clk)} delta={dl(a.clk, p?.clk)} />
      <Kpi label="CTR" value={pct(a.ctr, 2)} delta={dl(a.ctr, p?.ctr)} />
      <Kpi label="Spend" value={est(money(a.spend))} delta={dl(a.spend, p?.spend)} deltaGood={(dl(a.spend, p?.spend) || 0) <= 0} />
      <Kpi label="Sales" value={est(money(a.sales))} delta={dl(a.sales, p?.sales)} />
      <Kpi label="ACoS" value={pct(a.acos)} delta={dl(a.acos, p?.acos)} deltaGood={(dl(a.acos, p?.acos) || 0) <= 0} />
      <Kpi label="ROAS" value={dec2(a.roas)} delta={dl(a.roas, p?.roas)} />
      <Kpi label="Orders" value={compact(a.orders)} delta={dl(a.orders, p?.orders)} />
    </KpiGrid>
  )
}

/* ============================ CAMPAIGNS ============================ */
export function Campaigns() {
  const { profileId, rangeResolved, profiles } = useApp()
  const loc = useLocation()
  const urlTag = new URLSearchParams(loc.search || '').get('tag')
  const [created, setCreated] = useState(() => createdStore.get('campaigns'))
  const allCampaigns = useMemo(() => [...created, ...ALL_CAMPAIGNS], [created])
  const base = useProfileFilter(allCampaigns)
  const [overrides, setOverrides] = usePersistentOverrides('ads-campaigns')
  // E1 Tagging: effective campaign-tag list (seeds + chedits overrides + user tags) →
  // derived tag chip in the name cell and the ?tag= drill filter from the Tagging page.
  const [campTagOv] = usePersistentOverrides('tags-campaign')
  const campTagList = useMemo(() => tagMergedList(createdStore.get('tags-campaign'), campaignTags, campTagOv), [campTagOv])
  const derivedTagOf = useMemo(() => {
    const cache = {}
    return (c) => {
      if (cache[c.id] !== undefined) return cache[c.id]
      const t = campTagList.find((t) => tagHasMember(t, c.id, c.name))
      cache[c.id] = t ? t.name : null
      return cache[c.id]
    }
  }, [campTagList])
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState(() => loadFilterModel('ads-campaigns'))
  const [sel, setSel] = useState(new Set())
  useEffect(() => { setSel(new Set()) }, [profileId, urlTag]) // SA-R1: selection ids belong to the previous profile's rows

  const [modal, setModal] = useState(null) // 'bid' | 'budget' | 'tag' | 'daypart' | 'rule'
  const [wizard, setWizard] = useState(false)
  const [chooser, setChooser] = useState(false)
  const [singleType, setSingleType] = useState(null) // 'SP' | 'SB' | 'SD' | 'STV'
  const [editCamp, setEditCamp] = useState(null)
  const allRules = useMemo(() => [...createdStore.get('rules'), ...RULES], [])
  const onLaunch = (camps) => { const next = [...camps, ...created]; createdStore.set('campaigns', next); setCreated(next); setWizard(false); setSingleType(null); toast(`Launched ${camps.length} campaign${camps.length === 1 ? '' : 's'} — added to the grid`) }
  const onChooseType = (sel) => { setChooser(false); if (sel === 'super') setWizard(true); else setSingleType(sel) }
  const saveCampaign = (upd) => {
    const next = created.map((c) => c.id === upd.id ? { ...c, ...upd } : c)
    createdStore.set('campaigns', next); setCreated(next)
    setOverrides((o) => { const n = { ...o }; delete n[upd.id]; return n }) // edited values win over any inline override
    setEditCamp(null); toast(`Campaign “${upd.name}” updated`)
  }
  const duplicateCampaign = (c) => {
    const copy = { ...c, id: 'CNEW' + Date.now().toString().slice(-7), name: c.name + ' (copy)', state: 'Paused', status: 'Paused', tag: 'NEW' }
    const next = [copy, ...created]; createdStore.set('campaigns', next); setCreated(next)
    toast(`Duplicated “${c.name}”`)
  }
  const createdById = Object.fromEntries(created.map((c) => [c.id, c]))

  // Deterministic mock placement per campaign (live Pacvue "Placement" dimension — §9.5)
  const PLACEMENTS = ['Top of Search', 'Product Pages', 'Rest of Search']
  const placementOf = (id) => { let h = 0; const s = String(id); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return PLACEMENTS[h % 3] }
  const withEdits = base.map((c) => (overrides[c.id] ? { ...c, ...overrides[c.id], placement: placementOf(c.id) } : { ...c, placement: placementOf(c.id) }))
  const { rows: data, prev } = useMemo(() => scaleForRange(withEdits, rangeResolved), [withEdits, rangeResolved])
  const searched = data.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
  // E1: ?tag=<name> scopes the grid to that tag's members (derived rule matches + manual assignments)
  const urlTagObj = urlTag ? campTagList.find((t) => t.name === urlTag) : null
  const tagScoped = urlTag ? (urlTagObj ? searched.filter((c) => tagHasMember(urlTagObj, c.id, c.name)) : []) : searched
  const filtered = applyFilters(tagScoped, filters, CAMPAIGN_FIELDS)
  const prevFiltered = filtered.map((r) => prev[r.id])

  const merge = (id, patch) => setOverrides((o) => ({ ...o, [id]: { ...o[id], ...patch } }))
  const mergeMany = (ids, fn) => setOverrides((o) => { const n = { ...o }; ids.forEach((id) => { n[id] = { ...n[id], ...fn(id) } }); return n })
  const statusFor = (st) => (st === 'Enabled' ? 'Enabled' : st) // Paused / Archived pass through
  const setState = (id, st) => merge(id, { state: st, status: statusFor(st) })
  const byId = Object.fromEntries(data.map((c) => [c.id, c]))

  const selIds = () => [...sel].filter((id) => byId[id]) // SA-R1: skip ids no longer in the visible row set
  const bulkState = (st) => { const ids = selIds(); mergeMany(ids, () => ({ state: st, status: statusFor(st) })); setSel(new Set()); toast(`${ids.length} campaign${ids.length === 1 ? '' : 's'} ${st.toLowerCase()}`) }
  const applyBulkBid = (mode, amt) => { const ids = selIds(); mergeMany(ids, (id) => ({ actlBid: applyBidOp(byId[id].actlBid, byId[id].avlBid, mode, amt) })); setSel(new Set()); setModal(null); toast(`Updated bids on ${ids.length} campaign${ids.length === 1 ? '' : 's'} — all succeeded`) }
  const applyBulkBudget = (mode, amt) => { const ids = selIds(); mergeMany(ids, (id) => ({ dailyBudget: applyBudgetOp(byId[id].dailyBudget, mode, amt) })); setSel(new Set()); setModal(null); toast(`Updated daily budget on ${ids.length} campaign${ids.length === 1 ? '' : 's'}`) }
  const applyBulkTag = (tag) => { const ids = selIds(); mergeMany(ids, () => ({ tag })); setSel(new Set()); setModal(null); toast(`Tagged ${ids.length} campaign${ids.length === 1 ? '' : 's'} “${tag}”`) }
  const applyBulkDaypart = (sched) => { const ids = selIds(); mergeMany(ids, () => ({ daypart: sched })); setSel(new Set()); setModal(null); toast(`Dayparting “${sched}” applied to ${ids.length} campaign${ids.length === 1 ? '' : 's'}`) }
  const applyBulkRule = (rule) => { const ids = selIds(); mergeMany(ids, () => ({ appliedRule: rule.name })); setSel(new Set()); setModal(null); toast(`Rule “${rule.name}” applied to ${ids.length} campaign${ids.length === 1 ? '' : 's'}`) }

  const toggleSel = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSel((s) => (s.size === filtered.length ? new Set() : new Set(filtered.map((r) => r.id))))

  const columns = [
    { key: 'name', label: 'Campaign', sticky: true, width: 320, sortVal: (r) => r.name, render: (r) => (
      <div className="namecell">
        <div className="nc-top"><Link className="celllink" to={`/ads/adgroups?camp=${r.id}`} title="Drill into ad groups">{r.name}</Link>{(r.tag || derivedTagOf(r)) && <span className="tag" title={r.tag ? 'Tag (manual)' : 'Tag (derived from Match Tag Rule)'}>{r.tag || derivedTagOf(r)}</span>}{r.daypart && <span className="tag" title={`Dayparting: ${r.daypart}`}><Icon name="clock" size={10} /></span>}{r.appliedRule && <span className="tag" title={`Rule: ${r.appliedRule}`}><Icon name="sliders" size={10} /></span>}</div>
        <small>{r.profileId.toUpperCase()} · {r.product?.split('—')[0]}</small>
      </div>) },
    { key: 'state', label: 'State', render: (r) => <StateSelect value={r.state} onChange={(st) => setState(r.id, st)} /> },
    { key: 'status', label: 'Status', render: (r) => <Pill>{r.status}</Pill> },
    { key: 'campaignType', label: 'Type', render: (r) => <span className={`pill ${typeTone(r.campaignType)}`} style={{ borderRadius: 5 }}>{r.campaignType}</span> },
    { key: 'adGroups', label: 'Ad Groups', num: true, sort: false, render: (r) => <span className="muted">{r.adGroups.active}/{r.adGroups.total}</span> },
    { key: 'dailyBudget', label: 'Daily Budget', num: true, foot: adsMoneyFoot('dailyBudget'), render: (r) => (
      <EditableNum value={r.dailyBudget} prefix={symA(r.profileId)} dec={0} min={MIN_BUDGET} onCommit={(v) => { merge(r.id, { dailyBudget: v }); toast(`Daily budget set to ${cur(v, symA(r.profileId), 0)}`) }} />) },
    { key: 'bid', label: 'Bid (Act/Avl)', num: true, sort: false, render: (r) => <span className="muted">{r.actlBid} / {r.avlBid}</span> },
    { key: 'impr', label: 'Impr.', num: true, delta: true, foot: (rs) => compact(aggregate(rs).impr), render: (r) => compact(r.impr) },
    { key: 'clk', label: 'Clicks', num: true, delta: true, foot: (rs) => int(aggregate(rs).clk), render: (r) => int(r.clk) },
    { key: 'ctr', label: 'CTR', num: true, foot: (rs) => pct(aggregate(rs).ctr, 2), render: (r) => pct(r.ctr, 2) },
    { key: 'spend', label: 'Spend', num: true, delta: true, foot: adsMoneyFoot('spend'), render: (r) => cur(r.spend, symA(r.profileId)) },
    { key: 'cpc', label: 'CPC', num: true, foot: (rs) => cur(aggregate(rs).cpc, symOf(rs), 2), render: (r) => cur(r.cpc, symA(r.profileId), 2) },
    { key: 'sales', label: 'Sales', num: true, delta: true, foot: adsMoneyFoot('sales'), render: (r) => cur(r.sales, symA(r.profileId)) },
    { key: 'orders', label: 'Orders', num: true, delta: true, foot: (rs) => int(aggregate(rs).orders), render: (r) => int(r.orders) },
    { key: 'cvr', label: 'CVR', num: true, foot: (rs) => pct(aggregate(rs).cvr), render: (r) => pct(r.cvr) },
    { key: 'acos', label: 'ACoS', num: true, delta: true, foot: (rs) => pct(aggregate(rs).acos), render: (r) => <span style={{ color: r.acos > 40 ? 'var(--red)' : r.acos < 25 ? 'var(--green)' : 'inherit', fontWeight: 600 }}>{pct(r.acos)}</span> },
    { key: 'roas', label: 'ROAS', num: true, delta: true, foot: (rs) => dec2(aggregate(rs).roas), render: (r) => dec2(r.roas) },
    { key: 'ntb', label: 'NTB Orders', num: true, foot: (rs) => int(sumKey('ntb')(rs)), render: (r) => int(r.ntb) },
    { key: 'act', label: '', sort: false, render: (r) => createdById[r.id]
      ? <span style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}><Btn sm ghost icon="edit" onClick={() => setEditCamp(createdById[r.id])} /><Btn sm ghost icon="copy" onClick={() => duplicateCampaign(createdById[r.id])} /></span>
      : <span className="muted" style={{ fontSize: 11 }}>—</span> },
  ]

  // Preset names match live Pacvue (§9.1): Target ACOS View · Performance · Default Plan · Custom Columns
  const presets = {
    'Target ACOS View': ['name', 'state', 'dailyBudget', 'spend', 'sales', 'acos', 'roas', 'cpc', 'orders', 'act'],
    Performance: ['name', 'state', 'impr', 'clk', 'ctr', 'spend', 'cpc', 'sales', 'orders', 'cvr', 'acos', 'roas', 'act'],
    'Default Plan': ['name', 'state', 'status', 'campaignType', 'adGroups', 'dailyBudget', 'bid', 'impr', 'clk', 'ctr', 'spend', 'cpc', 'sales', 'orders', 'cvr', 'acos', 'roas', 'ntb', 'act'],
    'Custom Columns': ['name', 'state', 'campaignType', 'dailyBudget', 'spend', 'sales', 'acos', 'roas', 'act'],
  }
  // Live Pacvue dimensions (§9.5): Placement · Campaign Type · Campaign Type (Drill-down)
  const dims = [
    { key: 'placement', label: 'Placement' },
    { key: 'campaignType', label: 'Campaign Type' },
    { key: 'campaignType:drill', field: 'campaignType', label: 'Campaign Type (Drill-down)', drill: true },
    { key: 'portfolio', label: 'Portfolio' },
    { key: 'targetingType', label: 'Targeting' },
    { key: 'profileId', label: 'Profile' },
  ]

  return (
    <>
      <AdsHead title="Campaigns" sub={`${filtered.length} campaigns · ${rangeResolved.label} · Sponsored Products, Brands & Display`}>
        <ExportMenu name="campaigns" fields={CAMPAIGN_FIELDS} rows={filtered} />
        <Btn icon="plus" primary onClick={() => setChooser(true)}>Create Campaign</Btn>
      </AdsHead>
      {urlTag && (
        <div className="drillbar">
          <Link className="celllink" to="/ads/tagging"><Icon name="chevDown" size={13} style={{ transform: 'rotate(90deg)' }} /> Back to Tagging</Link>
          <span className="muted">Campaigns tagged</span><b>{urlTag}</b>
          <span className="tag"><Icon name="tag" size={10} /> {filtered.length}</span>
          {!urlTagObj && <span className="muted">— tag not found; showing no rows</span>}
        </div>
      )}
      <KpiRow rows={filtered} prev={prevFiltered} />

      {sel.size > 0 && (
        <div className="bulkbar">
          <span className="sel">{sel.size} selected</span>
          <Btn sm icon="play" onClick={() => bulkState('Enabled')}>Enable</Btn>
          <Btn sm icon="pause" onClick={() => bulkState('Paused')}>Pause</Btn>
          <Btn sm icon="box" onClick={() => bulkState('Archived')}>Archive</Btn>
          <Btn sm icon="target" onClick={() => setModal('bid')}>Adjust Bids</Btn>
          <Btn sm icon="wallet" onClick={() => setModal('budget')}>Adjust Budget</Btn>
          <Btn sm icon="clock" onClick={() => setModal('daypart')}>Dayparting</Btn>
          <Btn sm icon="sliders" onClick={() => setModal('rule')}>Apply Rule</Btn>
          <Btn sm icon="tag" onClick={() => setModal('tag')}>Tag</Btn>
          <div style={{ flex: 1 }} />
          <Btn sm ghost onClick={() => setSel(new Set())}>Clear</Btn>
        </div>
      )}
      {modal === 'bid' && <BulkBidModal count={sel.size} currency={symA(profileId)} suggestedLabel="available bid" onApply={applyBulkBid} onClose={() => setModal(null)} />}
      {modal === 'budget' && <BulkBudgetModal count={sel.size} currency={symA(profileId)} onApply={applyBulkBudget} onClose={() => setModal(null)} />}
      {modal === 'tag' && <BulkTagModal count={sel.size} onApply={applyBulkTag} onClose={() => setModal(null)} />}
      {modal === 'daypart' && <BulkDaypartModal count={sel.size} onApply={applyBulkDaypart} onClose={() => setModal(null)} />}
      {modal === 'rule' && <ApplyRuleModal count={sel.size} rules={allRules} onApply={applyBulkRule} onClose={() => setModal(null)} />}
      {chooser && <ChooseCampaignType onClose={() => setChooser(false)} onContinue={onChooseType} />}
      {wizard && <CreateCampaignWizard products={getProductList()} profileId={profileId === 'all' ? 'us' : profileId} onClose={() => setWizard(false)} onLaunch={onLaunch} />}
      {singleType && <SingleCampaignFlow type={singleType} products={getProductList()} profiles={profiles} profileId={profileId} onClose={() => setSingleType(null)} onLaunch={onLaunch} />}
      {editCamp && <EditCampaignModal camp={editCamp} currency={symA(editCamp.profileId)} onClose={() => setEditCamp(null)} onSave={saveCampaign} />}

      <DataGrid
        id="ads-campaigns"
        columns={columns}
        rows={filtered}
        initialSort={{ key: 'spend', dir: 'desc' }}
        presets={presets}
        defaultPreset="Default Plan"
        dimensions={dims}
        totals
        compare
        comparePrev={prev}
        compareDisabled={rangeResolved.label === 'All time'}
        selectable
        selected={sel}
        onToggle={toggleSel}
        onToggleAll={toggleAll}
        toolbarLeft={<>
          <SearchBox value={q} onChange={setQ} placeholder="Search campaigns…" />
          <FilterBar id="ads-campaigns" fields={CAMPAIGN_FIELDS} value={filters} onChange={setFilters} />
        </>}
      />
      <div className="footnote">Build multi-condition filters (text, status/type, and metric thresholds with ALL/ANY logic) and save them as reusable <b>Plans</b>. Bulk operations apply across selected line items. Use Columns for view presets, Dimensions to group, and the compare toggle for period-over-period deltas.</div>
    </>
  )
}

/* ============================ AD GROUPS ============================ */
const agHash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return ((h >>> 0) % 1000) / 1000 }
const AG_NAMES = ['Branded', 'Category', 'Competitor', 'Auto Catch-All', 'Top ASINs', 'Generic']
// Split a campaign's metrics across its ad groups (deterministic weights). Used by drill-down.
function adGroupsForCampaign(c) {
  const n = Math.max(1, c.adGroups?.total || 1)
  const w = Array.from({ length: n }, (_, i) => 0.6 + agHash(c.id + ':agw' + i))
  const sumW = w.reduce((a, b) => a + b, 0)
  return w.map((wi, i) => {
    const f = wi / sumW
    const impr = Math.round((c.impr || 0) * f), clk = Math.round((c.clk || 0) * f)
    const spend = (c.spend || 0) * f, sales = (c.sales || 0) * f, orders = Math.round((c.orders || 0) * f)
    return {
      id: c.id + '-ag' + (i + 1), name: c.name.split('-').slice(0, 2).join('-') + ' · ' + AG_NAMES[i % AG_NAMES.length],
      campaign: c.name, campaignId: c.id, profileId: c.profileId, state: i === 0 ? c.state : (agHash(c.id + 's' + i) > 0.25 ? 'Enabled' : 'Paused'),
      defaultBid: c.actlBid, targets: 3 + Math.round(agHash(c.id + 'tg' + i) * 9),
      impr, clk, spend, sales, orders,
      ctr: impr ? (clk / impr) * 100 : 0, acos: sales ? (spend / sales) * 100 : 0, roas: spend ? sales / spend : 0,
    }
  })
}
export function AdGroups() {
  const { profileId, rangeResolved } = useApp()
  const loc = useLocation()
  const campId = new URLSearchParams(loc.search || '').get('camp')
  const allCamps = useMemo(() => [...createdStore.get('campaigns'), ...ALL_CAMPAIGNS], [])
  const drillCamp = campId ? allCamps.find((c) => c.id === campId) : null
  const base = useProfileFilter(allCamps)
  const [created, setCreated] = useState(() => createdStore.get('adgroups'))
  const [showNew, setShowNew] = useState(false)
  const createdRows = useMemo(() => created
    .filter((g) => !campId || g.campaignId === campId)
    .map((g) => ({ ...ZERO_METRICS, id: g.id, name: g.name, campaign: g.campaign, campaignId: g.campaignId, profileId: g.profileId, state: g.state, defaultBid: g.defaultBid, targets: 0 })), [created, campId])
  // SA-R6: the flat view derives ad groups from the same adGroupsForCampaign() weights/ids
  // as the drill view, so metrics and overrides agree between the two paths.
  const seedRows = drillCamp ? adGroupsForCampaign(drillCamp) : base.flatMap((c) => adGroupsForCampaign(c))
  const rawRows = [...createdRows, ...seedRows]
  const createNewGroup = (g) => { const row = { id: 'AGNEW' + Date.now().toString().slice(-7), ...g }; const next = [row, ...created]; createdStore.set('adgroups', next); setCreated(next); setShowNew(false); toast(`Ad group "${g.name}" created`) }
  const [overrides, setOverrides] = usePersistentOverrides('ads-adgroups')
  const rawEdited = rawRows.map((r) => (overrides[r.id] ? { ...r, ...overrides[r.id] } : r))
  const { rows, prev } = useMemo(() => scaleForRange(rawEdited, rangeResolved), [rawEdited, rangeResolved])
  const [filters, setFilters] = useState(() => loadFilterModel('ads-adgroups'))
  const filtered = applyFilters(rows, filters, ADGROUP_FIELDS)
  const prevFiltered = filtered.map((r) => prev[r.id])
  const merge = (id, patch) => setOverrides((o) => ({ ...o, [id]: { ...o[id], ...patch } }))
  const mergeMany = (ids, fn) => setOverrides((o) => { const n = { ...o }; ids.forEach((id) => { n[id] = { ...n[id], ...fn(id) } }); return n })
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]))
  const [sel, setSel] = useState(new Set())
  useEffect(() => { setSel(new Set()) }, [profileId, campId]) // SA-R1: drop stale selections
  const toggleSel = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSel((s) => (s.size === filtered.length ? new Set() : new Set(filtered.map((r) => r.id))))
  const bulkState = (st) => { const ids = [...sel].filter((id) => byId[id]); mergeMany(ids, () => ({ state: st })); setSel(new Set()); toast(`${ids.length} ad group${ids.length === 1 ? '' : 's'} ${st.toLowerCase()}`) }
  const columns = [
    { key: 'name', label: 'Ad Group', sticky: true, width: 300, render: (r) => <div className="cellname">{r.name}<small>{r.campaign}</small></div> },
    { key: 'state', label: 'State', render: (r) => <StateSelect value={r.state === 'Enabled' ? 'Enabled' : 'Paused'} options={['Enabled', 'Paused']} onChange={(st) => { merge(r.id, { state: st }); toast(`Ad group ${st.toLowerCase()}`) }} /> },
    { key: 'defaultBid', label: 'Default Bid', num: true, render: (r) => <EditableNum value={r.defaultBid} prefix={symA(r.profileId)} dec={2} onCommit={(v) => { merge(r.id, { defaultBid: v }); toast(`Default bid set to ${cur(v, symA(r.profileId), 2)}`) }} /> },
    { key: 'targets', label: 'Targets', num: true, foot: (rs) => int(sumKey('targets')(rs)) },
    { key: 'impr', label: 'Impr.', num: true, delta: true, foot: (rs) => compact(aggregate(rs).impr), render: (r) => compact(r.impr) },
    { key: 'clk', label: 'Clicks', num: true, delta: true, foot: (rs) => int(aggregate(rs).clk), render: (r) => int(r.clk) },
    { key: 'ctr', label: 'CTR', num: true, foot: (rs) => pct(aggregate(rs).ctr, 2), render: (r) => pct(r.ctr, 2) },
    { key: 'spend', label: 'Spend', num: true, delta: true, foot: adsMoneyFoot('spend'), render: (r) => cur(r.spend, symA(r.profileId)) },
    { key: 'sales', label: 'Sales', num: true, delta: true, foot: adsMoneyFoot('sales'), render: (r) => cur(r.sales, symA(r.profileId)) },
    { key: 'orders', label: 'Orders', num: true, delta: true, foot: (rs) => int(aggregate(rs).orders), render: (r) => int(r.orders) },
    { key: 'acos', label: 'ACoS', num: true, delta: true, foot: (rs) => pct(aggregate(rs).acos), render: (r) => pct(r.acos) },
    { key: 'roas', label: 'ROAS', num: true, foot: (rs) => dec2(aggregate(rs).roas), render: (r) => dec2(r.roas) },
  ]
  const agPresets = {
    'Default Plan': ['name', 'state', 'defaultBid', 'targets', 'impr', 'clk', 'ctr', 'spend', 'sales', 'orders', 'acos', 'roas'],
    Performance: ['name', 'state', 'impr', 'clk', 'ctr', 'spend', 'sales', 'orders', 'acos', 'roas'],
    'Bid Management': ['name', 'state', 'defaultBid', 'targets', 'spend', 'acos', 'roas'],
  }
  return (
    <>
      <AdsHead title="Ad Groups" sub={drillCamp ? `${filtered.length} ad groups in this campaign` : `${filtered.length} ad groups · ${rangeResolved.label}`}>
        <ExportMenu name="ad-groups" fields={ADGROUP_FIELDS} rows={filtered} /><Btn icon="plus" primary onClick={() => setShowNew(true)}>New Ad Group</Btn>
      </AdsHead>
      {sel.size > 0 && (
        <div className="bulkbar">
          <span className="sel">{sel.size} selected</span>
          <Btn sm icon="play" onClick={() => bulkState('Enabled')}>Enable</Btn>
          <Btn sm icon="pause" onClick={() => bulkState('Paused')}>Pause</Btn>
          <div style={{ flex: 1 }} />
          <Btn sm ghost onClick={() => setSel(new Set())}>Clear</Btn>
        </div>
      )}
      {showNew && <NewAdGroupModal camps={allCamps} defaultCampId={campId} currency={drillCamp ? symA(drillCamp.profileId) : '$'} onClose={() => setShowNew(false)} onCreate={createNewGroup} />}
      {drillCamp && (
        <div className="drillbar">
          <Link className="celllink" to="/ads/campaigns"><Icon name="chevDown" size={13} style={{ transform: 'rotate(90deg)' }} /> Back to Campaigns</Link>
          <span className="muted">Ad groups for</span><b>{drillCamp.name}</b>
          <span className={`pill ${typeTone(drillCamp.campaignType)}`} style={{ borderRadius: 5 }}>{drillCamp.campaignType}</span>
        </div>
      )}
      <KpiRow rows={filtered} prev={prevFiltered} />
      <DataGrid
        id="ads-adgroups"
        columns={columns}
        rows={filtered}
        initialSort={{ key: 'spend', dir: 'desc' }}
        presets={agPresets}
        defaultPreset="Default Plan"
        dimensions={[{ key: 'profileId', label: 'Profile' }, { key: 'state', label: 'State' }]}
        totals
        compare
        comparePrev={prev}
        compareDisabled={rangeResolved.label === 'All time'}
        selectable
        selected={sel}
        onToggle={toggleSel}
        onToggleAll={toggleAll}
        toolbarLeft={<FilterBar id="ads-adgroups" fields={ADGROUP_FIELDS} value={filters} onChange={setFilters} />}
      />
    </>
  )
}

/* ============================ TARGETING (Keywords) ============================ */
export function Targeting() {
  const { profileId, rangeResolved } = useApp()
  const [created, setCreated] = useState(() => createdStore.get('keywords'))
  const [showAdd, setShowAdd] = useState(false)
  const allCamps = useMemo(() => [...createdStore.get('campaigns'), ...ALL_CAMPAIGNS], [])
  // SA-R3: mock keywords in "-PAT-" campaigns become product-target rows (ASIN / category
  // expressions, matchType PAT) so the Product Targets tab has a real, deterministic partition.
  const allKeywords = useMemo(() => {
    const campById = Object.fromEntries(ALL_CAMPAIGNS.map((c) => [c.id, c]))
    const seeded = keywords.map((k) => {
      if (!/-PAT-/.test(k.campaign)) return k
      const target = /PAT-Category/.test(k.campaign) ? `Category: ${k.keyword}` : `ASIN: ${campById[k.campaignId]?.asin || k.keyword}`
      return { ...k, matchType: 'PAT', keyword: target }
    })
    return [...created, ...seeded]
  }, [created])
  const base = useProfileFilter(allKeywords)
  // SA-R3 / SA-R9: Negatives = search terms the user negated + negatives created from this grid.
  const [stActs] = usePersistentOverrides('ads-searchterms-acts')
  const [createdNegs, setCreatedNegs] = useState(() => createdStore.get('negatives'))
  const negAll = useMemo(() => [
    ...createdNegs,
    ...searchTerms.filter((s) => stActs[s.id] === 'negate').map((s) => ({
      ...ZERO_METRICS, id: 'NEG-' + s.id, keyword: s.term, campaign: s.campaign, profileId: s.profileId,
      matchType: 'Negative Exact', state: 'Enabled', bid: 0, sugBid: 0, topOfSearchIS: 0,
    })),
  ], [createdNegs, stActs])
  const negRows = useProfileFilter(negAll)
  const addKeywords = (rows) => {
    const stamped = rows.map((r, i) => ({ ...ZERO_METRICS, id: 'KNEW' + (Date.now() + i).toString().slice(-7), keyword: r.keyword, campaignId: r.campaignId, campaign: r.campaign, profileId: r.profileId, matchType: r.matchType, state: 'Enabled', bid: r.bid, sugBid: r.bid, topOfSearchIS: 0 }))
    const next = [...stamped, ...created]; createdStore.set('keywords', next); setCreated(next); setShowAdd(false); toast(`Added ${rows.length} keyword${rows.length === 1 ? '' : 's'} — added to the grid`)
  }
  const [tab, setTab] = useState('Keywords')
  const [sel, setSel] = useState(new Set())
  useEffect(() => { setSel(new Set()) }, [profileId, tab]) // SA-R1: drop stale selections
  const [overrides, setOverrides] = usePersistentOverrides('ads-targeting')
  const [modal, setModal] = useState(null) // 'set' | 'inc' | 'dec'
  const [filters, setFilters] = useState(() => loadFilterModel('ads-targeting'))
  const withEdits = base.map((k) => (overrides[k.id] ? { ...k, ...overrides[k.id] } : k))
  const { rows: data, prev } = useMemo(() => scaleForRange(withEdits, rangeResolved), [withEdits, rangeResolved])
  // SA-R3: real tab partition — Keywords / Product Targets (PAT) / Negatives.
  const kwRows = data.filter((r) => r.matchType !== 'PAT')
  const patRows = data.filter((r) => r.matchType === 'PAT')
  const tabRows = tab === 'Keywords' ? kwRows : tab === 'Product Targets' ? patRows : negRows
  const filtered = applyFilters(tabRows, filters, TARGETING_FIELDS)
  const byId = Object.fromEntries([...data, ...negRows].map((k) => [k.id, k]))
  const merge = (id, patch) => setOverrides((o) => ({ ...o, [id]: { ...o[id], ...patch } }))
  const mergeMany = (ids, fn) => setOverrides((o) => { const n = { ...o }; ids.forEach((id) => { n[id] = { ...n[id], ...fn(id) } }); return n })
  const setState = (id, st) => merge(id, { state: st })
  const selIds = () => [...sel].filter((id) => byId[id]) // SA-R1: skip ids no longer in the row set
  const applyBulkBid = (mode, amt) => { const ids = selIds(); mergeMany(ids, (id) => ({ bid: applyBidOp(byId[id].bid, byId[id].sugBid, mode, amt) })); setSel(new Set()); setModal(null); toast(`Updated bids on ${ids.length} target${ids.length === 1 ? '' : 's'} — all succeeded`) }
  const bulkPause = () => { const ids = selIds(); mergeMany(ids, () => ({ state: 'Paused' })); setSel(new Set()); toast(`Paused ${ids.length} target${ids.length === 1 ? '' : 's'}`) }
  const bulkNegative = () => {
    const rows = selIds().map((id) => byId[id])
    const stamped = rows.map((r, i) => ({ ...ZERO_METRICS, id: 'NEGNEW' + (Date.now() + i).toString().slice(-7), keyword: r.keyword, campaign: r.campaign, profileId: r.profileId, matchType: 'Negative Exact', state: 'Enabled', bid: 0, sugBid: 0, topOfSearchIS: 0 }))
    const next = [...stamped, ...createdNegs]; createdStore.set('negatives', next); setCreatedNegs(next)
    setSel(new Set()); toast(`Added ${stamped.length} term${stamped.length === 1 ? '' : 's'} as negative exact — see the Negatives tab`)
  }
  const toggleSel = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSel((s) => (s.size === filtered.length ? new Set() : new Set(filtered.map((r) => r.id))))
  const columns = [
    { key: 'keyword', label: 'Targeting', sticky: true, width: 240, render: (r) => <div className="cellname">{r.keyword}<small>{r.campaign.split('-').slice(0, 2).join('-')}</small></div> },
    { key: 'matchType', label: 'Match', render: (r) => <span className="tag">{r.matchType}</span> },
    { key: 'state', label: 'State', render: (r) => <StateSelect value={r.state} onChange={(st) => setState(r.id, st)} /> },
    { key: 'bid', label: 'Bid', num: true, render: (r) => <EditableNum value={r.bid} prefix={symA(r.profileId)} dec={2} onCommit={(v) => { merge(r.id, { bid: v }); toast(`Bid set to ${cur(v, symA(r.profileId), 2)}`) }} /> },
    { key: 'sugBid', label: 'Suggested', num: true, render: (r) => <span className="muted">{cur(r.sugBid, symA(r.profileId), 2)}</span> },
    { key: 'topOfSearchIS', label: 'Top-of-Search IS', num: true, render: (r) => pct(r.topOfSearchIS) },
    { key: 'impr', label: 'Impr.', num: true, delta: true, foot: (rs) => compact(aggregate(rs).impr), render: (r) => compact(r.impr) },
    { key: 'clk', label: 'Clicks', num: true, foot: (rs) => int(aggregate(rs).clk), render: (r) => int(r.clk) },
    { key: 'spend', label: 'Spend', num: true, delta: true, foot: adsMoneyFoot('spend'), render: (r) => cur(r.spend, symA(r.profileId)) },
    { key: 'sales', label: 'Sales', num: true, delta: true, foot: adsMoneyFoot('sales'), render: (r) => cur(r.sales, symA(r.profileId)) },
    { key: 'orders', label: 'Orders', num: true, foot: (rs) => int(aggregate(rs).orders), render: (r) => int(r.orders) },
    { key: 'acos', label: 'ACoS', num: true, delta: true, foot: (rs) => pct(aggregate(rs).acos), render: (r) => <span style={{ color: r.acos > 40 ? 'var(--red)' : 'inherit' }}>{pct(r.acos)}</span> },
    { key: 'roas', label: 'ROAS', num: true, foot: (rs) => dec2(aggregate(rs).roas), render: (r) => dec2(r.roas) },
  ]
  return (
    <>
      <AdsHead title="Targeting" sub={`Keywords & product targets · ${rangeResolved.label}`}><ExportMenu name="targeting" fields={TARGETING_FIELDS} rows={filtered} /><Btn icon="plus" primary onClick={() => setShowAdd(true)}>Add Keywords</Btn></AdsHead>
      {showAdd && <AddKeywordsModal camps={allCamps} currency={symA(profileId)} onClose={() => setShowAdd(false)} onCreate={addKeywords} />}
      <div className="viewtabs" style={{ maxWidth: 420 }}>
        {[['Keywords', kwRows.length], ['Product Targets', patRows.length], ['Negatives', negRows.length]].map(([t, n]) => (
          <div key={t} className={`viewtab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t} ({n})</div>
        ))}
      </div>
      {sel.size > 0 && (
        <div className="bulkbar">
          <span className="sel">{sel.size} selected</span>
          <Btn sm icon="target" onClick={() => setModal('set')}>Set Bid</Btn>
          <Btn sm icon="trendUp" onClick={() => setModal('inc')}>Bid +%</Btn>
          <Btn sm icon="trendDown" onClick={() => setModal('dec')}>Bid −%</Btn>
          <Btn sm icon="pause" onClick={bulkPause}>Pause</Btn>
          {tab !== 'Negatives' && <Btn sm icon="x" onClick={bulkNegative}>Add as Negative</Btn>}
          <div style={{ flex: 1 }} /><Btn sm ghost onClick={() => setSel(new Set())}>Clear</Btn>
        </div>
      )}
      {modal && <BulkBidModal count={sel.size} currency={symA(profileId)} initialMode={modal} suggestedLabel="suggested bid" onApply={applyBulkBid} onClose={() => setModal(null)} />}
      <DataGrid
        id="ads-targeting"
        columns={columns}
        rows={filtered}
        initialSort={{ key: 'spend', dir: 'desc' }}
        dimensions={[{ key: 'matchType', label: 'Match Type' }, { key: 'state', label: 'State' }]}
        totals
        compare
        comparePrev={prev}
        compareDisabled={rangeResolved.label === 'All time'}
        selectable
        selected={sel}
        onToggle={toggleSel}
        onToggleAll={toggleAll}
        toolbarLeft={<FilterBar id="ads-targeting" fields={TARGETING_FIELDS} value={filters} onChange={setFilters} />}
      />
      <div className="footnote">Suggested bids and Top-of-Search Impression Share guide bid changes. Select rows for bulk bid actions or to add negatives.</div>
    </>
  )
}

/* ============================ SEARCH TERMS (harvesting) ============================ */
export function SearchTerms() {
  const { rangeResolved } = useApp()
  const nav = useNavigate()
  const baseRaw = useProfileFilter(searchTerms)
  // SA-R9: recompute the recommendation from the SCALED metrics (mirrors the mock's
  // criteria: ACoS < 30 && orders > 6 → harvest; ACoS > 80 → negate; else monitor).
  const base = useMemo(() => scaleForRange(baseRaw, rangeResolved).rows.map((r) => ({
    ...r, recommend: r.acos < 30 && r.orders > 6 ? 'harvest' : r.acos > 80 ? 'negate' : 'monitor',
  })), [baseRaw, rangeResolved])
  const [filter, setFilter] = useState('All')
  const [acts, setActs] = usePersistentOverrides('ads-searchterms-acts')
  const harvest = (r) => {
    if (acts[r.id] !== 'harvest') { // add the term as a keyword target so it shows up in Targeting
      const camp = ALL_CAMPAIGNS.find((c) => c.name === r.campaign)
      const bid = Math.max(MIN_BID, round2(r.cpc || 0.75))
      createdStore.add('keywords', { ...ZERO_METRICS, id: 'KNEW' + Date.now().toString().slice(-7), keyword: r.term, campaignId: camp?.id || '', campaign: r.campaign, profileId: r.profileId, matchType: 'Exact', state: 'Enabled', bid, sugBid: bid, topOfSearchIS: 0 })
    }
    setActs((o) => ({ ...o, [r.id]: 'harvest' })); toast('Harvested to manual campaign — keyword added to Targeting')
  }
  const negate = (id) => { setActs((o) => ({ ...o, [id]: 'negate' })); toast('Added as negative exact — see Targeting › Negatives') }
  const [filters, setFilters] = useState(() => loadFilterModel('ads-searchterms'))
  const recTone = { harvest: 'green', negate: 'red', monitor: 'gray' }
  const chipFiltered = base.filter((r) => filter === 'All' || r.recommend === filter.toLowerCase())
  const filtered = applyFilters(chipFiltered, filters, SEARCHTERM_FIELDS)
  const counts = { harvest: base.filter((r) => r.recommend === 'harvest').length, negate: base.filter((r) => r.recommend === 'negate').length }
  const columns = [
    { key: 'term', label: 'Customer Search Term', sticky: true, width: 240, render: (r) => <div className="cellname">{r.term}<small>matched: {r.matchedTarget}</small></div> },
    { key: 'campaign', label: 'Campaign', render: (r) => <span className="muted">{r.campaign.split('-').slice(0, 2).join('-')}</span> },
    { key: 'impr', label: 'Impr.', num: true, foot: (rs) => compact(aggregate(rs).impr), render: (r) => compact(r.impr) },
    { key: 'clk', label: 'Clicks', num: true, foot: (rs) => int(aggregate(rs).clk), render: (r) => int(r.clk) },
    { key: 'spend', label: 'Spend', num: true, foot: adsMoneyFoot('spend'), render: (r) => cur(r.spend, symA(r.profileId)) },
    { key: 'sales', label: 'Sales', num: true, foot: adsMoneyFoot('sales'), render: (r) => cur(r.sales, symA(r.profileId)) },
    { key: 'orders', label: 'Orders', num: true, foot: (rs) => int(aggregate(rs).orders), render: (r) => int(r.orders) },
    { key: 'acos', label: 'ACoS', num: true, foot: (rs) => pct(aggregate(rs).acos), render: (r) => pct(r.acos) },
    { key: 'recommend', label: 'Recommendation', render: (r) => <Pill tone={recTone[r.recommend]}>{r.recommend}</Pill> },
    { key: 'act', label: '', sort: false, render: (r) => (r.recommend === 'harvest'
      ? <Btn sm primary icon={acts[r.id] === 'harvest' ? 'check' : 'plus'} onClick={() => harvest(r)}>{acts[r.id] === 'harvest' ? 'Harvested' : 'Harvest'}</Btn>
      : r.recommend === 'negate'
        ? <Btn sm icon={acts[r.id] === 'negate' ? 'check' : 'x'} onClick={() => negate(r.id)}>{acts[r.id] === 'negate' ? 'Negated' : 'Negate'}</Btn>
        : <span className="muted">—</span>) },
  ]
  return (
    <>
      <AdsHead title="Search Terms" sub="Auto-harvest winners into manual campaigns · negate wasted spend"><ExportMenu name="search-terms" fields={SEARCHTERM_FIELDS} rows={filtered} /><Btn icon="sliders" primary onClick={() => nav('/rules')}>Harvesting Rules</Btn></AdsHead>
      <div className="hint" style={{ marginBottom: 14 }}>
        <Icon name="bulb" size={16} />
        <div><b>{counts.harvest} terms</b> qualify for harvesting (Orders &gt; 6, ACoS &lt; 30%) and <b>{counts.negate} terms</b> are flagged to negate. Rule R3 runs nightly to auto-apply.</div>
      </div>
      <DataGrid
        id="ads-searchterms"
        columns={columns}
        rows={filtered}
        initialSort={{ key: 'spend', dir: 'desc' }}
        dimensions={[{ key: 'recommend', label: 'Recommendation' }]}
        totals
        toolbarLeft={<>
          {['All', 'Harvest', 'Negate', 'Monitor'].map((t) => (
            <span key={t} className={`chip ${filter === t ? 'on' : ''}`} onClick={() => setFilter(t)}>{t}</span>
          ))}
          <FilterBar id="ads-searchterms" fields={SEARCHTERM_FIELDS} value={filters} onChange={setFilters} />
        </>}
      />
    </>
  )
}

/* ============================ SHARE OF VOICE ============================ */
export function ShareOfVoice() {
  const columns = [
    { key: 'keyword', label: 'Keyword', sticky: true, width: 220 },
    { key: 'searchVolume', label: 'Search Volume', num: true, foot: (rs) => compact(sumKey('searchVolume')(rs)), render: (r) => compact(r.searchVolume) },
    { key: 'paidShare', label: 'Paid SOV', num: true, render: (r) => <ShareBar v={r.paidShare} color="#1a4fd6" /> },
    { key: 'organicShare', label: 'Organic SOV', num: true, render: (r) => <ShareBar v={r.organicShare} color="#1aa260" /> },
    { key: 'totalShare', label: 'Total SOV', num: true, render: (r) => <b>{pct(r.totalShare)}</b> },
    { key: 'yourRank', label: 'Your Avg Rank', num: true, render: (r) => (r.yourRank ? `#${r.yourRank}` : '—') },
    { key: 'topCompetitor', label: 'Top Competitor', render: (r) => <span>{r.topCompetitor} <span className="muted">({pct(r.competitorShare)})</span></span> },
    { key: 'trend', label: '7d Trend', num: true, render: (r) => <span style={{ color: r.trend >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}><Icon name={r.trend >= 0 ? 'trendUp' : 'trendDown'} size={12} /> {Math.abs(r.trend).toFixed(1)}pt</span> },
  ]
  const [created, setCreated] = useState(() => createdStore.get('sov'))
  const [showTrack, setShowTrack] = useState(false)
  const trackKeyword = (k) => {
    const row = { id: 'SOVNEW' + Date.now().toString().slice(-7), keyword: k.keyword, searchVolume: k.searchVolume, paidShare: 0, organicShare: 0, totalShare: 0, yourRank: 0, topCompetitor: k.topCompetitor, competitorShare: 0, trend: 0 }
    const next = [row, ...created]; createdStore.set('sov', next); setCreated(next); setShowTrack(false); toast(`Now tracking "${k.keyword}"`)
  }
  const allSov = useMemo(() => [...created, ...shareOfVoice], [created])
  const [filters, setFilters] = useState(() => loadFilterModel('ads-sov'))
  const filtered = applyFilters(allSov, filters, SOV_FIELDS)
  const n = filtered.length || 1
  const avgPaid = filtered.reduce((s, r) => s + r.paidShare, 0) / n
  const avgOrg = filtered.reduce((s, r) => s + r.organicShare, 0) / n
  return (
    <>
      <AdsHead title="Share of Voice" sub="Paid + organic visibility on priority keywords vs competitors"><ExportMenu name="share-of-voice" fields={SOV_FIELDS} rows={filtered} /><Btn icon="plus" primary onClick={() => setShowTrack(true)}>Track Keyword</Btn></AdsHead>
      {showTrack && <TrackKeywordModal onClose={() => setShowTrack(false)} onCreate={trackKeyword} />}
      <KpiGrid>
        <Kpi label="Avg Paid SOV" value={pct(avgPaid)} />
        <Kpi label="Avg Organic SOV" value={pct(avgOrg)} />
        <Kpi label="Avg Total SOV" value={pct(avgPaid + avgOrg)} />
        <Kpi label="Keywords Tracked" value={filtered.length} />
        <Kpi label="#1 Rank Keywords" value={filtered.filter((r) => r.yourRank === 1).length} />
      </KpiGrid>
      <DataGrid
        id="ads-sov"
        columns={columns}
        rows={filtered}
        initialSort={{ key: 'searchVolume', dir: 'desc' }}
        totals
        dimensions={[{ key: 'topCompetitor', label: 'Top Competitor' }]}
        toolbarLeft={<FilterBar id="ads-sov" fields={SOV_FIELDS} value={filters} onChange={setFilters} />}
      />
      <div className="footnote">Defend or expand SOV on priority keywords automatically with bid automation and budget controls (see Rule Manager).</div>
    </>
  )
}
function ShareBar({ v, color }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', width: 120 }}>
      <div className="miniprog" style={{ width: 70 }}><span style={{ width: Math.min(100, v * 1.6) + '%', background: color }} /></div>
      <span style={{ width: 38, textAlign: 'right' }}>{pct(v)}</span>
    </div>
  )
}

/* ============================ DAYPARTING ============================ */
const DP_KEY = 'chdaypart'
const DP_BRUSHES = [0.4, 0.6, 0.8, 1.0, 1.2, 1.35, 1.5]
const dpColor = (v) => {
  const t = Math.max(0, Math.min(1, (v - 0.4) / 1.1))
  const r = Math.round(234 - t * (234 - 26))
  const g = Math.round(241 - t * (241 - 79))
  const b = Math.round(255 - t * (255 - 214))
  return `rgb(${r},${g},${b})`
}
const dpRound = (n) => Math.round(n * 100) / 100
const dpLoad = (fallback) => { try { const v = JSON.parse(localStorage.getItem(DP_KEY)); return Array.isArray(v) && v.length === 7 ? v : fallback } catch (e) { return fallback } }
const dpSave = (g) => { try { localStorage.setItem(DP_KEY, JSON.stringify(g)) } catch (e) { /* ignore */ } }
// Heuristic "optimized" schedule — trim overnight harder, lift peak windows, weekend bump.
const dpSuggest = () => DAYS.map((d, di) => Array.from({ length: 24 }, (_, h) => {
  let b = 0.35
  if (h >= 7 && h <= 11) b = 1.1
  if (h >= 12 && h <= 14) b = 1.3
  if (h >= 18 && h <= 22) b = 1.5
  if (di >= 5) b = b * 1.1
  return dpRound(Math.min(1.6, b))
}))

export function Dayparting() {
  const [grid, setGrid] = useState(() => dpLoad(dayparting))
  const [brush, setBrush] = useState(1.2)
  const painting = useRef(false)
  const hours = Array.from({ length: 24 }, (_, h) => h)
  useEffect(() => { const up = () => { painting.current = false }; window.addEventListener('mouseup', up); return () => window.removeEventListener('mouseup', up) }, [])
  const paint = (di, h) => setGrid((g) => { const n = g.map((r) => r.slice()); n[di][h] = brush; dpSave(n); return n })
  const reset = () => { setGrid(dayparting); dpSave(dayparting); toast('Schedule reset to default') }
  const suggest = () => { const s = dpSuggest(); setGrid(s); dpSave(s); toast('Applied suggested schedule') }
  const apply = () => toast('Dayparting schedule applied to 40 campaigns')
  const avg = grid.flat().reduce((a, b) => a + b, 0) / 168
  const peak = Math.max(...grid.flat())
  return (
    <>
      <AdsHead title="Dayparting" sub="Hour-of-day & day-of-week bid multipliers"><Btn icon="refresh" ghost onClick={reset}>Reset</Btn><Btn icon="bulb" onClick={suggest}>Suggest Schedule</Btn><Btn icon="check" primary onClick={apply}>Apply to Campaigns</Btn></AdsHead>
      <div className="hint" style={{ marginBottom: 14 }}>
        <Icon name="bulb" size={16} />
        <div>Pick a multiplier below, then <b>click or drag across cells</b> to paint the schedule. Bids scale up in high-converting hours and down in low-traffic windows. Changes save automatically; <b>Apply to Campaigns</b> pushes the schedule live.</div>
      </div>
      <Card title="Bid multiplier schedule" sub={`Local account time · 168 hourly slots · avg ${avg.toFixed(2)}× · peak ${peak.toFixed(2)}×`}>
        <div className="dp-brushes">
          <span className="muted" style={{ fontWeight: 600 }}>Brush:</span>
          {DP_BRUSHES.map((v) => (
            <button key={v} className={`dp-swatch ${brush === v ? 'on' : ''}`} style={{ background: dpColor(v), color: v > 1.0 ? '#fff' : 'var(--text-2)' }} onClick={() => setBrush(v)}>{v.toFixed(2)}×</button>
          ))}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div className="heat" style={{ minWidth: 760, userSelect: 'none' }}>
            <div />
            {hours.map((h) => <div key={h} className="hh">{h}</div>)}
            {grid.map((row, di) => (
              <Row key={di} day={DAYS[di]} row={row} di={di} color={dpColor} painting={painting} onPaint={paint} />
            ))}
          </div>
        </div>
        <div className="legend" style={{ marginTop: 16, justifyContent: 'center' }}>
          <span><i style={{ background: dpColor(0.4) }} /> 0.4× (overnight)</span>
          <span><i style={{ background: dpColor(0.8) }} /> 0.8×</span>
          <span><i style={{ background: dpColor(1.1) }} /> 1.1×</span>
          <span><i style={{ background: dpColor(1.45) }} /> 1.45× (peak)</span>
        </div>
      </Card>
      <div className="footnote">For shopping events (e.g. Prime Day) apply an event-window override via Rule R6 to boost peak hours automatically.</div>
    </>
  )
}
function Row({ day, row, di, color, painting, onPaint }) {
  return (
    <>
      <div className="rl">{day}</div>
      {row.map((v, h) => (
        <div key={h} className="cell" style={{ background: color(v), color: v > 1.0 ? '#fff' : 'var(--text-2)' }} title={`${day} ${h}:00 → ${v}×`}
          onMouseDown={() => { painting.current = true; onPaint(di, h) }}
          onMouseEnter={() => { if (painting.current) onPaint(di, h) }}>{v.toFixed(1)}</div>
      ))}
    </>
  )
}

/* ============================ BULK OPERATIONS ("Pacvue XL" — §9.2) ============================ */
const XL_TABS = ['Create / Update Campaign', 'Quick Campaign Edits', 'Campaign Target Setting', 'Create Tag', 'Campaign Tag Target Setting', 'Upload Campaign Mapping']
const XL_QUICK = ['Change Campaign Name', 'Change Campaign Budget', 'Change Campaign State', 'Change Targeting Bid', 'Change Targeting State', 'Add Targeting', 'Add Negative Targeting']
const XL_CTYPES = ['Sponsored Products', 'Sponsored Brands', 'Sponsored Display', 'Sponsored TV']
const XL_FIELDS = {
  'Create / Update Campaign': [
    { key: 'name', label: 'Campaign Name' }, { key: 'campaignType', label: 'Campaign Type' }, { key: 'state', label: 'State' },
    { key: 'dailyBudget', label: 'Daily Budget' }, { key: 'startDate', label: 'Start Date' }, { key: 'endDate', label: 'End Date' },
    { key: 'targetingType', label: 'Targeting Type' }, { key: 'actlBid', label: 'Default Bid' },
  ],
  'Quick Campaign Edits': [
    { key: 'name', label: 'Campaign Name' }, { key: 'setting', label: 'Setting To Modify' }, { key: 'newValue', label: 'New Value' },
  ],
  'Campaign Target Setting': [
    { key: 'name', label: 'Campaign Name' }, { key: 'adGroup', label: 'Ad Group' }, { key: 'target', label: 'Target (keyword / ASIN)' },
    { key: 'matchType', label: 'Match Type' }, { key: 'bid', label: 'Bid' }, { key: 'state', label: 'State' },
  ],
  'Create Tag': [{ key: 'tag', label: 'Tag Name' }, { key: 'name', label: 'Campaign Name' }],
  'Campaign Tag Target Setting': [{ key: 'tag', label: 'Tag Name' }, { key: 'target', label: 'Target' }, { key: 'bid', label: 'Bid' }],
  'Upload Campaign Mapping': [{ key: 'name', label: 'Campaign Name' }, { key: 'group', label: 'Mapping Group' }],
}
// Map the Campaign Type dropdown to the campaignType prefixes used in the mock rows.
const XL_TYPE_PREFIX = { 'Sponsored Products': 'SP', 'Sponsored Brands': 'SB', 'Sponsored Display': 'SD', 'Sponsored TV': 'STV' }
// Amazon bulk-file style column headers (vs the Pacvue-style labels above).
const XL_AMZ_LABELS = {
  name: 'Campaign', campaignType: 'Ad Type', state: 'Campaign Status', dailyBudget: 'Daily Budget',
  startDate: 'Campaign Start Date', endDate: 'Campaign End Date', targetingType: 'Targeting Type',
  actlBid: 'Ad Group Default Bid', setting: 'Operation', newValue: 'Value', adGroup: 'Ad Group Name',
  target: 'Keyword or Product Targeting', matchType: 'Match Type', bid: 'Max Bid', tag: 'Label', group: 'Portfolio Name',
}
// Target/keyword uploads are capped at 1,000 keywords; everything else at 10,000 rows.
const XL_KW_TABS = ['Campaign Target Setting', 'Campaign Tag Target Setting']

export function BulkOperations() {
  const { profiles } = useApp()
  const bulkLoc = useLocation()
  // E1: /ads/bulk?tab=Create Tag preselects a tab (used by Tagging → Bulk Create Tag).
  const qTab = new URLSearchParams(bulkLoc.search || '').get('tab')
  const [tab, setTab] = useState(XL_TABS.includes(qTab) ? qTab : XL_TABS[0])
  const [profile, setProfile] = useState(profiles[0]?.id)
  const [ctype, setCtype] = useState(XL_CTYPES[0])
  const [fmt, setFmt] = useState('Pacvue')
  const [quick, setQuick] = useState(XL_QUICK[0])
  const [history, setHistory] = useState(() => createdStore.get('bulkops'))
  const fileRef = useRef(null)
  const fields = XL_FIELDS[tab]
  // SA-R11: Pacvue vs Amazon format changes the exported column headers, not just the filename.
  const fmtFields = fmt === 'Amazon' ? fields.map((f) => ({ ...f, label: XL_AMZ_LABELS[f.key] || f.label })) : fields
  const stamp = new Date().toISOString().slice(0, 10)
  const fname = (kind) => `${fmt.toLowerCase()}-${tab.toLowerCase().replace(/[^a-z]+/g, '-')}-${kind}-${stamp}.csv`
  const downloadTemplate = () => { exportCSV(fname('template'), fmtFields, []); toast(`${fmt} template downloaded — fill it in, then Upload`) }
  const downloadExisting = () => {
    const prefix = XL_TYPE_PREFIX[ctype] || ''
    const rows = ALL_CAMPAIGNS
      .filter((c) => (c.profileId === profile || profile === 'all') && c.campaignType.startsWith(prefix))
      .map((c) => ({ ...c, setting: quick, newValue: '', adGroup: '', target: '', matchType: '', bid: c.actlBid, tag: c.tag || '', group: '' }))
    if (!rows.length) { toast(`No ${ctype} campaigns on this profile`, 'error'); return }
    exportCSV(fname('existing-data'), fmtFields, rows); toast(`Exported ${rows.length} ${ctype} row${rows.length === 1 ? '' : 's'} for editing`)
  }
  const onUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const lines = String(reader.result).split(/\r?\n/).filter((l) => l.trim())
      const n = Math.max(0, lines.length - 1)
      const isKw = XL_KW_TABS.includes(tab) || (tab === 'Quick Campaign Edits' && quick.includes('Targeting'))
      const limit = isKw ? 1000 : 10000
      const status = n > limit ? `Rejected — over ${limit.toLocaleString()} ${isKw ? 'keyword' : 'row'} limit` : 'Processed'
      const rec = { id: 'BO' + Date.now().toString().slice(-6), tab, setting: tab === 'Quick Campaign Edits' ? quick : '—', file: file.name, rows: n, format: fmt, status, when: new Date().toLocaleString() }
      const next = [rec, ...createdStore.get('bulkops')]; createdStore.set('bulkops', next); setHistory(next)
      if (status === 'Processed') toast(`Processed ${n} row${n === 1 ? '' : 's'} from ${file.name}`)
      else toast(status, 'error')
    }
    reader.readAsText(file); e.target.value = ''
  }
  return (
    <>
      <AdsHead title="Bulk Operations" sub="Spreadsheet round-trip for campaigns, targets, tags & mappings — up to 10,000 campaigns / 1,000 keywords per file" />
      <div className="seg" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
        {XL_TABS.map((t) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      <Card title={tab} sub="1 — Choose scope · 2 — Download a template or your existing data · 3 — Edit in a spreadsheet · 4 — Upload">
        <div className="rb-grid2" style={{ maxWidth: 560 }}>
          <label className="fld">Profile<select value={profile} onChange={(e) => setProfile(e.target.value)}>{profiles.map((p) => <option key={p.id} value={p.id}>{p.market}</option>)}</select></label>
          <label className="fld">Campaign Type<select value={ctype} onChange={(e) => setCtype(e.target.value)}>{XL_CTYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
        </div>
        {tab === 'Quick Campaign Edits' && (
          <label className="fld" style={{ maxWidth: 560 }}>Setting to modify<select value={quick} onChange={(e) => setQuick(e.target.value)}>{XL_QUICK.map((s) => <option key={s}>{s}</option>)}</select></label>
        )}
        <div className="fld" style={{ maxWidth: 560 }}><span>Template format</span>
          <div className="seg" style={{ marginTop: 4 }}>
            {['Pacvue', 'Amazon'].map((m) => <button key={m} className={fmt === m ? 'on' : ''} onClick={() => setFmt(m)}>{m}</button>)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <Btn icon="download" onClick={downloadTemplate}>Download template (create)</Btn>
          <Btn icon="download" ghost onClick={downloadExisting}>Download existing data (edit)</Btn>
          <Btn icon="plus" primary onClick={() => fileRef.current?.click()}>Upload completed file</Btn>
          <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" style={{ display: 'none' }} onChange={onUpload} />
        </div>
      </Card>
      <Card title="Upload history" sub={history.length ? `${history.length} upload${history.length === 1 ? '' : 's'}` : 'No uploads yet — processed files appear here'}>
        {history.length > 0 && (
          <table className="review-tbl"><tbody>
            {history.map((h) => (
              <tr key={h.id}><td>{h.when}</td><td>{h.tab}{h.setting !== '—' ? ` · ${h.setting}` : ''} · <b>{h.file}</b> · {h.rows} rows · {h.format} format · <span style={{ color: h.status === 'Processed' ? 'var(--green)' : 'var(--red)' }}>{h.status}</span></td></tr>
            ))}
          </tbody></table>
        )}
      </Card>
      <div className="footnote">Pick a tab per operation type. Quick Campaign Edits supports: {XL_QUICK.join(' · ')}. Files over 10,000 campaign rows (or 1,000 keyword rows for target files) are rejected, matching live limits.</div>
    </>
  )
}

/* ============================ TAGGING (E1 — spec §12) ============================ */
const TAGS_TABS = ['Campaign Tags', 'Keyword Tags', 'ASIN Tags']
const TAGS_KIND = { 'Campaign Tags': 'campaign', 'Keyword Tags': 'keyword', 'ASIN Tags': 'asin' }
const TAGS_OWNERS = ['jim@brightleaf.co', 'a.rivera@brightleaf.co', 'm.chen@brightleaf.co']
const TAGS_FIELDS = [
  { key: 'name', label: 'Tag Name', type: 'text' },
  { key: 'owner', label: 'Owner', type: 'enum', options: TAGS_OWNERS },
  { key: 'count', label: 'Entities', type: 'number' },
  { key: 'impr', label: 'Impressions', type: 'number' },
  { key: 'clk', label: 'Clicks', type: 'number' },
  { key: 'spend', label: 'Spend', type: 'number' },
  { key: 'sales', label: 'Sales', type: 'number' },
  { key: 'roas', label: 'ROAS', type: 'number' },
]

/* Case-insensitive contains / not-contains match (Pacvue "Match Tag Rules"). */
const tagRuleMatch = (text, rule) => {
  if (!rule) return false
  const s = String(text || '').toLowerCase()
  const inc = (rule.contains || []).filter(Boolean)
  const exc = (rule.notContains || []).filter(Boolean)
  if (!inc.length && !exc.length) return false
  if (inc.length && !inc.some((t) => s.includes(t.toLowerCase()))) return false
  if (exc.some((t) => s.includes(t.toLowerCase()))) return false
  return true
}
const tagHasMember = (tag, id, text) => (tag.members || []).includes(id) || tagRuleMatch(text, tag.matchRule)
/* Merge user-created tags + seed tags with their chedits overrides; drop deleted. */
function tagMergedList(created, seeds, overrides) {
  const merged = [...created.map((t) => ({ ...t, user: true })), ...seeds.map((t) => ({ ...t, ...(overrides?.[t.id] || {}) }))]
  return merged.filter((t) => !t.deleted)
}
/* Entities per tag type — computed lazily (ALL_CAMPAIGNS alias is injected late in the single-file build). */
function tagEntitiesFor(kind) {
  const camps = [...createdStore.get('campaigns'), ...ALL_CAMPAIGNS]
  if (kind === 'campaign') return { list: camps, textOf: (c) => c.name, noun: 'Campaigns' }
  if (kind === 'keyword') return { list: [...createdStore.get('keywords'), ...keywords], textOf: (k) => k.keyword, noun: 'Keywords' }
  return { list: camps, textOf: (c) => `${c.asin} ${c.product}`, noun: 'ASINs', countOf: (rows) => new Set(rows.map((r) => r.asin)).size }
}
const tagsParents = (rs) => rs.filter((r) => !r._child)
const tagsSum = (k) => (rs) => tagsParents(rs).reduce((a, r) => a + (r[k] || 0), 0)
const tagsMoneyFoot = (k) => (rs) => {
  const ps = tagsParents(rs)
  const syms = new Set(ps.map((r) => r._sym))
  const est = ps.some((r) => r._est) || syms.size > 1
  return `${cur(tagsSum(k)(rs), syms.size === 1 ? [...syms][0] : '$', 0)}${est ? ' (USD est.)' : ''}`
}

/* ---- Manage Tag modal: two panes — Tag List | Sub Tag List (spec §12) ---- */
function TagBatchCreate({ placeholder, onCancel, onOk }) {
  const [text, setText] = useState('')
  const parse = (s) => [...new Set(s.split(/[\n,]/).map((x) => x.trim()).filter(Boolean))]
  const names = parse(text)
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 8, marginBottom: 8, background: 'var(--surface-2)' }}>
      <textarea rows={3} autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', font: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
      <div className="muted" style={{ fontSize: 11, margin: '4px 0 8px' }}>Please separate each item using either a line break or a comma</div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <Btn sm ghost onClick={onCancel}>Cancel</Btn>
        <Btn sm primary onClick={() => names.length && onOk(names)}>OK{names.length > 0 ? ` (${names.length})` : ''}</Btn>
      </div>
    </div>
  )
}
function TagManageModal({ kind, tags, onCreate, onDelete, onPatch, onClose }) {
  const noun = kind === 'campaign' ? 'Campaign' : kind === 'keyword' ? 'Keyword' : 'ASIN'
  const [selId, setSelId] = useState(tags[0]?.id || null)
  const [lq, setLq] = useState('')
  const [rq, setRq] = useState('')
  const [creating, setCreating] = useState(false)
  const [creatingSub, setCreatingSub] = useState(false)
  const sel = tags.find((t) => t.id === selId) || null
  const listBox = { maxHeight: 250, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }
  const shownTags = tags.filter((t) => t.name.toLowerCase().includes(lq.toLowerCase()))
  const shownSubs = sel ? (sel.sub || []).filter((s) => s.toLowerCase().includes(rq.toLowerCase())) : []
  return (
    <Modal width={720} title={`Manage ${noun} Tag`} sub="Create, organize and delete tags & sub tags — changes apply immediately" onClose={onClose}
      footer={<><div style={{ flex: 1 }} /><Btn primary onClick={onClose}>Close</Btn></>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div className="cm-head" style={{ padding: '0 0 6px' }}>Tag List</div>
          <div style={{ marginBottom: 8 }}><SearchBox value={lq} onChange={setLq} placeholder="Search tags…" /></div>
          <div style={{ marginBottom: 8 }}><Btn sm ghost icon="plus" onClick={() => setCreating((v) => !v)}>Create Tag</Btn></div>
          {creating && <TagBatchCreate placeholder={'Q3 Push\nHero ASINs, Seasonal'} onCancel={() => setCreating(false)} onOk={(names) => { onCreate(names); setCreating(false) }} />}
          <div style={listBox}>
            {shownTags.length === 0 && <div className="muted" style={{ padding: 10, fontSize: 12 }}>No tags match.</div>}
            {shownTags.map((t) => (
              <div key={t.id} onClick={() => setSelId(t.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: selId === t.id ? 'var(--brand-soft)' : 'transparent' }}>
                <Icon name="tag" size={13} />
                <span style={{ flex: 1, fontWeight: 600, fontSize: 12.5, color: selId === t.id ? 'var(--brand)' : 'var(--text)' }}>
                  {t.name}{t.user && <span className="tag" style={{ marginLeft: 6 }}>USER</span>}
                </span>
                <button className="gf-x" title="Delete tag" onClick={(e) => { e.stopPropagation(); onDelete(t) }}><Icon name="x" size={13} /></button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="cm-head" style={{ padding: '0 0 6px' }}>Sub Tag List{sel ? ` — ${sel.name}` : ''}</div>
          <div style={{ marginBottom: 8 }}><SearchBox value={rq} onChange={setRq} placeholder="Search sub tags…" /></div>
          <div style={{ marginBottom: 8 }}><Btn sm ghost icon="plus" onClick={() => sel && setCreatingSub((v) => !v)}>Create Sub Tag</Btn></div>
          {creatingSub && sel && (
            <TagBatchCreate placeholder={'Freeze-Dried Salmon\nWild Salmon'} onCancel={() => setCreatingSub(false)}
              onOk={(names) => { onPatch(sel, { sub: [...new Set([...(sel.sub || []), ...names])] }); setCreatingSub(false); toast(`Added ${names.length} sub tag${names.length === 1 ? '' : 's'} to “${sel.name}”`) }} />
          )}
          <div style={listBox}>
            {!sel && <div className="muted" style={{ padding: 10, fontSize: 12 }}>Select a tag on the left to manage its sub tags.</div>}
            {sel && shownSubs.length === 0 && <div className="muted" style={{ padding: 10, fontSize: 12 }}>No sub tags yet — create one above.</div>}
            {sel && shownSubs.map((s) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                <Icon name="layers" size={13} />
                <span style={{ flex: 1, fontSize: 12.5 }}>{s}</span>
                <button className="gf-x" title="Delete sub tag" onClick={() => { onPatch(sel, { sub: (sel.sub || []).filter((x) => x !== s) }); toast(`Sub tag “${s}” deleted`) }}><Icon name="x" size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="modal-note" style={{ marginTop: 12 }}><Icon name="bulb" size={14} />Sub tags group entities inside a tag (no duplicate sub tag under the same tag). Deleting a tag removes it from every view; membership rules are managed per tag via ⋮ → Match Tag Rule.</div>
    </Modal>
  )
}

/* ---- Match Tag Rule builder: contains / does-not-contain + live preview (spec §12) ---- */
function TagRuleModal({ kind, tag, onSave, onClose }) {
  const noun = kind === 'campaign' ? 'campaign' : kind === 'keyword' ? 'keyword' : 'ASIN'
  const [inc, setInc] = useState((tag.matchRule?.contains || []).join(', '))
  const [exc, setExc] = useState((tag.matchRule?.notContains || []).join(', '))
  const parse = (s) => s.split(',').map((x) => x.trim()).filter(Boolean)
  const rule = useMemo(() => {
    const c = parse(inc), n = parse(exc)
    return (c.length || n.length) ? { contains: c, notContains: n } : null
  }, [inc, exc])
  const entDef = useMemo(() => tagEntitiesFor(kind), [kind])
  const matches = useMemo(() => (rule ? entDef.list.filter((e) => tagRuleMatch(entDef.textOf(e), rule)) : []), [rule, entDef])
  const count = entDef.countOf ? entDef.countOf(matches) : matches.length
  return (
    <Modal width={520} title="Match Tag Rule" sub={`Auto-assign ${noun}s to “${tag.name}” by name`} onClose={onClose}
      footer={<><Btn ghost onClick={onClose}>Cancel</Btn><div style={{ flex: 1 }} /><Btn primary icon="check" onClick={() => { onSave(rule) }}>Save rule</Btn></>}>
      <label className="fld">Name contains (comma-separated — any term matches)
        <input autoFocus value={inc} onChange={(e) => setInc(e.target.value)} placeholder="e.g. Salmon, Freeze-Dried" />
      </label>
      <label className="fld">Name does not contain
        <input value={exc} onChange={(e) => setExc(e.target.value)} placeholder="e.g. Puppy" />
      </label>
      <div className="modal-note"><Icon name="bulb" size={14} />
        {rule
          ? <span>Live preview: <b>{count} {noun}{count === 1 ? '' : 's'}</b> currently match this rule. New {noun}s that match are auto-added to the tag.</span>
          : <span>No rule — this tag keeps only manual assignments. Saving with both fields empty clears the rule.</span>}
      </div>
    </Modal>
  )
}

/* ---- One Tagging tab (remounted per tab via key so per-kind stores re-init) ---- */
function TaggingTab({ tab, tabsBar }) {
  const kind = TAGS_KIND[tab]
  const { profileId, rangeResolved } = useApp()
  const nav = useNavigate()
  const seeds = kind === 'campaign' ? campaignTags : kind === 'keyword' ? keywordTags : asinTags
  const [created, setCreated] = useState(() => createdStore.get('tags-' + kind))
  const [overrides, setOverrides] = usePersistentOverrides('tags-' + kind)
  const tags = useMemo(() => tagMergedList(created, seeds, overrides), [created, seeds, overrides])

  const entDef = useMemo(() => tagEntitiesFor(kind), [kind])
  const baseEnts = useMemo(() => (profileId === 'all' ? entDef.list : entDef.list.filter((e) => e.profileId === profileId)), [entDef, profileId])
  const { rows: scaled, prev: prevMap } = useMemo(() => scaleForRange(baseEnts, rangeResolved), [baseEnts, rangeResolved])

  const [q, setQ] = useState('')
  const [filters, setFilters] = useState(() => loadFilterModel('ads-tags-' + kind))
  const [expandedTags, setExpandedTags] = useState(() => new Set())
  const [sel, setSel] = useState(new Set())
  const [manage, setManage] = useState(false)
  const [ruleTag, setRuleTag] = useState(null)
  useEffect(() => { setSel(new Set()) }, [profileId])

  const memberRows = (tag) => scaled.filter((e) => tagHasMember(tag, e.id, entDef.textOf(e)))
  const buildRow = (tag, members, extra) => {
    const a = aggregate(members)
    const mixed = adsMixedCur(members)
    const spend = mixed ? adsUsdSum(members, 'spend') : a.spend
    const sales = mixed ? adsUsdSum(members, 'sales') : a.sales
    return {
      id: tag.id, name: tag.name, owner: tag.owner, desc: tag.desc || '',
      count: entDef.countOf ? entDef.countOf(members) : members.length,
      impr: a.impr, clk: a.clk, ctr: a.ctr, spend, sales, orders: a.orders,
      roas: spend ? sales / spend : 0,
      _sym: mixed ? '$' : symOf(members), _est: mixed, _tag: tag, _members: members, ...extra,
    }
  }
  const parentRows = tags.map((t) => buildRow(t, memberRows(t)))
  const prevRowsById = useMemo(() => {
    const out = {}
    for (const r of parentRows) {
      const pm = r._members.map((e) => prevMap[e.id]).filter(Boolean)
      const a = aggregate(pm)
      out[r.id] = { impr: a.impr, clk: a.clk, ctr: a.ctr, spend: a.spend, sales: a.sales, orders: a.orders, roas: a.roas }
    }
    return out
  }, [tags, scaled]) // eslint-disable-line react-hooks/exhaustive-deps

  const searchedTags = parentRows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
  const filteredTags = applyFilters(searchedTags, filters, TAGS_FIELDS)
  // Order by spend and inject expanded sub-tag child rows right below their parent
  // (grid gets no initialSort so this order shows; header sorts scatter children — known trade-off).
  const gridRows = []
  for (const r of [...filteredTags].sort((a, b) => b.spend - a.spend)) {
    gridRows.push(r)
    if (kind !== 'keyword' && expandedTags.has(r.id)) {
      for (const s of (r._tag.sub || [])) {
        const subMembers = r._members.filter((e) => tagRuleMatch(entDef.textOf(e), { contains: [s], notContains: [] }))
        gridRows.push(buildRow({ id: r.id + '::' + s, name: s, owner: r.owner }, subMembers, { _child: true }))
      }
    }
  }
  // KPI row — union of the tab's tagged entities (deduped), scaled for the date range.
  const taggedEnts = [...new Map(filteredTags.flatMap((r) => r._members).map((e) => [e.id, e])).values()]
  const taggedPrev = taggedEnts.map((e) => prevMap[e.id])

  const saveCreated = (next) => { createdStore.set('tags-' + kind, next); setCreated(next) }
  const patchTag = (tag, patch) => {
    if (tag.user) saveCreated(created.map((t) => (t.id === tag.id ? { ...t, ...patch } : t)))
    else setOverrides((o) => ({ ...o, [tag.id]: { ...o[tag.id], ...patch } }))
  }
  const deleteTag = (tag) => {
    if (tag.user) saveCreated(created.filter((t) => t.id !== tag.id))
    else setOverrides((o) => ({ ...o, [tag.id]: { ...o[tag.id], deleted: true } }))
    toast(`Tag “${tag.name}” deleted`)
  }
  const createTags = (names) => {
    const stamped = names.map((n, i) => ({ id: 'TAGNEW' + (Date.now() + i).toString().slice(-8), name: n, owner: TAGS_OWNERS[0], sub: [], matchRule: null, members: [] }))
    saveCreated([...stamped, ...created])
    toast(`Created ${stamped.length} tag${stamped.length === 1 ? '' : 's'}`)
  }
  const saveRule = (rule) => { patchTag(ruleTag, { matchRule: rule }); setRuleTag(null); toast(`Match Tag Rule ${rule ? 'saved' : 'cleared'} — membership recalculated`) }
  const bulkDelete = () => {
    const byId = Object.fromEntries(parentRows.map((r) => [r.id, r]))
    const targets = [...sel].map((id) => byId[id]).filter(Boolean).map((r) => r._tag)
    const userIds = new Set(targets.filter((t) => t.user).map((t) => t.id))
    const seedIds = targets.filter((t) => !t.user).map((t) => t.id)
    if (userIds.size) saveCreated(created.filter((t) => !userIds.has(t.id)))
    if (seedIds.length) setOverrides((o) => { const n = { ...o }; seedIds.forEach((id) => { n[id] = { ...n[id], deleted: true } }); return n })
    setSel(new Set())
    toast(`Deleted ${targets.length} tag${targets.length === 1 ? '' : 's'}`)
  }
  const toggleSel = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSel((s) => (s.size === filteredTags.length ? new Set() : new Set(filteredTags.map((r) => r.id))))
  const toggleExpand = (id) => setExpandedTags((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const noun = entDef.noun
  const columns = [
    { key: 'name', label: 'Tag Name', sticky: true, width: 260, sortVal: (r) => r.name, render: (r) => (
      <div className="namecell" style={r._child ? { paddingLeft: 24 } : undefined}>
        <div className="nc-top">
          {!r._child && kind !== 'keyword' && (r._tag.sub || []).length > 0 && (
            <span style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }} title={expandedTags.has(r.id) ? 'Collapse sub tags' : 'Expand sub tags'} onClick={() => toggleExpand(r.id)}>
              <Icon name={expandedTags.has(r.id) ? 'chevDown' : 'chevRight'} size={13} />
            </span>
          )}
          <span style={{ fontWeight: r._child ? 500 : 600 }}>{r.name}</span>
          {r._child && <span className="tag">Sub Tag</span>}
          {!r._child && r._tag.matchRule && <span className="tag" title={`Match Tag Rule: contains ${(r._tag.matchRule.contains || []).join(', ') || '—'}${(r._tag.matchRule.notContains || []).length ? ` · not ${(r._tag.matchRule.notContains).join(', ')}` : ''}`}><Icon name="sliders" size={10} /></span>}
          {!r._child && r._tag.user && <span className="tag">USER</span>}
        </div>
        {!r._child && kind === 'keyword' && r.desc && <small>{r.desc}</small>}
      </div>
    ) },
    { key: 'owner', label: 'Owner', render: (r) => (r._child ? '' : <span className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="users" size={12} />{r.owner}</span>) },
    { key: 'count', label: noun, num: true, foot: (rs) => int(tagsSum('count')(rs)), render: (r) => (
      kind === 'campaign' && !r._child
        ? <Link className="celllink" to={`/ads/campaigns?tag=${encodeURIComponent(r.name)}`} title="View tagged campaigns in the Campaign grid">{int(r.count)}</Link>
        : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{kind === 'keyword' && !r._child && <Icon name="eye" size={12} style={{ color: 'var(--text-3)' }} />}{int(r.count)}</span>
    ) },
    { key: 'impr', label: 'Impr.', num: true, delta: true, foot: (rs) => compact(tagsSum('impr')(rs)), render: (r) => compact(r.impr) },
    { key: 'clk', label: 'Clk.', num: true, delta: true, foot: (rs) => int(tagsSum('clk')(rs)), render: (r) => int(r.clk) },
    { key: 'ctr', label: 'CTR', num: true, foot: (rs) => { const i = tagsSum('impr')(rs); return pct(i ? (tagsSum('clk')(rs) / i) * 100 : 0, 2) }, render: (r) => pct(r.ctr, 2) },
    { key: 'spend', label: 'Spend', num: true, delta: true, foot: tagsMoneyFoot('spend'), render: (r) => `${cur(r.spend, r._sym)}${r._est ? '*' : ''}` },
    { key: 'sales', label: 'Sales', num: true, delta: true, foot: tagsMoneyFoot('sales'), render: (r) => `${cur(r.sales, r._sym)}${r._est ? '*' : ''}` },
    { key: 'roas', label: 'ROAS', num: true, delta: true, foot: (rs) => { const s = tagsSum('spend')(rs); return dec2(s ? tagsSum('sales')(rs) / s : 0) }, render: (r) => dec2(r.roas) },
    { key: 'act', label: '', sort: false, render: (r) => (r._child ? '' : (
      <Popover align="right" width={180} trigger={<Btn sm ghost icon="dots" />}>
        {(close) => (
          <div className="colmenu"><div className="cm-list">
            <div className="cm-opt" onClick={() => { setRuleTag(r._tag); close() }}>Match Tag Rule</div>
            {kind === 'campaign' && <div className="cm-opt" onClick={() => { close(); nav(`/ads/campaigns?tag=${encodeURIComponent(r.name)}`) }}>View campaigns</div>}
            <div className="cm-opt" style={{ color: 'var(--red)' }} onClick={() => { deleteTag(r._tag); close() }}>Delete tag</div>
          </div></div>
        )}
      </Popover>
    )) },
  ]

  return (
    <>
      <AdsHead title="Tagging" sub={`${filteredTags.length} ${tab.toLowerCase()} · ${rangeResolved.label} · membership derived from Match Tag Rules + manual assignments`}>
        <ExportMenu name={'tags-' + kind} fields={TAGS_FIELDS} rows={filteredTags} />
        <Btn icon="file" onClick={() => nav(`/ads/bulk?tab=${encodeURIComponent('Create Tag')}`)}>Bulk Create Tag</Btn>
        <Btn icon="tag" primary onClick={() => setManage(true)}>Manage Tag</Btn>
      </AdsHead>
      {tabsBar}
      <KpiRow rows={taggedEnts} prev={taggedPrev} />
      {sel.size > 0 && (
        <div className="bulkbar">
          <span className="sel">{sel.size} selected</span>
          <Btn sm icon="x" onClick={bulkDelete}>Delete Tags</Btn>
          <div style={{ flex: 1 }} />
          <Btn sm ghost onClick={() => setSel(new Set())}>Clear</Btn>
        </div>
      )}
      {manage && <TagManageModal kind={kind} tags={tags} onCreate={createTags} onDelete={deleteTag} onPatch={patchTag} onClose={() => setManage(false)} />}
      {ruleTag && <TagRuleModal kind={kind} tag={ruleTag} onSave={saveRule} onClose={() => setRuleTag(null)} />}
      <DataGrid
        id={'ads-tags-' + kind}
        columns={columns}
        rows={gridRows}
        totals
        compare
        comparePrev={prevRowsById}
        compareDisabled={rangeResolved.label === 'All time'}
        selectable
        selected={sel}
        onToggle={toggleSel}
        onToggleAll={toggleAll}
        toolbarLeft={<>
          <SearchBox value={q} onChange={setQ} placeholder="Search tags…" />
          <FilterBar id={'ads-tags-' + kind} fields={TAGS_FIELDS} value={filters} onChange={setFilters} />
        </>}
      />
      <div className="footnote">Tags auto-collect {noun.toLowerCase()} via <b>Match Tag Rules</b> (name contains / does not contain — row ⋮ menu). <b>Manage Tag</b> batch-creates tags & sub tags; ▶ expands sub-tag rollups{kind === 'campaign' ? '; the count links open the Campaign grid filtered to the tag' : ''}. Metrics aggregate the tagged {noun.toLowerCase()} for the selected date range.</div>
    </>
  )
}

export function Tagging() {
  const [tab, setTab] = useState(TAGS_TABS[0])
  return (
    <TaggingTab key={tab} tab={tab} tabsBar={
      <div className="viewtabs" style={{ maxWidth: 420 }}>
        {TAGS_TABS.map((t) => (
          <div key={t} className={`viewtab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</div>
        ))}
      </div>
    } />
  )
}

/* ==================================================================================
   ADVERTISING GRID FAMILY — Profile (E4) · Portfolio · Placement · ASIN · Ads (E5)
   Faithful to product.pacvue.com Advertising nav (FUNCTIONALITY-SPEC §11). Each grid is
   a rollup over the date-range-scaled campaign set, with real vs-prev deltas, saved Plans,
   column presets, export, and mixed-currency USD estimates (profile = All).
   ================================================================================== */

// Roll a set of (already scaled) campaigns up by a key → one aggregate row per group.
// meta(key, groupRows, agg) adds label/derived fields. Each row carries the additive base
// metrics (impr/clk/spend/sales/orders/units) so DataGrid `foot` totals via aggregate().
function adRollup(camps, keyOf, meta) {
  const map = new Map()
  for (const c of camps) { const k = keyOf(c); if (k == null) continue; if (!map.has(k)) map.set(k, []); map.get(k).push(c) }
  return [...map.entries()].map(([k, rs]) => { const a = aggregate(rs); return { id: k, _n: rs.length, ...a, ...(meta ? meta(k, rs, a) : {}) } })
}
// Convert campaign money fields to USD — used when a rollup row spans currencies (profile = All).
const adToUsd = (rs) => rs.map((r) => ({ ...r, spend: (r.spend || 0) * fxUSD(r.profileId), sales: (r.sales || 0) * fxUSD(r.profileId), dailyBudget: (r.dailyBudget || 0) * fxUSD(r.profileId) }))
// Shared metric columns for the cross-profile rollup grids (money rendered in `sym`; `note`
// appends "(USD est.)" on money totals when the set is mixed-currency).
function adMetricCols(sym, note) {
  const M = (v, dec) => cur(v, sym, dec || 0)
  return [
    { key: 'impr', label: 'Impr.', num: true, delta: true, foot: (rs) => compact(aggregate(rs).impr), render: (r) => compact(r.impr) },
    { key: 'clk', label: 'Clicks', num: true, delta: true, foot: (rs) => int(aggregate(rs).clk), render: (r) => int(r.clk) },
    { key: 'ctr', label: 'CTR', num: true, foot: (rs) => pct(aggregate(rs).ctr, 2), render: (r) => pct(r.ctr, 2) },
    { key: 'spend', label: 'Spend', num: true, delta: true, foot: (rs) => M(aggregate(rs).spend) + (note || ''), render: (r) => M(r.spend) },
    { key: 'cpc', label: 'CPC', num: true, foot: (rs) => M(aggregate(rs).cpc, 2), render: (r) => M(r.cpc, 2) },
    { key: 'sales', label: 'Sales', num: true, delta: true, foot: (rs) => M(aggregate(rs).sales) + (note || ''), render: (r) => M(r.sales) },
    { key: 'orders', label: 'Orders', num: true, delta: true, foot: (rs) => int(aggregate(rs).orders), render: (r) => int(r.orders) },
    { key: 'cvr', label: 'CVR', num: true, foot: (rs) => pct(aggregate(rs).cvr), render: (r) => pct(r.cvr) },
    { key: 'cpa', label: 'CPA', num: true, foot: (rs) => M(aggregate(rs).cpa, 2), render: (r) => M(r.cpa, 2) },
    { key: 'acos', label: 'ACoS', num: true, delta: true, foot: (rs) => pct(aggregate(rs).acos), render: (r) => <span style={{ color: r.acos > 40 ? 'var(--red)' : r.acos < 25 ? 'var(--green)' : 'inherit', fontWeight: 600 }}>{pct(r.acos)}</span> },
    { key: 'roas', label: 'ROAS', num: true, delta: true, foot: (rs) => dec2(aggregate(rs).roas), render: (r) => dec2(r.roas) },
    { key: 'aov', label: 'AOV', num: true, foot: (rs) => M(aggregate(rs).aov, 2), render: (r) => M(r.aov, 2) },
  ]
}
// Per-row native-currency metric columns (for grids whose rows are each a single profile —
// money renders in that row's currency; totals convert to USD est. across profiles via
// adsMoneyFoot). Used by the Ads grid (rows are 1:1 with campaigns).
function adNativeMetricCols() {
  return [
    { key: 'impr', label: 'Impr.', num: true, delta: true, foot: (rs) => compact(aggregate(rs).impr), render: (r) => compact(r.impr) },
    { key: 'clk', label: 'Clicks', num: true, delta: true, foot: (rs) => int(aggregate(rs).clk), render: (r) => int(r.clk) },
    { key: 'ctr', label: 'CTR', num: true, foot: (rs) => pct(aggregate(rs).ctr, 2), render: (r) => pct(r.ctr, 2) },
    { key: 'spend', label: 'Spend', num: true, delta: true, foot: adsMoneyFoot('spend'), render: (r) => cur(r.spend, symA(r.profileId)) },
    { key: 'cpc', label: 'CPC', num: true, foot: (rs) => cur(aggregate(rs).cpc, symOf(rs), 2), render: (r) => cur(r.cpc, symA(r.profileId), 2) },
    { key: 'sales', label: 'Sales', num: true, delta: true, foot: adsMoneyFoot('sales'), render: (r) => cur(r.sales, symA(r.profileId)) },
    { key: 'orders', label: 'Orders', num: true, delta: true, foot: (rs) => int(aggregate(rs).orders), render: (r) => int(r.orders) },
    { key: 'cvr', label: 'CVR', num: true, foot: (rs) => pct(aggregate(rs).cvr), render: (r) => pct(r.cvr) },
    { key: 'acos', label: 'ACoS', num: true, delta: true, foot: (rs) => pct(aggregate(rs).acos), render: (r) => <span style={{ color: r.acos > 40 ? 'var(--red)' : r.acos < 25 ? 'var(--green)' : 'inherit', fontWeight: 600 }}>{pct(r.acos)}</span> },
    { key: 'roas', label: 'ROAS', num: true, delta: true, foot: (rs) => dec2(aggregate(rs).roas), render: (r) => dec2(r.roas) },
    { key: 'aov', label: 'AOV', num: true, foot: (rs) => cur(aggregate(rs).aov, symOf(rs), 2), render: (r) => cur(r.aov, symA(r.profileId), 2) },
  ]
}

/* ============================ PROFILE (E4) ============================ */
const PROFILE_FIELDS = [
  { key: 'market', label: 'Profile', type: 'text' },
  { key: 'type', label: 'Account Type', type: 'enum', options: ['1P', '3P'] },
  { key: 'pacing', label: 'Pacing', type: 'enum', options: ['On pace', 'Over pace', 'Under pace'] },
  { key: 'dailyBudget', label: 'Daily Budget', type: 'number' },
  { key: 'spend', label: 'Spend', type: 'number' },
  { key: 'sales', label: 'Sales', type: 'number' },
  { key: 'acos', label: 'ACoS %', type: 'number' },
  { key: 'roas', label: 'ROAS', type: 'number' },
  { key: 'orders', label: 'Orders', type: 'number' },
  { key: 'impr', label: 'Impressions', type: 'number' },
]
export function ProfileGrid() {
  const { profileId, rangeResolved } = useApp()
  const base = useProfileFilter(ALL_CAMPAIGNS)
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState(() => loadFilterModel('ads-profile'))
  const { rows: scaled, prev } = useMemo(() => scaleForRange(base, rangeResolved), [base, rangeResolved])
  const prevCamps = useMemo(() => scaled.map((c) => prev[c.id]).filter(Boolean), [scaled, prev])
  const budgetBy = useMemo(() => Object.fromEntries(budgets.map((b) => [b.profileId, b])), [])
  const meta = (pid, rs) => {
    const p = profileById[pid] || {}; const b = budgetBy[pid] || {}
    return {
      profileId: pid, market: p.market || pid, type: p.type || '', cc: p.cc || String(pid).toUpperCase(), currency: p.currency || '$',
      active: rs.filter((c) => c.state === 'Enabled').length, total: rs.length,
      dailyBudget: rs.reduce((a, c) => a + (c.dailyBudget || 0), 0),
      monthlyCap: b.monthlyCap || 0, pacing: b.status || '—',
    }
  }
  const rows0 = useMemo(() => adRollup(scaled, (c) => c.profileId, meta), [scaled])
  const prevRows = useMemo(() => adRollup(prevCamps, (c) => c.profileId, meta), [prevCamps])
  const prevMap = useMemo(() => Object.fromEntries(prevRows.map((r) => [r.id, r])), [prevRows])
  const searched = rows0.filter((r) => r.market.toLowerCase().includes(q.toLowerCase()))
  const filtered = applyFilters(searched, filters, PROFILE_FIELDS)
  const prevFiltered = filtered.map((r) => prevMap[r.id])

  const columns = [
    { key: 'market', label: 'Profile', sticky: true, width: 260, sortVal: (r) => r.market, render: (r) => (
      <div className="namecell"><div className="nc-top"><Link className="celllink" to="/ads/campaigns" title="View campaigns for this profile">{r.market}</Link><span className="tag">{r.type}</span></div><small>{r.cc} · {r.active}/{r.total} active · {r.currency}</small></div>) },
    { key: 'campaigns', label: 'Campaigns', num: true, sort: false, foot: (rs) => int(rs.reduce((a, r) => a + (r.total || 0), 0)), render: (r) => <span className="muted">{r.active}/{r.total}</span> },
    { key: 'dailyBudget', label: 'Daily Budget', num: true, foot: adsMoneyFoot('dailyBudget'), render: (r) => cur(r.dailyBudget, symA(r.profileId)) },
    { key: 'monthlyCap', label: 'Monthly Cap', num: true, foot: adsMoneyFoot('monthlyCap'), render: (r) => cur(r.monthlyCap, symA(r.profileId)) },
    { key: 'impr', label: 'Impr.', num: true, delta: true, foot: (rs) => compact(aggregate(rs).impr), render: (r) => compact(r.impr) },
    { key: 'clk', label: 'Clicks', num: true, delta: true, foot: (rs) => int(aggregate(rs).clk), render: (r) => int(r.clk) },
    { key: 'ctr', label: 'CTR', num: true, foot: (rs) => pct(aggregate(rs).ctr, 2), render: (r) => pct(r.ctr, 2) },
    { key: 'spend', label: 'Spend', num: true, delta: true, foot: adsMoneyFoot('spend'), render: (r) => cur(r.spend, symA(r.profileId)) },
    { key: 'cpc', label: 'CPC', num: true, foot: (rs) => cur(aggregate(rs).cpc, symOf(rs), 2), render: (r) => cur(r.cpc, symA(r.profileId), 2) },
    { key: 'sales', label: 'Sales', num: true, delta: true, foot: adsMoneyFoot('sales'), render: (r) => cur(r.sales, symA(r.profileId)) },
    { key: 'orders', label: 'Orders', num: true, delta: true, foot: (rs) => int(aggregate(rs).orders), render: (r) => int(r.orders) },
    { key: 'cvr', label: 'CVR', num: true, foot: (rs) => pct(aggregate(rs).cvr), render: (r) => pct(r.cvr) },
    { key: 'acos', label: 'ACoS', num: true, delta: true, foot: (rs) => pct(aggregate(rs).acos), render: (r) => <span style={{ color: r.acos > 40 ? 'var(--red)' : r.acos < 25 ? 'var(--green)' : 'inherit', fontWeight: 600 }}>{pct(r.acos)}</span> },
    { key: 'roas', label: 'ROAS', num: true, delta: true, foot: (rs) => dec2(aggregate(rs).roas), render: (r) => dec2(r.roas) },
    { key: 'aov', label: 'AOV', num: true, foot: (rs) => cur(aggregate(rs).aov, symOf(rs), 2), render: (r) => cur(r.aov, symA(r.profileId), 2) },
    { key: 'pacing', label: 'Pacing', sort: false, render: (r) => <Pill>{r.pacing}</Pill> },
  ]
  const presets = {
    Performance: ['market', 'impr', 'clk', 'ctr', 'spend', 'cpc', 'sales', 'orders', 'cvr', 'acos', 'roas'],
    Budget: ['market', 'campaigns', 'dailyBudget', 'monthlyCap', 'spend', 'sales', 'acos', 'roas', 'pacing'],
    'Default Plan': ['market', 'campaigns', 'dailyBudget', 'monthlyCap', 'impr', 'clk', 'spend', 'cpc', 'sales', 'orders', 'acos', 'roas', 'aov', 'pacing'],
  }
  const dims = [{ key: 'type', label: 'Account Type (1P/3P)' }, { key: 'pacing', label: 'Pacing Status' }]
  return (
    <>
      <AdsHead title="Profile" sub={`${filtered.length} profile${filtered.length === 1 ? '' : 's'} · ${rangeResolved.label} · account-level rollup across all campaigns`}>
        <ExportMenu name="profiles" fields={PROFILE_FIELDS} rows={filtered} />
      </AdsHead>
      <KpiRow rows={filtered} prev={prevFiltered} />
      <DataGrid
        id="ads-profile" columns={columns} rows={filtered}
        initialSort={{ key: 'spend', dir: 'desc' }} presets={presets} defaultPreset="Default Plan"
        dimensions={dims} totals compare comparePrev={prevMap} compareDisabled={rangeResolved.label === 'All time'}
        toolbarLeft={<>
          <SearchBox value={q} onChange={setQ} placeholder="Search profiles…" />
          <FilterBar id="ads-profile" fields={PROFILE_FIELDS} value={filters} onChange={setFilters} />
        </>}
      />
      <div className="footnote">Profile is the account/marketplace rollup — every campaign's spend, sales and efficiency aggregated per Amazon profile, with monthly budget caps and pacing status. Money totals across profiles are shown as USD estimates. Use the global Profile selector to scope, or the compare toggle for period-over-period deltas.</div>
    </>
  )
}

/* ============================ PORTFOLIO (E5) ============================ */
const PORTFOLIO_FIELDS = [
  { key: 'name', label: 'Portfolio', type: 'enum', options: ['Always-On', 'New Launch', 'Brand Defense', 'Competitor Conquest', 'Seasonal'] },
  { key: 'dailyBudget', label: 'Daily Budget', type: 'number' },
  { key: 'spend', label: 'Spend', type: 'number' },
  { key: 'sales', label: 'Sales', type: 'number' },
  { key: 'acos', label: 'ACoS %', type: 'number' },
  { key: 'roas', label: 'ROAS', type: 'number' },
  { key: 'orders', label: 'Orders', type: 'number' },
]
export function PortfolioGrid() {
  const { profileId, rangeResolved } = useApp()
  const base = useProfileFilter(ALL_CAMPAIGNS)
  const mixed = adsMixedCur(base)
  const dispSym = mixed ? '$' : symOf(base)
  const note = mixed ? ' (USD est.)' : ''
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState(() => loadFilterModel('ads-portfolio'))
  const { rows: scaled0, prev } = useMemo(() => scaleForRange(base, rangeResolved), [base, rangeResolved])
  const scaled = useMemo(() => (mixed ? adToUsd(scaled0) : scaled0), [scaled0, mixed])
  const prevCamps = useMemo(() => { const p = scaled0.map((c) => prev[c.id]).filter(Boolean); return mixed ? adToUsd(p) : p }, [scaled0, prev, mixed])
  const meta = (k, rs) => ({ name: k, total: rs.length, dailyBudget: rs.reduce((a, c) => a + (c.dailyBudget || 0), 0) })
  const rows0 = useMemo(() => adRollup(scaled, (c) => c.portfolio, meta), [scaled])
  const prevRows = useMemo(() => adRollup(prevCamps, (c) => c.portfolio, meta), [prevCamps])
  const prevMap = useMemo(() => Object.fromEntries(prevRows.map((r) => [r.id, r])), [prevRows])
  const searched = rows0.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
  const filtered = applyFilters(searched, filters, PORTFOLIO_FIELDS)
  const prevFiltered = filtered.map((r) => prevMap[r.id])

  const columns = [
    { key: 'name', label: 'Portfolio', sticky: true, width: 240, sortVal: (r) => r.name, render: (r) => (
      <div className="namecell"><div className="nc-top"><Link className="celllink" to="/ads/campaigns" title="View campaigns">{r.name}</Link></div><small>{r.total} campaign{r.total === 1 ? '' : 's'}</small></div>) },
    { key: 'campaigns', label: 'Campaigns', num: true, sort: false, foot: (rs) => int(rs.reduce((a, r) => a + (r.total || 0), 0)), render: (r) => <span className="muted">{r.total}</span> },
    { key: 'dailyBudget', label: 'Daily Budget', num: true, foot: (rs) => cur(rs.reduce((a, r) => a + (r.dailyBudget || 0), 0), dispSym) + note, render: (r) => cur(r.dailyBudget, dispSym) },
    ...adMetricCols(dispSym, note),
  ]
  const presets = {
    Performance: ['name', 'impr', 'clk', 'ctr', 'spend', 'cpc', 'sales', 'orders', 'cvr', 'acos', 'roas'],
    'Default Plan': ['name', 'campaigns', 'dailyBudget', 'impr', 'clk', 'spend', 'cpc', 'sales', 'orders', 'cvr', 'acos', 'roas', 'aov'],
  }
  return (
    <>
      <AdsHead title="Portfolio" sub={`${filtered.length} portfolio${filtered.length === 1 ? '' : 's'} · ${rangeResolved.label}${mixed ? ' · USD est.' : ''} · campaign groupings`}>
        <ExportMenu name="portfolios" fields={PORTFOLIO_FIELDS} rows={filtered} />
      </AdsHead>
      <KpiRow rows={filtered} prev={prevFiltered} />
      <DataGrid
        id="ads-portfolio" columns={columns} rows={filtered}
        initialSort={{ key: 'spend', dir: 'desc' }} presets={presets} defaultPreset="Default Plan"
        totals compare comparePrev={prevMap} compareDisabled={rangeResolved.label === 'All time'}
        toolbarLeft={<>
          <SearchBox value={q} onChange={setQ} placeholder="Search portfolios…" />
          <FilterBar id="ads-portfolio" fields={PORTFOLIO_FIELDS} value={filters} onChange={setFilters} />
        </>}
      />
      <div className="footnote">Portfolios group campaigns for budgeting and reporting (Pacvue's alternative to Amazon portfolios). Each row aggregates its campaigns' performance for the selected date range. Save filter sets as Plans; toggle compare for period deltas.</div>
    </>
  )
}

/* ============================ PLACEMENT (E5) ============================ */
// Synthetic placement breakdown of the campaign set (Top of Search / Product Pages / Rest
// of Search), split by deterministic per-metric weights so each placement carries a
// realistic distinct ACoS/CVR. Bid Adjustment = the placement modifier % applied.
const PLACEMENTS_DEF = [
  { key: 'Top of Search', bidAdj: 25, w: { impr: 0.40, clk: 0.46, spend: 0.45, sales: 0.55, orders: 0.55, units: 0.55 } },
  { key: 'Product Pages', bidAdj: 10, w: { impr: 0.38, clk: 0.32, spend: 0.33, sales: 0.30, orders: 0.28, units: 0.28 } },
  { key: 'Rest of Search', bidAdj: 0, w: { impr: 0.22, clk: 0.22, spend: 0.22, sales: 0.15, orders: 0.17, units: 0.17 } },
]
function placementRows(camps) {
  const t = aggregate(camps)
  return PLACEMENTS_DEF.map((pd) => {
    const impr = Math.round((t.impr || 0) * pd.w.impr), clk = Math.round((t.clk || 0) * pd.w.clk)
    const spend = (t.spend || 0) * pd.w.spend, sales = (t.sales || 0) * pd.w.sales
    const orders = Math.round((t.orders || 0) * pd.w.orders), units = Math.round((t.units || 0) * pd.w.units)
    return {
      id: pd.key, name: pd.key, bidAdj: pd.bidAdj, impr, clk, spend, sales, orders, units,
      ctr: impr ? (clk / impr) * 100 : 0, cpc: clk ? spend / clk : 0, acos: sales ? (spend / sales) * 100 : 0,
      roas: spend ? sales / spend : 0, cvr: clk ? (orders / clk) * 100 : 0, cpa: orders ? spend / orders : 0, aov: orders ? sales / orders : 0,
    }
  })
}
const PLACEMENT_FIELDS = [
  { key: 'name', label: 'Placement', type: 'enum', options: ['Top of Search', 'Product Pages', 'Rest of Search'] },
  { key: 'spend', label: 'Spend', type: 'number' },
  { key: 'sales', label: 'Sales', type: 'number' },
  { key: 'acos', label: 'ACoS %', type: 'number' },
  { key: 'roas', label: 'ROAS', type: 'number' },
]
export function PlacementGrid() {
  const { profileId, rangeResolved } = useApp()
  const base = useProfileFilter(ALL_CAMPAIGNS)
  const mixed = adsMixedCur(base)
  const dispSym = mixed ? '$' : symOf(base)
  const note = mixed ? ' (USD est.)' : ''
  const [filters, setFilters] = useState(() => loadFilterModel('ads-placement'))
  const { rows: scaled0, prev } = useMemo(() => scaleForRange(base, rangeResolved), [base, rangeResolved])
  const scaled = useMemo(() => (mixed ? adToUsd(scaled0) : scaled0), [scaled0, mixed])
  const prevCamps = useMemo(() => { const p = scaled0.map((c) => prev[c.id]).filter(Boolean); return mixed ? adToUsd(p) : p }, [scaled0, prev, mixed])
  const rows0 = useMemo(() => placementRows(scaled), [scaled])
  const prevMap = useMemo(() => Object.fromEntries(placementRows(prevCamps).map((r) => [r.id, r])), [prevCamps])
  const filtered = applyFilters(rows0, filters, PLACEMENT_FIELDS)
  const prevFiltered = filtered.map((r) => prevMap[r.id])

  const columns = [
    { key: 'name', label: 'Placement', sticky: true, width: 200, sortVal: (r) => r.name, render: (r) => <b>{r.name}</b> },
    { key: 'bidAdj', label: 'Bid Adjustment', num: true, sortVal: (r) => r.bidAdj, foot: () => '—', render: (r) => (r.bidAdj > 0 ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>+{r.bidAdj}%</span> : <span className="muted">—</span>) },
    ...adMetricCols(dispSym, note),
  ]
  const presets = {
    Performance: ['name', 'bidAdj', 'impr', 'clk', 'ctr', 'spend', 'cpc', 'sales', 'orders', 'cvr', 'acos', 'roas'],
    'Default Plan': ['name', 'bidAdj', 'impr', 'clk', 'spend', 'cpc', 'sales', 'orders', 'cvr', 'acos', 'roas', 'aov'],
  }
  return (
    <>
      <AdsHead title="Placement" sub={`Top of Search · Product Pages · Rest of Search · ${rangeResolved.label}${mixed ? ' · USD est.' : ''}`}>
        <ExportMenu name="placements" fields={PLACEMENT_FIELDS} rows={filtered} />
      </AdsHead>
      <KpiRow rows={filtered} prev={prevFiltered} />
      <DataGrid
        id="ads-placement" columns={columns} rows={filtered}
        initialSort={{ key: 'spend', dir: 'desc' }} presets={presets} defaultPreset="Default Plan"
        totals compare comparePrev={prevMap} compareDisabled={rangeResolved.label === 'All time'}
        toolbarLeft={<FilterBar id="ads-placement" fields={PLACEMENT_FIELDS} value={filters} onChange={setFilters} />}
      />
      <div className="footnote">Placement shows where impressions served — Top of Search converts hardest and carries the placement bid multiplier. Adjust Top-of-Search / Product-Pages modifiers on the campaign to shift this mix. Money totals across profiles are USD estimates.</div>
    </>
  )
}

/* ============================ ASIN — advertised product (E5) ============================ */
const ASIN_FIELDS = [
  { key: 'asin', label: 'ASIN', type: 'text' },
  { key: 'title', label: 'Product', type: 'text' },
  { key: 'spend', label: 'Spend', type: 'number' },
  { key: 'sales', label: 'Sales', type: 'number' },
  { key: 'acos', label: 'ACoS %', type: 'number' },
  { key: 'roas', label: 'ROAS', type: 'number' },
  { key: 'orders', label: 'Orders', type: 'number' },
]
export function AsinGrid() {
  const { profileId, rangeResolved } = useApp()
  const base = useProfileFilter(ALL_CAMPAIGNS)
  const mixed = adsMixedCur(base)
  const dispSym = mixed ? '$' : symOf(base)
  const note = mixed ? ' (USD est.)' : ''
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState(() => loadFilterModel('ads-asin'))
  const { rows: scaled0, prev } = useMemo(() => scaleForRange(base, rangeResolved), [base, rangeResolved])
  const scaled = useMemo(() => (mixed ? adToUsd(scaled0) : scaled0), [scaled0, mixed])
  const prevCamps = useMemo(() => { const p = scaled0.map((c) => prev[c.id]).filter(Boolean); return mixed ? adToUsd(p) : p }, [scaled0, prev, mixed])
  const meta = (k, rs, a) => ({ asin: k, title: rs[0].product || k, total: rs.length, asp: a.units ? a.sales / a.units : 0 })
  const rows0 = useMemo(() => adRollup(scaled, (c) => c.asin, meta), [scaled])
  const prevRows = useMemo(() => adRollup(prevCamps, (c) => c.asin, meta), [prevCamps])
  const prevMap = useMemo(() => Object.fromEntries(prevRows.map((r) => [r.id, r])), [prevRows])
  const searched = rows0.filter((r) => (r.asin + ' ' + r.title).toLowerCase().includes(q.toLowerCase()))
  const filtered = applyFilters(searched, filters, ASIN_FIELDS)
  const prevFiltered = filtered.map((r) => prevMap[r.id])

  const columns = [
    { key: 'asin', label: 'Advertised Product', sticky: true, width: 320, sortVal: (r) => r.title, render: (r) => (
      <div className="namecell"><div className="nc-top"><Link className="celllink" to="/commerce/products" title="Open in Product Center">{r.asin}</Link></div><small>{(r.title || '').split('—')[0].trim()} · {r.total} camp.</small></div>) },
    ...adMetricCols(dispSym, note),
    { key: 'units', label: 'Units', num: true, foot: (rs) => int(aggregate(rs).units), render: (r) => int(r.units) },
    { key: 'asp', label: 'ASP', num: true, foot: (rs) => { const a = aggregate(rs); return cur(a.units ? a.sales / a.units : 0, dispSym, 2) }, render: (r) => cur(r.asp, dispSym, 2) },
  ]
  const presets = {
    Performance: ['asin', 'impr', 'clk', 'ctr', 'spend', 'cpc', 'sales', 'orders', 'cvr', 'acos', 'roas'],
    'Default Plan': ['asin', 'impr', 'clk', 'spend', 'cpc', 'sales', 'orders', 'cvr', 'acos', 'roas', 'units', 'asp'],
  }
  return (
    <>
      <AdsHead title="ASIN" sub={`${filtered.length} advertised product${filtered.length === 1 ? '' : 's'} · ${rangeResolved.label}${mixed ? ' · USD est.' : ''} · ad performance by product`}>
        <ExportMenu name="asins" fields={ASIN_FIELDS} rows={filtered} />
      </AdsHead>
      <KpiRow rows={filtered} prev={prevFiltered} />
      <DataGrid
        id="ads-asin" columns={columns} rows={filtered}
        initialSort={{ key: 'spend', dir: 'desc' }} presets={presets} defaultPreset="Default Plan"
        totals compare comparePrev={prevMap} compareDisabled={rangeResolved.label === 'All time'}
        toolbarLeft={<>
          <SearchBox value={q} onChange={setQ} placeholder="Search ASIN or product…" />
          <FilterBar id="ads-asin" fields={ASIN_FIELDS} value={filters} onChange={setFilters} />
        </>}
      />
      <div className="footnote">ASIN rolls advertising performance up to the advertised product — the same ASIN promoted across many campaigns, unified. Pair with Commerce → Product Center for the digital-shelf view. Money totals across profiles are USD estimates.</div>
    </>
  )
}

/* ============================ ADS — creatives (E5) ============================ */
const AD_KIND = { 'SP-Auto': 'SP Product ad', 'SP-Manual': 'SP Product ad', SB: 'SB Headline', SBV: 'SB Video', 'SD-Product': 'SD Product ad', 'SD-Audience': 'SD Audience ad' }
const ADS_FIELDS = [
  { key: 'adName', label: 'Ad', type: 'text' },
  { key: 'adType', label: 'Ad Type', type: 'enum', options: ['SP Product ad', 'SB Headline', 'SB Video', 'SD Product ad', 'SD Audience ad'] },
  { key: 'state', label: 'State', type: 'enum', options: ['Enabled', 'Paused'] },
  { key: 'asin', label: 'ASIN', type: 'text' },
  { key: 'campaign', label: 'Campaign', type: 'text' },
  { key: 'spend', label: 'Spend', type: 'number' },
  { key: 'sales', label: 'Sales', type: 'number' },
  { key: 'acos', label: 'ACoS %', type: 'number' },
  { key: 'roas', label: 'ROAS', type: 'number' },
]
function adRowsFrom(camps) {
  return camps.map((c) => ({ ...c, id: 'AD-' + c.id, adName: (c.product || '').split('—')[0].trim(), adType: AD_KIND[c.campaignType] || 'SP Product ad', campaign: c.name }))
}
export function AdsGrid() {
  const { profileId, rangeResolved } = useApp()
  const base = useProfileFilter(ALL_CAMPAIGNS)
  const mixed = adsMixedCur(base)
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState(() => loadFilterModel('ads-ads'))
  // Ad rows are 1:1 with campaigns, so each carries its own profileId/currency — keep money
  // native per row (like the Campaigns grid) and let KpiRow + adsMoneyFoot convert totals to
  // USD est. Do NOT pre-convert to USD here (that would double-convert in KpiRow).
  const { rows: scaled0, prev } = useMemo(() => scaleForRange(base, rangeResolved), [base, rangeResolved])
  const prevCamps = useMemo(() => scaled0.map((c) => prev[c.id]).filter(Boolean), [scaled0, prev])
  const rows0 = useMemo(() => adRowsFrom(scaled0), [scaled0])
  const prevMap = useMemo(() => Object.fromEntries(adRowsFrom(prevCamps).map((r) => [r.id, r])), [prevCamps])
  const searched = rows0.filter((r) => (r.adName + ' ' + r.campaign).toLowerCase().includes(q.toLowerCase()))
  const filtered = applyFilters(searched, filters, ADS_FIELDS)
  const prevFiltered = filtered.map((r) => prevMap[r.id])
  const typeTone2 = (t) => (t.startsWith('SP') ? 'blue' : t.startsWith('SB') ? 'purple' : 'amber')

  const columns = [
    { key: 'adName', label: 'Ad', sticky: true, width: 300, sortVal: (r) => r.adName, render: (r) => (
      <div className="namecell"><div className="nc-top"><Link className="celllink" to={`/ads/adgroups?camp=${r.id.replace('AD-', '')}`} title="Drill into ad groups">{r.adName}</Link></div><small>{r.profileId.toUpperCase()} · {r.campaign?.split('-').slice(0, 2).join('-')}</small></div>) },
    { key: 'adType', label: 'Ad Type', render: (r) => <span className={`pill ${typeTone2(r.adType)}`} style={{ borderRadius: 5 }}>{r.adType}</span> },
    { key: 'state', label: 'State', render: (r) => <Pill>{r.state}</Pill> },
    { key: 'asin', label: 'ASIN', sort: false, render: (r) => <span className="muted">{r.asin}</span> },
    ...adNativeMetricCols(),
  ]
  const presets = {
    Performance: ['adName', 'adType', 'state', 'impr', 'clk', 'ctr', 'spend', 'cpc', 'sales', 'orders', 'cvr', 'acos', 'roas'],
    'Default Plan': ['adName', 'adType', 'state', 'asin', 'impr', 'clk', 'spend', 'cpc', 'sales', 'orders', 'cvr', 'acos', 'roas'],
  }
  const dims = [{ key: 'adType', label: 'Ad Type' }, { key: 'campaignType', label: 'Campaign Type' }, { key: 'profileId', label: 'Profile' }]
  return (
    <>
      <AdsHead title="Ads" sub={`${filtered.length} ad${filtered.length === 1 ? '' : 's'} · ${rangeResolved.label}${mixed ? ' · USD est.' : ''} · creatives & product ads`}>
        <ExportMenu name="ads" fields={ADS_FIELDS} rows={filtered} />
      </AdsHead>
      <KpiRow rows={filtered} prev={prevFiltered} />
      <DataGrid
        id="ads-ads" columns={columns} rows={filtered}
        initialSort={{ key: 'spend', dir: 'desc' }} presets={presets} defaultPreset="Default Plan"
        dimensions={dims} totals compare comparePrev={prevMap} compareDisabled={rangeResolved.label === 'All time'}
        toolbarLeft={<>
          <SearchBox value={q} onChange={setQ} placeholder="Search ads…" />
          <FilterBar id="ads-ads" fields={ADS_FIELDS} value={filters} onChange={setFilters} />
        </>}
      />
      <div className="footnote">Ads is the creative level — product ads (SP/SD) and Sponsored Brands headlines & videos. Group by Ad Type to compare creative formats. Drill into a row to see its ad groups. Money totals across profiles are USD estimates.</div>
    </>
  )
}
