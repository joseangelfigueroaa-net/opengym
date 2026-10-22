import { useStore } from '../store/useStore.js'
import { useMyTrainer } from './trainer.js'

// What the plan includes ('meals', 'macros', 'health'), Trainnery: a trainer's own plan, or the
// plan of a client's trainer. Kept out of lib/trainer.js, which stays free of the store.
export function useFeatures() {
  const user = useStore(s => s.user)
  const myTrainer = useMyTrainer(!!user && !user.trainer)
  return user?.trainer ? user.trainer.features || [] : myTrainer?.features || []
}
