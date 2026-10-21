import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { effectiveRoutine } from '../lib/history.js'
import { todayISO } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { useMyTrainer, useUnread } from '../lib/trainer.js'
import Icon from './Icon.jsx'

// Two tab bars, one per role (Trainnery). A trainer works with clients: Clients, Chat, Content,
// Knowledge, Settings. A client trains and logs: Today, Log, Start, Progress, and Chat when they have a
// trainer (Exercises otherwise). Plan and the exercise library stay one tap away from Today.
export default function TabBar({ onStart }) {
  const nav = useNavigate()
  const loc = useLocation()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const isGuest = useStore(s => s.isGuest())
  const isTrainer = !!user?.trainer
  const trainer = useMyTrainer(!!user && !isTrainer)
  const unread = useUnread(!!user && (isTrainer || !!trainer))
  if (!user && !isGuest) return null

  const path = loc.pathname
  const Tab = ({ on, icon, to, label, badge }) => (
    <button className={on ? 'on' : ''} onClick={() => nav(to)} aria-current={on ? 'page' : undefined}>
      <span className="tab-ic"><Icon name={icon} />{badge > 0 && <span className="badge" aria-label={t('{0} unread messages', badge)}>{badge > 9 ? '9+' : badge}</span>}</span>
      <span>{label}</span>
    </button>
  )

  if (isTrainer) return (
    <nav id="tabbar" aria-label={t('Sections')}>
      <Tab on={path === '/trainer' || path.startsWith('/trainer/c/')} icon="person" to="/trainer" label={t('Clients')} />
      <Tab on={path.startsWith('/trainer/chat')} icon="chat" to="/trainer/chat" label={t('Chat')} badge={unread} />
      <Tab on={path.startsWith('/trainer/content')} icon="library" to="/trainer/content" label={t('Content')} />
      <Tab on={path.startsWith('/knowledge')} icon="lightbulb" to="/knowledge" label={t('Knowledge')} />
      <Tab on={path === '/settings' || path === '/admin'} icon="gear" to="/settings" label={t('Settings')} />
    </nav>
  )

  const cur = path.split('/')[1] || 'home'
  const startWorkout = () => {
    if (!S.active) {
      const r = effectiveRoutine(S, todayISO())
      if (r && r.ex.length) { onStart(r.id); return }
    }
    nav('/workout')
  }
  return (
    <nav id="tabbar" aria-label={t('Sections')}>
      <Tab on={['home', 'settings', 'plan', 'content', 'knowledge'].includes(cur)} icon="house" to="/home" label={t('Today')} />
      <Tab on={cur === 'log'} icon="plus" to="/log" label={t('Log')} />
      <button className={'start' + (S.active ? ' rec' : '')} onClick={startWorkout}>
        <span className="cir"><Icon name={S.active ? 'play' : 'dumbbell'} /></span>
        <span>{S.active ? t('Resume') : t('Start')}</span>
      </button>
      <Tab on={cur === 'stats' || cur === 'history'} icon="chart" to="/stats" label={t('Progress')} />
      {trainer
        ? <Tab on={cur === 'chat'} icon="chat" to="/chat" label={t('Chat')} badge={unread} />
        : <Tab on={cur === 'library'} icon="list" to="/library" label={t('Exercises')} />}
    </nav>
  )
}
