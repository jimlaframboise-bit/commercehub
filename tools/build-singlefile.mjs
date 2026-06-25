import fs from 'fs'
const ROOT = process.cwd()
const read = (p) => fs.readFileSync(ROOT + '/' + p, 'utf8')

function strip(src) {
  const lines = src.split('\n'); const out = []; let skip = false
  for (const line of lines) {
    const t = line.trim()
    if (skip) { if (/from\s+['"][^'"]+['"];?\s*$/.test(t)) skip = false; continue }
    if (t.startsWith('import ')) {
      if (/from\s+['"][^'"]+['"];?\s*$/.test(t) || /^import\s+['"][^'"]+['"];?$/.test(t)) continue
      skip = true; continue
    }
    out.push(line)
  }
  let s = out.join('\n')
  s = s.replace(/export default function /g, 'function ')
  s = s.replace(/export default /g, '')
  s = s.replace(/export function /g, 'function ')
  s = s.replace(/export const /g, 'const ')
  return s
}

const css = read('src/styles.css')

const preamble = `
const { useState, useMemo, useEffect, useContext, useRef, createContext, Fragment } = React;

/* ---------------- router shim (replaces react-router-dom) ---------------- */
const RouterCtx = createContext({ path: '/', search: '', navigate: () => {} });
function _parseHash() {
  const raw = window.location.hash.slice(1) || '/';
  const qi = raw.indexOf('?');
  return qi >= 0 ? { path: raw.slice(0, qi), search: raw.slice(qi) } : { path: raw, search: '' };
}
function RouterProvider({ children }) {
  const [loc, setLoc] = useState(_parseHash);
  useEffect(() => {
    const h = () => setLoc(_parseHash());
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  const navigate = (to) => { window.location.hash = to; };
  return <RouterCtx.Provider value={{ path: loc.path, search: loc.search, navigate }}>{children}</RouterCtx.Provider>;
}
const useLocation = () => { const c = useContext(RouterCtx); return { pathname: c.path, search: c.search }; };
const useNavigate = () => useContext(RouterCtx).navigate;
function Link({ to, children, className, style, ...rest }) {
  const cn = typeof className === 'function' ? className({ isActive: false }) : className;
  return <a href={'#' + to} className={cn} style={style} onClick={(e) => { e.preventDefault(); window.location.hash = to; }} {...rest}>{children}</a>;
}
function NavLink({ to, end, children, className, style }) {
  const { path } = useContext(RouterCtx);
  const isActive = end ? path === to : (path === to || path.startsWith(to + '/'));
  const cn = typeof className === 'function' ? className({ isActive }) : (className || '');
  return <a href={'#' + to} className={cn} style={style} onClick={(e) => { e.preventDefault(); window.location.hash = to; }}>{children}</a>;
}
function Routes({ children }) {
  const { path } = useContext(RouterCtx);
  let match = null, fallback = null;
  React.Children.forEach(children, (ch) => {
    if (!ch) return; const p = ch.props.path;
    if (p === '*') { fallback = ch.props.element; return; }
    if (p === path) match = ch.props.element;
  });
  return match || fallback;
}
function Route() { return null; }

/* ---------------- minimal SVG chart shim (replaces recharts) ---------------- */
function _useW() {
  const ref = useRef(null); const [w, setW] = useState(640);
  useEffect(() => {
    if (!ref.current) return; const el = ref.current;
    const upd = () => setW(el.clientWidth || 640); upd();
    let ro; if (window.ResizeObserver) { ro = new ResizeObserver(upd); ro.observe(el); } else window.addEventListener('resize', upd);
    return () => { if (ro) ro.disconnect(); else window.removeEventListener('resize', upd); };
  }, []);
  return [ref, w];
}
function ResponsiveContainer({ height = 260, children }) {
  const [ref, w] = _useW();
  return <div ref={ref} style={{ width: '100%', height }}>{w ? React.cloneElement(children, { __w: w, __h: height }) : null}</div>;
}
const _mk = (k) => { const C = () => null; C.__kind = k; return C; };
const Area = _mk('area'), Line = _mk('line'), Bar = _mk('bar');
const XAxis = _mk('xaxis'), YAxis = _mk('yaxis'), CartesianGrid = _mk('grid'), Tooltip = _mk('tip'), Legend = _mk('legend');
function _series(children, kinds) { const out = []; React.Children.forEach(children, (c) => { if (c && c.type && kinds.indexOf(c.type.__kind) >= 0) out.push({ kind: c.type.__kind, ...c.props }); }); return out; }
function _find(children, kind) { let f = null; React.Children.forEach(children, (c) => { if (c && c.type && c.type.__kind === kind) f = c.props; }); return f; }
function _fmt(v) { const a = Math.abs(v); if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M'; if (a >= 1e3) return (v / 1e3).toFixed(0) + 'k'; return '' + Math.round(v); }
function _chart(props, kind) {
  const data = props.data || []; const W = props.__w || 640, H = props.__h || 260;
  const m = { top: 12, right: 14, bottom: 22, left: 46 };
  const iw = Math.max(10, W - m.left - m.right), ih = Math.max(10, H - m.top - m.bottom);
  const series = _series(props.children, [kind]);
  const xax = _find(props.children, 'xaxis') || {}; const xKey = xax.dataKey || 'name';
  let max = -Infinity, min = Infinity;
  series.forEach((s) => data.forEach((d) => { const v = +d[s.dataKey]; if (!isNaN(v)) { if (v > max) max = v; if (v < min) min = v; } }));
  if (!isFinite(max)) { max = 1; min = 0; } min = Math.min(0, min); if (max === min) max = min + 1;
  const X = (i) => m.left + (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const Y = (v) => m.top + ih - ((v - min) / (max - min)) * ih;
  const grids = [0, .25, .5, .75, 1].map((t) => min + (max - min) * t);
  const nlab = W < 460 ? 5 : 8; const step = Math.max(1, Math.ceil(data.length / nlab));
  return <svg width={W} height={H} style={{ display: 'block' }}>
    {grids.map((g, i) => <g key={'g' + i}>
      <line x1={m.left} x2={W - m.right} y1={Y(g)} y2={Y(g)} stroke="#eef1f6" />
      <text x={m.left - 6} y={Y(g) + 3} fontSize="10" fill="#8a94a6" textAnchor="end">{_fmt(g)}</text>
    </g>)}
    {data.map((d, i) => (i % step === 0) ? <text key={'x' + i} x={X(i)} y={H - 6} fontSize="10" fill="#8a94a6" textAnchor="middle">{d[xKey]}</text> : null)}
    {kind === 'bar' ? _bars(series, data, X, Y, iw, min) : series.map((s, si) => {
      const color = s.stroke || s.fill || '#1a4fd6';
      const pts = data.map((d, i) => [X(i), Y(+d[s.dataKey] || 0)]);
      const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
      const area = line + ' L' + X(data.length - 1) + ' ' + Y(min) + ' L' + X(0) + ' ' + Y(min) + ' Z';
      return <g key={'s' + si}>
        {kind === 'area' && <path d={area} fill={color} fillOpacity="0.14" />}
        <path d={line} fill="none" stroke={color} strokeWidth="2" />
      </g>;
    })}
  </svg>;
}
function _bars(series, data, X, Y, iw, min) {
  const n = Math.max(1, series.length); const band = iw / Math.max(1, data.length);
  const bw = Math.min(30, band * 0.66); const sub = bw / n;
  const out = [];
  data.forEach((d, i) => series.forEach((s, si) => {
    const v = +d[s.dataKey] || 0; const x0 = X(i) - bw / 2 + si * sub; const y0 = Y(v); const h = Y(min) - y0;
    out.push(<rect key={i + '-' + si} x={x0} y={y0} width={Math.max(2, sub - 2)} height={Math.max(0, h)} rx="2" fill={s.fill || '#1a4fd6'} />);
  }));
  return out;
}
function _legend(children) {
  const s = _series(children, ['area', 'line', 'bar']); if (!s.length) return null;
  return <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 4, flexWrap: 'wrap' }}>
    {s.map((x, i) => <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#5b6577' }}>
      <i style={{ width: 10, height: 10, borderRadius: 2, background: x.fill || x.stroke || '#1a4fd6', display: 'inline-block' }} />{x.name || x.dataKey}
    </span>)}
  </div>;
}
function _Chart(props, kind) {
  const hasLeg = !!_find(props.children, 'legend'); const h = (props.__h || 260) - (hasLeg ? 20 : 0);
  return <div>{_chart({ ...props, __h: h }, kind)}{hasLeg ? _legend(props.children) : null}</div>;
}
function AreaChart(p) { return _Chart(p, 'area'); }
function LineChart(p) { return _Chart(p, 'line'); }
function BarChart(p) { return _Chart(p, 'bar'); }
`

