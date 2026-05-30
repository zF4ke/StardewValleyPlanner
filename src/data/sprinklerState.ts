// Sprinkler tracker: how close am I to watering the farm, and what do I still
// need to mine or buy? Supports all three sprinkler tiers.
//
// Recipes (per sprinkler):
//   Sprinkler         = 1 Copper Bar + 1 Iron Bar              (waters 4 tiles)
//   Quality Sprinkler = 1 Iron Bar + 1 Gold Bar + 1 Refined Quartz (waters 8)
//   Iridium Sprinkler = 1 Gold Bar + 1 Iridium Bar + 1 Battery Pack (waters 24)
//
// Smelting: each metal Bar = 5 Ore + 1 Coal.
// Refined Quartz: 1 Quartz + 1 Coal, OR 1 Fire Quartz + 1 Coal = 3 Refined Quartz.

const KEY = 'stardew-workshop:sprinklers:v2';
const LEGACY_KEY = 'stardew-workshop:sprinklers:v1';

export type SprinklerType = 'basic' | 'quality' | 'iridium';

export type BarKind = 'copper' | 'iron' | 'gold' | 'iridium';

// Owned-material keys (finished sprinklers are tracked separately, per type).
export type MaterialKey =
  | 'copperBars' | 'ironBars' | 'goldBars' | 'iridiumBars'
  | 'copperOre' | 'ironOre' | 'goldOre' | 'iridiumOre'
  | 'coal' | 'quartz' | 'fireQuartz' | 'refinedQuartz' | 'batteryPacks';

// A daily log line: a label plus how much of each thing you gathered that day.
export type LogField = 'built' | MaterialKey;

export interface LogEntry {
  id: string;
  label: string;
  gains: Partial<Record<LogField, number>>;
  /** Which sprinkler tier a `built` gain belongs to. Older saves infer this. */
  builtType?: SprinklerType;
}

export interface SprinklerState {
  type: SprinklerType;
  goal: number;
  built: Record<SprinklerType, number>;
  mats: Record<MaterialKey, number>;
  logs: LogEntry[];
}

export interface Recipe {
  label: string;
  emoji: string;
  tiles: number;
  farming: number;
  sell: number;
  bars: Partial<Record<BarKind, number>>;
  refinedQuartz: number;
  batteryPacks: number;
}

export const RECIPES: Record<SprinklerType, Recipe> = {
  basic: {
    label: 'Sprinkler', emoji: '🚿', tiles: 4, farming: 2, sell: 100,
    bars: { copper: 1, iron: 1 }, refinedQuartz: 0, batteryPacks: 0,
  },
  quality: {
    label: 'Quality Sprinkler', emoji: '💧', tiles: 8, farming: 6, sell: 450,
    bars: { iron: 1, gold: 1 }, refinedQuartz: 1, batteryPacks: 0,
  },
  iridium: {
    label: 'Iridium Sprinkler', emoji: '🟣', tiles: 24, farming: 9, sell: 1000,
    bars: { gold: 1, iridium: 1 }, refinedQuartz: 0, batteryPacks: 1,
  },
};

export const SPRINKLER_TYPES: SprinklerType[] = ['basic', 'quality', 'iridium'];

const barToBarKey: Record<BarKind, MaterialKey> = {
  copper: 'copperBars', iron: 'ironBars', gold: 'goldBars', iridium: 'iridiumBars',
};
const barToOreKey: Record<BarKind, MaterialKey> = {
  copper: 'copperOre', iron: 'ironOre', gold: 'goldOre', iridium: 'iridiumOre',
};

// Display metadata for every owned material the inputs can show.
export const MATERIALS: Array<{ key: MaterialKey; label: string; emoji: string }> = [
  { key: 'copperBars',    label: 'Copper Bars',    emoji: '🟥' },
  { key: 'copperOre',     label: 'Copper Ore',     emoji: '🟤' },
  { key: 'ironBars',      label: 'Iron Bars',      emoji: '⬛' },
  { key: 'ironOre',       label: 'Iron Ore',       emoji: '⚙️' },
  { key: 'goldBars',      label: 'Gold Bars',      emoji: '🟨' },
  { key: 'goldOre',       label: 'Gold Ore',       emoji: '🟡' },
  { key: 'iridiumBars',   label: 'Iridium Bars',   emoji: '🔮' },
  { key: 'iridiumOre',    label: 'Iridium Ore',    emoji: '🪻' },
  { key: 'refinedQuartz', label: 'Refined Quartz', emoji: '💠' },
  { key: 'quartz',        label: 'Quartz',         emoji: '🔷' },
  { key: 'fireQuartz',    label: 'Fire Quartz',    emoji: '🔥' },
  { key: 'batteryPacks',  label: 'Battery Packs',  emoji: '🔋' },
  { key: 'coal',          label: 'Coal',           emoji: '⚫' },
];

