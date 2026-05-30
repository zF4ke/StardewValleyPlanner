import { describe, expect, it } from 'vitest';
import {
  calendarEvents,
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
import { FERTILIZER_BY_ID, qualityMix } from '../data/fertilizers';

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
    farmingLevel: 0, fertilizerId: 'none',
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
    // EV revenue: at farming level 0, no fertilizer, wiki formula gives
    // 97.02% Regular, 1.98% Silver, 1% Gold.
    const mix = qualityMix(0, 0);
    const expectedMult = mix.regular + mix.silver * 1.25 + mix.gold * 1.5;
    expect(plan.revenue).toBeCloseTo(5 * 35 * expectedMult, 5);
    expect(plan.finalMoney).toBe(plan.moneyAfterBuying + plan.revenue);
    expect(plan.netProfit).toBe(plan.finalMoney - 100);
  });

  it('max tiles caps the initial seed purchase', () => {
    const plan = planCrop(PARSNIP, { ...baseInput, money: 1000, maxTiles: 10 })!;
    expect(plan.seedsBought).toBe(10);
    expect(plan.totalSeedPurchases).toBe(10);
    expect(plan.seedSpend).toBe(200);
    expect(plan.tileLimitHit).toBe(true);
  });

  it('blank max tiles preserves unlimited seed purchase behavior', () => {
    const plan = planCrop(PARSNIP, { ...baseInput, money: 1000 })!;
    expect(plan.seedsBought).toBe(50);
    expect(plan.maxTiles).toBeUndefined();
  });

  it('zero max tiles produces no plan', () => {
    const plan = planCrop(PARSNIP, { ...baseInput, money: 1000, maxTiles: 0 });
    expect(plan).toBeNull();
  });

  it('replants the same crop on freed tiles while another cycle fits', () => {
    const plan = planCrop(PARSNIP, {
      ...baseInput,
      money: 1000,
      maxTiles: 10,
      allowReplanting: true,
    })!;
    expect(plan.plantingCount).toBe(6);
    expect(plan.plantingOffsets).toEqual([0, 4, 8, 12, 16, 20]);
    expect(plan.harvestDays).toEqual([4, 8, 12, 16, 20, 24]);
    expect(plan.totalSeedPurchases).toBe(60);
    expect(plan.seedSpend).toBe(1200);
  });

  it('replanting buys fewer seeds if harvest gold cannot refill every tile', () => {
    const poorCrop: Crop = { ...PARSNIP, seedCost: 100, sellPrice: 80 };
    const plan = planCrop(poorCrop, {
      ...baseInput,
      money: 150,
      maxTiles: 10,
      allowReplanting: true,
    })!;
    expect(plan.plantingCount).toBeGreaterThan(1);
    expect(plan.totalSeedPurchases).toBeGreaterThan(1);
    expect(plan.totalSeedPurchases).toBeLessThan(plan.plantingCount * 10);
  });

  it('replanting consumes limited fertilizer across earliest plantings first', () => {
    const plan = planCrop(PARSNIP, {
      ...baseInput,
      money: 1000,
      maxTiles: 10,
      allowReplanting: true,
      fertilizerId: 'quality',
      fertilizerAmount: 12,
    })!;
    expect(plan.totalSeedPurchases).toBe(60);
    expect(plan.fertilizedSeeds).toBe(12);
    expect(plan.unfertilizedSeeds).toBe(48);
    expect(plan.fertilizerRequired).toBe(60);
  });

  it('regrowth crops do not rebuy seeds after every regrowth harvest', () => {
    const plan = planCrop(CORN, {
      season: 'Summer', day: 1, money: 10000, quality: 'Regular',
      enabledSources: ['Pierre'], farmingLevel: 0, fertilizerId: 'none',
      maxTiles: 10, allowReplanting: true,
    })!;
    expect(plan.seedsBought).toBe(10);
    expect(plan.plantingCount).toBe(1);
    expect(plan.plantingOffsets).toEqual([0]);
    expect(plan.harvestDays.length).toBeGreaterThan(1);
  });

  it('quality multipliers floor-apply to unit sell price', () => {
    expect(qualitySellPrice(PARSNIP, 'Regular')).toBe(35);
    expect(qualitySellPrice(PARSNIP, 'Silver')).toBe(Math.floor(35 * 1.25));
    expect(qualitySellPrice(PARSNIP, 'Gold')).toBe(Math.floor(35 * 1.5));
    expect(qualitySellPrice(PARSNIP, 'Iridium')).toBe(70);
  });
});

