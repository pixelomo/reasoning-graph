import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import GraphView from '@/views/GraphView.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'graph',
    component: GraphView,
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})
