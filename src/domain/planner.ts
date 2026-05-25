import {
  Crop,
  CropPlan,
  DAYS_PER_SEASON,
  PlannerInput,
  Quality,
  QUALITY_MULT,
  Season,
  SEASONS,
} from './types';

/** Number of remaining days from `season`/`day` until the end of the last
 * contiguous valid season in `validSeasons` reached from `season`. */
export function remainingValidDays(season: Season, day: number, validSeasons: Season[]): number {
  if (!validSeasons.includes(season)) return 0;
  // Walk forward through SEASONS starting at current; count days while still valid.
  let idx = SEASONS.indexOf(season);
  let days = DAYS_PER_SEASON - day + 1; // remaining days of current season including today
  // Today counts as a planting day; the planting day itself is not a growth day.
  // The convention used by the planner: harvestDay = day + growthDays.
  // So "available growth window" measured as (DAYS_PER_SEASON - day) within current season,
  // plus full subsequent valid seasons.
  days = DAYS_PER_SEASON - day; // days *after* planting day in current season
  let i = idx + 1;
  while (i < SEASONS.length && validSeasons.includes(SEASONS[i])) {
    days += DAYS_PER_SEASON;
    i++;
  }
  // Also handle if current season is valid but the next isn't — we already stopped.
  return days;
}

/** Returns absolute offsets (days after the planting day) for each harvest, capped
 *  to the remaining valid window. */
export function harvestOffsets(crop: Crop, season: Season, day: number): number[] {
  const window = remainingValidDays(season, day, crop.seasons);
  const offsets: number[] = [];
  const first = crop.growthDays;
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

/** Convert a (season, day) + offset (days after planting) into a pretty date label.
 * Wraps across seasons (Winter -> Year 2 Spring). */
export function offsetToDate(season: Season, day: number, offset: number): string {
  let absolute = SEASON_INDEX[season] * DAYS_PER_SEASON + (day - 1) + offset; // 0-indexed day of year
  let year = 1 + Math.floor(absolute / (DAYS_PER_SEASON * 4));
  absolute = absolute % (DAYS_PER_SEASON * 4);
  const sIdx = Math.floor(absolute / DAYS_PER_SEASON);
  const d = (absolute % DAYS_PER_SEASON) + 1;
  const s = SEASONS[sIdx];
  return year === 1 ? `${s} ${d}` : `${s} ${d} (Y${year})`;
}

export function qualitySellPrice(crop: Crop, quality: Quality): number {
  // Iridium-only valid for certain crops in vanilla, but for the planner's "scenario sale price"
  // we just apply the multiplier uniformly (the user picks the scenario).
  return Math.floor(crop.sellPrice * QUALITY_MULT[quality]);
}

export function planCrop(crop: Crop, input: PlannerInput): CropPlan | null {
  const offsets = harvestOffsets(crop, input.season, input.day);
  if (offsets.length === 0) return null;

  const seedCost = Math.max(0, crop.seedCost);
  const seedsBought = seedCost > 0 ? Math.floor(input.money / seedCost) : 0;
  if (seedsBought <= 0) return null;

  const seedSpend = seedsBought * seedCost;
  const moneyAfterBuying = input.money - seedSpend;

  const totalProduce = seedsBought * crop.producePerHarvest * offsets.length;
  const unitPrice = qualitySellPrice(crop, input.quality);
  const revenue = totalProduce * unitPrice;
  const finalMoney = moneyAfterBuying + revenue;
  const netProfit = finalMoney - input.money;
  const daysUsed = offsets[offsets.length - 1];
  const profitPerDay = daysUsed > 0 ? netProfit / daysUsed : 0;

  const harvestDates = offsets.map((o) => offsetToDate(input.season, input.day, o));

  const warnings: string[] = [];
  if (crop.notes) warnings.push(crop.notes);

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
  };
}

/** Ranks crops by net profit descending — the single goal of the planner. */
export function rankCrops(crops: Crop[], input: PlannerInput): CropPlan[] {
  return crops
    .filter((c) => input.enabledSources.includes(c.source))
    .map((c) => planCrop(c, input))
    .filter((p): p is CropPlan => p !== null)
    .sort((a, b) => b.netProfit - a.netProfit);
}