describe('calendar events', () => {
  it('5-day crop on day 1 marks plant day 1, water days 2-5, harvest day 6', () => {
    const fiveDay = { ...PARSNIP, growthDays: 5 };
    const evs = calendarEvents(fiveDay, 'Spring', 1);
    const plant = evs.filter((e) => e.kind === 'plant').map((e) => e.day);
    const water = evs.filter((e) => e.kind === 'water').map((e) => e.day);
    const harvest = evs.filter((e) => e.kind === 'harvest').map((e) => e.day);
    expect(plant).toEqual([1]);
    expect(water).toEqual([2, 3, 4, 5]);
    expect(harvest).toEqual([6]);
  });

  it('regrowth crops mark first harvest and regrowHarvest separately', () => {
    const blueberry = CROPS.find((c) => c.name === 'Blueberry')!;
    const evs = calendarEvents(blueberry, 'Summer', 1);
    const firsts = evs.filter((e) => e.kind === 'harvest').map((e) => e.day);
    const regrows = evs.filter((e) => e.kind === 'regrowHarvest').map((e) => e.day);
    expect(firsts).toEqual([14]);            // planted day 1, harvest at day 1 + 13
    expect(regrows).toEqual([18, 22, 26]);
  });

  it('crop that cannot mature before season end yields no events', () => {
    const evs = calendarEvents(PARSNIP, 'Spring', 26);
    expect(evs).toEqual([]);
  });

  it('multi-season crop still produces correct harvest days beyond day 28', () => {
    const evs = calendarEvents(CORN, 'Summer', 20);
    // First harvest at 20 + 14 = day 34 (Fall 6 effectively).
    const firstHarvest = evs.find((e) => e.kind === 'harvest');
    expect(firstHarvest?.day).toBe(34);
  });

  it('Tea Sapling only produces during the last week of valid seasons', () => {
    const tea = CROPS.find((c) => c.name === 'Tea Sapling')!;
    const offs = harvestOffsets(tea, 'Spring', 1);
    expect(offs.slice(0, 7)).toEqual([21, 22, 23, 24, 25, 26, 27]);
    expect(offs).not.toContain(28); // Summer 1 is not a Tea Leaves day.
    expect(offs).toContain(49);     // Summer 22.
    const evs = calendarEvents(tea, 'Spring', 1);
    expect(evs.some((e) => e.kind === 'water')).toBe(false);
  });
});

