import { useRef, useState, useCallback } from "react";
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
} from "../utils/courierCalculations";
import { useSession } from "../utils/sessionStore";
import { CodeSnippetPanel } from "./CodeSnippetPanel";

interface TerminalTabProps {
  tab: TabData;
  onUpdate: (updates: Partial<TabData>) => void;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  titleColor: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  borderClass?: string;
  badge?: React.ReactNode;
}

function CollapsibleSection({
  title,
  icon,
  titleColor,
  children,
  defaultOpen = true,
  borderClass = "",
  badge,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={`flex flex-col ${borderClass} bg-[#0d0118] xl:min-h-0`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-[#1a0b2e]/50 border-b border-[#2d1b4e] flex items-center gap-2 w-full xl:cursor-default"
      >
        <span className="xl:hidden text-zinc-500">
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </span>
        {icon}
        <span className={`text-sm ${titleColor} font-mono`}>
          {title}
        </span>
        {badge}
      </button>
      <div
        className={`${isOpen ? "flex-1 flex flex-col" : "hidden"} xl:!flex xl:flex-1 xl:flex-col overflow-hidden`}
      >
        {children}
      </div>
    </div>
  );
}

// Generating overlay
function GeneratingOverlay({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 bg-[#0d0118]/80 backdrop-blur-sm flex items-center justify-center z-10">
      <div className="flex items-center gap-2 text-sm font-mono">
        <Loader2 className="w-4 h-4 text-pink-400 animate-spin" />
        <span className="text-pink-400 animate-pulse">
          {label}
        </span>
      </div>
    </div>
  );
}

export function TerminalTab({
  tab,
  onUpdate,
}: TerminalTabProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    session,
    getOffersForCalculation,
  } = useSession();
  const [isGenerating, setIsGenerating] = useState(false);

  // Sync session offers into calculation engine
  const syncOffers = useCallback(() => {
    setOffers(getOffersForCalculation());
  }, [getOffersForCalculation]);

  const isTimeInputComplete = (inputText: string): boolean => {
    const lines = inputText
      .trim()
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);
    if (lines.length < 3) return false;
    const headerParts = lines[0].split(/\s+/);
    if (headerParts.length < 2) return false;
    const declaredCount = Number(headerParts[1]);
    if (isNaN(declaredCount) || declaredCount < 1) return false;
    const expectedLines = 1 + declaredCount + 1;
    if (lines.length < expectedLines) return false;
    const vehicleLineIndex = 1 + declaredCount;
    if (vehicleLineIndex >= lines.length) return false;
    const vehicleParts = lines[vehicleLineIndex]
      .split(/\s+/)
      .filter((p: string) => p.trim());
    if (vehicleParts.length !== 3) return false;
    return vehicleParts.every((p: string) => !isNaN(Number(p)));
  };

  const handleInputChange = (newValue: string) => {
    // For time mode: if input is already complete, only allow 'clear' on the next line
    if (
      tab.calculationType === "time" &&
      isTimeInputComplete(tab.input)
    ) {
      const newLines = newValue
        .trim()
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l);
      const oldLines = tab.input
        .trim()
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l);

      if (newLines.length > oldLines.length) {
        const addedLine =
          newLines[newLines.length - 1]?.toLowerCase();
        if (addedLine && "clear".startsWith(addedLine)) {
          onUpdate({ input: newValue });
          return;
        }
        return;
      }

      onUpdate({ input: newValue });
      return;
    }

    onUpdate({ input: newValue });
  };

  const handleExecute = () => {
    if (!tab.input.trim()) {
      onUpdate({
        output: "",
        error: "Error: No input provided",
        hasExecuted: true,
      });
      return;
    }

    const trimmedInput = tab.input.trim();
    const lines = trimmedInput
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);
    const lastLine = lines[lines.length - 1]?.toLowerCase();

    if (lastLine === "clear") {
      onUpdate({
        input: "",
        output: "",
        error: "",
        hasExecuted: false,
        executionTransitSnapshot: [],
        renamedPackages: [],
      });
      if (textareaRef.current) textareaRef.current.focus();
      return;
    }

    // Delivery calculation — show generating state
    setIsGenerating(true);
    setTimeout(() => {
      try {
        syncOffers(); // Sync dynamic offers before calculation
        if (tab.calculationType === "cost") {
          const result = calculateDeliveryCost(tab.input);
          onUpdate({
            output: result,
            error: "",
            hasExecuted: true,
          });
        } else {
          const transitResult =
            calculateDeliveryTimeWithTransit(
              tab.input,
              tab.transitPackages,
            );
          const updatedTransit = [
            ...transitResult.stillInTransit,
            ...transitResult.newTransitPackages,
          ];
          onUpdate({
            output: transitResult.output,
            error: "",
            hasExecuted: true,
            transitPackages: updatedTransit,
            executionTransitSnapshot: [...tab.transitPackages],
            renamedPackages: transitResult.renamedPackages,
          });
        }
      } catch (err) {
        onUpdate({
          output: "",
          error:
            err instanceof Error
              ? err.message
              : "Invalid input",
          hasExecuted: true,
        });
      }
      setIsGenerating(false);
    }, 350);
  };

  const handleCalcTypeChange = (type: "cost" | "time") => {
    onUpdate({
      calculationType: type,
      output: "",
      error: "",
      hasExecuted: false,
    });
  };

  // Parse results
  const parsedResults = parseOutput(
    tab.output,
    tab.calculationType,
    tab.input,
    tab.executionTransitSnapshot,
  );

  const transitCount = tab.transitPackages.length;
  const gridCols = "xl:grid-cols-3";

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {/* Calculation Type Selector */}
      <div className="px-4 py-3 sm:px-6 bg-[#1a0b2e] border-b border-[#2d1b4e] flex items-center gap-3 sm:gap-4 flex-wrap">
        <span className="text-sm text-zinc-400">Mode:</span>
        <div className="flex gap-2">
          <button
            onClick={() => handleCalcTypeChange("cost")}
            className={`px-3 py-1.5 sm:px-4 text-sm rounded transition-colors ${
              tab.calculationType === "cost"
                ? "bg-pink-500/20 text-pink-400 border border-pink-500/30"
                : "bg-[#251440] text-zinc-400 border border-[#2d1b4e] hover:text-pink-300"
            }`}
          >
            Delivery Cost
          </button>
          <button
            onClick={() => handleCalcTypeChange("time")}
            className={`px-3 py-1.5 sm:px-4 text-sm rounded transition-colors ${
              tab.calculationType === "time"
                ? "bg-pink-500/20 text-pink-400 border border-pink-500/30"
                : "bg-[#251440] text-zinc-400 border border-[#2d1b4e] hover:text-pink-300"
            }`}
          >
            Delivery Time
          </button>
        </div>
      </div>

      {/* Responsive Layout */}
      <div
        className={`flex-1 flex flex-col xl:grid ${gridCols} overflow-auto xl:overflow-hidden scrollbar-pink`}
      >
        {/* Input Panel */}
        <CollapsibleSection
          title="input"
          icon={<Terminal className="w-4 h-4 text-pink-400" />}
          titleColor="text-pink-400"
          defaultOpen={true}
          borderClass="xl:border-r border-b xl:border-b-0 border-[#2d1b4e]"
        >
          <div className="flex-1 overflow-auto p-4 font-mono text-sm scrollbar-pink">
            {/* CLI Header */}
            <div className="text-zinc-600 mb-4">
              <div># Courier Service App Calculator</div>
              <div>
                # Mode:{" "}
                {tab.calculationType === "cost"
                  ? "Delivery Cost"
                  : "Delivery Time Estimation"}
              </div>
              <div className="mt-2"># Input Format:</div>
              <div>
                # Line 1: base_delivery_cost no_of_packages
              </div>
              <div>
                # Line 2: pkg_id1 weight1_in_kg distance1_in_km
                offer_code1
              </div>
              {tab.calculationType === "time" && (
                <div>
                  # Last line: no_of_vehicles max_speed
                  max_weight
                </div>
              )}

              {/* Dynamic Offer Table */}
              <div className="text-zinc-700 mt-2">
                ------------------------------------
              </div>
              <div className="text-zinc-500">
                Code | Distance (km) | Weight (kg)
              </div>
              <div className="text-zinc-700">
                ------------------------------------
              </div>
              {session.offers.map((o) => {
                const dist =
                  o.minDistance === 0
                    ? `< ${o.maxDistance}`
                    : `${o.minDistance} - ${o.maxDistance}`;
                return (
                  <div
                    key={o.code}
                    className="text-zinc-500 whitespace-pre"
                  >
                    {`${o.code} | ${dist.padEnd(13)} | ${o.minWeight} - ${o.maxWeight}`}
                  </div>
                );
              })}
              <div className="text-zinc-700">
                ------------------------------------
              </div>

              <div className="mt-2">
                <span className="hidden xl:inline">
                  # Press Enter to execute | Shift+Enter for new
                  line | Type 'clear' to reset
                </span>
                <span className="xl:hidden">
                  # Tap Run to execute | Enter for new line |
                  Type 'clear' to reset
                </span>
              </div>
              <div className="border-t border-[#2d1b4e]/50 my-3"></div>
            </div>

            {/* Command Prompt with $ on each line */}
            <div className="relative">
              <div
                className="absolute inset-0 pointer-events-none font-mono text-sm leading-relaxed"
                style={{ paddingTop: "2px" }}
              >
                {tab.input === "" ? (
                  <div className="flex gap-2">
                    <span className="text-pink-400">$</span>
                  </div>
                ) : (
                  tab.input.split("\n").map((_, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-pink-400">$</span>
                    </div>
                  ))
                )}
              </div>
              <textarea
                ref={textareaRef}
                value={tab.input}
                onChange={(e) =>
                  handleInputChange(e.target.value)
                }
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    window.innerWidth >= 1280
                  ) {
                    const lines = tab.input
                      .trim()
                      .split("\n")
                      .map((l) => l.trim())
                      .filter((l) => l);
                    const lastLine =
                      lines[lines.length - 1]?.toLowerCase();
                    const isClear = lastLine === "clear";

                    if (
                      tab.calculationType === "time" &&
                      !isClear &&
                      !isTimeInputComplete(tab.input)
                    ) {
                      return;
                    }
                    e.preventDefault();
                    handleExecute();
                  }
                }}
                placeholder="Type your input here..."
                className="relative bg-transparent border-none outline-none resize-none text-zinc-100 placeholder:text-zinc-600 min-h-[150px] xl:min-h-[200px] w-full font-mono text-sm leading-relaxed"
                style={{ paddingLeft: "1.5rem" }}
                spellCheck={false}
              />
            </div>

            {/* Transit Section */}
            {tab.calculationType === "time" &&
              transitCount > 0 && (
                <TransitSection
                  transitPackages={tab.transitPackages}
                  renamedPackages={tab.renamedPackages}
                />
              )}

            {/* Footer: Run button only (mobile/tablet) */}
            <div className="mt-4 pt-4 border-t border-[#2d1b4e]/50 flex items-center justify-end">
              <button
                onClick={handleExecute}
                className="xl:hidden px-4 py-1.5 text-sm rounded bg-pink-500/20 text-pink-400 border border-pink-500/30 hover:bg-pink-500/30 transition-colors whitespace-nowrap"
              >
                Run
              </button>
            </div>
          </div>
        </CollapsibleSection>

        {/* Output Panel */}
        <CollapsibleSection
            title="output"
            icon={
              <Terminal className="w-4 h-4 text-violet-400" />
            }
            titleColor="text-violet-400"
            defaultOpen={true}
            borderClass="xl:border-r border-b xl:border-b-0 border-[#2d1b4e]"
          >
            <div className="flex-1 overflow-auto p-4 font-mono text-sm relative scrollbar-pink">
              {isGenerating && (
                <GeneratingOverlay label="generating new output..." />
              )}
              {!tab.hasExecuted && !isGenerating ? (
                <div className="text-zinc-600">
                  ~ awaiting execution...
                </div>
              ) : tab.error ? (
                <div className="text-red-400">
                  <span className="text-red-500">Error:</span>{" "}
                  {tab.error}
                </div>
              ) : tab.output ? (
                <pre className="whitespace-pre-wrap text-emerald-400">
                  {tab.output}
                </pre>
              ) : null}
            </div>
          </CollapsibleSection>

        {/* Result Panel */}
        <CollapsibleSection
          title="result"
          icon={<Terminal className="w-4 h-4 text-cyan-400" />}
          titleColor="text-cyan-400"
          defaultOpen={true}
          borderClass=""
        >
          <div className="flex-1 overflow-auto p-4 relative scrollbar-pink">
            {isGenerating && (
              <GeneratingOverlay label="generating new result..." />
            )}
            {!tab.hasExecuted && !isGenerating ? (
              <div className="font-mono text-sm text-zinc-600">
                ~ awaiting execution...
              </div>
            ) : parsedResults.length > 0 ? (
              <div className="space-y-4">
                {[...parsedResults]
                  .sort((a, b) => {
                    if (tab.calculationType !== "time")
                      return 0;
                    if (a.undeliverable && !b.undeliverable)
                      return 1;
                    if (!a.undeliverable && b.undeliverable)
                      return -1;
                    const roundA = a.deliveryRound ?? Infinity;
                    const roundB = b.deliveryRound ?? Infinity;
                    if (roundA !== roundB)
                      return roundA - roundB;
                    return (b.weight ?? 0) - (a.weight ?? 0);
                  })
                  .map((result, index) => (
                    <ResultCard
                      key={index}
                      result={result}
                      calculationType={tab.calculationType}
                    />
                  ))}
              </div>
            ) : tab.error ? (
              <div className="font-mono text-sm text-red-400">
                Failed to parse results
              </div>
            ) : null}
          </div>
        </CollapsibleSection>
      </div>

      {/* Code Snippet Panel — per-tab, independent framework selection */}
      <CodeSnippetPanel />
    </div>
  );
}
// ── Transit Section Component ──────────────────────────────────────────

