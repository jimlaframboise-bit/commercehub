import { createContext, useContext, useState, useMemo, useEffect } from 'react'
import { profiles } from './data/mock.js'
import { resolveRange } from './components/ui.jsx'

// Persist the selected date range across reloads (key: chrange).
const loadRange = () => { try { return JSON.parse(localStorage.getItem('chrange')) || {} } catch (e) { return {} } }

const Ctx = createContext(null)
export function AppProvider({ children }) {
  const saved = loadRange()
  const [profileId, setProfileId] = useState('all')
  const [range, setRange] = useState(saved.range || 'Last 30 days')
  const [customRange, setCustomRange] = useState(saved.customRange || null) // { start:'YYYY-MM-DD', end:'YYYY-MM-DD' }
  useEffect(() => { try { localStorage.setItem('chrange', JSON.stringify({ range, customRange })) } catch (e) { /* ignore */ } }, [range, customRange])
  const rangeResolved = useMemo(() => resolveRange(range, customRange), [range, customRange])
  const value = { profileId, setProfileId, range, setRange, customRange, setCustomRange, rangeResolved, profiles }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useApp = () => useContext(Ctx)
