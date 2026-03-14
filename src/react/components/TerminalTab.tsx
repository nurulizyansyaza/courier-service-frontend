import {
  useRef,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  Terminal,
  ChevronDown,
  ChevronRight,
  Package,
  Loader2,
} from "lucide-react";
import type { TabData, TransitPackage, ParsedResult } from "../../core/types";
import {
  calculateDeliveryCost,
  calculateDeliveryTimeWithTransit,
  parseOutput,
  setOffers,
} from "../../core/calculations";
import { useSession } from "../sessionStore";

interface TerminalTabProps {
  tab: TabData;
  onUpdate: (updates: Partial<TabData>) => void;
}

// History entry for the terminal
interface HistoryEntry {
  type:
    | "input"
    | "output"
    | "result"
    | "command"
    | "error"
    | "info"
    | "clear"
    | "welcome";
  content: string;
  parsedResults?: ParsedResult[];
  calculationType?: "cost" | "time";
  timestamp?: number;
}

export function TerminalTab({
  tab,
  onUpdate,
}: TerminalTabProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const clearMarkerRef = useRef<HTMLDivElement>(null);
  const { session, getOffersForCalculation } = useSession();
  const [currentInput, setCurrentInput] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [framework, setFramework] = useState<"react" | "vue" | "svelte">("react");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isConnected, setIsConnected] = useState(true);

  // Auto-scroll to bottom only when shouldAutoScroll is true
  useEffect(() => {
    if (scrollAreaRef.current && shouldAutoScroll) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [history, shouldAutoScroll]);

  // Detect if user is scrolling manually
  const handleScroll = () => {
    if (scrollAreaRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setShouldAutoScroll(isAtBottom);
    }
  };

  // Sync session offers into calculation engine
  const syncOffers = useCallback(() => {
    setOffers(getOffersForCalculation());
  }, [getOffersForCalculation]);

  const addToHistory = (entry: HistoryEntry) => {
    setHistory((prev) => [...prev, { ...entry, timestamp: Date.now() }]);
  };

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    const lower = trimmed.toLowerCase();

    // Handle /connect command
    if (lower === "/connect") {
      if (!isConnected) {
        setIsConnected(true);
        setHistory([]);
        setShowWelcome(true);
        addToHistory({ type: "info", content: "✓ Connected to Courier CLI" });
        return true;
      } else {
        addToHistory({ type: "error", content: "✗ Already connected" });
        return true;
      }
    }

    if (!isConnected) {
      addToHistory({ type: "error", content: "✗ CLI not connected. Type /connect to reconnect." });
      return true;
    }

    // Handle /change commands
    if (lower.startsWith("/change ")) {
      const parts = trimmed.substring(8).trim().split(" ");

      if (parts[0] === "use" && parts[1]) {
        const targetFramework = parts[1].toLowerCase();
        if (targetFramework === "react" || targetFramework === "vue" || targetFramework === "svelte") {
          setFramework(targetFramework as any);
          addToHistory({ type: "info", content: `✓ Framework switched to ${targetFramework.charAt(0).toUpperCase() + targetFramework.slice(1)}.js` });
          return true;
        } else {
          addToHistory({ type: "error", content: `✗ Unknown framework "${parts[1]}". Available: react, vue, svelte` });
          return true;
        }
      }

      if (parts[0] === "mode" && parts[1]) {
        const targetMode = parts[1].toLowerCase();
        if (targetMode === "cost" || targetMode === "time") {
          onUpdate({ calculationType: targetMode as any });
          addToHistory({ type: "info", content: `✓ Mode switched to ${targetMode === "cost" ? "Delivery Cost" : "Delivery Time Estimation"}` });
          return true;
        } else {
          addToHistory({ type: "error", content: `✗ Unknown mode "${parts[1]}". Available: cost, time` });
          return true;
        }
      }

      addToHistory({ type: "error", content: `✗ Invalid /change command. Try: /change use react | /change mode cost` });
      return true;
    }

    // Handle clear command
    if (lower === "clear") {
      addToHistory({ type: "clear", content: cmd });
      setTimeout(() => {
        if (scrollAreaRef.current && clearMarkerRef.current) {
          clearMarkerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 50);
      return true;
    }

    // Handle restart command
    if (lower === "/restart") {
      addToHistory({ type: "welcome", content: "restart" });
      return true;
    }

    // Handle exit command
    if (lower === "exit") {
      setIsConnected(false);
      setHistory([]);
      setShowWelcome(false);
      onUpdate({ input: "", output: "", error: "", hasExecuted: false, executionTransitSnapshot: [], renamedPackages: [] });
      return true;
    }

    return false;
  };

  const handleExecute = () => {
    if (!currentInput.trim()) return;
    const input = currentInput.trim();

    if (handleCommand(input)) {
      setCurrentInput("");
      setTimeout(() => { if (inputRef.current) inputRef.current.style.height = 'auto'; }, 0);
      return;
    }

    addToHistory({ type: "input", content: input });
    setIsGenerating(true);
    setShowWelcome(false);

    setTimeout(() => {
      try {
        syncOffers();
        if (tab.calculationType === "cost") {
          const result = calculateDeliveryCost(input);
          const parsedResults = parseOutput(result, "cost", input, []);
          addToHistory({ type: "output", content: result });
          addToHistory({ type: "result", content: "", parsedResults, calculationType: "cost" });
          onUpdate({ output: result, error: "", hasExecuted: true });
        } else {
          const transitResult = calculateDeliveryTimeWithTransit(input, tab.transitPackages);
          const updatedTransit = [...transitResult.stillInTransit, ...transitResult.newTransitPackages];
          const parsedResults = parseOutput(transitResult.output, "time", input, tab.transitPackages);
          addToHistory({ type: "output", content: transitResult.output });
          addToHistory({ type: "result", content: "", parsedResults, calculationType: "time" });
          onUpdate({
            output: transitResult.output, error: "", hasExecuted: true,
            transitPackages: updatedTransit,
            executionTransitSnapshot: [...tab.transitPackages],
            renamedPackages: transitResult.renamedPackages,
          });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Invalid input";
        addToHistory({ type: "error", content: errorMsg });
        onUpdate({ output: "", error: errorMsg, hasExecuted: true });
      }
      setIsGenerating(false);
      setCurrentInput("");
      setTimeout(() => { if (inputRef.current) inputRef.current.style.height = 'auto'; }, 0);
    }, 350);
  };

  const transitCount = tab.transitPackages.length;
  const frameworkColors = {
    react: "text-cyan-400",
    vue: "text-emerald-400",
    svelte: "text-orange-400",
  };
  const lastClearIndex = (() => { for (let i = history.length - 1; i >= 0; i--) { if (history[i].type === "clear") return i; } return -1; })();

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#0d0118]">
      {/* Main terminal area with scrollable history */}
      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto scrollbar-pink p-4 sm:p-6 font-mono text-sm"
        onScroll={handleScroll}
      >
        {/* Welcome screen */}
        {showWelcome && (
          <div className="mb-4 sm:mb-6">
            <div className="text-xs sm:text-sm text-zinc-400 space-y-1 mb-3 sm:mb-4">
              <div className="text-pink-400 font-semibold text-sm sm:text-base md:text-lg">Welcome to Courier CLI!</div>
              <div className="text-zinc-500 text-xs sm:text-sm">Calculate delivery costs and optimize delivery times with real time package tracking</div>
            </div>

            <div className="mb-3 sm:mb-4">
              <div className="flex flex-col">
                <pre className="text-pink-300/80 text-[6px] sm:text-xs md:text-sm select-none leading-tight overflow-x-auto">
{`
                            ___
                          /~   ~\\
                         |_      |
                         |/     __-__
                          \\   /~     ~~-_
                           ~~ -~~\\       ~\\
                            /     |        \\
               ,           /     /          \\
             //   _ _---~~~    //-_          \\               
           /  (/~~ )    _____/-__  ~-_       _-\\             _________
         /  _-~\\\\0) ~~~~         ~~-_ \\__--~~   \`\\  ___---~~~        /'
        /_-~                       _-/'          )~/               /'
        (___________/           _-~/'         _-~~/             _-~
     _ ----- _~-_\\\\\\\\        _-~ /'      __--~   (_ ______---~~~--_
  _-~         ~-_~\\\\\\\\      (   (     -_~          ~-_  |          ~-_
 /~~~~\\          \\ \\~~       ~-_ ~-_    ~\\            ~~--__-----_    \\
;    / \\ ______-----\\           ~-__~-~~~~~~--_             ~~--_ \\    .
|   | \\((*)~~~~~~~~~~|      __--~~             ~-_               ) |   |
|    \\  |~|~---------)__--~~                      \\_____________/ /    ,
 \\    ~-----~    /  /~                             )  \\    ~-----~    /
  ~-_         _-~ /_______________________________/    \`-_         _-~
     ~ ----- ~                                            ~ ----- ~`}
                </pre>
                <pre className="text-pink-300/80 text-[8px] sm:text-[10px] md:text-lg xl:text-xl select-none leading-tight overflow-x-auto">
{`
 ██████╗ ██████╗ ██╗   ██╗██████╗ ██╗███████╗██████╗ 
██╔════╝██╔═══██╗██║   ██║██╔══██╗██║██╔════╝██╔══██╗
██║     ██║   ██║██║   ██║██████╔╝██║█████╗  ██████╔╝
██║     ██║   ██║██║   ██║██╔══██╗██║██╔══╝  ██╔══██╗
╚██████╗╚██████╔╝╚██████╔╝██║  ██║██║███████╗██║  ██║
 ╚═════╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝╚══════╝╚═╝  ╚═╝
              CLI Version 1.0.0
`}
                </pre>
              </div>
            </div>

            <div className="flex gap-1 text-zinc-600 text-[9px] sm:text-[10px] mb-3 sm:mb-4">
              <span className="text-emerald-400">●</span>
              <span>Connected to Courier Service</span>
            </div>

            {/* Available Offers */}
            <div className="text-zinc-600 text-xs mb-3 sm:mb-4">
              <div className="text-cyan-400/80 mb-1.5 sm:mb-2 text-xs sm:text-sm">Available Offer Codes:</div>
              <div className="text-zinc-700 text-[9px] sm:text-[10px]">─────────────────────────────────────────</div>
              <div className="text-zinc-500 font-mono text-[9px] sm:text-[10px] md:text-xs">Code | Distance (km) | Weight (kg)</div>
              <div className="text-zinc-700 text-[9px] sm:text-[10px]">─────────────────────────────────────────</div>
              {session.offers.map((o) => {
                const dist = o.minDistance === 0 ? `< ${o.maxDistance}` : `${o.minDistance} - ${o.maxDistance}`;
                return (
                  <div key={o.code} className="text-zinc-500 font-mono text-[9px] sm:text-[10px] md:text-xs">
                    {`${o.code.padEnd(8)}| ${dist.padEnd(13)} | ${o.minWeight} - ${o.maxWeight}`}
                  </div>
                );
              })}
              <div className="text-zinc-700 text-[9px] sm:text-[10px]">─────────────────────────────────────────</div>
            </div>

            <div className="border-t border-[#2d1b4e]/30 my-3 sm:my-4"></div>

            {/* Input format help */}
            <div className="text-zinc-600 text-xs mb-3 sm:mb-4">
              <div className="text-pink-400/70 mb-1 text-xs sm:text-sm">Input Format:</div>
              <div className="font-mono text-[9px] sm:text-[10px] md:text-xs pl-1.5 sm:pl-2 space-y-0.5">
                <div>Line 1: <span className="text-zinc-500">base_delivery_cost no_of_packages</span></div>
                <div>Line 2+: <span className="text-zinc-500">pkg_id weight_kg distance_km offer_code</span></div>
                {tab.calculationType === "time" && (
                  <div>Last line: <span className="text-zinc-500">no_of_vehicles max_speed max_weight</span></div>
                )}
              </div>
            </div>

            <div className="border-t border-[#2d1b4e]/30 my-3 sm:my-4"></div>

            {/* Commands help */}
            <div className="text-zinc-600 text-xs mb-3 sm:mb-4">
              <div className="text-cyan-400/70 mb-1 text-xs sm:text-sm">Available Commands:</div>
              <div className="font-mono text-[9px] sm:text-[10px] md:text-xs pl-1.5 sm:pl-2 space-y-0.5">
                <div><span className="text-emerald-400">/change use</span> <span className="text-zinc-500">react | vue | svelte</span> - Switch framework</div>
                <div><span className="text-emerald-400">/change mode</span> <span className="text-zinc-500">cost | time</span> - Switch calculation mode</div>
                <div><span className="text-amber-400">clear</span> - Clear screen (scroll up to see history)</div>
                <div><span className="text-cyan-400">/restart</span> - Show welcome screen again</div>
                <div><span className="text-red-400">exit</span> - Exit and reset terminal</div>
                <div><span className="text-emerald-400">/connect</span> - Reconnect after exit</div>
              </div>
            </div>

            <div className="border-t border-[#2d1b4e]/30 my-3 sm:my-4"></div>
          </div>
        )}

        {/* History entries */}
        {history.map((entry, idx) => (
          <div key={idx} className="mb-3">
            {entry.type === "input" && (
              <div className="flex gap-2">
                <span className="text-pink-400 select-none">❯</span>
                <div className="text-zinc-300 whitespace-pre-wrap break-all">{entry.content}</div>
              </div>
            )}

            {entry.type === "output" && (
              <div className="ml-4 text-emerald-400 whitespace-pre-wrap text-xs">{entry.content}</div>
            )}

            {entry.type === "result" && entry.parsedResults && (
              <div className="ml-4 space-y-3 mt-2">
                {entry.parsedResults
                  .sort((a, b) => {
                    if (entry.calculationType !== "time") return 0;
                    if (a.undeliverable && !b.undeliverable) return 1;
                    if (!a.undeliverable && b.undeliverable) return -1;
                    const roundA = a.deliveryRound ?? Infinity;
                    const roundB = b.deliveryRound ?? Infinity;
                    if (roundA !== roundB) return roundA - roundB;
                    return (b.weight ?? 0) - (a.weight ?? 0);
                  })
                  .map((result, i) => (
                    <ResultCard key={i} result={result} calculationType={entry.calculationType!} />
                  ))}
              </div>
            )}

            {entry.type === "command" && (
              <div className="text-cyan-400 text-xs">{entry.content}</div>
            )}

            {entry.type === "error" && (
              <div className="ml-4 text-red-400 text-xs">{entry.content}</div>
            )}

            {entry.type === "info" && (
              <div className="ml-4 text-cyan-400 text-xs">{entry.content}</div>
            )}

            {entry.type === "clear" && (
              <div ref={idx === lastClearIndex ? clearMarkerRef : null}>
                <div className="flex gap-2">
                  <span className="text-pink-400 select-none">❯</span>
                  <div className="text-zinc-300 whitespace-pre-wrap break-all">{entry.content}</div>
                </div>
                {idx === lastClearIndex && idx >= history.length - 1 && (
                  <div style={{ height: 'calc(100vh - 260px)' }}></div>
                )}
              </div>
            )}

            {entry.type === "welcome" && (
              <WelcomeScreen tab={tab} session={session} />
            )}
          </div>
        ))}

        {/* Generating indicator */}
        {isGenerating && (
          <div className="flex items-center gap-2 text-pink-400 text-xs">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="animate-pulse">Calculating...</span>
          </div>
        )}

        {/* Disconnected state */}
        {!isConnected && (
          <div>
            <div className="mb-3 sm:mb-4">
              <div className="flex flex-col justify-center">
                <pre className="text-pink-300/80 text-[6px] sm:text-xs md:text-sm select-none leading-tight overflow-x-auto">
{`
                            ___
                          /~   ~\\
                         |_      |
                         |/     __-__
                          \\   /~     ~~-_
                           ~~ -~~\\       ~\\
                            /     |        \\
               ,           /     /          \\
             //   _ _---~~~    //-_          \\               
           /  (/~~ )    _____/-__  ~-_       _-\\             _________
         /  _-~\\\\0) ~~~~         ~~-_ \\__--~~   \`\\  ___---~~~        /'
        /_-~                       _-/'          )~/               /'
        (___________/           _-~/'         _-~~/             _-~
     _ ----- _~-_\\\\\\\\        _-~ /'      __--~   (_ ______---~~~--_
  _-~         ~-_~\\\\\\\\      (   (     -_~          ~-_  |          ~-_
 /~~~~\\          \\ \\~~       ~-_ ~-_    ~\\            ~~--__-----_    \\
;    / \\ ______-----\\           ~-__~-~~~~~~--_             ~~--_ \\    .
|   | \\((*)~~~~~~~~~~|      __--~~             ~-_               ) |   |
|    \\  |~|~---------)__--~~                      \\_____________/ /    ,
 \\    ~-----~    /  /~                             )  \\    ~-----~    /
  ~-_         _-~ /_______________________________/    \`-_         _-~
     ~ ----- ~                                            ~ ----- ~`}
                </pre>
                <pre className="text-pink-300/80 text-[8px] sm:text-[10px] md:text-lg xl:text-xl select-none leading-tight overflow-x-auto">
{`
 ██████╗ ██████╗ ██╗   ██╗██████╗ ██╗███████╗██████╗ 
██╔════╝██╔═══██╗██║   ██║██╔══██╗██║██╔════╝██╔══██╗
██║     ██║   ██║██║   ██║██████╔╝██║█████╗  ██████╔╝
██║     ██║   ██║██║   ██║██╔══██╗██║██╔══╝  ██╔══██╗
╚██████╗╚██████╔╝╚██████╔╝██║  ██║██║███████╗██║  ██║
 ╚═════╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝╚══════╝╚═╝  ╚═╝
              CLI Version 1.0.0
`}
                </pre>
              </div>
            </div>

            <div className="flex gap-1 items-center text-zinc-600 text-[9px] sm:text-[10px] mb-3 sm:mb-4">
              <span className="text-red-400">●</span>
              <span>Disconnected from Courier Service</span>
            </div>

            <div className="text-zinc-400 text-sm mb-2 mt-8">Terminal Disconnected</div>
            <div className="text-zinc-600 text-xs mb-4">The CLI connection has been closed</div>
            <div className="text-pink-400/70 text-xs font-mono">
              Type <span className="text-cyan-400">/connect</span> to reconnect
            </div>
          </div>
        )}

        {/* Transit packages indicator */}
        {transitCount > 0 && (
          <div className="mt-4 mb-2">
            <div className="flex items-center gap-2 text-amber-400 text-xs mb-2">
              <Package className="w-3.5 h-3.5" />
              <span>Packages in transit: {transitCount}</span>
            </div>
            <div className="ml-6 space-y-1">
              {tab.transitPackages.map((tp, index) => (
                <div key={`${tp.id}-${index}`} className="text-xs text-zinc-500 font-mono">
                  {tp.id} - {tp.weight}kg, {tp.distance}km, {tp.offerCode}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input area - fixed at bottom */}
      <div className="shrink-0 border-t border-[#2d1b4e] bg-[#0d0118] p-3 sm:p-4">
        {/* Status bar */}
        {isConnected && (
          <div className="flex items-center gap-4 text-[10px] text-zinc-600 mb-2 flex-wrap">
            <span>Mode: <span className="text-pink-400">{tab.calculationType === "cost" ? "Cost" : "Time"}</span></span>
            <span>Framework: <span className={frameworkColors[framework]}>{framework}</span></span>
            {transitCount > 0 && (
              <span>Transit: <span className="text-amber-400">{transitCount}</span></span>
            )}
          </div>
        )}

        {/* Disconnected status bar */}
        {!isConnected && (
          <div className="flex items-center gap-2 text-[10px] text-zinc-600 mb-2">
            <span className="text-red-400">●</span>
            <span className="text-zinc-500">CLI not connected</span>
          </div>
        )}

        {/* Input line */}
        <div className="flex gap-2">
          <span className="text-pink-400 select-none">❯</span>
          <textarea
            ref={inputRef}
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleExecute();
              }
            }}
            placeholder={isConnected ? "Enter input or type a command..." : "Type /connect to reconnect..."}
            className="flex-1 bg-transparent border-none outline-none text-zinc-100 placeholder:text-zinc-700 font-mono text-sm resize-none max-h-40 overflow-y-auto leading-tight pt-1"
            spellCheck={false}
            autoFocus
            rows={1}
            style={{ height: 'auto', minHeight: '1.5rem' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 160) + 'px';
            }}
          />
        </div>

        {/* Hints */}
        <div className="mt-2 text-[10px] text-zinc-700">
          {isConnected
            ? "Press Enter to execute • Shift+Enter for new line • Type /change, clear, or exit"
            : "Type /connect and press Enter to reconnect"}
        </div>
      </div>
    </div>
  );
}

// ── Result Card Component ──────────────────────────────────────────────

function ResultCard({
  result,
  calculationType,
}: {
  result: ParsedResult;
  calculationType: "cost" | "time";
}) {
  const discount = parseFloat(result.discount);
  const deliveryCost = result.deliveryCost;
  const discountPercent = discount > 0 ? ((discount / deliveryCost) * 100).toFixed(0) : 0;

  return (
    <div className={`bg-[#1a0b2e]/40 border rounded-lg p-4 sm:p-5 space-y-3 ${result.undeliverable ? "border-amber-500/40" : "border-[#2d1b4e]"}`}>
      {/* In Transit badge + Undeliverable banner */}
      {result.undeliverable && result.undeliverableReason && (
        <div className="space-y-2">
          <div className="flex justify-end">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Package className="w-3 h-3" />
              In Transit
            </span>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2 text-xs font-mono text-amber-400">
            <span className="text-amber-500">&#x26A0;</span> {result.undeliverableReason}
          </div>
        </div>
      )}

      {/* Delivery Round & Vehicle (time mode only) */}
      {!result.undeliverable && result.deliveryRound !== undefined && result.vehicleId !== undefined && (
        <div className="space-y-1.5 pb-2 border-b border-[#2d1b4e]/50">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono">
            <span className="text-zinc-500">Packages Remaining: <span className="text-zinc-300">{result.packagesRemaining ?? 0}</span></span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono">
            <span className="text-purple-400/80">Delivery Round: <span className="text-purple-300">{result.deliveryRound}</span></span>
            <span className="text-zinc-600">|</span>
            <span className="text-cyan-400/80">Vehicle Available: <span className="text-cyan-300">Vehicle{result.vehicleId}</span></span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-500">Current Time: <span className="text-zinc-300">{(result.currentTime ?? 0).toFixed(2)} hrs</span></span>
          </div>
          <div className="text-xs font-mono text-amber-400/80 mt-1">
            {result.currentTime !== undefined && result.currentTime > 0 ? (
              <>Vehicle{result.vehicleId} will be available after {result.currentTime.toFixed(2)} + {(result.roundTripTime ?? 0).toFixed(2)} = <span className="text-amber-300">{(result.vehicleReturnTime ?? 0).toFixed(2)} hrs</span></>
            ) : (
              <>Vehicle{result.vehicleId} will be available after <span className="text-amber-300">{(result.vehicleReturnTime ?? 0).toFixed(2)} hrs</span></>
            )}
          </div>
        </div>
      )}

      {/* Title — package ID */}
      <div className="flex items-center gap-2 pb-2 border-b border-[#2d1b4e]/50">
        {result.renamedFrom ? (
          <>
            <span className="text-zinc-500 font-mono line-through">{result.renamedFrom}</span>
            <span className="text-pink-400 font-mono font-semibold">{result.id}</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-violet-500/20 text-violet-400 border border-violet-500/30">Notified</span>
          </>
        ) : (
          <span className="text-pink-400 font-mono font-semibold">{result.id}</span>
        )}
      </div>

      {/* Header */}
      <div className="text-sm text-zinc-300 space-y-1">
        <div><span className="text-zinc-500">Base delivery cost:</span> <span className="font-semibold">{result.baseCost}</span></div>
        <div><span className="text-zinc-500">Weight:</span> <span className="font-semibold">{result.weight}kg</span>{" | "}<span className="text-zinc-500">Distance:</span> <span className="font-semibold">{result.distance}km</span></div>
        <div><span className="text-zinc-500">Offer code:</span> <span className={`font-semibold ${result.offerApplied ? "text-emerald-400" : "text-zinc-600"}`}>{result.offerApplied || "N/A"}</span></div>
      </div>

      <div className="border-t border-[#2d1b4e]/50 pt-3 space-y-3">
        {/* Delivery Cost */}
        <div className="flex justify-between items-start text-sm">
          <div>
            <div className="text-zinc-400">Delivery Cost</div>
            <div className="text-xs text-zinc-600 font-mono mt-0.5">{result.baseCost} + ({result.weight} * 10) + ({result.distance} * 5)</div>
          </div>
          <div className="text-zinc-300 font-semibold font-mono">{deliveryCost.toFixed(2)}</div>
        </div>

        <div className="border-t border-[#2d1b4e]/30"></div>

        {/* Discount */}
        <div className="flex justify-between items-start text-sm">
          <div>
            <div className="text-zinc-400">Discount</div>
            <div className="text-xs text-zinc-600 mt-0.5">
              {discount > 0 ? `(${discountPercent}% of ${deliveryCost.toFixed(2)} i.e; Delivery Cost)` : "(Offer not applicable as criteria not met)"}
            </div>
          </div>
          <div className={`font-semibold font-mono ${discount > 0 ? "text-emerald-400" : "text-zinc-600"}`}>
            {discount > 0 ? "-" : ""}{discount.toFixed(2)}
          </div>
        </div>

        <div className="border-t border-[#2d1b4e]"></div>

        {/* Total Cost */}
        <div className="flex justify-between items-center">
          <div className="text-zinc-300 font-semibold">Total cost</div>
          <div className="text-pink-400 font-bold text-lg font-mono">{result.totalCost}</div>
        </div>

        {/* Delivery Time */}
        {result.deliveryTime !== undefined && (
          <>
            <div className="border-t border-[#2d1b4e]/30"></div>
            <div className="flex justify-between items-center text-sm">
              <div className="text-zinc-400">Delivery Time</div>
              <div className={`font-semibold font-mono ${result.undeliverable ? "text-amber-400" : "text-cyan-400"}`}>
                {result.undeliverable ? "N/A" : `${result.deliveryTime}hrs`}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Welcome Screen Component ─────────────────────────────────────────────

function WelcomeScreen({ tab, session }: { tab: TabData; session: any }) {
  return (
    <div className="mb-4 sm:mb-6">
      <div className="text-xs sm:text-sm text-zinc-400 space-y-1 mb-3 sm:mb-4">
        <div className="text-pink-400 font-semibold text-sm sm:text-base md:text-lg">Welcome to Courier CLI!</div>
        <div className="text-zinc-500 text-xs sm:text-sm">Calculate delivery costs and optimize delivery times with real time package tracking</div>
      </div>

      <div className="mb-3 sm:mb-4">
        <div className="flex flex-col">
          <pre className="text-pink-300/80 text-[6px] sm:text-xs md:text-sm select-none leading-tight overflow-x-auto">
{`
                            ___
                          /~   ~\\
                         |_      |
                         |/     __-__
                          \\   /~     ~~-_
                           ~~ -~~\\       ~\\
                            /     |        \\
               ,           /     /          \\
             //   _ _---~~~    //-_          \\               
           /  (/~~ )    _____/-__  ~-_       _-\\             _________
         /  _-~\\\\0) ~~~~         ~~-_ \\__--~~   \`\\  ___---~~~        /'
        /_-~                       _-/'          )~/               /'
        (___________/           _-~/'         _-~~/             _-~
     _ ----- _~-_\\\\\\\\        _-~ /'      __--~   (_ ______---~~~--_
  _-~         ~-_~\\\\\\\\      (   (     -_~          ~-_  |          ~-_
 /~~~~\\          \\ \\~~       ~-_ ~-_    ~\\            ~~--__-----_    \\
;    / \\ ______-----\\           ~-__~-~~~~~~--_             ~~--_ \\    .
|   | \\((*)~~~~~~~~~~|      __--~~             ~-_               ) |   |
|    \\  |~|~---------)__--~~                      \\_____________/ /    ,
 \\    ~-----~    /  /~                             )  \\    ~-----~    /
  ~-_         _-~ /_______________________________/    \`-_         _-~
     ~ ----- ~                                            ~ ----- ~`}
          </pre>
          <pre className="text-pink-300/80 text-[8px] sm:text-[10px] md:text-lg xl:text-xl select-none leading-tight overflow-x-auto">
{`
 ██████╗ ██████╗ ██╗   ██╗██████╗ ██╗███████╗██████╗ 
██╔════╝██╔═══██╗██║   ██║██╔══██╗██║██╔════╝██╔══██╗
██║     ██║   ██║██║   ██║██████╔╝██║█████╗  ██████╔╝
██║     ██║   ██║██║   ██║██╔══██╗██║██╔══╝  ██╔══██╗
╚██████╗╚██████╔╝╚██████╔╝██║  ██║██║███████╗██║  ██║
 ╚═════╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝╚══════╝╚═╝  ╚═╝
              CLI Version 1.0.0
`}
          </pre>
        </div>
      </div>

      <div className="flex gap-1 text-zinc-600 text-[9px] sm:text-[10px] mb-3 sm:mb-4">
        <span className="text-emerald-400">●</span>
        <span>Connected to Courier Service</span>
      </div>

      <div className="text-zinc-600 text-xs mb-3 sm:mb-4">
        <div className="text-cyan-400/80 mb-1.5 sm:mb-2 text-xs sm:text-sm">Available Offer Codes:</div>
        <div className="text-zinc-700 text-[9px] sm:text-[10px]">─────────────────────────────────────────</div>
        <div className="text-zinc-500 font-mono text-[9px] sm:text-[10px] md:text-xs">Code | Distance (km) | Weight (kg)</div>
        <div className="text-zinc-700 text-[9px] sm:text-[10px]">─────────────────────────────────────────</div>
        {session.offers.map((o: any) => {
          const dist = o.minDistance === 0 ? `< ${o.maxDistance}` : `${o.minDistance} - ${o.maxDistance}`;
          return (
            <div key={o.code} className="text-zinc-500 font-mono text-[9px] sm:text-[10px] md:text-xs">
              {`${o.code.padEnd(8)}| ${dist.padEnd(13)} | ${o.minWeight} - ${o.maxWeight}`}
            </div>
          );
        })}
        <div className="text-zinc-700 text-[9px] sm:text-[10px]">─────────────────────────────────────────</div>
      </div>

      <div className="border-t border-[#2d1b4e]/30 my-3 sm:my-4"></div>

      <div className="text-zinc-600 text-xs mb-3 sm:mb-4">
        <div className="text-pink-400/70 mb-1 text-xs sm:text-sm">Input Format:</div>
        <div className="font-mono text-[9px] sm:text-[10px] md:text-xs pl-1.5 sm:pl-2 space-y-0.5">
          <div>Line 1: <span className="text-zinc-500">base_delivery_cost no_of_packages</span></div>
          <div>Line 2+: <span className="text-zinc-500">pkg_id weight_kg distance_km offer_code</span></div>
          {tab.calculationType === "time" && (
            <div>Last line: <span className="text-zinc-500">no_of_vehicles max_speed max_weight</span></div>
          )}
        </div>
      </div>

      <div className="border-t border-[#2d1b4e]/30 my-3 sm:my-4"></div>

      <div className="text-zinc-600 text-xs mb-3 sm:mb-4">
        <div className="text-cyan-400/70 mb-1 text-xs sm:text-sm">Available Commands:</div>
        <div className="font-mono text-[9px] sm:text-[10px] md:text-xs pl-1.5 sm:pl-2 space-y-0.5">
          <div><span className="text-emerald-400">/change use</span> <span className="text-zinc-500">react | vue | svelte</span> - Switch framework</div>
          <div><span className="text-emerald-400">/change mode</span> <span className="text-zinc-500">cost | time</span> - Switch calculation mode</div>
          <div><span className="text-amber-400">clear</span> - Clear screen (scroll up to see history)</div>
          <div><span className="text-cyan-400">/restart</span> - Show welcome screen again</div>
          <div><span className="text-red-400">exit</span> - Exit and reset terminal</div>
          <div><span className="text-emerald-400">/connect</span> - Reconnect after exit</div>
        </div>
      </div>

      <div className="border-t border-[#2d1b4e]/30 my-3 sm:my-4"></div>
    </div>
  );
}
