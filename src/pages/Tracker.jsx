import { useState, useEffect } from 'react'
import { TRACKER_HTML_B64 } from '../data/trackerSnapshot.js'

/* The Amazon Tracker, embedded exactly as designed.
 *
 * It renders inside an iframe on purpose: the tracker carries its own complete stylesheet
 * (including bare `.card`, `.pill` and element selectors that collide with CommerceHub's),
 * so an iframe is what keeps the design identical in both places rather than something that
 * merely looks close. The frame reports its content height back so there is no inner
 * scrollbar - the page scrolls as one.
 *
 * The payload is ~570KB of base64. In the single-file build it is injected as a plain
 * <script> ahead of the Babel block and read off window, because putting it through
 * Babel-standalone trips its 500KB deoptimisation path and slows the whole app's boot.
 * Under Vite it comes from the module import instead. */

function payload() {
  if (typeof window !== 'undefined' && window.__TRACKER_HTML_B64) return window.__TRACKER_HTML_B64
  if (typeof TRACKER_HTML_B64 !== 'undefined') return TRACKER_HTML_B64
  return ''
}

function decodeHtml(b64) {
  if (!b64) return ''
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder('utf-8').decode(bytes)
}

function Tracker() {
  const [html] = useState(() => decodeHtml(payload()))
  const [height, setHeight] = useState(2200)

  useEffect(() => {
    function onMessage(e) {
      const d = e.data
      if (d && d.type === 'ch-tracker-height' && typeof d.height === 'number' && isFinite(d.height)) {
        setHeight((h) => (Math.abs(h - d.height) > 2 ? Math.max(600, Math.ceil(d.height)) : h))
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  if (!html) {
    return (
      <div className="tracker-missing">
        The Amazon Tracker snapshot did not load with this build. Rebuild with
        <code> node tools/build-singlefile.mjs</code> - see <code>tools/tracker/refresh-tracker.md</code>.
      </div>
    )
  }

  return (
    <div className="tracker-embed" data-tracker-embed>
      <iframe title="Amazon Tracker" srcDoc={html} loading="eager" style={{ height }} />
    </div>
  )
}

export default Tracker
