import { ref, type Ref } from 'vue'
import {
  perspective,
  multiply,
  translation,
  rotationX,
  rotationY,
  type Mat4,
} from '@/webgl/math'

export interface Camera {
  yaw: Ref<number>
  pitch: Ref<number>
  distance: Ref<number>
  modelView: () => Mat4
  proj: (aspect: number) => Mat4
  orbit: (dxDevice: number, dyDevice: number) => void
  dolly: (factor: number) => void
  autoRotate: (dt: number, speed: number) => void
  fit: (worldRadius: number) => void
  reset: () => void
}

const FOV = (45 * Math.PI) / 180
const NEAR = 0.01
const FAR = 1e7
const MIN_PITCH = -1.45
const MAX_PITCH = 1.45
const ORBIT_SPEED = 0.005

export function useCamera(): Camera {
  const yaw = ref(0)
  const pitch = ref(0.2)
  const distance = ref(4)

  function modelView(): Mat4 {
    const rot = multiply(rotationX(pitch.value), rotationY(yaw.value))
    return multiply(translation(0, 0, -distance.value), rot)
  }

  function proj(aspect: number): Mat4 {
    return perspective(FOV, aspect, NEAR, FAR)
  }

  function orbit(dxDevice: number, dyDevice: number): void {
    yaw.value += dxDevice * ORBIT_SPEED
    pitch.value = Math.min(Math.max(pitch.value + dyDevice * ORBIT_SPEED, MIN_PITCH), MAX_PITCH)
  }

  function dolly(factor: number): void {
    distance.value = Math.min(Math.max(distance.value * factor, 0.05), FAR / 2)
  }

  function autoRotate(dt: number, speed: number): void {
    yaw.value += dt * speed
  }

  function fit(worldRadius: number): void {
    distance.value = (worldRadius / Math.sin(FOV / 2)) * 1.35
  }

  function reset(): void {
    yaw.value = 0
    pitch.value = 0.2
  }

  return { yaw, pitch, distance, modelView, proj, orbit, dolly, autoRotate, fit, reset }
}
