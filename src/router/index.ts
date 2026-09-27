import { createRouter, createWebHistory } from 'vue-router'
import { isHostSignedIn } from '@/lib/supabase'
import { APP_NAME } from '@/config'

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },

    // Guests — opened from the link the hosts share
    { path: '/l/:token', name: 'guest-list', component: () => import('@/views/guest/ListView.vue') },
    { path: '/l/:token/g/:giftId', name: 'guest-confirm', component: () => import('@/views/guest/ConfirmView.vue') },
    { path: '/l/:token/done/:giftId', name: 'guest-done', component: () => import('@/views/guest/DoneView.vue') },
    { path: '/l/:token/taken/:giftId', name: 'guest-taken', component: () => import('@/views/guest/TakenView.vue') },
    { path: '/l/:token/mine', name: 'guest-mine', component: () => import('@/views/guest/MineView.vue') },

    // Hosts
    { path: '/admin/login', name: 'admin-login', component: () => import('@/views/admin/LoginView.vue') },
    {
      path: '/admin',
      meta: { host: true },
      children: [
        { path: '', name: 'admin-lists', component: () => import('@/views/admin/ListsView.vue') },
        { path: 'lists/:id', name: 'admin-gifts', component: () => import('@/views/admin/GiftsView.vue') },
        { path: 'lists/:id/claims', name: 'admin-claims', component: () => import('@/views/admin/ClaimsView.vue') },
      ],
    },

    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') },
  ],
})

router.beforeEach(async (to) => {
  if (to.matched.some((r) => r.meta.host) && !(await isHostSignedIn())) {
    return { name: 'admin-login', query: { next: to.fullPath } }
  }
})

router.afterEach(() => {
  document.title = APP_NAME
})
