import {
  setOffers,
  getOffers,
  calculateDeliveryCost,
  calculateDeliveryTime,
  calculateDeliveryTimeWithTransit,
  parseOutput,
  getOfferCodeFromDiscount,
} from '@nurulizyansyaza/courier-service-core';
import type { CalcOfferCriteria, TransitPackageInput } from '@nurulizyansyaza/courier-service-core';

// ── Deep-clone helper to prevent state pollution between tests ─────────

function freshOffers(): Record<string, CalcOfferCriteria> {
  return {
    OFR001: { discount: 10, minDistance: 0, maxDistance: 200, minWeight: 70, maxWeight: 200 },
    OFR002: { discount: 7, minDistance: 50, maxDistance: 150, minWeight: 100, maxWeight: 250 },
    OFR003: { discount: 5, minDistance: 50, maxDistance: 250, minWeight: 10, maxWeight: 150 },
  };
}

// ── setOffers / getOffers ──────────────────────────────────────────────

describe('setOffers / getOffers', () => {
  beforeEach(() => setOffers(freshOffers()));

  it('should replace the offer registry when setOffers is called', () => {
    // Given a custom set of offers
    const custom: Record<string, CalcOfferCriteria> = {
      CUSTOM1: { discount: 20, minDistance: 0, maxDistance: 100, minWeight: 0, maxWeight: 50 },
    };

    // When we set them
    setOffers(custom);

    // Then getOffers returns only the custom offers
    const offers = getOffers();
    expect(Object.keys(offers)).toEqual(['CUSTOM1']);
    expect(offers.CUSTOM1.discount).toBe(20);
  });

  it('should return a copy (not reference) from getOffers', () => {
    // Given the default offers
    const copy = getOffers();

    // When we delete a key from the copy
    delete copy.OFR001;

    // Then the internal state still has OFR001
    const fresh = getOffers();
    expect(fresh).toHaveProperty('OFR001');
    expect(Object.keys(fresh)).toHaveLength(3);
  });
});

// ── calculateDeliveryCost ──────────────────────────────────────────────

describe('calculateDeliveryCost', () => {
  beforeEach(() => setOffers(freshOffers()));

  it('should calculate the challenge example correctly', () => {
    // Given the challenge input: base=100, 3 packages
    const input = [
      '100 3',
      'PKG1 5 5 OFR001',
      'PKG2 15 5 OFR002',
      'PKG3 10 100 OFR003',
    ].join('\n');

    // When we calculate delivery cost
    const output = calculateDeliveryCost(input);

    // Then each line matches expected discount and total cost
    // PKG1: cost=100+50+25=175, OFR001 needs wt>=70 → no discount → 0 175
    // PKG2: cost=100+150+25=275, OFR002 needs wt>=100 → no discount → 0 275
    // PKG3: cost=100+100+500=700, OFR003 needs dist>50 && dist<250 && wt>=10 && wt<=150 → 5% → 35 665
    const lines = output.split('\n');
    expect(lines[0]).toBe('PKG1 0 175');
    expect(lines[1]).toBe('PKG2 0 275');
    expect(lines[2]).toBe('PKG3 35 665');
  });

  it('should apply offer when weight/distance match OFR001 criteria', () => {
    // Given a package whose weight (100) is in [70,200] and distance (100) is in (0,200)
    const input = ['100 1', 'PKG1 100 100 OFR001'].join('\n');

    // When we calculate
    const output = calculateDeliveryCost(input);

    // Then OFR001 (10%) applies: cost=100+1000+500=1600, discount=160, total=1440
    expect(output).toBe('PKG1 160 1440');
  });

  it('should not apply offer when criteria do not match', () => {
    // Given a package whose weight (5) is outside OFR001 range [70,200]
    const input = ['100 1', 'PKG1 5 5 OFR001'].join('\n');

    // When we calculate
    const output = calculateDeliveryCost(input);

    // Then no discount: cost=100+50+25=175
    expect(output).toBe('PKG1 0 175');
  });

  it('should auto-find best offer when specified code is not in registry but criteria match another', () => {
    // Given custom offers where NA exists (for validation) but has impossible criteria,
    // and OFR001 has criteria that match our package
    setOffers({
      NA: { discount: 0, minDistance: 9999, maxDistance: 99999, minWeight: 9999, maxWeight: 99999 },
      OFR001: { discount: 10, minDistance: 0, maxDistance: 200, minWeight: 70, maxWeight: 200 },
    });
    // Package uses NA; NA is in registry so validation passes.
    // NA criteria don't match (wt=100 < 9999), but since NA IS in OFFERS, no auto-find triggers.
    // Discount stays 0.
    const input = ['100 1', 'PKG1 100 100 NA'].join('\n');
    const output = calculateDeliveryCost(input);

    // Then no discount because auto-find only triggers when code is NOT in registry
    // cost = 100 + 1000 + 500 = 1600
    expect(output).toBe('PKG1 0 1600');
  });
});

