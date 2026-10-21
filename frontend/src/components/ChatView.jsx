import { useEffect, useRef, useState } from 'react'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { t, dateLocale } from '../lib/i18n.js'
import { Button, TextArea } from './ui.jsx'

// One conversation between a trainer and a client. `withId` is the client's id when the
// trainer is the one reading; a client leaves it out and gets the chat with their trainer.
// Polls every 5 s while the tab is visible — light enough for a handful of clients, and push
// covers the times the app is closed.
const POLL = 5000

const when = iso => {
  const d = new Date(iso), today = new Date()
  const same = d.toDateString() === today.toDateString()
  return same ? d.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })
}

export default function ChatView({ withId, onOther }) {
  const toast = useUI(s => s.toast)
  const [chat, setChat] = useState(null)       // { messages, me, other, readByOther } | { error }
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef(null)
  const url = '/api/chat' + (withId ? '?with=' + encodeURIComponent(withId) : '')

  const load = () => api(url).then(c => {
    setChat(prev => {
      if (prev && !prev.error && prev.messages.length === c.messages.length && prev.readByOther === c.readByOther) return prev
      return c
    })
    onOther && onOther(c.other)
    window.dispatchEvent(new Event('trainnery:read'))   // the tab bar badge re-counts
  }).catch(e => setChat({ error: e.message }))

  useEffect(() => {
    load()
    const iv = setInterval(() => { if (!document.hidden) load() }, POLL)
    return () => clearInterval(iv)
  }, [withId])
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [chat?.messages?.length])

  const send = async e => {
    e.preventDefault()
    const msg = text.trim()
    if (!msg || busy) return
    setBusy(true)
    try {
      const r = await api('/api/chat', { method: 'POST', body: JSON.stringify({ with: withId, text: msg }) })
      setText('')
      setChat(c => ({ ...c, messages: [...c.messages, r.message] }))
    } catch (err) { toast(err.message) }
    setBusy(false)
  }

  if (!chat) return <div className="muted small">{t('Loading…')}</div>
  if (chat.error) return <div className="empty small">{chat.error}</div>
  const lastMine = [...chat.messages].reverse().find(m => m.from === chat.me)

  return <div className="chat">
    <div className="chat-log" role="log" aria-live="polite" aria-label={t('Messages with {0}', chat.other.name)}>
      {!chat.messages.length && <div className="empty small">{t('No messages yet. Say hello to {0}.', chat.other.name)}</div>}
      {chat.messages.map(m => (
        <div key={m.id} className={'bubble' + (m.from === chat.me ? ' mine' : '')}>
          <div className="txt">{m.text}</div>
          <div className="meta">{when(m.at)}{m === lastMine && chat.readByOther && chat.readByOther >= m.at ? ' · ' + t('Seen') : ''}</div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
    <form className="chat-send" onSubmit={send}>
      <label htmlFor="chat-input" className="sr-only">{t('Message')}</label>
      <TextArea id="chat-input" rows={1} maxLength={2000} placeholder={t('Write a message…')} value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) send(e) }} />
      <Button variant="primary" type="submit" disabled={busy || !text.trim()}>{busy ? t('Sending…') : t('Send')}</Button>
    </form>
  </div>
}
