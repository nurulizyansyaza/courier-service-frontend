import { SessionProvider, useSession } from './sessionStore';
import { TerminalApp } from './components/TerminalApp';
import { AuthScreen } from './components/AuthScreen';
import { EmailSetupScreen } from './components/EmailSetupScreen';

function AppContent() {
  const { session } = useSession();

  if (!session.currentUser) {
    return <AuthScreen />;
  }

  // Guest users and admin skip email requirement
  const isGuest = session.currentUser.role === 'guest';
  const isActingAsVendor = session.originalAdmin !== null;

  if (!isGuest && !isActingAsVendor) {
    const currentUserData = session.users.find(
      u => u.username.toLowerCase() === session.currentUser!.username.toLowerCase()
    );
    if (!currentUserData?.email) {
      return <EmailSetupScreen onComplete={() => {}} />;
    }
  }

  return <TerminalApp />;
}

export default function App() {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-[#0d0118]">
        <AppContent />
      </div>
    </SessionProvider>
  );
}
