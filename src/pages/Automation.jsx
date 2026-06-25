import { useState, useMemo } from 'react'
import { Kpi, KpiGrid, Card, Pill, Toggle, Check, Btn, Modal, toast, createdStore, SearchBox, DataGrid, FilterBar, applyFilters, loadFilterModel, ExportMenu } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { rules as RULES, budgets } from '../data/mock.js'
import { cur, pct, money, int } from '../lib/format.js'

function AutoHead({ title, sub, children }) {
  return <div className="page-head"><div><div className="page-title">{title}</div><div className="page-sub">{sub}</div></div><div className="page-actions">{children}</div></div>
}
const RULE_ICON = { Bid: 'target', Harvest: 'spark', Negative: 'x', Retail: 'shield', Dayparting: 'clock', Budget: 'wallet' }
const RULE_COLOR = { Bid: 'var(--brand)', Harvest: 'var(--green)', Negative: 'var(--red)', Retail: 'var(--purple)', Dayparting: 'var(--amber)', Budget: 'var(--brand-2)' }

/* ---- Rule builder ---- */
const RB_METRICS = ['ROAS', 'ACoS', 'CVR', 'CPC', 'CTR', 'Impressions', 'Clicks', 'Spend', 'Orders', 'Organic Rank', 'SOV', 'Weeks of Cover']
const RB_PCT = new Set(['ACoS', 'CTR', 'CVR', 'SOV'])
const RB_OPS = [['gt', '>'], ['gte', '≥'], ['lt', '<'], ['lte', '≤'], ['between', 'between']]
const RB_TYPES = ['Bid', 'Harvest', 'Negative', 'Dayparting', 'Budget', 'Retail']
const RB_SCOPES = ['All SP campaigns', 'Selected campaigns', 'Ad groups', 'By tag', 'All profiles']
const RB_FREQ = ['Hourly', 'Every 6 hours', 'Daily', 'Every 2 days']
const RB_ACTIONS = [
  ['dec_bid', 'Decrease bid by %'], ['inc_bid', 'Increase bid by %'], ['set_bid', 'Set bid to value'],
  ['ceil_bid', 'Set bid ceiling'], ['floor_bid', 'Set bid floor'], ['pause', 'Pause'], ['enable', 'Enable'],
  ['adj_budget', 'Adjust daily budget by %'], ['placement', 'Set placement modifier %'],
  ['harvest', 'Harvest as keyword'], ['negative', 'Add as negative'],
]
const RB_NEEDS_VAL = new Set(['dec_bid', 'inc_bid', 'set_bid', 'ceil_bid', 'floor_bid', 'adj_budget', 'placement'])
const rid = () => Math.random().toString(36).slice(2, 7)
const opSym = (op) => ({ gt: '>', gte: '≥', lt: '<', lte: '≤', between: 'between' }[op] || op)
const buildTrigger = (f) => {
  const parts = f.conditions.filter((c) => c.value !== '' || c.op === 'between').map((c) => {
    const suf = RB_PCT.has(c.metric) ? '%' : ''
    if (c.op === 'between') return `${c.metric} between ${c.value || '…'}${suf} and ${c.value2 || '…'}${suf}`
    return `${c.metric} ${opSym(c.op)} ${c.value}${suf}`
  })
  let s = parts.join(` ${f.join} `)
  const gates = []
  if (f.minClicks) gates.push(`min ${f.minClicks} clicks`)
  if (f.minSpend) gates.push(`min $${f.minSpend} spend`)
  s += ` (${f.lookback}d${f.excludeLatest ? ', excl. latest day' : ''}${gates.length ? ', ' + gates.join(', ') : ''})`
  return s
}
const buildAction = (f) => {
  const v = f.actionValue
  return {
    dec_bid: `Decrease bid by ${v}%`, inc_bid: `Increase bid by ${v}%`, set_bid: `Set bid to $${v}`,
    ceil_bid: `Set bid ceiling $${v}`, floor_bid: `Set bid floor $${v}`, pause: 'Pause', enable: 'Enable',
    adj_budget: `Adjust daily budget by ${v}%`, placement: `Set placement modifier ${v}%`,
    harvest: 'Harvest as keyword to manual', negative: 'Add as negative exact',
  }[f.action] || f.action
}

