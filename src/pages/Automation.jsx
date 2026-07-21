import { useState, useMemo, Fragment } from 'react'
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
const condStr = (c) => {
  const suf = RB_PCT.has(c.metric) ? '%' : ''
  const lvl = c.level && c.level !== 'Targeting' ? `${c.level} ` : ''
  const same = c.sameSku ? ' (Same SKU)' : ''
  if (c.op === 'between') return `${lvl}${c.metric} between ${c.value || '…'}${suf} and ${c.value2 || '…'}${suf}${same}`
  return `${lvl}${c.metric} ${opSym(c.op)} ${c.value}${suf}${same}`
}
const actionStr = (b) => {
  const v = b.actionValue
  const base = {
    dec_bid: `Decrease bid by ${v}%`, inc_bid: `Increase bid by ${v}%`, set_bid: `Set bid to $${v}`,
    ceil_bid: `Set bid ceiling $${v}`, floor_bid: `Set bid floor $${v}`, pause: 'Pause', enable: 'Enable',
    adj_budget: `Adjust daily budget by ${v}%`, placement: `Set placement modifier ${v}%`,
    harvest: 'Harvest as keyword to manual', negative: 'Add as negative exact',
  }[b.action] || b.action
  return b.cap ? `${base} · cap $${b.cap}` : base
}
const buildTrigger = (f) => {
  const b = f.blocks[0]
  const parts = b.conditions.filter((c) => c.value !== '' && (c.op !== 'between' || c.value2 !== '')).map(condStr)
  let s = parts.join(` ${b.join} `)
  const gates = []
  if (f.minClicks) gates.push(`min ${f.minClicks} clicks`)
  if (f.minSpend) gates.push(`min $${f.minSpend} spend`)
  s += ` (${f.lookback}d${f.excludeLatest ? `, excl. latest ${f.excludeDays || 1}d` : ''}${gates.length ? ', ' + gates.join(', ') : ''})`
  if (f.blocks.length > 1) s += ` · +${f.blocks.length - 1} more automation${f.blocks.length > 2 ? 's' : ''}`
  return s
}
const buildAction = (f) => f.blocks.map(actionStr).join(' · ')