describe('ranking', () => {
  it('default ranking is net profit descending', () => {
    const input: PlannerInput = {
      season: 'Spring', day: 1, money: 5000, quality: 'Regular', enabledSources: DEFAULT_ENABLED,
      farmingLevel: 0, fertilizerId: 'none',
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
    farmingLevel: 0, fertilizerId: 'none',
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

describe('fertilizer & quality EV', () => {
  const base: PlannerInput = {
    season: 'Spring', day: 1, money: 1000, quality: 'Regular', enabledSources: ['Pierre'],
    farmingLevel: 0, fertilizerId: 'none',
  };

  it('quality mix probabilities sum to 1', () => {
    for (const lvl of [0, 1, 2, 3] as const) {
      for (const f of [0, 5, 10]) {
        const m = qualityMix(f, lvl);
        const sum = m.regular + m.silver + m.gold + m.iridium;
        expect(sum).toBeGreaterThan(0.999);
        expect(sum).toBeLessThan(1.001);
      }
    }
  });

  it('Deluxe Fertilizer can give iridium and never regular', () => {
    const m = qualityMix(10, 3);
    expect(m.iridium).toBeGreaterThan(0);
    expect(m.regular).toBe(0);
  });

  it('quality formula matches wiki examples after rounding to whole percentages', () => {
    const bare0 = qualityMix(0, 0);
    expect(Math.round(bare0.regular * 100)).toBe(97);
    expect(Math.round(bare0.silver * 100)).toBe(2);
    expect(Math.round(bare0.gold * 100)).toBe(1);

    const quality10 = qualityMix(10, 2);
    expect(Math.round(quality10.regular * 100)).toBe(10);
    expect(Math.round(quality10.silver * 100)).toBe(29);
    expect(Math.round(quality10.gold * 100)).toBe(61);

    const deluxe0 = qualityMix(0, 3);
    expect(Math.round(deluxe0.regular * 100)).toBe(0);
    expect(Math.round(deluxe0.silver * 100)).toBe(84);
    expect(Math.round(deluxe0.gold * 100)).toBe(10);
    expect(Math.round(deluxe0.iridium * 100)).toBe(6);
  });

  it('fertilizer prices and recipes match the wiki table', () => {
    expect(FERTILIZER_BY_ID.quality.recipe).toEqual({
      ingredients: [{ id: 'Sap', qty: 4 }, { id: 'Fish', qty: 1 }],
      outputs: 2,
    });
    expect(FERTILIZER_BY_ID['deluxe-speed'].recipe).toEqual({
      ingredients: [{ id: 'OakResin', qty: 1 }, { id: 'BoneFragment', qty: 5 }],
      outputs: 5,
    });
    expect(FERTILIZER_BY_ID['hyper-speed'].recipe).toEqual({
      ingredients: [{ id: 'RadioactiveOre', qty: 1 }, { id: 'BoneFragment', qty: 3 }, { id: 'SolarEssence', qty: 1 }],
      outputs: 1,
    });
    expect(FERTILIZER_BY_ID.deluxe.sellPrice).toBe(70);
    expect(FERTILIZER_BY_ID['deluxe-retain'].sellPrice).toBe(30);
    expect(FERTILIZER_BY_ID['basic-retain'].recipe?.outputs).toBe(1);
  });

  it('Speed-Gro shortens first harvest only, not regrowth interval', () => {
    // Blueberry: growth 13, regrow 4.
    const blueberry = CROPS.find((c) => c.name === 'Blueberry')!;
    const noSpeed = planCrop(blueberry, { ...base, season: 'Summer', money: 10000 })!;
    const speed = planCrop(blueberry, { ...base, season: 'Summer', money: 10000, fertilizerId: 'deluxe-speed' })!;
    // deluxe-speed = 25% off 13 = 3 days off → first harvest at day 10 instead of 13
    expect(speed.effectiveGrowthDays).toBe(10);
    expect(noSpeed.harvestDays[0]).toBe(13);
    expect(speed.harvestDays[0]).toBe(10);
    // Regrowth interval unchanged: subsequent harvests still 4 days apart.
    for (let i = 1; i < speed.harvestDays.length; i++) {
      expect(speed.harvestDays[i] - speed.harvestDays[i - 1]).toBe(4);
    }
  });

  it('limited fertilizer splits seeds into fertilized + bare', () => {
    const plan = planCrop(
      CROPS.find((c) => c.name === 'Parsnip')!,
      { ...base, money: 1000, fertilizerId: 'quality', fertilizerAmount: 10 }
    )!;
    // 1000/20 = 50 seeds, only 10 fertilized.
    expect(plan.seedsBought).toBe(50);
    expect(plan.fertilizedSeeds).toBe(10);
    expect(plan.unfertilizedSeeds).toBe(40);
    expect(plan.fertilizerRequired).toBe(50);
  });

  it('unlimited fertilizer fertilizes every seed', () => {
    const plan = planCrop(
      CROPS.find((c) => c.name === 'Parsnip')!,
      { ...base, money: 1000, fertilizerId: 'basic' }
    )!;
    expect(plan.fertilizedSeeds).toBe(plan.seedsBought);
    expect(plan.unfertilizedSeeds).toBe(0);
  });

  it('quality fertilizer raises expected unit value at higher farming levels', () => {
    const parsnip = CROPS.find((c) => c.name === 'Parsnip')!;
    const lo = planCrop(parsnip, { ...base, farmingLevel: 0, fertilizerId: 'quality' })!;
    const hi = planCrop(parsnip, { ...base, farmingLevel: 10, fertilizerId: 'quality' })!;
    expect(hi.expectedUnitValueFertilized).toBeGreaterThan(lo.expectedUnitValueFertilized);
  });
});

describe('patch notes', () => {
  it('has a current version and every release has at least one bullet', async () => {
    const { PATCH_NOTES, CURRENT_VERSION } = await import('../data/patchNotes');
    expect(CURRENT_VERSION).toMatch(/^v\d+\.\d+\.\d+/);
    expect(PATCH_NOTES.length).toBeGreaterThan(0);
    expect(PATCH_NOTES[0].version).toBe(CURRENT_VERSION);
    for (const p of PATCH_NOTES) {
      expect(p.bullets.length).toBeGreaterThan(0);
      expect(p.title.length).toBeGreaterThan(0);
    }
  });
});

describe('tracked crops', () => {
  it('validateTrackedCrop defaults missing fields and clamps season/day/farming level', async () => {
    const { validateTrackedCrop } = await import('../data/trackedCrops');
    const out = validateTrackedCrop({
      id: 'x', cropName: 'Parsnip',
      season: 'Bogus', day: 99,
      farmingLevel: 50, fertilizerId: 'nonsense',
      fertilizerAmount: 'huh', seedsBought: -5,
    });
    expect(out).not.toBeNull();
    expect(out!.season).toBe('Spring');
    expect(out!.day).toBe(28);
    expect(out!.farmingLevel).toBe(14);
    expect(out!.fertilizerId).toBe('none');
    expect(out!.fertilizerAmount).toBeUndefined();
    expect(out!.seedsBought).toBe(0);
  });

  it('validateTrackedCrop rejects entries missing id or cropName', async () => {
    const { validateTrackedCrop } = await import('../data/trackedCrops');
    expect(validateTrackedCrop(null)).toBeNull();
    expect(validateTrackedCrop({ id: 'x' })).toBeNull();
    expect(validateTrackedCrop({ cropName: 'Parsnip' })).toBeNull();
  });

  it('round-trips through JSON without losing inputs', async () => {
    const { createTrackedCrop, validateTrackedCrop } = await import('../data/trackedCrops');
    const t = createTrackedCrop({
      cropName: 'Blueberry', season: 'Summer', day: 1,
      farmingLevel: 8, fertilizerId: 'quality', fertilizerAmount: 20,
      seedsBought: 50,
    });
    const r = validateTrackedCrop(JSON.parse(JSON.stringify(t)))!;
    expect(r.cropName).toBe('Blueberry');
    expect(r.season).toBe('Summer');
    expect(r.day).toBe(1);
    expect(r.farmingLevel).toBe(8);
    expect(r.fertilizerId).toBe('quality');
    expect(r.fertilizerAmount).toBe(20);
    expect(r.seedsBought).toBe(50);
  });

  it('advanceDay handles season and year wrap', async () => {
    const { advanceDay } = await import('../data/trackedCrops');
    expect(advanceDay({ season: 'Spring', day: 28, year: 1 }, 1))
      .toEqual({ season: 'Summer', day: 1, year: 1 });
    expect(advanceDay({ season: 'Winter', day: 28, year: 1 }, 1))
      .toEqual({ season: 'Spring', day: 1, year: 2 });
    expect(advanceDay({ season: 'Summer', day: 1, year: 1 }, -1))
      .toEqual({ season: 'Spring', day: 28, year: 1 });
  });

  it('validateToday clamps day and defaults bad season', async () => {
    const { validateToday } = await import('../data/trackedCrops');
    expect(validateToday({ season: 'Bogus', day: 99, year: -1 }))
      .toEqual({ season: 'Spring', day: 28, year: 1 });
  });
});

describe('planner input persistence', () => {
  it('defaults maxSeasons to 4 seasons', async () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: { getItem: () => null, setItem: () => undefined },
      configurable: true,
    });
    const { loadPlannerInputs } = await import('../data/plannerInputs');
    expect(loadPlannerInputs().maxSeasons).toBe(4);
    delete (globalThis as { localStorage?: Storage }).localStorage;
  });

  it('migrates saved maxYears to equivalent maxSeasons', async () => {
    const storage = {
      getItem: () => JSON.stringify({
        season: 'Spring',
        day: 1,
        money: 500,
        quality: 'Regular',
        farmingLevel: 0,
        fertilizerId: 'none',
        enabledSources: ['Pierre'],
        processingMode: 'raw',
        maxYears: 3,
      }),
      setItem: () => undefined,
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true,
    });
    const { loadPlannerInputs } = await import('../data/plannerInputs');
    expect(loadPlannerInputs().maxSeasons).toBe(12);
    delete (globalThis as { localStorage?: Storage }).localStorage;
  });

  it('loads max tiles and replanting preferences', async () => {
    const storage = {
      getItem: () => JSON.stringify({
        season: 'Spring',
        day: 1,
        money: 500,
        quality: 'Regular',
        farmingLevel: 0,
        fertilizerId: 'none',
        enabledSources: ['Pierre'],
        processingMode: 'raw',
        maxTiles: 32,
        allowReplanting: true,
      }),
      setItem: () => undefined,
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true,
    });
    const { loadPlannerInputs } = await import('../data/plannerInputs');
    expect(loadPlannerInputs().maxTiles).toBe(32);
    expect(loadPlannerInputs().allowReplanting).toBe(true);
    delete (globalThis as { localStorage?: Storage }).localStorage;
  });
});

