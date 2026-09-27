import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { setUpInstall } from './lib/install'
import { watchForUpdates } from './lib/updates'
import './styles/tokens.css'
import './styles/base.css'

setUpInstall()
watchForUpdates()
createApp(App).use(createPinia()).use(router).mount('#app')
