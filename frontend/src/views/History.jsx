import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { useSocial } from '../lib/social.js'
import { WorkoutRow, workoutDetailSheet } from '../sheets.jsx'
import Reactions from '../components/Reactions.jsx'
import Icon from '../components/Icon.jsx'

// Your workouts, with what your trainer reacted with on each.
export default function History() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const social = useSocial(user?.id)
  return <>
    <div className="hdr"><button className="iconbtn" onClick={() => nav('/stats')} aria-label={t('Stats')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginLeft: 12 }}><h1>{t('History')}</h1><div className="sub">{t('{0} workouts', S.workouts.length)}</div></div></div>
    {S.workouts.length ? <div className="list">{[...S.workouts].reverse().map(w => <div key={w.id}>
      <WorkoutRow w={w} onClick={() => workoutDetailSheet(w)} />
      <div style={{ padding: '0 4px 8px' }}><Reactions social={social} k={'w:' + w.id} myId={user?.id} readOnly /></div>
    </div>)}</div>
      : <div className="empty"><div className="ico"><Icon name="history" /></div>{t('No workouts yet.')}</div>}
  </>
}
