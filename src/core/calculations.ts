import type { Package, CalcOfferCriteria, DeliveryResult, ParsedResult, TransitPackageInput, TransitAwareResult } from './types';

// ── Mutable Offers State ───────────────────────────────────────────────

let OFFERS: Record<string, CalcOfferCriteria> = {
  OFR001: {
    discount: 10,
    minDistance: 0,
    maxDistance: 200,
    minWeight: 70,
    maxWeight: 200,
  },
  OFR002: {
    discount: 7,
    minDistance: 50,
    maxDistance: 150,
    minWeight: 100,
    maxWeight: 250,
  },
  OFR003: {
    discount: 5,
    minDistance: 50,
    maxDistance: 250,
    minWeight: 10,
    maxWeight: 150,
  },
};

export function setOffers(offers: Record<string, CalcOfferCriteria>) {
  OFFERS = { ...offers };
}

export function getOffers(): Record<string, CalcOfferCriteria> {
  return { ...OFFERS };
}

// ── Validators ─────────────────────────────────────────────────────────

function isValidPackageId(value: string): boolean {
  return /^(pkg|PKG)\d+$/i.test(value);
}

function isValidOfferCode(value: string): boolean {
  const normalized = value.toUpperCase();
  return normalized in OFFERS;
}

function normalizeOfferCode(code: string): string {
  return code.toUpperCase();
}

// ── Input Parser ───────────────────────────────────────────────────────