const MATERIAL_META: Record<MaterialKey, { label: string; emoji: string }> =
  Object.fromEntries(MATERIALS.map((m) => [m.key, { label: m.label, emoji: m.emoji }])) as Record<
    MaterialKey,
    { label: string; emoji: string }
  >;

function emptyMats(): Record<MaterialKey, number> {
  return {
    copperBars: 0, ironBars: 0, goldBars: 0, iridiumBars: 0,
    copperOre: 0, ironOre: 0, goldOre: 0, iridiumOre: 0,
    coal: 0, quartz: 0, fireQuartz: 0, refinedQuartz: 0, batteryPacks: 0,
  };
}

export function defaultState(): SprinklerState {
  return {
    type: 'quality',
    goal: 100,
    built: { basic: 0, quality: 0, iridium: 0 },
    mats: emptyMats(),
    logs: [],
  };
}

let idCounter = 0;
export function makeId(): string {
  idCounter += 1;
  return `${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

export const DEFAULT_STATE = defaultState();

function n(x: unknown): number {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}
const clampInt = (x: unknown) => Math.max(0, Math.floor(n(x)));

/** Materials relevant to a given sprinkler type, in display order. */
export function materialsFor(type: SprinklerType): MaterialKey[] {
  const recipe = RECIPES[type];
  const keys: MaterialKey[] = [];
  for (const bar of Object.keys(recipe.bars) as BarKind[]) {
    keys.push(barToBarKey[bar], barToOreKey[bar]);
  }
  if (recipe.refinedQuartz > 0) keys.push('refinedQuartz', 'quartz', 'fireQuartz');
  if (recipe.batteryPacks > 0) keys.push('batteryPacks');
  keys.push('coal');
  return keys;
}

// ----- persistence + migration -----

// Legacy/import field names → our log fields.
const LOG_ALIASES: Record<string, LogField> = {
  sprinklersBuilt: 'built', built: 'built',
  ironOre: 'ironOre', goldOre: 'goldOre', copperOre: 'copperOre', iridiumOre: 'iridiumOre',
  ironBars: 'ironBars', goldBars: 'goldBars', copperBars: 'copperBars', iridiumBars: 'iridiumBars',
  coal: 'coal', quartz: 'quartz', fireQuartz: 'fireQuartz', refinedQuartz: 'refinedQuartz',
  batteryPacks: 'batteryPacks',
};

// Accepts both our shape ({ id, label, gains }) and a flat import row.
function normalizeLog(entry: unknown, fallbackBuiltType: SprinklerType): LogEntry | null {
  if (!entry || typeof entry !== 'object') return null;
  const o = entry as Record<string, unknown>;
  const gains: Partial<Record<LogField, number>> = {};

  const rawGains = (o.gains && typeof o.gains === 'object' ? o.gains : o) as Record<string, unknown>;
  for (const [k, field] of Object.entries(LOG_ALIASES)) {
    const v = clampInt(rawGains[k]);
    if (v) gains[field] = (gains[field] ?? 0) + v;
  }

  const label = typeof o.label === 'string' ? o.label : '';
  if (!label && Object.keys(gains).length === 0) return null;
  const builtType: SprinklerType =
    o.builtType === 'basic' || o.builtType === 'quality' || o.builtType === 'iridium'
      ? o.builtType
      : fallbackBuiltType;
  return {
    id: typeof o.id === 'string' ? o.id : makeId(),
    label,
    gains,
    ...(gains.built ? { builtType } : {}),
  };
}

function migrateLogs(raw: unknown, fallbackBuiltType: SprinklerType): LogEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => normalizeLog(entry, fallbackBuiltType)).filter((e): e is LogEntry => e !== null);
}

export function migrateState(parsed: unknown): SprinklerState {
  const base = defaultState();
  if (!parsed || typeof parsed !== 'object') return base;
  const r = parsed as Record<string, unknown>;

  const type: SprinklerType =
    r.type === 'basic' || r.type === 'quality' || r.type === 'iridium' ? r.type : 'quality';
  const goal = clampInt(r.goal ?? base.goal);

  // Legacy v1 stored a single `mats` object with `built` inside it (quality only).
  const rawMats = (r.mats ?? {}) as Record<string, unknown>;
  const mats = emptyMats();
  for (const key of Object.keys(mats) as MaterialKey[]) {
    mats[key] = clampInt(rawMats[key]);
  }

  const built: Record<SprinklerType, number> = { basic: 0, quality: 0, iridium: 0 };
  if (r.built && typeof r.built === 'object') {
    const b = r.built as Record<string, unknown>;
    built.basic = clampInt(b.basic);
    built.quality = clampInt(b.quality);
    built.iridium = clampInt(b.iridium);
  } else {
    // legacy: the single built count was a Quality Sprinkler count
    built.quality = clampInt(rawMats.built);
  }

  return { type, goal, built, mats, logs: migrateLogs(r.logs, type) };
}

// One-time import of the old exported JSON: { inventory: {...}, logs: [...] }.
export function parseImport(input: string | object): SprinklerState {
  const data = (typeof input === 'string' ? JSON.parse(input) : input) as Record<string, unknown>;
  const inv = (data.inventory ?? {}) as Record<string, unknown>;

  const mats = emptyMats();
  for (const key of Object.keys(mats) as MaterialKey[]) {
    mats[key] = clampInt(inv[key]);
  }

  const built: Record<SprinklerType, number> = {
    basic: 0,
    quality: clampInt(inv.sprinklersBuilt ?? inv.built),
    iridium: 0,
  };

  return {
    type: 'quality',
    goal: clampInt(inv.goal ?? defaultState().goal),
    built,
    mats,
    logs: migrateLogs(data.logs, 'quality'),
  };
}

export function loadSprinklerState(): SprinklerState {
  if (typeof localStorage === 'undefined') return defaultState();
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return defaultState();
    return migrateState(JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

export function saveSprinklerState(s: SprinklerState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode */
  }
}

// ----- Clint + Krobus pricing -----

export type PriceYear = 'y1' | 'y2';

// Clint sells ore + coal; prices rise permanently in Year 2. He does NOT sell
// Iridium Ore, Quartz, or Battery Packs.
export const CLINT_PRICES: Record<PriceYear, Partial<Record<MaterialKey, number>>> = {
  y1: { copperOre: 75, ironOre: 150, goldOre: 400, coal: 150 },
  y2: { copperOre: 150, ironOre: 250, goldOre: 750, coal: 250 },
};

export const KROBUS_IRIDIUM_PRICE = 10000;

// ----- summary -----

export interface SprinklerCard {
  key: MaterialKey | 'built';
  label: string;
  emoji: string;
  owned: number;
  target: number;
  remaining: number;
}

export interface SprinklerSummary {
  type: SprinklerType;
  recipe: Recipe;
  goal: number;
  built: number;
  remaining: number;
  /** sprinklers you could craft right now by smelting current raw stock */
  craftableNow: number;
  done: boolean;
  /** raw materials still missing to finish the whole goal */
  need: Record<MaterialKey, number>;
  /** Clint-stocked materials still missing after owned ore and coal are counted. */
  clintNeed: Record<MaterialKey, number>;
  cards: SprinklerCard[];
}

export function summarize(s: SprinklerState): SprinklerSummary {
  const type = s.type;
  const recipe = RECIPES[type];
  const m = s.mats;
  const goal = clampInt(s.goal);
  const built = clampInt(s.built[type]);
  const remaining = Math.max(0, goal - built);

  const need = emptyMats();
  const clintNeed = emptyMats();
  const cards: SprinklerCard[] = [
    {
      key: 'built',
      label: `${recipe.label}s`,
      emoji: recipe.emoji,
      owned: built,
      target: goal,
      remaining,
    },
  ];

  let coalForBars = 0;
  for (const bar of Object.keys(recipe.bars) as BarKind[]) {
    const perSprinkler = recipe.bars[bar] ?? 0;
    const barsNeed = remaining * perSprinkler;
    const barsToCraft = Math.max(0, barsNeed - n(m[barToBarKey[bar]]));
    const oreNeed = Math.max(0, barsToCraft * 5 - n(m[barToOreKey[bar]]));
    coalForBars += barsToCraft;
    need[barToOreKey[bar]] = oreNeed;
    clintNeed[barToOreKey[bar]] += oreNeed;

    cards.push({
      key: barToBarKey[bar],
      label: MATERIAL_META[barToBarKey[bar]].label,
      emoji: MATERIAL_META[barToBarKey[bar]].emoji,
      owned: clampInt(m[barToBarKey[bar]]),
      target: barsNeed,
      remaining: barsToCraft,
    });
    cards.push({
      key: barToOreKey[bar],
      label: MATERIAL_META[barToOreKey[bar]].label,
      emoji: MATERIAL_META[barToOreKey[bar]].emoji,
      owned: clampInt(m[barToOreKey[bar]]),
      target: barsToCraft * 5,
      remaining: oreNeed,
    });
  }

  // Refined Quartz (only some recipes need it).
  let fireUse = 0;
  let refinedLeft = 0;
  if (recipe.refinedQuartz > 0) {
    const refinedNeed = remaining * recipe.refinedQuartz;
    const refinedToMake = Math.max(0, refinedNeed - n(m.refinedQuartz));
    fireUse = Math.min(n(m.fireQuartz), Math.ceil(refinedToMake / 3));
    const refinedFromFire = Math.min(refinedToMake, fireUse * 3);
    refinedLeft = Math.max(0, refinedToMake - refinedFromFire);
    need.quartz = Math.max(0, refinedLeft - n(m.quartz));

    cards.push({
      key: 'refinedQuartz',
      label: MATERIAL_META.refinedQuartz.label,
      emoji: MATERIAL_META.refinedQuartz.emoji,
      owned: clampInt(m.refinedQuartz),
      target: refinedNeed,
      remaining: refinedToMake,
    });
    cards.push({
      key: 'quartz',
      label: MATERIAL_META.quartz.label,
      emoji: MATERIAL_META.quartz.emoji,
      owned: clampInt(m.quartz),
      target: need.quartz + clampInt(m.quartz),
      remaining: need.quartz,
    });
  }

  // Battery Packs (Iridium only).
  if (recipe.batteryPacks > 0) {
    const batteryNeed = remaining * recipe.batteryPacks;
    const batteryToBuy = Math.max(0, batteryNeed - n(m.batteryPacks));
    need.batteryPacks = batteryToBuy;
    cards.push({
      key: 'batteryPacks',
      label: MATERIAL_META.batteryPacks.label,
      emoji: MATERIAL_META.batteryPacks.emoji,
      owned: clampInt(m.batteryPacks),
      target: batteryNeed,
      remaining: batteryToBuy,
    });
  }

  // Coal: 1 per bar smelted + 1 per fire-quartz batch + 1 per quartz refined.
  const coalTotal = coalForBars + fireUse + refinedLeft;
  need.coal = Math.max(0, coalTotal - n(m.coal));
  clintNeed.coal = need.coal;
  cards.push({
    key: 'coal',
    label: MATERIAL_META.coal.label,
    emoji: MATERIAL_META.coal.emoji,
    owned: clampInt(m.coal),
    target: coalTotal,
    remaining: need.coal,
  });

  return {
    type,
    recipe,
    goal,
    built,
    remaining,
    craftableNow: craftableNow(s, recipe, remaining),
    done: remaining === 0,
    need,
    clintNeed,
    cards,
  };
}

// How many sprinklers can be crafted right now from current raw stock.
function craftableNow(s: SprinklerState, recipe: Recipe, remaining: number): number {
  const m = s.mats;
  let best = 0;
  for (let k = 1; k <= remaining; k++) {
    let coal = 0;
    let ok = true;
    for (const bar of Object.keys(recipe.bars) as BarKind[]) {
      const barsNeed = k * (recipe.bars[bar] ?? 0);
      const barsToCraft = Math.max(0, barsNeed - n(m[barToBarKey[bar]]));
      if (n(m[barToOreKey[bar]]) < barsToCraft * 5) { ok = false; break; }
      coal += barsToCraft;
    }
    if (!ok) break;

    if (recipe.refinedQuartz > 0) {
      const rqNeed = Math.max(0, k * recipe.refinedQuartz - n(m.refinedQuartz));
      const fu = Math.min(n(m.fireQuartz), Math.ceil(rqNeed / 3));
      const rqLeft = Math.max(0, rqNeed - Math.min(rqNeed, fu * 3));
      if (n(m.quartz) < rqLeft) break;
      coal += fu + rqLeft;
    }
    if (recipe.batteryPacks > 0 && n(m.batteryPacks) < k * recipe.batteryPacks) break;
    if (n(m.coal) < coal) break;
    best = k;
  }
  return best;
}

/** Gold to buy the Clint-stocked gap (ore + coal). Excludes iridium ore, quartz, batteries. */
export function buyGap(need: Record<MaterialKey, number>, year: PriceYear): number {
  const prices = CLINT_PRICES[year];
  let total = 0;
  for (const key of Object.keys(prices) as MaterialKey[]) {
    total += (need[key] ?? 0) * (prices[key] ?? 0);
  }
  return total;
}

/** Gold to buy the remaining Iridium Sprinklers from Krobus (Fridays, 10,000g each). */
export function krobusGap(remaining: number): number {
  return Math.max(0, remaining) * KROBUS_IRIDIUM_PRICE;
}
