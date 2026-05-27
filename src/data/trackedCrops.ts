import { FERTILIZER_BY_ID } from './fertilizers';
import {
  FarmingLevel,
  FertilizerId,
  ProcessingMode,
  Season,
  SEASONS,
  DAYS_PER_SEASON,
} from '../domain/types';

const CROPS_KEY = 'stardew-workshop:tracked-crops:v1';
const TODAY_KEY = 'stardew-workshop:today:v1';

export interface TrackedCrop {
  id: string;
  cropName: string;
  season: Season;        // planted
  day: number;           // planted (1..28)
  farmingLevel: FarmingLevel;
  fertilizerId: FertilizerId;
  fertilizerAmount?: number;
  seedsBought: number;
  createdAt: number;
  // ---- v0.7 processing ----
  processingMode?: ProcessingMode;
  kegCount?: number;
  caskCount?: number;
  hasTiller?: boolean;
  hasArtisan?: boolean;
}

export interface CurrentDay {
  season: Season;
  day: number;           // 1..28
  year: number;          // 1..N
}

const SEASON_INDEX: Record<Season, number> = { Spring: 0, Summer: 1, Fall: 2, Winter: 3 };

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Absolute day of game-time (0-indexed). */
export function toAbsolute(d: CurrentDay): number {
  return (d.year - 1) * DAYS_PER_SEASON * 4
    + SEASON_INDEX[d.season] * DAYS_PER_SEASON
    + (d.day - 1);
}

export function fromAbsolute(abs: number): CurrentDay {
  const a = Math.max(0, Math.floor(abs));
  const year = 1 + Math.floor(a / (DAYS_PER_SEASON * 4));
  const within = a % (DAYS_PER_SEASON * 4);
  const seasonIdx = Math.floor(within / DAYS_PER_SEASON);
  const day = (within % DAYS_PER_SEASON) + 1;
  return { season: SEASONS[seasonIdx], day, year };
}

export function advanceDay(d: CurrentDay, delta: number): CurrentDay {
  return fromAbsolute(toAbsolute(d) + delta);
}

/** Convert a planted (season, day) to absolute day-of-game (assumes year 1). */
export function plantedAbsolute(t: TrackedCrop, plantedYear = 1): number {
  return toAbsolute({ season: t.season, day: t.day, year: plantedYear });
}

// ---------------- validation ----------------

export function validateTrackedCrop(raw: unknown): TrackedCrop | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id) return null;
  if (typeof r.cropName !== 'string' || !r.cropName) return null;

  const season: Season = SEASONS.includes(r.season as Season)
    ? (r.season as Season)
    : 'Spring';
  const day = clamp(Math.floor(Number(r.day) || 1), 1, 28);
  const farmingLevel = clamp(Math.floor(Number(r.farmingLevel) || 0), 0, 14) as FarmingLevel;
  const fertilizerId: FertilizerId = FERTILIZER_BY_ID[r.fertilizerId as FertilizerId]
    ? (r.fertilizerId as FertilizerId)
    : 'none';
  let fertilizerAmount: number | undefined;
  if (r.fertilizerAmount !== null && r.fertilizerAmount !== undefined) {
    const n = Number(r.fertilizerAmount);
    fertilizerAmount = Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
  }
  const seedsBought = Math.max(0, Math.floor(Number(r.seedsBought) || 0));
  const createdAt = Number.isFinite(Number(r.createdAt))
    ? Math.floor(Number(r.createdAt))
    : Date.now();

  const validModes: ProcessingMode[] = ['raw', 'keg', 'silver-aged', 'gold-aged', 'iridium-aged'];
  const processingMode: ProcessingMode | undefined = validModes.includes(r.processingMode as ProcessingMode)
    ? (r.processingMode as ProcessingMode) : undefined;
  const parseCount = (v: unknown): number | undefined => {
    if (v === null || v === undefined) return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
  };

  return {
    id: r.id, cropName: r.cropName,
    season, day, farmingLevel, fertilizerId, fertilizerAmount,
    seedsBought, createdAt,
    processingMode,
    kegCount: parseCount(r.kegCount),
    caskCount: parseCount(r.caskCount),
    hasTiller: !!r.hasTiller,
    hasArtisan: !!r.hasArtisan,
  };
}

export function validateToday(raw: unknown): CurrentDay | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const season: Season = SEASONS.includes(r.season as Season)
    ? (r.season as Season)
    : 'Spring';
  const day = clamp(Math.floor(Number(r.day) || 1), 1, 28);
  const year = Math.max(1, Math.floor(Number(r.year) || 1));
  return { season, day, year };
}

// ---------------- storage ----------------

export function loadTrackedCrops(): TrackedCrop[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CROPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(validateTrackedCrop)
      .filter((s): s is TrackedCrop => s !== null);
  } catch { return []; }
}

export function saveTrackedCrops(list: TrackedCrop[]): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(CROPS_KEY, JSON.stringify(list)); } catch { /* */ }
}

export function loadToday(): CurrentDay {
  if (typeof localStorage === 'undefined') return { season: 'Spring', day: 1, year: 1 };
  try {
    const raw = localStorage.getItem(TODAY_KEY);
    if (!raw) return { season: 'Spring', day: 1, year: 1 };
    return validateToday(JSON.parse(raw)) ?? { season: 'Spring', day: 1, year: 1 };
  } catch { return { season: 'Spring', day: 1, year: 1 }; }
}

export function saveToday(t: CurrentDay): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(TODAY_KEY, JSON.stringify(t)); } catch { /* */ }
}

// ---------------- factory + queries ----------------

export interface TrackablePlanSnapshot {
  cropName: string;
  season: Season;
  day: number;
  farmingLevel: FarmingLevel;
  fertilizerId: FertilizerId;
  fertilizerAmount?: number;
  seedsBought: number;
  processingMode?: ProcessingMode;
  kegCount?: number;
  caskCount?: number;
  hasTiller?: boolean;
  hasArtisan?: boolean;
}

export function createTrackedCrop(s: TrackablePlanSnapshot): TrackedCrop {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    cropName: s.cropName,
    season: s.season,
    day: s.day,
    farmingLevel: s.farmingLevel,
    fertilizerId: s.fertilizerId,
    fertilizerAmount: s.fertilizerAmount,
    seedsBought: s.seedsBought,
    createdAt: Date.now(),
    processingMode: s.processingMode,
    kegCount: s.kegCount,
    caskCount: s.caskCount,
    hasTiller: s.hasTiller,
    hasArtisan: s.hasArtisan,
  };
}