function parseInput(input: string, mode: 'cost' | 'time'): {
  baseCost: number;
  packages: Package[];
  vehicles?: { count: number; maxSpeed: number; maxWeight: number };
} {
  const lines = input.trim().split('\n').filter(line => line.trim());

  if (mode === 'cost' && lines.length < 2) {
    throw new Error('Invalid input: Need at least header line and one package line');
  }

  if (mode === 'time' && lines.length < 3) {
    throw new Error('Invalid input: Need header line, at least one package line, and vehicle info line');
  }

  const firstLineParts = lines[0].split(/\s+/);

  if (firstLineParts.length < 2) {
    throw new Error('Invalid format: Line 1 must have base_cost and no_of_packages');
  }

  const baseCost = Number(firstLineParts[0]);
  const declaredPackageCount = Number(firstLineParts[1]);

  if (isNaN(baseCost) || isNaN(declaredPackageCount)) {
    throw new Error('Invalid input: Base cost and package count must be numbers');
  }

  if (declaredPackageCount < 1) {
    throw new Error('Invalid input: Package count must be at least 1');
  }

  const packages: Package[] = [];
  let vehicleLineIndex = -1;

  if (mode === 'time') {
    const lastLine = lines[lines.length - 1];
    const lastParts = lastLine.split(/\s+/).filter(p => p.trim());
    const allNumbers = lastParts.length === 3 && lastParts.every(p => !isNaN(Number(p)) && /^\d+(\.\d+)?$/.test(p));

    if (!allNumbers) {
      if (lastParts.length === 4 && isValidPackageId(lastParts[0])) {
        throw new Error('Missing vehicle info: Last line must be "no_of_vehicles max_speed max_weight" (3 numbers). Currently in Delivery Time mode which requires vehicle info');
      }
      throw new Error('Invalid vehicle info on last line: Expected 3 numbers (no_of_vehicles max_speed max_weight)');
    }

    vehicleLineIndex = lines.length - 1;
  }

  const packageLineEnd = mode === 'time' ? lines.length - 1 : lines.length;

  for (let i = 1; i < packageLineEnd; i++) {
    const parts = lines[i].split(/\s+/).filter(p => p.trim());

    if (mode === 'cost' && i === lines.length - 1 && parts.length === 3) {
      const allNumbers = parts.every(p => !isNaN(Number(p)) && /^\d+(\.\d+)?$/.test(p));
      if (allNumbers) {
        throw new Error(`Line ${i + 1} looks like vehicle info (3 numbers), but you're in Delivery Cost mode which doesn't need vehicle info. Switch to Delivery Time mode if you need time estimation`);
      }
    }

    if (parts.length !== 4) {
      if (parts.length > 4) {
        const firstTwo = parts[0].toLowerCase() + parts[1];
        const hasSpacedPkgId = /^pkg\d+$/i.test(firstTwo);
        const lastTwo = parts[parts.length - 2] + parts[parts.length - 1];
        const hasSpacedOfferCode = /^(OFR|ofr)00[123]$/.test(lastTwo);

        if (hasSpacedPkgId && hasSpacedOfferCode) {
          throw new Error(`Line ${i + 1}: No spaces allowed in package ID or offer code. Use "${firstTwo}" not "${parts[0]} ${parts[1]}", and "${lastTwo}" not "${parts[parts.length - 2]} ${parts[parts.length - 1]}"`);
        } else if (hasSpacedPkgId) {
          throw new Error(`Line ${i + 1}: No spaces allowed in package ID. Use "${firstTwo}" not "${parts[0]} ${parts[1]}"`);
        } else if (hasSpacedOfferCode) {
          throw new Error(`Line ${i + 1}: No spaces allowed in offer code. Use "${lastTwo}" not "${parts[parts.length - 2]} ${parts[parts.length - 1]}"`);
        }
        throw new Error(`Line ${i + 1}: Expected exactly 4 values (pkg_id weight distance offer_code) but found ${parts.length}. Ensure no spaces within package ID (e.g., PKG1 not PKG 1) or offer code (e.g., OFR001 not OFR 001)`);
      }
      throw new Error(`Line ${i + 1}: Expected 4 values (pkg_id weight distance offer_code) but found ${parts.length}`);
    }

    if (!isValidPackageId(parts[0])) {
      throw new Error(`Invalid package ID "${parts[0]}" at line ${i + 1}: Must be "PKG" or "pkg" followed by digits with no spaces (e.g., PKG1, pkg2)`);
    }

    const weight = Number(parts[1]);
    const distance = Number(parts[2]);

    if (isNaN(weight) || !/^\d+(\.\d+)?$/.test(parts[1])) {
      throw new Error(`Invalid weight "${parts[1]}" at line ${i + 1}: Must be a number`);
    }

    if (isNaN(distance) || !/^\d+(\.\d+)?$/.test(parts[2])) {
      throw new Error(`Invalid distance "${parts[2]}" at line ${i + 1}: Must be a number`);
    }

    const rawOfferCode = parts[3];
    if (!isValidOfferCode(rawOfferCode)) {
      const validCodes = Object.keys(OFFERS).join('/');
      throw new Error(`Invalid offer code "${rawOfferCode}" at line ${i + 1}: Must be one of: ${validCodes} (case-insensitive)`);
    }

    packages.push({
      id: parts[0],
      weight: weight,
      distance: distance,
      offerCode: normalizeOfferCode(rawOfferCode),
    });
  }

  if (packages.length === 0) {
    throw new Error('No valid packages found');
  }

  const seenIds = new Set<string>();
  for (const pkg of packages) {
    const normalizedId = pkg.id.toLowerCase();
    if (seenIds.has(normalizedId)) {
      throw new Error(`Duplicate package ID "${pkg.id}": Each package must have a unique ID`);
    }
    seenIds.add(normalizedId);
  }

  const pkgNumbers = packages.map(pkg => {
    const match = pkg.id.match(/^(?:pkg|PKG)(\d+)$/i);
    return match ? parseInt(match[1]) : 0;
  });
  for (let i = 0; i < pkgNumbers.length; i++) {
    if (pkgNumbers[i] !== i + 1) {
      throw new Error(`Package IDs must be incremental starting from 1 (pkg1, pkg2, pkg3, ...). Found "${packages[i].id}" but expected "PKG${i + 1}" at position ${i + 1}`);
    }
  }

  if (packages.length !== declaredPackageCount) {
    if (mode === 'cost' && packages.length < declaredPackageCount) {
      throw new Error(`Expected ${declaredPackageCount} packages but found ${packages.length}. Make sure all package lines have 4 fields: pkg_id weight distance offer_code`);
    }
    throw new Error(`Expected ${declaredPackageCount} packages but found ${packages.length}`);
  }

  let vehicles;
  if (vehicleLineIndex !== -1) {
    const vehicleParts = lines[vehicleLineIndex].split(/\s+/).map(Number);
    vehicles = {
      count: vehicleParts[0],
      maxSpeed: vehicleParts[1],
      maxWeight: vehicleParts[2],
    };

    if (vehicles.count < 1) {
      throw new Error('Invalid vehicle info: Number of vehicles must be at least 1');
    }
    if (vehicles.maxSpeed <= 0) {
      throw new Error('Invalid vehicle info: Max speed must be greater than 0');
    }
    if (vehicles.maxWeight <= 0) {
      throw new Error('Invalid vehicle info: Max weight must be greater than 0');
    }
  }

  return { baseCost, packages, vehicles };
}

