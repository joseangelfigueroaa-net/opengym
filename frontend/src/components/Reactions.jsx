import { useState } from 'react'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { t } from '../lib/i18n.js'

// Emoji reactions on one item. `reactions` is this item's list ([{ by, e }]). A person reacts with
// one tap; the same emoji again takes it back. `readOnly` shows the counts and nothing to press.
export default function Reactions({ social, k, myId, readOnly }) {
  const toast = useUI(s => s.toast)
  const [busy, setBusy] = useState(false)
  const list = social.reactions[k] || []
  const mine = list.find(x => x.by === myId)?.e
  const count = e => list.filter(x => x.e === e).length
  const emoji = readOnly ? social.emoji.filter(count) : social.emoji
  if (readOnly && !emoji.length) return null

  const tap = async e => {
    if (busy) return
    setBusy(true)
    try {
      const r = await api('/api/social/react', { method: 'POST', body: JSON.stringify({ owner: social.owner, key: k, e }) })
      social.setReaction(k, r.reactions)
    } catch (err) { toast(err.message) } finally { setBusy(false) }
  }

  return <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 8 }} role={readOnly ? undefined : 'group'} aria-label={t('Reactions')}>
    {emoji.map(e => {
      const n = count(e), on = mine === e
      return readOnly
        ? <span key={e} className="chip nocap" aria-label={t('{0} reactions', n)}>{e} {n}</span>
        : <button key={e} type="button" className={'chip nocap' + (on ? ' on' : '')} aria-pressed={on} disabled={busy}
          onClick={() => tap(e)} style={{ minHeight: 36 }}>{e}{n ? ' ' + n : ''}</button>
    })}
  </div>
}
