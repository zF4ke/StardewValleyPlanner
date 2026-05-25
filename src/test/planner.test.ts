import { describe, expect, it } from 'vitest';
import {
  harvestOffsets,
  offsetToDate,
  planCrop,
  qualitySellPrice,
  rankCrops,
  remainingValidDays,
} from '../domain/planner';
import { Crop, PlannerInput } from '../domain/types';
import { CROPS } from '../data/crops';
import { DEFAULT_ENABLED } from '../components/Filters';

const PARSNIP: Crop = {
  name: 'Test Parsnip', seasons: ['Spring'], growthDays: 4, seedCost: 20,
  sellPrice: 35, producePerHarvest: 1, source: 'Pierre',
};
const CORN: Crop = {
  name: 'Test Corn', seasons: ['Summer', 'Fall'], growthDays: 14, regrowthDays: 4,
  seedCost: 150, sellPrice: 50, producePerHarvest: 1, source: 'Pierre',
};
const COFFEE: Crop = {
  name: 'Test Coffee', seasons: ['Spring', 'Summer'], growthDays: 10, regrowthDays: 2,
  seedCost: 2500, sellPrice: 15, producePerHarvest: 4, source: 'TravelingCart',
};

describe('date math', () => {
  it('parsnip planted Spring 1 harvests Spring 5 (4 day growth → planting day not counted)', () => {
    const offs = harvestOffsets(PARSNIP, 'Spring', 1);
    expect(offs).toEqual([4]);
    expect(offsetToDate('Spring', 1, 4)).toBe('Spring 5');
  });

  it('crop too late in season is excluded', () => {
    const offs = harvestOffsets(PARSNIP, 'Spring', 26); // 28-26=2 days left, need 4
    expect(offs).toEqual([]);
  });

  it('regrowth crops produce repeated harvests at the correct intervals', () => {
    // Blueberry: 13 + 4n, planted Summer 1, window = 27
    const blueberry = CROPS.find((c) => c.name === 'Blueberry')!;
    const offs = harvestOffsets(blueberry, 'Summer', 1);
    expect(offs).toEqual([13, 17, 21, 25]);
  });

  it('Corn can cross Summer into Fall and keep regrowing', () => {
    const offs = harvestOffsets(CORN, 'Summer', 20);
    // Window: (28-20)+28 = 36 days. First at 14, then 18,22,26,30,34.
    expect(offs[0]).toBe(14);
    expect(offs[offs.length - 1]).toBeLessThanOrEqual(36);
    expect(offs).toContain(34);
  });

  it('Coffee crosses Spring into Summer but stops at Fall', () => {
    const offs = harvestOffsets(COFFEE, 'Spring', 25);
    // Window: (28-25)+28 = 31 days. First at 10, regrow every 2.
    expect(offs[0]).toBe(10);
    expect(offs[offs.length - 1]).toBeLessThanOrEqual(31);
    // No harvest beyond 31 (Fall starts at offset 32).
    expect(offs.every((o) => o <= 31)).toBe(true);
  });

  it('remainingValidDays counts only contiguous valid seasons', () => {
    expect(remainingValidDays('Spring', 1, ['Spring'])).toBe(27);
    expect(remainingValidDays('Spring', 1, ['Spring', 'Summer'])).toBe(27 + 28);
    // Skipping Summer breaks the chain
    expect(remainingValidDays('Spring', 1, ['Spring', 'Fall'])).toBe(27);
  });
});

describe('money math', () => {
  const baseInput: PlannerInput = {
    season: 'Spring', day: 1, money: 100, quality: 'Regular', enabledSources: ['Pierre'],
  };

  it('insufficient money produces null (zero purchasable seeds)', () => {
    const plan = planCrop(PARSNIP, { ...baseInput, money: 10 }); // < 20g
    expect(plan).toBeNull();
  });

  it('final money equals leftover cash plus harvest revenue (no reinvestment)', () => {
    const plan = planCrop(PARSNIP, { ...baseInput, money: 100 })!;
    expect(plan.seedsBought).toBe(5); // 100/20
    expect(plan.seedSpend).toBe(100);
    expect(plan.moneyAfterBuying).toBe(0);
    expect(plan.totalProduce).toBe(5); // 5 seeds × 1 × 1 harvest
    expect(plan.revenue).toBe(5 * 35);
    expect(plan.finalMoney).toBe(plan.moneyAfterBuying + plan.revenue);
    expect(plan.netProfit).toBe(plan.finalMoney - 100);
  });

  it('quality multipliers floor-apply to unit sell price', () => {
    expect(qualitySellPrice(PARSNIP, 'Regular')).toBe(35);
    expect(qualitySellPrice(PARSNIP, 'Silver')).toBe(Math.floor(35 * 1.25));
    expect(qualitySellPrice(PARSNIP, 'Gold')).toBe(Math.floor(35 * 1.5));
    expect(qualitySellPrice(PARSNIP, 'Iridium')).toBe(70);
  });
});

describe('ranking', () => {
  it('default ranking is net profit descending', () => {
    const input: PlannerInput = {
      season: 'Spring', day: 1, money: 5000, quality: 'Regular', enabledSources: DEFAULT_ENABLED,
    };
    const plans = rankCrops(CROPS, input);
    expect(plans.length).toBeGreaterThan(1);
    for (let i = 1; i < plans.length; i++) {
      expect(plans[i - 1].netProfit).toBeGreaterThanOrEqual(plans[i].netProfit);
    }
  });
});

describe('filters', () => {
  const input: PlannerInput = {
    season: 'Spring', day: 1, money: 100000, quality: 'Regular', enabledSources: DEFAULT_ENABLED,
  };

  it('default normal-shop filter excludes Strawberry/Rhubarb/Starfruit/Sweet Gem Berry', () => {
    const names = new Set(rankCrops(CROPS, input).map((p) => p.crop.name));
    expect(names.has('Strawberry')).toBe(false);
    expect(names.has('Rhubarb')).toBe(false);
    expect(names.has('Starfruit')).toBe(false);
    expect(names.has('Sweet Gem Berry')).toBe(false);
  });

  it('enabling Oasis reveals Rhubarb in Spring', () => {
    const names = new Set(
      rankCrops(CROPS, { ...input, enabledSources: [...DEFAULT_ENABLED, 'Oasis'] }).map((p) => p.crop.name)
    );
    expect(names.has('Rhubarb')).toBe(true);
  });

  it('Winter with default filter yields no plantable crops', () => {
    const winter = rankCrops(CROPS, { ...input, season: 'Winter' });
    expect(winter.length).toBe(0);
  });
});
