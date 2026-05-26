export interface PatchNote {
  version: string;
  title: string;
  date?: string;
  bullets: string[];
}

/** Newest first. The first entry is treated as the current app version. */
export const PATCH_NOTES: PatchNote[] = [
  {
    version: 'v0.5.0',
    title: 'Visual Polish',
    bullets: [
      'Added light and dark themes.',
      'Gave the app a more consistent pixel-art icon style across crops, tools, and pages.',
    ],
  },
  {
    version: 'v0.4.0',
    title: 'Fertilizer Update',
    bullets: [
      'Added fertilizer selection to the crop planner.',
      'Added farming level and expected quality-based profit.',
      'Added fertilizer amount limits, so plans can split fertilized and unfertilized crops.',
      'Added the Fertilizer Workshop to compare buying vs crafting.',
    ],
  },
  {
    version: 'v0.3.0',
    title: 'Crop Calendar',
    bullets: [
      'Added clickable crop cards.',
      'Added a Stardew-style calendar showing planting, watering, and harvest days.',
      'Improved regrowing crop labels so later harvests are easier to understand.',
    ],
  },
  {
    version: 'v0.2.0',
    title: 'Better Recommendations',
    bullets: [
      'Simplified results to one goal: highest net profit.',
      'Redesigned crop cards to make profit, final gold, and harvest timing easier to read.',
      'Cleaned up seed source filters and crop notes.',
    ],
  },
  {
    version: 'v0.1.0',
    title: 'Crop Planner',
    bullets: [
      'Added the first interactive crop planner.',
      'Added season, day, gold, quality, and seed source controls.',
      'Added crop recommendations with harvest dates, profit, and final gold.',
    ],
  },
];

export const CURRENT_VERSION = PATCH_NOTES[0].version;
