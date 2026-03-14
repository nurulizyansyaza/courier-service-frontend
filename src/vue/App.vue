<script setup lang="ts">
import { computed } from 'vue';
import { provideSession } from './sessionStore';
import AuthScreen from './components/AuthScreen.vue';
import EmailSetupScreen from './components/EmailSetupScreen.vue';
import TerminalApp from './components/TerminalApp.vue';

const { session, isActingAsVendor } = provideSession();

const currentView = computed(() => {
  if (!session.currentUser) return 'auth';
  if (session.currentUser.role === 'guest' || isActingAsVendor()) return 'terminal';
  const user = session.users.find((u) => u.username.toLowerCase() === session.currentUser!.username.toLowerCase());
  if (user && !user.email) return 'email';
  return 'terminal';
});

const handleEmailComplete = () => {
  // Session already updated by updateEmail, view recalculates automatically
};
</script>

<template>
  <div class="min-h-screen bg-[#0d0118]">
    <AuthScreen v-if="currentView === 'auth'" />
    <EmailSetupScreen v-else-if="currentView === 'email'" @complete="handleEmailComplete" />
    <TerminalApp v-else />
  </div>
</template>