const order = [
  'src/lib/format.js', 'src/data/mock.js', 'src/components/Icon.jsx', 'src/components/ui.jsx',
  'src/state.jsx', 'src/components/Layout.jsx', 'src/pages/Overview.jsx', 'src/pages/Ads.jsx',
  'src/pages/Dsp.jsx', 'src/pages/Commerce.jsx', 'src/pages/Automation.jsx', 'src/pages/Insights.jsx', 'src/App.jsx',
]
let body = preamble + '\n'
for (const f of order) { body += `\n/* ===================== ${f} ===================== */\n` + strip(read(f)) + '\n' }
body += `
const ALL_CAMPAIGNS = campaigns; const ALERTS = alerts; const RULES = rules;
ReactDOM.createRoot(document.getElementById('root')).render(<RouterProvider><App /></RouterProvider>);
`

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>CommerceHub — Retail Media Platform</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%231a4fd6'/%3E%3Ctext x='16' y='22' font-size='18' font-family='Arial' font-weight='bold' fill='white' text-anchor='middle'%3EC%3C/text%3E%3C/svg%3E" />
<script crossorigin src="https://unpkg.com/react@18.3.1/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone@7.25.6/babel.min.js"></script>
<style>
${css}
#boot { position:fixed; inset:0; display:grid; place-items:center; font-family:sans-serif; color:#5b6577; }
</style>
</head>
<body>
<div id="root"><div id="boot">Loading CommerceHub…</div></div>
<script type="text/babel" data-presets="react">
${body}
</script>
</body>
</html>
`
fs.writeFileSync(ROOT + '/CommerceHub.html', html)
console.log('Wrote CommerceHub.html (' + (Buffer.byteLength(html) / 1024).toFixed(0) + ' KB)')
console.log('leftover export/import:', (body.match(/\bexport\b/g) || []).length, (body.match(/^import /gm) || []).length)
const top = {}; for (const l of body.split('\n')) { const mm = l.match(/^(?:const|let|function)\s+([A-Za-z0-9_]+)/); if (mm) top[mm[1]] = (top[mm[1]] || 0) + 1 }
console.log('dup top-level decls:', Object.entries(top).filter(([k, v]) => v > 1))
