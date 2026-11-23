import { useEffect, useRef } from 'react'
import { useUI } from '../store/useUI.js'

// One bottom sheet (or centered dialog) with swipe-to-dismiss.
// While the finger is down the sheet IS the finger (direct transform writes, no transition) and
// the backdrop fades with it from the same number; on release it either leaves (past ~30% of its
// height, or flicked down faster than 0.5 px/ms at the end of the gesture) or snaps back fast.
// The enter is a transition, not a keyframe, so a sheet can be caught while it is still rising.
const EASE = 'cubic-bezier(.32,.72,0,1)'
// Past an edge the sheet resists instead of stopping dead: the further you pull, the less it follows.
const rubberband = (over, dim, c = 0.55) => (over * dim * c) / (dim + c * Math.abs(over))
function Sheet({ sheet }) {
  const { closeSheet } = useUI()
  const ref = useRef(null)
  const back = useRef(null)
  const drag = useRef({ startY: null, delta: 0, lastY: 0, lastT: 0, v: 0 })

  // slide in: mounted at translateY(100%), the .in class moves it home on the next frame
  useEffect(() => {
    const el = ref.current
    if (!el) return
    // commit the off-screen start first (reading a layout value flushes styles), then move home
    void el.offsetHeight
    let raf = requestAnimationFrame(() => { raf = requestAnimationFrame(() => el.classList.add('in')) })
    return () => cancelAnimationFrame(raf)
  }, [])

  const onTouchStart = e => {
    const el = ref.current
    // a gesture that begins on a slider (or opted-out control) belongs to that control,
    // not to the sheet's swipe-to-dismiss — so it keeps working while you drag
    if (e.target.closest && e.target.closest('input[type=range], [data-nodrag]')) {
      drag.current = { startY: null, delta: 0, lastY: 0, lastT: 0, v: 0 }
      return
    }
    const y = e.touches[0].clientY
    drag.current = { startY: el.scrollTop <= 0 ? y : null, delta: 0, lastY: y, lastT: performance.now(), v: 0 }
  }
  const onTouchMove = e => {
    const el = ref.current, d = drag.current
    if (d.startY === null) return
    const y = e.touches[0].clientY, now = performance.now()
    // velocity of the last stretch of the gesture, so a fast flick at the end counts
    d.v = (y - d.lastY) / Math.max(1, now - d.lastT); d.lastY = y; d.lastT = now
    d.delta = y - d.startY
    if (d.delta > 0 && el.scrollTop <= 0) {
      e.preventDefault()
      el.style.transition = 'none'
      el.style.transform = `translateY(${d.delta}px)`
      if (back.current) { back.current.style.transition = 'none'; back.current.style.opacity = String(Math.max(0, 1 - d.delta / el.offsetHeight)) }
    } else if (d.delta < 0 && el.scrollHeight <= el.clientHeight + 1) {
      // pulling up a sheet that has nothing more to show: give a little, with resistance
      e.preventDefault()
      el.style.transition = 'none'
      el.style.transform = `translateY(${rubberband(d.delta, el.offsetHeight)}px)`
      d.delta = 0
    } else d.delta = 0
  }
  const onTouchEnd = () => {
    const el = ref.current, d = drag.current
    if (d.startY === null) return
    const fresh = performance.now() - d.lastT < 100   // a finger that stopped before lifting has no fling
    const flick = fresh && d.v > 0.5 && d.delta > 16
    const far = d.delta > Math.max(80, el.offsetHeight * 0.3)
    const b = back.current
    if (!sheet.locked && (far || flick)) {
      // leave in the direction it was going; the store unmounts it after its exit
      el.style.transition = `transform .2s ${EASE}`; el.style.transform = 'translateY(100%)'
      if (b) { b.style.transition = 'opacity .2s ease-out'; b.style.opacity = '0' }
      closeSheet(sheet.id)
    } else {
      // snap back fast
      el.style.transition = `transform .22s ${EASE}`; el.style.transform = ''
      if (b) { b.style.transition = 'opacity .22s ease-out'; b.style.opacity = '' }
    }
    d.startY = null
  }

  // non-passive touchmove so preventDefault works (bottom sheets only; centered dialogs have no ref)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => el.removeEventListener('touchmove', onTouchMove)
  }, [])

  const close = () => closeSheet(sheet.id)
  if (sheet.kind === 'center') {
    return (
      <div className={sheet.closing ? 'closing' : undefined}>
        <div className="mback" onClick={() => { if (!sheet.locked) close() }} />
        <div className="center">{sheet.render(close)}</div>
      </div>
    )
  }
  return (
    <div className={sheet.closing ? 'closing' : undefined}>
      <div className="mback" ref={back} onClick={() => { if (!sheet.locked) close() }} />
      <div className="sheet" ref={ref} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="grab" />
        {sheet.render(close)}
      </div>
    </div>
  )
}

export default function Modals() {
  const sheets = useUI(s => s.sheets)

  // lock the views behind any open sheet; they scroll in #scroll, so its position is kept
  useEffect(() => {
    const el = sheets.length && document.getElementById('scroll')
    if (!el) return
    el.style.overflowY = 'hidden'
    return () => { el.style.overflowY = '' }
  }, [sheets.length > 0])

  if (!sheets.length) return null
  return (
    <div id="modal-root" className="open">
      {sheets.map(s => <Sheet key={s.id} sheet={s} />)}
    </div>
  )
}
