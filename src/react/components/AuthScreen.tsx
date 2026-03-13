import { useRef, useState, useEffect } from 'react';
import { Terminal } from 'lucide-react';
import { useSession } from '../sessionStore';
import type { HistoryLine } from '../../core/types';
import { WELCOME_LINES } from '../../core/constants';

export function AuthScreen() {
  const { login, register, loginAsGuest } = useSession();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<HistoryLine[]>([...WELCOME_LINES]);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const pushLines = (...lines: HistoryLine[]) => {
    setHistory(prev => [...prev, ...lines]);
  };

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed || isProcessing) return;

    // Echo user input
    pushLines({ type: 'input', text: trimmed });
    setInput('');

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();

    // ── clear ──
    if (cmd === 'clear') {
      setHistory([
        { type: 'system', text: '# Terminal cleared.' },
        { type: 'system', text: '# Commands: login <user> <pass> | guest | register <user> <pass> | clear' },
      ]);
      return;
    }

    // ── guest ──
    if (cmd === 'guest') {
      setIsProcessing(true);
      pushLines({ type: 'output', text: 'Authenticating as guest...' });
      await new Promise(r => setTimeout(r, 400));
      pushLines({ type: 'success', text: 'Access granted. Redirecting...' });
      await new Promise(r => setTimeout(r, 350));
      loginAsGuest();
      return;
    }

    // ── login ──
    if (cmd === 'login') {
      const [, username, password] = parts;
      if (!username || !password) {
        pushLines({ type: 'error', text: 'Usage: login <username> <password>' });
        return;
      }
      setIsProcessing(true);
      pushLines({ type: 'output', text: `Authenticating ${username}...` });
      await new Promise(r => setTimeout(r, 500));
      const result = login(username, password);
      if (!result.success) {
        pushLines({ type: 'error', text: result.error || 'Login failed' });
        setIsProcessing(false);
      } else {
        pushLines({ type: 'success', text: `Access granted. Welcome, ${username}.` });
        // Session state change will unmount this component
      }
      return;
    }

    // ── register (vendor only) ──
    if (cmd === 'register') {
      const [, username, password] = parts;
      if (!username || !password) {
        pushLines(
          { type: 'error', text: 'Usage: register <username> <password>' },
          { type: 'output', text: 'Creates a vendor account.' },
        );
        return;
      }
      // Reject if they try to pass a role
      if (parts.length > 3) {
        pushLines(
          { type: 'error', text: 'Register only creates vendor accounts. No role parameter needed.' },
          { type: 'output', text: 'Usage: register <username> <password>' },
        );
        return;
      }
      setIsProcessing(true);
      pushLines({ type: 'output', text: `Creating vendor account "${username}"...` });
      await new Promise(r => setTimeout(r, 400));

      const regResult = register(username, password);
      if (!regResult.success) {
        pushLines({ type: 'error', text: regResult.error || 'Registration failed' });
        setIsProcessing(false);
        return;
      }

      pushLines({ type: 'success', text: `Vendor account created. Welcome, ${username}.` });
      // register auto-logs in via setSession, component will unmount
      return;
    }

    // ── unknown ──
    pushLines(
      { type: 'error', text: `Unknown command: "${cmd}"` },
      { type: 'output', text: 'Commands: login <user> <pass> | guest | register <user> <pass> | clear' },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-[#0d0118] flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-xl">
        {/* Terminal Chrome */}
        <div className="bg-[#1a0b2e] border border-[#2d1b4e] rounded-t-xl px-4 py-3 flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-amber-500/60" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
          </div>
          <div className="flex-1 flex items-center justify-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-500 font-mono">Courier Service App</span>
          </div>
          <div className="w-[54px]" /> {/* Spacer to center title */}
        </div>

        {/* Terminal Body */}
        <div
          className="bg-[#0d0118] border-x border-b border-[#2d1b4e] rounded-b-xl font-mono text-sm cursor-text"
          onClick={focusInput}
        >
          {/* Scrollable history */}
          <div
            ref={scrollRef}
            className="p-4 sm:p-6 overflow-auto"
            style={{ maxHeight: '70vh' }}
          >
            {/* History lines */}
            {history.map((line, i) => (
              <div key={i} className="leading-relaxed">
                {line.type === 'input' ? (
                  <span>
                    <span className="text-pink-400">$ </span>
                    <span className="text-zinc-100">{line.text}</span>
                  </span>
                ) : line.type === 'error' ? (
                  <span className="text-red-400">  {line.text}</span>
                ) : line.type === 'success' ? (
                  <span className="text-emerald-400">  {line.text}</span>
                ) : line.type === 'output' ? (
                  <span className="text-cyan-400/80">  {line.text}</span>
                ) : (
                  <span className="text-zinc-600">{line.text}</span>
                )}
              </div>
            ))}

            {/* Active input line */}
            <div className="flex items-center gap-0 mt-1">
              <span className="text-pink-400 shrink-0">$ </span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isProcessing}
                className="ml-2 flex-1 bg-transparent border-none outline-none text-zinc-100 font-mono text-sm placeholder:text-zinc-700 disabled:opacity-50 caret-pink-400"
                placeholder={isProcessing ? '' : 'type a command...'}
                autoComplete="off"
                spellCheck={false}
              />
              {isProcessing && (
                <span className="text-pink-400/50 animate-pulse text-xs ml-2">processing...</span>
              )}
            </div>
          </div>

          {/* Mobile Run button */}
          <div className="xl:hidden px-4 pb-4 sm:px-6 sm:pb-6 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={isProcessing || !input.trim()}
              className="px-4 py-1.5 text-sm rounded bg-pink-500/20 text-pink-400 border border-pink-500/30 hover:bg-pink-500/30 transition-colors disabled:opacity-30 font-mono"
            >
              Run
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