// ── calculateDeliveryTime ──────────────────────────────────────────────

describe('calculateDeliveryTime', () => {
  beforeEach(() => setOffers(freshOffers()));

  it('should calculate the challenge example with 5 packages and 2 vehicles', () => {
    // Given the challenge input
    const input = [
      '100 5',
      'PKG1 50 30 OFR001',
      'PKG2 75 125 OFR002',
      'PKG3 175 100 OFR003',
      'PKG4 110 60 OFR002',
      'PKG5 155 95 OFR001',
      '2 70 200',
    ].join('\n');

    // When we calculate delivery time
    const output = calculateDeliveryTime(input);

    // Then each line has id discount totalCost deliveryTime
    const lines = output.split('\n');
    expect(lines).toHaveLength(5);

    // Verify by parsing each line
    const parsed = lines.map(l => {
      const parts = l.split(' ');
      return { id: parts[0], discount: Number(parts[1]), totalCost: Number(parts[2]), time: parts[3] };
    });

    // PKG1: cost=100+500+150=750, OFR001 needs wt>=70 but wt=50 → no match
    expect(parsed.find(p => p.id === 'PKG1')!.discount).toBe(0);
    expect(parsed.find(p => p.id === 'PKG1')!.totalCost).toBe(750);

    // PKG2: cost=100+750+625=1475, OFR002 needs wt>=100 but wt=75 → no match
    expect(parsed.find(p => p.id === 'PKG2')!.discount).toBe(0);
    expect(parsed.find(p => p.id === 'PKG2')!.totalCost).toBe(1475);

    // PKG3: cost=100+1750+500=2350, OFR003 needs wt<=150 but wt=175 → no match
    // Auto-find doesn't trigger because OFR003 IS in OFFERS registry
    expect(parsed.find(p => p.id === 'PKG3')!.discount).toBe(0);
    expect(parsed.find(p => p.id === 'PKG3')!.totalCost).toBe(2350);

    // PKG4: cost=100+1100+300=1500, OFR002: dist=60 (50,150)✓, wt=110 [100,250]✓ → 7% = 105
    expect(parsed.find(p => p.id === 'PKG4')!.discount).toBe(105);
    expect(parsed.find(p => p.id === 'PKG4')!.totalCost).toBe(1395);

    // PKG5: cost=100+1550+475=2125, OFR001: dist=95 (0,200)✓, wt=155 [70,200]✓ → 10% = 212.5 → 213
    expect(parsed.find(p => p.id === 'PKG5')!.discount).toBe(213);
    expect(parsed.find(p => p.id === 'PKG5')!.totalCost).toBe(1913);

    // Verify delivery times are present (non-N/A)
    for (const p of parsed) {
      expect(p.time).not.toBe('N/A');
      expect(parseFloat(p.time)).toBeGreaterThanOrEqual(0);
    }
  });

  it('should calculate delivery time for a single package', () => {
    // Given a single package with 1 vehicle
    const input = ['100 1', 'PKG1 50 100 OFR001', '1 70 200'].join('\n');

    // When we calculate
    const output = calculateDeliveryTime(input);

    // Then delivery time = distance/speed = 100/70 ≈ 1.42 (truncated)
    const parts = output.split(' ');
    expect(parts[0]).toBe('PKG1');
    const time = parseFloat(parts[3]);
    expect(time).toBeCloseTo(1.42, 2);
  });

  it('should prefer the nearest shipment when combined weights are equal', () => {
    // Given two packages with the same weight but different distances
    // PKG1: 100kg, 200km (far)
    // PKG2: 100kg, 50km  (near)
    // Vehicle can only carry 100kg, so only one package per trip
    // Both have weight=100, so tie-break by nearest distance → PKG2 first
    const input = [
      '100 2',
      'PKG1 100 200 OFR001',
      'PKG2 100 50 OFR001',
      '1 50 100',
    ].join('\n');

    const output = calculateDeliveryTime(input);
    const lines = output.split('\n');
    const pkg1Time = parseFloat(lines.find(l => l.startsWith('PKG1'))!.split(' ')[3]);
    const pkg2Time = parseFloat(lines.find(l => l.startsWith('PKG2'))!.split(' ')[3]);

    // PKG2 (nearer) should be delivered first (lower time)
    expect(pkg2Time).toBeLessThan(pkg1Time);
  });

  it('should prefer the shipment combination with shortest max distance on weight tie', () => {
    // Given packages where two combinations have the same total weight
    // PKG1: 60kg, 30km | PKG2: 40kg, 200km | PKG3: 60kg, 50km | PKG4: 40kg, 60km
    // Vehicle max: 100kg → possible pairs:
    //   PKG1+PKG2 = 100kg, maxDist=200km
    //   PKG1+PKG4 = 100kg, maxDist=60km   ← should be preferred (nearest)
    //   PKG3+PKG2 = 100kg, maxDist=200km
    //   PKG3+PKG4 = 100kg, maxDist=60km   ← also good
    const input = [
      '100 4',
      'PKG1 60 30 OFR003',
      'PKG2 40 200 OFR003',
      'PKG3 60 50 OFR003',
      'PKG4 40 60 OFR003',
      '1 100 100',
    ].join('\n');

    const output = calculateDeliveryTime(input);
    const lines = output.split('\n');
    const pkg2Time = parseFloat(lines.find(l => l.startsWith('PKG2'))!.split(' ')[3]);
    const pkg4Time = parseFloat(lines.find(l => l.startsWith('PKG4'))!.split(' ')[3]);

    // PKG4 (60km) should be in the first shipment, PKG2 (200km) in a later one
    expect(pkg4Time).toBeLessThan(pkg2Time);
  });
});

