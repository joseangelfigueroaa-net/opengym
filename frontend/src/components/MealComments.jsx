import { useState } from 'react'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import { fmtDate } from '../lib/format.js'
import { Button, TextArea } from './ui.jsx'

// The trainer's comments on one meal. The client reads them; the trainer writes and removes their
// own. `social` is useSocial() for the client who owns the meal.
export default function MealComments({ social, recordId, myId, canComment }) {
  const toast = useUI(s => s.toast)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const list = social.comments[recordId] || []

  const send = async () => {
    const body = text.trim()
    if (!body) return
    setBusy(true)
    try {
      await api('/api/social/comment', { method: 'POST', body: JSON.stringify({ owner: social.owner, record: recordId, text: body }) })
      setText('')
      social.load()
    } catch (e) { toast(e.message) } finally { setBusy(false) }
  }
  const remove = async id => {
    try {
      await api('/api/social/comment/delete', { method: 'POST', body: JSON.stringify({ owner: social.owner, id }) })
      social.load()
    } catch (e) { toast(e.message) }
  }

  if (!list.length && !canComment) return null
  return <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
    {list.map(c => <div key={c.id} className="small" style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '6px 10px' }}>
      <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{c.text}</div>
      <div className="dim row between" style={{ fontSize: '.7rem', marginTop: 2 }}>
        <span>{c.by === myId ? t('You') : t('Your trainer')} · {fmtDate(c.at.slice(0, 10), true)}</span>
        {c.by === myId && <button type="button" className="dim" style={{ fontSize: '.7rem', minHeight: 32 }} onClick={() => remove(c.id)}>{t('Delete')}</button>}
      </div>
    </div>)}
    {canComment && <div className="row" style={{ gap: 6, alignItems: 'flex-end' }}>
      <div style={{ flex: 1 }}><TextArea rows={2} maxLength={500} placeholder={t('Comment on this meal')} aria-label={t('Comment on this meal')} value={text} onChange={e => setText(e.target.value)} /></div>
      <Button variant="tinted" onClick={send} disabled={busy || !text.trim()}>{t('Send')}</Button>
    </div>}
  </div>
}
