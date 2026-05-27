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

export type CropCategory = 'fruit' | 'vegetable' | 'flower' | 'special';
export type KegProduct = 'wine' | 'juice' | 'beer' | 'pale-ale' | 'coffee' | 'green-tea' | 'none';

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
  // ---- v0.7 processing ----
  cropCategory?: CropCategory;
  kegProduct?: KegProduct;
  kegInputCount?: number;      // items consumed per keg cycle (5 for Coffee Beans, 1 otherwise)
  caskable?: boolean;          // true only for wine/beer/pale-ale
}

export type FertilizerId =
  | 'none'
  | 'basic'          // Basic Fertilizer  (quality level 1)
  | 'quality'        // Quality Fertilizer (quality level 2)
  | 'deluxe'         // Deluxe Fertilizer  (quality level 3)
  | 'speed'          // Speed-Gro         (10% faster growth)
  | 'deluxe-speed'   // Deluxe Speed-Gro  (25% faster)
  | 'hyper-speed'    // Hyper Speed-Gro   (33% faster)
  | 'basic-retain'   // Basic Retaining Soil
  | 'quality-retain' // Quality Retaining Soil
  | 'deluxe-retain'  // Deluxe Retaining Soil
  | 'tree';          // Tree Fertilizer (not used by crop planner profit math)

export type FarmingLevel = 0|1|2|3|4|5|6|7|8|9|10|11|12|13|14;

export type ProcessingMode = 'raw' | 'keg' | 'silver-aged' | 'gold-aged' | 'iridium-aged';

export interface PlannerInput {
  season: Season;
  day: number;             // 1..28
  money: number;
  quality: Quality;
  enabledSources: SeedSource[];
  farmingLevel: FarmingLevel;
  fertilizerId: FertilizerId;
  /** Limited fertilizer mode. undefined = assume enough fertilizer for every seed. */
  fertilizerAmount?: number;
  // ---- v0.7 processing ----
  processingMode?: ProcessingMode;     // default 'raw'
  kegCount?: number;                   // undefined = unlimited, 0 = none available
  caskCount?: number;                  // undefined = unlimited, 0 = none available
  hasTiller?: boolean;                 // +10% raw crop sales
  hasArtisan?: boolean;                // +40% on most artisan goods (not Coffee)
}

export interface QualityMix {
  regular: number;
  silver: number;
  gold: number;
  iridium: number;
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
  // Fertilizer-aware additions:
  fertilizerId: FertilizerId;
  fertilizerRequired: number;        // how many fertilizer items are required (typically = fertilized seeds)
  fertilizedSeeds: number;           // seeds planted on fertilized soil
  unfertilizedSeeds: number;         // seeds planted on bare soil (when amount is limited)
  expectedUnitValueFertilized: number;   // expected gold per produce item under selected fertilizer
  expectedUnitValueUnfertilized: number; // expected gold per produce item with no fertilizer
  qualityMixFertilized: QualityMix;
  qualityMixUnfertilized: QualityMix;
  effectiveGrowthDays: number;       // after Speed-Gro
  // ---- v0.7 processing ----
  processingMode: ProcessingMode;
  effectiveProcessingMode: ProcessingMode;
  kegProductLabel?: string;          // "Wine", "Juice", "Beer", "Pale Ale", "Coffee", "Green Tea"
  processedCount: number;            // # of processed goods produced
  rawLeftoverCount: number;          // # of raw items sold without processing
  rawRevenue: number;                // gold from raw sales
  processedRevenue: number;          // gold from processed sales
  lastFinishedDate?: string;         // pretty date of the last collection (keg or cask)
  processingWarnings: string[];      // "No keg product", "Cannot be cask aged", etc.
  processingEvents: ProcessingEvent[];
}

export type ProcessingEventKind = 'loadKeg' | 'collectKeg' | 'loadCask' | 'collectCask';

export interface ProcessingEvent {
  day: number;                       // day offset from selected planting date
  kind: ProcessingEventKind;
  count: number;                     // number of output goods involved in this event
}
