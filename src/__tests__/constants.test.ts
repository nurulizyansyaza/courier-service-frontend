import {
  DEFAULT_OFFERS,
  DEFAULT_SESSION,
  WELCOME_LINES,
  FRAMEWORK_CONFIG,
  FALLBACK_SESSION_CONTEXT,
  MOTORCYCLE_ART,
  COURIER_ART,
  FRAMEWORK_COLORS,
} from '@/core/constants';

describe('Constants', () => {
  describe('DEFAULT_OFFERS', () => {
    it('should have 3 offers: OFR001, OFR002, OFR003', () => {
      expect(DEFAULT_OFFERS).toHaveLength(3);
      const codes = DEFAULT_OFFERS.map(o => o.code);
      expect(codes).toEqual(['OFR001', 'OFR002', 'OFR003']);
    });
  });

  describe('DEFAULT_SESSION', () => {
    it('should have offers matching DEFAULT_OFFERS', () => {
      expect(DEFAULT_SESSION.offers).toEqual(DEFAULT_OFFERS);
    });
  });

  describe('WELCOME_LINES', () => {
    it('should be a non-empty array of HistoryLine objects', () => {
      expect(Array.isArray(WELCOME_LINES)).toBe(true);
      expect(WELCOME_LINES.length).toBeGreaterThan(0);
      for (const line of WELCOME_LINES) {
        expect(line).toHaveProperty('type');
        expect(line).toHaveProperty('text');
      }
    });
  });

  describe('FRAMEWORK_CONFIG', () => {
    it('should have react, vue, svelte keys', () => {
      expect(FRAMEWORK_CONFIG).toHaveProperty('react');
      expect(FRAMEWORK_CONFIG).toHaveProperty('vue');
      expect(FRAMEWORK_CONFIG).toHaveProperty('svelte');

      for (const key of ['react', 'vue', 'svelte'] as const) {
        expect(FRAMEWORK_CONFIG[key]).toHaveProperty('label');
        expect(FRAMEWORK_CONFIG[key]).toHaveProperty('color');
        expect(FRAMEWORK_CONFIG[key]).toHaveProperty('bgColor');
        expect(FRAMEWORK_CONFIG[key]).toHaveProperty('borderColor');
      }
    });
  });

  describe('FALLBACK_SESSION_CONTEXT', () => {
    it('should have empty offers and no-op getOffersForCalculation', () => {
      expect(FALLBACK_SESSION_CONTEXT.session.offers).toEqual([]);
      const result = FALLBACK_SESSION_CONTEXT.getOffersForCalculation();
      expect(result).toEqual({});
    });
  });

  describe('MOTORCYCLE_ART', () => {
    it('should be a non-empty string', () => {
      expect(typeof MOTORCYCLE_ART).toBe('string');
      expect(MOTORCYCLE_ART.length).toBeGreaterThan(0);
    });
  });

  describe('COURIER_ART', () => {
    it('should be a non-empty string containing "CLI Version"', () => {
      expect(typeof COURIER_ART).toBe('string');
      expect(COURIER_ART.length).toBeGreaterThan(0);
      expect(COURIER_ART).toContain('CLI Version');
    });
  });

  describe('FRAMEWORK_COLORS', () => {
    it('should have react, vue, svelte keys with color strings', () => {
      expect(FRAMEWORK_COLORS).toHaveProperty('react');
      expect(FRAMEWORK_COLORS).toHaveProperty('vue');
      expect(FRAMEWORK_COLORS).toHaveProperty('svelte');
      expect(typeof FRAMEWORK_COLORS.react).toBe('string');
      expect(typeof FRAMEWORK_COLORS.vue).toBe('string');
      expect(typeof FRAMEWORK_COLORS.svelte).toBe('string');
    });
  });
});
