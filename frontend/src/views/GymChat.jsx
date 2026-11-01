import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import ChatView from '../components/ChatView.jsx'
import Icon from '../components/Icon.jsx'

// Messages between a gym and one of its people. The owner opens /gym/chat/<id> from the gym
// panel; a member or a trainer opens /gym/chat, their own conversation with the gym.
export default function GymChat() {
  const nav = useNavigate()
  const { id } = useParams()
  const user = useStore(s => s.user)
  const [other, setOther] = useState(null)
  const owner = user?.gym?.role === 'owner'
  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav(owner ? '/gym' : '/settings')} aria-label={t('Back')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginLeft: 8 }}><h1 style={{ margin: 0 }} className="capitalize">{other ? other.name : t('Messages')}</h1>
        <div className="sub">{owner ? t('From {0}', user.gym.name) : t('Your gym')}</div></div>
    </div>
    {!user?.gym ? <div className="empty small">{t('You are not at a gym.')}</div>
      : <ChatView base="/api/gym/chat" withId={owner ? id : undefined} onOther={setOther} />}
  </div>
}
