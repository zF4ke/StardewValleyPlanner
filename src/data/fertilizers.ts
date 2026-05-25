import { FertilizerId } from '../domain/types';

/**
 * Fertilizer dataset, sourced from the Stardew Valley Wiki:
 *   https://stardewvalleywiki.com/Fertilizer
 *   https://stardewvalleywiki.com/Speed-Gro
 *   https://stardewvalleywiki.com/Deluxe_Speed-Gro
 *   https://stardewvalleywiki.com/Hyper_Speed-Gro
 *   https://stardewvalleywiki.com/Retaining_Soil
 *   https://stardewvalleywiki.com/Tree_Fertilizer
 *
 * Quality-fertilizer probability formula (game source, 1.6):
 *   q1 = 0.2 * (farmingLevel/10) + 0.2 * fertilizerLevel * ((farmingLevel+2)/12) + 0.01
 *   q2 = min(0.75, q1 * 2)
 *   non-deluxe: gold = q1, silver = (1-gold)*q2, regular = remaining
 *   deluxe: iridium = q1/2, gold = (1-iridium)*q1, silver = remaining
 *
 * Speed-Gro: reduces first-harvest growth time only, NOT regrowth intervals.
 * The current planner stores total growth days, so it approximates the in-game
 * staged calculation as floor(totalGrowthDays * modifier) days removed.
 */

export type IngredientId =
  | 'Sap' | 'Fiber' | 'Stone' | 'Clay' | 'Fish' | 'PineTar' | 'OakResin'
  | 'Moss' | 'IridiumBar' | 'CinderShard' | 'BoneFragment'
  | 'SolarEssence' | 'RadioactiveOre';

/** Approximate gold cost-per-unit for ingredients, used by the Fertilizer Workshop
 *  to evaluate the "gold value" of a crafted unit (vendor sell prices where
 *  applicable, or a reasonable acquisition cost otherwise). */
export const INGREDIENT_VALUE: Record<IngredientId, number> = {
  Sap: 2,
  Fiber: 1,
  Stone: 2,
  Clay: 20,
  Fish: 50,             // "any fish" — average value; user can override on the workshop UI
  PineTar: 100,
  OakResin: 150,
  Moss: 5,
  IridiumBar: 1000,
  CinderShard: 50,      // cinder shard is non-buyable, but has a rough trade value
  BoneFragment: 12,
  SolarEssence: 40,
  RadioactiveOre: 300,
};

export const INGREDIENT_LABEL: Record<IngredientId, string> = {
  Sap: 'Sap',
  Fiber: 'Fiber',
  Stone: 'Stone',
  Clay: 'Clay',
  Fish: 'Any fish',
  PineTar: 'Pine Tar',
  OakResin: 'Oak Resin',
  Moss: 'Moss',
  IridiumBar: 'Iridium Bar',
  CinderShard: 'Cinder Shard',
  BoneFragment: 'Bone Fragment',
  SolarEssence: 'Solar Essence',
  RadioactiveOre: 'Radioactive Ore',
};

export interface FertilizerRecipe {
  ingredients: Array<{ id: IngredientId; qty: number }>;
  outputs: number;       // how many items the recipe produces
}

export interface FertilizerVendor {
  name: string;          // "Pierre's", "Oasis", "Island Trader"
  price: number;         // gold (or trade-value approximation if non-gold)
  currency?: string;     // e.g. "Cinder Shard" when non-gold
  notes?: string;        // year/day restrictions
}

export interface Fertilizer {
  id: FertilizerId;
  name: string;
  emoji: string;
  /** Crop-quality level used by the probability formula. 0 if N/A. */
  qualityLevel: 0 | 1 | 2 | 3;
  /** Fraction of growth time removed (Speed-Gro family). 0 if N/A. */
  speedMod: number;
  /** Water retention chance, 0..1. 0 if N/A. */
  retainChance: number;
  sellPrice: number;
  recipe?: FertilizerRecipe;
  vendors: FertilizerVendor[];
  unlock?: string;
  summary: string;
  /** Hidden from the crop planner's fertilizer selector (e.g. Tree Fertilizer). */
  planterHidden?: boolean;
}

