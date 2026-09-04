import { useState, useEffect, useRef } from 'react'

/* Amazon Attribution dashboard (both markets). Unlike Tracker.jsx the document
 * is NOT baked into the bundle: it is served as a static file from /attribution/index.html
 * (public/attribution/index.html in this repo, copied to the site root by Vite's public dir) and
 * refreshed daily by the scheduled Cowork task "refresh-amazon-attribution-dashboard". A data
 * refresh therefore never touches the app bundle.
 *
 * Same reason for the iframe as the trackers: the dashboard carries its own full stylesheet.
 * Same origin, so the frame height is read directly from the child document - no postMessage
 * handshake needed. */
function Attribution() {
  const [height, setHeight] = useState(1800)
  const frameRef = useRef(null)
  useEffect(() => {
    const id = setInterval(() => {
      try {
        const d = frameRef.current && frameRef.current.contentDocument
        // body.scrollHeight tracks the content in both directions; documentElement.scrollHeight
        // is clamped to the frame's own viewport, so it can grow but never shrink.
        const h = d && d.body ? d.body.scrollHeight : 0
        if (h && isFinite(h)) setHeight((cur) => (Math.abs(cur - h) > 2 ? Math.max(600, Math.ceil(h) + 8) : cur))
      } catch (e) { /* cross-origin or not loaded yet */ }
    }, 800)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="tracker-embed" data-attribution-embed>
      <iframe ref={frameRef} title="Amazon Attribution" src="/attribution/index.html" loading="eager" style={{ height }} />
    </div>
  )
}

export default Attribution
