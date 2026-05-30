import { FERTILIZER_BY_ID, qualityMix } from '../data/fertilizers';
import {
  KEG_PRODUCT_LABEL,
  KEG_MINUTES,
  MINUTES_PER_DAY,
  caskMinutesForMode,
  isCaskable,
  processedUnitPrice,
} from '../data/processing';
import {
  Crop,
  CropPlan,
  DAYS_PER_SEASON,
  PlannerInput,
  ProcessingMode,
  ProcessingEvent,
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
  if (crop.name === 'Tea Sapling') {
    return teaSaplingHarvestOffsets(season, day, speedMod);
  }
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

function teaSaplingHarvestOffsets(season: Season, day: number, speedMod = 0): number[] {
  const validSeasons: Season[] = ['Spring', 'Summer', 'Fall'];
  if (!validSeasons.includes(season)) return [];
  const startAbs = SEASONS.indexOf(season) * DAYS_PER_SEASON + (day - 1);
  const matureAbs = startAbs + speedGrowthDays(20, speedMod);
  const endAbs = SEASONS.indexOf('Fall') * DAYS_PER_SEASON + (DAYS_PER_SEASON - 1);
  const offsets: number[] = [];
  for (let abs = Math.max(matureAbs, startAbs); abs <= endAbs; abs++) {
    const s = SEASONS[Math.floor(abs / DAYS_PER_SEASON)];
    const d = (abs % DAYS_PER_SEASON) + 1;
    if (validSeasons.includes(s) && d >= 22 && d <= 28) {
      offsets.push(abs - startAbs);
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

function visibleDayFromMinute(minute: number): number {
  return Math.floor((Math.max(0, minute) + 0.0001) / MINUTES_PER_DAY);
}

function addProcessingEvent(
  events: ProcessingEvent[],
  kind: ProcessingEvent['kind'],
  minute: number,
  count = 1
): void {
  const day = visibleDayFromMinute(minute);
  const existing = events.find((e) => e.kind === kind && e.day === day);
  if (existing) existing.count += count;
  else events.push({ day, kind, count });
}

function maxConcurrent(intervals: Array<[number, number]>): number {
  const points: Array<[number, number]> = [];
  for (const [start, end] of intervals) {
    if (end <= start) continue;
    points.push([start, 1], [end, -1]);
  }
  points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let active = 0;
  let max = 0;
  for (const [, delta] of points) {
    active += delta;
    if (active > max) max = active;
  }
  return max;
}

function busiestKegDay(events: ProcessingEvent[]): { day: number; count: number } | undefined {
  const byDay = new Map<number, number>();
  for (const e of events) {
    if (e.kind !== 'loadKeg' && e.kind !== 'collectKeg') continue;
    byDay.set(e.day, (byDay.get(e.day) ?? 0) + e.count);
  }
  let busiest: { day: number; count: number } | undefined;
  for (const [day, count] of byDay) {
    if (!busiest || count > busiest.count) busiest = { day, count };
  }
  return busiest;
}

interface HarvestBatch {
  offset: number;
  items: number;
}

/** Schedule keg+cask processing for the whole planted batch.
 *  `processedGoods` is output units (bottles/cups), while `consumedItems`
 *  is raw crop items consumed. Coffee therefore consumes 5 beans but produces
 *  1 Coffee. Limited kegs/casks are FIFO with minute-level durations. */
function scheduleProcessing(
  harvestBatches: HarvestBatch[],
  inputCount: number,
  kegMinutes: number,
  caskMinutes: number,
  kegCount: number | undefined,   // undefined = unlimited
  caskCount: number | undefined,  // undefined = unlimited
  maxCompletionMinute?: number,
): {
  processedGoods: number;
  consumedItems: number;
  lastCompletionMinute: number;
  events: ProcessingEvent[];
  minimumKegsRequired: number;
  minimumCasksRequired: number;
  busiestKegDayCount: number;
  busiestKegDay?: number;
  wasCapped: boolean;
} {
  const empty = {
    processedGoods: 0,
    consumedItems: 0,
    lastCompletionMinute: 0,
    events: [] as ProcessingEvent[],
    minimumKegsRequired: 0,
    minimumCasksRequired: 0,
    busiestKegDayCount: 0,
    busiestKegDay: undefined as number | undefined,
    wasCapped: false,
  };
  if (kegCount === 0 || harvestBatches.length === 0) {
    return empty;
  }
  const batches: number[] = []; // available start minute per output batch
  let leftoverInputs = 0;
  for (const harvest of [...harvestBatches].sort((a, b) => a.offset - b.offset)) {
    leftoverInputs += harvest.items;
    while (leftoverInputs >= inputCount) {
      batches.push(harvest.offset * MINUTES_PER_DAY);
      leftoverInputs -= inputCount;
    }
  }
  if (batches.length === 0) return empty;

  const kegSlots = kegCount === undefined ? Infinity : kegCount;
  const kegFinishHeap: number[] = []; // sorted ascending
  const kegCompletions: number[] = [];
  const events: ProcessingEvent[] = [];
  const kegIntervals: Array<[number, number]> = [];
  const caskIntervals: Array<[number, number]> = [];
  let wasCapped = false;
  for (const start of batches) {
    let realStart = start;
    if (kegFinishHeap.length >= kegSlots) {
      const earliestFree = kegFinishHeap.shift()!;
      realStart = Math.max(realStart, earliestFree);
    }
    const done = realStart + kegMinutes;
    if (maxCompletionMinute !== undefined && done > maxCompletionMinute) {
      wasCapped = true;
      break;
    }
    addProcessingEvent(events, 'loadKeg', realStart);
    addProcessingEvent(events, 'collectKeg', done);
    kegIntervals.push([realStart, done]);
    kegCompletions.push(done);
    let i = kegFinishHeap.length;
    while (i > 0 && kegFinishHeap[i - 1] > done) i--;
    kegFinishHeap.splice(i, 0, done);
  }

  let processedGoods = kegCompletions.length;
  let consumedItems = processedGoods * inputCount;
  let lastCompletionMinute = kegCompletions[kegCompletions.length - 1] ?? 0;

  if (caskMinutes > 0) {
    if (caskCount === 0) {
      const busiest = busiestKegDay(events);
      return {
        processedGoods,
        consumedItems,
        lastCompletionMinute,
        events,
        minimumKegsRequired: maxConcurrent(kegIntervals),
        minimumCasksRequired: 0,
        busiestKegDayCount: busiest?.count ?? 0,
        busiestKegDay: busiest?.day,
        wasCapped,
      };
    }
    const caskSlots = caskCount === undefined ? Infinity : caskCount;
    const caskHeap: number[] = [];
    const caskCompletions: number[] = [];
    for (const kegDone of kegCompletions) {
      let realStart = kegDone;
      if (caskHeap.length >= caskSlots) {
        const earliestFree = caskHeap.shift()!;
        realStart = Math.max(realStart, earliestFree);
      }
      const done = realStart + caskMinutes;
      if (maxCompletionMinute !== undefined && done > maxCompletionMinute) {
        wasCapped = true;
        break;
      }
      addProcessingEvent(events, 'loadCask', realStart);
      addProcessingEvent(events, 'collectCask', done);
      caskIntervals.push([realStart, done]);
      caskCompletions.push(done);
      let i = caskHeap.length;
      while (i > 0 && caskHeap[i - 1] > done) i--;
      caskHeap.splice(i, 0, done);
    }
    processedGoods = caskCompletions.length;
    consumedItems = processedGoods * inputCount;
    lastCompletionMinute = caskCompletions[caskCompletions.length - 1] ?? 0;
  }

  const busiest = busiestKegDay(events);
  return {
    processedGoods,
    consumedItems,
    lastCompletionMinute,
    events,
    minimumKegsRequired: maxConcurrent(kegIntervals),
    minimumCasksRequired: maxConcurrent(caskIntervals),
    busiestKegDayCount: busiest?.count ?? 0,
    busiestKegDay: busiest?.day,
    wasCapped,
  };
}

export function planCrop(crop: Crop, input: PlannerInput): CropPlan | null {
  const fert = FERTILIZER_BY_ID[input.fertilizerId];
  const speedMod = fert?.speedMod ?? 0;
  const offsets = harvestOffsets(crop, input.season, input.day, speedMod);
  if (offsets.length === 0) return null;

  const seedCost = Math.max(0, crop.seedCost);
  if (seedCost <= 0) return null;

  const maxTiles = input.maxTiles === undefined ? undefined : Math.max(0, Math.floor(input.maxTiles));
  const tileCap = maxTiles ?? Number.POSITIVE_INFINITY;
  if (tileCap <= 0) return null;

  const fertLvl = (fert?.qualityLevel ?? 0) as 0 | 1 | 2 | 3;
  const mixFert: QualityMix = fertLvl > 0
    ? qualityMix(input.farmingLevel, fertLvl)
    : qualityMix(input.farmingLevel, 0);
  const mixBare: QualityMix = qualityMix(input.farmingLevel, 0);

  const unitFert = unitMixValue(crop, mixFert);
  const unitBare = unitMixValue(crop, mixBare);

  // ---- Raw-sale EV per item ----
  const tillerMult = input.hasTiller ? 1.1 : 1;
  const wantFertilizerPerSeed = fert && fert.id !== 'none';
  let fertilizerLeft = input.fertilizerAmount === undefined
    ? undefined
    : Math.max(0, Math.floor(input.fertilizerAmount));
  const plantingBatches: Array<{
    offset: number;
    seeds: number;
    harvestOffsets: number[];
    fertilizedSeeds: number;
    unfertilizedSeeds: number;
  }> = [];
  let totalSeedPurchases = 0;
  let seedSpend = 0;
  let tileLimitHit = false;

  const assignFertilizer = (seeds: number) => {
    if (!wantFertilizerPerSeed) return { fertilized: 0, bare: seeds };
    if (fertilizerLeft === undefined) return { fertilized: seeds, bare: 0 };
    const fertilized = Math.min(seeds, fertilizerLeft);
    fertilizerLeft -= fertilized;
    return { fertilized, bare: seeds - fertilized };
  };

  const addPlanting = (offset: number, seeds: number, harvestOffsetsArr: number[]) => {
    const split = assignFertilizer(seeds);
    plantingBatches.push({
      offset,
      seeds,
      harvestOffsets: harvestOffsetsArr,
      fertilizedSeeds: split.fertilized,
      unfertilizedSeeds: split.bare,
    });
    totalSeedPurchases += seeds;
    seedSpend += seeds * seedCost;
  };

  const canReplant =
    !!input.allowReplanting &&
    !crop.regrowthDays &&
    crop.name !== 'Tea Sapling';

  if (canReplant) {
    const firstGrowth = speedGrowthDays(crop.growthDays, speedMod);
    const validWindow = remainingValidDays(input.season, input.day, crop.seasons);
    let cashForSeeds = input.money;
    let plantOffset = 0;
    while (plantOffset + firstGrowth <= validWindow) {
      const affordable = Math.floor(cashForSeeds / seedCost);
      const seeds = Math.min(tileCap, affordable);
      if (seeds <= 0) break;
      if (maxTiles !== undefined && affordable > maxTiles) tileLimitHit = true;
      cashForSeeds -= seeds * seedCost;
      const harvestOffset = plantOffset + firstGrowth;
      addPlanting(plantOffset, seeds, [harvestOffset]);

      const lastBatch = plantingBatches[plantingBatches.length - 1];
      cashForSeeds += (
        lastBatch.fertilizedSeeds * crop.producePerHarvest * unitFert * tillerMult +
        lastBatch.unfertilizedSeeds * crop.producePerHarvest * unitBare * tillerMult
      );
      plantOffset = harvestOffset;
    }
  } else {
    const affordable = Math.floor(input.money / seedCost);
    const seeds = Math.min(tileCap, affordable);
    if (seeds <= 0) return null;
    if (maxTiles !== undefined && affordable > maxTiles) tileLimitHit = true;
    addPlanting(0, seeds, offsets);
  }

  if (totalSeedPurchases <= 0) return null;

  const seedsBought = totalSeedPurchases;
  const moneyAfterBuying = input.money - seedSpend;
  const harvestBatches: HarvestBatch[] = [];
  for (const batch of plantingBatches) {
    for (const harvestOffset of batch.harvestOffsets) {
      harvestBatches.push({
        offset: harvestOffset,
        items: batch.seeds * crop.producePerHarvest,
      });
    }
  }
  harvestBatches.sort((a, b) => a.offset - b.offset);

  const fertilizedSeeds = plantingBatches.reduce((sum, b) => sum + b.fertilizedSeeds, 0);
  const unfertilizedSeeds = plantingBatches.reduce((sum, b) => sum + b.unfertilizedSeeds, 0);
  const fertilizerRequired = wantFertilizerPerSeed ? totalSeedPurchases : 0;
  const totalProduce = harvestBatches.reduce((sum, h) => sum + h.items, 0);

  const rawFert = plantingBatches.reduce(
    (sum, b) => sum + b.fertilizedSeeds * b.harvestOffsets.length * crop.producePerHarvest * unitFert * tillerMult,
    0
  );
  const rawBare = plantingBatches.reduce(
    (sum, b) => sum + b.unfertilizedSeeds * b.harvestOffsets.length * crop.producePerHarvest * unitBare * tillerMult,
    0
  );
  const rawSaleRevenueAllRaw = rawFert + rawBare;
  const blendedRawUnit = totalProduce > 0 ? rawSaleRevenueAllRaw / totalProduce : 0;

  // ---- Processing math ----
  const processingMode: ProcessingMode = input.processingMode ?? 'raw';
  const product = crop.kegProduct ?? 'none';
  const processingWarnings: string[] = [];
  let effectiveProcessingMode: ProcessingMode = processingMode;

  let processedCount = 0;
  let rawLeftoverCount = totalProduce;
  let processedRevenue = 0;
  let rawRevenue = rawSaleRevenueAllRaw;
  let lastFinishedOffset = harvestBatches[harvestBatches.length - 1]?.offset ?? offsets[offsets.length - 1];
  let kegProductLabel: string | undefined;
  let processingEvents: ProcessingEvent[] = [];
  let minimumKegsRequired = 0;
  let minimumCasksRequired = 0;
  let busiestKegDayCount = 0;
  let busiestKegDayDate: string | undefined;

  if (processingMode !== 'raw') {
    if (product === 'none') {
      processingWarnings.push('No keg product. Selling raw.');
      effectiveProcessingMode = 'raw';
    } else {
      kegProductLabel = KEG_PRODUCT_LABEL[product];
      const wantsAging = processingMode !== 'keg';
      let effectiveMode: ProcessingMode = processingMode;
      if (wantsAging && !isCaskable(product)) {
        processingWarnings.push(`${kegProductLabel} cannot be cask aged. Using keg-only value.`);
        effectiveMode = 'keg';
      }
      if (wantsAging && (input.caskCount ?? 1) === 0) {
        processingWarnings.push('No casks available. Using keg-only value.');
        effectiveMode = 'keg';
      }
      if ((input.kegCount ?? 1) === 0) {
        processingWarnings.push('No kegs available. Selling raw.');
        effectiveMode = 'raw';
      } else {
        const inputCount = Math.max(1, crop.kegInputCount ?? 1);
        const kegMinutes = KEG_MINUTES[product];
        const caskMinutes = isCaskable(product) ? caskMinutesForMode(product, effectiveMode) : 0;
        const maxPlanDays = Math.max(1, Math.floor(input.maxSeasons ?? 4)) * DAYS_PER_SEASON;
        const scheduled = scheduleProcessing(
          harvestBatches,
          inputCount,
          kegMinutes,
          caskMinutes,
          input.kegCount,
          effectiveMode === 'keg' ? undefined : input.caskCount,
          maxPlanDays * MINUTES_PER_DAY,
        );
        processedCount = scheduled.processedGoods;
        rawLeftoverCount = totalProduce - scheduled.consumedItems;
        const unitPrice = processedUnitPrice(crop, effectiveMode, !!input.hasArtisan);
        processedRevenue = processedCount * unitPrice;
        rawRevenue = rawLeftoverCount * blendedRawUnit;
        processingEvents = scheduled.events;
        minimumKegsRequired = scheduled.minimumKegsRequired;
        minimumCasksRequired = scheduled.minimumCasksRequired;
        busiestKegDayCount = scheduled.busiestKegDayCount;
        busiestKegDayDate = scheduled.busiestKegDay === undefined
          ? undefined
          : offsetToDate(input.season, input.day, scheduled.busiestKegDay);
        const completionOffset = visibleDayFromMinute(scheduled.lastCompletionMinute);
        if (completionOffset > lastFinishedOffset) {
          lastFinishedOffset = completionOffset;
        }
        if (scheduled.wasCapped) {
          processingWarnings.push(`Only ${processedCount.toLocaleString()} items fit within the time cap, the rest are sold raw.`);
        }
      }
      effectiveProcessingMode = effectiveMode;
    }
  }

  const revenue = rawRevenue + processedRevenue;
  const finalMoney = moneyAfterBuying + revenue;
  const netProfit = finalMoney - input.money;
  const daysUsed = lastFinishedOffset;
  const profitPerDay = daysUsed > 0 ? netProfit / daysUsed : 0;

  const allHarvestOffsets = harvestBatches.map((h) => h.offset);
  const plantingOffsets = plantingBatches.map((b) => b.offset);
  const harvestDates = allHarvestOffsets.map((o) => offsetToDate(input.season, input.day, o));
  const lastFinishedDate = offsetToDate(input.season, input.day, lastFinishedOffset);

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
    harvestDays: allHarvestOffsets,
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
    processingMode,
    effectiveProcessingMode,
    kegProductLabel,
    processedCount,
    rawLeftoverCount,
    rawRevenue,
    processedRevenue,
    lastFinishedDate,
    processingWarnings,
    processingEvents,
    kegLimit: input.kegCount,
    caskLimit: input.caskCount,
    minimumKegsRequired,
    minimumCasksRequired,
    busiestKegDayCount,
    busiestKegDayDate,
    maxPlanDays: Math.max(1, Math.floor(input.maxSeasons ?? 4)) * DAYS_PER_SEASON,
    maxTiles,
    allowReplanting: !!input.allowReplanting,
    plantingCount: plantingBatches.length,
    plantingDates: plantingOffsets.map((o) => offsetToDate(input.season, input.day, o)),
    plantingOffsets,
    totalSeedPurchases,
    tileLimitHit,
  };
}

export type CalendarEventKind =
  | 'plant'
  | 'water'
  | 'harvest'
  | 'regrowHarvest'
  | 'loadKeg'
  | 'collectKeg'
  | 'loadCask'
  | 'collectCask';

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
  if (crop.name !== 'Tea Sapling') {
    for (let d = day + 1; d <= day + lastHarvest; d++) {
      if (harvestDays.has(d)) continue;
      events.push({ day: d, kind: 'water' });
    }
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
