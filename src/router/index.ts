import { createRouter, createWebHistory } from 'vue-router'
import { isHostSignedIn } from '@/lib/supabase'
import { APP_NAME } from '@/config'

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },

    // Guests — opened from the link the hosts share
    { path: '/l/:token', name: 'guest-list', meta: { guest: true }, component: () => import('@/views/guest/ListView.vue') },
    { path: '/l/:token/g/:giftId', name: 'guest-confirm', meta: { guest: true }, component: () => import('@/views/guest/ConfirmView.vue') },
    { path: '/l/:token/done/:giftId', name: 'guest-done', meta: { guest: true }, component: () => import('@/views/guest/DoneView.vue') },
    { path: '/l/:token/taken/:giftId', name: 'guest-taken', meta: { guest: true }, component: () => import('@/views/guest/TakenView.vue') },
    { path: '/l/:token/mine', name: 'guest-mine', meta: { guest: true }, component: () => import('@/views/guest/MineView.vue') },

    // Hosts
    { path: '/admin/login', name: 'admin-login', meta: { title: 'Entrar' }, component: () => import('@/views/admin/LoginView.vue') },
    {
      path: '/admin',
      meta: { host: true },
      children: [
        { path: '', name: 'admin-lists', meta: { title: 'Suas listas' }, component: () => import('@/views/admin/ListsView.vue') },
        { path: 'lists/:id', name: 'admin-gifts', meta: { title: 'Presentes' }, component: () => import('@/views/admin/GiftsView.vue') },
        { path: 'lists/:id/claims', name: 'admin-claims', meta: { title: 'Quem vai levar o quê' }, component: () => import('@/views/admin/ClaimsView.vue') },
        { path: 'lists/:id/settings', name: 'admin-settings', meta: { title: 'Festa e anfitriões' }, component: () => import('@/views/admin/SettingsView.vue') },
        // Co-host invite link; signing in first is handled by the host guard
        { path: 'convite/:token', name: 'admin-invite', meta: { title: 'Convite' }, component: () => import('@/views/admin/InviteView.vue') },
      ],
    },

    { path: '/:pathMatch(.*)*', name: 'not-found', meta: { title: 'Página não encontrada' }, component: () => import('@/views/NotFoundView.vue') },
  ],
})

router.beforeEach(async (to) => {
  if (to.matched.some((r) => r.meta.host) && !(await isHostSignedIn())) {
    return { name: 'admin-login', query: { next: to.fullPath } }
  }
})

// Guest pages get the list's name once it has loaded (App.vue); host pages use meta.title.
router.afterEach((to) => {
  const title = typeof to.meta.title === 'string' ? to.meta.title : null
  document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
})
