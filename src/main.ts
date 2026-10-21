import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { usePwaUpdate } from './composables/usePwaUpdate'

import App from './App.vue'
import router from './router'
import './assets/css/main.css'

// Inicializa o gerenciador unificado de Service Worker e ciclo de vida de atualizações do PWA
usePwaUpdate()

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
