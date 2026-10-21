import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import ContentPost from '../components/ContentPost.jsx'
import Icon from '../components/Icon.jsx'

// A client's view of their trainer's content library.
export default function ContentFeed() {
  const nav = useNavigate()
  const toast = useUI(s => s.toast)
  const [d, setD] = useState(null)
  useEffect(() => { api('/api/content').then(setD).catch(e => toast(e.message)) }, [])
  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/home')} aria-label={t('Back')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginLeft: 8 }}><h1 style={{ margin: 0 }}>{t('From your trainer')}</h1>
        <div className="sub capitalize">{d?.trainer ? d.trainer.name : ''}</div></div>
    </div>
    {!d ? <div className="muted small">{t('Loading…')}</div>
      : !d.trainer ? <div className="empty small">{t('You don’t have a trainer yet.')}</div>
      : d.posts.length ? d.posts.map(p => <ContentPost key={p.id} post={p} trainerId={d.trainer.id} />)
      : <div className="empty small">{t('Your trainer hasn’t published anything yet.')}</div>}
  </div>
}