/* Live parity (§9.4): grouped Rule-Type chooser */
const RULE_TYPE_GROUPS = [
  { group: 'Advertising', items: [
    { name: 'Targeting Rule', sub: 'Bid, Pause Targeting', legacy: 'Bid', rec: true },
    { name: 'Campaign Rule', sub: 'Budget, Pause campaign', legacy: 'Budget', rec: true },
    { name: 'Placement Rule', sub: 'Placement', legacy: 'Bid' },
    { name: 'Adgroup Rule', sub: 'Default Bid, Pause adgroups', legacy: 'Bid' },
    { name: 'Audience Rule', sub: 'Audience', legacy: 'Bid' },
  ] },
  { group: 'Harvest', items: [
    { name: 'Harvest Keywords Rule', sub: 'Add Keywords', legacy: 'Harvest', rec: true },
    { name: 'Harvest Product Targetings Rule', sub: 'Add PATs', legacy: 'Harvest' },
    { name: 'Negative Targeting Rule', sub: 'Add Negative', legacy: 'Negative', rec: true },
  ] },
  { group: 'ASIN', items: [{ name: 'ASIN Rule', sub: 'Pause / Enable ASIN', legacy: 'Retail' }] },
  { group: 'Real-time', items: [{ name: 'Auto Refill Rule', sub: 'Budget', legacy: 'Budget' }] },
  { group: 'SOV', items: [{ name: 'SOV Bid Rule', sub: 'Bid', legacy: 'Bid', rec: true }] },
]
function RuleTypeChooser({ onClose, onPick }) {
  const [tab, setTab] = useState('All Rule')
  return (
    <Modal width={620} title="Select Rule Type" sub="Choose what this rule manages" onClose={onClose}
      footer={<><div style={{ flex: 1 }} /><Btn ghost onClick={onClose}>Cancel</Btn></>}>
      <div className="seg" style={{ marginBottom: 12 }}>
        {['All Rule', 'Recommended Usage'].map((t) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      {RULE_TYPE_GROUPS.map((g) => {
        const items = tab === 'All Rule' ? g.items : g.items.filter((i) => i.rec)
        if (!items.length) return null
        return (
          <div key={g.group}>
            <div className="cm-head" style={{ padding: '6px 0' }}>{g.group}</div>
            <div className="opt-grid" style={{ marginBottom: 8 }}>
              {items.map((i) => (
                <div key={i.name} className="opt-card" onClick={() => onPick(i)}>
                  <div className="icobox" style={{ background: RULE_COLOR[i.legacy] + '1a', color: RULE_COLOR[i.legacy], width: 30, height: 30, flex: '0 0 auto' }}><Icon name={RULE_ICON[i.legacy]} size={15} /></div>
                  <div><div className="oc-title">{i.name}</div><div className="oc-sub">{i.sub}</div></div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </Modal>
  )
}

const RB_TIMEZONES = ['America/Toronto', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'UTC', 'Europe/London']
const RB_LEVELS = ['Targeting', 'Adgroup', 'Campaign']
const blankBlock = () => ({
  id: rid(), conditions: [{ id: rid(), level: 'Targeting', metric: 'ACoS', op: 'gt', value: '', value2: '', sameSku: false }],
  join: 'AND', action: 'dec_bid', actionValue: '', cap: '',
})
const blankForm = () => ({
  name: '', ruleType: 'Targeting Rule', type: 'Bid', scope: 'All SP campaigns',
  timezone: 'America/Toronto', mode: 'Automated Actions', runStart: '', runEnd: '', excludeDates: '', sendEmail: true,
  blocks: [blankBlock()],
  lookback: '7', excludeLatest: true, excludeDays: '2', minClicks: '', minSpend: '',
  frequency: 'Daily',
})
// Normalize any form shape (legacy flat conditions/action, or new blocks) into the v2 shape.
const normForm = (form) => {
  if (!form) return blankForm()
  const f = { ...blankForm(), ...form }
  if (!form.blocks && form.conditions) {
    f.blocks = [{
      id: rid(), conditions: form.conditions.map((c) => ({ level: 'Targeting', sameSku: false, ...c })),
      join: form.join || 'AND', action: form.action || 'dec_bid', actionValue: form.actionValue || '', cap: form.cap || '',
    }]
  }
  return f
}

function RuleBuilder({ onClose, onSave, onSaveTemplate, initial }) {
  const editing = !!(initial && initial._id)
  const { _id, _status, _affected, ...presetForm } = initial || {}
  const [f, setF] = useState(() => normForm(initial ? presetForm : null))
  const [step, setStep] = useState(0)
  const [preview, setPreview] = useState(null)
  const upd = (patch) => { setPreview(null); setF((x) => ({ ...x, ...patch })) }
  const updBlock = (bi, patch) => upd({ blocks: f.blocks.map((b, j) => (j === bi ? { ...b, ...patch } : b)) })
  const setCond = (bi, i, patch) => updBlock(bi, { conditions: f.blocks[bi].conditions.map((c, j) => (j === i ? { ...c, ...patch } : c)) })
  const addCond = (bi) => updBlock(bi, { conditions: [...f.blocks[bi].conditions, { id: rid(), level: 'Targeting', metric: 'ROAS', op: 'gt', value: '', value2: '', sameSku: false }] })
  const delCond = (bi, i) => updBlock(bi, { conditions: f.blocks[bi].conditions.filter((c, j) => j !== i) })
  const addBlock = () => upd({ blocks: [...f.blocks, blankBlock()] })
  const delBlock = (bi) => upd({ blocks: f.blocks.filter((b, j) => j !== bi) })
  const step1Ok = f.name.trim().length > 0 && f.name.length <= 150
  const condOk = (c) => c.value !== '' && (c.op !== 'between' || c.value2 !== '')
  const blocksOk = f.blocks.every((b) => b.conditions.some(condOk) && b.conditions.every((c) => c.op !== 'between' || c.value === '' || c.value2 !== '') && (!RB_NEEDS_VAL.has(b.action) || b.actionValue !== ''))
  const canSave = step1Ok && blocksOk
  const cleanForm = () => {
    const { name, ruleType, type, scope, timezone, mode, runStart, runEnd, excludeDates, sendEmail, blocks, lookback, excludeLatest, excludeDays, minClicks, minSpend, frequency } = f
    const b0 = blocks[0]
    return { name: name.trim(), ruleType, type, scope, timezone, mode, runStart, runEnd, excludeDates, sendEmail, blocks, lookback, excludeLatest, excludeDays, minClicks, minSpend, frequency,
      // legacy mirrors so older readers of _f keep working
      conditions: b0.conditions, join: b0.join, action: b0.action, actionValue: b0.actionValue }
  }
  const save = () => {
    onSave({
      id: editing ? _id : 'RNEW' + Date.now().toString().slice(-5), name: f.name.trim(), type: f.type, scope: f.scope,
      status: editing ? _status : (f.mode === 'Requires Approval' ? 'Paused' : 'Active'),
      trigger: buildTrigger(f), action: buildAction(f), mode: f.mode,
      runs: f.frequency, lastRun: editing ? 'just now (edited)' : (f.mode === 'Requires Approval' ? 'awaiting approval' : 'just now'),
      affected: editing ? _affected : 0, created: true, _f: cleanForm(),
    })
  }
  const doPreview = () => {
    const seed = JSON.stringify(f.blocks) + f.scope
    let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
    setPreview({ targets: 8 + (h % 120), campaigns: 2 + (h % 14) })
  }
  const saveTemplate = () => { onSaveTemplate({ key: 'tmpl' + Date.now(), title: f.name.trim() || 'Untitled template', desc: `${f.ruleType} · ${buildAction(f)}`, form: cleanForm() }); toast('Saved as template') }
  const stepper = (
    <div className="wiz-steps" style={{ marginBottom: 10 }}>
      {['Basic Information', 'Automation Setting'].map((s, i) => (
        <span key={s} className={`wiz-step ${i === step ? 'on' : i < step ? 'done' : ''}`}><span className="num">{i < step ? '✓' : i + 1}</span>{s}</span>
      ))}
    </div>
  )
  const body = step === 0 ? (
    <>
      {stepper}
      <label className="fld">Rule Name<input autoFocus maxLength={150} value={f.name} placeholder="e.g. Defend Target ACoS ≤ 28% (max 150 characters)" onChange={(e) => upd({ name: e.target.value })} /></label>
      <div className="rb-grid2">
        <label className="fld">Running Time Zone<select value={f.timezone} onChange={(e) => upd({ timezone: e.target.value })}>{RB_TIMEZONES.map((t) => <option key={t}>{t}</option>)}</select></label>
        <label className="fld">Rule Type<input value={f.ruleType} disabled /></label>
      </div>
      <div className="fld"><span>Mode</span>
        <div className="seg" style={{ marginTop: 4 }}>
          {['Automated Actions', 'Requires Approval'].map((m) => <button key={m} className={f.mode === m ? 'on' : ''} onClick={() => upd({ mode: m })}>{m}</button>)}
        </div>
      </div>
      <div className="rb-grid2">
        <label className="fld">Running Date — start<input type="date" value={f.runStart} onChange={(e) => upd({ runStart: e.target.value })} /></label>
        <label className="fld">End (blank = no end)<input type="date" value={f.runEnd} onChange={(e) => upd({ runEnd: e.target.value })} /></label>
      </div>
      <label className="fld">Exclude Date(s) — comma-separated<input placeholder="e.g. 2026-11-27, 2026-12-25" value={f.excludeDates} onChange={(e) => upd({ excludeDates: e.target.value })} /></label>
      <div className="rb-grid2">
        <label className="rb-check" style={{ alignSelf: 'end', marginBottom: 9 }}><Toggle on={f.sendEmail} onClick={() => upd({ sendEmail: !f.sendEmail })} /> Send Email on run</label>
        <label className="fld">Apply to<select value={f.scope} onChange={(e) => upd({ scope: e.target.value })}>{RB_SCOPES.map((s) => <option key={s}>{s}</option>)}</select></label>
      </div>
    </>
  ) : (
    <div style={{ display: 'flex', gap: 14 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {stepper}
        {f.blocks.map((b, bi) => (
          <div key={b.id} className="rb-sec" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 10 }}>
            <div className="cm-head" style={{ padding: '0 0 8px', display: 'flex', alignItems: 'center' }}>
              <span>Automation {bi + 1}</span><div style={{ flex: 1 }} />
              {f.blocks.length > 1 && <button className="gf-x" onClick={() => delBlock(bi)} title="Remove block"><Icon name="x" size={13} /></button>}
            </div>
            {b.conditions.map((c, i) => (
              <div key={c.id} className="rb-row">
                <span className="rb-join">{i === 0 ? 'IF' : b.join}</span>
                <select value={c.level} onChange={(e) => setCond(bi, i, { level: e.target.value })}>{RB_LEVELS.map((l) => <option key={l}>{l}</option>)}</select>
                <select className="rb-metric" value={c.metric} onChange={(e) => setCond(bi, i, { metric: e.target.value })}>{RB_METRICS.map((m) => <option key={m}>{m}</option>)}</select>
                <select value={c.op} onChange={(e) => setCond(bi, i, { op: e.target.value, ...(e.target.value !== 'between' ? { value2: '' } : {}) })}>{RB_OPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                <input className="rb-val" type="number" value={c.value} placeholder="value" onChange={(e) => setCond(bi, i, { value: e.target.value })} />
                {c.op === 'between' && <><span className="muted">and</span><input className="rb-val" type="number" value={c.value2} placeholder="max" onChange={(e) => setCond(bi, i, { value2: e.target.value })} /></>}
                <label className="rb-check" title="Only act when the target shares the SKU"><Check on={c.sameSku} onClick={() => setCond(bi, i, { sameSku: !c.sameSku })} /> Same SKU</label>
                {b.conditions.length > 1 && <button className="gf-x" onClick={() => delCond(bi, i)}><Icon name="x" size={13} /></button>}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
              <Btn sm ghost icon="plus" onClick={() => addCond(bi)}>Add condition</Btn>
              {b.conditions.length > 1 && (
                <div className="seg">{['AND', 'OR', 'EITHER'].map((j) => <button key={j} className={b.join === j ? 'on' : ''} onClick={() => updBlock(bi, { join: j })}>{j}</button>)}</div>
              )}
            </div>
            <div className="cm-head" style={{ padding: '10px 0 8px' }}>THEN — action</div>
            <div className="rb-grid2">
              <label className="fld">Action<select value={b.action} onChange={(e) => updBlock(bi, { action: e.target.value })}>{RB_ACTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
              {RB_NEEDS_VAL.has(b.action) && <label className="fld">Value<input type="number" value={b.actionValue} onChange={(e) => updBlock(bi, { actionValue: e.target.value })} /></label>}
            </div>
            <label className="fld">Cap / ceiling ($, optional)<input type="number" placeholder="e.g. 2.50 — never exceed this" value={b.cap} onChange={(e) => updBlock(bi, { cap: e.target.value })} /></label>
          </div>
        ))}
        <Btn sm ghost icon="plus" onClick={addBlock}>Add Automation</Btn>
        <div className="rb-sec rb-grid2">
          <label className="fld">Data from<select value={f.lookback} onChange={(e) => upd({ lookback: e.target.value })}><option value="7">Last 7 days</option><option value="14">Last 14 days</option><option value="30">Last 30 days</option></select></label>
          <label className="rb-check" style={{ alignSelf: 'end', marginBottom: 9 }}><Check on={f.excludeLatest} onClick={() => upd({ excludeLatest: !f.excludeLatest })} /> Exclude latest {f.excludeDays} days</label>
        </div>
        <div className="rb-grid2">
          <label className="fld">Min clicks gate (optional)<input type="number" value={f.minClicks} placeholder="e.g. 15" onChange={(e) => upd({ minClicks: e.target.value })} /></label>
          <label className="fld">Min spend gate (optional)<input type="number" value={f.minSpend} placeholder="e.g. 20" onChange={(e) => upd({ minSpend: e.target.value })} /></label>
        </div>
        <label className="fld" style={{ marginTop: 8 }}>Frequency<select value={f.frequency} onChange={(e) => upd({ frequency: e.target.value })}>{RB_FREQ.map((fr) => <option key={fr}>{fr}</option>)}</select></label>
        {preview && (
          <div className="modal-note" style={{ marginTop: 10 }}><Icon name="target" size={14} />
            Preview Results: <b>~{preview.targets} targets</b> across <b>{preview.campaigns} campaigns</b> currently match — {buildAction(f)} would apply on next run. (mock estimate)
          </div>
        )}
      </div>
      <div style={{ width: 190, flex: '0 0 auto', borderLeft: '1px solid var(--border)', paddingLeft: 12 }}>
        <div className="cm-head" style={{ padding: '0 0 8px' }}>Rule Kickstart</div>
        {[...RULE_TEMPLATES, ...createdStore.get('ruleTemplates')].map((t) => (
          <div key={t.key} className="tmpl-card" style={{ padding: 8, marginBottom: 6, cursor: 'pointer' }} onClick={() => { setF(normForm(t.form)); setPreview(null); toast(`Loaded “${t.title}”`) }}>
            <div className="grow"><div className="title" style={{ fontSize: 12 }}>{t.title}</div><div className="desc" style={{ fontSize: 11 }}>{t.desc}</div></div>
          </div>
        ))}
      </div>
    </div>
  )
  return (
    <Modal width={step === 0 ? 620 : 860} title={editing ? 'Edit Rule' : 'Create Auto Rule'} sub={`${f.ruleType} · ${f.mode}`} onClose={onClose}
      footer={<>
        {step === 1 && <Btn ghost onClick={() => setStep(0)}>Previous</Btn>}
        {step === 1 && <Btn ghost icon="target" disabled={!blocksOk} onClick={doPreview}>Preview Results</Btn>}
        <div style={{ flex: 1 }} />
        <Btn ghost onClick={onClose}>Cancel</Btn>
        {step === 1 && <Btn ghost icon="bulb" disabled={!canSave} onClick={saveTemplate}>Save as template</Btn>}
        {step === 0
          ? <Btn primary disabled={!step1Ok} onClick={() => setStep(1)}>Next</Btn>
          : <Btn primary disabled={!canSave} icon="check" onClick={save}>{editing ? 'Save changes' : 'OK'}</Btn>}
      </>}>
      {body}
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
  const all = [...createdStore.get('ruleTemplates'), ...RULE_TEMPLATES]
  return (
    <Modal width={560} title="Rule Templates" sub="Start from a proven automation — tweak it before saving" onClose={onClose}
      footer={<Btn ghost onClick={onClose}>Cancel</Btn>}>
      <div className="tmpl-list">
        {all.map((t) => (
          <div key={t.key} className="tmpl-card" onClick={() => onPick(t.form)}>
            <div className="icobox" style={{ background: (RULE_COLOR[t.form.type] || 'var(--brand)') + '1a', color: RULE_COLOR[t.form.type] || 'var(--brand)' }}><Icon name={RULE_ICON[t.form.type] || 'target'} size={16} /></div>
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
// Persisted overrides for seeded rules (edits + status toggles) — keyed by rule id.
const seedRuleStore = {
  get() { try { return JSON.parse(localStorage.getItem('chedits:auto-rules-seed')) || {} } catch (e) { return {} } },
  set(v) { try { localStorage.setItem('chedits:auto-rules-seed', JSON.stringify(v)) } catch (e) { /* ignore */ } },
}
export function Rules() {
  const [rules, setRules] = useState(() => { const ov = seedRuleStore.get(); return [...createdStore.get('rules'), ...RULES.map((r) => (ov[r.id] ? { ...r, ...ov[r.id] } : r))] })
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState(() => loadFilterModel('auto-rules'))
  const [builder, setBuilder] = useState(false)
  const [edit, setEdit] = useState(null) // carries an existing rule's form (edit) OR a template form (create, no _id)
  const [picker, setPicker] = useState(false)
  const [typeChooser, setTypeChooser] = useState(false)
  const onSaveTemplate = (tmpl) => {
    const existing = createdStore.get('ruleTemplates')
    const i = existing.findIndex((t) => t.title === tmpl.title)
    if (i >= 0) createdStore.set('ruleTemplates', existing.map((t, j) => (j === i ? { ...tmpl, key: t.key } : t)))
    else createdStore.add('ruleTemplates', tmpl)
  }
  const onSave = (rule) => {
    const created = createdStore.get('rules')
    if (created.some((x) => x.id === rule.id)) {
      createdStore.set('rules', created.map((x) => x.id === rule.id ? rule : x))
      setRules((rs) => rs.map((x) => x.id === rule.id ? rule : x))
      toast(`Rule “${rule.name}” updated`)
    } else if (RULES.some((x) => x.id === rule.id)) {
      // Seeded rule edited — replace in place via the override store (never prepend a duplicate id).
      const { created: _omit, ...patch } = rule
      seedRuleStore.set({ ...seedRuleStore.get(), [rule.id]: patch })
      setRules((rs) => rs.map((x) => x.id === rule.id ? { ...x, ...patch } : x))
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
    if (created.some((x) => x.id === id)) {
      createdStore.set('rules', created.map((x) => x.id === id ? { ...x, status: x.status === 'Active' ? 'Paused' : 'Active' } : x))
    } else if (RULES.some((x) => x.id === id)) {
      const ov = seedRuleStore.get()
      const curStatus = (ov[id] && ov[id].status) || RULES.find((x) => x.id === id).status
      seedRuleStore.set({ ...ov, [id]: { ...ov[id], status: curStatus === 'Active' ? 'Paused' : 'Active' } })
    }
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
  const actions24h = rules.filter((r) => r.status === 'Active' && r.lastRun !== '—').reduce((s, r) => s + r.affected, 0)
  const typesInUse = new Set(rules.filter((r) => r.status === 'Active').map((r) => r.type)).size
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
      <AutoHead title="Rule Manager" sub="Rules-based automation for bids, budgets, harvesting, negatives, dayparting & retail signals"><ExportMenu name="rule-manager" fields={RM_FIELDS} rows={filtered} /><Btn icon="bulb" ghost onClick={() => setPicker(true)}>Templates</Btn><Btn icon="plus" primary onClick={() => setTypeChooser(true)}>Create Auto Rules</Btn></AutoHead>
      <KpiGrid>
        <Kpi label="Active Rules" value={active} />
        <Kpi label="Total Rules" value={rules.length} />
        <Kpi label="Line Items Managed" value={affected.toLocaleString()} />
        <Kpi label="Actions (24h)" value={int(actions24h)} />
        <Kpi label="Rule Types in Use" value={typesInUse} />
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
      {typeChooser && <RuleTypeChooser onClose={() => setTypeChooser(false)} onPick={(i) => { setTypeChooser(false); setEdit({ ruleType: i.name, type: i.legacy }) }} />}
      {(builder || edit) && <RuleBuilder initial={edit} onClose={() => { setBuilder(false); setEdit(null) }} onSave={onSave} onSaveTemplate={onSaveTemplate} />}
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
const BM_DAY = new Date().getDate(), BM_DAYS = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
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

/* ---- Goals: profile → tag hierarchy with monthly budget goals (live parity — §10) ---- */
const GOAL_TAGS = {
  ca: ['Catch All', 'Dental', 'Freeze Dried', 'Sprinkles'],
  us: ['Catch All', 'Dental', 'Freeze Dried', 'Toppers'],
  uk: ['Catch All', 'Treats'],
}
const GOAL_TOGGLES = ['autoPacing', 'stopOverspend', 'autoReenable', 'flightControl']
const GOAL_TOGGLE_LABELS = { autoPacing: 'Auto Pacing', stopOverspend: 'Stop Over-Spend', autoReenable: 'Auto Re-enable', flightControl: 'Flight Control' }
const goalStore = {
  get() { try { return JSON.parse(localStorage.getItem('chgoals')) || {} } catch (e) { return {} } },
  set(v) { try { localStorage.setItem('chgoals', JSON.stringify(v)) } catch (e) { /* ignore */ } },
}
const gHash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h }
const monthKeys = (n = 3) => {
  const now = new Date(); const out = []
  for (let i = 0; i < n; i++) { const d = new Date(now.getFullYear(), now.getMonth() + i, 1); out.push(`${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`) }
  return out
}
// Deterministic mock per tag+month; goal override (from store) recomputes pacing off the new budget.
function tagMonth(pid, tag, mk, mi, goals, curr) {
  const key = `${pid}|${tag}|${mk}`
  const h = gHash(key)
  const hasDefault = h % 4 !== 0 && mi === 0 // current month: 3 of 4 tags have budgets; future months mostly unset
  const override = goals[key]
  const budget = override != null ? override : (hasDefault ? (2000 + (h % 9) * 1000) : null)
  const dayOfMonth = BM_DAY, daysIn = BM_DAYS
  const spendPct = mi === 0 ? 0.55 + (h % 30) / 100 : 0
  const spend = budget && mi === 0 ? Math.round(budget * spendPct) : 0
  const pct = budget ? (spend / budget) * 100 : 0
  const planned = mi === 0 ? (dayOfMonth / daysIn) * 100 : 0
  const delivery = budget && mi === 0 ? Math.round((pct / Math.max(1, planned)) * 100) : 0
  const est = budget && mi === 0 ? Math.round(spend / Math.max(1, dayOfMonth) * daysIn) : 0
  const roas = budget && mi === 0 ? 2.4 + (h % 20) / 10 : 0
  const yday = budget && mi === 0 ? Math.round(spend / Math.max(1, dayOfMonth)) : 0
  return { key, budget, spend, pct, planned, delivery, est, roas, yday, curr }
}

// Persisted daily-budget-allocation choices, keyed `profileId|tag`.
const allocStore = {
  get() { try { return JSON.parse(localStorage.getItem('challoc')) || {} } catch (e) { return {} } },
  set(v) { try { localStorage.setItem('challoc', JSON.stringify(v)) } catch (e) { /* ignore */ } },
}
function AllocModal({ pid, tag, onClose }) {
  const allocKey = `${pid}|${tag}`
  const [tmpl, setTmpl] = useState(() => !!allocStore.get()[allocKey]?.tmpl)
  const [mode, setMode] = useState(() => allocStore.get()[allocKey]?.mode || 'Even Amount')
  const [metric, setMetric] = useState('Impression')
  const h = gHash(tag + metric)
  const dow = Array.from({ length: 7 }, (_, i) => 60 + ((h >> i) % 40))
  const dom = Array.from({ length: 30 }, (_, i) => 40 + ((gHash(tag + metric + i)) % 55))
  const W = 300, H = 110
  return (
    <Modal width={720} title="Edit Daily Budget Allocation" sub={`${tag} — how the monthly budget goal spreads across days`} onClose={onClose}
      footer={<><div style={{ flex: 1 }} /><Btn ghost onClick={onClose}>Cancel</Btn><Btn primary icon="check" onClick={() => { allocStore.set({ ...allocStore.get(), [allocKey]: { mode, tmpl } }); toast(`Allocation saved — ${mode}`); onClose() }}>Confirm</Btn></>}>
      <label className="rb-check" style={{ marginBottom: 12 }}><Toggle on={tmpl} onClick={() => setTmpl(!tmpl)} /> Use Template</label>
      <div className="fld"><span>Daily Budget Mode</span>
        <div className="seg" style={{ marginTop: 4 }}>
          {['Even Amount', 'Fixed Monthly Budget', 'Set Value By Date'].map((m) => <button key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>{m}</button>)}
        </div>
        <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
          {mode === 'Even Amount' ? 'Monthly budget would be allocated to every day evenly.' : mode === 'Fixed Monthly Budget' ? 'Spend floats daily but is capped at the monthly budget.' : 'Set a specific budget value per date.'}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }}>
        <div className="cm-head" style={{ padding: 0 }}>Budget Insight</div><div style={{ flex: 1 }} />
        <div className="seg">{['Impression', 'CTR', 'CVR', 'ROAS'].map((m) => <button key={m} className={metric === m ? 'on' : ''} onClick={() => setMetric(m)}>{m}</button>)}</div>
      </div>
      <div style={{ display: 'flex', gap: 18, marginTop: 8 }}>
        <div style={{ flex: 1 }}>
          <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>Day of Week</div>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%">
            {dow.map((v, i) => <rect key={i} x={i * 42 + 10} y={H - v} width={16} height={v} rx={3} fill="var(--brand)" />)}
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>Day of Month</div>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%">
            <path d={dom.map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * 10 + 4} ${H - v}`).join(' ')} fill="none" stroke="var(--brand)" strokeWidth="2" />
            {dom.map((v, i) => <circle key={i} cx={i * 10 + 4} cy={H - v} r={1.8} fill="var(--brand)" />)}
          </svg>
        </div>
      </div>
    </Modal>
  )
}

export function Budgets() {
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState(() => loadFilterModel('auto-budgets'))
  const [caps, setCaps] = useState(() => capStore.get())
  const [capModal, setCapModal] = useState(false)
  const [goals, setGoals] = useState(() => goalStore.get())
  const [toggles, setToggles] = useState(() => { try { return JSON.parse(localStorage.getItem('chgoaltoggles')) || {} } catch (e) { return {} } })
  const [expanded, setExpanded] = useState(() => new Set(['ca']))
  const [alloc, setAlloc] = useState(null) // { pid, tag }
  const [editCell, setEditCell] = useState(null) // goal key being edited
  const [editVal, setEditVal] = useState('')
  const months = monthKeys(3)
  const saveGoal = (key, v, shown) => {
    setEditCell(null)
    const raw = String(v).trim()
    const num = Number(raw)
    if (raw === '' || !(num > 0)) { // '' = clear the override; 0 / invalid → clear too
      if (goals[key] == null) return
      const next = { ...goals }; delete next[key]
      goalStore.set(next); setGoals(next); toast('Budget goal cleared')
      return
    }
    if (num === (goals[key] != null ? goals[key] : shown)) return // unchanged on blur — skip save + toast
    const next = { ...goals, [key]: num }
    goalStore.set(next); setGoals(next); toast('Budget goal saved')
  }
  const tglKey = (pid, tag, t) => `${pid}|${tag}|${t}`
  const tglOn = (pid, tag, t) => toggles[tglKey(pid, tag, t)] !== false // default on
  const flipTgl = (pid, tag, t) => setToggles((x) => { const n = { ...x, [tglKey(pid, tag, t)]: !tglOn(pid, tag, t) }; try { localStorage.setItem('chgoaltoggles', JSON.stringify(n)) } catch (e) { /* ignore */ } return n })
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
      <AutoHead title="Budget Manager" sub="Monthly budget goals by profile & tag — pacing, delivery rate, and automation guardrails (Auto Pacing · Stop Over-Spend · Auto Re-enable · Flight Control)"><ExportMenu name="budget-manager" fields={BM_FIELDS} rows={filtered} /><Btn icon="plus" primary onClick={() => setCapModal(true)}>Set Budget Cap</Btn></AutoHead>
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
      {alloc && <AllocModal pid={alloc.pid} tag={alloc.tag} onClose={() => setAlloc(null)} />}
      <Card title="Budget goals — by profile & tag" sub="Monthly budget goals with pacing, delivery & automation guardrails · click a Budget cell to set a goal · Calendar edits daily allocation">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: 1450, width: '100%', fontSize: 12.5 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border)', position: 'sticky', left: 0, background: 'var(--bg-2, var(--bg))' }}>Profile / Tag</th>
                <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>Calendar</th>
                {GOAL_TOGGLES.map((t) => <th key={t} style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>{GOAL_TOGGLE_LABELS[t]}</th>)}
                {months.map((mk) => ['Budget', 'Spend', '%', 'Planned %', 'Delivery', 'Est Spend', 'ROAS', 'Yday'].map((c, ci) => (
                  <th key={mk + c} style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', textAlign: 'right', borderLeft: ci === 0 ? '2px solid var(--border)' : 'none', whiteSpace: 'nowrap' }}>{ci === 0 ? `${mk} · ` : ''}{c}</th>
                )))}
              </tr>
            </thead>
            <tbody>
              {data.map((b) => {
                const tags = GOAL_TAGS[b.profileId] || ['Catch All']
                const open = expanded.has(b.profileId)
                const tagRows = tags.map((tag) => months.map((mk, mi) => tagMonth(b.profileId, tag, mk, mi, goals, b.currency)))
                const sums = months.map((mk, mi) => tagRows.reduce((a, tr) => { const m = tr[mi]; return { budget: a.budget + (m.budget || 0), spend: a.spend + m.spend } }, { budget: 0, spend: 0 }))
                const activeCount = (t) => tags.filter((tag) => tglOn(b.profileId, tag, t)).length
                return (
                  <Fragment key={b.profileId}>
                    <tr style={{ background: 'var(--bg-2, transparent)', cursor: 'pointer' }} onClick={() => setExpanded((s) => { const n = new Set(s); n.has(b.profileId) ? n.delete(b.profileId) : n.add(b.profileId); return n })}>
                      <td style={{ padding: '8px', fontWeight: 700, whiteSpace: 'nowrap', position: 'sticky', left: 0, background: 'inherit' }}>
                        <span style={{ display: 'inline-block', transform: open ? 'rotate(0)' : 'rotate(-90deg)' }}><Icon name="chevDown" size={12} /></span> {b.profile} <span className="tag" style={{ marginLeft: 4 }}>Tag</span>
                      </td>
                      <td style={{ textAlign: 'center' }} className="muted">- -</td>
                      {GOAL_TOGGLES.map((t) => <td key={t} style={{ textAlign: 'center' }} className="muted">{t === 'autoPacing' || t === 'stopOverspend' ? <span style={{ color: 'var(--green)' }}>● {activeCount(t)}/{tags.length} Active</span> : ''}</td>)}
                      {sums.map((s, mi) => (
                        <Fragment key={mi}>
                          <td style={{ textAlign: 'right', fontWeight: 700, borderLeft: '2px solid var(--border)' }}>{s.budget ? cur(s.budget, b.currency) : '—'}</td>
                          <td style={{ textAlign: 'right' }}>{s.spend ? cur(s.spend, b.currency) : '—'}</td>
                          <td colSpan={6} />
                        </Fragment>
                      ))}
                    </tr>
                    {open && tags.map((tag, ti) => (
                      <tr key={tag} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '7px 8px 7px 28px', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: 'var(--bg, #fff)' }}><a style={{ color: 'var(--brand)', cursor: 'pointer' }}>{tag}</a></td>
                        <td style={{ textAlign: 'center' }}><Btn sm ghost icon="clock" title="Edit Daily Budget Allocation" onClick={() => setAlloc({ pid: b.profileId, tag })} /></td>
                        {GOAL_TOGGLES.map((t) => {
                          const m0 = tagRows[ti][0]
                          return (
                            <td key={t} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                              <Toggle on={tglOn(b.profileId, tag, t)} onClick={() => flipTgl(b.profileId, tag, t)} />
                              {(t === 'autoPacing' || t === 'stopOverspend') && !m0.budget && <span title="No budget goal set" style={{ color: 'var(--red)', marginLeft: 4 }}>!</span>}
                            </td>
                          )
                        })}
                        {tagRows[ti].map((m, mi) => (
                          <Fragment key={m.key}>
                            <td style={{ textAlign: 'right', borderLeft: '2px solid var(--border)', whiteSpace: 'nowrap' }}>
                              {editCell === m.key ? (
                                <input autoFocus type="number" defaultValue={m.budget || ''} style={{ width: 80 }}
                                  onKeyDown={(e) => { if (e.key === 'Enter') saveGoal(m.key, e.target.value, m.budget); if (e.key === 'Escape') setEditCell(null) }}
                                  onBlur={(e) => saveGoal(m.key, e.target.value, m.budget)} />
                              ) : (
                                <span style={{ cursor: 'pointer' }} onClick={() => setEditCell(m.key)}>
                                  {m.budget ? cur(m.budget, b.currency) : <span className="muted">Not set ✎</span>}
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }} className={m.spend ? '' : 'muted'}>{cur(m.spend, b.currency)}</td>
                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                              {m.budget && mi === 0 ? <><span className="miniprog" style={{ display: 'inline-block', width: 44, verticalAlign: 'middle', marginRight: 4 }}><span style={{ width: Math.min(100, m.pct) + '%', background: m.pct > 100 ? 'var(--red)' : 'var(--green)' }} /></span>{Math.round(m.pct)}%</> : <span className="muted">- -</span>}
                            </td>
                            <td style={{ textAlign: 'right' }} className={mi === 0 ? '' : 'muted'}>{mi === 0 ? m.planned.toFixed(1) + '%' : '0.0%'}</td>
                            <td style={{ textAlign: 'right' }}>{m.budget && mi === 0 ? <span style={{ color: m.delivery > 102 ? 'var(--amber)' : 'var(--green)', fontWeight: 700 }}>{m.delivery}%</span> : <span className="muted">0%</span>}</td>
                            <td style={{ textAlign: 'right' }} className={m.est ? '' : 'muted'}>{m.est ? cur(m.est, b.currency) : cur(0, b.currency)}</td>
                            <td style={{ textAlign: 'right' }} className={m.roas ? '' : 'muted'}>{m.roas ? cur(Number(m.roas.toFixed(2)), b.currency) : cur(0, b.currency)}</td>
                            <td style={{ textAlign: 'right' }} className={m.yday ? '' : 'muted'}>{m.yday ? cur(m.yday, b.currency) : cur(0, b.currency)}</td>
                          </Fragment>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <DataGrid
        id="auto-budgets"
        rowKey="profileId"
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
