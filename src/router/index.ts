import { ref } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { isHostSignedIn } from '@/lib/supabase'
import { APP_NAME } from '@/config'
import { isMissingCodeError, loadFresh, screenLoaded, updateReady } from '@/lib/updates'

// Screens load on demand. Each import is named once so the same function serves the route and the prefetch below.
const guestViews = {
  list: () => import('@/views/guest/ListView.vue'),
  confirm: () => import('@/views/guest/ConfirmView.vue'),
  done: () => import('@/views/guest/DoneView.vue'),
  taken: () => import('@/views/guest/TakenView.vue'),
  mine: () => import('@/views/guest/MineView.vue'),
}
const hostViews = {
  lists: () => import('@/views/admin/ListsView.vue'),
  gifts: () => import('@/views/admin/GiftsView.vue'),
  giftForm: () => import('@/views/admin/GiftFormView.vue'),
  claims: () => import('@/views/admin/ClaimsView.vue'),
  settings: () => import('@/views/admin/SettingsView.vue'),
  invite: () => import('@/views/admin/InviteView.vue'),
}

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },

    // Guests — opened from the link the hosts share
    { path: '/l/:token', name: 'guest-list', meta: { guest: true }, component: guestViews.list },
    { path: '/l/:token/g/:giftId', name: 'guest-confirm', meta: { guest: true }, component: guestViews.confirm },
    { path: '/l/:token/done/:giftId', name: 'guest-done', meta: { guest: true }, component: guestViews.done },
    { path: '/l/:token/taken/:giftId', name: 'guest-taken', meta: { guest: true }, component: guestViews.taken },
    { path: '/l/:token/mine', name: 'guest-mine', meta: { guest: true }, component: guestViews.mine },

    // Hosts
    { path: '/admin/login', name: 'admin-login', meta: { title: 'Entrar' }, component: () => import('@/views/admin/LoginView.vue') },
    {
      path: '/admin',
      meta: { host: true },
      children: [
        { path: '', name: 'admin-lists', meta: { title: 'Suas listas' }, component: hostViews.lists },
        { path: 'lists/:id', name: 'admin-gifts', meta: { title: 'Presentes' }, component: hostViews.gifts },
        { path: 'lists/:id/gifts/new', name: 'admin-gift-new', meta: { title: 'Adicionar presente' }, component: hostViews.giftForm },
        { path: 'lists/:id/gifts/:giftId', name: 'admin-gift-edit', meta: { title: 'Editar presente' }, component: hostViews.giftForm },
        { path: 'lists/:id/claims', name: 'admin-claims', meta: { title: 'Quem vai levar o quê' }, component: hostViews.claims },
        { path: 'lists/:id/settings', name: 'admin-settings', meta: { title: 'Festa e anfitriões' }, component: hostViews.settings },
        // Co-host invite link; signing in first is handled by the host guard
        { path: 'convite/:token', name: 'admin-invite', meta: { title: 'Convite' }, component: hostViews.invite },
      ],
    },

    { path: '/:pathMatch(.*)*', name: 'not-found', meta: { title: 'Página não encontrada' }, component: () => import('@/views/NotFoundView.vue') },
  ],
})

/**
 * True while the next screen is on its way (its code downloading, the host check running).
 * App.vue shows the loading bar only if that takes longer than a moment, so quick changes don't flicker.
 */
export const navigating = ref(false)
const SHOW_AFTER_MS = 150
let showTimer: ReturnType<typeof setTimeout> | undefined

function doneNavigating() {
  clearTimeout(showTimer)
  navigating.value = false
}

// A newer version was deployed: swap it in now, at a change of screen, instead of the in-app move.
// Never on the first load (that one is already fresh) and never mid-screen, so no half-typed form is lost.
router.beforeEach((to, from) => {
  if (updateReady && from.matched.length && loadFresh(to.fullPath)) return false
})

router.beforeEach(() => {
  clearTimeout(showTimer)
  showTimer = setTimeout(() => (navigating.value = true), SHOW_AFTER_MS)
})

router.beforeEach(async (to) => {
  if (to.matched.some((r) => r.meta.host) && !(await isHostSignedIn())) {
    return { name: 'admin-login', query: { next: to.fullPath } }
  }
})

router.afterEach((_to, _from, failure) => {
  doneNavigating()
  if (!failure) screenLoaded()
})
router.onError((error, to) => {
  doneNavigating()
  // The screen's code is gone after a deploy: load that screen fresh (the new version) instead of doing nothing.
  if (isMissingCodeError(error)) loadFresh(to.fullPath)
})

// Guest pages get the list's name once it has loaded (App.vue); host pages use meta.title.
router.afterEach((to) => {
  const title = typeof to.meta.title === 'string' ? to.meta.title : null
  document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
})

// Once a guest or host screen is up, quietly download the other screens of that area so moving between them is instant.
const prefetched = new Set<string>()
router.afterEach((to) => {
  const area = to.meta.guest ? 'guest' : to.matched.some((r) => r.meta.host) ? 'host' : null
  if (!area || prefetched.has(area)) return
  prefetched.add(area)
  const views = Object.values(area === 'guest' ? guestViews : hostViews)
  const idle = window.requestIdleCallback ?? ((fn: () => void) => setTimeout(fn, 1500))
  idle(() => views.forEach((load) => load().catch(() => prefetched.delete(area))))
})
