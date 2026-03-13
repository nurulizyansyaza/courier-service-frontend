import { useRef, useState, useEffect } from 'react';
import { Terminal } from 'lucide-react';
import { useSession } from '../sessionStore';
import type { HistoryLine } from '../../core/types';

export function EmailSetupScreen({ onComplete }: { onComplete: () => void }) {
  const { session, updateEmail } = useSession();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<HistoryLine[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const username = session.currentUser?.username || 'user';

  useEffect(() => {
    setHistory([
      { type: 'system', text: '# ─────────────────────────────────────' },
      { type: 'system', text: '#  Email Setup Required' },
      { type: 'system', text: '# ─────────────────────────────────────' },
      { type: 'system', text: '#' },
      { type: 'system', text: `#  Welcome, ${username}!` },
      { type: 'system', text: '#  An email address is required to' },
      { type: 'system', text: '#  access the terminal application.' },
      { type: 'system', text: '#' },
      { type: 'system', text: '#  Type your email address below:' },
      { type: 'system', text: '#    e.g. user@example.com' },
      { type: 'system', text: '#' },
      { type: 'system', text: '# ─────────────────────────────────────' },
    ]);
  }, [username]);

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

    pushLines({ type: 'input', text: trimmed });
    setInput('');

    // Validate email
    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      pushLines(
        { type: 'error', text: 'Invalid email format. Must contain @ and .' },
        { type: 'output', text: 'Please enter a valid email address.' },
      );
      return;
    }

    // Check for obvious invalid patterns
    if (trimmed.startsWith('@') || trimmed.endsWith('@') || trimmed.endsWith('.')) {
      pushLines(
        { type: 'error', text: 'Invalid email format.' },
        { type: 'output', text: 'Please enter a valid email address.' },
      );
      return;
    }

    setIsProcessing(true);
    pushLines({ type: 'output', text: `Setting email to ${trimmed}...` });
    await new Promise(r => setTimeout(r, 400));

    const result = updateEmail(trimmed);
    if (!result.success) {
      pushLines({ type: 'error', text: result.error || 'Failed to set email' });
      setIsProcessing(false);
      return;
    }

    pushLines({ type: 'success', text: `Email set successfully. Launching terminal...` });
    await new Promise(r => setTimeout(r, 500));
    onComplete();
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
            <span className="text-xs text-zinc-500 font-mono">Courier Service App — email setup</span>
          </div>
          <div className="w-[54px]" />
        </div>

        {/* Terminal Body */}
        <div
          className="bg-[#0d0118] border-x border-b border-[#2d1b4e] rounded-b-xl font-mono text-sm cursor-text"
          onClick={focusInput}
        >
          <div
            ref={scrollRef}
            className="p-4 sm:p-6 overflow-auto"
            style={{ maxHeight: '70vh' }}
          >
            {history.map((line, i) => (
              <div key={i} className="leading-relaxed">
                {line.type === 'input' ? (
                  <span>
                    <span className="text-pink-400">{'>'} </span>
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
              <span className="text-pink-400 shrink-0">{'>'} </span>
              <input
                ref={inputRef}
                type="email"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isProcessing}
                className="ml-2 flex-1 bg-transparent border-none outline-none text-zinc-100 font-mono text-sm placeholder:text-zinc-700 disabled:opacity-50 caret-pink-400"
                placeholder={isProcessing ? '' : 'your@email.com'}
                autoComplete="email"
                spellCheck={false}
              />
              {isProcessing && (
                <span className="text-pink-400/50 animate-pulse text-xs ml-2">saving...</span>
              )}
            </div>
          </div>

          {/* Mobile submit button */}
          <div className="xl:hidden px-4 pb-4 sm:px-6 sm:pb-6 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={isProcessing || !input.trim()}
              className="px-4 py-1.5 text-sm rounded bg-pink-500/20 text-pink-400 border border-pink-500/30 hover:bg-pink-500/30 transition-colors disabled:opacity-30 font-mono"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
