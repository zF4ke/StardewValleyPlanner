import { FERTILIZER_BY_ID, qualityMix } from '../data/fertilizers';
import {
  Crop,
  CropPlan,
  DAYS_PER_SEASON,
  PlannerInput,
  Quality,
  QualityMix,
  QUALITY_MULT,
  Season,
  SEASONS,
} from './types';

/** Days from `season`/`day` until the end of the last contiguous valid season. */
export function remainingValidDays(season: Season, day: number, validSeasons: Season[]): number {
  if (!validSeasons.includes(season)) return 0;
  const idx = SEASONS.indexOf(season);
  let days = DAYS_PER_SEASON - day; // days *after* planting day in current season
  let i = idx + 1;
  while (i < SEASONS.length && validSeasons.includes(SEASONS[i])) {
    days += DAYS_PER_SEASON;
    i++;
  }
  return days;
}

/** Apply Speed-Gro: removes a fraction of growth days, rounded down, min 1.
 *  Affects only the first harvest. */
export function speedGrowthDays(growthDays: number, speedMod: number): number {
  if (speedMod <= 0) return growthDays;
  const removed = Math.floor(growthDays * speedMod + 0.0001);
  return Math.max(1, growthDays - removed);
}

export function harvestOffsets(
  crop: Crop,
  season: Season,
  day: number,
  speedMod = 0
): number[] {
  const window = remainingValidDays(season, day, crop.seasons);
  const offsets: number[] = [];
  const first = speedGrowthDays(crop.growthDays, speedMod);
  if (first > window) return offsets;
  offsets.push(first);
  if (crop.regrowthDays && crop.regrowthDays > 0) {
    let t = first + crop.regrowthDays;
    while (t <= window) {
      offsets.push(t);
      t += crop.regrowthDays;
    }
  }
  return offsets;
}

const SEASON_INDEX: Record<Season, number> = { Spring: 0, Summer: 1, Fall: 2, Winter: 3 };

export function offsetToDate(season: Season, day: number, offset: number): string {
  let absolute = SEASON_INDEX[season] * DAYS_PER_SEASON + (day - 1) + offset;
  const year = 1 + Math.floor(absolute / (DAYS_PER_SEASON * 4));
  absolute = absolute % (DAYS_PER_SEASON * 4);
  const sIdx = Math.floor(absolute / DAYS_PER_SEASON);
  const d = (absolute % DAYS_PER_SEASON) + 1;
  const s = SEASONS[sIdx];
  return year === 1 ? `${s} ${d}` : `${s} ${d} (Y${year})`;
}

export function qualitySellPrice(crop: Crop, quality: Quality): number {
  return Math.floor(crop.sellPrice * QUALITY_MULT[quality]);
}

/** Expected gold per produce item.
 *
 * Per Stardew mechanics, when a crop produces multiple items per harvest
 * (e.g. Blueberry yields 3), the quality-fertilizer roll only applies to ONE
 * of the items; the rest are Regular. We model this in the per-harvest EV. */
export function expectedHarvestValue(
  crop: Crop,
  mix: QualityMix,
  scenarioQuality: Quality
): number {
  // Special case: Sweet Gem Berry ignores quality (always Regular price in vanilla).
  const ignoresQuality = crop.name.includes('Sweet Gem Berry');
  const base = crop.sellPrice;
  const expectedQualityMult =
    ignoresQuality
      ? 1
      : mix.regular * 1 + mix.silver * QUALITY_MULT.Silver +
        mix.gold * QUALITY_MULT.Gold + mix.iridium * QUALITY_MULT.Iridium;
  const oneItem = Math.floor(base * expectedQualityMult);
  const extra = (crop.producePerHarvest - 1) * Math.floor(base * QUALITY_MULT[scenarioQuality === 'Regular' ? 'Regular' : 'Regular']);
  // Note: extra-yield items are Regular per the wiki; user-selected scenarioQuality
  // is retained only for the qualityMix-disabled toggle (kept for back-compat).
  void scenarioQuality;
  return oneItem + extra;
}

function unitMixValue(crop: Crop, mix: QualityMix): number {
  // Average over the whole harvest (including extra items @ Regular).
  const ignoresQuality = crop.name.includes('Sweet Gem Berry');
  const base = crop.sellPrice;
  const evOne = ignoresQuality ? base : base * (
    mix.regular + mix.silver * QUALITY_MULT.Silver +
    mix.gold * QUALITY_MULT.Gold + mix.iridium * QUALITY_MULT.Iridium
  );
  const total = evOne + (crop.producePerHarvest - 1) * base;
  return total / crop.producePerHarvest;
}

const NO_FERT_MIX: QualityMix = { regular: 1, silver: 0, gold: 0, iridium: 0 };

