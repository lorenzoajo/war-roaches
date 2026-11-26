<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { logger } from '../lib/logger'
import { store } from './store'

const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
  immediate: true,
  onRegisterError(err: unknown) {
    logger.error('service worker registration failed', err)
  },
  onRegisteredSW(_url: string, reg: ServiceWorkerRegistration | undefined) {
    // Check for a new version every 30 min while the app stays open.
    if (reg) setInterval(() => void reg.update().catch((err: unknown) => logger.warn('sw update check failed', { error: String(err) })), 30 * 60 * 1000)
  },
})

// Never interrupt a match: the prompt waits for the menus.
const showUpdate = computed(() => needRefresh.value && store.screen !== 'match')
watch(offlineReady, (ready) => {
  if (ready) setTimeout(() => (offlineReady.value = false), 3000)
})
const reload = async (): Promise<void> => {
  try {
    await updateServiceWorker(true)
  } catch (err) {
    logger.error('update failed', err)
  }
}
</script>

<template>
  <transition name="slide">
    <div v-if="showUpdate" class="toast">
      <span>🪳 New roaches arrived!</span>
      <button class="btn" @click="reload">Update</button>
      <button class="btn secondary" @click="needRefresh = false">Later</button>
    </div>
    <div v-else-if="offlineReady && store.screen !== 'match'" class="toast">✅ Ready to play offline</div>
  </transition>
</template>

<style scoped>
.toast {
  position: fixed; bottom: calc(12px + var(--sab)); left: 50%; transform: translateX(-50%); z-index: 40;
  display: flex; align-items: center; gap: 10px; background: var(--panel); border: 3px solid #120b22; border-radius: 18px;
  padding: 8px 12px; font-weight: 800; box-shadow: var(--shadow); white-space: nowrap;
}
.toast .btn { font-size: 16px; padding: 6px 14px; }
.slide-enter-active, .slide-leave-active { transition: all 0.25s; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translate(-50%, 30px); }
</style>
