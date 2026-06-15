import { onMounted, onUnmounted, type Ref } from 'vue'

export interface PickingOptions {
  canvas: Ref<HTMLCanvasElement | null>
  dpr: () => number
  pickAt: (deviceX: number, deviceY: number) => number | null
  onPick: (index: number | null) => void
}

const CLICK_THRESHOLD = 4

export function usePicking(options: PickingOptions): void {
  let downX = 0
  let downY = 0
  let dragged = false

  function onPointerDown(event: PointerEvent): void {
    downX = event.clientX
    downY = event.clientY
    dragged = false
  }

  function onPointerMove(event: PointerEvent): void {
    if (
      Math.abs(event.clientX - downX) > CLICK_THRESHOLD ||
      Math.abs(event.clientY - downY) > CLICK_THRESHOLD
    ) {
      dragged = true
    }
  }

  function onPointerUp(event: PointerEvent): void {
    if (dragged) return
    const canvas = options.canvas.value
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const dpr = options.dpr()
    const deviceX = (event.clientX - rect.left) * dpr
    const deviceY = (event.clientY - rect.top) * dpr
    options.onPick(options.pickAt(deviceX, deviceY))
  }

  onMounted(() => {
    const canvas = options.canvas.value
    if (!canvas) return
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
  })

  onUnmounted(() => {
    const canvas = options.canvas.value
    if (!canvas) return
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerup', onPointerUp)
  })
}
