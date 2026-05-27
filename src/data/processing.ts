import { Crop, KegProduct, ProcessingMode, Quality } from '../domain/types';

export const MINUTES_PER_DAY = 1600;

/** Keg processing time in wiki minutes. Calendar labels collapse this to days,
 *  but machine queues keep minute precision so Coffee/Tea cannot use one keg
 *  infinitely many times on a single day. */
export const KEG_MINUTES: Record<KegProduct, number> = {
  wine: 10000,
  juice: 6000,
  beer: 1750,
  'pale-ale': 2250,
  coffee: 120,
  'green-tea': 180,
  none: 0,
};

/** Cask aging — total days from loading the keg product to reaching each tier.
 *  Wiki values are total in-cask days from start. */
export const CASK_DAYS: Record<'wine' | 'beer' | 'pale-ale', { silver: number; gold: number; iridium: number }> = {
  wine:       { silver: 14, gold: 28, iridium: 56 },
  beer:       { silver: 7,  gold: 14, iridium: 28 },
  'pale-ale': { silver: 9,  gold: 17, iridium: 34 },
};

export const KEG_PRODUCT_LABEL: Record<KegProduct, string> = {
  wine: 'Wine',
  juice: 'Juice',
  beer: 'Beer',
  'pale-ale': 'Pale Ale',
  coffee: 'Coffee',
  'green-tea': 'Green Tea',
  none: '—',
};

/** Caskable products. */
export function isCaskable(p: KegProduct): p is 'wine' | 'beer' | 'pale-ale' {
  return p === 'wine' || p === 'beer' || p === 'pale-ale';
}

/** Base keg-product price (Regular quality) for a crop. */
export function baseKegProductValue(crop: Crop): number {
  switch (crop.kegProduct) {
    case 'wine':      return crop.sellPrice * 3;
    case 'juice':     return Math.floor(crop.sellPrice * 2.25);
    case 'beer':      return 200;
    case 'pale-ale':  return 300;
    case 'coffee':    return 150;
    case 'green-tea': return 100;
    default:          return 0;
  }
}

/** Aged target quality for a given mode. */
export function modeQuality(mode: ProcessingMode): Quality {
  switch (mode) {
    case 'silver-aged':  return 'Silver';
    case 'gold-aged':    return 'Gold';
    case 'iridium-aged': return 'Iridium';
    default:             return 'Regular';
  }
}

/** Artisan profession affects Wine/Juice/Beer/Pale Ale/Green Tea (NOT Coffee). */
export function artisanApplies(p: KegProduct): boolean {
  return p === 'wine' || p === 'juice' || p === 'beer' || p === 'pale-ale' || p === 'green-tea';
}

const QUALITY_MULT: Record<Quality, number> = {
  Regular: 1, Silver: 1.25, Gold: 1.5, Iridium: 2,
};

/** Final unit price for a processed product, applying quality and Artisan. */
export function processedUnitPrice(
  crop: Crop,
  mode: ProcessingMode,
  hasArtisan: boolean
): number {
  const base = baseKegProductValue(crop);
  if (base === 0) return 0;
  const product = crop.kegProduct!;
  const q = isCaskable(product) ? modeQuality(mode) : 'Regular';
  const qMult = QUALITY_MULT[q];
  const aMult = hasArtisan && artisanApplies(product) ? 1.4 : 1;
  return Math.floor(base * qMult * aMult + 0.0001);
}

/** Days from a single harvest day until the product (keg + optional cask) is collected. */
export function processingDays(
  product: KegProduct,
  mode: ProcessingMode
): number {
  if (product === 'none') return 0;
  const kegDays = KEG_MINUTES[product] / MINUTES_PER_DAY;
  if (mode === 'keg' || mode === 'raw') return kegDays;
  // Aged. If not caskable, fall back to keg-only timing (caller should warn).
  if (!isCaskable(product)) return kegDays;
  const cask = CASK_DAYS[product];
  const aged = mode === 'silver-aged' ? cask.silver
             : mode === 'gold-aged'    ? cask.gold
             : cask.iridium;
  return kegDays + aged;
}

export function caskMinutesForMode(
  product: 'wine' | 'beer' | 'pale-ale',
  mode: ProcessingMode
): number {
  if (mode === 'raw' || mode === 'keg') return 0;
  const tiers = CASK_DAYS[product];
  const days = mode === 'silver-aged' ? tiers.silver
    : mode === 'gold-aged' ? tiers.gold
    : tiers.iridium;
  return days * MINUTES_PER_DAY;
}

export const PROCESSING_MODE_LABEL: Record<ProcessingMode, string> = {
  raw:           'Sell crops raw',
  keg:           'Keg only',
  'silver-aged': 'Age to Silver',
  'gold-aged':   'Age to Gold',
  'iridium-aged':'Age to Iridium',
};
