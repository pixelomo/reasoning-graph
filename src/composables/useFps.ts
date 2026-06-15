import { ref, onUnmounted, type Ref } from 'vue'

export function useFps(): { fps: Ref<number>; tick: (now: number) => void } {
  const fps = ref(0)
  let frames = 0
  let lastSample = 0

  function tick(now: number): void {
    frames += 1
    if (lastSample === 0) {
      lastSample = now
      return
    }
    const elapsed = now - lastSample
    if (elapsed >= 500) {
      fps.value = Math.round((frames * 1000) / elapsed)
      frames = 0
      lastSample = now
    }
  }

  onUnmounted(() => {
    frames = 0
    lastSample = 0
  })

  return { fps, tick }
}
