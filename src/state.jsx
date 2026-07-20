import { createContext, useContext, useState, useMemo, useEffect } from 'react'
import { profiles } from './data/mock.js'
import { resolveRange } from './components/ui.jsx'

// Persist the selected date range across reloads (key: chrange).
const loadRange = () => { try { return JSON.parse(localStorage.getItem('chrange')) || {} } catch (e) { return {} } }
// Persist which alert ids have been marked read (key: chalertreads) so the
// topbar bell badge and the Alerts page stay in sync across the app + reloads.
const loadAlertReads = () => { try { return JSON.parse(localStorage.getItem('chalertreads')) || [] } catch (e) { return [] } }

const Ctx = createContext(null)
export function AppProvider({ children }) {
  const saved = loadRange()
  const [profileId, setProfileId] = useState('all')
  const [range, setRange] = useState(saved.range || 'Last 30 days')
  const [customRange, setCustomRange] = useState(saved.customRange || null) // { start:'YYYY-MM-DD', end:'YYYY-MM-DD' }
  useEffect(() => { try { localStorage.setItem('chrange', JSON.stringify({ range, customRange })) } catch (e) { /* ignore */ } }, [range, customRange])
  const rangeResolved = useMemo(() => resolveRange(range, customRange), [range, customRange])
  const [alertReads, setAlertReads] = useState(loadAlertReads)
  useEffect(() => { try { localStorage.setItem('chalertreads', JSON.stringify(alertReads)) } catch (e) { /* ignore */ } }, [alertReads])
  const markAlertRead = (id) => setAlertReads((xs) => (xs.includes(id) ? xs : [...xs, id]))
  const markAlertsRead = (ids) => setAlertReads((xs) => Array.from(new Set([...xs, ...ids])))
  const value = { profileId, setProfileId, range, setRange, customRange, setCustomRange, rangeResolved, profiles, alertReads, markAlertRead, markAlertsRead }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useApp = () => useContext(Ctx)
