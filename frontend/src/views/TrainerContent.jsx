import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import { useSocial } from '../lib/social.js'
import { confirmSheet } from '../sheets.jsx'
import ContentPost from '../components/ContentPost.jsx'
import { Button, TextField, TextArea, Segmented } from '../components/ui.jsx'

// The trainer's content library: guides, routines, tips — text, a link (video lives on
// YouTube or Drive) or an image/PDF. Every client sees it in their app, newest first.
// At a gym, the owner and trainers the gym allowed also publish for the whole gym: those posts
// reach every member and are signed by the gym (the owner) or by the trainer who wrote them.

const MAX_FILE = 3.5 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,application/pdf'

const asBase64 = file => new Promise((ok, no) => {
  const r = new FileReader()
  r.onload = () => ok(String(r.result).split(',')[1])
  r.onerror = () => no(r.error)
  r.readAsDataURL(file)
})

export default function TrainerContent() {
  const user = useStore(s => s.user)
  const toast = useUI(s => s.toast)
  const [posts, setPosts] = useState(null)
  const g = user?.gym
  const canGym = g?.role === 'owner' || (g?.role === 'trainer' && (g.perms || []).includes('content'))
  const [scope, setScope] = useState(user?.trainer ? 'mine' : 'gym')
  const [form, setForm] = useState({ title: '', body: '', link: '' })
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const social = useSocial(user?.id)   // how many of their clients reacted to each post
  const fileRef = useRef(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const load = () => Promise.all([
    user?.trainer ? api('/api/trainer/content').then(d => d.posts) : [],
    canGym ? api('/api/gym/content').then(d => d.posts.map(p => ({ ...p, gymPost: true }))) : []
  ]).then(([a, b]) => setPosts([...a, ...b].sort((x, y) => y.at.localeCompare(x.at)))).catch(e => toast(e.message))
  useEffect(() => { if (user?.trainer || canGym) load() }, [!!user?.trainer, canGym])
  if (!user?.trainer && !canGym) return null

  const pick = e => {
    const f = e.target.files[0]
    if (f && f.size > MAX_FILE) { toast(t('Files are limited to 3.5 MB; share larger ones as a link')); e.target.value = ''; return }
    setFile(f || null)
  }
  const publish = async e => {
    e.preventDefault()
    if (!form.title.trim()) { toast(t('Give the post a title')); return }
    setBusy(true)
    try {
      const body = { ...form }
      if (file) body.file = { name: file.name, type: file.type, data: await asBase64(file) }
      await api(scope === 'gym' ? '/api/gym/content' : '/api/trainer/content', { method: 'POST', body: JSON.stringify(body) })
      setForm({ title: '', body: '', link: '' }); setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      toast(scope === 'gym' ? t('Published — the whole gym can see it now') : t('Published — your clients can see it now'))
      load()
    } catch (err) { toast(err.message) }
    setBusy(false)
  }
  const del = p => confirmSheet({
    title: t('Delete this post?'), message: t('Your clients stop seeing it. This cannot be undone.'),
    confirmText: t('Delete'), danger: true,
    onConfirm: () => api(p.gymPost ? '/api/gym/content/delete' : '/api/trainer/content/delete', { method: 'POST', body: JSON.stringify({ id: p.id }) })
      .then(() => { toast(t('Post deleted')); load() }).catch(err => toast(err.message))
  })

  return <div>
    <div className="hdr"><div style={{ flex: 1 }}><h1 style={{ margin: 0 }}>{t('Content')}</h1>
      <div className="sub">{t('What you publish here shows up in your clients’ app')}</div></div></div>
    <div className="cols">
      <form className="card" onSubmit={publish} style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ margin: 0 }}>{t('New post')}</h2>
        {canGym && user?.trainer && <Segmented options={[{ value: 'mine', label: t('My clients') }, { value: 'gym', label: t('Whole gym') }]} value={scope} onChange={setScope} />}
        {canGym && <div className="dim small">{scope === 'gym' ? (g.role === 'owner' ? t('Signed as {0}. Every member who can see the gym’s content gets it.', g.name) : t('Signed with your name, for the whole of {0}.', g.name)) : t('Only your clients see it.')}</div>}
        <label className="small muted" style={{ display: 'grid', gap: 4 }}>{t('Title')}
          <TextField maxLength={120} value={form.title} onChange={e => set('title', e.target.value)} placeholder={t('E.g. How to warm up before legs')} /></label>
        <label className="small muted" style={{ display: 'grid', gap: 4 }}>{t('Text')}
          <TextArea maxLength={5000} rows={4} value={form.body} onChange={e => set('body', e.target.value)} /></label>
        <label className="small muted" style={{ display: 'grid', gap: 4 }}>{t('Link (YouTube, Drive…)')}
          <TextField type="url" inputMode="url" maxLength={500} value={form.link} onChange={e => set('link', e.target.value)} placeholder="https://" /></label>
        <label className="small muted" style={{ display: 'grid', gap: 4 }}>{t('Image or PDF (up to 3.5 MB)')}
          <input ref={fileRef} type="file" accept={ACCEPT} onChange={pick} className="field" /></label>
        <Button variant="primary" type="submit" disabled={busy}>{busy ? t('Publishing…') : t('Publish')}</Button>
      </form>
      <div>
        {!posts ? <div className="muted small">{t('Loading…')}</div>
          : posts.length ? posts.map(p => <ContentPost key={(p.gymPost ? 'g' : 't') + p.id} post={p} trainerId={p.source || user.id}
            onDelete={!p.gymPost || g?.role === 'owner' || p.by === user.id ? () => del(p) : null} social={p.gymPost ? null : social} readOnly />)
          : <div className="empty small">{t('Nothing published yet.')}</div>}
      </div>
    </div>
  </div>
}
