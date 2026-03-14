<script lang="ts">
  import { createSession, useSession } from './sessionStore.svelte';
  import AuthScreen from './components/AuthScreen.svelte';
  import EmailSetupScreen from './components/EmailSetupScreen.svelte';
  import TerminalApp from './components/TerminalApp.svelte';

  createSession();

  const { session, isActingAsVendor } = useSession();

  const currentView = $derived(() => {
    if (!session.currentUser) return 'auth';
    if (session.currentUser.role === 'guest' || isActingAsVendor()) return 'terminal';
    const user = session.users.find((u) => u.username === session.currentUser?.username);
    if (user && !user.email) return 'email';
    return 'terminal';
  });
</script>

<div class="min-h-screen bg-[#0d0118]">
  {#if currentView() === 'auth'}
    <AuthScreen />
  {:else if currentView() === 'email'}
    <EmailSetupScreen oncomplete={() => {}} />
  {:else}
    <TerminalApp />
  {/if}
</div>
