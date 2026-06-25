// Number / currency / percent formatting helpers

export const cur = (n, symbol = '$', dec = 0) => {
  if (n == null || isNaN(n)) return '—'
  const neg = n < 0
  const v = Math.abs(n)
  const s = v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
  return `${neg ? '-' : ''}${symbol}${s}`
}

export const compact = (n, symbol = '') => {
  if (n == null || isNaN(n)) return '—'
  const abs = Math.abs(n)
  let out
  if (abs >= 1e9) out = (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B'
  else if (abs >= 1e6) out = (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  else if (abs >= 1e3) out = (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K'
  else out = Math.round(n).toLocaleString('en-US')
  return symbol + out
}

export const money = (n, symbol = '$') => {
  if (n == null || isNaN(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 1e6) return `${symbol}${(n / 1e6).toFixed(2)}M`
  if (abs >= 1e4) return `${symbol}${(n / 1e3).toFixed(1)}K`
  return `${symbol}${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export const pct = (n, dec = 1) => (n == null || isNaN(n) ? '—' : `${n.toFixed(dec)}%`)
export const dec2 = (n) => (n == null || isNaN(n) ? '—' : n.toFixed(2))
export const int = (n) => (n == null || isNaN(n) ? '—' : Math.round(n).toLocaleString('en-US'))
