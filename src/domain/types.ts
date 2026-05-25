export type Season = 'Spring' | 'Summer' | 'Fall' | 'Winter';
export const SEASONS: Season[] = ['Spring', 'Summer', 'Fall', 'Winter'];
export const DAYS_PER_SEASON = 28;

export type Quality = 'Regular' | 'Silver' | 'Gold' | 'Iridium';
export const QUALITY_MULT: Record<Quality, number> = {
  Regular: 1,
  Silver: 1.25,
  Gold: 1.5,
  Iridium: 2,
};

/** How the seeds are obtained. Used for filter chips. */
export type SeedSource =
  | 'Pierre'       // normal General Store (default ON)
  | 'JojaMart'     // alternate shop (default ON, same as Pierre tier)
  | 'Oasis'        // desert shop
  | 'EggFestival'  // Strawberry only
  | 'TravelingCart'
  | 'IslandTrader'
  | 'Crafted'      // crafted recipe (e.g. Coffee from drop, Tea Sapling)
  | 'Drop'         // monster/fishing/foraging drop / quest reward
  | 'SeedMaker'    // can only be made via Seed Maker
  | 'Special';     // Sweet Gem Berry, Ancient Fruit, Powdermelon etc.

export interface Crop {
  name: string;
  seasons: Season[];           // valid growing seasons; multi-season survives across listed
  growthDays: number;          // days from planting (planting day not counted)
  regrowthDays?: number;       // if set, after first harvest the plant regrows every N days
  seedCost: number;            // gold cost per seed (lowest normal price); 0 if not buyable
  sellPrice: number;           // base regular sell price
  producePerHarvest: number;   // average produce per harvest (integer baseline)
  source: SeedSource;
  trellis?: boolean;           // takes up tile differently (Hops, Grape, Green Bean)
  notes?: string;              // mechanic/assumption note (extra-yield, giant crop, etc.)
  accessNote?: string;         // how to obtain the seed (Year 2+, festival day, trade cost…)
  emoji?: string;              // small icon glyph fallback
}

export interface PlannerInput {
  season: Season;
  day: number;             // 1..28
  money: number;
  quality: Quality;
  enabledSources: SeedSource[];
}

export interface CropPlan {
  crop: Crop;
  seedsBought: number;
  seedSpend: number;
  moneyAfterBuying: number;
  harvestDays: number[];   // absolute day-of-year from selected season start (offset 0)
  harvestDates: string[];  // pretty "Summer 14"
  firstHarvestDate?: string;
  lastHarvestDate?: string;
  totalProduce: number;
  revenue: number;
  finalMoney: number;
  netProfit: number;
  profitPerDay: number;
  daysUsed: number;
  warnings: string[];
}
