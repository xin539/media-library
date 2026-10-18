import { createVNode, render } from 'vue'
import DeleteConfirmation from './DeleteConfirmation.vue'

let active = null
// Password only exists in this short-lived component; never in Pinia or storage.
export function confirmPermanentDelete(confirm) {
  if (active) return Promise.resolve(false)
  return new Promise(resolve => {
    const host = document.createElement('div')
    active = host
    document.body.append(host)
    const finish = result => {
      render(null, host)
      host.remove()
      active = null
      resolve(result)
    }
    render(createVNode(DeleteConfirmation, { confirm, finish }), host)
  })
}
