import { useState } from 'react'
import { Kpi, KpiGrid, Card, Pill, Btn, Toggle, SearchBox, DataGrid, FilterBar, applyFilters, loadFilterModel, ExportMenu, Modal, toast, createdStore, exportCSV, usePersistentOverrides } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { reports, reportTemplates, alerts as ALERTS } from '../data/mock.js'
import { useApp } from '../state.jsx'

function InsHead({ title, sub, children }) {
  return <div className="page-head"><div><div className="page-title">{title}</div><div className="page-sub">{sub}</div></div><div className="page-actions">{children}</div></div>
}

/* ============================ REPORT CENTER ============================ */
const RP_TYPES = ['Dashboard', 'Campaign', 'Search Term', 'Share of Voice', 'Commerce', 'DSP']
const RP_FORMATS = ['PDF', 'XLSX', 'CSV', 'PDF + XLSX']
const RP_OWNERS = ['You', 'A. Rivera', 'M. Chen']
const RP_FIELDS = [
  { key: 'name', label: 'Report', type: 'text' },
  { key: 'type', label: 'Type', type: 'enum', options: RP_TYPES },
  { key: 'cadence', label: 'Schedule', type: 'text' },
  { key: 'format', label: 'Format', type: 'enum', options: RP_FORMATS },
  { key: 'recipients', label: 'Recipients', type: 'number' },
  { key: 'owner', label: 'Owner', type: 'enum', options: RP_OWNERS },
  { key: 'updated', label: 'Updated', type: 'text' },
]
const RP_CADENCES = ['On demand', 'Daily · 6:00 AM', 'Daily · 8:00 AM', 'Weekly · Mon 7:00 AM', 'Weekly · Fri 9:00 AM', 'Monthly · 1st 8:00 AM']
const REPORT_TEMPLATES = [
  { key: 'exec', title: 'Weekly Exec Summary', desc: 'Cross-channel KPIs in one dashboard.', form: { name: 'Weekly Exec Summary', type: 'Dashboard', cadence: 'Weekly · Mon 7:00 AM', format: 'PDF + XLSX', recipients: 4 } },
  { key: 'camp', title: 'Campaign Performance', desc: 'Daily spend/sales/ACoS across all profiles.', form: { name: 'Campaign Performance — All Profiles', type: 'Campaign', cadence: 'Daily · 6:00 AM', format: 'XLSX', recipients: 2 } },
  { key: 'harvest', title: 'Search Term Harvest', desc: 'Converting terms ready to promote.', form: { name: 'Search Term Harvest Candidates', type: 'Search Term', cadence: 'Daily · 8:00 AM', format: 'CSV', recipients: 1 } },
  { key: 'sov', title: 'Share of Voice', desc: 'Paid + organic SOV on priority keywords.', form: { name: 'Share of Voice — Priority Keywords', type: 'Share of Voice', cadence: 'Weekly · Fri 9:00 AM', format: 'PDF', recipients: 3 } },
  { key: 'shelf', title: 'Digital Shelf Health', desc: 'Buy Box, content, stock & ratings.', form: { name: 'Digital Shelf Health', type: 'Commerce', cadence: 'Weekly · Mon 7:00 AM', format: 'PDF', recipients: 5 } },
  { key: 'dsp', title: 'DSP Full-Funnel', desc: 'Awareness-to-conversion attribution.', form: { name: 'DSP Full-Funnel Attribution', type: 'DSP', cadence: 'Monthly · 1st 8:00 AM', format: 'XLSX', recipients: 3 } },
]
function ReportTemplatePicker({ onClose, onPick }) {
  return (
    <Modal width={560} title="Report Templates" sub="Start from a ready-made report — tweak it before saving" onClose={onClose}
      footer={<Btn ghost onClick={onClose}>Cancel</Btn>}>
      <div className="tmpl-list">
        {REPORT_TEMPLATES.map((t) => (
          <div key={t.key} className="tmpl-card" onClick={() => onPick(t.form)}>
            <div className="icobox" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}><Icon name="bars" size={16} /></div>
            <div className="grow"><div className="title">{t.title}</div><div className="desc">{t.desc}</div></div>
            <span className="tag">{t.form.type}</span>
            <Icon name="chevRight" size={15} className="muted" />
          </div>
        ))}
      </div>
    </Modal>
  )
}
function BuildReportModal({ initial, onClose, onCreate }) {
  const [f, setF] = useState(() => initial || { name: '', type: 'Dashboard', cadence: 'On demand', format: 'PDF', recipients: '1' })
  const upd = (patch) => setF((x) => ({ ...x, ...patch }))
  const canSave = String(f.name).trim() && Number(f.recipients) >= 0
  const save = () => onCreate({ name: String(f.name).trim(), type: f.type, cadence: f.cadence, format: f.format, recipients: Number(f.recipients) || 0 })
  return (
    <Modal width={560} title={initial ? 'New report from template' : 'Build Report'} sub="Create a saved or scheduled report" onClose={onClose}
      footer={<><Btn ghost onClick={onClose}>Cancel</Btn><div style={{ flex: 1 }} /><Btn primary disabled={!canSave} icon="plus" onClick={save}>Create report</Btn></>}>
      <label className="fld">Report name<input autoFocus value={f.name} onChange={(e) => upd({ name: e.target.value })} placeholder="e.g. Weekly Exec Summary" /></label>
      <div className="rb-grid2">
        <label className="fld">Type<select value={f.type} onChange={(e) => upd({ type: e.target.value })}>{RP_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
        <label className="fld">Format<select value={f.format} onChange={(e) => upd({ format: e.target.value })}>{RP_FORMATS.map((t) => <option key={t}>{t}</option>)}</select></label>
      </div>
      <div className="rb-grid2">
        <label className="fld">Schedule<select value={f.cadence} onChange={(e) => upd({ cadence: e.target.value })}>{RP_CADENCES.map((t) => <option key={t}>{t}</option>)}</select></label>
        <label className="fld">Recipients<input type="number" min="0" value={f.recipients} onChange={(e) => upd({ recipients: e.target.value })} /></label>
      </div>
    </Modal>
  )
}
export function Reports() {
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState(() => loadFilterModel('ins-reports'))
  const [created, setCreated] = useState(() => createdStore.get('reports'))
  const [picker, setPicker] = useState(false)
  const [builder, setBuilder] = useState(null) // null | {} | template-form
  const [runs, setRuns] = usePersistentOverrides('ins-reports-runs')
  const allReports = [...created, ...reports].map((r) => (runs[r.id] ? { ...r, ...runs[r.id] } : r))
  const runReport = (r) => { setRuns({ ...runs, [r.id]: { updated: 'just now' } }); toast(`Running "${r.name}" — data refreshed`) }
  const downloadReport = (r) => { exportCSV(`${String(r.name).replace(/[^\w -]+/g, '')}.csv`, RP_FIELDS, [r]); toast(`Downloaded "${r.name}" (CSV)`) }
  const createReport = (r) => { const row = { id: 'RPNEW' + Date.now().toString().slice(-7), owner: 'You', updated: 'just now', ...r }; const next = [row, ...created]; createdStore.set('reports', next); setCreated(next); setBuilder(null); toast(`Report "${r.name}" created`) }
  const searched = allReports.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()) || r.type.toLowerCase().includes(q.toLowerCase()))
  const filtered = applyFilters(searched, filters, RP_FIELDS)
  const columns = [
    { key: 'name', label: 'Report', sticky: true, width: 300, sortVal: (r) => r.name, render: (r) => <div>{r.name}<small>{r.type}</small></div> },
    { key: 'cadence', label: 'Schedule', sortVal: (r) => r.cadence, render: (r) => <span className="tag">{r.cadence}</span> },
    { key: 'format', label: 'Format', sortVal: (r) => r.format },
    { key: 'recipients', label: 'Recipients', num: true, foot: (rs) => rs.reduce((s, r) => s + r.recipients, 0), render: (r) => `${r.recipients}` },
    { key: 'owner', label: 'Owner', sortVal: (r) => r.owner },
    { key: 'updated', label: 'Updated', sortVal: (r) => r.updated, render: (r) => <span className="muted">{r.updated}</span> },
    { key: 'act', label: '', sort: false, render: (r) => <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}><Btn sm ghost icon="play" onClick={() => runReport(r)}>Run</Btn><Btn sm ghost icon="download" onClick={() => downloadReport(r)} /></span> },
  ]
  const dims = [{ key: 'type', label: 'Type' }, { key: 'owner', label: 'Owner' }, { key: 'format', label: 'Format' }]
  return (
    <>
      <InsHead title="Report Center" sub="Custom & scheduled reports, dashboards and exports"><ExportMenu name="report-center" fields={RP_FIELDS} rows={filtered} /><Btn icon="file" ghost onClick={() => setPicker(true)}>Templates</Btn><Btn icon="plus" primary onClick={() => setBuilder({})}>Build Report</Btn></InsHead>
      {picker && <ReportTemplatePicker onClose={() => setPicker(false)} onPick={(form) => { setPicker(false); setBuilder(form) }} />}
      {builder && <BuildReportModal initial={builder.name ? builder : null} onClose={() => setBuilder(null)} onCreate={createReport} />}
      <KpiGrid>
        <Kpi label="Saved Reports" value={allReports.length} />
        <Kpi label="Scheduled" value={allReports.filter(r => /·/.test(r.cadence)).length} />
        <Kpi label="Recipients" value={allReports.reduce((s, r) => s + r.recipients, 0)} />
        <Kpi label="Widgets Available" value={reportTemplates.length} />
      </KpiGrid>
      <Card title="Report builder — data sources" sub="Drag widgets onto a custom dashboard" >
        <div className="grid-3">
          {reportTemplates.map((t) => (
            <div key={t} className="lrow" style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 11 }}>
              <div className="icobox" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}><Icon name="bars" size={16} /></div>
              <div className="grow"><div className="title" style={{ fontSize: 12.5 }}>{t}</div></div>
              <Icon name="plus" size={15} className="muted" />
            </div>
          ))}
        </div>
      </Card>
      <div style={{ height: 16 }} />
      <DataGrid
        id="ins-reports"
        columns={columns}
        rows={filtered}
        initialSort={{ key: 'name', dir: 'asc' }}
        dimensions={dims}
        totals
        toolbarLeft={<>
          <SearchBox value={q} onChange={setQ} placeholder="Search reports…" />
          <FilterBar id="ins-reports" fields={RP_FIELDS} value={filters} onChange={setFilters} />
        </>}
      />
      <div className="footnote">Filter saved & scheduled reports, group by type or owner, and export the current list. Build new reports from the data-source widgets above.</div>
    </>
  )
}

