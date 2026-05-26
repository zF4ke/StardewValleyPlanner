import { FERTILIZER_BY_ID } from './fertilizers';
import {
  FarmingLevel,
  FertilizerId,
  Quality,
  Season,
  SEASONS,
  SeedSource,
} from '../domain/types';

const KEY = 'stardew-workshop:planner-inputs:v1';

const QUALITIES: Quality[] = ['Regular', 'Silver', 'Gold', 'Iridium'];
const VALID_SOURCES: SeedSource[] = [
  'Pierre', 'JojaMart', 'Oasis', 'EggFestival', 'TravelingCart',
  'IslandTrader', 'Crafted', 'Drop', 'SeedMaker', 'Special',
];

export interface PlannerInputs {
  season: Season;
  day: number;
  money: number;
  quality: Quality;
  farmingLevel: FarmingLevel;
  fertilizerId: FertilizerId;
  fertilizerAmount?: number;
  enabledSources: SeedSource[];
}

export const DEFAULT_INPUTS: PlannerInputs = {
  season: 'Spring',
  day: 1,
  money: 500,
  quality: 'Regular',
  farmingLevel: 0,
  fertilizerId: 'none',
  fertilizerAmount: undefined,
  enabledSources: ['Pierre', 'JojaMart'],
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function loadPlannerInputs(): PlannerInputs {
  if (typeof localStorage === 'undefined') return DEFAULT_INPUTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_INPUTS;
    const r = JSON.parse(raw) as Record<string, unknown>;
    const season: Season = SEASONS.includes(r.season as Season) ? (r.season as Season) : 'Spring';
    const day = clamp(Math.floor(Number(r.day) || 1), 1, 28);
    const money = Math.max(0, Math.floor(Number(r.money) || 0));
    const quality: Quality = QUALITIES.includes(r.quality as Quality)
      ? (r.quality as Quality) : 'Regular';
    const farmingLevel = clamp(Math.floor(Number(r.farmingLevel) || 0), 0, 14) as FarmingLevel;
    const fertilizerId: FertilizerId = FERTILIZER_BY_ID[r.fertilizerId as FertilizerId]
      ? (r.fertilizerId as FertilizerId) : 'none';
    let fertilizerAmount: number | undefined;
    if (r.fertilizerAmount !== null && r.fertilizerAmount !== undefined) {
      const n = Number(r.fertilizerAmount);
      fertilizerAmount = Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
    }
    const enabledSources: SeedSource[] = Array.isArray(r.enabledSources)
      ? (r.enabledSources as unknown[]).filter(
          (s): s is SeedSource => typeof s === 'string' && VALID_SOURCES.includes(s as SeedSource)
        )
      : DEFAULT_INPUTS.enabledSources;
    return { season, day, money, quality, farmingLevel, fertilizerId, fertilizerAmount, enabledSources };
  } catch {
    return DEFAULT_INPUTS;
  }
}

export function savePlannerInputs(inputs: PlannerInputs): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(KEY, JSON.stringify(inputs)); } catch { /* */ }
}