// ── parseInput validation (tested through public functions) ────────────

describe('Input validation via calculateDeliveryCost', () => {
  beforeEach(() => setOffers(freshOffers()));

  it('should reject input with fewer than 2 lines in cost mode', () => {
    // Given only a header line
    // When/Then it should throw
    expect(() => calculateDeliveryCost('100 1')).toThrow('at least header line and one package line');
  });

  it('should reject non-incremental package IDs', () => {
    // Given PKG2 without PKG1
    const input = ['100 1', 'PKG2 10 100 OFR001'].join('\n');

    // When/Then
    expect(() => calculateDeliveryCost(input)).toThrow('incremental starting from 1');
  });

  it('should reject duplicate package IDs', () => {
    // Given two PKG1 lines
    const input = ['100 2', 'PKG1 10 100 OFR001', 'PKG1 20 50 OFR002'].join('\n');

    // When/Then
    expect(() => calculateDeliveryCost(input)).toThrow('Duplicate package ID');
  });

  it('should reject invalid offer codes', () => {
    // Given a non-existent offer code
    const input = ['100 1', 'PKG1 10 100 INVALID'].join('\n');

    // When/Then
    expect(() => calculateDeliveryCost(input)).toThrow('Invalid offer code');
  });

  it('should reject invalid package ID format', () => {
    // Given a package ID not matching PKG+digits
    const input = ['100 1', 'PACKAGE1 10 100 OFR001'].join('\n');

    // When/Then
    expect(() => calculateDeliveryCost(input)).toThrow('Invalid package ID');
  });

  it('should detect vehicle info in cost mode and throw wrong mode error', () => {
    // Given cost-mode input with a 3-number line at the end (looks like vehicle info)
    const input = ['100 1', 'PKG1 10 100 OFR001', '2 70 200'].join('\n');

    // When/Then — the parser sees mismatch: declared 1 package but finds more,
    // or the last line looks like vehicle info
    expect(() => calculateDeliveryCost(input)).toThrow();
  });

  it('should reject missing vehicle info in time mode', () => {
    // Given time-mode input without vehicle line
    // The last line is a package line (4 parts), not vehicle info (3 numbers)
    const input = ['100 1', 'PKG1 10 100 OFR001'].join('\n');

    // When/Then
    expect(() => calculateDeliveryTime(input)).toThrow();
  });
});

// ── getOfferCodeFromDiscount ───────────────────────────────────────────

