<script setup lang="ts">
import { provideSession } from './sessionStore';
import TerminalApp from './components/TerminalApp.vue';

provideSession();
</script>

<template>
  <div class="min-h-screen bg-[#0d0118]">
    <TerminalApp />
  </div>
</template>