// ── Offer Matching ─────────────────────────────────────────────────────

function findBestOffer(weight: number, distance: number): { code: string; criteria: CalcOfferCriteria } | null {
  let bestOffer: { code: string; criteria: CalcOfferCriteria } | null = null;

  for (const [code, criteria] of Object.entries(OFFERS)) {
    // Distance: exclusive on both ends (> and <)
    // Weight: inclusive on both ends (>= and <=)
    const distanceValid = distance > criteria.minDistance && distance < criteria.maxDistance;
    const weightValid = weight >= criteria.minWeight && weight <= criteria.maxWeight;

    if (distanceValid && weightValid) {
      if (!bestOffer || criteria.discount > bestOffer.criteria.discount) {
        bestOffer = { code, criteria };
      }
    }
  }

  return bestOffer;
}

function calculatePackageCost(
  pkg: Package,
  baseCost: number
): { discount: number; totalCost: number; offerCode?: string; deliveryCost: number } {
  const deliveryCost = baseCost + pkg.weight * 10 + pkg.distance * 5;

  let discount = 0;
  let appliedOfferCode: string | undefined;

  if (pkg.offerCode && OFFERS[pkg.offerCode]) {
    const offer = OFFERS[pkg.offerCode];
    const distanceValid = pkg.distance > offer.minDistance && pkg.distance < offer.maxDistance;
    const weightValid = pkg.weight >= offer.minWeight && pkg.weight <= offer.maxWeight;

    if (distanceValid && weightValid) {
      discount = (deliveryCost * offer.discount) / 100;
      appliedOfferCode = pkg.offerCode;
    }
  } else {
    const bestOffer = findBestOffer(pkg.weight, pkg.distance);
    if (bestOffer) {
      discount = (deliveryCost * bestOffer.criteria.discount) / 100;
      appliedOfferCode = bestOffer.code;
    }
  }

  const totalCost = deliveryCost - discount;

  return { discount, totalCost, offerCode: appliedOfferCode, deliveryCost };
}

// ── Public API ─────────────────────────────────────────────────────────

export function calculateDeliveryCost(input: string): string {
  const { baseCost, packages } = parseInput(input, 'cost');

  const results: string[] = [];

  for (const pkg of packages) {
    const { discount, totalCost } = calculatePackageCost(pkg, baseCost);
    results.push(
      `${pkg.id} ${Math.round(discount)} ${Math.round(totalCost)}`
    );
  }

  return results.join('\n');
}

export function calculateDeliveryTime(input: string): string {
  const orderedResults = computeDeliveryResults(input);

  const results = orderedResults.map(r => {
    if (r.undeliverable) {
      return `${r.id} ${Math.round(r.discount)} ${Math.round(r.totalCost)} N/A`;
    }
    return `${r.id} ${Math.round(r.discount)} ${Math.round(r.totalCost)} ${r.deliveryTime!.toFixed(2)}`;
  });

  return results.join('\n');
}

// ── Transit Conflict Resolution ────────────────────────────────────────

function resolveTransitConflicts(
  packages: Package[],
  transitPackages: TransitPackageInput[],
  maxWeight: number
): {
  workingPackages: Package[];
  clearedFromTransit: TransitPackageInput[];
  stillInTransit: TransitPackageInput[];
  renamedPackages: { oldId: string; newId: string }[];
} {
  const workingPackages = packages.map(p => ({ ...p }));
  const clearedFromTransit: TransitPackageInput[] = [];
  const stillInTransit: TransitPackageInput[] = [];
  const renamedPackages: { oldId: string; newId: string }[] = [];

  const allIds = [
    ...packages.map(p => {
      const m = p.id.match(/^(?:pkg|PKG)(\d+)$/i);
      return m ? parseInt(m[1]) : 0;
    }),
    ...transitPackages.map(tp => {
      const m = tp.id.match(/^(?:pkg|PKG)(\d+)$/i);
      return m ? parseInt(m[1]) : 0;
    }),
  ];
  let nextPkgNumber = Math.max(...allIds, 0) + 1;

  const workingIds = new Set(workingPackages.map(p => p.id.toLowerCase()));

  for (const tp of transitPackages) {
    const hasConflict = workingIds.has(tp.id.toLowerCase());

    if (hasConflict && tp.weight <= maxWeight) {
      const conflictingPkg = workingPackages.find(
        p => p.id.toLowerCase() === tp.id.toLowerCase()
      );
      if (conflictingPkg) {
        const oldId = conflictingPkg.id;
        const prefix = oldId.match(/^(pkg|PKG)/i)?.[0] || 'pkg';
        const newId = `${prefix}${nextPkgNumber}`;
        workingIds.delete(oldId.toLowerCase());
        workingIds.add(newId.toLowerCase());
        conflictingPkg.id = newId;
        renamedPackages.push({ oldId, newId });
        nextPkgNumber++;
      }
      clearedFromTransit.push(tp);
    } else if (hasConflict && tp.weight > maxWeight) {
      stillInTransit.push(tp);
    } else if (!hasConflict && tp.weight <= maxWeight) {
      clearedFromTransit.push(tp);
    } else {
      stillInTransit.push(tp);
    }
  }

  return { workingPackages, clearedFromTransit, stillInTransit, renamedPackages };
}

