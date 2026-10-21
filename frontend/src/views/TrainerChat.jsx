import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import ChatView from '../components/ChatView.jsx'
import Icon from '../components/Icon.jsx'

// The trainer's inbox: one conversation per client, unread first; and the conversation itself
// at /trainer/chat/:id. On a wide screen both sit side by side.

export default function TrainerChat() {
  const nav = useNavigate()
  const { id } = useParams()
  const user = useStore(s => s.user)
  const toast = useUI(s => s.toast)
  const [clients, setClients] = useState(null)
  const [other, setOther] = useState(null)

  const load = () => api('/api/trainer/clients').then(d => setClients(d.clients)).catch(e => toast(e.message))
  useEffect(() => {
    if (!user?.trainer) return
    load()
    const iv = setInterval(() => { if (!document.hidden) load() }, 30000)
    return () => clearInterval(iv)
  }, [!!user?.trainer, id])
  if (!user?.trainer) return null

  const list = clients ? [...clients].sort((a, b) => (b.unread || 0) - (a.unread || 0) || a.name.localeCompare(b.name)) : null
  const inbox = <div className="card" style={{ padding: '4px 14px' }}>
    {!list ? <div className="muted small" style={{ padding: '10px 0' }}>{t('Loading…')}</div>
      : !list.length ? <div className="empty small">{t('Your clients appear here once they accept an invite.')}</div>
      : list.map((c, n) => <button key={c.id} className="row between" onClick={() => nav('/trainer/chat/' + c.id)}
        aria-current={c.id === id ? 'page' : undefined}
        style={{ width: '100%', padding: '11px 0', borderTop: n ? '1px solid var(--sep)' : 'none', background: 'none', textAlign: 'left', color: 'inherit', fontWeight: c.id === id ? 700 : 500 }}>
        <span className="capitalize">{c.name}</span>
        {c.unread > 0 ? <span className="tag acc nocap">{t('{0} new', c.unread)}</span> : <Icon name="chevronRight" className="dim" />}
      </button>)}
  </div>

  if (!id) return <div>
    <div className="hdr"><div style={{ flex: 1 }}><h1 style={{ margin: 0 }}>{t('Chat')}</h1>
      <div className="sub">{t('Conversations with your clients')}</div></div></div>
    {inbox}
  </div>

  return <div>
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/trainer/chat')} aria-label={t('Back')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginLeft: 8, minWidth: 0 }}><h1 style={{ margin: 0 }} className="capitalize">{other ? other.name : '…'}</h1>
        <div className="sub"><button className="linkbtn" onClick={() => nav('/trainer/c/' + id)}>{t('Open client file')}</button></div></div>
    </div>
    <div className="chat-layout">
      <aside className="chat-inbox" aria-label={t('Conversations')}>{inbox}</aside>
      <ChatView withId={id} onOther={setOther} />
    </div>
  </div>
}
