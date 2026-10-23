import { useCallback, useEffect, useState } from 'react'
import { api } from './api.js'

// Reactions and comments for one owner's items (see api/trainer/social.js). `owner` is whose
// data it is: a client for their workouts and records, a trainer for their posts.
export const EMOJI = ['❤️', '👍', '🔥', '💪', '👏', '🎉']

export function useSocial(owner) {
  const [s, setS] = useState({ reactions: {}, comments: {}, emoji: EMOJI })
  const load = useCallback(() => {
    if (!owner) return
    api('/api/social?owner=' + encodeURIComponent(owner)).then(setS).catch(() => {})
  }, [owner])
  useEffect(() => { setS({ reactions: {}, comments: {}, emoji: EMOJI }); load() }, [load])
  // the server answers with this item's reactions after a tap; keep the rest as it is
  const setReaction = (k, list) => setS(o => {
    const reactions = { ...o.reactions }
    if (list.length) reactions[k] = list; else delete reactions[k]
    return { ...o, reactions }
  })
  return { ...s, owner, load, setReaction }
}