function TransitSection({
  transitPackages,
  renamedPackages,
}: {
  transitPackages: TransitPackage[];
  renamedPackages: { oldId: string; newId: string }[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  const renameNewToOld = new Map(
    renamedPackages.map((rp) => [
      rp.newId.toLowerCase(),
      rp.oldId,
    ]),
  );

  return (
    <div className="mt-4 border border-amber-500/30 rounded-lg overflow-hidden bg-amber-500/5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center gap-2 text-xs font-mono hover:bg-amber-500/10 transition-colors"
      >
        <span className="xl:hidden text-amber-500/60">
          {isOpen ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </span>
        <Package className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-amber-400">
          {">_"} package in transit
        </span>
        <span className="text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded text-[10px]">
          {transitPackages.length}
        </span>
      </button>
      <div
        className={`${isOpen ? "block" : "hidden"} xl:!block`}
      >
        <div className="px-3 pb-2 space-y-1.5">
          {transitPackages.map((tp, index) => {
            const originalId = renameNewToOld.get(
              tp.id.toLowerCase(),
            );
            return (
              <div
                key={`${tp.id}-${index}`}
                className="flex items-center gap-3 px-2 py-1.5 bg-amber-500/5 border border-amber-500/20 rounded text-xs font-mono"
              >
                {originalId ? (
                  <span className="flex items-center gap-1.5">
                    <span className="text-zinc-600 line-through">
                      {originalId}
                    </span>
                    <span className="text-amber-300">
                      {tp.id}
                    </span>
                    <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] bg-violet-500/20 text-violet-400 border border-violet-500/30">
                      ID Notified
                    </span>
                  </span>
                ) : (
                  <span className="text-amber-300">
                    {tp.id}
                  </span>
                )}
                <span className="text-zinc-500">
                  {tp.weight}kg
                </span>
                <span className="text-zinc-500">
                  {tp.distance}km
                </span>
                <span className="text-zinc-600">
                  {tp.offerCode}
                </span>
              </div>
            );
          })}
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
  const discountPercent =
    discount > 0
      ? ((discount / deliveryCost) * 100).toFixed(0)
      : 0;

  return (
    <div
      className={`bg-[#1a0b2e]/40 border rounded-lg p-4 sm:p-5 space-y-3 ${
        result.undeliverable
          ? "border-amber-500/40"
          : "border-[#2d1b4e]"
      }`}
    >
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
            <span className="text-amber-500">&#x26A0;</span>{" "}
            {result.undeliverableReason}
          </div>
        </div>
      )}

      {/* Delivery Round & Vehicle (time mode only, deliverable packages) */}
      {!result.undeliverable &&
        result.deliveryRound !== undefined &&
        result.vehicleId !== undefined && (
          <div className="space-y-1.5 pb-2 border-b border-[#2d1b4e]/50">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono">
              <span className="text-zinc-500">
                Packages Remaining:{" "}
                <span className="text-zinc-300">
                  {result.packagesRemaining ?? 0}
                </span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono">
              <span className="text-purple-400/80">
                Delivery Round:{" "}
                <span className="text-purple-300">
                  {result.deliveryRound}
                </span>
              </span>
              <span className="text-zinc-600">|</span>
              <span className="text-cyan-400/80">
                Vehicle Available:{" "}
                <span className="text-cyan-300">
                  Vehicle{result.vehicleId}
                </span>
              </span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-500">
                Current Time:{" "}
                <span className="text-zinc-300">
                  {(result.currentTime ?? 0).toFixed(2)} hrs
                </span>
              </span>
            </div>
            <div className="text-xs font-mono text-amber-400/80 mt-1">
              {result.currentTime !== undefined &&
              result.currentTime > 0 ? (
                <>
                  Vehicle{result.vehicleId} will be available
                  after {result.currentTime.toFixed(2)} +{" "}
                  {(result.roundTripTime ?? 0).toFixed(2)} ={" "}
                  <span className="text-amber-300">
                    {(result.vehicleReturnTime ?? 0).toFixed(2)}{" "}
                    hrs
                  </span>
                </>
              ) : (
                <>
                  Vehicle{result.vehicleId} will be available
                  after{" "}
                  <span className="text-amber-300">
                    {(result.vehicleReturnTime ?? 0).toFixed(2)}{" "}
                    hrs
                  </span>
                </>
              )}
            </div>
          </div>
        )}

      {/* Title — package ID */}
      <div className="flex items-center gap-2 pb-2 border-b border-[#2d1b4e]/50">
        {result.renamedFrom ? (
          <>
            <span className="text-zinc-500 font-mono line-through">
              {result.renamedFrom}
            </span>
            <span className="text-pink-400 font-mono font-semibold">
              {result.id}
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-violet-500/20 text-violet-400 border border-violet-500/30">
              Notified
            </span>
          </>
        ) : (
          <span className="text-pink-400 font-mono font-semibold">
            {result.id}
          </span>
        )}
      </div>

      {/* Header */}
      <div className="text-sm text-zinc-300 space-y-1">
        <div>
          <span className="text-zinc-500">
            Base delivery cost:
          </span>{" "}
          <span className="font-semibold">
            {result.baseCost}
          </span>
        </div>
        <div>
          <span className="text-zinc-500">Weight:</span>{" "}
          <span className="font-semibold">
            {result.weight}kg
          </span>
          {" | "}
          <span className="text-zinc-500">Distance:</span>{" "}
          <span className="font-semibold">
            {result.distance}km
          </span>
        </div>
        <div>
          <span className="text-zinc-500">Offer code:</span>{" "}
          <span
            className={`font-semibold ${result.offerApplied ? "text-emerald-400" : "text-zinc-600"}`}
          >
            {result.offerApplied || "N/A"}
          </span>
        </div>
      </div>

      <div className="border-t border-[#2d1b4e]/50 pt-3 space-y-3">
        {/* Delivery Cost */}
        <div className="flex justify-between items-start text-sm">
          <div>
            <div className="text-zinc-400">Delivery Cost</div>
            <div className="text-xs text-zinc-600 font-mono mt-0.5">
              {result.baseCost} + ({result.weight} * 10) + (
              {result.distance} * 5)
            </div>
          </div>
          <div className="text-zinc-300 font-semibold font-mono">
            {deliveryCost.toFixed(2)}
          </div>
        </div>

        <div className="border-t border-[#2d1b4e]/30"></div>

        {/* Discount */}
        <div className="flex justify-between items-start text-sm">
          <div>
            <div className="text-zinc-400">Discount</div>
            <div className="text-xs text-zinc-600 mt-0.5">
              {discount > 0
                ? `(${discountPercent}% of ${deliveryCost.toFixed(2)} i.e; Delivery Cost)`
                : "(Offer not applicable as criteria not met)"}
            </div>
          </div>
          <div
            className={`font-semibold font-mono ${discount > 0 ? "text-emerald-400" : "text-zinc-600"}`}
          >
            {discount > 0 ? "-" : ""}
            {discount.toFixed(2)}
          </div>
        </div>

        <div className="border-t border-[#2d1b4e]"></div>

        {/* Total Cost */}
        <div className="flex justify-between items-center">
          <div className="text-zinc-300 font-semibold">
            Total cost
          </div>
          <div className="text-pink-400 font-bold text-lg font-mono">
            {result.totalCost}
          </div>
        </div>

        {/* Delivery Time (if available) */}
        {result.deliveryTime !== undefined && (
          <>
            <div className="border-t border-[#2d1b4e]/30"></div>
            <div className="flex justify-between items-center text-sm">
              <div className="text-zinc-400">Delivery Time</div>
              <div
                className={`font-semibold font-mono ${result.undeliverable ? "text-amber-400" : "text-cyan-400"}`}
              >
                {result.undeliverable
                  ? "N/A"
                  : `${result.deliveryTime}hrs`}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
