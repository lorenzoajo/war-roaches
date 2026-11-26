<script setup lang="ts">
const props = withDefaults(defineProps<{ color?: string; size?: number; bounce?: boolean }>(), { color: '#ff4d5e', size: 120, bounce: true })
</script>

<template>
  <svg :width="props.size" :height="props.size" viewBox="0 0 120 120" :class="{ bounce: props.bounce }" aria-hidden="true">
    <path d="M52 34 Q40 10 28 14" stroke="#5a3a1e" stroke-width="4" fill="none" stroke-linecap="round" class="ant-l" />
    <path d="M70 34 Q84 10 96 14" stroke="#5a3a1e" stroke-width="4" fill="none" stroke-linecap="round" class="ant-r" />
    <g stroke="#5a3a1e" stroke-width="4" stroke-linecap="round">
      <path d="M38 96 l-8 14" /><path d="M58 100 l0 14" /><path d="M80 96 l8 14" />
    </g>
    <ellipse cx="60" cy="78" rx="40" ry="28" :fill="props.color" stroke="#2a1a2e" stroke-width="3" />
    <ellipse cx="46" cy="68" rx="14" ry="9" fill="#fff" opacity=".45" />
    <circle cx="60" cy="46" r="24" fill="#f3d9b1" stroke="#8a5a3a" stroke-width="3" />
    <rect x="37" y="32" width="46" height="8" :fill="props.color" />
    <circle cx="51" cy="47" r="9" fill="#fff" stroke="#2a1a2e" stroke-width="2" />
    <circle cx="70" cy="47" r="9" fill="#fff" stroke="#2a1a2e" stroke-width="2" />
    <circle cx="53" cy="49" r="4.5" fill="#2a1a2e" class="pupil" />
    <circle cx="72" cy="49" r="4.5" fill="#2a1a2e" class="pupil" />
    <path d="M52 59 Q60 65 68 59" stroke="#2a1a2e" stroke-width="2.5" fill="none" stroke-linecap="round" />
  </svg>
</template>

<style scoped>
.bounce { animation: bob 1.4s ease-in-out infinite; }
.ant-l, .ant-r { transform-origin: 60px 34px; animation: sway 2s ease-in-out infinite; }
.ant-r { animation-delay: -1s; }
@keyframes bob { 50% { transform: translateY(-6px) rotate(-3deg); } }
@keyframes sway { 50% { transform: rotate(6deg); } }
</style>
