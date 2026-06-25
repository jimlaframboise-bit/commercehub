import { useState, useMemo, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Kpi, KpiGrid, Card, Pill, Toggle, Check, DataGrid, FilterBar, applyFilters, loadFilterModel, Btn, SearchBox, EditableNum, StateSelect, Modal, toast, createdStore, usePersistentOverrides, ExportMenu, scaleForRange } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import {
  campaigns as ALL_CAMPAIGNS, keywords, searchTerms, shareOfVoice, dayparting, DAYS,
  aggregate, profileById, rules as RULES,
} from '../data/mock.js'
import { compact, money, pct, dec2, cur, int } from '../lib/format.js'
import { useApp } from '../state.jsx'

const symA = (pid) => profileById[pid]?.currency || '$'
const typeTone = (t) => (t.startsWith('SP') ? 'blue' : t.startsWith('SB') ? 'purple' : 'amber')
const symOf = (rs) => (rs[0] ? symA(rs[0].profileId) : '$')
const sumKey = (k) => (rs) => rs.reduce((a, b) => a + (b[k] || 0), 0)

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
  { key: 'matchType', label: 'Match Type', type: 'enum', options: ['Broad', 'Phrase', 'Exact'] },
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

/* ---- bulk bid / budget math ---- */
const round2 = (n) => Math.round(n * 100) / 100
const applyBidOp = (cur, suggested, mode, amt) => {
  if (mode === 'set') return round2(amt)
  if (mode === 'inc') return round2(cur * (1 + amt / 100))
  if (mode === 'dec') return round2(cur * (1 - amt / 100))
  if (mode === 'suggested') return round2(suggested)
  if (mode === 'ceiling') return round2(Math.min(cur, amt))
  if (mode === 'floor') return round2(Math.max(cur, amt))
  return cur
}
const applyBudgetOp = (cur, mode, amt) => {
  if (mode === 'set') return round2(amt)
  if (mode === 'inc') return round2(cur * (1 + amt / 100))
  if (mode === 'dec') return round2(cur * (1 - amt / 100))
  return cur
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

function CreateCampaignWizard({ products, profileId, currency = '$', onClose, onLaunch }) {
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
        adGroups: { active: groupCount, total: groupCount }, dailyBudget: Number(f.dailyBudget),
        actlBid: Number(f.maxBid) || 1, avlBid: round2((Number(f.maxBid) || 1) * 1.3),
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
    <Modal width={640} title="Create Campaign" sub="Super Wizard — build one or many campaigns" onClose={onClose}
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

/* ---- Edit a user-created campaign (lightweight; the wizard is for creation) ---- */
const EC_TYPES = ['SP-Auto', 'SP-Manual', 'PAT', 'SB', 'SBV', 'SD-Product', 'SD-Audience']
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
  const a = aggregate(rows)
  const p = prev && prev.length ? aggregate(prev) : null
  const dl = (cur, prv) => (p && prv ? ((cur - prv) / Math.abs(prv)) * 100 : undefined)
  return (
    <KpiGrid>
      <Kpi label="Impressions" value={compact(a.impr)} delta={dl(a.impr, p?.impr)} />
      <Kpi label="Clicks" value={compact(a.clk)} delta={dl(a.clk, p?.clk)} />
      <Kpi label="CTR" value={pct(a.ctr, 2)} delta={dl(a.ctr, p?.ctr)} />
      <Kpi label="Spend" value={money(a.spend)} delta={dl(a.spend, p?.spend)} deltaGood={(dl(a.spend, p?.spend) || 0) <= 0} />
      <Kpi label="Sales" value={money(a.sales)} delta={dl(a.sales, p?.sales)} />
      <Kpi label="ACoS" value={pct(a.acos)} delta={dl(a.acos, p?.acos)} deltaGood={(dl(a.acos, p?.acos) || 0) <= 0} />
      <Kpi label="ROAS" value={dec2(a.roas)} delta={dl(a.roas, p?.roas)} />
      <Kpi label="Orders" value={compact(a.orders)} delta={dl(a.orders, p?.orders)} />
    </KpiGrid>
  )
}

/* ============================ CAMPAIGNS ============================ */
export function Campaigns() {
  const { profileId, rangeResolved } = useApp()
  const [created, setCreated] = useState(() => createdStore.get('campaigns'))
  const allCampaigns = useMemo(() => [...created, ...ALL_CAMPAIGNS], [created])
  const base = useProfileFilter(allCampaigns)
  const [overrides, setOverrides] = usePersistentOverrides('ads-campaigns')
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState(() => loadFilterModel('ads-campaigns'))
  const [sel, setSel] = useState(new Set())

  const [modal, setModal] = useState(null) // 'bid' | 'budget' | 'tag' | 'daypart' | 'rule'
  const [wizard, setWizard] = useState(false)
  const [editCamp, setEditCamp] = useState(null)
  const allRules = useMemo(() => [...createdStore.get('rules'), ...RULES], [])
  const onLaunch = (camps) => { const next = [...camps, ...created]; createdStore.set('campaigns', next); setCreated(next); setWizard(false); toast(`Launched ${camps.length} campaign${camps.length === 1 ? '' : 's'} — added to the grid`) }
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

  const withEdits = base.map((c) => (overrides[c.id] ? { ...c, ...overrides[c.id] } : c))
  const { rows: data, prev } = useMemo(() => scaleForRange(withEdits, rangeResolved), [withEdits, rangeResolved])
  const searched = data.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
  const filtered = applyFilters(searched, filters, CAMPAIGN_FIELDS)
  const prevFiltered = filtered.map((r) => prev[r.id])

  const merge = (id, patch) => setOverrides((o) => ({ ...o, [id]: { ...o[id], ...patch } }))
  const mergeMany = (ids, fn) => setOverrides((o) => { const n = { ...o }; ids.forEach((id) => { n[id] = { ...n[id], ...fn(id) } }); return n })
  const statusFor = (st) => (st === 'Enabled' ? 'Enabled' : st) // Paused / Archived pass through
  const setState = (id, st) => merge(id, { state: st, status: statusFor(st) })
  const byId = Object.fromEntries(data.map((c) => [c.id, c]))

  const bulkState = (st) => { const ids = [...sel]; mergeMany(ids, () => ({ state: st, status: statusFor(st) })); setSel(new Set()); toast(`${ids.length} campaign${ids.length === 1 ? '' : 's'} ${st.toLowerCase()}`) }
  const applyBulkBid = (mode, amt) => { const ids = [...sel]; mergeMany(ids, (id) => ({ actlBid: applyBidOp(byId[id].actlBid, byId[id].avlBid, mode, amt) })); setSel(new Set()); setModal(null); toast(`Updated bids on ${ids.length} campaign${ids.length === 1 ? '' : 's'} — all succeeded`) }
  const applyBulkBudget = (mode, amt) => { const ids = [...sel]; mergeMany(ids, (id) => ({ dailyBudget: applyBudgetOp(byId[id].dailyBudget, mode, amt) })); setSel(new Set()); setModal(null); toast(`Updated daily budget on ${ids.length} campaign${ids.length === 1 ? '' : 's'}`) }
  const applyBulkTag = (tag) => { const ids = [...sel]; mergeMany(ids, () => ({ tag })); setSel(new Set()); setModal(null); toast(`Tagged ${ids.length} campaign${ids.length === 1 ? '' : 's'} “${tag}”`) }
  const applyBulkDaypart = (sched) => { const ids = [...sel]; mergeMany(ids, () => ({ daypart: sched })); setSel(new Set()); setModal(null); toast(`Dayparting “${sched}” applied to ${ids.length} campaign${ids.length === 1 ? '' : 's'}`) }
  const applyBulkRule = (rule) => { const ids = [...sel]; mergeMany(ids, () => ({ appliedRule: rule.name })); setSel(new Set()); setModal(null); toast(`Rule “${rule.name}” applied to ${ids.length} campaign${ids.length === 1 ? '' : 's'}`) }

  const toggleSel = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSel((s) => (s.size === filtered.length ? new Set() : new Set(filtered.map((r) => r.id))))

  const columns = [
    { key: 'name', label: 'Campaign', sticky: true, width: 320, sortVal: (r) => r.name, render: (r) => (
      <div className="namecell">
        <div className="nc-top"><Link className="celllink" to={`/ads/adgroups?camp=${r.id}`} title="Drill into ad groups">{r.name}</Link>{r.tag && <span className="tag">{r.tag}</span>}{r.daypart && <span className="tag" title={`Dayparting: ${r.daypart}`}><Icon name="clock" size={10} /></span>}{r.appliedRule && <span className="tag" title={`Rule: ${r.appliedRule}`}><Icon name="sliders" size={10} /></span>}</div>
        <small>{r.profileId.toUpperCase()} · {r.product?.split('—')[0]}</small>
      </div>) },
    { key: 'state', label: 'State', render: (r) => <StateSelect value={r.state} onChange={(st) => setState(r.id, st)} /> },
    { key: 'status', label: 'Status', render: (r) => <Pill>{r.status}</Pill> },
    { key: 'campaignType', label: 'Type', render: (r) => <span className={`pill ${typeTone(r.campaignType)}`} style={{ borderRadius: 5 }}>{r.campaignType}</span> },
    { key: 'adGroups', label: 'Ad Groups', num: true, sort: false, render: (r) => <span className="muted">{r.adGroups.active}/{r.adGroups.total}</span> },
    { key: 'dailyBudget', label: 'Daily Budget', num: true, foot: (rs) => cur(sumKey('dailyBudget')(rs), symOf(rs), 0), render: (r) => (
      <EditableNum value={r.dailyBudget} prefix={symA(r.profileId)} dec={0} onCommit={(v) => { merge(r.id, { dailyBudget: v }); toast(`Daily budget set to ${cur(v, symA(r.profileId), 0)}`) }} />) },
    { key: 'bid', label: 'Bid (Act/Avl)', num: true, sort: false, render: (r) => <span className="muted">{r.actlBid} / {r.avlBid}</span> },
    { key: 'impr', label: 'Impr.', num: true, delta: true, foot: (rs) => compact(aggregate(rs).impr), render: (r) => compact(r.impr) },
    { key: 'clk', label: 'Clicks', num: true, delta: true, foot: (rs) => int(aggregate(rs).clk), render: (r) => int(r.clk) },
    { key: 'ctr', label: 'CTR', num: true, foot: (rs) => pct(aggregate(rs).ctr, 2), render: (r) => pct(r.ctr, 2) },
    { key: 'spend', label: 'Spend', num: true, delta: true, foot: (rs) => cur(aggregate(rs).spend, symOf(rs)), render: (r) => cur(r.spend, symA(r.profileId)) },
    { key: 'cpc', label: 'CPC', num: true, foot: (rs) => cur(aggregate(rs).cpc, symOf(rs), 2), render: (r) => cur(r.cpc, symA(r.profileId), 2) },
    { key: 'sales', label: 'Sales', num: true, delta: true, foot: (rs) => cur(aggregate(rs).sales, symOf(rs)), render: (r) => cur(r.sales, symA(r.profileId)) },
    { key: 'orders', label: 'Orders', num: true, delta: true, foot: (rs) => int(aggregate(rs).orders), render: (r) => int(r.orders) },
    { key: 'cvr', label: 'CVR', num: true, foot: (rs) => pct(aggregate(rs).cvr), render: (r) => pct(r.cvr) },
    { key: 'acos', label: 'ACoS', num: true, delta: true, foot: (rs) => pct(aggregate(rs).acos), render: (r) => <span style={{ color: r.acos > 40 ? 'var(--red)' : r.acos < 25 ? 'var(--green)' : 'inherit', fontWeight: 600 }}>{pct(r.acos)}</span> },
    { key: 'roas', label: 'ROAS', num: true, delta: true, foot: (rs) => dec2(aggregate(rs).roas), render: (r) => dec2(r.roas) },
    { key: 'ntb', label: 'NTB Orders', num: true, foot: (rs) => int(sumKey('ntb')(rs)), render: (r) => int(r.ntb) },
    { key: 'act', label: '', sort: false, render: (r) => createdById[r.id]
      ? <span style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}><Btn sm ghost icon="edit" onClick={() => setEditCamp(createdById[r.id])} /><Btn sm ghost icon="copy" onClick={() => duplicateCampaign(createdById[r.id])} /></span>
      : <span className="muted" style={{ fontSize: 11 }}>—</span> },
  ]

  const presets = {
    Default: ['name', 'state', 'status', 'campaignType', 'adGroups', 'dailyBudget', 'bid', 'impr', 'clk', 'ctr', 'spend', 'cpc', 'sales', 'orders', 'cvr', 'acos', 'roas', 'ntb', 'act'],
    Performance: ['name', 'state', 'impr', 'clk', 'ctr', 'spend', 'cpc', 'sales', 'orders', 'cvr', 'acos', 'roas', 'act'],
    'Target ACOS': ['name', 'state', 'dailyBudget', 'spend', 'sales', 'acos', 'roas', 'cpc', 'orders', 'act'],
  }
  const dims = [
    { key: 'campaignType', label: 'Campaign Type' },
    { key: 'portfolio', label: 'Portfolio' },
    { key: 'targetingType', label: 'Targeting' },
    { key: 'profileId', label: 'Profile' },
  ]

  return (
    <>
      <AdsHead title="Campaigns" sub={`${filtered.length} campaigns · ${rangeResolved.label} · Sponsored Products, Brands & Display`}>
        <ExportMenu name="campaigns" fields={CAMPAIGN_FIELDS} rows={filtered} />
        <Btn icon="plus" primary onClick={() => setWizard(true)}>Create Campaign</Btn>
      </AdsHead>
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
      {modal === 'bid' && <BulkBidModal count={sel.size} currency="$" suggestedLabel="available bid" onApply={applyBulkBid} onClose={() => setModal(null)} />}
      {modal === 'budget' && <BulkBudgetModal count={sel.size} currency="$" onApply={applyBulkBudget} onClose={() => setModal(null)} />}
      {modal === 'tag' && <BulkTagModal count={sel.size} onApply={applyBulkTag} onClose={() => setModal(null)} />}
      {modal === 'daypart' && <BulkDaypartModal count={sel.size} onApply={applyBulkDaypart} onClose={() => setModal(null)} />}
      {modal === 'rule' && <ApplyRuleModal count={sel.size} rules={allRules} onApply={applyBulkRule} onClose={() => setModal(null)} />}
      {wizard && <CreateCampaignWizard products={getProductList()} profileId={profileId === 'all' ? 'us' : profileId} onClose={() => setWizard(false)} onLaunch={onLaunch} />}
      {editCamp && <EditCampaignModal camp={editCamp} currency={symA(editCamp.profileId)} onClose={() => setEditCamp(null)} onSave={saveCampaign} />}

      <DataGrid
        id="ads-campaigns"
        columns={columns}
        rows={filtered}
        initialSort={{ key: 'spend', dir: 'desc' }}
        presets={presets}
        defaultPreset="Default"
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
  const { rangeResolved } = useApp()
  const loc = useLocation()
  const campId = new URLSearchParams(loc.search || '').get('camp')
  const allCamps = useMemo(() => [...createdStore.get('campaigns'), ...ALL_CAMPAIGNS], [])
  const drillCamp = campId ? allCamps.find((c) => c.id === campId) : null
  const base = useProfileFilter(ALL_CAMPAIGNS)
  const [created, setCreated] = useState(() => createdStore.get('adgroups'))
  const [showNew, setShowNew] = useState(false)
  const createdRows = useMemo(() => created
    .filter((g) => !campId || g.campaignId === campId)
    .map((g) => ({ ...ZERO_METRICS, id: g.id, name: g.name, campaign: g.campaign, campaignId: g.campaignId, profileId: g.profileId, state: g.state, defaultBid: g.defaultBid, targets: 0 })), [created, campId])
  const seedRows = drillCamp ? adGroupsForCampaign(drillCamp) : base.slice(0, 30).map((c, i) => ({
    id: c.id + '-ag', name: c.name.split('-').slice(0, 2).join('-') + ' · Ad Group ' + (1 + (i % 3)),
    campaign: c.name, campaignId: c.id, profileId: c.profileId, state: c.state, defaultBid: c.actlBid,
    targets: 4 + (i % 9), impr: c.impr, clk: c.clk, spend: c.spend, sales: c.sales, orders: c.orders, acos: c.acos, roas: c.roas, ctr: c.ctr,
  }))
  const rawRows = [...createdRows, ...seedRows]
  const createNewGroup = (g) => { const row = { id: 'AGNEW' + Date.now().toString().slice(-7), ...g }; const next = [row, ...created]; createdStore.set('adgroups', next); setCreated(next); setShowNew(false); toast(`Ad group "${g.name}" created`) }
  const [overrides, setOverrides] = usePersistentOverrides('ads-adgroups')
  const rawEdited = rawRows.map((r) => (overrides[r.id] ? { ...r, ...overrides[r.id] } : r))
  const { rows, prev } = useMemo(() => scaleForRange(rawEdited, rangeResolved), [rawEdited, rangeResolved])
  const [filters, setFilters] = useState(() => loadFilterModel('ads-adgroups'))
  const filtered = applyFilters(rows, filters, ADGROUP_FIELDS)
  const prevFiltered = filtered.map((r) => prev[r.id])
  const merge = (id, patch) => setOverrides((o) => ({ ...o, [id]: { ...o[id], ...patch } }))
  const columns = [
    { key: 'name', label: 'Ad Group', sticky: true, width: 300, render: (r) => <div className="cellname">{r.name}<small>{r.campaign}</small></div> },
    { key: 'state', label: 'State', render: (r) => <StateSelect value={r.state === 'Enabled' ? 'Enabled' : 'Paused'} options={['Enabled', 'Paused']} onChange={(st) => { merge(r.id, { state: st }); toast(`Ad group ${st.toLowerCase()}`) }} /> },
    { key: 'defaultBid', label: 'Default Bid', num: true, render: (r) => <EditableNum value={r.defaultBid} prefix={symA(r.profileId)} dec={2} onCommit={(v) => { merge(r.id, { defaultBid: v }); toast(`Default bid set to ${cur(v, symA(r.profileId), 2)}`) }} /> },
    { key: 'targets', label: 'Targets', num: true, foot: (rs) => int(sumKey('targets')(rs)) },
    { key: 'impr', label: 'Impr.', num: true, foot: (rs) => compact(aggregate(rs).impr), render: (r) => compact(r.impr) },
    { key: 'clk', label: 'Clicks', num: true, foot: (rs) => int(aggregate(rs).clk), render: (r) => int(r.clk) },
    { key: 'ctr', label: 'CTR', num: true, foot: (rs) => pct(aggregate(rs).ctr, 2), render: (r) => pct(r.ctr, 2) },
    { key: 'spend', label: 'Spend', num: true, foot: (rs) => cur(aggregate(rs).spend, symOf(rs)), render: (r) => cur(r.spend, symA(r.profileId)) },
    { key: 'sales', label: 'Sales', num: true, foot: (rs) => cur(aggregate(rs).sales, symOf(rs)), render: (r) => cur(r.sales, symA(r.profileId)) },
    { key: 'orders', label: 'Orders', num: true, foot: (rs) => int(aggregate(rs).orders), render: (r) => int(r.orders) },
    { key: 'acos', label: 'ACoS', num: true, foot: (rs) => pct(aggregate(rs).acos), render: (r) => pct(r.acos) },
    { key: 'roas', label: 'ROAS', num: true, foot: (rs) => dec2(aggregate(rs).roas), render: (r) => dec2(r.roas) },
  ]
  return (
    <>
      <AdsHead title="Ad Groups" sub={drillCamp ? `${filtered.length} ad groups in this campaign` : `${filtered.length} ad groups · ${rangeResolved.label}`}>
        <ExportMenu name="ad-groups" fields={ADGROUP_FIELDS} rows={filtered} /><Btn icon="plus" primary onClick={() => setShowNew(true)}>New Ad Group</Btn>
      </AdsHead>
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
        dimensions={[{ key: 'profileId', label: 'Profile' }, { key: 'state', label: 'State' }]}
        totals
        toolbarLeft={<FilterBar id="ads-adgroups" fields={ADGROUP_FIELDS} value={filters} onChange={setFilters} />}
      />
    </>
  )
}

/* ============================ TARGETING (Keywords) ============================ */
export function Targeting() {
  const { rangeResolved } = useApp()
  const [created, setCreated] = useState(() => createdStore.get('keywords'))
  const [showAdd, setShowAdd] = useState(false)
  const allCamps = useMemo(() => [...createdStore.get('campaigns'), ...ALL_CAMPAIGNS], [])
  const allKeywords = useMemo(() => [...created, ...keywords], [created])
  const base = useProfileFilter(allKeywords)
  const addKeywords = (rows) => {
    const stamped = rows.map((r, i) => ({ ...ZERO_METRICS, id: 'KNEW' + (Date.now() + i).toString().slice(-7), keyword: r.keyword, campaignId: r.campaignId, campaign: r.campaign, profileId: r.profileId, matchType: r.matchType, state: 'Enabled', bid: r.bid, sugBid: r.bid, topOfSearchIS: 0 }))
    const next = [...stamped, ...created]; createdStore.set('keywords', next); setCreated(next); setShowAdd(false); toast(`Added ${rows.length} keyword${rows.length === 1 ? '' : 's'} — added to the grid`)
  }
  const [tab, setTab] = useState('Keywords')
  const [sel, setSel] = useState(new Set())
  const [overrides, setOverrides] = usePersistentOverrides('ads-targeting')
  const [modal, setModal] = useState(null) // 'set' | 'inc' | 'dec'
  const [filters, setFilters] = useState(() => loadFilterModel('ads-targeting'))
  const withEdits = base.map((k) => (overrides[k.id] ? { ...k, ...overrides[k.id] } : k))
  const { rows: data, prev } = useMemo(() => scaleForRange(withEdits, rangeResolved), [withEdits, rangeResolved])
  const filtered = applyFilters(data, filters, TARGETING_FIELDS)
  const byId = Object.fromEntries(data.map((k) => [k.id, k]))
  const merge = (id, patch) => setOverrides((o) => ({ ...o, [id]: { ...o[id], ...patch } }))
  const mergeMany = (ids, fn) => setOverrides((o) => { const n = { ...o }; ids.forEach((id) => { n[id] = { ...n[id], ...fn(id) } }); return n })
  const setState = (id, st) => merge(id, { state: st })
  const applyBulkBid = (mode, amt) => { const ids = [...sel]; mergeMany(ids, (id) => ({ bid: applyBidOp(byId[id].bid, byId[id].sugBid, mode, amt) })); setSel(new Set()); setModal(null); toast(`Updated bids on ${ids.length} target${ids.length === 1 ? '' : 's'} — all succeeded`) }
  const bulkPause = () => { const ids = [...sel]; mergeMany(ids, () => ({ state: 'Paused' })); setSel(new Set()); toast(`Paused ${ids.length} target${ids.length === 1 ? '' : 's'}`) }
  const bulkNegative = () => { const n = sel.size; setSel(new Set()); toast(`Added ${n} term${n === 1 ? '' : 's'} as negative exact`) }
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
    { key: 'spend', label: 'Spend', num: true, delta: true, foot: (rs) => cur(aggregate(rs).spend, symOf(rs)), render: (r) => cur(r.spend, symA(r.profileId)) },
    { key: 'sales', label: 'Sales', num: true, delta: true, foot: (rs) => cur(aggregate(rs).sales, symOf(rs)), render: (r) => cur(r.sales, symA(r.profileId)) },
    { key: 'orders', label: 'Orders', num: true, foot: (rs) => int(aggregate(rs).orders), render: (r) => int(r.orders) },
    { key: 'acos', label: 'ACoS', num: true, delta: true, foot: (rs) => pct(aggregate(rs).acos), render: (r) => <span style={{ color: r.acos > 40 ? 'var(--red)' : 'inherit' }}>{pct(r.acos)}</span> },
    { key: 'roas', label: 'ROAS', num: true, foot: (rs) => dec2(aggregate(rs).roas), render: (r) => dec2(r.roas) },
  ]
  return (
    <>
      <AdsHead title="Targeting" sub={`Keywords & product targets · ${rangeResolved.label}`}><ExportMenu name="targeting" fields={TARGETING_FIELDS} rows={filtered} /><Btn icon="plus" primary onClick={() => setShowAdd(true)}>Add Keywords</Btn></AdsHead>
      {showAdd && <AddKeywordsModal camps={allCamps} onClose={() => setShowAdd(false)} onCreate={addKeywords} />}
      <div className="viewtabs" style={{ maxWidth: 360 }}>
        {['Keywords', 'Product Targets', 'Negatives'].map((t) => <div key={t} className={`viewtab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</div>)}
      </div>
      {sel.size > 0 && (
        <div className="bulkbar">
          <span className="sel">{sel.size} selected</span>
          <Btn sm icon="target" onClick={() => setModal('set')}>Set Bid</Btn>
          <Btn sm icon="trendUp" onClick={() => setModal('inc')}>Bid +%</Btn>
          <Btn sm icon="trendDown" onClick={() => setModal('dec')}>Bid −%</Btn>
          <Btn sm icon="pause" onClick={bulkPause}>Pause</Btn>
          <Btn sm icon="x" onClick={bulkNegative}>Add as Negative</Btn>
          <div style={{ flex: 1 }} /><Btn sm ghost onClick={() => setSel(new Set())}>Clear</Btn>
        </div>
      )}
      {modal && <BulkBidModal count={sel.size} currency="$" initialMode={modal} suggestedLabel="suggested bid" onApply={applyBulkBid} onClose={() => setModal(null)} />}
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
  const baseRaw = useProfileFilter(searchTerms)
  const base = useMemo(() => scaleForRange(baseRaw, rangeResolved).rows, [baseRaw, rangeResolved])
  const [filter, setFilter] = useState('All')
  const [acts, setActs] = usePersistentOverrides('ads-searchterms-acts')
  const harvest = (id) => { setActs((o) => ({ ...o, [id]: 'harvest' })); toast('Harvested to manual campaign') }
  const negate = (id) => { setActs((o) => ({ ...o, [id]: 'negate' })); toast('Added as negative exact') }
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
    { key: 'spend', label: 'Spend', num: true, foot: (rs) => cur(aggregate(rs).spend, symOf(rs)), render: (r) => cur(r.spend, symA(r.profileId)) },
    { key: 'sales', label: 'Sales', num: true, foot: (rs) => cur(aggregate(rs).sales, symOf(rs)), render: (r) => cur(r.sales, symA(r.profileId)) },
    { key: 'orders', label: 'Orders', num: true, foot: (rs) => int(aggregate(rs).orders), render: (r) => int(r.orders) },
    { key: 'acos', label: 'ACoS', num: true, foot: (rs) => pct(aggregate(rs).acos), render: (r) => pct(r.acos) },
    { key: 'recommend', label: 'Recommendation', render: (r) => <Pill tone={recTone[r.recommend]}>{r.recommend}</Pill> },
    { key: 'act', label: '', sort: false, render: (r) => (r.recommend === 'harvest'
      ? <Btn sm primary icon={acts[r.id] === 'harvest' ? 'check' : 'plus'} onClick={() => harvest(r.id)}>{acts[r.id] === 'harvest' ? 'Harvested' : 'Harvest'}</Btn>
      : r.recommend === 'negate'
        ? <Btn sm icon={acts[r.id] === 'negate' ? 'check' : 'x'} onClick={() => negate(r.id)}>{acts[r.id] === 'negate' ? 'Negated' : 'Negate'}</Btn>
        : <span className="muted">—</span>) },
  ]
  return (
    <>
      <AdsHead title="Search Terms" sub="Auto-harvest winners into manual campaigns · negate wasted spend"><ExportMenu name="search-terms" fields={SEARCHTERM_FIELDS} rows={filtered} /><Btn icon="sliders" primary>Harvesting Rules</Btn></AdsHead>
      <div className="hint" style={{ marginBottom: 14 }}>
        <Icon name="bulb" size={16} />
        <div><b>{counts.harvest} terms</b> qualify for harvesting (Orders ≥ 6, ACoS ≤ 30%) and <b>{counts.negate} terms</b> are flagged to negate. Rule R3 runs nightly to auto-apply.</div>
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
        <Kpi label="Avg Paid SOV" value={pct(avgPaid)} delta={3.2} />
        <Kpi label="Avg Organic SOV" value={pct(avgOrg)} delta={-1.1} deltaGood={false} />
        <Kpi label="Avg Total SOV" value={pct(avgPaid + avgOrg)} delta={1.8} />
        <Kpi label="Keywords Tracked" value={filtered.length} />
        <Kpi label="#1 Rank Keywords" value={filtered.filter((r) => r.yourRank === 1).length} />
      </KpiGrid>
      <DataGrid
        id="ads-sov"
        columns={columns}
        rows={filtered}
        initialSort={{ key: 'searchVolume', dir: 'desc' }}
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
