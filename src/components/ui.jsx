import { useState, useMemo, useRef, useEffect, Fragment } from 'react'
import Icon from './Icon.jsx'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

/* ---------------- KPI cards ---------------- */
export function Kpi({ label, value, delta, deltaGood, hint }) {
  const up = delta != null && delta >= 0
  const good = deltaGood === undefined ? up : deltaGood
  return (
    <div className="kpi">
      <div className="k-label">{label}{hint && <span title={hint} style={{ color: 'var(--text-3)' }}>·</span>}</div>
      <div className="k-val">{value}</div>
      {delta != null && (
        <div className={`k-delta ${good ? 'up' : 'down'}`}>
          <Icon name={up ? 'arrowUp' : 'arrowDown'} size={12} />{Math.abs(delta).toFixed(1)}%
        </div>
      )}
    </div>
  )
}
export function KpiGrid({ children }) { return <div className="kpi-grid">{children}</div> }

/* ---------------- FX rates — USD estimates for mixed-currency aggregates ---------------- */
export const FX_USD = { us: 1, ca: 0.73, uk: 1.26 };
export const fxUSD = (pid) => FX_USD[pid] ?? 1;

/* ---------------- Status pill ---------------- */
const STATUS_MAP = {
  Enabled: 'green', Active: 'green', Ready: 'green', 'On pace': 'green', 'In Stock': 'green',
  Paused: 'gray', Draft: 'gray', Ended: 'gray', monitor: 'gray',
  'Out of Budget': 'amber', 'Under pace': 'amber', Running: 'blue', 'Out of Stock': 'red',
  'Over pace': 'red', negate: 'red', harvest: 'green',
}
export function Pill({ children, tone }) {
  const t = tone || STATUS_MAP[children] || 'gray'
  return <span className={`pill ${t}`}><span className="dot" />{children}</span>
}

/* ---------------- Toggle ---------------- */
export function Toggle({ on, onClick }) {
  return <button className={`toggle ${on ? 'on' : ''}`} onClick={onClick} aria-pressed={on} />
}

/* ---------------- Card ---------------- */
export function Card({ title, sub, actions, children, pad = true }) {
  return (
    <div className="card">
      {(title || actions) && (
        <div className="card-head">
          <div><h3>{title}</h3>{sub && <div className="sub">{sub}</div>}</div>
          {actions}
        </div>
      )}
      <div style={pad ? { padding: 16 } : {}}>{children}</div>
    </div>
  )
}

/* ---------------- Checkbox ---------------- */
export function Check({ on, onClick }) {
  return <span className={`cb ${on ? 'on' : ''}`} onClick={onClick}>{on && <Icon name="check" size={11} strokeWidth={3} />}</span>
}

/* ---------------- DataTable ----------------
   columns: [{ key, label, num?, sticky?, render?(row), width? }]
*/
/* DataTable + useSort were removed in Phase 9 — every page now uses DataGrid. */