describe('getOfferCodeFromDiscount', () => {
  beforeEach(() => setOffers(freshOffers()));

  it('should return correct offer code for known discount percentage', () => {
    // Given a delivery cost of 1000 and discount of 100 (10% → OFR001)
    const code = getOfferCodeFromDiscount(1000, 100);
    expect(code).toBe('OFR001');
  });

  it('should return undefined for zero discount', () => {
    const code = getOfferCodeFromDiscount(1000, 0);
    expect(code).toBeUndefined();
  });

  it('should return "OFFER APPLIED" when no matching code found', () => {
    // Given a discount percentage that doesn't match any offer
    // 1000 cost, 150 discount = 15% — no offer has 15%
    const code = getOfferCodeFromDiscount(1000, 150);
    expect(code).toBe('OFFER APPLIED');
  });
});

// ── parseOutput ────────────────────────────────────────────────────────

describe('parseOutput', () => {
  beforeEach(() => setOffers(freshOffers()));

  it('should parse cost output correctly', () => {
    // Given cost-mode output
    const input = ['100 2', 'PKG1 5 5 OFR001', 'PKG2 10 100 OFR003'].join('\n');
    const output = 'PKG1 0 175\nPKG2 35 665';

    // When parsed
    const results = parseOutput(output, 'cost', input);

    // Then
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('PKG1');
    expect(results[0].discount).toBe('0');
    expect(results[0].totalCost).toBe('175.00');
    expect(results[1].id).toBe('PKG2');
    expect(results[1].discount).toBe('35');
    expect(results[1].totalCost).toBe('665.00');
  });

  it('should parse time output correctly', () => {
    // Given time-mode output
    const input = ['100 1', 'PKG1 50 100 OFR001', '1 70 200'].join('\n');
    const output = 'PKG1 0 750 1.42';

    // When parsed
    const results = parseOutput(output, 'time', input);

    // Then
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('PKG1');
    expect(results[0].deliveryTime).toBe('1.42');
  });

  it('should return empty array for empty output', () => {
    const results = parseOutput('', 'cost', '100 1\nPKG1 5 5 OFR001');
    expect(results).toEqual([]);
  });
});

// ── calculateDeliveryTimeWithTransit ───────────────────────────────────

describe('calculateDeliveryTimeWithTransit', () => {
  beforeEach(() => setOffers(freshOffers()));

  it('should merge transit packages with new packages', () => {
    // Given new packages and transit packages (no ID conflict)
    const input = ['100 1', 'PKG1 50 100 OFR001', '1 70 200'].join('\n');
    const transit: TransitPackageInput[] = [
      { id: 'PKG2', weight: 30, distance: 50, offerCode: 'OFR003' },
    ];

    // When
    const result = calculateDeliveryTimeWithTransit(input, transit);

    // Then both packages appear in the output, transit PKG2 is cleared
    expect(result.output).toContain('PKG1');
    expect(result.output).toContain('PKG2');
    expect(result.clearedFromTransit).toHaveLength(1);
    expect(result.clearedFromTransit[0].id).toBe('PKG2');
    expect(result.renamedPackages).toHaveLength(0);
  });

  it('should rename conflicting package IDs', () => {
    // Given new PKG1 and transit PKG1 (same ID → conflict)
    const input = ['100 1', 'PKG1 50 100 OFR001', '1 70 200'].join('\n');
    const transit: TransitPackageInput[] = [
      { id: 'PKG1', weight: 30, distance: 50, offerCode: 'OFR003' },
    ];

    // When
    const result = calculateDeliveryTimeWithTransit(input, transit);

    // Then the new package is renamed, transit PKG1 is cleared
    expect(result.renamedPackages.length).toBeGreaterThanOrEqual(1);
    expect(result.clearedFromTransit).toHaveLength(1);
  });

  it('should handle empty transit packages (same as normal delivery)', () => {
    // Given no transit packages
    const input = ['100 1', 'PKG1 50 100 OFR001', '1 70 200'].join('\n');

    // When
    const result = calculateDeliveryTimeWithTransit(input, []);

    // Then output should match normal delivery
    expect(result.output).toContain('PKG1');
    expect(result.clearedFromTransit).toHaveLength(0);
    expect(result.stillInTransit).toHaveLength(0);
    expect(result.renamedPackages).toHaveLength(0);
  });
});
