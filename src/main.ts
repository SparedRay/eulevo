import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { setUpInstall } from './lib/install'
import './styles/tokens.css'
import './styles/base.css'

setUpInstall()
createApp(App).use(createPinia()).use(router).mount('#app')