describe('artisan processing — product mapping', () => {
  it('Wine is produced by fruits like Melon, Starfruit, Ancient Fruit', () => {
    for (const name of ['Melon', 'Starfruit', 'Ancient Fruit']) {
      const c = CROPS.find((x) => x.name === name)!;
      expect(c.kegProduct).toBe('wine');
      expect(c.caskable).toBe(true);
    }
  });

  it('Wheat makes Beer, Hops makes Pale Ale, Tea Sapling makes Green Tea, Coffee uses 5 beans', () => {
    expect(CROPS.find((x) => x.name === 'Wheat')!.kegProduct).toBe('beer');
    expect(CROPS.find((x) => x.name === 'Hops')!.kegProduct).toBe('pale-ale');
    expect(CROPS.find((x) => x.name === 'Tea Sapling')!.kegProduct).toBe('green-tea');
    const coffee = CROPS.find((x) => x.name === 'Coffee Bean')!;
    expect(coffee.kegProduct).toBe('coffee');
    expect(coffee.kegInputCount).toBe(5);
  });

  it('Flowers and Sweet Gem Berry have no keg product', () => {
    for (const name of ['Tulip', 'Poppy', 'Fairy Rose', 'Sweet Gem Berry']) {
      const c = CROPS.find((x) => x.name === name)!;
      expect(c.kegProduct).toBe('none');
    }
  });
});

