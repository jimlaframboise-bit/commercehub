import { useState, useEffect } from 'react'
import { ROLLING12_HTML_B64 } from '../data/rolling12Snapshot.js'

/* The original Amazon Rolling12 Tracker, embedded exactly as designed.
 *
 * This is the sibling of Tracker.jsx, not a replacement for it: /tracker carries the R3
 * redesign, /rolling12 carries the original artifact. They are separate artifacts by
 * standing instruction and neither should be folded into the other.
 *
 * It renders inside an iframe for the same reason /tracker does: the tracker carries its own
 * complete stylesheet (including bare `.card`, `.pill` and element selectors that collide
 * with CommerceHub's), so an iframe is what keeps the design identical in both places rather
 * than something that merely looks close. The frame reports its content height back so there
 * is no inner scrollbar - the page scrolls as one.
 *
 * The payload is ~380KB of base64. In the single-file build it is injected as a plain
 * <script> ahead of the Babel block and read off window, because putting it through
 * Babel-standalone trips its 500KB deoptimisation path and slows the whole app's boot.
 * Under Vite it comes from the module import instead.
 *
 * The two helpers below are deliberately NOT named `payload` / `decodeHtml` like the ones in
 * Tracker.jsx. The single-file build concatenates every page into one scope, so identical
 * function names silently overwrite each other - which would have made /tracker render THIS
 * page's snapshot with no error anywhere. `node tools/build-singlefile.mjs` prints
 * "dup top-level decls" for exactly this reason; it must come back empty. */

function rolling12Payload() {
  if (typeof window !== 'undefined' && window.__ROLLING12_HTML_B64) return window.__ROLLING12_HTML_B64
  if (typeof ROLLING12_HTML_B64 !== 'undefined') return ROLLING12_HTML_B64
  return ''
}

function decodeRolling12Html(b64) {
  if (!b64) return ''
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder('utf-8').decode(bytes)
}

function Rolling12() {
  const [html] = useState(() => decodeRolling12Html(rolling12Payload()))
  const [height, setHeight] = useState(2200)

  useEffect(() => {
    function onMessage(e) {
      const d = e.data
      if (d && d.type === 'ch-rolling12-height' && typeof d.height === 'number' && isFinite(d.height)) {
        setHeight((h) => (Math.abs(h - d.height) > 2 ? Math.max(600, Math.ceil(d.height)) : h))
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  if (!html) {
    return (
      <div className="tracker-missing">
        The Rolling12 Tracker snapshot did not load with this build. Rebuild with
        <code> node tools/build-singlefile.mjs</code> - see <code>tools/rolling12/refresh-rolling12.md</code>.
      </div>
    )
  }

  return (
    <div className="tracker-embed" data-rolling12-embed>
      <iframe title="Amazon Rolling12 Tracker" srcDoc={html} loading="eager" style={{ height }} />
    </div>
  )
}

export default Rolling12