/* ============================ ALERTS ============================ */
const sevTone = { high: 'red', med: 'amber', low: 'gray' }
const AL_FIELDS = [
  { key: 'title', label: 'Alert', type: 'text' },
  { key: 'body', label: 'Detail', type: 'text' },
  { key: 'sevLabel', label: 'Severity', type: 'enum', options: ['High', 'Med', 'Low'] },
  { key: 'status', label: 'Status', type: 'enum', options: ['Unread', 'Read'] },
  { key: 'time', label: 'Time', type: 'text' },
]
const sevRank = { high: 3, med: 2, low: 1 }
const AS_KEY = 'chalertsettings'
const AS_CATEGORIES = [
  ['budget', 'Budget pacing & overspend'],
  ['acos', 'ACoS / ROAS spikes'],
  ['buybox', 'Buy Box loss'],
  ['stock', 'Out of stock / low inventory'],
  ['rank', 'Keyword rank drops'],
  ['anomaly', 'Spend / impression anomalies'],
]
const AS_DEFAULT = { budget: true, acos: true, buybox: true, stock: true, rank: false, anomaly: true, minSev: 'med', channel: 'Email + in-app', digest: 'Real-time' }
const asLoad = () => { try { return { ...AS_DEFAULT, ...(JSON.parse(localStorage.getItem(AS_KEY)) || {}) } } catch (e) { return { ...AS_DEFAULT } } }
const asSave = (s) => { try { localStorage.setItem(AS_KEY, JSON.stringify(s)) } catch (e) { /* ignore */ } }
function AlertSettingsModal({ onClose }) {
  const [s, setS] = useState(asLoad)
  const upd = (patch) => setS((x) => ({ ...x, ...patch }))
  const save = () => { asSave(s); onClose(); toast('Alert settings saved') }
  return (
    <Modal width={540} title="Alert Settings" sub="Choose which signals notify you and how" onClose={onClose}
      footer={<><Btn ghost onClick={onClose}>Cancel</Btn><div style={{ flex: 1 }} /><Btn primary icon="check" onClick={save}>Save settings</Btn></>}>
      <div className="fld" style={{ marginBottom: 4 }}>Alert categories</div>
      {AS_CATEGORIES.map(([k, label]) => (
        <div key={k} className="lrow" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
          <div className="grow"><div className="title" style={{ fontSize: 12.5 }}>{label}</div></div>
          <Toggle on={!!s[k]} onClick={() => upd({ [k]: !s[k] })} />
        </div>
      ))}
      <div className="rb-grid2" style={{ marginTop: 12 }}>
        <label className="fld">Minimum severity<select value={s.minSev} onChange={(e) => upd({ minSev: e.target.value })}>{[['high', 'High only'], ['med', 'Medium & up'], ['low', 'All']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label className="fld">Delivery<select value={s.channel} onChange={(e) => upd({ channel: e.target.value })}>{['Email + in-app', 'In-app only', 'Email only', 'Slack'].map((c) => <option key={c}>{c}</option>)}</select></label>
      </div>
      <label className="fld">Frequency<select value={s.digest} onChange={(e) => upd({ digest: e.target.value })}>{['Real-time', 'Hourly digest', 'Daily digest'].map((d) => <option key={d}>{d}</option>)}</select></label>
    </Modal>
  )
}
export function Alerts() {
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState(asLoad)
  const { alertReads, markAlertRead, markAlertsRead } = useApp()
  const alerts = ALERTS.map((x) => (alertReads.includes(x.id) ? { ...x, read: true } : x))
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState(() => loadFilterModel('ins-alerts'))
  const markRead = (id) => markAlertRead(id)
  const markAll = () => markAlertsRead(ALERTS.map((x) => x.id))
  const decorated = alerts.map((a) => ({ ...a, sevLabel: { high: 'High', med: 'Med', low: 'Low' }[a.sev], status: a.read ? 'Read' : 'Unread' }))
  // Apply saved Alert Settings: category toggles + minimum severity.
  const visible = decorated.filter((a) => (!a.cat || settings[a.cat] !== false) && sevRank[a.sev] >= sevRank[settings.minSev])
  const hiddenCount = decorated.length - visible.length
  const todayCount = visible.filter((a) => { const t = a.time.match(/^(\d+)([mh]) ago$/); return t && (t[2] === 'm' || Number(t[1]) < 24) }).length
  const searched = visible.filter((a) => a.title.toLowerCase().includes(q.toLowerCase()) || a.body.toLowerCase().includes(q.toLowerCase()))
  const filtered = applyFilters(searched, filters, AL_FIELDS)
  const columns = [
    { key: 'title', label: 'Alert', sticky: true, width: 360, sortVal: (r) => r.title, render: (a) => (
      <div className="flex items-center gap-8">
        <div className="icobox" style={{ background: insSevBg(a.sev), color: insSevColor(a.sev), width: 30, height: 30, flex: '0 0 auto' }}><Icon name={a.icon} size={15} /></div>
        <div><div className="title" style={{ fontWeight: a.read ? 600 : 750 }}>{a.title}{!a.read && <span className="dot-unread" />}</div><small>{a.body}</small></div>
      </div>
    ) },
    { key: 'sevLabel', label: 'Severity', sortVal: (r) => sevRank[r.sev], render: (a) => <Pill tone={sevTone[a.sev]}>{a.sevLabel}</Pill> },
    { key: 'status', label: 'Status', sortVal: (r) => r.status, render: (a) => a.read ? <span className="muted">Read</span> : <Pill tone="blue">Unread</Pill> },
    { key: 'time', label: 'Time', sortVal: (r) => r.time, render: (a) => <span className="muted">{a.time}</span> },
    { key: 'act', label: '', sort: false, render: (a) => !a.read ? <Btn sm ghost icon="check" onClick={() => markRead(a.id)}>Mark read</Btn> : <span className="muted" style={{ fontSize: 11 }}>—</span> },
  ]
  const dims = [{ key: 'sevLabel', label: 'Severity' }, { key: 'status', label: 'Status' }]
  return (
    <>
      <InsHead title="Alerts" sub="Real-time notifications across ads, budget & retail signals"><ExportMenu name="alerts" fields={AL_FIELDS} rows={filtered} /><Btn icon="check" ghost onClick={markAll}>Mark all read</Btn><Btn icon="gear" primary onClick={() => setShowSettings(true)}>Alert Settings</Btn></InsHead>
      {showSettings && <AlertSettingsModal onClose={() => { setShowSettings(false); setSettings(asLoad()) }} />}
      <KpiGrid>
        <Kpi label="Unread" value={visible.filter(a => !a.read).length} />
        <Kpi label="High Severity" value={visible.filter(a => a.sev === 'high').length} />
        <Kpi label="Today" value={todayCount} />
      </KpiGrid>
      {hiddenCount > 0 && <div className="footnote" style={{ margin: '0 0 10px' }}>{hiddenCount} alert{hiddenCount > 1 ? 's' : ''} hidden by Alert Settings (category toggles / minimum severity).</div>}
      <DataGrid
        id="ins-alerts"
        columns={columns}
        rows={filtered}
        initialSort={{ key: 'sevLabel', dir: 'desc' }}
        dimensions={dims}
        toolbarLeft={<>
          <SearchBox value={q} onChange={setQ} placeholder="Search alerts…" />
          <FilterBar id="ins-alerts" fields={AL_FIELDS} value={filters} onChange={setFilters} />
        </>}
      />
      <div className="footnote">Filter by severity or read status, sort by time, and export. High-severity retail signals (out-of-stock, Buy Box loss) trigger ad auto-pause via the rule engine.</div>
    </>
  )
}
const insSevBg = (s) => ({ high: 'var(--red-soft)', med: 'var(--amber-soft)', low: '#eef1f6' }[s])
const insSevColor = (s) => ({ high: 'var(--red)', med: 'var(--amber)', low: 'var(--text-2)' }[s])

/* ============================ SETTINGS ============================ */
const SEED_CONNS = [
  { name: 'Amazon Ads API', detail: 'SP · SB · SD · profiles US / CA / UK', status: 'Connected', icon: 'ads' },
  { name: 'Amazon DSP', detail: 'Seat: Brightleaf Media', status: 'Connected', icon: 'globe' },
  { name: 'Amazon Marketing Cloud', detail: 'Instance: brightleaf-amc', status: 'Connected', icon: 'database' },
  { name: 'Selling Partner API (SP-API)', detail: 'Vendor Central · Seller Central', status: 'Connected', icon: 'store' },
  { name: 'Walmart Connect', detail: 'Not linked', status: 'Disconnected', icon: 'box' },
]
const INTEGRATION_PROVIDERS = [
  { name: 'Walmart Connect', icon: 'box' },
  { name: 'Instacart Ads', icon: 'store' },
  { name: 'Target Roundel', icon: 'box' },
  { name: 'Criteo', icon: 'globe' },
  { name: 'Google Ads', icon: 'globe' },
  { name: 'TikTok Shop', icon: 'store' },
  { name: 'Shopify', icon: 'store' },
  { name: 'Google Analytics 4', icon: 'database' },
]
function AddIntegrationModal({ onClose, onAdd }) {
  const [f, setF] = useState({ provider: INTEGRATION_PROVIDERS[0].name, account: '' })
  const upd = (patch) => setF((x) => ({ ...x, ...patch }))
  const canSave = f.provider && f.account.trim()
  const save = () => { const p = INTEGRATION_PROVIDERS.find((x) => x.name === f.provider) || {}; onAdd({ name: f.provider, detail: f.account.trim(), status: 'Connected', icon: p.icon || 'box' }) }
  return (
    <Modal width={500} title="Add Integration" sub="Connect another advertising or retail data source" onClose={onClose}
      footer={<><Btn ghost onClick={onClose}>Cancel</Btn><div style={{ flex: 1 }} /><Btn primary disabled={!canSave} icon="plus" onClick={save}>Connect</Btn></>}>
      <label className="fld">Provider<select autoFocus value={f.provider} onChange={(e) => upd({ provider: e.target.value })}>{INTEGRATION_PROVIDERS.map((p) => <option key={p.name}>{p.name}</option>)}</select></label>
      <label className="fld">Account / seat<input value={f.account} onChange={(e) => upd({ account: e.target.value })} placeholder="e.g. Seat: Brightleaf Media" /></label>
      <div className="modal-note"><Icon name="bulb" size={14} />OAuth happens in the provider's console — this records the connection in CommerceHub.</div>
    </Modal>
  )
}
export function Settings() {
  const [created, setCreated] = useState(() => createdStore.get('integrations'))
  const [showAdd, setShowAdd] = useState(false)
  const conns = [...created, ...SEED_CONNS]
  const addIntegration = (c) => { const next = [c, ...created]; createdStore.set('integrations', next); setCreated(next); setShowAdd(false); toast(`${c.name} connected`) }
  return (
    <>
      <InsHead title="Settings" sub="Integrations, users & account configuration"><Btn icon="plus" primary onClick={() => setShowAdd(true)}>Add Integration</Btn></InsHead>
      {showAdd && <AddIntegrationModal onClose={() => setShowAdd(false)} onAdd={addIntegration} />}
      <div className="grid-2">
        <Card title="Connected data sources" sub="Advertising & retail integrations" pad={false}>
          {conns.map((c, i) => (
            <div key={c.name + i} className="lrow">
              <div className="icobox" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}><Icon name={c.icon} size={17} /></div>
              <div className="grow"><div className="title">{c.name}</div><div className="desc">{c.detail}</div></div>
              <Pill tone={c.status === 'Connected' ? 'green' : 'gray'}>{c.status}</Pill>
            </div>
          ))}
        </Card>
        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <Card title="Account" sub="Organization profile">
            <Field label="Organization" value="Brightleaf Media (Agency)" />
            <Field label="Default currency" value="USD ($)" />
            <Field label="Account time zone" value="America/Toronto" />
            <Field label="Plan" value="Enterprise · 3 marketplaces" />
          </Card>
          <Card title="Team" sub="4 members">
            {[['JL', 'Jim Laframboise', 'Owner'], ['AR', 'A. Rivera', 'Analyst'], ['MC', 'M. Chen', 'Manager']].map(([i, n, role]) => (
              <div key={n} className="lrow" style={{ padding: '9px 0' }}>
                <div className="avatar" style={{ background: 'var(--brand)' }}>{i}</div>
                <div className="grow"><div className="title" style={{ fontSize: 12.5 }}>{n}</div></div>
                <span className="tag">{role}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </>
  )
}
function Field({ label, value }) {
  return <div className="flex between" style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
    <span className="muted">{label}</span><b style={{ fontSize: 12.5 }}>{value}</b>
  </div>
}
