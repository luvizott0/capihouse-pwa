import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'

import App from './App.vue'
import router from './router'
import './assets/css/main.css'

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return

    // Verifica atualizações sempre que o usuário traz o PWA de volta para o primeiro plano
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        registration.update()
      }
    })

    // Verifica atualizações periodicamente (a cada 30 minutos)
    setInterval(() => {
      registration.update()
    }, 30 * 60 * 1000)
  }
})

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
