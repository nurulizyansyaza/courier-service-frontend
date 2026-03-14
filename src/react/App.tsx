import { SessionProvider } from './sessionStore';
import { TerminalApp } from './components/TerminalApp';

export default function App() {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-[#0d0118]">
        <TerminalApp />
      </div>
    </SessionProvider>
  );
}