describe('artisan processing — pricing', () => {
  it('Grape Wine matches the wiki: 240/300/360/480g, Artisan 336/420/504/672g', async () => {
    const { processedUnitPrice } = await import('../data/processing');
    const grape = CROPS.find((c) => c.name === 'Grape')!;
    expect(processedUnitPrice(grape, 'keg', false)).toBe(240);
    expect(processedUnitPrice(grape, 'silver-aged', false)).toBe(300);
    expect(processedUnitPrice(grape, 'gold-aged', false)).toBe(360);
    expect(processedUnitPrice(grape, 'iridium-aged', false)).toBe(480);
    expect(processedUnitPrice(grape, 'keg', true)).toBe(336);
    expect(processedUnitPrice(grape, 'silver-aged', true)).toBe(420);
    expect(processedUnitPrice(grape, 'gold-aged', true)).toBe(504);
    expect(processedUnitPrice(grape, 'iridium-aged', true)).toBe(672);
  });

  it('Starfruit Wine = 2250g; Iridium = 4500g; with Artisan = 6300g', async () => {
    const { processedUnitPrice } = await import('../data/processing');
    const starfruit = CROPS.find((c) => c.name === 'Starfruit')!;
    expect(processedUnitPrice(starfruit, 'keg', false)).toBe(2250);
    expect(processedUnitPrice(starfruit, 'iridium-aged', false)).toBe(4500);
    expect(processedUnitPrice(starfruit, 'iridium-aged', true)).toBe(6300);
  });

  it('Pumpkin Juice matches the wiki: 720g, or 1008g with Artisan', async () => {
    const { processedUnitPrice } = await import('../data/processing');
    const pumpkin = CROPS.find((c) => c.name === 'Pumpkin')!;
    expect(processedUnitPrice(pumpkin, 'keg', false)).toBe(720);
    expect(processedUnitPrice(pumpkin, 'keg', true)).toBe(1008);
    expect(processedUnitPrice(pumpkin, 'iridium-aged', true)).toBe(1008);
  });

  it('Parsnip Juice uses Stardew floor-ordering: 78g, or 109g with Artisan', async () => {
    const { processedUnitPrice } = await import('../data/processing');
    const parsnip = CROPS.find((c) => c.name === 'Parsnip')!;
    expect(processedUnitPrice(parsnip, 'keg', false)).toBe(78);
    expect(processedUnitPrice(parsnip, 'keg', true)).toBe(109);
  });

  it('Keg machine times match the wiki minute values for Wine and Juice', async () => {
    const { KEG_MINUTES } = await import('../data/processing');
    expect(KEG_MINUTES.wine).toBe(10000);
    expect(KEG_MINUTES.juice).toBe(6000);
  });

  it('Beer aging tiers: 200/250/300/400g', async () => {
    const { processedUnitPrice } = await import('../data/processing');
    const wheat = CROPS.find((c) => c.name === 'Wheat')!;
    expect(processedUnitPrice(wheat, 'keg', false)).toBe(200);
    expect(processedUnitPrice(wheat, 'silver-aged', false)).toBe(250);
    expect(processedUnitPrice(wheat, 'gold-aged', false)).toBe(300);
    expect(processedUnitPrice(wheat, 'iridium-aged', false)).toBe(400);
  });

  it('Pale Ale aging tiers: 300/375/450/600g', async () => {
    const { processedUnitPrice } = await import('../data/processing');
    const hops = CROPS.find((c) => c.name === 'Hops')!;
    expect(processedUnitPrice(hops, 'keg', false)).toBe(300);
    expect(processedUnitPrice(hops, 'silver-aged', false)).toBe(375);
    expect(processedUnitPrice(hops, 'gold-aged', false)).toBe(450);
    expect(processedUnitPrice(hops, 'iridium-aged', false)).toBe(600);
  });

  it('Coffee does not receive Artisan bonus', async () => {
    const { processedUnitPrice } = await import('../data/processing');
    const coffeeBean = CROPS.find((c) => c.name === 'Coffee Bean')!;
    expect(processedUnitPrice(coffeeBean, 'keg', false)).toBe(150);
    expect(processedUnitPrice(coffeeBean, 'keg', true)).toBe(150);
  });

  it('Coffee processing counts cups, not beans', () => {
    const coffeeBean = CROPS.find((c) => c.name === 'Coffee Bean')!;
    const plan = planCrop(coffeeBean, {
      season: 'Spring', day: 1, money: 100000, quality: 'Regular',
      enabledSources: ['TravelingCart'], farmingLevel: 0, fertilizerId: 'none',
      processingMode: 'keg',
    })!;
    expect(plan.totalProduce).toBe(3680);
    expect(plan.processedCount).toBe(736);
    expect(plan.rawLeftoverCount).toBe(0);
    expect(plan.processedRevenue).toBe(736 * 150);
  });
});

