import { useState, useRef, useEffect } from "react";
import { TerminalSquare, ChevronDown, ChevronRight, Lock, Pencil, RotateCcw } from "lucide-react";
import type { Framework, CommandHistoryEntry } from "../../core/types";
import { FRAMEWORK_CONFIG } from "../../core/constants";
import {
  CODE_SNIPPETS,
  splitSnippet,
  ORIGINAL_EDITABLE,
  TOKEN_COLORS,
  CANVAS_LINE_HEIGHT,
  CANVAS_LINE_NUM_WIDTH,
  CANVAS_CODE_PAD,
  CANVAS_FONT,
  tokenize,
  drawLockedCode,
} from "../../core/codeSnippets";
import { processSnippetCommand } from "../../core/snippetCommands";

export function CodeSnippetPanel() {
  const [framework, setFramework] = useState<Framework>("react");
  const [commandInput, setCommandInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<CommandHistoryEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editedUI, setEditedUI] = useState<Record<Framework, string>>({ ...ORIGINAL_EDITABLE });
  const [pendingSwitch, setPendingSwitch] = useState<Framework | null>(null);
  const [keepEdits, setKeepEdits] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const editableRef = useRef<HTMLTextAreaElement>(null);
  const lineNumRef = useRef<HTMLDivElement>(null);
  const lockedCanvasRef = useRef<HTMLCanvasElement>(null);

  const fc = FRAMEWORK_CONFIG[framework];

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [commandHistory]);

  // Sync editable textarea scroll with line numbers
  const handleEditableScroll = () => {
    if (editableRef.current && lineNumRef.current) {
      lineNumRef.current.scrollTop = editableRef.current.scrollTop;
    }
  };

  // Draw locked code on canvas (hidden from browser inspect element)
  useEffect(() => {
    if (!isOpen) return;
    const canvas = lockedCanvasRef.current;
    if (!canvas) return;
    const { locked: lockedCode } = splitSnippet(CODE_SNIPPETS[framework]);
    const lines = lockedCode.split('\n');
    drawLockedCode(canvas, lines, framework);

    const observer = new ResizeObserver(() => {
      drawLockedCode(canvas, lines, framework);
    });
    const container = canvas.parentElement;
    if (container) observer.observe(container);

    return () => observer.disconnect();
  }, [framework, isOpen]);

  const { locked } = splitSnippet(CODE_SNIPPETS[framework]);
  const lockedLines = locked.split('\n');
  const editableText = editedUI[framework];
  const editableLines = editableText.split('\n');
  const lockedLineCount = lockedLines.length;
  const isModified = editableText !== ORIGINAL_EDITABLE[framework];

  const handleCommand = (input: string) => {
    const result = processSnippetCommand(input, {
      framework,
      isModified,
      editedUI,
    });
    if (!result) return null;

    switch (result.type) {
      case 'clear':
        setCommandHistory([]);
        return null;
      case 'reset':
        setEditedUI(prev => ({ ...prev, [result.framework]: ORIGINAL_EDITABLE[result.framework] }));
        return { output: result.output, isError: false };
      case 'switch':
        setFramework(result.framework);
        return { output: result.output, isError: false };
      case 'confirm-switch':
        setPendingSwitch(result.framework);
        setKeepEdits(true);
        return { output: result.output, isError: false };
      case 'output':
        return { output: result.output, isError: result.isError };
    }
  };

  const handleSubmit = () => {
    if (!commandInput.trim()) return;

    const result = handleCommand(commandInput);
    if (result) {
      setCommandHistory((prev) => [
        ...prev,
        { input: commandInput, output: result.output, isError: result.isError },
      ]);
    }
    setCommandInput("");
  };

  const confirmSwitch = () => {
    if (!pendingSwitch) return;
    const oldFramework = framework;
    if (!keepEdits) {
      setEditedUI((prev) => ({
        ...prev,
        [oldFramework]: ORIGINAL_EDITABLE[oldFramework],
      }));
    }
    setCommandHistory((prev) => [
      ...prev,
      {
        input: `use ${pendingSwitch}`,
        output: `Switched to ${FRAMEWORK_CONFIG[pendingSwitch].label}${keepEdits ? " (kept custom edits)" : " (reset edits)"}`,
        isError: false,
      },
    ]);
    setFramework(pendingSwitch);
    setPendingSwitch(null);
    setKeepEdits(true);
  };

  const cancelSwitch = () => {
    setCommandHistory((prev) => [
      ...prev,
      {
        input: `use ${pendingSwitch}`,
        output: "Switch cancelled.",
        isError: false,
      },
    ]);
    setPendingSwitch(null);
    setKeepEdits(true);
  };

  return (
    <div className="flex flex-col bg-[#0d0118] border-t border-[#2d1b4e] max-h-[45vh]">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 sm:px-4 py-2 bg-[#1a0b2e] border-b border-[#2d1b4e] flex items-center gap-1.5 sm:gap-2 w-full shrink-0 flex-wrap"
      >
        <span className="text-zinc-500">
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </span>
        <TerminalSquare className="w-4 h-4 text-pink-400" />
        <span className="text-xs sm:text-sm text-pink-400 font-mono">
          {">_"} code snippet
        </span>
        <span
          className={`text-[9px] sm:text-[10px] font-mono ${fc.color} ${fc.bgColor} px-1 sm:px-1.5 py-0.5 rounded border ${fc.borderColor}`}
        >
          {fc.label}
        </span>
        {isModified && (
          <span className="text-[9px] sm:text-[10px] font-mono text-amber-400 bg-amber-500/15 px-1 sm:px-1.5 py-0.5 rounded border border-amber-500/30">
            modified
          </span>
        )}
      </button>

      {/* Content */}
      {isOpen && (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Single scrollable area for both locked + editable */}
          <div className="flex-1 overflow-auto font-mono text-xs sm:text-sm scrollbar-pink">

            {/* ── Locked Section: Core Logic (canvas-rendered, hidden from inspect) ── */}
            <div
              onCopy={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                userSelect: "none",
                WebkitUserSelect: "none",
                MozUserSelect: "none" as any,
                msUserSelect: "none" as any,
              }}
            >
              <canvas
                ref={lockedCanvasRef}
                className="w-full block"
                style={{ height: `${lockedLines.length * CANVAS_LINE_HEIGHT}px` }}
              />
            </div>

            {/* ── Section Divider ── */}
            <div className="sticky left-0 flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 bg-[#1a0b2e]/60 border-y border-[#2d1b4e]">
              <div className="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] font-mono shrink-0">
                <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-400/60" />
                <span className="text-red-400/60">core logic — locked</span>
              </div>
              <div className="hidden sm:block flex-1 border-t border-[#2d1b4e]/60" />
              <div className="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] font-mono shrink-0">
                <Pencil className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400/60" />
                <span className="text-emerald-400/60">ui layer — editable</span>
              </div>
              {isModified && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditedUI(prev => ({ ...prev, [framework]: ORIGINAL_EDITABLE[framework] }));
                  }}
                  className="flex items-center gap-1 text-[9px] sm:text-[10px] font-mono text-amber-400/70 hover:text-amber-400 transition-colors sm:ml-1 shrink-0"
                  title="Reset to original"
                >
                  <RotateCcw className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span>reset</span>
                </button>
              )}
            </div>

            {/* ── Editable Section: UI Layer ── */}
            <div className="relative flex">
              {/* Line numbers column */}
              <div
                ref={lineNumRef}
                className="shrink-0 select-none pointer-events-none"
              >
                {editableLines.map((_, i) => (
                  <div
                    key={`ln-${i}`}
                    className="flex items-center justify-end gap-0.5 sm:gap-1 pr-1.5 sm:pr-2 pl-1.5 sm:pl-2 leading-[1.35rem]"
                  >
                    <Pencil className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-emerald-500/30 hidden sm:block" />
                    <span className="text-emerald-500/40 text-[10px] sm:text-xs font-mono">{lockedLineCount + i + 1}</span>
                  </div>
                ))}
              </div>

              {/* Editable textarea — no scroll, grows to content, parent scrolls */}
              <textarea
                ref={editableRef}
                value={editableText}
                onChange={(e) =>
                  setEditedUI(prev => ({ ...prev, [framework]: e.target.value }))
                }
                className="flex-1 bg-transparent text-zinc-300 font-mono text-xs sm:text-sm resize-none outline-none border-l-2 border-emerald-500/20 pl-1.5 sm:pl-2 pr-3 sm:pr-4 py-0 leading-[1.35rem] overflow-hidden"
                spellCheck={false}
                autoComplete="off"
                style={{
                  height: `${editableLines.length * 1.35}rem`,
                  tabSize: 2,
                }}
              />
            </div>
          </div>

          {/* Command Line */}
          <div className="border-t border-[#2d1b4e] bg-[#0d0118] shrink-0">
            {/* Command History */}
            {commandHistory.length > 0 && (
              <div
                ref={historyRef}
                className="max-h-[80px] overflow-auto px-3 sm:px-4 py-2 space-y-1 border-b border-[#2d1b4e]/50 scrollbar-pink"
              >
                {commandHistory.map((entry, i) => (
                  <div key={i} className="font-mono text-[10px] sm:text-xs">
                    <div className="text-zinc-500">
                      <span className="text-emerald-500">$</span> {entry.input}
                    </div>
                    <pre
                      className={`whitespace-pre-wrap pl-3 ${
                        entry.isError ? "text-red-400" : "text-cyan-400"
                      }`}
                    >
                      {entry.output}
                    </pre>
                  </div>
                ))}
              </div>
            )}

            {/* Pending Switch Confirmation */}
            {pendingSwitch && (
              <div className="px-3 sm:px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 flex flex-wrap items-center gap-2 text-[10px] sm:text-xs font-mono">
                <span className="text-amber-400">
                  Switch to {FRAMEWORK_CONFIG[pendingSwitch].label}?
                </span>
                <label className="flex items-center gap-1 text-zinc-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={keepEdits}
                    onChange={(e) => setKeepEdits(e.target.checked)}
                    className="accent-pink-500 w-3 h-3"
                  />
                  keep custom edits
                </label>
                <button
                  onClick={confirmSwitch}
                  className="px-2 py-0.5 rounded bg-emerald-600/80 text-emerald-100 hover:bg-emerald-600 transition-colors"
                >
                  confirm
                </button>
                <button
                  onClick={cancelSwitch}
                  className="px-2 py-0.5 rounded bg-zinc-700/80 text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  cancel
                </button>
              </div>
            )}

            {/* Input */}
            <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2">
              <span className="text-emerald-500 font-mono text-xs sm:text-sm">$</span>
              <input
                ref={inputRef}
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="use react | use vue | use svelte | reset | help"
                className="flex-1 bg-transparent border-none outline-none text-zinc-100 placeholder:text-zinc-700 font-mono text-xs sm:text-sm"
                spellCheck={false}
                autoComplete="off"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

