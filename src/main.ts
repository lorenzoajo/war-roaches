import { createApp } from 'vue'
import App from './App.vue'
import { installGlobalHandlers, logger } from './lib/logger'

installGlobalHandlers()
createApp(App).mount('#app')
logger.info('app mounted')