describe('artisan processing — scheduling & raw leftovers', () => {
  const baseProcInput: PlannerInput = {
    season: 'Summer', day: 1, money: 100000, quality: 'Regular',
    enabledSources: ['Pierre', 'JojaMart', 'Oasis'],
    farmingLevel: 0, fertilizerId: 'none',
  };

  it('unlimited kegs process every harvested item; raw leftover = 0', () => {
    const blueberry = CROPS.find((c) => c.name === 'Blueberry')!;
    const plan = planCrop(blueberry, { ...baseProcInput, processingMode: 'keg' })!;
    expect(plan.processedCount).toBe(plan.totalProduce);
    expect(plan.rawLeftoverCount).toBe(0);
  });

  it('0 kegs falls back to raw sale with a warning', () => {
    const blueberry = CROPS.find((c) => c.name === 'Blueberry')!;
    const plan = planCrop(blueberry, { ...baseProcInput, processingMode: 'keg', kegCount: 0 })!;
    expect(plan.processedCount).toBe(0);
    expect(plan.rawLeftoverCount).toBe(plan.totalProduce);
    expect(plan.processingWarnings.some((w) => w.toLowerCase().includes('no kegs'))).toBe(true);
  });

  it('aged mode on a non-caskable product (Juice) falls back to keg-only', () => {
    const cauliflower = CROPS.find((c) => c.name === 'Cauliflower')!;
    const plan = planCrop(cauliflower, { ...baseProcInput, season: 'Spring', processingMode: 'gold-aged' })!;
    expect(plan.processingWarnings.some((w) => w.toLowerCase().includes('cannot be cask aged'))).toBe(true);
    expect(plan.effectiveProcessingMode).toBe('keg');
  });

  it('0 casks in aged mode falls back to keg-only with a warning', () => {
    const starfruit = CROPS.find((c) => c.name === 'Starfruit')!;
    const plan = planCrop(starfruit, { ...baseProcInput, processingMode: 'gold-aged', caskCount: 0 })!;
    expect(plan.processingWarnings.some((w) => w.toLowerCase().includes('no casks'))).toBe(true);
    expect(plan.effectiveProcessingMode).toBe('keg');
  });

  it('"No keg product" warning when processing a flower', () => {
    const poppy = CROPS.find((c) => c.name === 'Poppy')!;
    const plan = planCrop(poppy, { ...baseProcInput, processingMode: 'keg' })!;
    expect(plan.processingWarnings.some((w) => w.toLowerCase().includes('no keg product'))).toBe(true);
    expect(plan.processedCount).toBe(0);
    expect(plan.effectiveProcessingMode).toBe('raw');
  });

  it('Tiller +10% applies to raw sales, not to processed revenue', () => {
    const parsnip = CROPS.find((c) => c.name === 'Parsnip')!;
    const rawNoTiller = planCrop(parsnip, { ...baseProcInput, season: 'Spring' })!;
    const rawTiller   = planCrop(parsnip, { ...baseProcInput, season: 'Spring', hasTiller: true })!;
    expect(rawTiller.revenue).toBeGreaterThan(rawNoTiller.revenue);
    // For keg mode, Tiller doesn't apply because there are no raw leftovers.
    const keg         = planCrop(parsnip, { ...baseProcInput, season: 'Spring', processingMode: 'keg' })!;
    const kegTiller   = planCrop(parsnip, { ...baseProcInput, season: 'Spring', processingMode: 'keg', hasTiller: true })!;
    expect(kegTiller.revenue).toBeCloseTo(keg.revenue, 5);
  });

  it('caps processing and sells the rest raw when the queue exceeds the time limit', () => {
    const starfruit = CROPS.find((c) => c.name === 'Starfruit')!;
    const limited = planCrop(starfruit, {
      ...baseProcInput,
      processingMode: 'iridium-aged',
      kegCount: 1,
      caskCount: 1,
      hasArtisan: true,
    })!;
    expect(limited.effectiveProcessingMode).toBe('iridium-aged');
    expect(limited.processedCount).toBeGreaterThan(0);
    expect(limited.processedCount).toBeLessThan(limited.totalProduce);
    expect(limited.rawLeftoverCount).toBe(limited.totalProduce - limited.processedCount);
    expect(limited.processingWarnings.some((w) => w.toLowerCase().includes('rest are sold raw'))).toBe(true);
  });

  it('maxSeasons is measured in 28-day seasons, not years', () => {
    const starfruit = CROPS.find((c) => c.name === 'Starfruit')!;
    const limited = planCrop(starfruit, {
      ...baseProcInput,
      processingMode: 'keg',
      kegCount: 1,
      maxSeasons: 1,
    })!;
    expect(limited.maxPlanDays).toBe(28);
    expect(limited.processedCount).toBe(2);
    expect(limited.rawLeftoverCount).toBe(limited.totalProduce - 2);
    expect(limited.lastFinishedDate).toBe('Summer 26');
  });

  it('one keg has finite same-day throughput for Coffee', () => {
    const coffeeBean = CROPS.find((c) => c.name === 'Coffee Bean')!;
    const unlimited = planCrop(coffeeBean, {
      season: 'Spring', day: 1, money: 100000, quality: 'Regular',
      enabledSources: ['TravelingCart'], farmingLevel: 0, fertilizerId: 'none',
      processingMode: 'keg',
    })!;
    const limited = planCrop(coffeeBean, {
      season: 'Spring', day: 1, money: 100000, quality: 'Regular',
      enabledSources: ['TravelingCart'], farmingLevel: 0, fertilizerId: 'none',
      processingMode: 'keg',
      kegCount: 1,
    })!;
    expect(limited.processedCount).toBe(unlimited.processedCount);
    expect(limited.daysUsed).toBeGreaterThan(unlimited.daysUsed);
  });

  it('unlimited keg plans report the peak kegs and busiest same-day work needed', () => {
    const grape = CROPS.find((c) => c.name === 'Grape')!;
    const plan = planCrop(grape, {
      season: 'Fall', day: 1, money: 100000, quality: 'Regular',
      enabledSources: ['Pierre'], farmingLevel: 0, fertilizerId: 'none',
      processingMode: 'keg',
    })!;
    expect(plan.processedCount).toBe(9996);
    expect(plan.minimumKegsRequired).toBe(4998);
    expect(plan.busiestKegDayCount).toBe(3332);
    expect(plan.busiestKegDayDate).toBe('Fall 17');
    expect(plan.lastFinishedDate).toBe('Winter 4');
  });
});