export function calculateDeliveryTimeWithTransit(
  input: string,
  transitPackages: TransitPackageInput[]
): TransitAwareResult {
  const { baseCost, packages, vehicles } = parseInput(input, 'time');

  if (!vehicles) {
    throw new Error('Vehicle information required for delivery time calculation');
  }

  const { workingPackages, clearedFromTransit, stillInTransit, renamedPackages } =
    resolveTransitConflicts(packages, transitPackages, vehicles.maxWeight);

  const mergedPackages: Package[] = [
    ...workingPackages,
    ...clearedFromTransit.map(tp => ({
      id: tp.id,
      weight: tp.weight,
      distance: tp.distance,
      offerCode: tp.offerCode,
    })),
  ];

  const orderedResults = computeDeliveryResultsFromParsed(baseCost, mergedPackages, vehicles);

  const stillInTransitIds = new Set(stillInTransit.map(tp => tp.id.toLowerCase()));
  const workingPkgIds = new Set(workingPackages.map(p => p.id.toLowerCase()));
  const newTransitPackages: TransitPackageInput[] = [];
  const outputLines: string[] = [];

  for (const r of orderedResults) {
    if (r.undeliverable) {
      const isFromCurrentInput = workingPkgIds.has(r.id.toLowerCase());
      if (isFromCurrentInput && !stillInTransitIds.has(r.id.toLowerCase())) {
        newTransitPackages.push({
          id: r.id,
          weight: r.weight,
          distance: r.distance,
          offerCode: r.offerCode || '',
        });
      }
      outputLines.push(`${r.id} ${Math.round(r.discount)} ${Math.round(r.totalCost)} N/A`);
    } else {
      outputLines.push(`${r.id} ${Math.round(r.discount)} ${Math.round(r.totalCost)} ${r.deliveryTime!.toFixed(2)}`);
    }
  }

  return {
    output: outputLines.join('\n'),
    newTransitPackages,
    clearedFromTransit,
    stillInTransit,
    renamedPackages,
  };
}

// ── Internal Computation ───────────────────────────────────────────────