export const FERTILIZERS: Fertilizer[] = [
  {
    id: 'none',
    name: 'No fertilizer',
    emoji: '🚫',
    qualityLevel: 0, speedMod: 0, retainChance: 0,
    sellPrice: 0,
    vendors: [],
    summary: 'Bare soil. Crops can still be Silver/Gold based on farming level alone.',
  },
  {
    id: 'basic',
    name: 'Basic Fertilizer',
    emoji: '🟫',
    qualityLevel: 1, speedMod: 0, retainChance: 0,
    sellPrice: 2,
    recipe: { ingredients: [{ id: 'Sap', qty: 2 }], outputs: 1 },
    vendors: [{ name: "Pierre's", price: 100, notes: 'Starting Spring 15, Year 1' }],
    unlock: 'Crafting: Farming Level 1.',
    summary: 'Slightly improves crop quality.',
  },
  {
    id: 'quality',
    name: 'Quality Fertilizer',
    emoji: '🟧',
    qualityLevel: 2, speedMod: 0, retainChance: 0,
    sellPrice: 10,
    recipe: { ingredients: [{ id: 'Sap', qty: 4 }, { id: 'Fish', qty: 1 }], outputs: 2 },
    vendors: [{ name: "Pierre's", price: 150, notes: 'Year 2+' }],
    unlock: 'Crafting: Farming Level 9.',
    summary: 'Solid odds of Silver/Gold, no Iridium.',
  },
  {
    id: 'deluxe',
    name: 'Deluxe Fertilizer',
    emoji: '🟪',
    qualityLevel: 3, speedMod: 0, retainChance: 0,
    sellPrice: 70,
    recipe: { ingredients: [{ id: 'IridiumBar', qty: 1 }, { id: 'Sap', qty: 40 }], outputs: 5 },
    vendors: [],
    unlock: "Crafting recipe from Qi's Walnut Room for 20 Qi Gems.",
    summary: 'No Regular-quality harvests; chance of Iridium.',
  },
  {
    id: 'speed',
    name: 'Speed-Gro',
    emoji: '🟢',
    qualityLevel: 0, speedMod: 0.10, retainChance: 0,
    sellPrice: 20,
    recipe: { ingredients: [{ id: 'PineTar', qty: 1 }, { id: 'Moss', qty: 5 }], outputs: 5 },
    vendors: [{ name: "Pierre's", price: 100, notes: 'Starting Spring 15, Year 1' }],
    unlock: 'Crafting: Farming Level 3.',
    summary: '10% faster growth (first harvest only).',
  },
  {
    id: 'deluxe-speed',
    name: 'Deluxe Speed-Gro',
    emoji: '🔵',
    qualityLevel: 0, speedMod: 0.25, retainChance: 0,
    sellPrice: 40,
    recipe: { ingredients: [{ id: 'OakResin', qty: 1 }, { id: 'BoneFragment', qty: 5 }], outputs: 5 },
    vendors: [
      { name: "Pierre's", price: 150, notes: 'Year 2+' },
      { name: 'Oasis', price: 80, notes: 'Thursdays' },
    ],
    unlock: 'Crafting: Farming Level 8.',
    summary: '25% faster growth (first harvest only).',
  },
  {
    id: 'hyper-speed',
    name: 'Hyper Speed-Gro',
    emoji: '⚡',
    qualityLevel: 0, speedMod: 0.33, retainChance: 0,
    sellPrice: 70,
    recipe: { ingredients: [{ id: 'RadioactiveOre', qty: 1 }, { id: 'BoneFragment', qty: 3 }, { id: 'SolarEssence', qty: 1 }], outputs: 1 },
    vendors: [],
    unlock: "Crafting recipe from Qi's Walnut Room for 30 Qi Gems.",
    summary: '33% faster growth (first harvest only).',
  },
  {
    id: 'basic-retain',
    name: 'Basic Retaining Soil',
    emoji: '💧',
    qualityLevel: 0, speedMod: 0, retainChance: 0.33,
    sellPrice: 4,
    recipe: { ingredients: [{ id: 'Stone', qty: 2 }], outputs: 1 },
    vendors: [{ name: "Pierre's", price: 100, notes: 'Starting Spring 15, Year 1' }],
    unlock: 'Crafting: Farming Level 4.',
    summary: '33% chance soil stays watered overnight.',
  },
  {
    id: 'quality-retain',
    name: 'Quality Retaining Soil',
    emoji: '💧',
    qualityLevel: 0, speedMod: 0, retainChance: 0.66,
    sellPrice: 5,
    recipe: { ingredients: [{ id: 'Stone', qty: 3 }, { id: 'Clay', qty: 1 }], outputs: 2 },
    vendors: [
      { name: "Pierre's", price: 150, notes: 'Year 2+' },
      { name: 'Oasis', price: 200, notes: 'Saturdays' },
    ],
    unlock: 'Crafting: Farming Level 7.',
    summary: '66% chance soil stays watered overnight.',
  },
  {
    id: 'deluxe-retain',
    name: 'Deluxe Retaining Soil',
    emoji: '🌊',
    qualityLevel: 0, speedMod: 0, retainChance: 1,
    sellPrice: 30,
    recipe: { ingredients: [{ id: 'Stone', qty: 5 }, { id: 'Fiber', qty: 3 }, { id: 'Clay', qty: 1 }], outputs: 1 },
    vendors: [],
    unlock: 'Crafting recipe from Island Trader for 50 Cinder Shards.',
    summary: '100% chance soil stays watered overnight.',
  },
  {
    id: 'tree',
    name: 'Tree Fertilizer',
    emoji: '🌳',
    qualityLevel: 0, speedMod: 0, retainChance: 0,
    sellPrice: 10,
    recipe: { ingredients: [{ id: 'Fiber', qty: 5 }, { id: 'Stone', qty: 5 }], outputs: 1 },
    vendors: [],
    unlock: 'Crafting: Foraging Level 7.',
    summary: 'Accelerates tree growth. Does not affect crops.',
    planterHidden: true,
  },
];

export const FERTILIZER_BY_ID: Record<FertilizerId, Fertilizer> = Object.fromEntries(
  FERTILIZERS.map((f) => [f.id, f])
) as Record<FertilizerId, Fertilizer>;

/** Quality probability mix for the given farming level + fertilizer level. */
export function qualityMix(
  farmingLevel: number,
  fertilizerLevel: 0 | 1 | 2 | 3
): { regular: number; silver: number; gold: number; iridium: number } {
  const q1 = Math.min(
    0.75,
    0.2 * (farmingLevel / 10) + 0.2 * fertilizerLevel * ((farmingLevel + 2) / 12) + 0.01
  );
  const q2 = Math.min(0.75, q1 * 2);
  if (fertilizerLevel >= 3) {
    const iridium = q1 / 2;
    const gold = (1 - iridium) * q1;
    const silver = 1 - iridium - gold;
    return { regular: 0, silver, gold, iridium };
  }
  const gold = q1;
  const silver = (1 - gold) * q2;
  const regular = Math.max(0, 1 - gold - silver);
  return { regular, silver, gold, iridium: 0 };
}
