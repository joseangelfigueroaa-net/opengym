import { t } from '../lib/i18n.js'
import { fmtDate } from '../lib/format.js'
import Icon from './Icon.jsx'

// One post from a trainer's content library, as both the trainer and their clients see it.
// Files come from an authenticated endpoint (the session cookie rides along), never a public URL.
export const fileUrl = (trainerId, postId) => '/api/content/file?trainer=' + encodeURIComponent(trainerId) + '&post=' + encodeURIComponent(postId)
const kb = n => n < 1048576 ? Math.round(n / 1024) + ' KB' : (n / 1048576).toFixed(1) + ' MB'

export default function ContentPost({ post, trainerId, onDelete }) {
  const url = post.file && fileUrl(trainerId, post.id)
  return <article className="card">
    <div className="row between" style={{ gap: 8, alignItems: 'flex-start' }}>
      <div style={{ minWidth: 0 }}>
        <h3 style={{ margin: 0, overflowWrap: 'anywhere' }}>{post.title}</h3>
        <div className="dim" style={{ fontSize: '.72rem' }}>{fmtDate(post.at.slice(0, 10), true)}</div>
      </div>
      {onDelete && <button className="iconbtn" style={{ width: 44, height: 44, fontSize: 16, color: 'var(--red)', flexShrink: 0 }} onClick={onDelete} aria-label={t('Delete post')}><Icon name="trash" /></button>}
    </div>
    {post.body && <p className="small" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', margin: '8px 0 0' }}>{post.body}</p>}
    {post.file && post.file.type.startsWith('image/') &&
      <img src={url} alt={post.title} loading="lazy" style={{ width: '100%', borderRadius: 12, marginTop: 10, display: 'block', background: 'var(--surface-2)' }} />}
    {post.file && post.file.type === 'application/pdf' &&
      <a className="btn tinted" style={{ marginTop: 10 }} href={url} target="_blank" rel="noopener"><Icon name="download" /> {post.file.name} · {kb(post.file.size)}</a>}
    {post.link && <a className="btn tinted" style={{ marginTop: 10, overflowWrap: 'anywhere' }} href={post.link} target="_blank" rel="noopener noreferrer"><Icon name="link" /> {t('Open link')}</a>}
  </article>
}
