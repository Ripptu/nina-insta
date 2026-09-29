import { useCallback, useEffect, useState } from 'react'
import { api, type SetupState } from './api'
import Setup from './views/Setup'

const AREAS = ['Übersicht', 'Kalender', 'Beiträge', 'Auswertung', 'Lernen', 'Material', 'Berichte', 'Protokoll', 'Einstellungen']

export default function App() {
  const [state, setState] = useState<SetupState | null>(null)
  const [area, setArea] = useState('Übersicht')
  const [reopenSetup, setReopenSetup] = useState(false)

  const refresh = useCallback(() => {
    api.state().then(setState)
  }, [])
  useEffect(refresh, [refresh])

  if (!state) return null
  if (!state.finished || reopenSetup) {
    return <Setup state={state} refresh={refresh} onFinished={() => setReopenSetup(false)} />
  }

  return (
    <div className="flex h-full">
      <aside className="flex w-[220px] shrink-0 flex-col px-3 pb-6 pt-14" style={{ background: 'var(--side)', borderRight: '1px solid var(--line)' }} data-tauri-drag-region>
        <nav className="flex flex-col gap-0.5">
          {AREAS.map((a, i) => (
            <button
              key={a}
              onClick={() => setArea(a)}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-[14px]"
              style={{ background: area === a ? 'var(--panel)' : 'transparent', fontWeight: area === a ? 600 : 400 }}
            >
              {a}
              <span className="text-[12px]" style={{ color: 'var(--muted)' }}>
                ⌘{i + 1}
              </span>
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto px-12 pb-12 pt-14" data-tauri-drag-region>
        <h1 className="mb-2 text-[26px] font-semibold tracking-tight">{area}</h1>
        {area === 'Einstellungen' ? (
          <div className="flex flex-col gap-4">
            <p style={{ color: 'var(--muted)' }}>Verbindungen ansehen oder neu einrichten.</p>
            <div>
              <button className="rounded-lg px-4 py-2" style={{ background: 'var(--accent)', color: 'var(--accent-text)' }} onClick={() => setReopenSetup(true)}>
                Einrichtung öffnen
              </button>
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--muted)' }}>Diese Ansicht folgt in Phase 8, sobald die Automatik Daten liefert.</p>
        )}
      </main>
    </div>
  )
}
