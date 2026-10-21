import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { bindUI } from './components/ui.jsx'
import { ACCENTS } from './lib/format.js'
import { setLang, useLang } from './lib/i18n.js'
import { setNav } from './lib/nav.js'
import { useWakeLock } from './lib/wakelock.js'
import { startFlow } from './sheets.jsx'
import { LogoMark, BRAND } from './components/Logo.jsx'
import TabBar from './components/TabBar.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Modals from './components/Modals.jsx'
import Toast from './components/Toast.jsx'
import RestTimer from './components/RestTimer.jsx'
import Login from './views/Login.jsx'
import Home from './views/Home.jsx'
import Plan from './views/Plan.jsx'
import RoutineEdit from './views/RoutineEdit.jsx'
import Workout from './views/Workout.jsx'
import Stats from './views/Stats.jsx'
import History from './views/History.jsx'
import Library from './views/Library.jsx'
import Settings from './views/Settings.jsx'
import Admin from './views/Admin.jsx'
import Coach from './views/Coach.jsx'
import CoachIntake from './views/CoachIntake.jsx'
import CoachProposal from './views/CoachProposal.jsx'
import Trainer from './views/Trainer.jsx'
import TrainerClient from './views/TrainerClient.jsx'
import Join from './views/Join.jsx'
import TrainerChat from './views/TrainerChat.jsx'
import TrainerContent from './views/TrainerContent.jsx'
import TrainerPrograms from './views/TrainerPrograms.jsx'
import Knowledge from './views/Knowledge.jsx'
import Log from './views/Log.jsx'
import ClientChat from './views/ClientChat.jsx'
import ContentFeed from './views/ContentFeed.jsx'
import { api } from './lib/api.js'
import { applyAssignments } from './lib/trainer.js'
import { todayISO } from './lib/format.js'

bindUI(useUI)   // lets the shared controls open sheets without importing the store at module scope

function applyPrefs(theme, accent) {
  const de = document.documentElement
  de.dataset.theme = theme === 'light' ? 'light' : 'dark'
  de.dataset.accent = ACCENTS[accent] ? accent : 'lime'
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.content = de.dataset.theme === 'light' ? '#f2f2f7' : '#000000'
}

// A weigh-in the trainer logged for this client lands in the client's own body-weight log too,
// so Home, Stats and the pre-workout check-in all see one curve. Once per session, and only
// after boot's pull (see the call site); a day the client already weighed in keeps the
// client's number.
function useTrainerWeighIns(enabled) {
  useEffect(() => {
    if (!enabled) return
    api('/api/records').then(({ records }) => {
      const theirs = records.filter(r => r.kind === 'weight' && r.role === 'trainer')
      const S = useStore.getState().S
      const missing = theirs.filter(r => !S.bodyweight.some(b => b.d === r.d))
      if (!missing.length) return
      useStore.getState().update(s => {
        for (const r of missing) if (!s.bodyweight.some(b => b.d === r.d)) s.bodyweight.push({ d: r.d, w: r.v.kg, t: Date.parse(r.at) })
        s.bodyweight.sort((a, b) => (a.d < b.d ? -1 : 1))
      })
    }).catch(() => {})
  }, [enabled])
}

