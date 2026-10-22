import { useNavigate } from 'react-router-dom'
import { t } from '../lib/i18n.js'
import { useMyTrainer } from '../lib/trainer.js'
import ChatView from '../components/ChatView.jsx'
import Icon from '../components/Icon.jsx'

// A client's conversation with their trainer.
export default function ClientChat() {
  const nav = useNavigate()
  const trainer = useMyTrainer()
  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/home')} aria-label={t('Back')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginLeft: 8 }}><h1 style={{ margin: 0 }} className="capitalize">{trainer ? trainer.name : t('Chat')}</h1>
        <div className="sub">{t('Your trainer')}{trainer && <> · <button type="button" className="linkbtn" onClick={() => nav('/my-trainer')}>{t('See profile')}</button></>}</div></div>
    </div>
    {trainer === null
      ? <div className="empty small">{t('You don’t have a trainer yet. When a trainer invites you, you can chat with them here.')}</div>
      : <ChatView />}
  </div>
}
