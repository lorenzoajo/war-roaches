<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import '@fontsource/luckiest-guy/400.css'
import '@fontsource/baloo-2/600.css'
import '@fontsource/baloo-2/800.css'
import './ui/theme.css'
import MainMenu from './ui/MainMenu.vue'
import MatchSetup from './ui/MatchSetup.vue'
import GameScreen from './ui/GameScreen.vue'
import RotatePrompt from './ui/RotatePrompt.vue'
import UpdateToast from './ui/UpdateToast.vue'
import { store } from './ui/store'

const dev = import.meta.env.DEV ? new URLSearchParams(location.search).get('dev') : null
const DevMap = defineAsyncComponent(() => import('./dev/DevMap.vue'))
</script>

<template>
  <DevMap v-if="dev === 'map'" />
  <template v-else>
    <MainMenu v-if="store.screen === 'menu'" />
    <MatchSetup v-else-if="store.screen === 'setup'" />
    <GameScreen v-else :key="store.matchKey" />
    <RotatePrompt />
    <UpdateToast />
  </template>
</template>