/* ---------------- Charts ---------------- */
const AXIS = { fontSize: 11, fill: '#8a94a6' }
export function PerfChart({ data, height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="gSpend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a4fd6" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#1a4fd6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1aa260" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#1aa260" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
        <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} interval={4} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={48}
          tickFormatter={(v) => (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
        <Tooltip contentStyle={tipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="sales" name="Sales" stroke="#1aa260" strokeWidth={2} fill="url(#gSales)" />
        <Area type="monotone" dataKey="spend" name="Spend" stroke="#1a4fd6" strokeWidth={2} fill="url(#gSpend)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
export function MiniLine({ data, dataKey, color = '#1a4fd6', height = 40 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
export function DualBar({ data, height = 260, keys }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={42} />
        <Tooltip contentStyle={tipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {keys.map((k) => <Bar key={k.key} dataKey={k.key} name={k.label} fill={k.color} radius={[4, 4, 0, 0]} />)}
      </BarChart>
    </ResponsiveContainer>
  )
}
const tipStyle = { background: '#fff', border: '1px solid #e6e9ef', borderRadius: 10, fontSize: 12, boxShadow: '0 8px 28px rgba(16,24,40,.12)' }

/* ---------------- Toolbar bits ---------------- */
export function SearchBox({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="search">
      <Icon name="search" size={15} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}
export function Btn({ icon, children, primary, ghost, sm, onClick }) {
  return (
    <button className={`btn ${primary ? 'primary' : ''} ${ghost ? 'ghost' : ''} ${sm ? 'sm' : ''}`} onClick={onClick}>
      {icon && <Icon name={icon} size={sm ? 13 : 15} />}{children}
    </button>
  )
}
export function ViewTabs({ tabs, active, onChange }) {
  return (
    <div className="viewtabs">
      {tabs.map((t) => (
        <div key={t} className={`viewtab ${active === t ? 'active' : ''}`} onClick={() => onChange(t)}>{t}</div>
      ))}
    </div>
  )
}

/* ============================================================================
   DataGrid — the reusable Pacvue-style grid used by every advertising view.
   Features: sort every column, column presets + custom chooser (show/hide/
   reorder, persisted), pagination (page-size · total · go-to-page), pinned
   totals row, frozen first column + horizontal scroll, group-by (Dimensions),
   period-compare toggle, density toggle.

   columns: [{ key, label, num?, sticky?, width?, render?(row), sortVal?(row),
               sort?:false, foot?(rows)=>node, delta?:true }]
   presets: { 'View Name': [colKey,...] }      dimensions: [{ key, label }]
   ========================================================================== */
const gridStore = {
  get(id) { try { return JSON.parse(localStorage.getItem('chgrid:' + id)) } catch (e) { return null } },
  set(id, v) { try { localStorage.setItem('chgrid:' + id, JSON.stringify(v)) } catch (e) { /* ignore */ } },
}
function hashUnit(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return ((h >>> 0) % 1000) / 1000 }
function pageList(cur, total) {
  const out = []
  if (total <= 7) { for (let i = 1; i <= total; i++) out.push(i); return out }
  out.push(1)
  if (cur > 3) out.push('…')
  for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) out.push(i)
  if (cur < total - 2) out.push('…')
  out.push(total)
  return out
}

export function Popover({ trigger, children, align = 'left', width }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const k = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', h); document.addEventListener('keydown', k)
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k) }
  }, [open])
  return (
    <div className="pop-wrap" ref={ref}>
      <span onClick={() => setOpen((o) => !o)}>{trigger}</span>
      {open && (
        <div className={`pop ${align === 'right' ? 'pop-r' : ''}`} style={width ? { width } : undefined}>
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  )
}

function SortCaret({ active, dir }) {
  if (!active) return <Icon name="chevDown" size={11} className="caret" />
  return <Icon name={dir === 'asc' ? 'arrowUp' : 'arrowDown'} size={11} className="caret on" />
}
function DeltaChip({ row, ck, prevRow }) {
  if (!prevRow) return null // no real prior period supplied — show nothing rather than a mock delta
  const cur = Number(row[ck]); const prev = Number(prevRow[ck])
  if (!isFinite(cur) || !isFinite(prev) || prev === 0) return null
  const d = (cur - prev) / Math.abs(prev)
  const up = d >= 0
  return <span className={`gdelta ${up ? 'up' : 'down'}`}>{up ? '▲' : '▼'}{Math.abs(d * 100).toFixed(1)}%</span>
}

export function DataGrid({
  id, columns, rows, initialSort,
  presets, defaultPreset, dimensions, totals, compare, comparePrev, compareDisabled,
  selectable, selected, onToggle, onToggleAll, rowKey = 'id',
  pageSizes = [25, 50, 100], empty = 'No data', toolbarLeft,
}) {
  const colByKey = useMemo(() => Object.fromEntries(columns.map((c) => [c.key, c])), [columns])
  const allKeys = useMemo(() => columns.map((c) => c.key), [columns])
  const stickyKey = (columns.find((c) => c.sticky) || {}).key
  const presetCols = (name) => (presets && presets[name]) ? presets[name] : allKeys

  const saved = useMemo(() => (id ? gridStore.get(id) : null), [id])
  const firstPreset = defaultPreset || (presets ? Object.keys(presets)[0] : null)
  const [view, setView] = useState(saved?.view || firstPreset || 'Default')
  const [order, setOrder] = useState(saved?.order?.filter((k) => colByKey[k])?.concat(allKeys.filter((k) => !(saved.order || []).includes(k))) || (firstPreset ? [...presetCols(firstPreset), ...allKeys.filter((k) => !presetCols(firstPreset).includes(k))] : allKeys))
  const [hidden, setHidden] = useState(new Set(saved?.hidden || (firstPreset ? allKeys.filter((k) => !presetCols(firstPreset).includes(k)) : [])))

  useEffect(() => { if (id) gridStore.set(id, { view, order, hidden: [...hidden] }) }, [id, view, order, hidden])

  const applyPreset = (name) => {
    setView(name)
    const keys = presetCols(name)
    setOrder([...keys, ...allKeys.filter((k) => !keys.includes(k))])
    setHidden(new Set(allKeys.filter((k) => !keys.includes(k))))
  }
  const toggleCol = (k) => { setView('Custom'); setHidden((h) => { const n = new Set(h); n.has(k) ? n.delete(k) : n.add(k); return n }) }
  const moveCol = (k, dir) => {
    setView('Custom')
    setOrder((o) => { const a = [...o]; const i = a.indexOf(k); const j = i + dir; if (i < 0 || j < 0 || j >= a.length) return a;[a[i], a[j]] = [a[j], a[i]]; return a })
  }

  const visibleCols = useMemo(() => {
    const ordered = [...order.filter((k) => colByKey[k]), ...allKeys.filter((k) => !order.includes(k))]
    let vis = ordered.filter((k) => k === stickyKey || !hidden.has(k)).map((k) => colByKey[k])
    if (stickyKey) vis = [colByKey[stickyKey], ...vis.filter((c) => c.key !== stickyKey)]
    return vis
  }, [order, hidden, colByKey, allKeys, stickyKey])

  const [sort, setSort] = useState(initialSort || { key: null, dir: 'desc' })
  const onSort = (k) => setSort((s) => (s.key === k ? { key: k, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key: k, dir: typeof rows[0]?.[k] === 'number' ? 'desc' : 'asc' }))
  const sortedAll = useMemo(() => {
    if (!sort.key) return rows
    const col = colByKey[sort.key]
    const val = (r) => (col?.sortVal ? col.sortVal(r) : r[sort.key])
    return [...rows].sort((a, b) => {
      const x = val(a), y = val(b)
      if (typeof x === 'number' && typeof y === 'number') return sort.dir === 'asc' ? x - y : y - x
      return sort.dir === 'asc' ? String(x).localeCompare(String(y)) : String(y).localeCompare(String(x))
    })
  }, [rows, sort, colByKey])

  const [compareOn, setCompareOn] = useState(false)
  const showCompare = compareOn && !compareDisabled
  const [dense, setDense] = useState(false)
  const [groupKey, setGroupKey] = useState(null)
  const grouped = !!groupKey
  // Dimension defs may carry { field, drill }: `field` = row field to group on (defaults to key);
  // `drill` = start collapsed, click group header to drill down (Pacvue "Campaign Type (Drill-down)").
  const dimDef = grouped ? (dimensions || []).find((d) => d.key === groupKey) : null
  const groupField = dimDef?.field || groupKey
  const [toggledGroups, setToggledGroups] = useState(() => new Set())
  useEffect(() => { setToggledGroups(new Set()) }, [groupKey])
  const groupOpen = (g) => (dimDef?.drill ? toggledGroups.has(g) : !toggledGroups.has(g))
  const toggleGroup = (g) => setToggledGroups((s) => { const n = new Set(s); n.has(g) ? n.delete(g) : n.add(g); return n })

  const [pageSize, setPageSize] = useState(pageSizes[0])
  const [page, setPage] = useState(1)
  const totalEntries = rows.length
  const pageCount = Math.max(1, Math.ceil(totalEntries / pageSize))
  const curPage = Math.min(page, pageCount)
  useEffect(() => { setPage(1) }, [pageSize, groupKey, totalEntries, sort.key, sort.dir])
  const pageRows = grouped ? sortedAll : sortedAll.slice((curPage - 1) * pageSize, curPage * pageSize)

  const groups = useMemo(() => {
    if (!grouped) return null
    const map = new Map()
    for (const r of sortedAll) { const g = r[groupField] ?? '—'; if (!map.has(g)) map.set(g, []); map.get(g).push(r) }
    return [...map.entries()].map(([k, rs]) => ({ key: k, rows: rs }))
  }, [grouped, groupField, sortedAll])

  const colSpan = visibleCols.length + (selectable ? 1 : 0)
  const allOn = selectable && pageRows.length > 0 && pageRows.every((r) => selected?.has(r[rowKey]))

  const cell = (c, r) => (
    <td key={c.key} className={`${c.num ? 'num' : ''} ${c.sticky ? 'sticky-l cellname' : ''}`}>
      {c.render ? c.render(r) : r[c.key]}
      {showCompare && c.delta && <DeltaChip row={r} ck={c.key} rk={rowKey} prevRow={comparePrev ? comparePrev[r[rowKey]] : null} />}
    </td>
  )
  const dimLabel = grouped ? (dimensions.find((d) => d.key === groupKey)?.label || groupKey) : null

  return (
    <>
      <div className="gridbar">
        <div className="gb-left">{toolbarLeft}</div>
        <div className="gb-right">
          {compare && (
            <label className={`gtoggle ${compareDisabled ? 'disabled' : ''}`} title={compareDisabled ? 'Period comparison isn’t available for “All time”' : ''}>
              <Toggle on={showCompare} onClick={() => { if (!compareDisabled) setCompareOn((v) => !v) }} /> vs prev period
            </label>
          )}
          <span className={`chip ${dense ? 'on' : ''}`} onClick={() => setDense((d) => !d)}><Icon name="bars" size={13} /> Compact</span>
          {dimensions && (
            <Popover align="right" width={200} trigger={<Btn sm ghost icon="layers">{grouped ? `Grouped: ${dimLabel}` : 'Dimensions'}</Btn>}>
              {(close) => (
                <div className="colmenu">
                  <div className="cm-head">Group rows by</div>
                  <div className="cm-list">
                    <div className={`cm-opt ${!grouped ? 'on' : ''}`} onClick={() => { setGroupKey(null); close() }}>None</div>
                    {dimensions.map((d) => (
                      <div key={d.key} className={`cm-opt ${groupKey === d.key ? 'on' : ''}`} onClick={() => { setGroupKey(d.key); close() }}>{d.label}</div>
                    ))}
                  </div>
                </div>
              )}
            </Popover>
          )}
          <Popover align="right" width={272} trigger={<Btn sm ghost icon="sliders">Columns</Btn>}>
            <div className="colmenu">
              {presets && (
                <div className="cm-presets">
                  {Object.keys(presets).map((p) => (
                    <button key={p} className={`cm-preset ${view === p ? 'on' : ''}`} onClick={() => applyPreset(p)}>{p}</button>
                  ))}
                  <button className={`cm-preset ${view === 'Custom' ? 'on' : ''}`} disabled>Custom</button>
                </div>
              )}
              <div className="cm-head">Columns ({visibleCols.length})</div>
              <div className="cm-list cm-cols">
                {[...order.filter((k) => colByKey[k]), ...allKeys.filter((k) => !order.includes(k))].map((k) => {
                  const c = colByKey[k]; const isSticky = k === stickyKey
                  return (
                    <div key={k} className="cm-row">
                      <Check on={isSticky || !hidden.has(k)} onClick={() => !isSticky && toggleCol(k)} />
                      <span className="cm-label">{c.label || k}{isSticky && <span className="muted"> · pinned</span>}</span>
                      <span className="cm-move">
                        <button onClick={() => moveCol(k, -1)} title="Move up">↑</button>
                        <button onClick={() => moveCol(k, 1)} title="Move down">↓</button>
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </Popover>
        </div>
      </div>

      <div className="tablewrap">
        <table className={`dt ${dense ? 'dense' : ''}`}>
          <thead>
            <tr>
              {selectable && <th className="sticky-l" style={{ width: 36 }}><Check on={allOn} onClick={onToggleAll} /></th>}
              {visibleCols.map((c) => (
                <th key={c.key} className={`${c.num ? 'num' : ''} ${c.sticky ? 'sticky-l' : ''} ${c.sort === false ? '' : 'sortable'}`}
                  style={c.width ? { minWidth: c.width } : undefined}
                  onClick={() => c.sort !== false && onSort(c.key)}>
                  <span className="th-in">{c.label}{c.sort !== false && <SortCaret active={sort.key === c.key} dir={sort.dir} />}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && <tr><td colSpan={colSpan} className="empty">{empty}</td></tr>}
            {!grouped && pageRows.map((r) => (
              <tr key={r[rowKey]}>
                {selectable && <td className="sticky-l"><Check on={selected?.has(r[rowKey])} onClick={() => onToggle(r[rowKey])} /></td>}
                {visibleCols.map((c) => cell(c, r))}
              </tr>
            ))}
            {grouped && groups.map((g) => (
              <Fragment key={g.key}>
                <tr className="grow" onClick={() => toggleGroup(g.key)} style={{ cursor: 'pointer' }}>
                  <td className="sticky-l" colSpan={1 + (selectable ? 1 : 0)}>
                    <span style={{ display: 'inline-flex', transform: groupOpen(g.key) ? 'none' : 'rotate(-90deg)', transition: 'transform .15s' }}><Icon name="chevDown" size={12} /></span>
                    {' '}{String(g.key)} <span className="muted">({g.rows.length})</span>
                  </td>
                  {visibleCols.slice(1).map((c) => <td key={c.key} className={c.num ? 'num' : ''}>{c.foot ? c.foot(g.rows) : ''}</td>)}
                </tr>
                {groupOpen(g.key) && g.rows.map((r) => (
                  <tr key={r[rowKey]}>
                    {selectable && <td className="sticky-l"><Check on={selected?.has(r[rowKey])} onClick={() => onToggle(r[rowKey])} /></td>}
                    {visibleCols.map((c) => cell(c, r))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
          {totals && (
            <tfoot>
              <tr className="trow">
                {selectable && <td className="sticky-l" />}
                {visibleCols.map((c, i) => (
                  <td key={c.key} className={`${c.num ? 'num' : ''} ${c.sticky ? 'sticky-l' : ''}`}>
                    {i === 0 ? <b>Total · {totalEntries}</b> : (c.foot ? c.foot(rows) : '')}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="pager">
        <span className="pg-total">Total <b>{totalEntries.toLocaleString()}</b> entries</span>
        <div className="pg-size">
          Rows:
          <select value={pageSize} onChange={(e) => setPageSize(+e.target.value)}>
            {pageSizes.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }} />
        {grouped ? (
          <span className="muted">Grouped — all rows shown</span>
        ) : (
          <div className="pg-nav">
            <button disabled={curPage <= 1} onClick={() => setPage(curPage - 1)}>‹</button>
            {pageList(curPage, pageCount).map((p, i) => (p === '…'
              ? <span key={'g' + i} className="pg-gap">…</span>
              : <button key={p} className={p === curPage ? 'on' : ''} onClick={() => setPage(p)}>{p}</button>))}
            <button disabled={curPage >= pageCount} onClick={() => setPage(curPage + 1)}>›</button>
            <span className="pg-go">Go to
              <input type="number" min={1} max={pageCount} defaultValue={curPage}
                onKeyDown={(e) => { if (e.key === 'Enter') { const v = +e.target.value; if (v >= 1 && v <= pageCount) setPage(v) } }} />
            </span>
          </div>
        )}
      </div>
    </>
  )
}

/* ============================================================================
   FilterBar — schema-driven filter builder + saved Plans (Phase 2).
   fields: [{ key, label, type:'text'|'enum'|'number', options? }]
   model:  { join:'AND'|'OR', conditions:[{ id, field, op, value }] }
   Use applyFilters(rows, model, fields) to get filtered rows.
   ========================================================================== */
const filterStore = {
  get(id) { try { return JSON.parse(localStorage.getItem('chfilter:' + id)) } catch (e) { return null } },
  set(id, v) { try { localStorage.setItem('chfilter:' + id, JSON.stringify(v)) } catch (e) { /* ignore */ } },
}
const planStore = {
  get(id) { try { return JSON.parse(localStorage.getItem('chplan:' + id)) } catch (e) { return null } },
  set(id, v) { try { localStorage.setItem('chplan:' + id, JSON.stringify(v)) } catch (e) { /* ignore */ } },
}
export function loadFilterModel(id) { return filterStore.get(id) || { join: 'AND', conditions: [] } }

const OPS = {
  text: [{ op: 'contains', label: 'Contains(or)' }, { op: 'containsand', label: 'Contains(and)' }, { op: 'notcontains', label: 'Not Contains' }, { op: 'equals', label: 'Is' }, { op: 'isnot', label: 'Is Not' }, { op: 'startswith', label: 'Start with' }],
  enum: [{ op: 'in', label: 'is any of' }, { op: 'notin', label: 'is not' }],
  number: [{ op: 'gt', label: '>' }, { op: 'gte', label: '≥' }, { op: 'lt', label: '<' }, { op: 'lte', label: '≤' }, { op: 'eq', label: '=' }, { op: 'between', label: 'between' }],
}
const opsFor = (type) => OPS[type] || OPS.text
const opShort = { contains: '∋', containsand: '∋&', notcontains: '∌', equals: '=', isnot: '≠', startswith: '^', in: ':', notin: '≠', gt: '>', gte: '≥', lt: '<', lte: '≤', eq: '=', between: '' }
const normOpts = (f) => (f.options || []).map((o) => (typeof o === 'object' ? o : { value: o, label: String(o) }))
const uid = () => Math.random().toString(36).slice(2, 8)
const clone = (v) => JSON.parse(JSON.stringify(v))

function condHasValue(c) {
  if (Array.isArray(c.value)) return c.value.filter((v) => v !== '' && v != null).length > 0
  return c.value !== '' && c.value != null
}
function activeConds(model, byKey) {
  return (model?.conditions || []).filter((c) => c.field && byKey[c.field] && condHasValue(c))
}
function condMatch(row, c, field) {
  const v = row[c.field]
  if (field.type === 'enum') {
    const arr = c.value || []
    if (!arr.length) return true
    return c.op === 'notin' ? !arr.includes(v) : arr.includes(v)
  }
  if (field.type === 'number') {
    const x = Number(v)
    if (c.op === 'between') {
      const [a, b] = c.value || []
      if ((a === '' || a == null) && (b === '' || b == null)) return true
      if (a !== '' && a != null && x < +a) return false
      if (b !== '' && b != null && x > +b) return false
      return true
    }
    const n = Number(c.value)
    if (c.value === '' || c.value == null || isNaN(n)) return true
    if (c.op === 'gt') return x > n
    if (c.op === 'gte') return x >= n
    if (c.op === 'lt') return x < n
    if (c.op === 'lte') return x <= n
    if (c.op === 'eq') return x === n
    return true
  }
  // text
  const s = String(v ?? '').toLowerCase(); const q = String(c.value ?? '').toLowerCase()
  if (!q) return true
  // comma-separated multi-term support (Pacvue: Contains(or) / Contains(and) / Not Contains)
  const terms = q.split(',').map((t) => t.trim()).filter(Boolean)
  if (c.op === 'containsand') return terms.every((t) => s.includes(t))
  if (c.op === 'notcontains') return !terms.some((t) => s.includes(t))
  if (c.op === 'equals') return s === q
  if (c.op === 'isnot') return s !== q
  if (c.op === 'startswith') return s.startsWith(q)
  return terms.some((t) => s.includes(t)) // contains = Contains(or)
}
export function applyFilters(rows, model, fields) {
  const byKey = Object.fromEntries(fields.map((f) => [f.key, f]))
  const active = activeConds(model, byKey)
  if (!active.length) return rows
  return rows.filter((row) => {
    const res = active.map((c) => condMatch(row, c, byKey[c.field]))
    return model.join === 'OR' ? res.some(Boolean) : res.every(Boolean)
  })
}
function describeCond(c, field) {
  if (field.type === 'enum') return `${field.label}: ${(c.value || []).join(', ')}`
  if (field.type === 'number' && c.op === 'between') { const [a, b] = c.value || []; return `${field.label} ${a || '…'}–${b || '…'}` }
  return `${field.label} ${opShort[c.op] || ''} ${Array.isArray(c.value) ? c.value.join(', ') : c.value}`.trim()
}

function FilterRow({ row, fields, onChange, onRemove }) {
  const field = fields.find((f) => f.key === row.field) || fields[0]
  const ops = opsFor(field.type)
  const opts = normOpts(field)
  const setField = (k) => { const f = fields.find((x) => x.key === k); onChange({ ...row, field: k, op: opsFor(f.type)[0].op, value: f.type === 'enum' ? [] : '' }) }
  const setOp = (op) => onChange({ ...row, op, value: op === 'between' ? ['', ''] : (Array.isArray(row.value) && field.type === 'number' ? '' : row.value) })
  return (
    <div className="gf-row">
      <select className="gf-field" value={row.field} onChange={(e) => setField(e.target.value)}>
        {fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
      </select>
      <select className="gf-op" value={row.op} onChange={(e) => setOp(e.target.value)}>
        {ops.map((o) => <option key={o.op} value={o.op}>{o.label}</option>)}
      </select>
      {field.type === 'enum' ? (
        <div className="gf-enum">
          {opts.map((o) => {
            const on = (row.value || []).includes(o.value)
            return <span key={o.value} className={`chip ${on ? 'on' : ''}`} onClick={() => { const set = new Set(row.value || []); on ? set.delete(o.value) : set.add(o.value); onChange({ ...row, value: [...set] }) }}>{o.label}</span>
          })}
        </div>
      ) : field.type === 'number' && row.op === 'between' ? (
        <span className="gf-between">
          <input type="number" value={row.value?.[0] ?? ''} placeholder="min" onChange={(e) => onChange({ ...row, value: [e.target.value, row.value?.[1] ?? ''] })} />
          <span className="muted">–</span>
          <input type="number" value={row.value?.[1] ?? ''} placeholder="max" onChange={(e) => onChange({ ...row, value: [row.value?.[0] ?? '', e.target.value] })} />
        </span>
      ) : field.type === 'number' ? (
        <input className="gf-val" type="number" value={row.value ?? ''} placeholder="value" onChange={(e) => onChange({ ...row, value: e.target.value })} />
      ) : (
        <input className="gf-val" type="text" value={row.value ?? ''} placeholder="text…" onChange={(e) => onChange({ ...row, value: e.target.value })} />
      )}
      <button className="gf-x" onClick={onRemove} title="Remove"><Icon name="x" size={13} /></button>
    </div>
  )
}

export function FilterBar({ id, fields, value, onChange }) {
  const model = value || { join: 'AND', conditions: [] }
  const byKey = useMemo(() => Object.fromEntries(fields.map((f) => [f.key, f])), [fields])
  const active = activeConds(model, byKey)
  const [plans, setPlans] = useState(() => (id ? planStore.get(id) : null) || [])
  const [planName, setPlanName] = useState('')

  useEffect(() => { if (id) filterStore.set(id, model) }, [id, model])

  const set = (m) => onChange(m)
  const addCond = () => { const f = fields[0]; set({ ...model, conditions: [...model.conditions, { id: uid(), field: f.key, op: opsFor(f.type)[0].op, value: f.type === 'enum' ? [] : '' }] }) }
  const updateCond = (i, nc) => set({ ...model, conditions: model.conditions.map((c, j) => (j === i ? nc : c)) })
  const removeCond = (i) => set({ ...model, conditions: model.conditions.filter((c, j) => j !== i) })
  const removeById = (cid) => set({ ...model, conditions: model.conditions.filter((c) => c.id !== cid) })
  const clearAll = () => set({ join: model.join, conditions: [] })
  const savePlan = () => {
    const name = planName.trim(); if (!name) return
    const next = [...plans.filter((p) => p.name !== name), { name, model: clone(model) }]
    setPlans(next); if (id) planStore.set(id, next); setPlanName('')
  }
  const applyPlan = (p) => set(clone(p.model))
  const deletePlan = (name) => { const next = plans.filter((p) => p.name !== name); setPlans(next); if (id) planStore.set(id, next) }

  return (
    <span className="fb-wrap">
      <Popover width={460} trigger={(
        <button className={`btn ghost sm ${active.length ? 'fb-on' : ''}`}>
          <Icon name="filter" size={13} />Filters{active.length > 0 && <span className="fb-badge">{active.length}</span>}
        </button>
      )}>
        {(close) => (
          <div className="fpanel">
            {plans.length > 0 && (
              <div className="fp-plans">
                <div className="cm-head">Saved Plans</div>
                {plans.map((p) => (
                  <div key={p.name} className="fp-plan">
                    <button className="fp-apply" onClick={() => { applyPlan(p); close() }}>{p.name}<span className="muted"> · {(p.model.conditions || []).length}</span></button>
                    <button className="gf-x" onClick={() => deletePlan(p.name)} title="Delete plan"><Icon name="x" size={12} /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="fp-head">
              <span className="cm-head" style={{ padding: 0 }}>Match</span>
              <div className="seg">
                <button className={model.join === 'AND' ? 'on' : ''} onClick={() => set({ ...model, join: 'AND' })}>ALL conditions</button>
                <button className={model.join === 'OR' ? 'on' : ''} onClick={() => set({ ...model, join: 'OR' })}>ANY condition</button>
              </div>
            </div>
            <div className="fp-rows">
              {model.conditions.length === 0 && <div className="muted" style={{ padding: '6px 4px' }}>No filters yet — add one below.</div>}
              {model.conditions.map((c, i) => (
                <FilterRow key={c.id} row={c} fields={fields} onChange={(nc) => updateCond(i, nc)} onRemove={() => removeCond(i)} />
              ))}
            </div>
            <div className="fp-foot">
              <Btn sm ghost icon="plus" onClick={addCond}>Add filter</Btn>
              <div style={{ flex: 1 }} />
              {model.conditions.length > 0 && <Btn sm ghost onClick={clearAll}>Clear all</Btn>}
            </div>
            <div className="fp-save">
              <input value={planName} placeholder="Save these filters as a Plan…" onChange={(e) => setPlanName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') savePlan() }} />
              <Btn sm primary onClick={savePlan}>Save Plan</Btn>
            </div>
          </div>
        )}
      </Popover>
      {active.map((c) => (
        <span key={c.id} className="fchip">{describeCond(c, byKey[c.field])}<Icon name="x" size={11} onClick={() => removeById(c.id)} /></span>
      ))}
    </span>
  )
}

/* ============================================================================
   Phase 3 primitives — inline editing, state dropdown, modal, toasts.
   ========================================================================== */

/* Inline-editable numeric cell (click to edit, Enter/blur commit, Esc cancel). */
export function EditableNum({ value, onCommit, prefix = '', dec = 0, align = 'flex-end', min = 0.02 }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const editingRef = useRef(false)
  useEffect(() => { if (!editingRef.current) setVal(value) }, [value])
  const start = () => { editingRef.current = true; setVal(value); setEditing(true) }
  const finish = (save) => {
    if (!editingRef.current) return
    editingRef.current = false; setEditing(false)
    if (save) { const n = Math.max(min, Number(val)); if (!isNaN(n) && n !== value) onCommit(n) } else setVal(value)
  }
  if (editing) {
    return (
      <span className="editnum">
        <input autoFocus type="number" value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') finish(true); else if (e.key === 'Escape') finish(false) }}
          onBlur={() => finish(true)} onClick={(e) => e.stopPropagation()} />
      </span>
    )
  }
  return (
    <span className="bidcell editable" style={{ justifyContent: align }} onClick={start} title="Click to edit">
      {prefix}{Number(value).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })}
      <Icon name="edit" size={12} className="ed" />
    </span>
  )
}

/* Inline State dropdown: Enabled / Paused / Archived. */
export function StateSelect({ value, onChange, options = ['Enabled', 'Paused', 'Archived'] }) {
  const tone = { Enabled: 'green', Paused: 'gray', Archived: 'gray' }[value] || 'gray'
  return (
    <Popover width={150} trigger={(
      <button className={`statesel ${tone}`}><span className="dot" />{value}<Icon name="chevDown" size={11} /></button>
    )}>
      {(close) => (
        <div className="colmenu"><div className="cm-list">
          {options.map((s) => <div key={s} className={`cm-opt ${value === s ? 'on' : ''}`} onClick={() => { onChange(s); close() }}>{s}</div>)}
        </div></div>
      )}
    </Popover>
  )
}

/* Generic modal dialog. */
export function Modal({ title, sub, onClose, children, footer, width = 440, confirmClose }) {
  const requestClose = () => { if (!confirmClose || window.confirm('Discard your changes?')) onClose() }
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') requestClose() }
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k)
  }, [confirmClose])
  return (
    <div className="modal-ov" onMouseDown={requestClose}>
      <div className="modal" style={{ width }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <div><h3>{title}</h3>{sub && <div className="sub">{sub}</div>}</div>
          <button className="gf-x" onClick={requestClose}><Icon name="x" size={15} /></button>
        </div>
        <div className="modal-b">{children}</div>
        {footer && <div className="modal-f">{footer}</div>}
      </div>
    </div>
  )
}

/* Toast system — call toast(message) from anywhere; ToastHost renders them. */
const toastListeners = new Set()
let toastSeq = 0
export function toast(message, kind = 'success') {
  const t = { id: ++toastSeq, message, kind }
  toastListeners.forEach((fn) => fn(t))
}
export function ToastHost() {
  const [items, setItems] = useState([])
  useEffect(() => {
    const fn = (t) => { setItems((x) => [...x, t]); setTimeout(() => setItems((x) => x.filter((i) => i.id !== t.id)), 3800) }
    toastListeners.add(fn); return () => toastListeners.delete(fn)
  }, [])
  return (
    <div className="toasthost">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          <Icon name={t.kind === 'success' ? 'check' : t.kind === 'error' ? 'x' : 'bulb'} size={15} />
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}

/* Persistence for user-created entities (campaigns, rules) — survives reload. */
export const createdStore = {
  get(kind) { try { return JSON.parse(localStorage.getItem('chcreated:' + kind)) || [] } catch (e) { return [] } },
  set(kind, arr) { try { localStorage.setItem('chcreated:' + kind, JSON.stringify(arr)) } catch (e) { /* ignore */ } },
  add(kind, item) { const arr = createdStore.get(kind); arr.unshift(item); createdStore.set(kind, arr); return arr },
}

/* ============================================================================
   Phase 5 — persistent inline/bulk edit overrides (survive reload).
   `chedits:<id>` holds { rowId: { field: value, ... } }.
   ========================================================================== */
const editStore = {
  get(id) { try { return JSON.parse(localStorage.getItem('chedits:' + id)) || {} } catch (e) { return {} } },
  set(id, v) { try { localStorage.setItem('chedits:' + id, JSON.stringify(v)) } catch (e) { /* ignore */ } },
}
export function usePersistentOverrides(id) {
  const [overrides, setOverrides] = useState(() => editStore.get(id))
  useEffect(() => { if (id) editStore.set(id, overrides) }, [id, overrides])
  return [overrides, setOverrides]
}

/* ============================================================================
   Phase 5 — CSV / Excel export. Field schema = [{ key, label }] (the same
   *_FIELDS arrays the FilterBar uses). Exports the rows passed in (already
   filtered) as scalar values — no React render involved.
   ========================================================================== */
function _download(filename, text, mime) {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function _cell(row, f) {
  const v = f.csv ? f.csv(row) : row[f.key]
  return (v == null || (typeof v === 'number' && isNaN(v))) ? '' : v
}
export function exportCSV(filename, fields, rows) {
  const esc = (v) => { const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
  const header = fields.map((f) => esc(f.label)).join(',')
  const body = rows.map((r) => fields.map((f) => esc(_cell(r, f))).join(',')).join('\r\n')
  _download(filename, '﻿' + header + '\r\n' + body, 'text/csv;charset=utf-8;')
}
export function exportXLS(filename, fields, rows) {
  const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const isNum = (v) => v !== '' && v != null && !isNaN(Number(v))
  const head = '<tr>' + fields.map((f) => `<th style="background:#1a4fd6;color:#fff;font-weight:700;border:1px solid #c9d2e3;padding:4px 8px;text-align:left">${esc(f.label)}</th>`).join('') + '</tr>'
  const body = rows.map((r) => '<tr>' + fields.map((f) => { const v = _cell(r, f); return `<td style="border:1px solid #dfe4ee;padding:3px 8px"${isNum(v) ? ' x:num' : ''}>${esc(v)}</td>` }).join('') + '</tr>').join('')
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Export</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table cellspacing="0">${head}${body}</table></body></html>`
  _download(filename, html, 'application/vnd.ms-excel;charset=utf-8;')
}
export function ExportMenu({ name = 'export', fields, rows }) {
  const stamp = new Date().toISOString().slice(0, 10)
  const fn = (ext) => `${name}-${stamp}.${ext}`
  const done = (n, ext) => toast(`Exported ${n} row${n === 1 ? '' : 's'} to ${ext.toUpperCase()}`)
  return (
    <Popover align="right" width={170} trigger={<Btn icon="download">Export</Btn>}>
      {(close) => (
        <div className="colmenu"><div className="cm-list">
          <div className="cm-opt" onClick={() => { exportCSV(fn('csv'), fields, rows); done(rows.length, 'csv'); close() }}>CSV (.csv)</div>
          <div className="cm-opt" onClick={() => { exportXLS(fn('xls'), fields, rows); done(rows.length, 'xls'); close() }}>Excel (.xls)</div>
          <div className="cm-foot muted">{rows.length.toLocaleString()} rows · current filter</div>
        </div></div>
      )}
    </Popover>
  )
}

/* ============================================================================
   Phase 5 — real date-range scaling + period-compare.
   Mock metrics represent a ~30-day baseline. scaleForRange() produces the
   current-period rows for the selected range plus a deterministic prior-period
   map so the grid/KPIs can show genuine vs-prev deltas.
   ========================================================================== */
export const RANGE_DAYS = {
  'Today': 1, 'Yesterday': 1,
  'Last 7 days': 7, 'Last 7 days (Exclude latest 2 days)': 7,
  'Last 14 days': 14, 'Last 14 days (Exclude latest 2 days)': 14,
  'Last 30 days': 30, 'Last 30 days (Exclude latest 2 days)': 30,
  'This month': 30, 'Last month': 30, 'All time': 365, 'Custom…': 30,
}
export function rangeDays(label) { return RANGE_DAYS[label] != null ? RANGE_DAYS[label] : 30 }

// Resolve a range label (+ optional custom {start,end}) into { label, days, key }.
// "This month"/"Last month" use the real calendar; "Custom…" uses the picked dates.
export function resolveRange(label, custom) {
  const now = new Date()
  const dayMs = 86400000
  const atMidnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (label === 'Custom…' && custom && custom.start && custom.end) {
    const s = new Date(custom.start + 'T00:00:00'), e = new Date(custom.end + 'T00:00:00')
    if (!isNaN(s) && !isNaN(e)) {
      const lo = s <= e ? s : e, hi = s <= e ? e : s
      const days = Math.max(1, Math.round((atMidnight(hi) - atMidnight(lo)) / dayMs) + 1)
      return { label: `${fmt(lo)} – ${fmt(hi)}`, days, key: `custom:${custom.start}_${custom.end}` }
    }
  }
  if (label === 'This month') return { label, days: now.getDate(), key: `month:${now.getFullYear()}-${now.getMonth()}` }
  if (label === 'Last month') {
    const lastDayPrev = new Date(now.getFullYear(), now.getMonth(), 0)
    return { label, days: lastDayPrev.getDate(), key: `month:${lastDayPrev.getFullYear()}-${lastDayPrev.getMonth()}` }
  }
  return { label, days: rangeDays(label), key: label }
}
const periodFactor = (k) => 0.85 + hashUnit(k) * 0.30 // 0.85 .. 1.15
export function scaleRow(row, days, periodKey, idKey = 'id') {
  const f = days / 30
  const id = String(row[idKey])
  const demand = periodFactor(id + '|d|' + periodKey) // moves sales/orders/units
  const cost = periodFactor(id + '|c|' + periodKey)   // moves spend/impr/clicks
  const impr = Math.round((row.impr || 0) * f * cost)
  const clk = Math.round((row.clk || 0) * f * cost)
  const spend = (row.spend || 0) * f * cost
  const orders = Math.round((row.orders || 0) * f * demand)
  const sales = (row.sales || 0) * f * demand
  const units = Math.round((row.units || 0) * f * demand)
  const ntb = Math.round((row.ntb || 0) * f * demand)
  return {
    ...row, impr, clk, spend, orders, sales, units, ntb,
    ctr: impr ? (clk / impr) * 100 : 0, cpc: clk ? spend / clk : 0,
    acos: sales ? (spend / sales) * 100 : 0, roas: spend ? sales / spend : 0,
    cvr: clk ? (orders / clk) * 100 : 0, cpa: orders ? spend / orders : 0,
    aov: orders ? sales / orders : 0,
  }
}
// `range` may be a label string OR a resolved object { label, days, key }.
export function scaleForRange(rows, range, idKey = 'id') {
  const days = typeof range === 'object' ? range.days : rangeDays(range)
  const key = typeof range === 'object' ? range.key : range
  const cur = rows.map((r) => scaleRow(r, days, key, idKey))
  const prev = {}
  rows.forEach((r) => { prev[r[idKey]] = scaleRow(r, days, key + ':prev', idKey) })
  return { rows: cur, prev, days }
}

// Scale only the listed cumulative numeric fields by the range (state/quality
// fields like Buy Box %, price, rating are left untouched). Used by Commerce.
export function scaleFields(rows, range, fields, idKey = 'id') {
  const days = typeof range === 'object' ? range.days : rangeDays(range)
  const key = typeof range === 'object' ? range.key : range
  const f = days / 30
  const make = (r, pk) => {
    const out = { ...r }
    for (const fld of fields) {
      const factor = 0.85 + hashUnit(String(r[idKey]) + '|' + fld + '|' + pk) * 0.30
      out[fld] = Math.round((r[fld] || 0) * f * factor)
    }
    return out
  }
  const cur = rows.map((r) => make(r, key))
  const prev = {}
  rows.forEach((r) => { prev[r[idKey]] = make(r, key + ':prev') })
  return { rows: cur, prev, days }
}