export function planCrop(crop: Crop, input: PlannerInput): CropPlan | null {
  const fert = FERTILIZER_BY_ID[input.fertilizerId];
  const speedMod = fert?.speedMod ?? 0;
  const offsets = harvestOffsets(crop, input.season, input.day, speedMod);
  if (offsets.length === 0) return null;

  const seedCost = Math.max(0, crop.seedCost);
  const seedsBought = seedCost > 0 ? Math.floor(input.money / seedCost) : 0;
  if (seedsBought <= 0) return null;

  // Limited fertilizer split:
  const wantFertilizerPerSeed = fert && fert.id !== 'none';
  const fertilizerRequired = wantFertilizerPerSeed ? seedsBought : 0;
  let fertilizedSeeds = 0;
  let unfertilizedSeeds = seedsBought;
  if (wantFertilizerPerSeed) {
    const cap = input.fertilizerAmount;
    if (cap === undefined) {
      fertilizedSeeds = seedsBought;
      unfertilizedSeeds = 0;
    } else {
      fertilizedSeeds = Math.min(seedsBought, Math.max(0, Math.floor(cap)));
      unfertilizedSeeds = seedsBought - fertilizedSeeds;
    }
  }

  const seedSpend = seedsBought * seedCost;
  const moneyAfterBuying = input.money - seedSpend;

  const fertLvl = (fert?.qualityLevel ?? 0) as 0 | 1 | 2 | 3;
  const mixFert: QualityMix = fertLvl > 0
    ? qualityMix(input.farmingLevel, fertLvl)
    : qualityMix(input.farmingLevel, 0);
  const mixBare: QualityMix = qualityMix(input.farmingLevel, 0);

  const unitFert = unitMixValue(crop, mixFert);
  const unitBare = unitMixValue(crop, mixBare);

  const harvestsPerSeed = offsets.length;
  const producePerSeed = harvestsPerSeed * crop.producePerHarvest;

  const revenueFert = fertilizedSeeds * producePerSeed * unitFert;
  const revenueBare = unfertilizedSeeds * producePerSeed * unitBare;
  const revenue = revenueFert + revenueBare;

  const totalProduce = seedsBought * producePerSeed;
  const finalMoney = moneyAfterBuying + revenue;
  const netProfit = finalMoney - input.money;
  const daysUsed = offsets[offsets.length - 1];
  const profitPerDay = daysUsed > 0 ? netProfit / daysUsed : 0;

  const harvestDates = offsets.map((o) => offsetToDate(input.season, input.day, o));

  const warnings: string[] = [];
  if (crop.notes) warnings.push(crop.notes);
  if (wantFertilizerPerSeed && unfertilizedSeeds > 0) {
    warnings.push(
      `Only ${fertilizedSeeds} of ${seedsBought} seeds are fertilized; the rest grow on bare soil.`
    );
  }
  if (speedMod > 0) {
    warnings.push(
      `Speed-Gro shortens first harvest only (growth ${crop.growthDays}→${speedGrowthDays(crop.growthDays, speedMod)} days).`
    );
  }

  return {
    crop,
    seedsBought,
    seedSpend,
    moneyAfterBuying,
    harvestDays: offsets,
    harvestDates,
    firstHarvestDate: harvestDates[0],
    lastHarvestDate: harvestDates[harvestDates.length - 1],
    totalProduce,
    revenue,
    finalMoney,
    netProfit,
    profitPerDay,
    daysUsed,
    warnings,
    fertilizerId: input.fertilizerId,
    fertilizerRequired,
    fertilizedSeeds,
    unfertilizedSeeds,
    expectedUnitValueFertilized: unitFert,
    expectedUnitValueUnfertilized: unitBare,
    qualityMixFertilized: mixFert,
    qualityMixUnfertilized: mixBare,
    effectiveGrowthDays: speedGrowthDays(crop.growthDays, speedMod),
  };
}

export type CalendarEventKind = 'plant' | 'water' | 'harvest' | 'regrowHarvest';

export interface CalendarEvent {
  day: number;
  kind: CalendarEventKind;
}

export function calendarEvents(
  crop: Crop,
  season: Season,
  day: number,
  speedMod = 0
): CalendarEvent[] {
  const offsets = harvestOffsets(crop, season, day, speedMod);
  if (offsets.length === 0) return [];
  const events: CalendarEvent[] = [{ day, kind: 'plant' }];
  const lastHarvest = offsets[offsets.length - 1];
  const harvestDays = new Set(offsets.map((o) => day + o));
  for (let d = day + 1; d <= day + lastHarvest; d++) {
    if (harvestDays.has(d)) continue;
    events.push({ day: d, kind: 'water' });
  }
  offsets.forEach((o, i) => {
    events.push({ day: day + o, kind: i === 0 ? 'harvest' : 'regrowHarvest' });
  });
  return events;
}

export function rankCrops(crops: Crop[], input: PlannerInput): CropPlan[] {
  return crops
    .filter((c) => input.enabledSources.includes(c.source))
    .map((c) => planCrop(c, input))
    .filter((p): p is CropPlan => p !== null)
    .sort((a, b) => b.netProfit - a.netProfit);
}