function computeDeliveryResultsFromParsed(
  baseCost: number,
  packages: Package[],
  vehicles: { count: number; maxSpeed: number; maxWeight: number }
): DeliveryResult[] {
  const packagesWithCost = packages.map(pkg => {
    const costData = calculatePackageCost(pkg, baseCost);
    return {
      ...pkg,
      ...costData,
      deliveryTime: 0,
    };
  });

  const deliverablePackages = packagesWithCost.filter(pkg => pkg.weight <= vehicles.maxWeight);
  const undeliverablePackages = packagesWithCost.filter(pkg => pkg.weight > vehicles.maxWeight);

  const sortedPackages = [...deliverablePackages].sort((a, b) => {
    if (b.weight !== a.weight) {
      return b.weight - a.weight;
    }
    return a.distance - b.distance;
  });

  const vehicleAvailability = Array(vehicles.count).fill(0);
  const deliveryResults: DeliveryResult[] = [];

  let remainingPackages = [...sortedPackages];
  let roundNumber = 0;

  while (remainingPackages.length > 0) {
    roundNumber++;

    const minTime = Math.min(...vehicleAvailability);
    const vehicleIndex = vehicleAvailability.indexOf(minTime);
    const currentTime = vehicleAvailability[vehicleIndex];

    const shipment = findBestShipment(remainingPackages, vehicles.maxWeight);

    if (shipment.length === 0) {
      remainingPackages.shift();
      roundNumber--;
      continue;
    }

    const maxDistance = Math.max(...shipment.map(pkg => pkg.distance));

    for (const pkg of shipment) {
      const pkgDeliveryTime = currentTime + pkg.distance / vehicles.maxSpeed;
      const truncatedTime = Math.floor(pkgDeliveryTime * 100) / 100;
      deliveryResults.push({
        id: pkg.id,
        discount: pkg.discount,
        totalCost: pkg.totalCost,
        deliveryTime: truncatedTime,
        offerCode: pkg.offerCode,
        baseCost: baseCost,
        weight: pkg.weight,
        distance: pkg.distance,
        deliveryCost: pkg.deliveryCost,
        deliveryRound: roundNumber,
        vehicleId: vehicleIndex + 1,
        packagesRemaining: remainingPackages.length - shipment.length,
        currentTime: currentTime,
        vehicleReturnTime: currentTime + 2 * (maxDistance / vehicles.maxSpeed),
        roundTripTime: 2 * (maxDistance / vehicles.maxSpeed),
      });
    }

    const returnTime = currentTime + 2 * (maxDistance / vehicles.maxSpeed);
    vehicleAvailability[vehicleIndex] = returnTime;

    remainingPackages = remainingPackages.filter(
      pkg => !shipment.some(s => s.id === pkg.id)
    );
  }

  const orderedResults = packages.map(pkg => {
    const undeliverable = undeliverablePackages.find(u => u.id === pkg.id);
    if (undeliverable) {
      return {
        id: undeliverable.id,
        discount: undeliverable.discount,
        totalCost: undeliverable.totalCost,
        offerCode: undeliverable.offerCode,
        baseCost: baseCost,
        weight: undeliverable.weight,
        distance: undeliverable.distance,
        deliveryCost: undeliverable.deliveryCost,
        undeliverable: true,
        undeliverableReason: `${pkg.id} will be out for delivery if there is a vehicle that can carry ${undeliverable.weight}kg and above`,
      } as DeliveryResult;
    }
    const result = deliveryResults.find(r => r.id === pkg.id);
    return result!;
  });

  return orderedResults;
}

function computeDeliveryResults(input: string): DeliveryResult[] {
  const { baseCost, packages, vehicles } = parseInput(input, 'time');

  if (!vehicles) {
    throw new Error('Vehicle information required for delivery time calculation');
  }

  return computeDeliveryResultsFromParsed(baseCost, packages, vehicles);
}

function computeDeliveryResultsWithTransit(
  input: string,
  transitPackages: TransitPackageInput[]
): { results: DeliveryResult[]; renamedPackages: { oldId: string; newId: string }[] } {
  const { baseCost, packages, vehicles } = parseInput(input, 'time');

  if (!vehicles) {
    throw new Error('Vehicle information required for delivery time calculation');
  }

  const { workingPackages, clearedFromTransit, renamedPackages } =
    resolveTransitConflicts(packages, transitPackages, vehicles.maxWeight);

  const mergedPackages: Package[] = [
    ...workingPackages,
    ...clearedFromTransit.map(tp => ({ id: tp.id, weight: tp.weight, distance: tp.distance, offerCode: tp.offerCode })),
  ];

  return { results: computeDeliveryResultsFromParsed(baseCost, mergedPackages, vehicles), renamedPackages };
}

// ── Knapsack / Best Shipment ───────────────────────────────────────────

function findBestShipment<T extends Package & { discount: number; totalCost: number }>(
  packages: T[],
  maxWeight: number
): T[] {
  const n = packages.length;
  let bestShipment: T[] = [];
  let bestWeight = 0;

  function tryShipment(index: number, current: typeof packages, weight: number) {
    if (weight > maxWeight) return;

    // Prefer: 1) heavier total weight, 2) more packages (tie-break)
    if (
      weight > bestWeight ||
      (weight === bestWeight && current.length > bestShipment.length)
    ) {
      bestShipment = [...current];
      bestWeight = weight;
    }

    for (let i = index; i < n; i++) {
      const newWeight = weight + packages[i].weight;
      if (newWeight <= maxWeight) {
        tryShipment(i + 1, [...current, packages[i]], newWeight);
      }
    }
  }

  tryShipment(0, [], 0);
  return bestShipment;
}

// ── Output Parser ──────────────────────────────────────────────────────