// Workouts the trainer assigned become routines on their days (lib/trainer.js). Checked when
// the app opens and whenever it comes back to the foreground, same boot gating as above; only
// writes when something actually changed, so an idle check never syncs state.
function useTrainerAssignments(enabled) {
  useEffect(() => {
    if (!enabled) return
    const sync = () => {
      if (document.hidden) return
      api('/api/assignments').then(({ assignments }) => {
        const cur = useStore.getState().S
        const next = JSON.parse(JSON.stringify({ routines: cur.routines, dayPlan: cur.dayPlan }))
        applyAssignments(next, assignments, todayISO())
        if (JSON.stringify(next.routines) === JSON.stringify(cur.routines) && JSON.stringify(next.dayPlan) === JSON.stringify(cur.dayPlan)) return
        useStore.getState().update(s => { s.routines = next.routines; s.dayPlan = next.dayPlan })
      }).catch(() => {})
    }
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [enabled])
}

function Shell() {
  const navigate = useNavigate()
  const loc = useLocation()
  const { S, user, ready } = useStore()
  const isGuest = useStore(s => s.isGuest())
  const langV = useLang()   // re-renders the whole shell when the language (pack) changes
  useEffect(() => { setNav(navigate) }, [navigate])
  useEffect(() => { applyPrefs(S.theme, S.accent) }, [S.theme, S.accent])
  useEffect(() => { setLang(S.lang || 'en') }, [S.lang])
  useEffect(() => { document.documentElement.lang = S.lang || 'en' }, [langV, S.lang])
  // every tab/route change starts at the top of the page
  useEffect(() => { window.scrollTo(0, 0) }, [loc.pathname])
  // bound to the workout, not to the route — checking Stats mid-session keeps the screen on
  useWakeLock(!!S.active && S.keepAwake !== false)
  // only once boot has pulled the server copy: writing into the empty local state of a fresh
  // device before that would sync it back and replace the client's real data
  useTrainerWeighIns(ready && !!user && !user.trainer)
  useTrainerAssignments(ready && !!user && !user.trainer)
  const home = user?.trainer ? '/trainer' : '/home'

  const authed = user || isGuest
  if (!ready && !authed) return (
    <div id="app">
      <div style={{ paddingTop: '44vh', display: 'flex', justifyContent: 'center' }}>
        <LogoMark size={44} title={BRAND} />
      </div>
    </div>
  )

  return (
    <>
      {/* keyed on the route: a view that throws is contained, and switching tabs
          re-mounts the boundary, so the tab bar is always a way out */}
      <div id="app" className="vfade" key={loc.pathname}>
        <ErrorBoundary>
          {!authed ? <Login /> : (
            <Routes>
              {/* a trainer's home is their client panel */}
              <Route path="/home" element={user?.trainer ? <Navigate to="/trainer" replace /> : <Home />} />
              <Route path="/plan" element={<Plan />} />
              <Route path="/plan/r/:id" element={<RoutineEdit />} />
              <Route path="/workout" element={<Workout />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/history" element={<History />} />
              <Route path="/library" element={<Library />} />
              <Route path="/settings" element={<Settings />} />
              {/* The Coach screens gate themselves on the instance config; the routes exist
                  unconditionally so a deep link from a notification lands somewhere sane
                  rather than on the catch-all. */}
              <Route path="/coach" element={<Coach />} />
              <Route path="/coach/intake" element={<CoachIntake />} />
              <Route path="/coach/proposal" element={<CoachProposal />} />
              {/* Trainnery: trainers and their clients. The trainer screens gate themselves on
                  user.trainer and the API refuses everyone else; /join is a trainer's invite link. */}
              <Route path="/trainer" element={<Trainer />} />
              <Route path="/trainer/c/:id" element={<TrainerClient />} />
              <Route path="/trainer/c/:id/models" element={<TrainerPrograms />} />
              <Route path="/trainer/chat" element={<TrainerChat />} />
              <Route path="/trainer/chat/:id" element={<TrainerChat />} />
              <Route path="/trainer/content" element={<TrainerContent />} />
              <Route path="/log" element={<Log />} />
              <Route path="/knowledge" element={<Knowledge />} />
              <Route path="/knowledge/:id" element={<Knowledge />} />
              <Route path="/chat" element={<ClientChat />} />
              <Route path="/content" element={<ContentFeed />} />
              <Route path="/join/:token" element={<Join />} />
              <Route path="/admin" element={user?.admin ? <Admin /> : <Navigate to="/home" replace />} />
              <Route path="*" element={<Navigate to={home} replace />} />
            </Routes>
          )}
        </ErrorBoundary>
      </div>
      <TabBar onStart={startFlow} />
      <RestTimer />
      <Modals />
      <Toast />
    </>
  )
}

export default function App() {
  const boot = useStore(s => s.boot)
  useEffect(() => { boot() }, [boot])
  return <HashRouter><Shell /></HashRouter>
}