const blankForm = () => ({
  name: '', type: 'Bid', scope: 'All SP campaigns',
  conditions: [{ id: rid(), metric: 'ACoS', op: 'gt', value: '', value2: '' }],
  join: 'AND', lookback: '14', excludeLatest: true, minClicks: '', minSpend: '',
  action: 'dec_bid', actionValue: '', frequency: 'Every 6 hours',
})
function RuleBuilder({ onClose, onSave, initial }) {
  const editing = !!(initial && initial._id)
  const { _id, _status, _affected, ...presetForm } = initial || {}
  const [f, setF] = useState(initial ? { ...blankForm(), ...presetForm } : blankForm())
  const upd = (patch) => setF((x) => ({ ...x, ...patch }))
  const setCond = (i, patch) => setF((x) => ({ ...x, conditions: x.conditions.map((c, j) => (j === i ? { ...c, ...patch } : c)) }))
  const addCond = () => setF((x) => ({ ...x, conditions: [...x.conditions, { id: rid(), metric: 'ROAS', op: 'gt', value: '', value2: '' }] }))
  const delCond = (i) => setF((x) => ({ ...x, conditions: x.conditions.filter((c, j) => j !== i) }))
  const needsVal = RB_NEEDS_VAL.has(f.action)
  const canSave = f.name.trim() && f.conditions.some((c) => c.value !== '') && (!needsVal || f.actionValue !== '')
  const save = () => {
    const { name, type, scope, conditions, join, lookback, excludeLatest, minClicks, minSpend, action, actionValue, frequency } = f
    const cleanForm = { name: name.trim(), type, scope, conditions, join, lookback, excludeLatest, minClicks, minSpend, action, actionValue, frequency }
    onSave({
      id: editing ? _id : 'RNEW' + Date.now().toString().slice(-5), name: name.trim(), type, scope,
      status: editing ? _status : 'Active', trigger: buildTrigger(f), action: buildAction(f),
      runs: frequency, lastRun: editing ? 'just now (edited)' : 'just now', affected: editing ? _affected : 0,
      created: true, _f: cleanForm,
    })
  }
  return (
    <Modal width={600} title={editing ? 'Edit Rule' : 'Create Rule'} sub="IF conditions are met, THEN apply an action — on a schedule" onClose={onClose}
      footer={<><Btn ghost onClick={onClose}>Cancel</Btn><div style={{ flex: 1 }} /><Btn primary disabled={!canSave} icon="check" onClick={save}>{editing ? 'Save changes' : 'Create rule'}</Btn></>}>
      <label className="fld">Rule name<input autoFocus value={f.name} placeholder="e.g. Defend Target ACoS ≤ 28%" onChange={(e) => upd({ name: e.target.value })} /></label>
      <div className="rb-grid2">
        <label className="fld">Rule type<select value={f.type} onChange={(e) => upd({ type: e.target.value })}>{RB_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
        <label className="fld">Scope<select value={f.scope} onChange={(e) => upd({ scope: e.target.value })}>{RB_SCOPES.map((s) => <option key={s}>{s}</option>)}</select></label>
      </div>
      <div className="cm-head" style={{ padding: '4px 0 8px' }}>IF — conditions</div>
      {f.conditions.map((c, i) => (
        <div key={c.id} className="rb-row">
          <span className="rb-join">{i === 0 ? 'IF' : f.join}</span>
          <select className="rb-metric" value={c.metric} onChange={(e) => setCond(i, { metric: e.target.value })}>{RB_METRICS.map((m) => <option key={m}>{m}</option>)}</select>
          <select value={c.op} onChange={(e) => setCond(i, { op: e.target.value, ...(e.target.value !== 'between' ? { value2: '' } : {}) })}>{RB_OPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <input className="rb-val" type="number" value={c.value} placeholder="value" onChange={(e) => setCond(i, { value: e.target.value })} />
          {c.op === 'between' && <><span className="muted">and</span><input className="rb-val" type="number" value={c.value2} placeholder="max" onChange={(e) => setCond(i, { value2: e.target.value })} /></>}
          {f.conditions.length > 1 && <button className="gf-x" onClick={() => delCond(i)}><Icon name="x" size={13} /></button>}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
        <Btn sm ghost icon="plus" onClick={addCond}>Add condition</Btn>
        {f.conditions.length > 1 && (
          <div className="seg">
            {['AND', 'OR', 'EITHER'].map((j) => <button key={j} className={f.join === j ? 'on' : ''} onClick={() => upd({ join: j })}>{j}</button>)}
          </div>
        )}
      </div>
      <div className="rb-sec rb-grid2">
        <label className="fld">Lookback window<select value={f.lookback} onChange={(e) => upd({ lookback: e.target.value })}><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></label>
        <label className="rb-check" style={{ alignSelf: 'end', marginBottom: 9 }}><Check on={f.excludeLatest} onClick={() => upd({ excludeLatest: !f.excludeLatest })} /> Exclude latest day</label>
      </div>
      <div className="rb-grid2">
        <label className="fld">Min clicks gate (optional)<input type="number" value={f.minClicks} placeholder="e.g. 15" onChange={(e) => upd({ minClicks: e.target.value })} /></label>
        <label className="fld">Min spend gate (optional)<input type="number" value={f.minSpend} placeholder="e.g. 20" onChange={(e) => upd({ minSpend: e.target.value })} /></label>
      </div>
      <div className="rb-sec">
        <div className="cm-head" style={{ padding: '0 0 8px' }}>THEN — action</div>
        <div className="rb-grid2">
          <label className="fld">Action<select value={f.action} onChange={(e) => upd({ action: e.target.value })}>{RB_ACTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          {needsVal && <label className="fld">Value<input type="number" autoFocus value={f.actionValue} onChange={(e) => upd({ actionValue: e.target.value })} /></label>}
        </div>
      </div>
      <label className="fld" style={{ marginTop: 12 }}>Run frequency<select value={f.frequency} onChange={(e) => upd({ frequency: e.target.value })}>{RB_FREQ.map((fr) => <option key={fr}>{fr}</option>)}</select></label>
    </Modal>
  )
}

/* ---- Rule templates (start-from-proven) ---- */
const RULE_TEMPLATES = [
  { key: 'acos', title: 'Defend Target ACoS', desc: 'Lower bids when ACoS runs above target.', form: { name: 'Defend Target ACoS ≤ 28%', type: 'Bid', scope: 'All SP campaigns', conditions: [{ id: 't1', metric: 'ACoS', op: 'gt', value: '28', value2: '' }], join: 'AND', lookback: '14', excludeLatest: true, action: 'dec_bid', actionValue: '12', frequency: 'Every 6 hours' } },
  { key: 'scale', title: 'Scale Winners', desc: 'Raise bids on high-ROAS, high-order targets.', form: { name: 'Scale Winners (ROAS ≥ 4)', type: 'Bid', scope: 'Selected campaigns', conditions: [{ id: 't1', metric: 'ROAS', op: 'gte', value: '4', value2: '' }, { id: 't2', metric: 'Orders', op: 'gte', value: '10', value2: '' }], join: 'AND', lookback: '7', excludeLatest: true, action: 'inc_bid', actionValue: '8', frequency: 'Every 6 hours' } },
  { key: 'harvest', title: 'Harvest Search Terms', desc: 'Promote converting search terms to manual exact.', form: { name: 'Harvest winning search terms', type: 'Harvest', scope: 'All SP campaigns', conditions: [{ id: 't1', metric: 'Orders', op: 'gte', value: '6', value2: '' }], join: 'AND', lookback: '30', excludeLatest: true, action: 'harvest', actionValue: '', frequency: 'Daily' } },
  { key: 'negate', title: 'Negate Wasted Spend', desc: 'Add zero-order, high-click terms as negatives.', form: { name: 'Negate wasted spend', type: 'Negative', scope: 'All SP campaigns', conditions: [{ id: 't1', metric: 'Clicks', op: 'gte', value: '15', value2: '' }, { id: 't2', metric: 'Orders', op: 'lte', value: '0', value2: '' }], join: 'AND', lookback: '30', excludeLatest: true, action: 'negative', actionValue: '', frequency: 'Daily' } },
  { key: 'budget', title: 'Budget Pacing Guard', desc: 'Throttle bids when daily pace runs hot.', form: { name: 'Budget pacing guard', type: 'Budget', scope: 'All profiles', conditions: [{ id: 't1', metric: 'Spend', op: 'gt', value: '115', value2: '' }], join: 'AND', lookback: '7', excludeLatest: false, action: 'adj_budget', actionValue: '-10', frequency: 'Every 6 hours' } },
]
function TemplatePicker({ onClose, onPick }) {
  return (
    <Modal width={560} title="Rule Templates" sub="Start from a proven automation — tweak it before saving" onClose={onClose}
      footer={<Btn ghost onClick={onClose}>Cancel</Btn>}>
      <div className="tmpl-list">
        {RULE_TEMPLATES.map((t) => (
          <div key={t.key} className="tmpl-card" onClick={() => onPick(t.form)}>
            <div className="icobox" style={{ background: RULE_COLOR[t.form.type] + '1a', color: RULE_COLOR[t.form.type] }}><Icon name={RULE_ICON[t.form.type]} size={16} /></div>
            <div className="grow"><div className="title">{t.title}</div><div className="desc">{t.desc}</div></div>
            <span className="tag">{t.form.type}</span>
            <Icon name="chevRight" size={15} className="muted" />
          </div>
        ))}
      </div>
    </Modal>
  )
}

/* ============================ RULE MANAGER ============================ */
const RM_FIELDS = [
  { key: 'name', label: 'Rule', type: 'text' },
  { key: 'type', label: 'Type', type: 'enum', options: RB_TYPES },
  { key: 'scope', label: 'Scope', type: 'text' },
  { key: 'status', label: 'Status', type: 'enum', options: ['Active', 'Paused'] },
  { key: 'trigger', label: 'Trigger (IF)', type: 'text' },
  { key: 'action', label: 'Action (THEN)', type: 'text' },
  { key: 'runs', label: 'Schedule', type: 'text' },
  { key: 'lastRun', label: 'Last run', type: 'text' },
  { key: 'affected', label: 'Affected', type: 'number' },
]
const fallbackForm = (r) => ({
  ...blankForm(), name: r.name, type: RB_TYPES.includes(r.type) ? r.type : 'Bid',
  scope: RB_SCOPES.includes(r.scope) ? r.scope : 'All SP campaigns',
  frequency: RB_FREQ.includes(r.runs) ? r.runs : 'Every 6 hours',
})
export function Rules() {
  const [rules, setRules] = useState(() => [...createdStore.get('rules'), ...RULES])
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState(() => loadFilterModel('auto-rules'))
  const [builder, setBuilder] = useState(false)
  const [edit, setEdit] = useState(null) // carries an existing rule's form (edit) OR a template form (create, no _id)
  const [picker, setPicker] = useState(false)
  const onSave = (rule) => {
    const created = createdStore.get('rules')
    const isEdit = created.some((x) => x.id === rule.id)
    if (isEdit) {
      createdStore.set('rules', created.map((x) => x.id === rule.id ? rule : x))
      setRules((rs) => rs.map((x) => x.id === rule.id ? rule : x))
      toast(`Rule “${rule.name}” updated`)
    } else {
      createdStore.set('rules', [rule, ...created])
      setRules((rs) => [rule, ...rs])
      toast(`Rule “${rule.name}” created`)
    }
    setBuilder(false); setEdit(null)
  }
  const toggle = (id) => {
    setRules((rs) => rs.map((r) => r.id === id ? { ...r, status: r.status === 'Active' ? 'Paused' : 'Active' } : r))
    const created = createdStore.get('rules')
    if (created.some((x) => x.id === id)) createdStore.set('rules', created.map((x) => x.id === id ? { ...x, status: x.status === 'Active' ? 'Paused' : 'Active' } : x))
  }
  const openEdit = (r) => setEdit({ ...(r._f || fallbackForm(r)), _id: r.id, _status: r.status, _affected: r.affected })
  const duplicate = (r) => {
    const copy = { ...r, id: 'RNEW' + Date.now().toString().slice(-5), name: r.name + ' (copy)', status: 'Paused', lastRun: 'just now', affected: 0, created: true, _f: r._f || fallbackForm(r) }
    createdStore.set('rules', [copy, ...createdStore.get('rules')])
    setRules((rs) => [copy, ...rs])
    toast(`Duplicated “${r.name}”`)
  }
  const searched = rules.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
  const filtered = applyFilters(searched, filters, RM_FIELDS)
  const active = rules.filter((r) => r.status === 'Active').length
  const affected = rules.reduce((s, r) => s + r.affected, 0)
  const columns = [
    { key: 'name', label: 'Rule', sticky: true, width: 240, sortVal: (r) => r.name, render: (r) => (
      <div className="flex items-center gap-8">
        <div className="icobox" style={{ background: RULE_COLOR[r.type] + '1a', color: RULE_COLOR[r.type], width: 30, height: 30, flex: '0 0 auto' }}><Icon name={RULE_ICON[r.type]} size={15} /></div>
        <div className="title">{r.name}{r.created && <span className="tag" style={{ marginLeft: 6 }}>custom</span>}</div>
      </div>
    ) },
    { key: 'type', label: 'Type', sortVal: (r) => r.type, render: (r) => <span className="tag">{r.type}</span> },
    { key: 'trigger', label: 'Trigger (IF)', sortVal: (r) => r.trigger, render: (r) => <div className="rm-clip" title={r.trigger}>{r.trigger}</div> },
    { key: 'action', label: 'Action (THEN)', sortVal: (r) => r.action, render: (r) => <div className="rm-clip" title={r.action}>{r.action}</div> },
    { key: 'scope', label: 'Scope', sortVal: (r) => r.scope, render: (r) => <span className="muted">{r.scope}</span> },
    { key: 'runs', label: 'Schedule', sortVal: (r) => r.runs, render: (r) => <span className="muted">{r.runs}</span> },
    { key: 'lastRun', label: 'Last run', sortVal: (r) => r.lastRun, render: (r) => <span className="muted">{r.lastRun}</span> },
    { key: 'affected', label: 'Affected', num: true, foot: (rs) => int(rs.reduce((s, r) => s + r.affected, 0)), render: (r) => int(r.affected) },
    { key: 'status', label: 'Status', sortVal: (r) => r.status, render: (r) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}><Pill>{r.status}</Pill><Toggle on={r.status === 'Active'} onClick={() => toggle(r.id)} /></span>
    ) },
    { key: 'act', label: '', sort: false, render: (r) => (
      <span style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}><Btn sm ghost icon="edit" onClick={() => openEdit(r)} /><Btn sm ghost icon="copy" onClick={() => duplicate(r)} /></span>
    ) },
  ]
  const dims = [{ key: 'type', label: 'Type' }, { key: 'status', label: 'Status' }, { key: 'scope', label: 'Scope' }]
  return (
    <>
      <AutoHead title="Rule Manager" sub="Rules-based automation for bids, budgets, harvesting, negatives, dayparting & retail signals"><ExportMenu name="rule-manager" fields={RM_FIELDS} rows={filtered} /><Btn icon="bulb" ghost onClick={() => setPicker(true)}>Templates</Btn><Btn icon="plus" primary onClick={() => setBuilder(true)}>Create Rule</Btn></AutoHead>
      <KpiGrid>
        <Kpi label="Active Rules" value={active} />
        <Kpi label="Total Rules" value={rules.length} />
        <Kpi label="Line Items Managed" value={affected.toLocaleString()} />
        <Kpi label="Actions (24h)" value="1,284" />
        <Kpi label="Est. Spend Saved (30d)" value="$8.4K" delta={6.2} />
      </KpiGrid>
      <DataGrid
        id="auto-rules"
        columns={columns}
        rows={filtered}
        initialSort={{ key: 'affected', dir: 'desc' }}
        dimensions={dims}
        totals
        toolbarLeft={<>
          <SearchBox value={q} onChange={setQ} placeholder="Search rules…" />
          <FilterBar id="auto-rules" fields={RM_FIELDS} value={filters} onChange={setFilters} />
        </>}
      />
      <div className="footnote">Rules evaluate on a schedule and auto-apply actions. Edit or duplicate any rule, filter by type/status/scope, and export the current view. Combine with Campaign AI for hands-off budget, keyword and bid management.</div>
      {picker && <TemplatePicker onClose={() => setPicker(false)} onPick={(form) => { setPicker(false); setEdit(form) }} />}
      {(builder || edit) && <RuleBuilder initial={edit} onClose={() => { setBuilder(false); setEdit(null) }} onSave={onSave} />}
    </>
  )
}

/* ============================ BUDGET MANAGER ============================ */
const paceColor = (s) => (s === 'Over pace' ? 'var(--red)' : s === 'Under pace' ? 'var(--amber)' : 'var(--green)')
const BM_FIELDS = [
  { key: 'profile', label: 'Marketplace', type: 'enum', options: ['Amazon USA', 'Amazon Canada', 'Amazon UK'] },
  { key: 'currency', label: 'Currency', type: 'enum', options: ['USD', 'CAD', 'GBP'] },
  { key: 'status', label: 'Pace status', type: 'enum', options: ['Over pace', 'On pace', 'Under pace'] },
  { key: 'monthlyCap', label: 'Monthly Cap', type: 'number' },
  { key: 'spent', label: 'Spent MTD', type: 'number' },
  { key: 'remaining', label: 'Remaining', type: 'number' },
  { key: 'forecast', label: 'Forecast EOM', type: 'number' },
  { key: 'pacePct', label: 'Pace %', type: 'number' },
]
const BM_DAY = 20, BM_DAYS = 30
const capStore = {
  get() { try { return JSON.parse(localStorage.getItem('chbudgetcaps')) || {} } catch (e) { return {} } },
  set(v) { try { localStorage.setItem('chbudgetcaps', JSON.stringify(v)) } catch (e) { /* ignore */ } },
}
// Re-derive pacing fields when a cap is overridden (forecast is spend-based, so it doesn't change).
const withCap = (b, caps) => {
  const cap = caps[b.profileId] != null ? caps[b.profileId] : b.monthlyCap
  if (cap === b.monthlyCap) return b
  const targetPace = cap * (BM_DAY / BM_DAYS)
  return {
    ...b, monthlyCap: cap, targetPace, remaining: cap - b.spent,
    pacePct: (b.spent / targetPace) * 100,
    status: b.spent > targetPace * 1.05 ? 'Over pace' : b.spent < targetPace * 0.9 ? 'Under pace' : 'On pace',
  }
}

function PacingChart({ cap, spent, forecast, day = BM_DAY, days = BM_DAYS }) {
  const W = 680, H = 150, padL = 8, padR = 8, padT = 14, padB = 22
  const maxY = (Math.max(cap, forecast) * 1.06) || 1
  const x = (d) => padL + (d / days) * (W - padL - padR)
  const y = (v) => H - padB - (v / maxY) * (H - padT - padB)
  const over = forecast > cap
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      <line x1={x(0)} y1={y(cap)} x2={x(days)} y2={y(cap)} stroke="var(--red)" strokeDasharray="4 4" strokeWidth="1.5" opacity="0.7" />
      <text x={x(days)} y={y(cap) - 5} textAnchor="end" fontSize="10" fill="var(--red)">Cap {money(cap)}</text>
      <line x1={x(0)} y1={y(0)} x2={x(days)} y2={y(cap)} stroke="var(--border)" strokeWidth="1.5" />
      <path d={`M ${x(0)} ${y(0)} L ${x(day)} ${y(spent)}`} fill="none" stroke="var(--brand)" strokeWidth="2.5" />
      <path d={`M ${x(day)} ${y(spent)} L ${x(days)} ${y(forecast)}`} fill="none" stroke={over ? 'var(--red)' : 'var(--brand)'} strokeWidth="2" strokeDasharray="5 4" />
      <line x1={x(day)} y1={padT} x2={x(day)} y2={H - padB} stroke="var(--text-3)" strokeDasharray="2 3" strokeWidth="1" />
      <circle cx={x(day)} cy={y(spent)} r="3.5" fill="var(--brand)" />
      <text x={x(0)} y={H - 6} textAnchor="start" fontSize="10" fill="var(--text-3)">Day 1</text>
      <text x={x(day)} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--text-3)">Today (day {day})</text>
      <text x={x(days)} y={H - 6} textAnchor="end" fontSize="10" fill="var(--text-3)">Day {days}</text>
    </svg>
  )
}

function SetBudgetCapModal({ rows, onClose, onSave }) {
  const [pid, setPid] = useState(rows[0]?.profileId)
  const current = rows.find((b) => b.profileId === pid) || rows[0]
  const [cap, setCap] = useState(String(current?.monthlyCap ?? ''))
  const onPick = (id) => { setPid(id); const b = rows.find((r) => r.profileId === id); setCap(String(b?.monthlyCap ?? '')) }
  const canSave = Number(cap) > 0
  return (
    <Modal width={460} title="Set Budget Cap" sub="Adjust the monthly cap — pacing & forecast recompute live" onClose={onClose}
      footer={<><Btn ghost onClick={onClose}>Cancel</Btn><div style={{ flex: 1 }} /><Btn primary disabled={!canSave} icon="check" onClick={() => onSave(pid, Number(cap))}>Save cap</Btn></>}>
      <label className="fld">Marketplace<select value={pid} onChange={(e) => onPick(e.target.value)}>{rows.map((b) => <option key={b.profileId} value={b.profileId}>{b.profile} ({b.currency})</option>)}</select></label>
      <label className="fld">Monthly cap ({current?.currency})<input type="number" autoFocus value={cap} onChange={(e) => setCap(e.target.value)} /></label>
      <div className="modal-note"><Icon name="wallet" size={14} />Spent MTD {cur(current?.spent || 0, current?.currency)} · when the cap is hit, campaigns auto-pause until next month.</div>
    </Modal>
  )
}

export function Budgets() {
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState(() => loadFilterModel('auto-budgets'))
  const [caps, setCaps] = useState(() => capStore.get())
  const [capModal, setCapModal] = useState(false)
  const data = useMemo(() => budgets.map((b) => withCap(b, caps)), [caps])
  const saveCap = (pid, cap) => { const next = { ...caps, [pid]: cap }; capStore.set(next); setCaps(next); setCapModal(false); const b = budgets.find((x) => x.profileId === pid); toast(`${b?.profile} cap set to ${cur(cap, b?.currency)}`) }
  const searched = data.filter((b) => b.profile.toLowerCase().includes(q.toLowerCase()))
  const filtered = applyFilters(searched, filters, BM_FIELDS)
  const totalCap = data.reduce((s, b) => s + b.monthlyCap, 0)
  const totalSpent = data.reduce((s, b) => s + b.spent, 0)
  const totalForecast = data.reduce((s, b) => s + b.forecast, 0)
  const bSum = (k) => (rs) => rs.reduce((a, b) => a + (b[k] || 0), 0)
  const capPct = (b) => Math.min(100, (b.spent / b.monthlyCap) * 100)
  const columns = [
    { key: 'profile', label: 'Marketplace', sticky: true, width: 200, sortVal: (r) => r.profile, render: (b) => <div>{b.profile}<small>{b.currency} budget</small></div> },
    { key: 'monthlyCap', label: 'Monthly Cap', num: true, foot: (rs) => money(bSum('monthlyCap')(rs)), render: (b) => cur(b.monthlyCap, b.currency) },
    { key: 'spent', label: 'Spent / Cap', num: true, sortVal: (r) => r.spent, foot: (rs) => money(bSum('spent')(rs)), render: (b) => (
      <span className="bm-pace"><div className="miniprog"><span style={{ width: capPct(b) + '%', background: paceColor(b.status) }} /></div><b>{cur(b.spent, b.currency)}</b></span>
    ) },
    { key: 'capUsed', label: '% of Cap', num: true, sortVal: (r) => capPct(r), render: (b) => pct(capPct(b)) },
    { key: 'remaining', label: 'Remaining', num: true, foot: (rs) => money(bSum('remaining')(rs)), render: (b) => cur(b.remaining, b.currency) },
    { key: 'forecast', label: 'Forecast EOM', num: true, foot: (rs) => money(bSum('forecast')(rs)), render: (b) => <span style={{ color: b.forecast > b.monthlyCap ? 'var(--red)' : 'var(--text)', fontWeight: b.forecast > b.monthlyCap ? 700 : 500 }}>{cur(b.forecast, b.currency)}</span> },
    { key: 'pacePct', label: 'Pace %', num: true, sortVal: (r) => r.pacePct, render: (b) => <span style={{ color: paceColor(b.status), fontWeight: 700 }}>{pct(b.pacePct)}</span> },
    { key: 'status', label: 'Status', sortVal: (r) => r.status, render: (b) => <Pill tone={b.status === 'Over pace' ? 'red' : b.status === 'Under pace' ? 'amber' : 'green'}>{b.status}</Pill> },
  ]
  const dims = [{ key: 'status', label: 'Pace status' }, { key: 'currency', label: 'Currency' }]
  return (
    <>
      <AutoHead title="Budget Manager" sub="Monthly caps, pacing & forecast with auto-pause on cap"><ExportMenu name="budget-manager" fields={BM_FIELDS} rows={filtered} /><Btn icon="plus" primary onClick={() => setCapModal(true)}>Set Budget Cap</Btn></AutoHead>
      <KpiGrid>
        <Kpi label="Total Monthly Cap" value={money(totalCap)} />
        <Kpi label="Spent MTD" value={money(totalSpent)} />
        <Kpi label="Remaining" value={money(totalCap - totalSpent)} />
        <Kpi label="Forecast EOM" value={money(totalForecast)} />
        <Kpi label="Avg Pace" value={pct(data.reduce((s, b) => s + b.pacePct, 0) / data.length)} />
      </KpiGrid>
      <Card title="Month pacing — blended" sub={`Actual vs. target pace · projected EOM ${money(totalForecast)} of ${money(totalCap)} cap`}>
        <PacingChart cap={totalCap} spent={totalSpent} forecast={totalForecast} />
        <div className="legend" style={{ marginTop: 6, justifyContent: 'center' }}>
          <span><i style={{ background: 'var(--brand)' }} /> Actual / projected spend</span>
          <span><i style={{ background: 'var(--border)' }} /> Target pace</span>
          <span><i style={{ background: 'var(--red)' }} /> Monthly cap</span>
        </div>
      </Card>
      <div className="hint" style={{ margin: '14px 0' }}>
        <Icon name="wallet" size={16} />
        <div>Set monthly caps per marketplace with <b>Set Budget Cap</b>. When a cap is reached, campaigns auto-pause until the budget refreshes next month. Pacing guard (Rule R7) throttles bids if daily pace runs hot.</div>
      </div>
      {capModal && <SetBudgetCapModal rows={data} onClose={() => setCapModal(false)} onSave={saveCap} />}
      <DataGrid
        id="auto-budgets"
        columns={columns}
        rows={filtered}
        initialSort={{ key: 'pacePct', dir: 'desc' }}
        dimensions={dims}
        totals
        toolbarLeft={<>
          <SearchBox value={q} onChange={setQ} placeholder="Search marketplaces…" />
          <FilterBar id="auto-budgets" fields={BM_FIELDS} value={filters} onChange={setFilters} />
        </>}
      />
      <div className="footnote">Each marketplace shows spend vs. cap with a live pacing bar; rows over forecast are flagged red. Filter by pace status, group by currency, and export the current view.</div>
    </>
  )
}
