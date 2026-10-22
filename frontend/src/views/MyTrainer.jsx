import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import TrainerProfileView from '../components/TrainerProfileView.jsx'
import { Button } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

// A client's view of their trainer's profile (Trainnery), reached from Today and the chat.
// Asked fresh on every visit (not useMyTrainer's cache), so an edit by the trainer shows at once.
export default function MyTrainer() {
  const nav = useNavigate()
  const [trainer, setTrainer] = useState(undefined)
  useEffect(() => { api('/api/me/trainer').then(r => setTrainer(r.trainer)).catch(() => setTrainer(null)) }, [])
  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav(-1)} aria-label={t('Back')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginLeft: 8 }}><h1 style={{ margin: 0 }}>{t('Your trainer')}</h1></div>
    </div>
    {trainer === undefined ? <div className="muted small">{t('Loading…')}</div>
      : !trainer ? <div className="empty small">{t('You don’t have a trainer yet. When a trainer invites you, you can chat with them here.')}</div>
      : <>
        <TrainerProfileView profile={trainer.profile || { name: trainer.name, age: null, years: null, story: '', certifications: [], methods: [], about: '' }} />
        <Button variant="primary" icon="chat" onClick={() => nav('/chat')}>{t('Message')}</Button>
      </>}
  </div>
}
