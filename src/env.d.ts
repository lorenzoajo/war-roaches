/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/vue" />
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface Window {
  __wr?: { game: import('./game/core/game').Game; view: import('./game/render/gameView').GameView }
}