export function parseOutput(
  output: string,
  calculationType: 'cost' | 'time',
  input: string,
  transitPackages?: TransitPackageInput[]
): ParsedResult[] {
  if (!output.trim()) return [];

  let baseCost = 100;
  let packagesMap: Map<string, Package> = new Map();

  try {
    const { baseCost: bc, packages } = parseInput(input, calculationType);
    baseCost = bc;
    packages.forEach(pkg => packagesMap.set(pkg.id, pkg));
    if (transitPackages) {
      for (const tp of transitPackages) {
        if (!packagesMap.has(tp.id)) {
          packagesMap.set(tp.id, { id: tp.id, weight: tp.weight, distance: tp.distance, offerCode: tp.offerCode });
        }
      }
    }
    if (calculationType === 'time' && transitPackages && transitPackages.length > 0) {
      try {
        const { baseCost: _bc, packages: parsedPkgs, vehicles } = parseInput(input, 'time');
        if (vehicles) {
          const { workingPackages, clearedFromTransit: cleared } = resolveTransitConflicts(parsedPkgs, transitPackages, vehicles.maxWeight);
          for (const wp of workingPackages) {
            packagesMap.set(wp.id, wp);
          }
          for (const ct of cleared) {
            packagesMap.set(ct.id, { id: ct.id, weight: ct.weight, distance: ct.distance, offerCode: ct.offerCode });
          }
        }
      } catch (_) {
        // Ignore — best effort
      }
    }
  } catch (e) {
    // If parsing fails, just use defaults
  }

  const lines = output.trim().split('\n');
  const results: ParsedResult[] = [];

  for (const line of lines) {
    const parts = line.split(/\s+/);

    if (calculationType === 'cost' && parts.length >= 3) {
      const pkgId = parts[0];
      const discount = parseInt(parts[1]);
      const totalCost = parseInt(parts[2]);

      const pkg = packagesMap.get(pkgId);
      const weight = pkg?.weight || 0;
      const distance = pkg?.distance || 0;
      const deliveryCost = totalCost + discount;

      results.push({
        id: pkgId,
        discount: discount.toString(),
        totalCost: totalCost.toFixed(2),
        offerApplied: discount > 0 ? getOfferCodeFromDiscount(deliveryCost, discount) : undefined,
        baseCost,
        weight,
        distance,
        deliveryCost,
      });
    } else if (calculationType === 'time' && parts.length >= 4) {
      const pkgId = parts[0];
      const discount = parseInt(parts[1]);
      const totalCost = parseInt(parts[2]);
      const deliveryTime = parts[3];

      const pkg = packagesMap.get(pkgId);
      const weight = pkg?.weight || 0;
      const distance = pkg?.distance || 0;
      const deliveryCost = totalCost + discount;

      results.push({
        id: pkgId,
        discount: discount.toString(),
        totalCost: totalCost.toFixed(2),
        deliveryTime: deliveryTime,
        offerApplied: discount > 0 ? getOfferCodeFromDiscount(deliveryCost, discount) : undefined,
        baseCost,
        weight,
        distance,
        deliveryCost,
      });
    }
  }

  if (calculationType === 'time' && results.length > 0) {
    try {
      const { results: deliveryResults, renamedPackages } = computeDeliveryResultsWithTransit(input, transitPackages || []);

      const renameMap = new Map<string, string>();
      for (const rp of renamedPackages) {
        renameMap.set(rp.newId.toLowerCase(), rp.oldId);
      }

      for (const result of results) {
        const match = deliveryResults.find(r => r.id === result.id);
        if (match) {
          result.deliveryRound = match.deliveryRound;
          result.vehicleId = match.vehicleId;
          result.packagesRemaining = match.packagesRemaining;
          result.currentTime = match.currentTime;
          result.vehicleReturnTime = match.vehicleReturnTime;
          result.roundTripTime = match.roundTripTime;
          result.undeliverable = match.undeliverable;
          result.undeliverableReason = match.undeliverableReason;
        }
        const originalId = renameMap.get(result.id.toLowerCase());
        if (originalId) {
          result.renamedFrom = originalId;
        }
      }
    } catch (e) {
      // If computation fails, results just won't have round/vehicle info
    }
  }

  return results;
}

export function getOfferCodeFromDiscount(deliveryCost: number, discount: number): string | undefined {
  if (discount === 0) return undefined;

  const discountPercent = (discount / deliveryCost) * 100;

  for (const [code, criteria] of Object.entries(OFFERS)) {
    if (Math.abs(discountPercent - criteria.discount) < 0.5) return code;
  }

  return 'OFFER APPLIED';
}
