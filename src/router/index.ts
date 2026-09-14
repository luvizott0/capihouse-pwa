import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppShell from '@/components/layout/AppShell.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: () => {
        const auth = useAuthStore()
        return auth.isAuthenticated ? '/feed' : '/login'
      }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { guestOnly: true }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/auth/RegisterView.vue'),
      meta: { guestOnly: true }
    },
    {
      path: '/',
      component: AppShell,
      meta: { requiresAuth: true },
      children: [
        {
          path: 'feed',
          name: 'feed',
          component: () => import('@/views/app/FeedView.vue'),
          meta: { requiresApproved: true }
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/views/app/ProfileView.vue'),
          meta: { requiresApproved: true }
        },
        {
          path: 'profile/:username',
          name: 'user-profile',
          component: () => import('@/views/app/ProfileView.vue'),
          meta: { requiresApproved: true }
        },
        {
          path: 'events',
          name: 'events',
          component: () => import('@/views/app/EventsView.vue'),
          meta: { requiresApproved: true }
        },
        {
          path: 'admin/users',
          name: 'admin-users',
          component: () => import('@/views/admin/AdminUsersView.vue'),
          meta: { requiresAdmin: true }
        }
      ]
    }
  ]
})

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore()

  // If we have a token stored but no user object, fetch the profile
  if (auth.token && !auth.user) {
    await auth.fetchMe()
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return next('/login')
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return next('/feed')
  }

  if (to.meta.requiresApproved) {
    // If not approved or admin, re-check by calling fetchMe to be certain
    if (!auth.isApproved && !auth.isAdmin && auth.token) {
      await auth.fetchMe()
    }
    if (!auth.isApproved && !auth.isAdmin) {
      return next({ path: '/login', query: { notice: 'pending' } })
    }
  }

  if (to.meta.requiresAdmin) {
    if (!auth.isAdmin && auth.token) {
      await auth.fetchMe()
    }
    if (!auth.isAdmin) {
      return next('/feed')
    }
  }

  next()
})

export default router
